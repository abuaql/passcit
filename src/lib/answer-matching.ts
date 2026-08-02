/**
 * Rule-based, fully offline answer matching for Voice Interview Mode.
 * No network calls, no AI/ML model — a deterministic pipeline of text
 * normalization plus a blended similarity score. That's a real tradeoff
 * worth being upfront about: this catches wording/pronunciation/filler
 * noise well, but it cannot recognize a genuine paraphrase that shares no
 * vocabulary with the official answer (e.g. describing "the Constitution"
 * as "the highest law of the land" without ever saying the word). Nothing
 * here claims true semantic understanding — see the README for specifics.
 */

export type MatchVerdict = "CORRECT" | "ALMOST_CORRECT" | "INCORRECT";

export interface MatchResult {
  verdict: MatchVerdict;
  /** 0–1 confidence score behind the verdict, mainly useful for debugging/tuning. */
  score: number;
  /** Which of the accepted answers scored highest against the transcript. */
  bestMatch: string | null;
  /** For multi-answer questions ("name two..."), how many distinct accepted answers were detected. */
  matchedCount: number;
  requiredCount: number;
}

const CORRECT_THRESHOLD = 0.72;
const ALMOST_THRESHOLD = 0.4;
// A single accepted answer counts as "found" in a multi-answer transcript
// once it clears this (lower) bar — deliberately more lenient than the
// single-answer thresholds above, since it only has to be identified
// among several things the person said, not be the whole utterance.
const PRESENCE_THRESHOLD = 0.6;

const FILLER_PHRASES = [
  "i think it's",
  "i think it is",
  "i believe it's",
  "i believe it is",
  "i would say",
  "i guess",
  "my answer is",
  "the answer is",
  "it's",
  "it is",
  "um",
  "umm",
  "uh",
  "uhh",
  "ah",
  "er",
  "like",
  "so",
  "well",
  "actually",
  "basically",
  "you know",
];

// Structural function words safe to ignore for correctness purposes —
// explicitly a/an/the per spec, plus conjunctions that naturally show up
// when someone lists multiple things ("life AND liberty").
const STRUCTURAL_WORDS = new Set(["a", "an", "the", "and", "or"]);

// A modest, hand-picked table of civics-relevant equivalences — not a
// general thesaurus. Multi-word phrases are listed before single words so
// longer matches are replaced first. Applied to both the transcript and
// the official answer, so either form lines up after normalization.
const SYNONYM_MAP: Array<[RegExp, string]> = [
  [/\bunited states of america\b/g, "us"],
  [/\bunited states\b/g, "us"],
  [/\bamerica\b/g, "us"],
  [/\busa\b/g, "us"],
  [/\blegislative branch\b/g, "congress"],
  [/\blegislature\b/g, "congress"],
  [/\bchief executive\b/g, "president"],
  [/\bcommander in chief\b/g, "president"],
  [/\bjudicial branch\b/g, "courts"],
  [/\bsupreme court\b/g, "courts"],
  [/\bexecutive branch\b/g, "president"],
  [/\bfreedom\b/g, "liberty"],
  [/\blawmakers\b/g, "congress"],
  [/\bhouse of representatives\b/g, "house"],
  [/\brepresentatives\b/g, "house"],
  [/\bsenators?\b/g, "senate"],
];

// Spoken numbers are common in this content ("twenty-seven," "nine") and
// speech recognition doesn't always transcribe them as digits — most
// stored official answers already include both forms, but this catches
// the rest cheaply.
const ONES_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS_WORDS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** Parses a compound spoken number ("twenty seven" -> 27) starting at words[0], if there is one. */
function parseNumberPhrase(words: string[]): { value: number; consumed: number } | null {
  const first = words[0];
  if (first === undefined) return null;

  if (first in TENS_WORDS) {
    const second = words[1];
    if (second !== undefined && second in ONES_WORDS && ONES_WORDS[second]! > 0) {
      return { value: TENS_WORDS[first]! + ONES_WORDS[second]!, consumed: 2 };
    }
    return { value: TENS_WORDS[first]!, consumed: 1 };
  }
  if (first in ONES_WORDS) {
    return { value: ONES_WORDS[first]!, consumed: 1 };
  }
  return null;
}

function applyNumberWords(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  const result: string[] = [];
  let i = 0;
  while (i < words.length) {
    const parsed = parseNumberPhrase(words.slice(i));
    if (parsed) {
      result.push(String(parsed.value));
      i += parsed.consumed;
    } else {
      result.push(words[i]!);
      i += 1;
    }
  }
  return result.join(" ");
}

/**
 * Collapses runs of lone single letters back into one token — punctuation
 * stripping turns "D.C." into isolated "d" "c" tokens, which then can't
 * match a spoken "dc". Also what makes "U.S." line up with "us"/"usa"
 * once the synonym pass runs afterward.
 */
function collapseLetterAbbreviations(words: string[]): string[] {
  const result: string[] = [];
  let buffer = "";
  for (const word of words) {
    if (word.length === 1 && /[a-z]/.test(word)) {
      buffer += word;
    } else {
      if (buffer) {
        result.push(buffer);
        buffer = "";
      }
      result.push(word);
    }
  }
  if (buffer) result.push(buffer);
  return result;
}

