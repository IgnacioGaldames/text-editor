// =============================================================================
// FILE: src/partOfSpeechClassifier.ts
//
// PURPOSE: Classifies words into grammatical categories (parts of speech)
//          so they can be colored differently in the editor.
//
// PHILOSOPHY — "Code Camouflage":
//   The goal is to make prose LOOK like code. We mirror how popular themes
//   (One Dark Pro, Dracula, Tokyo Night) color code tokens:
//
//     NOUN        → Blue    (like HTML tags: <div>, <span>)
//     VERB        → Purple  (like function declarations)
//     ADJECTIVE   → Yellow  (like strings: "hello world")
//     ADVERB      → Green   (like numbers, constants)
//     PREPOSITION → Grey    (like operators: +, -, =)
//     CONJUNCTION → Pink    (like keywords: if, for, return)
//     PRONOUN     → Cyan    (like variables: myVar, $scope)
//
// APPROACH:
//   We use curated word lists (dictionaries) rather than NLP libraries.
//   This keeps the extension zero-dependency, fast, and offline.
//   The lists cover the most common English words in each category.
//
//   For unrecognized words, we use simple heuristics:
//     - Words ending in "-ly" are likely adverbs
//     - Words ending in "-tion", "-ness", "-ment" are likely nouns
//     - Words ending in "-ed", "-ing", "-ize" are likely verbs
//     - Words ending in "-ful", "-less", "-ous", "-ive" are likely adjectives
//
// USED BY: syntaxHighlighter.ts
// =============================================================================

import type { ClassifiedWord, PartOfSpeech } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// WORD DICTIONARIES
// Each Set contains lowercase words. Sets have O(1) lookup time.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Common English PRONOUNS.
 * These replace nouns: I, you, he, she, it, we, they, me, him, her, us, them...
 */
const PRONOUNS: ReadonlySet<string> = new Set([
  'i', 'me', 'my', 'myself', 'mine',
  'you', 'your', 'yourself', 'yours',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
  'who', 'whom', 'whose', 'which', 'that',
  'this', 'these', 'those',
  'anyone', 'someone', 'everyone', 'no one', 'nobody',
  'everybody', 'somebody', 'anything', 'something', 'everything', 'nothing',
  'one', 'ones',
]);

/**
 * Common English CONJUNCTIONS.
 * These connect clauses and phrases: and, but, or, because, although...
 */
const CONJUNCTIONS: ReadonlySet<string> = new Set([
  // Coordinating
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
  // Subordinating
  'although', 'because', 'since', 'unless', 'until', 'while', 'when',
  'whenever', 'where', 'wherever', 'after', 'before', 'if', 'though',
  'even', 'whether', 'as', 'once', 'than', 'that', 'though', 'till',
  // Correlative
  'both', 'either', 'neither', 'not', 'only', 'rather',
]);

/**
 * Common English PREPOSITIONS.
 * These show relationships between words: in, on, at, by, with...
 */
const PREPOSITIONS: ReadonlySet<string> = new Set([
  'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to',
  'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'upon', 'around', 'near', 'among', 'within', 'without',
  'along', 'following', 'across', 'behind', 'beyond', 'plus', 'except',
  'toward', 'towards', 'inside', 'outside', 'alongside', 'opposite',
  'beside', 'besides', 'beneath', 'underneath',
]);

/**
 * Common English VERBS (base forms + common conjugations).
 * Focus on high-frequency verbs that appear in most prose.
 */
