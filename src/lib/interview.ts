import { prisma } from "@/lib/prisma";
import { getQuizQuestionPool } from "@/lib/questions";
import { evaluateAnswer } from "@/lib/answer-matching";
import { mockInterviewStatus } from "@/lib/quiz";
import {
  READING_SENTENCES,
  WRITING_SENTENCES,
  pickRandomSentences,
  type InterviewSentence,
} from "@/lib/interview-sentences";
import { logger } from "@/lib/logger";
import type { InterviewSectionResult, Prisma } from "@/generated/prisma/client";

const READING_SENTENCES_SHOWN = 3;
const WRITING_SENTENCES_SHOWN = 3;

/**
 * Declared as a `type` rather than an `interface`, deliberately. Prisma's
 * `InputJsonObject` is a mapped type carrying a string index signature,
 * and TypeScript only grants an *implicit* index signature to type
 * aliases. Interfaces stay open to declaration merging, so TS can't
 * prove one remains JSON-compatible and refuses the assignment — which
 * is exactly what produced "Type 'ReadingWritingAttempt[]' is not
 * assignable to type 'Prisma.InputJsonValue'". As a type alias this is
 * structurally provable, so the writes below need no cast at all.
 */
type ReadingWritingAttempt = {
  sentence: string;
  /** `transcript` for reading (spoken), `typedAnswer` for writing (typed) — same shape, different key for clarity on the review screen. */
  transcript?: string;
  typedAnswer?: string;
  isCorrect: boolean;
};

/**
 * Every action function below takes `userId` and scopes its lookup to
 * `{ id: interviewId, userId }` — never just `{ id: interviewId }`. This
 * app has no notion of an admin acting on someone else's interview, so
 * every one of these calls MUST be the owning user, and this is enforced
 * here in the data layer rather than left to each API route to remember.
 * `findFirstOrThrow` (not `findUniqueOrThrow`) is required for the
 * compound check, since `{id, userId}` isn't a declared unique
 * constraint — `id` alone already is. A row that exists but belongs to
 * someone else throws the same "not found" as a row that doesn't exist
 * at all, which is the correct signal: it shouldn't be possible to learn
 * whether an interview ID exists by probing with someone else's session.
 */
async function getOwnedInterviewOrThrow(interviewId: string, userId: string) {
  return prisma.interviewSimulation.findFirstOrThrow({
    where: { id: interviewId, userId },
  });
}

/**
 * Starts a new interview: creates the DB row and selects this session's
 * reading sentences, writing sentences, and civics question pool. The
 * civics pool is returned in full (like practice-tests does) so the
 * client can prepare/reveal questions one at a time without a round trip
 * per question — matching the existing QuizSession pattern.
 */
export async function startInterview(userId: string, testVersionId: string) {
  const testVersion = await prisma.testVersion.findUniqueOrThrow({
    where: { id: testVersionId },
  });

  const interview = await prisma.interviewSimulation.create({
    data: { userId, testVersionId },
  });

  const civicsPool = await getQuizQuestionPool({ testVersionId });

  return {
    interviewId: interview.id,
    testVersion: {
      id: testVersion.id,
      name: testVersion.name,
      questionsAsked: testVersion.questionsAsked,
      passThreshold: testVersion.passThreshold,
    },
    readingSentences: pickRandomSentences(READING_SENTENCES, READING_SENTENCES_SHOWN),
    writingSentences: pickRandomSentences(WRITING_SENTENCES, WRITING_SENTENCES_SHOWN),
    civicsQuestions: pickRandomSentences(civicsPool, testVersion.questionsAsked),
  };
}

/** Marks the Identity Questions step as completed. No answer content is ever passed in or stored — see schema.prisma for why. */
export async function completeIdentityStep(interviewId: string, userId: string) {
  await getOwnedInterviewOrThrow(interviewId, userId);
  await prisma.interviewSimulation.update({
    where: { id: interviewId },
    data: { identityQuestionsCompleted: true },
  });
}

/**
 * Records one Reading attempt. ALMOST_CORRECT counts as passing here —
 * USCIS's own official standard for the English test explicitly tolerates
 * "noticeable errors...that do not interfere" with meaning, a more
 * lenient bar than civics fact-correctness (see recordCivicsAnswer).
 */
export async function recordReadingAttempt(
  interviewId: string,
  userId: string,
  sentence: InterviewSentence,
  transcript: string
) {
  const result = evaluateAnswer(transcript, [sentence.text]);
  const isCorrect = result.verdict === "CORRECT" || result.verdict === "ALMOST_CORRECT";

  const interview = await prisma.interviewSimulation.findFirstOrThrow({
    where: { id: interviewId, userId },
    select: { readingAttempts: true },
  });

  const existing = (interview.readingAttempts as ReadingWritingAttempt[] | null) ?? [];
  const attempts = [...existing, { sentence: sentence.text, transcript, isCorrect }];

  // Once one attempt passes, the section is PASSED — matches "stops as
  // soon as one of three is read correctly." Only FAILED once all 3 have
  // been tried and none passed; otherwise still in progress.
  const alreadyPassed = existing.some((a) => a.isCorrect);
  const sectionResult: InterviewSectionResult =
    alreadyPassed || isCorrect ? "PASSED" : attempts.length >= 3 ? "FAILED" : "NOT_REACHED";

  await prisma.interviewSimulation.update({
    where: { id: interviewId },
    data: { readingResult: sectionResult, readingAttempts: attempts satisfies Prisma.InputJsonValue },
  });

  return { isCorrect, sectionResult, attemptsSoFar: attempts.length };
}

