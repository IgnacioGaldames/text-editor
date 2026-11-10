import type { WordGoal, WordGoalStatus } from './types';

/**
 * Determines the status of the word count relative to the configured limits.
 */
export function getWordGoalStatus(wordCount: number, goal: WordGoal): WordGoalStatus {
  if (goal.min === 0 && goal.max === 0) {
    return 'no-goal';
  }
  if (goal.min > 0 && wordCount < goal.min) {
    return 'below-minimum';
  }
  if (goal.max > 0 && wordCount > goal.max) {
    return 'over-maximum';
  }
  return 'in-range';
}

/**
 * Calculates progress toward the maximum word goal, capped at 100%.
 */
export function calculateProgressPercent(wordCount: number, goal: WordGoal): number {
  if (goal.max === 0) {
    return 0;
  }
  const percent = (wordCount / goal.max) * 100;
  return Math.min(100, Math.max(0, Math.round(percent)));
}
