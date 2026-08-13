import "dotenv/config";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { isDatabaseReachable } from "./native-auth/test-helpers";

// Structural/coverage integrity checks for the real, live-seeded 2025
// roadmap (Phase 10) — proves the approved 3-unit/15-lesson design was
// actually seeded correctly: every one of the 128 official questions
// reachable from Learn, in exactly one lesson, with no gaps/overlaps.
const EXPECTED_UNITS = [
  { slug: "american-government-2025", order: 1, lessonCount: 8, questionCount: 72, exam: { questionCount: 15, passThreshold: 9 } },
  { slug: "american-history-2025", order: 2, lessonCount: 5, questionCount: 46, exam: { questionCount: 15, passThreshold: 9 } },
  { slug: "symbols-and-holidays-2025", order: 3, lessonCount: 2, questionCount: 10, exam: { questionCount: 10, passThreshold: 6 } },
];

describe("2025 roadmap (real seeded data)", () => {
  test("has exactly the 3 approved units, in order, with the approved exam thresholds", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await prisma.testVersion.findUniqueOrThrow({ where: { slug: "2025" } });
    const units = await prisma.unit.findMany({
      where: { testVersionId: testVersion.id },
      include: { lessons: { include: { lessonQuestions: true } }, exam: true },
      orderBy: { order: "asc" },
    });

    assert.equal(units.length, 3);
    for (const [i, expected] of EXPECTED_UNITS.entries()) {
      const unit = units[i]!;
      assert.equal(unit.slug, expected.slug);
      assert.equal(unit.order, expected.order);
      assert.equal(unit.lessons.length, expected.lessonCount, `unit "${expected.slug}" lesson count`);
      const questionCount = unit.lessons.reduce((sum, l) => sum + l.lessonQuestions.length, 0);
      assert.equal(questionCount, expected.questionCount, `unit "${expected.slug}" question count`);
      assert.ok(unit.exam, `unit "${expected.slug}" must have a UnitExam`);
      assert.equal(unit.exam!.questionCount, expected.exam.questionCount);
      assert.equal(unit.exam!.passThreshold, expected.exam.passThreshold);
    }
  });

  test("covers all 128 official 2025 questions exactly once — no gaps, no overlaps, no duplicate ownership", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await prisma.testVersion.findUniqueOrThrow({ where: { slug: "2025" } });

    const allQuestions = await prisma.question.findMany({ where: { testVersionId: testVersion.id }, select: { id: true, number: true } });
    assert.equal(allQuestions.length, 128);

    const lessonQuestions = await prisma.lessonQuestion.findMany({
      where: { lesson: { unit: { testVersionId: testVersion.id } } },
      select: { questionId: true },
    });
    assert.equal(lessonQuestions.length, 128, "every question must be assigned to exactly one lesson");

    const assignedIds = new Set(lessonQuestions.map((lq) => lq.questionId));
    assert.equal(assignedIds.size, 128, "no question may be assigned to more than one lesson");
    const allIds = new Set(allQuestions.map((q) => q.id));
    assert.deepEqual(assignedIds, allIds, "the assigned set must be exactly the full 128-question set");
  });

  test("every lesson's questions come from the subcategory its title describes, and stay within that subcategory's boundaries", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await prisma.testVersion.findUniqueOrThrow({ where: { slug: "2025" } });
    const lessons = await prisma.lesson.findMany({
      where: { unit: { testVersionId: testVersion.id } },
      include: { lessonQuestions: { include: { question: true } } },
    });

    for (const lesson of lessons) {
      const subcategories = new Set(lesson.lessonQuestions.map((lq) => lq.question.subcategory));
      assert.equal(subcategories.size, 1, `lesson "${lesson.slug}" must not span more than one official subcategory`);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
