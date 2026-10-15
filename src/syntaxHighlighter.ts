// =============================================================================
// FILE: src/syntaxHighlighter.ts
//
// PURPOSE: Applies part-of-speech color decorations to the active text editor.
//
// HOW IT WORKS:
//   1. Creates ONE decoration type per part of speech at startup (never again).
//   2. On each document change (debounced), it scans only the VISIBLE portion
//      of the document (viewport) for performance on large files.
//   3. Calls `editor.setDecorations()` once per decoration type per update.
//
// PERFORMANCE CONTRACT:
//   - Decoration types: created once on `activate()`, disposed on `deactivate()`
//   - Scan scope: only editor.visibleRanges (not the whole document)
//   - Debounce: 250ms after the last keystroke before re-scanning
//   - Scroll events: 100ms throttle to update when viewport changes
//
// COLORS (One Dark Pro inspired — chosen to mimic code token colors):
//   Noun        → #61AFEF  (blue,   like HTML tags)
//   Verb        → #C678DD  (purple, like function keywords)
//   Adjective   → #E5C07B  (yellow, like strings)
//   Adverb      → #98C379  (green,  like numbers / constants)
//   Preposition → #ABB2BF  (grey,   like operators)
//   Conjunction → #E06C75  (pink,   like keywords: if, for)
//   Pronoun     → #56B6C2  (cyan,   like variable names)
//
// USED BY: extension.ts
// =============================================================================

import * as vscode from 'vscode';
import { classifyWords } from './partOfSpeechClassifier';
import type { HighlightingConfig, PartOfSpeech } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How long to wait (ms) after a keystroke before re-computing decorations.
 * Too low → laggy typing. Too high → decorations feel delayed.
 */
const DEBOUNCE_DELAY_MS = 250;

/**
 * How long to wait (ms) after a scroll event before re-computing decorations.
 */
const SCROLL_THROTTLE_MS = 100;

/**
 * Maps each part of speech to its One Dark Pro-inspired color.
 * This object is the single place to change all colors.
 */
const PART_OF_SPEECH_COLORS: Record<PartOfSpeech, string> = {
  noun:        '#61AFEF', // Blue   — like HTML element tags
  verb:        '#C678DD', // Purple — like function/keyword declarations
  adjective:   '#E5C07B', // Yellow — like string literals
  adverb:      '#98C379', // Green  — like numeric constants
  preposition: '#ABB2BF', // Grey   — like operators (+, -, =)
  conjunction: '#E06C75', // Pink   — like control keywords (if, for)
  pronoun:     '#56B6C2', // Cyan   — like variable identifiers
};

// ─────────────────────────────────────────────────────────────────────────────
// DECORATOR TYPE MAP
// One decoration type per part of speech. Created once, reused forever.
// ─────────────────────────────────────────────────────────────────────────────

type DecorationTypeMap = Map<PartOfSpeech, vscode.TextEditorDecorationType>;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manages the lifecycle of syntax highlighting decorations.
 *
 * Usage:
 * ```ts
 * const highlighter = new SyntaxHighlighter(context);
 * highlighter.updateForEditor(vscode.window.activeTextEditor, config);
 * highlighter.dispose();
 * ```
 */
export class SyntaxHighlighter {
  /** VS Code disposables — cleaned up when extension deactivates. */
  private readonly disposables: vscode.Disposable[] = [];

  /** One decoration type per part of speech. Created in the constructor. */
  private readonly decorationTypes: DecorationTypeMap = new Map();

  /** Timer handle for debouncing text-change events. */
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  /** Timer handle for throttling scroll events. */
  private scrollTimer: ReturnType<typeof setTimeout> | undefined;

  /** The current user config (which parts of speech to show). */
  private config: HighlightingConfig;

  // ──────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ──────────────────────────────────────────────────────────────────────────

