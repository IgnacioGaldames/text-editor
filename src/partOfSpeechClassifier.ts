// =============================================================================
// FILE: src/partOfSpeechClassifier.ts
//
// PURPOSE: Main coordinator for part-of-speech classification.
//          Delegates to dedicated sub-modules:
//            - src/classifiers/spanishClassifier.ts (Español)
//            - src/classifiers/englishClassifier.ts (English)
//
// DESIGN:
//   Modular, extensible architecture. Any new language (e.g. French, German)
//   can be added as a separate module in `src/classifiers/` without modifying
//   existing linguistic rules.
// =============================================================================

import type { ClassifiedWord, PartOfSpeech } from './types';
import { classifySpanishWord } from './classifiers/spanishClassifier';
import { classifyEnglishWord } from './classifiers/englishClassifier';

/**
 * Classifies all words in a document text and returns their parts of speech
 * along with their exact character start and end offsets.
 *
 * Scans words with Unicode support (including accents and ñ).
 *
 * @param text - The string of text to analyze.
 * @returns Array of ClassifiedWord objects.
 */
export function classifyWords(text: string): ClassifiedWord[] {
  const results: ClassifiedWord[] = [];

  // Match words including Spanish accents and English apostrophes
  const wordRegex = /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ][a-zA-ZáéíóúüñÁÉÍÓÚÜÑ']*/gu;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(text)) !== null) {
    const rawWord = match[0];
    const lowerWord = rawWord.toLowerCase();
    const partOfSpeech = detectPartOfSpeech(lowerWord);

    results.push({
      word: lowerWord,
      partOfSpeech,
      startOffset: match.index,
      endOffset: match.index + rawWord.length,
    });
  }

  return results;
}

/**
 * Determines the part of speech by querying language classifiers in sequence.
 * Priority:
 *   1. Spanish classifier
 *   2. English classifier
 *   3. Default: NOUN
 */
function detectPartOfSpeech(lowerWord: string): PartOfSpeech {
  // Try Spanish classifier first
  const spanishResult = classifySpanishWord(lowerWord);
  if (spanishResult !== null) {
    return spanishResult;
  }

  // Try English classifier
  const englishResult = classifyEnglishWord(lowerWord);
  if (englishResult !== null) {
    return englishResult;
  }

  // Default fallback
  return 'noun';
}
