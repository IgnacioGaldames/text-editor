// =============================================================================
// FILE: src/configurationReader.ts
//
// PURPOSE: Single place to read all VS Code settings for the extension.
//
// WHY THIS FILE EXISTS:
//   VS Code settings can be changed at any time (even while a file is open).
//   By centralizing all `vscode.workspace.getConfiguration()` calls here,
//   we avoid scattering config reads across multiple files. If a setting key
//   changes in package.json, this is the only file you need to update.
//
// USAGE:
//   import { readStatusBarConfig, readHighlightingConfig } from './configurationReader';
//   const config = readStatusBarConfig();
// =============================================================================

import * as vscode from 'vscode';
import type { StatusBarDisplayConfig, HighlightingConfig } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The root key for all this extension's settings in package.json.
 * Must match the `contributes.configuration` → `properties` prefix.
 */
const CONFIG_ROOT = 'wordcraft';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads which status bar items the user wants to display.
 * Reads from `wordcraft.statusBar.*` settings.
 */
export function readStatusBarConfig(): StatusBarDisplayConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_ROOT);
  return {
    showWordCount:     config.get<boolean>('statusBar.showWordCount',     true),
    showCharCount:     config.get<boolean>('statusBar.showCharCount',     true),
    showSentenceCount: config.get<boolean>('statusBar.showSentenceCount', true),
    showParagraphCount:config.get<boolean>('statusBar.showParagraphCount', false),
    showReadingTime:   config.get<boolean>('statusBar.showReadingTime',   false),
    showProgressBar:   config.get<boolean>('statusBar.showProgressBar',   true),
  };
}

/**
 * Reads the part-of-speech highlighting configuration.
 * Reads from `wordcraft.highlighting.*` settings.
 */
export function readHighlightingConfig(): HighlightingConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_ROOT);
  return {
    enabled:           config.get<boolean>('highlighting.enabled',         true),
    colorNouns:        config.get<boolean>('highlighting.colorNouns',      true),
    colorVerbs:        config.get<boolean>('highlighting.colorVerbs',      true),
    colorAdjectives:   config.get<boolean>('highlighting.colorAdjectives', true),
    colorAdverbs:      config.get<boolean>('highlighting.colorAdverbs',    true),
    colorPrepositions: config.get<boolean>('highlighting.colorPrepositions', true),
    colorConjunctions: config.get<boolean>('highlighting.colorConjunctions', true),
    colorPronouns:     config.get<boolean>('highlighting.colorPronouns',   true),
  };
}

/**
 * Checks whether the extension should auto-activate on supported file types.
 * Reads from `wordcraft.enableOnStartup`.
 */
export function readEnableOnStartup(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_ROOT).get<boolean>('enableOnStartup', false);
}
