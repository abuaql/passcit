/**
 * Roadmap mutations: lesson completion, unit exam start, unit exam
 * completion. Split from roadmap.ts's pure reads on purpose — this file
 * is the only place that ever writes LessonProgress/UnitProgress/
 * UnitExamAttempt rows, mirroring how src/lib/progress.ts (writes) is
 * already kept separate from src/lib/questions.ts (reads) in this
 * codebase.
 */

import { prisma } from "@/lib/prisma";
import { recordStudyActivity } from "@/lib/progress";
import { getUnit, getLesson, type UnitDetail, type LessonDetail } from "@/lib/roadmap";
import { prepareQuizQuestion, type QuizQuestion } from "@/lib/quiz";
import { awardXP } from "@/lib/xp";
import { Prisma, type UnitExamAttemptResult } from "@/generated/prisma/client";

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// ── Lesson completion ────────────────────────────────────────────────────

export type CompleteLessonResult =
  | { status: "not_found" }
  | { status: "locked" }
  | { status: "ok"; alreadyCompleted: boolean; lesson: LessonDetail; unit: UnitDetail };

export async function completeLesson(userId: string, lessonId: string): Promise<CompleteLessonResult> {
  const lesson = await getLesson(userId, lessonId);
  if (!lesson) return { status: "not_found" };
  if (lesson.status === "LOCKED") return { status: "locked" };

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
  const alreadyCompleted = existing?.status === "COMPLETED";

  // Idempotent, and race-safe under concurrency: only the request that
  // wins the INSERT (a plain upsert wouldn't distinguish "I just created
  // this" from "it already existed") writes anything, logs study
  // activity, or awards XP. A LessonProgress row is only ever created
  // here — no other code path writes one — so a unique-constraint
  // violation on create() unambiguously means a concurrent request just
  // won this exact race; that loser rolls back its whole transaction
  // (including any XP it would have awarded) and simply re-reports the
  // winner's persisted state below.
  if (!alreadyCompleted) {
    const now = new Date();
    let wonTheRace = true;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.lessonProgress.create({
          data: { userId, lessonId, status: "COMPLETED", completedAt: now },
        });
        await awardXP(tx, userId, "LESSON_COMPLETED", lessonId);
      });
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) throw error;
      wonTheRace = false;
    }

    if (wonTheRace) {
      const unitForActivity = await prisma.lesson.findUniqueOrThrow({
        where: { id: lessonId },
        select: { unit: { select: { testVersionId: true } } },
      });
      await recordStudyActivity(userId, unitForActivity.unit.testVersionId, Math.max(lesson.questions.length, 1));
    }
  }

  const [updatedLesson, updatedUnit] = await Promise.all([getLesson(userId, lessonId), getUnit(userId, lesson.unitId)]);

  return {
    status: "ok",
    alreadyCompleted,
    lesson: updatedLesson!,
    unit: updatedUnit!,
  };
}

// ── Unit exam start ───────────────────────────────────────────────────────

export interface StartedExamQuestion {
  id: string;
  number: number;
  category: string;
  question: string;
  options: Array<{ id: string; text: string }>;
}

export type StartUnitExamResult =
  | { status: "not_found" }
  | { status: "locked" }
  | { status: "not_available" }
  | { status: "insufficient_questions" }
  | {
      status: "ok";
      attemptId: string;
      passThreshold: number;
      totalQuestions: number;
      questions: StartedExamQuestion[];
    };

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function startUnitExam(userId: string, unitId: string): Promise<StartUnitExamResult> {
  const unit = await getUnit(userId, unitId);
  if (!unit) return { status: "not_found" };
  if (unit.status === "LOCKED") return { status: "locked" };
  if (!unit.exam || !unit.examAvailable) return { status: "not_available" };

  const unitExam = await prisma.unitExam.findUniqueOrThrow({
    where: { unitId },
    include: {
      examQuestions: {
        include: { question: { include: { answers: { orderBy: { sortOrder: "asc" } } } } },
      },
    },
  });

  // If a curated pool exists, it is used exclusively (filtered for
  // eligibility) — never silently topped up from the lesson pool. Only an
  // EMPTY curated pool falls back to drawing from the unit's lessons.
  let candidateQuestions: QuizQuestion[] = unitExam.examQuestions
    .map((eq) => eq.question)
    .filter((q) => q.isActive && !q.variesByLocation);

  if (unitExam.examQuestions.length === 0) {
    const lessonQuestions = await prisma.lessonQuestion.findMany({
      where: { lesson: { unitId, isActive: true } },
      include: { question: { include: { answers: { orderBy: { sortOrder: "asc" } } } } },
    });
    const byId = new Map<string, QuizQuestion>();
    for (const lq of lessonQuestions) {
      if (lq.question.isActive && !lq.question.variesByLocation) byId.set(lq.question.id, lq.question);
    }
    candidateQuestions = [...byId.values()];
  }

  if (candidateQuestions.length < unitExam.questionCount) {
    return { status: "insufficient_questions" };
  }

  const selected = pickRandom(candidateQuestions, unitExam.questionCount);
  const prepared = selected
    .map((q) => prepareQuizQuestion(q, candidateQuestions))
    .filter((q): q is NonNullable<typeof q> => q !== null);

  if (prepared.length < unitExam.questionCount) {
    return { status: "insufficient_questions" }; // couldn't build fair MC options for enough of them
  }

  const attempt = await prisma.unitExamAttempt.create({
    data: {
      unitExamId: unitExam.id,
      userId,
      totalQuestions: prepared.length,
      result: "IN_PROGRESS",
      // The fixed, ordered set of questions this specific attempt asked —
      // grading at completion validates against exactly this, regardless
      // of how the pool looks by then.
      questionIds: prepared.map((p) => p.id),
    },
  });

  return {
    status: "ok",
    attemptId: attempt.id,
    passThreshold: unitExam.passThreshold,
    totalQuestions: prepared.length,
    questions: prepared.map((p) => ({
      id: p.id,
      number: p.number,
      category: p.category,
      question: p.question,
      // Deliberately NOT p.options as-is: prepareQuizQuestion's own
      // option ids ("correct" / "distractor-0") would leak the answer
      // through the id itself. Fresh, positional, non-revealing ids only
      // — and no `isCorrect` field, no accepted-answers list.
      options: p.options.map((o, i) => ({ id: `option-${i}`, text: o.text })),
    })),
  };
}