/** Records one Writing attempt. Same lenient-matching and stop-on-pass logic as Reading — see recordReadingAttempt. */
export async function recordWritingAttempt(
  interviewId: string,
  userId: string,
  sentence: InterviewSentence,
  typedAnswer: string
) {
  const result = evaluateAnswer(typedAnswer, [sentence.text]);
  const isCorrect = result.verdict === "CORRECT" || result.verdict === "ALMOST_CORRECT";

  const interview = await prisma.interviewSimulation.findFirstOrThrow({
    where: { id: interviewId, userId },
    select: { writingAttempts: true },
  });

  const existing = (interview.writingAttempts as ReadingWritingAttempt[] | null) ?? [];
  const attempts = [...existing, { sentence: sentence.text, typedAnswer, isCorrect }];

  const alreadyPassed = existing.some((a) => a.isCorrect);
  const sectionResult: InterviewSectionResult =
    alreadyPassed || isCorrect ? "PASSED" : attempts.length >= 3 ? "FAILED" : "NOT_REACHED";

  await prisma.interviewSimulation.update({
    where: { id: interviewId },
    data: { writingResult: sectionResult, writingAttempts: attempts satisfies Prisma.InputJsonValue },
  });

  return { isCorrect, sectionResult, attemptsSoFar: attempts.length };
}

/**
 * Records one Civics answer. Unlike Reading/Writing, only an exact
 * CORRECT verdict counts — civics is tested on factual correctness, not
 * "ordinary usage" comprehensibility, so this stays strict.
 */
export async function recordCivicsAnswer(
  interviewId: string,
  userId: string,
  questionId: string,
  answerText: string,
  acceptedAnswers: string[],
  requiredAnswerCount: number,
  passThreshold: number,
  questionsAsked: number
) {
  await getOwnedInterviewOrThrow(interviewId, userId);

  const result = evaluateAnswer(answerText, acceptedAnswers, requiredAnswerCount);
  const isCorrect = result.verdict === "CORRECT";

  await prisma.interviewCivicsAnswer.create({
    data: { interviewId, questionId, isCorrect, spokenAnswer: answerText },
  });

  const interview = await prisma.interviewSimulation.update({
    where: { id: interviewId },
    data: isCorrect
      ? { civicsCorrectCount: { increment: 1 } }
      : { civicsIncorrectCount: { increment: 1 } },
  });

  const status = mockInterviewStatus(
    interview.civicsCorrectCount,
    interview.civicsIncorrectCount,
    passThreshold,
    questionsAsked
  );

  if (status.done) {
    await prisma.interviewSimulation.update({
      where: { id: interviewId },
      data: { civicsResult: status.passed ? "PASSED" : "FAILED" },
    });
  }

  return { isCorrect, verdict: result.verdict, ...status };
}

/**
 * Finalizes the interview: computes overall pass/fail (every *reached*
 * section must have passed — a section left NOT_REACHED because the
 * interview was cut short doesn't count against the applicant, matching
 * how an abandoned attempt shouldn't read as a failed one in history).
 */
export async function completeInterview(interviewId: string, userId: string) {
  const interview = await getOwnedInterviewOrThrow(interviewId, userId);

  const sectionResults = [interview.readingResult, interview.writingResult, interview.civicsResult];
  const reached = sectionResults.filter((r) => r !== "NOT_REACHED");
  const passed = reached.length > 0 && reached.every((r) => r === "PASSED");

  const durationSec = Math.round((Date.now() - interview.startedAt.getTime()) / 1000);

  try {
    return await prisma.interviewSimulation.update({
      where: { id: interviewId },
      data: { completedAt: new Date(), durationSec, passed },
    });
  } catch (error) {
    logger.error("lib.interview.complete", "Could not finalize interview", error);
    throw error;
  }
}

export async function getInterviewHistory(userId: string) {
  return prisma.interviewSimulation.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    include: { testVersion: { select: { name: true } } },
  });
}

export async function getInterviewDetail(interviewId: string, userId: string) {
  const interview = await prisma.interviewSimulation.findFirst({
    where: { id: interviewId, userId },
    include: {
      testVersion: { select: { name: true, passThreshold: true, questionsAsked: true } },
      civicsAnswers: {
        include: {
          question: {
            select: {
              number: true,
              question: true,
              category: true,
              answers: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
        orderBy: { answeredAt: "asc" },
      },
    },
  });

  if (!interview) return null;

  // Accuracy per category, weakest first — this is what powers "Weak
  // Categories" and the study recommendation on the results screen.
  // Computed here rather than in the API route or the component, so
  // there's exactly one place this aggregation exists.
  const byCategory = new Map<string, { correct: number; total: number }>();
  for (const answer of interview.civicsAnswers) {
    const category = answer.question.category;
    const stats = byCategory.get(category) ?? { correct: 0, total: 0 };
    stats.total += 1;
    if (answer.isCorrect) stats.correct += 1;
    byCategory.set(category, stats);
  }
  const categoryPerformance = Array.from(byCategory.entries())
    .map(([category, { correct, total }]) => ({
      category,
      correct,
      total,
      accuracyPercent: Math.round((correct / total) * 100),
    }))
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent);

  return { ...interview, categoryPerformance };
}
