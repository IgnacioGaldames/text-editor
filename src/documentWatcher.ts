// =============================================================================
// FILE: src/documentWatcher.ts
//
// PURPOSE: Observes editor and document lifecycle events, then triggers
//          updates to the status bar and highlighter at the right moments.
//
// WHY THIS FILE EXISTS:
//   VS Code fires many events: text changed, editor switched, file opened, etc.
//   This class listens to those events and decides WHEN to refresh the UI.
//   It acts as the "coordinator" between VS Code events and our modules.
//
// EVENTS HANDLED:
//   - onDidChangeActiveTextEditor  → User switched tabs
//   - onDidChangeTextDocument      → User typed something
//   - onDidChangeConfiguration     → User changed a setting
//   - onDidOpenTextDocument        → A new file was opened
//
// DEBOUNCE STRATEGY:
//   Text-change events fire on EVERY keystroke. We use a 300ms debounce
//   so we only recalculate stats when the user pauses typing.
//   (Note: the SyntaxHighlighter has its own 250ms debounce for decorations.)
//
// USED BY: extension.ts
// =============================================================================

import * as vscode from 'vscode';
import { StatusBarManager } from './statusBarManager';
import { SyntaxHighlighter } from './syntaxHighlighter';
import { readStatusBarConfig, readHighlightingConfig } from './configurationReader';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Milliseconds to wait after the last keystroke before recalculating stats.
 * Keeps the extension from doing expensive calculations on every single keystroke.
 */
const STATS_DEBOUNCE_MS = 300;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Watches document and editor events, then triggers status bar and
 * highlighting updates as needed.
 */
export class DocumentWatcher {
  /** Collects all VS Code event subscriptions for cleanup. */
  private readonly disposables: vscode.Disposable[] = [];

  /** Timer for debouncing stat recalculations on text changes. */
  private statsDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  // ──────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ──────────────────────────────────────────────────────────────────────────

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly statusBar: StatusBarManager,
    private readonly highlighter: SyntaxHighlighter,
  ) {
    this.registerAllEventListeners();

    // Process the currently active editor immediately on startup
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      this.onEditorBecameActive(activeEditor);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /** Cleans up all event listeners. Called on extension deactivate. */
  public dispose(): void {
    if (this.statsDebounceTimer) {
      clearTimeout(this.statsDebounceTimer);
    }
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE: EVENT REGISTRATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Registers all VS Code event listeners.
   * Called once in the constructor.
   */
  private registerAllEventListeners(): void {
    // ── User switches to a different tab ────────────────────────────────────
    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        this.onEditorBecameActive(editor);
      } else {
        // No editor is active (all tabs closed, or focus moved to a panel)
        this.statusBar.hideAll();
      }
    });

    // ── User types in the document ───────────────────────────────────────────
    const textChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document === event.document) {
        this.onDocumentTextChanged(activeEditor);
      }
    });

    // ── User changes a VS Code setting ───────────────────────────────────────
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
      // Only react to changes in OUR settings, not the entire VS Code config
      if (event.affectsConfiguration('wordcraft')) {
        this.onWordCraftSettingChanged();
      }
    });

    this.disposables.push(editorChangeDisposable, textChangeDisposable, configChangeDisposable);
    this.context.subscriptions.push(...this.disposables);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE: EVENT HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Called when the user switches to (or opens) a text editor.
   * If it's a supported file, we show stats. Otherwise, we hide the bar.
   */
  private onEditorBecameActive(editor: vscode.TextEditor): void {
    if (!this.isSupportedDocument(editor.document)) {
      // Hide all stats when in a non-prose file (e.g., .py, .js, etc.)
      this.statusBar.hideAll();
      return;
    }

    // If auto-activate is off, only update if writer mode is explicitly on.
    // For simplicity in this version, we always update for supported files.
    const text = editor.document.getText();
    const statusBarConfig = readStatusBarConfig();
    this.statusBar.update(text, statusBarConfig);

    // Apply highlighting to the newly focused editor
    this.highlighter.applyDecorationsToEditor(editor);
  }

  /**
   * Called when the document text changes (on every keystroke).
   * We debounce this so stats only recalculate when the user pauses typing.
   */
  private onDocumentTextChanged(editor: vscode.TextEditor): void {
    if (!this.isSupportedDocument(editor.document)) {
      return;
    }

    // Cancel any pending timer and restart it
    if (this.statsDebounceTimer) {
      clearTimeout(this.statsDebounceTimer);
    }

    this.statsDebounceTimer = setTimeout(() => {
      // Re-read the text after the debounce period
      const text = editor.document.getText();
      const statusBarConfig = readStatusBarConfig();
      this.statusBar.update(text, statusBarConfig);
      // Note: SyntaxHighlighter has its OWN debounce for decorations.
      // We don't need to call highlighter.applyDecorationsToEditor() here.
    }, STATS_DEBOUNCE_MS);
  }

  /**
   * Called when ANY WordCraft setting changes.
   * Re-reads all config and updates the UI immediately.
   */
  private onWordCraftSettingChanged(): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || !this.isSupportedDocument(activeEditor.document)) {
      return;
    }

    // Refresh status bar with new config
    const statusBarConfig = readStatusBarConfig();
    const text = activeEditor.document.getText();
    this.statusBar.update(text, statusBarConfig);

    // Refresh highlighting with new config
    const highlightingConfig = readHighlightingConfig();
    this.highlighter.updateConfig(highlightingConfig);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Returns true if this document type should trigger WordCraft.
   */
  private isSupportedDocument(document: vscode.TextDocument): boolean {
    return (
      document.languageId === 'markdown' ||
      document.languageId === 'plaintext'
    );
  }
}
