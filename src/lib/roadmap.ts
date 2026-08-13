/**
 * Read-only roadmap queries: the full roadmap, a single unit, a single
 * lesson (with inline question content), and the pure unlock-state
 * computation they all share.
 *
 * Hard rule: every exported function here is a pure read. None of them
 * write to the database — UnitProgress/LessonProgress rows are only ever
 * created or updated by the write operations in roadmap-progress.ts.
 * Unlock state for a user who has never touched a unit/lesson is derived
 * live from whatever progress rows DO exist (possibly none at all), never
 * defaulted by creating a row here.
 */

import { prisma } from "@/lib/prisma";
import type { ProgressStatus, QuestionCategory } from "@/generated/prisma/client";

export interface RoadmapLessonSummary {
  id: string;
  slug: string;
  title: string;
  order: number;
  status: ProgressStatus;
  questionCount: number;
}

export interface RoadmapUnitSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  status: ProgressStatus;
  lessons: RoadmapLessonSummary[];
  examAvailable: boolean;
  examPassed: boolean;
}

export type ResumeTarget =
  | { type: "lesson"; unitId: string; lessonId: string }
  | { type: "exam"; unitId: string }
  | null;

export interface Roadmap {
  testVersionId: string;
  units: RoadmapUnitSummary[];
  resumeTarget: ResumeTarget;
}

export interface UnitDetail extends RoadmapUnitSummary {
  testVersionId: string;
  exam: { questionCount: number; passThreshold: number } | null;
}

export interface LessonQuestionContent {
  id: string;
  number: number;
  category: QuestionCategory;
  subcategory: string;
  question: string;
  explanation: string | null;
  answers: string[];
  requiredAnswerCount: number;
  isSpecial65_20: boolean;
  isDynamicAnswer: boolean;
  dynamicNote: string | null;
  variesByLocation: boolean;
}

export interface LessonDetail {
  id: string;
  unitId: string;
  slug: string;
  title: string;
  summary: string | null;
  order: number;
  status: ProgressStatus;
  questions: LessonQuestionContent[];
}

// ── Pure computation (no I/O) ────────────────────────────────────────────

/** Rule: the first unit is always available; every other unit unlocks only once the previous unit's exam has been passed. */
export function computeLessonStatus(params: {
  unitUnlocked: boolean;
  isFirstLesson: boolean;
  previousLessonCompleted: boolean;
  thisLessonCompleted: boolean;
}): ProgressStatus {
  if (!params.unitUnlocked) return "LOCKED";
  if (params.thisLessonCompleted) return "COMPLETED";
  if (params.isFirstLesson || params.previousLessonCompleted) return "AVAILABLE";
  return "LOCKED";
}

/**
 * A unit is COMPLETED only via its own exam being passed — never merely
 * from finishing its lessons, and never influenced by XP. IN_PROGRESS is
 * a purely derived signal (at least one lesson done, exam not yet
 * passed) — nothing persists it; re-derived fresh on every read.
 */
export function computeUnitStatus(params: {
  unlocked: boolean;
  examPassed: boolean;
  completedLessonCount: number;
}): ProgressStatus {
  if (!params.unlocked) return "LOCKED";
  if (params.examPassed) return "COMPLETED";
  if (params.completedLessonCount > 0) return "IN_PROGRESS";
  return "AVAILABLE";
}

export function computeResumeTarget(units: RoadmapUnitSummary[]): ResumeTarget {
  for (const unit of units) {
    if (unit.status === "LOCKED") break; // nothing unlocked-but-incomplete beyond this point
    if (unit.status === "COMPLETED") continue;
    const nextLesson = unit.lessons.find((l) => l.status !== "COMPLETED");
    if (nextLesson) return { type: "lesson", unitId: unit.id, lessonId: nextLesson.id };
    return { type: "exam", unitId: unit.id }; // every lesson done, exam not yet passed
  }
  return null; // every unit completed (or the roadmap is empty)
}

interface LessonForComputation {
  id: string;
  slug: string;
  title: string;
  order: number;
  lessonQuestions: { id: string }[];
}