// ── Unit exam completion ─────────────────────────────────────────────────

export interface SubmittedAnswer {
  questionId: string;
  selectedAnswer: string;
}

export interface PublicUnitExamAttempt {
  id: string;
  result: UnitExamAttemptResult;
  score: number | null;
  totalQuestions: number;
  passThreshold: number;
  completedAt: Date | null;
}

export type CompleteUnitExamResult =
  | { status: "not_found" }
  | { status: "invalid_submission" }
  | { status: "ok"; alreadyCompleted: boolean; attempt: PublicUnitExamAttempt };

function toPublicAttempt(
  attempt: {
    id: string;
    result: UnitExamAttemptResult;
    score: number | null;
    totalQuestions: number;
    completedAt: Date | null;
  },
  passThreshold: number
): PublicUnitExamAttempt {
  return {
    id: attempt.id,
    result: attempt.result,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    passThreshold,
    completedAt: attempt.completedAt,
  };
}

export async function completeUnitExam(
  userId: string,
  unitId: string,
  attemptId: string,
  answers: SubmittedAnswer[]
): Promise<CompleteUnitExamResult> {
  const attempt = await prisma.unitExamAttempt.findUnique({
    where: { id: attemptId },
    include: { unitExam: { select: { id: true, unitId: true, passThreshold: true } } },
  });

  // Ownership + scoping in one check: an attempt that doesn't exist,
  // belongs to a different user, or belongs to a different unit's exam
  // are all reported identically — never revealing which.
  if (!attempt || attempt.userId !== userId || attempt.unitExam.unitId !== unitId) {
    return { status: "not_found" };
  }

  if (attempt.result !== "IN_PROGRESS") {
    // Idempotent replay — never re-grade, just report what already happened.
    return { status: "ok", alreadyCompleted: true, attempt: toPublicAttempt(attempt, attempt.unitExam.passThreshold) };
  }

  const expectedQuestionIds = attempt.questionIds as string[];
  const submittedIds = answers.map((a) => a.questionId);
  const expectedSet = new Set(expectedQuestionIds);
  const submittedSet = new Set(submittedIds);
  const validSubmission =
    submittedIds.length === expectedQuestionIds.length &&
    submittedSet.size === submittedIds.length && // no duplicate question ids within the submission
    submittedIds.every((id) => expectedSet.has(id)) &&
    expectedQuestionIds.every((id) => submittedSet.has(id));

  if (!validSubmission) return { status: "invalid_submission" };

  // Grade server-side against the question bank's own primary accepted
  // answer — the same definition of "correct" prepareQuizQuestion used to
  // build the options in the first place. Never trust a client-reported
  // correctness flag (this exam never sent one).
  const questions = await prisma.question.findMany({
    where: { id: { in: expectedQuestionIds } },
    include: { answers: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  const correctAnswerByQuestionId = new Map(questions.map((q) => [q.id, q.answers[0]?.text ?? null]));

  let score = 0;
  for (const answer of answers) {
    const correct = correctAnswerByQuestionId.get(answer.questionId);
    if (correct !== null && correct !== undefined && answer.selectedAnswer === correct) score++;
  }

  const passed = score >= attempt.unitExam.passThreshold;
  const now = new Date();

  const graded = await prisma.$transaction(async (tx) => {
    // Conditional on still being IN_PROGRESS — if a concurrent request
    // already graded this exact attempt, this matches zero rows and we
    // back off rather than grading (and unlocking) twice.
    const guarded = await tx.unitExamAttempt.updateMany({
      where: { id: attemptId, result: "IN_PROGRESS" },
      data: { result: passed ? "PASSED" : "FAILED", score, completedAt: now },
    });
    if (guarded.count === 0) return null;

    if (passed) {
      await tx.unitProgress.upsert({
        where: { userId_unitId: { userId, unitId } },
        update: { examPassed: true, status: "COMPLETED", completedAt: now },
        create: { userId, unitId, examPassed: true, status: "COMPLETED", completedAt: now },
      });
      // Only on a genuine first-time PASS — the updateMany guard above
      // already ensures this whole branch runs at most once per attempt,
      // so no separate idempotency check is needed here for XP.
      await awardXP(tx, userId, "UNIT_EXAM_PASSED", attemptId);
    }

    return tx.unitExamAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  });

  if (!graded) {
    const current = await prisma.unitExamAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    return {
      status: "ok",
      alreadyCompleted: true,
      attempt: toPublicAttempt(current, attempt.unitExam.passThreshold),
    };
  }

  // Attempting an exam is study activity regardless of outcome — matches
  // how /api/practice-tests/[id]/complete calls this unconditionally.
  const examUnit = await prisma.unitExam.findUniqueOrThrow({
    where: { id: attempt.unitExamId },
    select: { unit: { select: { testVersionId: true } } },
  });
  await recordStudyActivity(userId, examUnit.unit.testVersionId, answers.length);

  return {
    status: "ok",
    alreadyCompleted: false,
    attempt: toPublicAttempt(graded, attempt.unitExam.passThreshold),
  };
}
