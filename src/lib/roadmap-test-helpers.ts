/**
 * Shared setup/teardown for roadmap tests only. Not named `*.test.ts` so
 * the test runner never picks it up as a suite of its own.
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export async function createTestVersionWithQuestions(questionCount: number) {
  const testVersion = await prisma.testVersion.create({
    data: {
      slug: `roadmap-test-${randomUUID()}`,
      name: "Roadmap Test Version",
      year: 2099,
      totalQuestions: questionCount,
      questionsAsked: 10,
      passThreshold: 6,
      isDefault: false,
      isActive: true,
    },
  });

  const questions = [];
  for (let i = 1; i <= questionCount; i++) {
    const question = await prisma.question.create({
      data: {
        testVersionId: testVersion.id,
        number: i,
        category: "AMERICAN_GOVERNMENT",
        subcategory: "Roadmap Test",
        question: `Test question ${i}?`,
        explanation: `Explanation for question ${i}.`,
        answers: { create: [{ text: `Correct answer ${i}`, sortOrder: 0 }] },
      },
      include: { answers: true },
    });
    questions.push(question);
  }

  return { testVersion, questions };
}

/**
 * Deletes a whole test-created TestVersion tree in explicit dependency
 * order, rather than deleting only the TestVersion and trusting
 * ON DELETE CASCADE to remove the rest. This is deliberately more
 * verbose than a single `prisma.testVersion.delete()` call: under this
 * suite's long-lived, heavily-reused connection pool, that single call
 * was empirically observed to sometimes leave orphaned Lesson/UnitExam
 * rows behind (their parent Unit gone, they were not) even though the
 * live FK constraints are correctly defined as CASCADE — a session-level
 * MySQL state or driver-pool quirk, not a schema problem. Explicit,
 * order-scoped deletes sidestep that entirely for test cleanup, where
 * correctness matters more than the brevity a single cascading delete
 * would offer.
 */
export async function deleteTestVersion(testVersionId: string): Promise<void> {
  const units = await prisma.unit.findMany({ where: { testVersionId }, select: { id: true } });
  const unitIds = units.map((u) => u.id);
  const lessons = unitIds.length > 0 ? await prisma.lesson.findMany({ where: { unitId: { in: unitIds } }, select: { id: true } }) : [];
  const lessonIds = lessons.map((l) => l.id);
  const exams = unitIds.length > 0 ? await prisma.unitExam.findMany({ where: { unitId: { in: unitIds } }, select: { id: true } }) : [];
  const examIds = exams.map((e) => e.id);
  const questions = await prisma.question.findMany({ where: { testVersionId }, select: { id: true } });
  const questionIds = questions.map((q) => q.id);

  if (examIds.length > 0) {
    await prisma.unitExamAttempt.deleteMany({ where: { unitExamId: { in: examIds } } });
    await prisma.unitExamQuestion.deleteMany({ where: { unitExamId: { in: examIds } } });
  }
  if (lessonIds.length > 0) {
    await prisma.lessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await prisma.lessonQuestion.deleteMany({ where: { lessonId: { in: lessonIds } } });
  }
  if (unitIds.length > 0) {
    await prisma.unitProgress.deleteMany({ where: { unitId: { in: unitIds } } });
  }
  await prisma.unitExam.deleteMany({ where: { id: { in: examIds } } });
  await prisma.lesson.deleteMany({ where: { id: { in: lessonIds } } });
  await prisma.unit.deleteMany({ where: { id: { in: unitIds } } });
  if (questionIds.length > 0) {
    await prisma.questionAnswer.deleteMany({ where: { questionId: { in: questionIds } } });
  }
  await prisma.question.deleteMany({ where: { testVersionId } });

  // PracticeTest/StudySession/InterviewSimulation also reference
  // testVersionId with onDelete: Restrict — a test that creates one of
  // these directly (e.g. account-deletion tests, which combine roadmap
  // fixtures with practice-test/interview data) would otherwise block
  // the final delete below.
  const practiceTests = await prisma.practiceTest.findMany({ where: { testVersionId }, select: { id: true } });
  if (practiceTests.length > 0) {
    await prisma.practiceTestAnswer.deleteMany({ where: { testId: { in: practiceTests.map((p) => p.id) } } });
    await prisma.practiceTest.deleteMany({ where: { testVersionId } });
  }
  const interviews = await prisma.interviewSimulation.findMany({ where: { testVersionId }, select: { id: true } });
  if (interviews.length > 0) {
    await prisma.interviewCivicsAnswer.deleteMany({ where: { interviewId: { in: interviews.map((i) => i.id) } } });
    await prisma.interviewSimulation.deleteMany({ where: { testVersionId } });
  }
  await prisma.studySession.deleteMany({ where: { testVersionId } });

  await prisma.testVersion.delete({ where: { id: testVersionId } }).catch(() => undefined);
}

export async function createUnit(
  testVersionId: string,
  order: number,
  overrides: Partial<{ slug: string; title: string; isActive: boolean }> = {}
) {
  return prisma.unit.create({
    data: {
      testVersionId,
      slug: overrides.slug ?? `unit-${order}-${randomUUID()}`,
      title: overrides.title ?? `Unit ${order}`,
      order,
      isActive: overrides.isActive ?? true,
    },
  });
}

export async function createLesson(
  unitId: string,
  order: number,
  questionIds: string[],
  overrides: Partial<{ slug: string; title: string; isActive: boolean }> = {}
) {
  const lesson = await prisma.lesson.create({
    data: {
      unitId,
      slug: overrides.slug ?? `lesson-${order}-${randomUUID()}`,
      title: overrides.title ?? `Lesson ${order}`,
      order,
      isActive: overrides.isActive ?? true,
    },
  });
  if (questionIds.length > 0) {
    await prisma.lessonQuestion.createMany({
      data: questionIds.map((questionId, i) => ({ lessonId: lesson.id, questionId, order: i })),
    });
  }
  return lesson;
}

export async function createUnitExam(
  unitId: string,
  questionCount: number,
  passThreshold: number,
  curatedQuestionIds?: string[]
) {
  const exam = await prisma.unitExam.create({ data: { unitId, questionCount, passThreshold } });
  if (curatedQuestionIds && curatedQuestionIds.length > 0) {
    await prisma.unitExamQuestion.createMany({
      data: curatedQuestionIds.map((questionId) => ({ unitExamId: exam.id, questionId })),
    });
  }
  return exam;
}

export async function passUnitExam(userId: string, unitId: string): Promise<void> {
  await prisma.unitProgress.upsert({
    where: { userId_unitId: { userId, unitId } },
    update: { examPassed: true, status: "COMPLETED", completedAt: new Date() },
    create: { userId, unitId, examPassed: true, status: "COMPLETED", completedAt: new Date() },
  });
}

export async function completeLessonDirectly(userId: string, lessonId: string): Promise<void> {
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { status: "COMPLETED", completedAt: new Date() },
    create: { userId, lessonId, status: "COMPLETED", completedAt: new Date() },
  });
}
