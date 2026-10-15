// =============================================================================
// FILE: src/statusBarManager.ts
//
// PURPOSE: Manages ALL status bar items for the WordCraft extension.
//
// DESIGN DECISIONS:
//   - We create MULTIPLE `StatusBarItem` instances (one per logical section)
//     rather than one large concatenated string. This lets VS Code space them
//     out naturally and the user can right-click to hide individual items.
//   - Priority numbers: Higher = further LEFT. We use a range to keep our
//     items grouped together on the right side of the status bar.
//   - All items are updated together in ONE method call (`updateAll`) to
//     minimize redraws.
//
// STATUS BAR LAYOUT (right side, left-to-right):
//   [📊 Progress Bar]  [Words: 142/500]  [Chars: 801]  [Sentences: 12]  [Paragraphs: 3]  [~1 min]
//
// USED BY: extension.ts
// =============================================================================

import * as vscode from 'vscode';
import { calculateStatistics, formatReadingTime } from './statisticsCalculator';
import {
  getWordGoalFromSettings,
  getWordGoalStatus,
  calculateProgressPercent,
  renderProgressBar,
} from './wordGoalManager';
import type { StatusBarDisplayConfig } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base priority for our status bar items (higher = further left).
 * We space them by 1 so they appear in the right order.
 */
const STATUS_BAR_PRIORITY_BASE = 110;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates and manages all WordCraft status bar items.
 *
 * Usage:
 * ```ts
 * const bar = new StatusBarManager(context);
 * bar.update(editor.document.getText(), config);
 * bar.dispose();
 * ```
 */
export class StatusBarManager {
  // Each item is a separate status bar segment
  private readonly itemWordCount:     vscode.StatusBarItem;
  private readonly itemCharCount:     vscode.StatusBarItem;
  private readonly itemSentenceCount: vscode.StatusBarItem;
  private readonly itemParagraphCount:vscode.StatusBarItem;
  private readonly itemReadingTime:   vscode.StatusBarItem;
  private readonly itemProgressBar:   vscode.StatusBarItem;

  /** Collects all items for easy iteration. */
  private readonly allItems: vscode.StatusBarItem[];

  // ──────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ──────────────────────────────────────────────────────────────────────────

