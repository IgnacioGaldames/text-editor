// =============================================================================
// FILE: src/classifiers/englishClassifier.ts
//
// PURPOSE: Part-of-speech classification exclusively for ENGLISH prose.
//
// RESPONSIBILITIES:
//   - English word dictionaries (Pronouns, Conjunctions, Prepositions, Verbs,
//     Adjectives, Adverbs).
//   - English suffix heuristics (-ly, -tion, -ing, -ful, etc.).
// =============================================================================

import type { PartOfSpeech } from '../types';

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
  'the', 'a', 'an',
]);

const CONJUNCTIONS: ReadonlySet<string> = new Set([
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
  'although', 'because', 'since', 'unless', 'until', 'while', 'when',
  'whenever', 'where', 'wherever', 'after', 'before', 'if', 'though',
  'even', 'whether', 'as', 'once', 'than', 'that', 'till',
  'both', 'either', 'neither', 'not', 'only', 'rather',
]);

const PREPOSITIONS: ReadonlySet<string> = new Set([
  'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to',
  'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'upon', 'around', 'near', 'among', 'within', 'without',
  'along', 'following', 'across', 'behind', 'beyond', 'plus', 'except',
  'toward', 'towards', 'inside', 'outside', 'alongside', 'opposite',
  'beside', 'besides', 'beneath', 'underneath',
]);

const VERBS: ReadonlySet<string> = new Set([
  'be', 'is', 'are', 'was', 'were', 'been', 'being', 'am',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'done', 'doing',
  'go', 'goes', 'went', 'gone', 'going',
  'make', 'makes', 'made', 'making',
  'say', 'says', 'said', 'saying',
  'get', 'gets', 'got', 'gotten', 'getting',
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
  'allow', 'allowed', 'add', 'added', 'turn', 'turned', 'place', 'placed',
  'produce', 'produced', 'miss', 'missed', 'eat', 'ate', 'eaten',
  'catch', 'caught', 'choose', 'chose', 'chosen', 'close', 'closed',
  'drive', 'drove', 'fight', 'fought', 'push', 'pushed', 'begin', 'began', 'begun',
  'keep', 'kept', 'let', 'mean', 'meant',
]);

const ADJECTIVES: ReadonlySet<string> = new Set([
  'big', 'large', 'great', 'high', 'small', 'little', 'long', 'short',
  'wide', 'narrow', 'deep', 'shallow', 'thick', 'thin', 'huge', 'tiny',
  'good', 'bad', 'best', 'worst', 'better', 'worse', 'new', 'old',
  'young', 'early', 'late', 'right', 'wrong', 'true', 'false',
  'real', 'free', 'full', 'open', 'close', 'clear', 'dark', 'light',
  'hard', 'soft', 'hot', 'cold', 'warm', 'cool',
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'white', 'black',
  'gray', 'grey', 'brown', 'pink',
  'happy', 'sad', 'angry', 'afraid', 'sorry', 'sure', 'ready',
  'able', 'possible', 'impossible', 'important', 'necessary', 'certain',
  'difficult', 'easy', 'simple', 'complex', 'different', 'same',
  'common', 'public', 'private', 'local', 'national', 'social',
  'many', 'few', 'much', 'more', 'most', 'some', 'any', 'other',
  'another', 'each', 'every', 'all', 'both', 'half', 'whole',
  'special', 'beautiful', 'strong', 'powerful', 'fast', 'slow',
  'smart', 'clever', 'brave', 'quiet', 'loud', 'rich',
  'poor', 'safe', 'dangerous', 'healthy', 'sick', 'alive', 'dead',
  'natural', 'political', 'economic', 'human', 'physical', 'mental',
]);

const ADVERBS: ReadonlySet<string> = new Set([
  'always', 'usually', 'often', 'sometimes', 'rarely', 'never', 'ever',
  'very', 'too', 'quite', 'rather', 'almost', 'just', 'only', 'even',
  'still', 'already', 'yet', 'also', 'really', 'pretty', 'especially',
  'exactly', 'nearly', 'mostly', 'completely', 'totally', 'absolutely',
  'particularly', 'generally', 'probably', 'certainly', 'definitely',
  'now', 'then', 'soon', 'later', 'today', 'yesterday', 'tomorrow',
  'here', 'there', 'away', 'back', 'together', 'apart',
  'well', 'badly', 'hard', 'fast', 'long', 'late', 'early',
  'enough', 'instead', 'however', 'therefore', 'thus', 'hence', 'anyway',
  'otherwise', 'nevertheless', 'furthermore', 'moreover', 'meanwhile',
]);

/**
 * Classifies an English lowercase word into a PartOfSpeech.
 * Returns null if the word is not recognized by English dictionaries or rules.
 */
export function classifyEnglishWord(w: string): PartOfSpeech | null {
  if (CONJUNCTIONS.has(w)) {
    return 'conjunction';
  }
  if (PREPOSITIONS.has(w)) {
    return 'preposition';
  }
  if (PRONOUNS.has(w)) {
    return 'pronoun';
  }
  if (ADVERBS.has(w)) {
    return 'adverb';
  }
  if (ADJECTIVES.has(w)) {
    return 'adjective';
  }
  if (VERBS.has(w)) {
    return 'verb';
  }

  // Suffix rules for English
  if (w.endsWith('ly') && w.length > 4) {
    return 'adverb';
  }
  if (
    (w.endsWith('ful') || w.endsWith('less') || w.endsWith('ous') ||
     w.endsWith('ive') || w.endsWith('ish') || w.endsWith('able') ||
     w.endsWith('ible')) && w.length > 4
  ) {
    return 'adjective';
  }
  if (
    (w.endsWith('ize') || w.endsWith('ise') || w.endsWith('ing') || w.endsWith('ify')) && w.length > 4
  ) {
    return 'verb';
  }
  if (
    (w.endsWith('tion') || w.endsWith('sion') || w.endsWith('ness') ||
     w.endsWith('ment') || w.endsWith('ity') || w.endsWith('ism') ||
     w.endsWith('ist') || w.endsWith('ance') || w.endsWith('ence')) && w.length > 4
  ) {
    return 'noun';
  }

  return null;
}