  constructor(
    private readonly context: vscode.ExtensionContext,
    initialConfig: HighlightingConfig,
  ) {
    this.config = initialConfig;

    // Create all decoration types ONCE here. Never recreate them.
    this.createDecorationTypes();

    // Listen for text changes (debounced)
    const onChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document !== event.document) {
        return;
      }
      this.scheduleUpdate(editor);
    });

    // Listen for scroll / visible range changes (throttled)
    const onScrollDisposable = vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
      this.scheduleScrollUpdate(event.textEditor);
    });

    // Listen for active editor changes (switch tabs)
    const onEditorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && this.isSupportedDocument(editor.document)) {
        this.applyDecorationsToEditor(editor);
      }
    });

    this.disposables.push(onChangeDisposable, onScrollDisposable, onEditorChangeDisposable);
    this.context.subscriptions.push(...this.disposables);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates highlighting config and immediately re-applies decorations.
   * Call this when the user toggles a setting.
   */
  public updateConfig(newConfig: HighlightingConfig): void {
    this.config = newConfig;
    const editor = vscode.window.activeTextEditor;
    if (editor && this.isSupportedDocument(editor.document)) {
      this.applyDecorationsToEditor(editor);
    }
  }

  /**
   * Immediately applies decorations to the given editor.
   * Call this on startup or when switching to a new file.
   */
  public applyDecorationsToEditor(editor: vscode.TextEditor): void {
    if (!this.config.enabled) {
      // Clear all decorations when highlighting is disabled
      this.clearAllDecorations(editor);
      return;
    }

    if (!this.isSupportedDocument(editor.document)) {
      return;
    }

    // Build a map of (partOfSpeech → ranges to color)
    const rangesByCategory = this.buildRangesFromVisibleText(editor);

    // Apply each category's ranges (one setDecorations call per type)
    for (const [pos, decorationType] of this.decorationTypes) {
      const ranges = rangesByCategory.get(pos) ?? [];
      editor.setDecorations(decorationType, ranges);
    }
  }

  /**
   * Removes all decorations from an editor (useful when disabling the feature).
   */
  public clearAllDecorations(editor: vscode.TextEditor): void {
    for (const decorationType of this.decorationTypes.values()) {
      editor.setDecorations(decorationType, []); // empty array = clear
    }
  }

  /**
   * Disposes of all decoration types and event listeners.
   * Called automatically when the extension deactivates.
   */
  public dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
    for (const decorationType of this.decorationTypes.values()) {
      decorationType.dispose();
    }
    this.decorationTypes.clear();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates one `TextEditorDecorationType` per part of speech.
   * This must only be called ONCE during the lifetime of the extension.
   */
  private createDecorationTypes(): void {
    for (const [pos, color] of Object.entries(PART_OF_SPEECH_COLORS)) {
      const decorationType = vscode.window.createTextEditorDecorationType({
        // Apply the color as the foreground text color
        color: color,
        // No background color — we want it to look like code, not highlighted text
        // DecorationRangeBehavior.ClosedClosed means the decoration won't expand
        // when you type at the edges of a decorated word.
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      });
      this.decorationTypes.set(pos as PartOfSpeech, decorationType);
      // Register for cleanup on deactivation
      this.context.subscriptions.push(decorationType);
    }
  }

  /**
   * Schedules a decoration update after a short debounce delay.
   * Replaces any pending timer (so rapid keystrokes only trigger one update).
   */
  private scheduleUpdate(editor: vscode.TextEditor): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.applyDecorationsToEditor(editor);
    }, DEBOUNCE_DELAY_MS);
  }

  /**
   * Schedules a decoration update after a scroll event.
   * Uses a shorter delay than the keystroke debounce.
   */
  private scheduleScrollUpdate(editor: vscode.TextEditor): void {
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
    this.scrollTimer = setTimeout(() => {
      this.applyDecorationsToEditor(editor);
    }, SCROLL_THROTTLE_MS);
  }

  /**
   * Scans only the VISIBLE ranges of the document (not the full text).
   * This is the key performance optimization for large files.
   *
   * @returns A Map from part-of-speech to an array of VS Code Ranges.
   */
  private buildRangesFromVisibleText(
    editor: vscode.TextEditor,
  ): Map<PartOfSpeech, vscode.Range[]> {
    // Initialize empty arrays for each enabled category
    const rangesByCategory = new Map<PartOfSpeech, vscode.Range[]>();
    for (const pos of this.decorationTypes.keys()) {
      rangesByCategory.set(pos, []);
    }

    // Process each visible range (there can be multiple when folded)
    for (const visibleRange of editor.visibleRanges) {
      // Get only the text that's currently on screen
      const visibleText = editor.document.getText(visibleRange);

      // The character offset of the first visible character in the full document
      const visibleStartOffset = editor.document.offsetAt(visibleRange.start);

      // Classify all words in the visible text
      const classifiedWords = classifyWords(visibleText);

      for (const classified of classifiedWords) {
        // Skip if this category is not enabled in config
        if (!this.isCategoryEnabled(classified.partOfSpeech)) {
          continue;
        }

        // Convert local (visible-text) offsets to absolute document offsets
        const absoluteStart = visibleStartOffset + classified.startOffset;
        const absoluteEnd   = visibleStartOffset + classified.endOffset;

        // Convert absolute character offsets to VS Code Position objects
        const startPosition = editor.document.positionAt(absoluteStart);
        const endPosition   = editor.document.positionAt(absoluteEnd);

        const range = new vscode.Range(startPosition, endPosition);
        rangesByCategory.get(classified.partOfSpeech)!.push(range);
      }
    }

    return rangesByCategory;
  }

  /**
   * Checks whether a specific part of speech should be colored
   * based on the current highlighting configuration.
   */
  private isCategoryEnabled(pos: PartOfSpeech): boolean {
    if (!this.config.enabled) {
      return false;
    }
    switch (pos) {
      case 'noun':        return this.config.colorNouns;
      case 'verb':        return this.config.colorVerbs;
      case 'adjective':   return this.config.colorAdjectives;
      case 'adverb':      return this.config.colorAdverbs;
      case 'preposition': return this.config.colorPrepositions;
      case 'conjunction': return this.config.colorConjunctions;
      case 'pronoun':     return this.config.colorPronouns;
      default:            return false;
    }
  }

  /**
   * Returns true if the document type is supported (.md or .txt).
   */
  private isSupportedDocument(document: vscode.TextDocument): boolean {
    return (
      document.languageId === 'markdown' ||
      document.languageId === 'plaintext'
    );
  }
}