function stripFillers(text: string): string {
  let result = text;
  for (const phrase of FILLER_PHRASES) {
    result = result.replace(new RegExp(`\\b${phrase.replace(/'/g, "'?")}\\b`, "g"), " ");
  }
  return result;
}

function applySynonyms(text: string): string {
  let result = text;
  for (const [pattern, replacement] of SYNONYM_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/** Conservative suffix stripping — enough for plain plurals, not a full stemmer. */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 3 && word.endsWith("es") && !word.endsWith("ses")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function normalize(text: string): string {
  let t = text.toLowerCase().trim();
  t = t.replace(/[.,!?;:"'()]/g, " ");

  // Punctuation stripping turns "D.C." into isolated "d"/"c" tokens —
  // collapse those back into "dc" before anything else runs, so later
  // string-level steps (fillers, synonyms) see it as one word.
  t = collapseLetterAbbreviations(t.split(/\s+/).filter(Boolean)).join(" ");

  t = stripFillers(t);
  t = applySynonyms(t);
  t = applyNumberWords(t);
  const words = t
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STRUCTURAL_WORDS.has(w))
    .map(stem);
  return words.join(" ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) dist[i]![0] = i;
  for (let j = 0; j < cols; j++) dist[0]![j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i]![j] = Math.min(
        dist[i - 1]![j]! + 1, // deletion
        dist[i]![j - 1]! + 1, // insertion
        dist[i - 1]![j - 1]! + cost // substitution
      );
    }
  }
  return dist[rows - 1]![cols - 1]!;
}

function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Similarity between a spoken transcript and ONE accepted answer, 0–1.
 * Blends three signals: whether one contains the other outright (very
 * common — short official answers spoken inside a fuller sentence), how
 * much of the official answer's words show up in the transcript (allowing
 * per-word fuzzy matches for minor mis-transcriptions), and overall
 * string-edit similarity as a catch-all for close phrasing.
 */
function scoreAgainstAnswer(rawTranscript: string, rawAnswer: string): number {
  const transcript = normalize(rawTranscript);
  const answer = normalize(rawAnswer);

  if (!transcript || !answer) return 0;
  if (transcript === answer) return 1;

  const contained = transcript.includes(answer) || answer.includes(transcript);

  const answerWords = answer.split(" ").filter(Boolean);
  const transcriptWords = transcript.split(" ").filter(Boolean);
  let matched = 0;
  for (const aWord of answerWords) {
    if (transcriptWords.includes(aWord)) {
      matched++;
      continue;
    }
    const closeEnough = transcriptWords.some((tWord) => wordSimilarity(aWord, tWord) >= 0.8);
    if (closeEnough) matched++;
  }
  const wordRecall = answerWords.length > 0 ? matched / answerWords.length : 0;

  const editSim = 1 - levenshtein(transcript, answer) / Math.max(transcript.length, answer.length);

  if (contained) return Math.max(0.92, wordRecall);
  return wordRecall * 0.7 + editSim * 0.3;
}

/**
 * Evaluates a spoken transcript against a question's accepted answers.
 *
 * - Single-answer questions: score is the best match across all accepted
 *   phrasings (only one needs to line up).
 * - Multi-answer questions ("name two rights…"): counts how many
 *   *distinct* accepted answers appear to have been named, using a lower
 *   per-answer bar since each only has to be identified within a longer
 *   utterance, not match it in full.
 */
export function evaluateAnswer(
  transcript: string,
  acceptedAnswers: string[],
  requiredAnswerCount = 1
): MatchResult {
  const candidates = acceptedAnswers.filter((a) => a.trim().length > 0);

  if (candidates.length === 0 || !transcript.trim()) {
    return { verdict: "INCORRECT", score: 0, bestMatch: null, matchedCount: 0, requiredCount: requiredAnswerCount };
  }

  const scored = candidates
    .map((answer) => ({ answer, score: scoreAgainstAnswer(transcript, answer) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0]!;

  if (requiredAnswerCount <= 1) {
    const verdict: MatchVerdict =
      best.score >= CORRECT_THRESHOLD ? "CORRECT" : best.score >= ALMOST_THRESHOLD ? "ALMOST_CORRECT" : "INCORRECT";
    return {
      verdict,
      score: best.score,
      bestMatch: best.answer,
      matchedCount: best.score >= PRESENCE_THRESHOLD ? 1 : 0,
      requiredCount: 1,
    };
  }

  // Multi-answer: count distinct accepted answers that appear to be present.
  const present = scored.filter((s) => s.score >= PRESENCE_THRESHOLD);
  const matchedCount = present.length;
  const verdict: MatchVerdict =
    matchedCount >= requiredAnswerCount ? "CORRECT" : matchedCount > 0 ? "ALMOST_CORRECT" : "INCORRECT";

  return {
    verdict,
    score: best.score,
    bestMatch: best.answer,
    matchedCount,
    requiredCount: requiredAnswerCount,
  };
}