  constructor(private readonly context: vscode.ExtensionContext) {
    // Create each item with a unique priority so they appear left-to-right
    // in the order we define them. All are on the RIGHT side of the status bar.
    this.itemProgressBar    = this.createItem(STATUS_BAR_PRIORITY_BASE + 5, 'wordcraft.setWordGoal', 'Click to set word goal');
    this.itemWordCount      = this.createItem(STATUS_BAR_PRIORITY_BASE + 4, 'wordcraft.setWordGoal', 'Click to set word goal');
    this.itemCharCount      = this.createItem(STATUS_BAR_PRIORITY_BASE + 3);
    this.itemSentenceCount  = this.createItem(STATUS_BAR_PRIORITY_BASE + 2);
    this.itemParagraphCount = this.createItem(STATUS_BAR_PRIORITY_BASE + 1);
    this.itemReadingTime    = this.createItem(STATUS_BAR_PRIORITY_BASE + 0);

    this.allItems = [
      this.itemProgressBar,
      this.itemWordCount,
      this.itemCharCount,
      this.itemSentenceCount,
      this.itemParagraphCount,
      this.itemReadingTime,
    ];

    // Register all items for cleanup when the extension deactivates
    this.context.subscriptions.push(...this.allItems);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates all status bar items with fresh data from the document.
   * Call this every time the document changes.
   *
   * @param text   - The current full document text.
   * @param config - Which items the user wants to see.
   */
  public update(text: string, config: StatusBarDisplayConfig): void {
    const stats = calculateStatistics(text);
    const goal  = getWordGoalFromSettings();
    const status = getWordGoalStatus(stats.wordCount, goal);
    const percent = calculateProgressPercent(stats.wordCount, goal);

    // ── Word Count ─────────────────────────────────────────────────────────
    if (config.showWordCount) {
      const goalText = goal.max > 0
        ? ` / ${goal.max}`
        : '';

      // Add an icon based on goal status
      const statusIcon = this.getGoalStatusIcon(status);
      this.itemWordCount.text = `${statusIcon} ${stats.wordCount}${goalText} words`;

      // Tooltip shows extra context
      this.itemWordCount.tooltip = new vscode.MarkdownString(
        `**WordCraft Statistics**\n\n` +
        `- Words: **${stats.wordCount}**\n` +
        `- Goal: Min ${goal.min} / Max ${goal.max}\n` +
        `- Click to change word goal`
      );

      // Color the item red when below minimum, green when in range
      this.itemWordCount.backgroundColor = this.getGoalBackgroundColor(status);
      this.itemWordCount.color = this.getGoalForegroundColor(status);

      this.itemWordCount.show();
    } else {
      this.itemWordCount.hide();
    }

    // ── Character Count ────────────────────────────────────────────────────
    if (config.showCharCount) {
      this.itemCharCount.text = `$(symbol-string) ${stats.charCount} chars`;
      this.itemCharCount.tooltip = `Characters: ${stats.charCount} total, ${stats.charCountNoSpaces} without spaces`;
      this.itemCharCount.show();
    } else {
      this.itemCharCount.hide();
    }

    // ── Sentence Count ─────────────────────────────────────────────────────
    if (config.showSentenceCount) {
      this.itemSentenceCount.text = `$(list-unordered) ${stats.sentenceCount} sent`;
      this.itemSentenceCount.tooltip = `Sentences: ${stats.sentenceCount}`;
      this.itemSentenceCount.show();
    } else {
      this.itemSentenceCount.hide();
    }

    // ── Paragraph Count ────────────────────────────────────────────────────
    if (config.showParagraphCount) {
      this.itemParagraphCount.text = `$(symbol-namespace) ${stats.paragraphCount} §`;
      this.itemParagraphCount.tooltip = `Paragraphs: ${stats.paragraphCount}`;
      this.itemParagraphCount.show();
    } else {
      this.itemParagraphCount.hide();
    }

    // ── Reading Time ───────────────────────────────────────────────────────
    if (config.showReadingTime) {
      const readingTimeText = formatReadingTime(stats.readingTimeSeconds);
      this.itemReadingTime.text = `$(watch) ${readingTimeText}`;
      this.itemReadingTime.tooltip = `Estimated reading time: ${readingTimeText} (at 200 wpm)`;
      this.itemReadingTime.show();
    } else {
      this.itemReadingTime.hide();
    }

    // ── Progress Bar ───────────────────────────────────────────────────────
    if (config.showProgressBar && goal.max > 0) {
      const barText = renderProgressBar(percent, 10);
      this.itemProgressBar.text = barText;
      this.itemProgressBar.tooltip = new vscode.MarkdownString(
        `**Word Goal Progress**\n\n` +
        `${percent}% of ${goal.max} words\n\n` +
        `Click to change word goal`
      );
      this.itemProgressBar.color = this.getGoalForegroundColor(status);
      this.itemProgressBar.show();
    } else {
      this.itemProgressBar.hide();
    }
  }

  /**
   * Hides ALL status bar items.
   * Called when the user is not editing a supported file.
   */
  public hideAll(): void {
    for (const item of this.allItems) {
      item.hide();
    }
  }

  /**
   * Disposes all status bar items.
   * VS Code calls this automatically via `context.subscriptions`.
   */
  public dispose(): void {
    for (const item of this.allItems) {
      item.dispose();
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a single status bar item on the RIGHT side.
   *
   * @param priority    - Position priority (higher = further left).
   * @param command     - Optional command to run when clicked.
   * @param tooltip     - Optional tooltip text.
   */
  private createItem(
    priority: number,
    command?: string,
    tooltip?: string,
  ): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      priority,
    );
    if (command) {
      item.command = command;
    }
    if (tooltip) {
      item.tooltip = tooltip;
    }
    return item;
  }

  /**
   * Returns an icon character based on word goal status.
   * Uses VS Code's built-in codicon icon set.
   */
  private getGoalStatusIcon(status: string): string {
    switch (status) {
      case 'below-minimum': return '$(warning)';     // ⚠ yellow warning
      case 'in-range':      return '$(check)';        // ✓ green check
      case 'over-maximum':  return '$(error)';        // ✗ red error
      case 'no-goal':       return '$(book)';         // 📖 book
      default:              return '$(book)';
    }
  }

  /**
   * Returns a background color for the word-count item based on goal status.
   * Uses VS Code's semantic color keys for theme compatibility.
   */
  private getGoalBackgroundColor(status: string): vscode.ThemeColor | undefined {
    switch (status) {
      case 'below-minimum': return new vscode.ThemeColor('statusBarItem.warningBackground');
      case 'over-maximum':  return new vscode.ThemeColor('statusBarItem.errorBackground');
      default:              return undefined; // Use default theme background
    }
  }

  /**
   * Returns a foreground color for text based on goal status.
   */
  private getGoalForegroundColor(status: string): vscode.ThemeColor | undefined {
    switch (status) {
      case 'below-minimum': return new vscode.ThemeColor('statusBarItem.warningForeground');
      case 'over-maximum':  return new vscode.ThemeColor('statusBarItem.errorForeground');
      case 'in-range':      return new vscode.ThemeColor('statusBarItem.prominentForeground');
      default:              return undefined;
    }
  }
}
