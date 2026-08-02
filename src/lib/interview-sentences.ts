/**
 * Reading and Writing test sentences for the Naturalization Interview
 * Simulation (Phase 7).
 *
 * These are original sentences written for this app, using the same
 * vocabulary scope and civics/history topic focus as the official USCIS
 * Reading and Writing Vocabulary Lists — not reproduced from any specific
 * source's exact sentences.
 *
 * Format follows the real test exactly (uscis.gov/policy-manual/volume-12-part-e-chapter-2):
 * - Reading: the officer shows up to 3 sentences; the applicant reads one
 *   aloud correctly to pass. Official sentences are interrogative (questions),
 *   so these are too.
 * - Writing: the officer reads one sentence aloud; the applicant writes what
 *   they heard. Up to 3 sentences, 1 correct to pass.
 * - Both use the same lenient "ordinary usage" standard as the rest of this
 *   app's answer matching — noticeable spelling/pronunciation errors that
 *   don't obscure meaning are expected to pass, not fail.
 *
 * Every factual claim below was checked for accuracy — this is an
 * educational app, and these sentences double as light civics review even
 * though they aren't scored the way the Civics section is.
 */

export interface InterviewSentence {
  id: string;
  text: string;
}

export const READING_SENTENCES: InterviewSentence[] = [
  { id: "r1", text: "What is the capital of the United States?" },
  { id: "r2", text: "Who is the President now?" },
  { id: "r3", text: "What are the colors of the flag?" },
  { id: "r4", text: "How many states are there?" },
  { id: "r5", text: "What is the name of the President's house?" },
  { id: "r6", text: "Where does Congress meet?" },
  { id: "r7", text: "What is the supreme law of the country?" },
  { id: "r8", text: "When is Independence Day?" },
  { id: "r9", text: "Who can vote for the President?" },
  { id: "r10", text: "What is the name of the national anthem?" },
  { id: "r11", text: "How many branches does the government have?" },
  { id: "r12", text: "What is one right of every citizen?" },
  { id: "r13", text: "Who was the first President?" },
  { id: "r14", text: "What ocean is on the east coast?" },
  { id: "r15", text: "Where do the President and Congress work?" },
  { id: "r16", text: "What do citizens do on Election Day?" },
  { id: "r17", text: "How many senators does each state have?" },
  { id: "r18", text: "What is the name of the President's cabinet?" },
];

export const WRITING_SENTENCES: InterviewSentence[] = [
  { id: "w1", text: "Citizens can vote." },
  { id: "w2", text: "The President lives in the White House." },
  { id: "w3", text: "The flag is red, white, and blue." },
  { id: "w4", text: "Congress meets in the Capitol." },
  { id: "w5", text: "The Constitution is the supreme law." },
  { id: "w6", text: "Many Americans have jobs." },
  { id: "w7", text: "The United States has fifty states." },
  { id: "w8", text: "Freedom of speech is a right." },
  { id: "w9", text: "The government has three branches." },
  { id: "w10", text: "Independence Day is in July." },
  { id: "w11", text: "The Senate is part of Congress." },
  { id: "w12", text: "Citizens elect their leaders." },
  { id: "w13", text: "Washington was the first President." },
  { id: "w14", text: "The White House is in Washington." },
  { id: "w15", text: "Americans have many rights." },
  { id: "w16", text: "Every state has two senators." },
  { id: "w17", text: "The President can veto a bill." },
];

/** Picks `count` items at random, without repeats, from any array. */
export function pickRandomSentences<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}