const VERBS: ReadonlySet<string> = new Set([
  // "To be" forms
  'be', 'is', 'are', 'was', 'were', 'been', 'being', 'am',
  // "To have" forms
  'have', 'has', 'had', 'having',
  // "To do" forms
  'do', 'does', 'did', 'done', 'doing',
  // "To go" forms
  'go', 'goes', 'went', 'gone', 'going',
  // "To make" forms
  'make', 'makes', 'made', 'making',
  // "To say" forms
  'say', 'says', 'said', 'saying',
  // "To get" forms
  'get', 'gets', 'got', 'gotten', 'getting',
  // Common action verbs
  'see', 'saw', 'seen', 'look', 'looked', 'know', 'knew', 'known',
  'think', 'thought', 'come', 'came', 'take', 'took', 'taken',
  'want', 'wanted', 'use', 'used', 'find', 'found', 'give', 'gave',
  'tell', 'told', 'work', 'worked', 'call', 'called', 'try', 'tried',
  'ask', 'asked', 'need', 'needed', 'feel', 'felt', 'become', 'became',
  'leave', 'left', 'put', 'show', 'showed', 'shown', 'hear', 'heard',
  'play', 'played', 'run', 'ran', 'move', 'moved', 'live', 'lived',
  'believe', 'believed', 'hold', 'held', 'bring', 'brought', 'happen',
  'write', 'wrote', 'written', 'sit', 'sat', 'stand', 'stood',
  'lose', 'lost', 'pay', 'paid', 'meet', 'met', 'include', 'included',
  'continue', 'continued', 'set', 'learn', 'learned', 'change', 'changed',
  'lead', 'led', 'understand', 'understood', 'watch', 'watched',
  'follow', 'followed', 'stop', 'stopped', 'create', 'created',
  'speak', 'spoke', 'spoken', 'read', 'spend', 'spent', 'grow', 'grew',
  'open', 'opened', 'walk', 'walked', 'win', 'won', 'offer', 'offered',
  'remember', 'remembered', 'love', 'loved', 'consider', 'considered',
  'appear', 'appeared', 'buy', 'bought', 'wait', 'waited', 'serve',
  'die', 'died', 'send', 'sent', 'expect', 'expected', 'build', 'built',
  'stay', 'stayed', 'fall', 'fell', 'cut', 'reach', 'reached', 'kill',
  'remain', 'remained', 'suggest', 'suggested', 'raise', 'raised',
  'pass', 'passed', 'sell', 'sold', 'require', 'required', 'report',
  'decide', 'decided', 'pull', 'break', 'broke', 'broken',
  'start', 'started', 'return', 'returned', 'increase', 'increased',
  'develop', 'developed', 'carry', 'carried', 'help', 'helped',
  'allow', 'allowed', 'add', 'added', 'spend', 'spent',
  'turn', 'turned', 'place', 'placed', 'produce', 'produced',
  'miss', 'missed', 'eat', 'ate', 'eaten', 'catch', 'caught',
  'choose', 'chose', 'chosen', 'close', 'closed', 'drive', 'drove',
  'fight', 'fought', 'push', 'pushed', 'begin', 'began', 'begun',
  'keep', 'kept', 'let', 'mean', 'meant', 'show', 'shown',
]);

/**
 * Common English ADJECTIVES.
 * These describe nouns: big, small, happy, red, beautiful...
 */
const ADJECTIVES: ReadonlySet<string> = new Set([
  // Size
  'big', 'large', 'great', 'high', 'small', 'little', 'long', 'short',
  'wide', 'narrow', 'deep', 'shallow', 'thick', 'thin', 'huge', 'tiny',
  // Quality
  'good', 'bad', 'best', 'worst', 'better', 'worse', 'new', 'old',
  'young', 'early', 'late', 'right', 'wrong', 'true', 'false',
  'real', 'free', 'full', 'open', 'close', 'clear', 'dark', 'light',
  'hard', 'soft', 'hot', 'cold', 'warm', 'cool',
  // Colors
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'white', 'black',
  'gray', 'grey', 'brown', 'pink',
  // Emotion / State
  'happy', 'sad', 'angry', 'afraid', 'sorry', 'sure', 'ready',
  'able', 'possible', 'impossible', 'important', 'necessary', 'certain',
  'difficult', 'easy', 'simple', 'complex', 'different', 'same',
  'common', 'public', 'private', 'local', 'national', 'social',
  // Quantity
  'many', 'few', 'much', 'more', 'most', 'some', 'any', 'other',
  'another', 'each', 'every', 'all', 'both', 'half', 'whole',
  // Misc common
  'special', 'beautiful', 'strong', 'powerful', 'fast', 'slow',
  'smart', 'smart', 'clever', 'brave', 'quiet', 'loud', 'rich',
  'poor', 'safe', 'dangerous', 'healthy', 'sick', 'alive', 'dead',
  'natural', 'political', 'economic', 'human', 'physical', 'mental',
]);

/**
 * Common English ADVERBS.
 * These modify verbs, adjectives, or other adverbs: quickly, very, often...
 */
