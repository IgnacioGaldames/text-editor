// =============================================================================
// FILE: src/commandHandlers.ts
//
// PURPOSE: Implements the logic for all commands registered in package.json.
//
// WHY THIS FILE EXISTS:
//   Commands have more complex logic than just updating the UI. Keeping them
//   here instead of in extension.ts keeps the main entry point clean.
//
// COMMANDS HANDLED:
//   - wordcraft.openWriter          → Activates writer mode for the current file
//   - wordcraft.setWordGoal         → Prompts user to set min/max word goal
//   - wordcraft.toggleHighlighting  → Toggles part-of-speech coloring on/off
//   - wordcraft.configureStatusBar  → QuickPick to choose which stats to display
//
// USED BY: extension.ts (registered during activate())
// =============================================================================

import * as vscode from 'vscode';
import { promptUserToSetWordGoal } from './wordGoalManager';
import { SyntaxHighlighter } from './syntaxHighlighter';
import { StatusBarManager } from './statusBarManager';
import { readHighlightingConfig, readStatusBarConfig } from './configurationReader';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC COMMAND HANDLERS
// Each function is the implementation of one VS Code command.
// They are registered in extension.ts via `vscode.commands.registerCommand`.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Opens the current file in "Writer Mode".
 *
 * Writer Mode = WordCraft is active and showing stats for this document.
 * If the document is not a supported type (.md / .txt), shows a warning.
 *
 * @param statusBar   - The status bar manager to refresh.
 * @param highlighter - The syntax highlighter to trigger.
 */
export async function handleOpenWriter(
  statusBar: StatusBarManager,
  highlighter: SyntaxHighlighter,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage('WordCraft: No active editor. Open a .md or .txt file first.');
    return;
  }

  const langId = editor.document.languageId;
  if (langId !== 'markdown' && langId !== 'plaintext') {
    vscode.window.showWarningMessage(
      `WordCraft: This file type (${langId}) is not supported. Open a .md or .txt file.`
    );
    return;
  }

  // Update stats immediately
  const text = editor.document.getText();
  const config = readStatusBarConfig();
  statusBar.update(text, config);

  // Apply highlighting immediately
  highlighter.applyDecorationsToEditor(editor);

  vscode.window.showInformationMessage('WordCraft: Writer Mode activated. Stats are now live in the status bar.');
}

/**
 * Prompts the user to set a word goal (min/max).
 * Delegates to wordGoalManager for the actual prompt logic.
 * After the user sets a goal, refreshes the status bar.
 *
 * @param statusBar - The status bar manager to refresh after goal is set.
 */
export async function handleSetWordGoal(statusBar: StatusBarManager): Promise<void> {
  // The prompt logic lives in wordGoalManager to keep this file clean
  await promptUserToSetWordGoal();

  // Refresh the status bar immediately so the new goal shows up
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const text = editor.document.getText();
    const config = readStatusBarConfig();
    statusBar.update(text, config);
  }
}

/**
 * Toggles part-of-speech syntax highlighting on or off.
 * Saves the new state to workspace settings so it persists across restarts.
 *
 * @param highlighter - The syntax highlighter to enable or disable.
 */
export async function handleToggleHighlighting(
  highlighter: SyntaxHighlighter,
): Promise<void> {
  const currentConfig = readHighlightingConfig();
  const newEnabled = !currentConfig.enabled;

  // Save to workspace settings
  await vscode.workspace.getConfiguration('wordcraft').update(
    'highlighting.enabled',
    newEnabled,
    vscode.ConfigurationTarget.Workspace,
  );

  // Apply immediately (don't wait for the settings-change event)
  const newConfig = { ...currentConfig, enabled: newEnabled };
  highlighter.updateConfig(newConfig);

  const message = newEnabled
    ? 'WordCraft: Part-of-speech highlighting ENABLED.'
    : 'WordCraft: Part-of-speech highlighting DISABLED.';
  vscode.window.showInformationMessage(message);
}

/**
 * Shows a QuickPick menu so the user can choose which stats appear in the
 * status bar. Each item has a checkbox (the user can toggle multiple).
 *
 * After selection, saves changes to workspace settings.
 *
 * @param statusBar - The status bar manager to refresh after config changes.
 */
export async function handleConfigureStatusBar(
  statusBar: StatusBarManager,
): Promise<void> {
  const currentConfig = readStatusBarConfig();

  // Build QuickPick items. The description shows the current state.
  // We use $(check) to indicate a currently-enabled item.
  const items: (vscode.QuickPickItem & { settingKey: keyof typeof currentConfig })[] = [
    {
      label: '$(symbol-numeric) Word Count',
      description: currentConfig.showWordCount ? 'Currently ON' : 'Currently OFF',
      picked: currentConfig.showWordCount,
      settingKey: 'showWordCount',
    },
    {
      label: '$(symbol-string) Character Count',
      description: currentConfig.showCharCount ? 'Currently ON' : 'Currently OFF',
      picked: currentConfig.showCharCount,
      settingKey: 'showCharCount',
    },
    {
      label: '$(list-unordered) Sentence Count',
      description: currentConfig.showSentenceCount ? 'Currently ON' : 'Currently OFF',
      picked: currentConfig.showSentenceCount,
      settingKey: 'showSentenceCount',
    },
    {
      label: '$(symbol-namespace) Paragraph Count',
      description: currentConfig.showParagraphCount ? 'Currently ON' : 'Currently OFF',
      picked: currentConfig.showParagraphCount,
      settingKey: 'showParagraphCount',
    },
    {
      label: '$(watch) Reading Time',
      description: currentConfig.showReadingTime ? 'Currently ON' : 'Currently OFF',
      picked: currentConfig.showReadingTime,
      settingKey: 'showReadingTime',
    },
    {
      label: '$(graph) Progress Bar',
      description: currentConfig.showProgressBar ? 'Currently ON' : 'Currently OFF',
      picked: currentConfig.showProgressBar,
      settingKey: 'showProgressBar',
    },
  ];

  // canPickMany = true creates checkboxes on each item
  const selected = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    title: 'WordCraft: Choose Status Bar Items',
    placeHolder: 'Select which statistics to show in the status bar',
  });

  // User cancelled (pressed Escape)
  if (selected === undefined) {
    return;
  }

  // Build a Set of selected setting keys for fast lookup
  const selectedKeys = new Set(selected.map(item => item.settingKey));
  const config = vscode.workspace.getConfiguration('wordcraft');

  // Update each setting based on whether it was checked or not
  for (const item of items) {
    const newValue = selectedKeys.has(item.settingKey);
    // Map from our config key to the actual dotted setting path
    const settingPath = settingKeyToPath(item.settingKey);
    await config.update(settingPath, newValue, vscode.ConfigurationTarget.Workspace);
  }

  // Refresh status bar immediately
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const newConfig = readStatusBarConfig();
    statusBar.update(editor.document.getText(), newConfig);
  }

  vscode.window.showInformationMessage('WordCraft: Status bar updated.');
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a camelCase config key to its dotted VS Code setting path.
 *
 * Example: 'showWordCount' → 'statusBar.showWordCount'
 */
function settingKeyToPath(key: string): string {
  return `statusBar.${key}`;
}
