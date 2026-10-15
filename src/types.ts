// =============================================================================
// FILE: src/types.ts
//
// PURPOSE: Central definition of all TypeScript interfaces and types used
//          across the entire extension.
//
// WHY THIS FILE EXISTS:
//   Having all types in one place means any developer can quickly understand
//   the "shape" of the data without jumping between files. If you add a new
//   feature, add its type here first.
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// STATISTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All statistics calculated from the current document text.
 * Computed by the `StatisticsCalculator` module.
 */
export interface DocumentStatistics {
  /** Total number of words (whitespace-separated tokens). */
  wordCount: number;

  /** Total number of characters (including spaces, newlines). */
  charCount: number;

  /** Total characters excluding spaces and newlines. */
  charCountNoSpaces: number;

  /** Number of sentences (ends with . ! or ?). */
  sentenceCount: number;

  /** Number of paragraphs (blocks separated by blank lines). */
  paragraphCount: number;

  /** Estimated reading time in seconds (at 200 words per minute). */
  readingTimeSeconds: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// WORD GOAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The user's word count goal range.
 * The progress bar fills from 0% (0 words) to 100% (max words).
 * A warning indicator shows when word count is below the minimum.
 */
export interface WordGoal {
  /** Minimum words required. Show a warning when below this. */
  min: number;

  /** Maximum / target words. Progress bar reaches 100% here. */
  max: number;
}

/** Describes where the current word count sits relative to the goal. */
export type WordGoalStatus =
  | 'below-minimum'    // wordCount < min
  | 'in-range'         // min <= wordCount <= max
  | 'over-maximum'     // wordCount > max
  | 'no-goal';         // no goal set (max === 0)

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BAR DISPLAY CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Controls which items the user wants to see in the status bar.
 * Each property corresponds to a VS Code setting.
 */
export interface StatusBarDisplayConfig {
  showWordCount: boolean;
  showCharCount: boolean;
  showSentenceCount: boolean;
  showParagraphCount: boolean;
  showReadingTime: boolean;
  showProgressBar: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PART-OF-SPEECH HIGHLIGHTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Each category of words that can receive a distinct color.
 * Colors are inspired by code editor themes:
 *   - Nouns     → HTML element color (e.g. blue-ish, like <div>)
 *   - Verbs     → Function/keyword color (e.g. bright blue or purple)
 *   - Adjectives → String color (e.g. orange/yellow)
 *   - Adverbs   → Number/constant color (e.g. light green)
 *   - Prepositions → Operator color (e.g. white/grey)
 *   - Conjunctions → Keyword color (e.g. pink/magenta)
 *   - Pronouns  → Variable color (e.g. light blue)
 */
export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun';

/**
 * Controls which parts of speech have coloring enabled.
 */
export interface HighlightingConfig {
  enabled: boolean;
  colorNouns: boolean;
  colorVerbs: boolean;
  colorAdjectives: boolean;
  colorAdverbs: boolean;
  colorPrepositions: boolean;
  colorConjunctions: boolean;
  colorPronouns: boolean;
}

/**
 * A single word with its detected part of speech and its position in the doc.
 */
export interface ClassifiedWord {
  /** The word text, lowercased. */
  word: string;

  /** What part of speech this word belongs to. */
  partOfSpeech: PartOfSpeech;

  /** Zero-based character offset where this word starts in the document. */
  startOffset: number;

  /** Zero-based character offset where this word ends (exclusive). */
  endOffset: number;
}
