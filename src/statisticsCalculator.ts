// =============================================================================
// FILE: src/statisticsCalculator.ts
//
// PURPOSE: Pure utility functions to compute document statistics from raw text.
//
// WHY PURE FUNCTIONS:
//   These functions have no side effects and no VS Code dependencies.
//   They can be unit-tested without mocking anything.
//   They receive text, they return numbers. That's it.
//
// USAGE:
//   import { calculateStatistics } from './statisticsCalculator';
//   const stats = calculateStatistics(editor.document.getText());
// =============================================================================

import type { DocumentStatistics } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Average reading speed in words per minute (for adults). */
const WORDS_PER_MINUTE = 200;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates all text statistics from a raw document string.
 *
 * @param text - The full text content of the document.
 * @returns A `DocumentStatistics` object with all computed values.
 *
 * @example
 * const stats = calculateStatistics("Hello world. How are you?");
 * // stats.wordCount     → 5
 * // stats.sentenceCount → 2
 */
export function calculateStatistics(text: string): DocumentStatistics {
  return {
    wordCount: countWords(text),
    charCount: countChars(text),
    charCountNoSpaces: countCharsNoSpaces(text),
    sentenceCount: countSentences(text),
    paragraphCount: countParagraphs(text),
    readingTimeSeconds: estimateReadingTime(text),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// Each function is small, named clearly, and does exactly one thing.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Counts words by splitting on whitespace.
 * Ignores empty tokens produced by multiple consecutive spaces.
 *
 * "Hello   world" → 2 words
 * "  "            → 0 words
 */
function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  // \s+ matches any whitespace sequence (spaces, tabs, newlines)
  return trimmed.split(/\s+/).length;
}

/**
 * Counts ALL characters including spaces and newlines.
 */
function countChars(text: string): number {
  return text.length;
}

/**
 * Counts characters excluding spaces, tabs, and newlines.
 */
function countCharsNoSpaces(text: string): number {
  // Remove all whitespace characters
  return text.replace(/\s/g, '').length;
}

/**
 * Counts sentences by detecting sentence-ending punctuation.
 *
 * A sentence ends with one of: . ! ?
 * Handles abbreviations imperfectly (good enough for a word-count tool).
 *
 * "Hello world. How are you? Great!" → 3 sentences
 * "Hello world"                      → 1 sentence (if text has any words)
 */
function countSentences(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }

  // Match sequences ending with . ! or ? (including multiple punctuation like "!!")
  const sentenceEndings = trimmed.match(/[^.!?]*[.!?]+/g);
  if (!sentenceEndings) {
    // Text has no sentence-ending punctuation: treat as 1 sentence if not empty
    return trimmed.split(/\s+/).length > 0 ? 1 : 0;
  }

  return sentenceEndings.length;
}

/**
 * Counts paragraphs by detecting blank lines (two or more consecutive newlines).
 *
 * "Hello\n\nWorld" → 2 paragraphs
 * "Hello\nWorld"   → 1 paragraph
 */
function countParagraphs(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }

  // Split on one or more blank lines
  const paragraphs = trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  return paragraphs.length;
}

/**
 * Estimates reading time based on word count.
 * Uses the standard assumption of 200 words per minute.
 *
 * @returns Time in seconds.
 */
function estimateReadingTime(text: string): number {
  const words = countWords(text);
  // Convert minutes to seconds
  return Math.ceil((words / WORDS_PER_MINUTE) * 60);
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTING HELPERS (exported for use in status bar display)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats seconds into a human-readable string.
 *
 * @example
 * formatReadingTime(90) → "1 min 30 sec"
 * formatReadingTime(45) → "45 sec"
 * formatReadingTime(0)  → "0 sec"
 */
export function formatReadingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }
  return `${minutes} min ${remainingSeconds} sec`;
}
