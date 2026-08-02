import type { Question, QuestionAnswer } from "@/generated/prisma/client";

export type QuizQuestion = Question & { answers: QuestionAnswer[] };

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface PreparedQuizQuestion {
  id: string;
  number: number;
  category: string;
  question: string;
  explanation: string | null;
  acceptedAnswers: string[];
  options: QuizOption[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

/**
 * Builds a 4-option multiple-choice question: the question's own primary
 * answer, plus 3 distractors pulled from other questions' answers
 * (preferring the same category for plausibility). Filters out any
 * candidate distractor that happens to also be one of this question's
 * own accepted answers.
 */
export function prepareQuizQuestion(
  question: QuizQuestion,
  pool: QuizQuestion[]
): PreparedQuizQuestion | null {
  const primaryAnswer = question.answers[0]?.text;
  if (!primaryAnswer) return null;

  const acceptedAnswers = question.answers.map((a) => a.text);
  const acceptedLower = new Set(acceptedAnswers.map((a) => a.toLowerCase()));

  const distractorCandidates = pool
    .filter((q) => q.id !== question.id)
    .flatMap((q) => q.answers.map((a) => ({ text: a.text, sameCategory: q.category === question.category })))
    .filter((a) => !acceptedLower.has(a.text.toLowerCase()));

  const sameCategory = shuffle(distractorCandidates.filter((a) => a.sameCategory));
  const otherCategory = shuffle(distractorCandidates.filter((a) => !a.sameCategory));
  const ranked = [...sameCategory, ...otherCategory];

  const distractors: string[] = [];
  const seen = new Set<string>([primaryAnswer.toLowerCase()]);
  for (const candidate of ranked) {
    const key = candidate.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(candidate.text);
    if (distractors.length === 3) break;
  }

  if (distractors.length < 3) return null; // not enough pool to build fair options

  const options: QuizOption[] = shuffle([
    { id: "correct", text: primaryAnswer, isCorrect: true },
    ...distractors.map((text, i) => ({ id: `distractor-${i}`, text, isCorrect: false })),
  ]);

  return {
    id: question.id,
    number: question.number,
    category: question.category,
    question: question.question,
    explanation: question.explanation,
    acceptedAnswers,
    options,
  };
}

/**
 * The real N-400 rule, generalized across test versions: the officer
 * asks up to `questionsAsked` questions and stops as soon as the
 * applicant has answered `passThreshold` correctly (pass) or enough
 * incorrectly that reaching `passThreshold` is no longer mathematically
 * possible (fail) — whichever comes first. For the 2008 test that's
 * 6-correct-or-5-incorrect out of 10; for the 2020 test it's
 * 12-correct-or-9-incorrect out of 20.
 */
export function mockInterviewStatus(
  correct: number,
  incorrect: number,
  passThreshold: number,
  questionsAsked: number
) {
  if (correct >= passThreshold) return { done: true, passed: true } as const;
  const maxPossibleCorrect = correct + (questionsAsked - correct - incorrect);
  if (maxPossibleCorrect < passThreshold) return { done: true, passed: false } as const;
  return { done: false, passed: null } as const;
}
