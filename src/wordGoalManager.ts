// =============================================================================
// FILE: src/wordGoalManager.ts
//
// PURPOSE: Manages the user's word count goal (min/max) and calculates
//          where the current word count stands relative to that goal.
//
// RESPONSIBILITIES:
//   - Reading goal settings from VS Code configuration
//   - Computing goal status (below-minimum, in-range, over-maximum, no-goal)
//   - Computing progress percentage for the progress bar
//   - Prompting the user to set a goal via quick input
//
// USED BY: statusBarManager.ts, extension.ts
// =============================================================================

import * as vscode from 'vscode';
import type { WordGoal } from './types';
export { calculateProgressPercent, getWordGoalStatus } from './wordGoalLogic';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Extension configuration section name (matches package.json). */
const CONFIG_SECTION = 'wordcraft';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads the current word goal from VS Code settings.
 * Falls back to sensible defaults if the settings don't exist.
 */
export function getWordGoalFromSettings(): WordGoal {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    min: config.get<number>('wordGoal.min', 0),
    max: config.get<number>('wordGoal.max', 500),
  };
}

/**
 * Saves a new word goal to the user's VS Code settings (workspace level).
 *
 * @param goal - The new min/max word goal to save.
 */
export async function saveWordGoalToSettings(goal: WordGoal): Promise<void> {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  await config.update('wordGoal.min', goal.min, vscode.ConfigurationTarget.Workspace);
  await config.update('wordGoal.max', goal.max, vscode.ConfigurationTarget.Workspace);
}

/**
 * Renders a text-based progress bar using Unicode block characters.
 * This makes the progress bar look like a code-style ASCII gauge.
 *
 * @param percent    - Value between 0 and 100.
 * @param totalBlocks - How many characters wide the bar should be.
 * @returns A string like "████░░░░ 42%"
 *
 * @example
 * renderProgressBar(42, 10) → "████░░░░░░ 42%"
 */
export function renderProgressBar(percent: number, totalBlocks: number = 10): string {
  const filled = Math.round((percent / 100) * totalBlocks);
  const empty = totalBlocks - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${percent}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER-FACING COMMANDS (called from extension.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shows an interactive prompt to let the user set their word goal.
 * Uses VS Code's `showInputBox` for a native, integrated feel.
 * Saves the result to workspace settings automatically.
 */
export async function promptUserToSetWordGoal(): Promise<void> {
  // ── Step 1: Ask for minimum ──────────────────────────────────────────────
  const currentGoal = getWordGoalFromSettings();

  const minInput = await vscode.window.showInputBox({
    title: 'WordCraft: Set Word Goal (1 of 2)',
    prompt: 'Enter the MINIMUM number of words (leave empty for no minimum)',
    value: currentGoal.min > 0 ? String(currentGoal.min) : '',
    placeHolder: 'e.g. 200',
    validateInput: validateOptionalNumberInput,
  });

  // User pressed Escape
  if (minInput === undefined) {
    return;
  }

  // ── Step 2: Ask for maximum ──────────────────────────────────────────────
  const maxInput = await vscode.window.showInputBox({
    title: 'WordCraft: Set Word Goal (2 of 2)',
    prompt: 'Enter the MAXIMUM / TARGET number of words (leave empty for no maximum)',
    value: currentGoal.max > 0 ? String(currentGoal.max) : '',
    placeHolder: 'e.g. 500',
    validateInput: (value) => {
      const numError = validateOptionalNumberInput(value);
      if (numError) { return numError; }
      const min = parseOptionalNumber(minInput);
      const max = parseOptionalNumber(value);
      if (min > 0 && max > 0 && max <= min) {
        return 'Maximum must be greater than the minimum';
      }
      return undefined;
    },
  });

  if (maxInput === undefined) {
    return;
  }

  // ── Step 3: Save and notify ──────────────────────────────────────────────
  const newGoal: WordGoal = {
    min: parseOptionalNumber(minInput),
    max: parseOptionalNumber(maxInput),
  };

  await saveWordGoalToSettings(newGoal);

  vscode.window.showInformationMessage(
    `WordCraft: Goal set! Min: ${newGoal.min || 'none'} | Max: ${newGoal.max || 'none'}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that a string is a non-negative integer.
 * Used as the `validateInput` callback for `showInputBox`.
 *
 * @returns Error message string if invalid, undefined if valid.
 */
function validateOptionalNumberInput(value: string): string | undefined {
  if (value.trim() === '') {
    return undefined;
  }
  if (!/^\d+$/.test(value.trim())) {
    return 'Please enter a valid non-negative number';
  }
  return undefined;
}

function parseOptionalNumber(value: string): number {
  return value.trim() === '' ? 0 : Number(value.trim());
}