function computeUnitAndLessons(
  lessons: LessonForComputation[],
  unlocked: boolean,
  examPassed: boolean,
  hasExam: boolean,
  lessonProgressByLessonId: Map<string, { status: ProgressStatus }>
): { lessons: RoadmapLessonSummary[]; unitStatus: ProgressStatus; examAvailable: boolean } {
  let previousLessonCompleted = true; // irrelevant for lesson 1, which is always available once the unit is unlocked
  let completedLessonCount = 0;
  const computedLessons: RoadmapLessonSummary[] = [];

  for (const lesson of lessons) {
    const thisCompleted = lessonProgressByLessonId.get(lesson.id)?.status === "COMPLETED";
    const status = computeLessonStatus({
      unitUnlocked: unlocked,
      isFirstLesson: lesson.order === 1,
      previousLessonCompleted,
      thisLessonCompleted: thisCompleted,
    });
    computedLessons.push({
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      order: lesson.order,
      status,
      questionCount: lesson.lessonQuestions.length,
    });
    if (thisCompleted) completedLessonCount++;
    previousLessonCompleted = thisCompleted;
  }

  const allLessonsCompleted = lessons.length > 0 && completedLessonCount === lessons.length;
  const unitStatus = computeUnitStatus({ unlocked, examPassed, completedLessonCount });

  return {
    lessons: computedLessons,
    unitStatus,
    examAvailable: unlocked && allLessonsCompleted && hasExam,
  };
}

// ── Shared lookups ────────────────────────────────────────────────────────

/** The active unit immediately before this one in `order`, skipping any inactive/deactivated units — never a strict `order - 1` lookup, so a deactivated unit doesn't permanently block everything after it. */
async function findPreviousActiveUnit(testVersionId: string, order: number) {
  if (order <= 1) return null;
  return prisma.unit.findFirst({
    where: { testVersionId, isActive: true, order: { lt: order } },
    orderBy: { order: "desc" },
    select: { id: true },
  });
}

async function findPreviousActiveLesson(unitId: string, order: number) {
  if (order <= 1) return null;
  return prisma.lesson.findFirst({
    where: { unitId, isActive: true, order: { lt: order } },
    orderBy: { order: "desc" },
    select: { id: true },
  });
}

/** Is `unit` unlocked for `userId`? Exported for reuse by the write endpoints (exam start must reject a locked unit) so the unlock rule is never duplicated. */
export async function isUnitUnlocked(
  userId: string,
  unit: { id: string; testVersionId: string; order: number }
): Promise<boolean> {
  if (unit.order === 1) return true;
  const previousUnit = await findPreviousActiveUnit(unit.testVersionId, unit.order);
  if (!previousUnit) return true; // no previous unit defined — nothing to gate on
  const progress = await prisma.unitProgress.findUnique({
    where: { userId_unitId: { userId, unitId: previousUnit.id } },
    select: { examPassed: true },
  });
  return progress?.examPassed === true;
}

// ── Public read API ───────────────────────────────────────────────────────

export async function getRoadmap(userId: string, testVersionId: string): Promise<Roadmap> {
  const units = await prisma.unit.findMany({
    where: { testVersionId, isActive: true },
    orderBy: { order: "asc" },
    include: {
      lessons: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: { lessonQuestions: { select: { id: true } } },
      },
      exam: { select: { questionCount: true, passThreshold: true } },
    },
  });

  const unitIds = units.map((u) => u.id);
  const lessonIds = units.flatMap((u) => u.lessons.map((l) => l.id));

  const [unitProgressRows, lessonProgressRows] = await Promise.all([
    unitIds.length > 0
      ? prisma.unitProgress.findMany({ where: { userId, unitId: { in: unitIds } } })
      : Promise.resolve([]),
    lessonIds.length > 0
      ? prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } } })
      : Promise.resolve([]),
  ]);

  const unitProgressByUnitId = new Map(unitProgressRows.map((p) => [p.unitId, p]));
  const lessonProgressByLessonId = new Map(lessonProgressRows.map((p) => [p.lessonId, p]));

  const computedUnits: RoadmapUnitSummary[] = [];
  let previousExamPassed = true; // the first unit in the ordered, active list is always unlocked

  for (const unit of units) {
    const unlocked = unit.order === 1 || previousExamPassed;
    const examPassed = unitProgressByUnitId.get(unit.id)?.examPassed === true;

    const { lessons, unitStatus, examAvailable } = computeUnitAndLessons(
      unit.lessons,
      unlocked,
      examPassed,
      unit.exam !== null,
      lessonProgressByLessonId
    );

    computedUnits.push({
      id: unit.id,
      slug: unit.slug,
      title: unit.title,
      description: unit.description,
      order: unit.order,
      status: unitStatus,
      lessons,
      examAvailable,
      examPassed,
    });

    previousExamPassed = examPassed;
  }

  return { testVersionId, units: computedUnits, resumeTarget: computeResumeTarget(computedUnits) };
}