const ADVERBS: ReadonlySet<string> = new Set([
  // Frequency
  'always', 'usually', 'often', 'sometimes', 'rarely', 'never', 'ever',
  // Degree
  'very', 'too', 'quite', 'rather', 'almost', 'just', 'only', 'even',
  'still', 'already', 'yet', 'also', 'really', 'pretty', 'especially',
  'exactly', 'nearly', 'mostly', 'completely', 'totally', 'absolutely',
  'particularly', 'generally', 'probably', 'certainly', 'definitely',
  // Time
  'now', 'then', 'soon', 'later', 'today', 'yesterday', 'tomorrow',
  'here', 'there', 'away', 'back', 'together', 'apart',
  // Manner
  'well', 'badly', 'hard', 'fast', 'long', 'late', 'early', 'almost',
  'enough', 'instead', 'however', 'therefore', 'thus', 'hence', 'anyway',
  'otherwise', 'nevertheless', 'furthermore', 'moreover', 'meanwhile',
]);

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classifies all words in a text and returns their parts of speech
 * along with their character positions in the original text.
 *
 * Words that can't be classified (most nouns, proper nouns, etc.)
 * are treated as NOUNS by default — which is the most common word type.
 *
 * @param text - The full document text.
 * @returns An array of classified words with their positions.
 */
export function classifyWords(text: string): ClassifiedWord[] {
  const results: ClassifiedWord[] = [];

  // Match only word characters (letters and apostrophes for contractions)
  // This skips punctuation, numbers, and whitespace.
  const wordRegex = /\b[a-zA-Z][a-zA-Z']*\b/g;
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

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines the most likely part of speech for a single lowercase word.
 *
 * PRIORITY ORDER (important — a word can match multiple rules):
 *   1. Exact dictionary lookup (highest confidence)
 *   2. Suffix heuristics (moderate confidence)
 *   3. Default to NOUN (most common word type in English)
 *
 * @param lowerWord - The word in lowercase.
 * @returns The detected part of speech.
 */
function detectPartOfSpeech(lowerWord: string): PartOfSpeech {
  // ── 1. Exact dictionary lookups ──────────────────────────────────────────
  // Check the most specific categories first. Pronouns and conjunctions
  // are small, high-confidence lists — check them before anything else.

  if (PRONOUNS.has(lowerWord)) {
    return 'pronoun';
  }

  if (CONJUNCTIONS.has(lowerWord)) {
    return 'conjunction';
  }

  if (PREPOSITIONS.has(lowerWord)) {
    return 'preposition';
  }

  if (ADVERBS.has(lowerWord)) {
    return 'adverb';
  }

  if (ADJECTIVES.has(lowerWord)) {
    return 'adjective';
  }

  if (VERBS.has(lowerWord)) {
    return 'verb';
  }

  // ── 2. Suffix heuristics for unrecognized words ──────────────────────────
  // These catch inflected/derived forms not in our dictionaries.

  // Adverb suffixes: quickly, beautifully, honestly
  if (lowerWord.endsWith('ly') && lowerWord.length > 4) {
    return 'adverb';
  }

  // Adjective suffixes: colorful, harmless, nervous, massive, creative
  if (
    lowerWord.endsWith('ful') ||
    lowerWord.endsWith('less') ||
    lowerWord.endsWith('ous') ||
    lowerWord.endsWith('ive') ||
    lowerWord.endsWith('ish') ||
    lowerWord.endsWith('able') ||
    lowerWord.endsWith('ible') ||
    lowerWord.endsWith('al')
  ) {
    return 'adjective';
  }

  // Verb suffixes: organize, realize, finished, walking
  if (
    lowerWord.endsWith('ize') ||
    lowerWord.endsWith('ise') ||
    lowerWord.endsWith('ing') ||
    lowerWord.endsWith('ify')
  ) {
    return 'verb';
  }

  // Noun suffixes: organization, happiness, movement, writer, kindness
  if (
    lowerWord.endsWith('tion') ||
    lowerWord.endsWith('sion') ||
    lowerWord.endsWith('ness') ||
    lowerWord.endsWith('ment') ||
    lowerWord.endsWith('ity') ||
    lowerWord.endsWith('ism') ||
    lowerWord.endsWith('ist') ||
    lowerWord.endsWith('er') ||
    lowerWord.endsWith('or') ||
    lowerWord.endsWith('ance') ||
    lowerWord.endsWith('ence')
  ) {
    return 'noun';
  }

  // ── 3. Default: treat as NOUN ─────────────────────────────────────────────
  // Nouns are the most common word type in English. Proper nouns (names,
  // places, titles) will mostly end up here, which is correct.
  return 'noun';
}
