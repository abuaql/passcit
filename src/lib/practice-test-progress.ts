/**
 * Practice-test completion — extracted from the route handler so it can
 * be tested directly against the database (routes call requireUser(),
 * which needs a real Next.js request scope and can't run in a bare
 * script). This is the one behavior change beyond adding XP: the
 * existing check-then-act idempotency check (`if (test.completedAt)`)
 * had a race window under concurrent submissions — two simultaneous
 * requests could both read `completedAt: null` before either wrote.
 * Awarding XP safely requires knowing unambiguously "am I the one who
 * just completed this," so the grading write is now a conditional
 * `updateMany` guard (the same pattern already used by unit exam
 * completion), inside one transaction with the answer rows and the XP
 * award. External behavior is otherwise unchanged: still 409 on a
 * genuine re-submit, same success response shape.
 */

import { prisma } from "@/lib/prisma";
import { recordQuizAnswer, recordStudyActivity } from "@/lib/progress";
import { awardXP } from "@/lib/xp";

export interface PracticeTestAnswerInput {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

export interface CompletePracticeTestInput {
  answers: PracticeTestAnswerInput[];
  stoppedEarly: boolean;
}

export type CompletePracticeTestResult =
  | { status: "not_found" }
  | { status: "already_completed" }
  | { status: "ok"; score: number; totalQuestions: number; passed: boolean; stoppedEarly: boolean };

export async function completePracticeTest(
  userId: string,
  testId: string,
  input: CompletePracticeTestInput
): Promise<CompletePracticeTestResult> {
  const test = await prisma.practiceTest.findUnique({
    where: { id: testId },
    include: { testVersion: { select: { passThreshold: true } } },
  });
  if (!test || test.userId !== userId) return { status: "not_found" };
  if (test.completedAt) return { status: "already_completed" };

  const { answers, stoppedEarly } = input;
  const score = answers.filter((a) => a.isCorrect).length;
  const passed =
    test.mode === "MOCK_INTERVIEW" ? score >= test.testVersion.passThreshold : score / answers.length >= 0.6;
  const now = new Date();

  const wonTheRace = await prisma.$transaction(async (tx) => {
    // Conditional on still being uncompleted — if a concurrent request
    // already completed this exact test, this matches zero rows and we
    // back off rather than grading (and awarding XP) twice.
    const guarded = await tx.practiceTest.updateMany({
      where: { id: testId, completedAt: null },
      data: { score, passed, stoppedEarly, completedAt: now },
    });
    if (guarded.count === 0) return false;

    await tx.practiceTestAnswer.createMany({
      data: answers.map((a) => ({
        testId,
        questionId: a.questionId,
        userAnswer: a.selectedAnswer,
        isCorrect: a.isCorrect,
      })),
    });

    // Completing a practice test earns XP regardless of pass/fail — same
    // "attempting is study activity" principle recordStudyActivity below
    // already applies unconditionally.
    await awardXP(tx, userId, "PRACTICE_TEST_COMPLETED", testId);

    return true;
  });

  if (!wonTheRace) return { status: "already_completed" };

  for (const answer of answers) {
    await recordQuizAnswer(userId, answer.questionId, answer.isCorrect);
  }
  await recordStudyActivity(userId, test.testVersionId, answers.length);

  return { status: "ok", score, totalQuestions: answers.length, passed, stoppedEarly };
}