export async function getUnit(userId: string, unitId: string): Promise<UnitDetail | null> {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: {
      lessons: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: { lessonQuestions: { select: { id: true } } },
      },
      exam: { select: { questionCount: true, passThreshold: true } },
    },
  });
  if (!unit || !unit.isActive) return null;

  const previousUnit = await findPreviousActiveUnit(unit.testVersionId, unit.order);
  const lessonIds = unit.lessons.map((l) => l.id);

  const [thisUnitProgress, previousUnitProgress, lessonProgressRows] = await Promise.all([
    prisma.unitProgress.findUnique({ where: { userId_unitId: { userId, unitId: unit.id } } }),
    previousUnit
      ? prisma.unitProgress.findUnique({ where: { userId_unitId: { userId, unitId: previousUnit.id } } })
      : Promise.resolve(null),
    lessonIds.length > 0
      ? prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } } })
      : Promise.resolve([]),
  ]);

  const unlocked = unit.order === 1 || previousUnitProgress?.examPassed === true;
  const examPassed = thisUnitProgress?.examPassed === true;
  const lessonProgressByLessonId = new Map(lessonProgressRows.map((p) => [p.lessonId, p]));

  const { lessons, unitStatus, examAvailable } = computeUnitAndLessons(
    unit.lessons,
    unlocked,
    examPassed,
    unit.exam !== null,
    lessonProgressByLessonId
  );

  return {
    id: unit.id,
    testVersionId: unit.testVersionId,
    slug: unit.slug,
    title: unit.title,
    description: unit.description,
    order: unit.order,
    status: unitStatus,
    lessons,
    examAvailable,
    examPassed,
    exam: unit.exam,
  };
}

export async function getLesson(userId: string, lessonId: string): Promise<LessonDetail | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      unit: { select: { id: true, testVersionId: true, order: true, isActive: true } },
      lessonQuestions: {
        orderBy: { order: "asc" },
        include: { question: { include: { answers: { orderBy: { sortOrder: "asc" } } } } },
      },
    },
  });
  if (!lesson || !lesson.isActive || !lesson.unit.isActive) return null;

  const [previousUnit, previousLesson] = await Promise.all([
    findPreviousActiveUnit(lesson.unit.testVersionId, lesson.unit.order),
    findPreviousActiveLesson(lesson.unitId, lesson.order),
  ]);

  const [previousUnitProgress, thisLessonProgress, previousLessonProgress] = await Promise.all([
    previousUnit
      ? prisma.unitProgress.findUnique({ where: { userId_unitId: { userId, unitId: previousUnit.id } } })
      : Promise.resolve(null),
    prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId: lesson.id } } }),
    previousLesson
      ? prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId: previousLesson.id } } })
      : Promise.resolve(null),
  ]);

  const unitUnlocked = lesson.unit.order === 1 || previousUnitProgress?.examPassed === true;
  const thisCompleted = thisLessonProgress?.status === "COMPLETED";
  const previousCompleted = previousLesson ? previousLessonProgress?.status === "COMPLETED" : true;

  const status = computeLessonStatus({
    unitUnlocked,
    isFirstLesson: lesson.order === 1,
    previousLessonCompleted: previousCompleted === true,
    thisLessonCompleted: thisCompleted,
  });

  const questions: LessonQuestionContent[] = lesson.lessonQuestions
    .filter((lq) => lq.question.isActive)
    .map((lq) => ({
      id: lq.question.id,
      number: lq.question.number,
      category: lq.question.category,
      subcategory: lq.question.subcategory,
      question: lq.question.question,
      explanation: lq.question.explanation,
      answers: lq.question.answers.map((a) => a.text),
      requiredAnswerCount: lq.question.requiredAnswerCount,
      isSpecial65_20: lq.question.isSpecial65_20,
      isDynamicAnswer: lq.question.isDynamicAnswer,
      dynamicNote: lq.question.dynamicNote,
      variesByLocation: lq.question.variesByLocation,
    }));

  return {
    id: lesson.id,
    unitId: lesson.unitId,
    slug: lesson.slug,
    title: lesson.title,
    summary: lesson.summary,
    order: lesson.order,
    status,
    questions,
  };
}
