import "dotenv/config";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { seedRoadmap, resolveQuestionId, type RoadmapSeedConfig } from "./roadmap-seed";
import { createTestVersionWithQuestions, deleteTestVersion } from "./roadmap-test-helpers";
import { isDatabaseReachable } from "./native-auth/test-helpers";

function buildConfig(testVersionSlug: string): RoadmapSeedConfig {
  return {
    testVersionSlug,
    units: [
      {
        slug: "unit-one",
        title: "Unit One",
        description: "First unit.",
        order: 1,
        lessons: [
          { slug: "lesson-one", title: "Lesson One", order: 1, questionNumbers: [1, 2, 3] },
          { slug: "lesson-two", title: "Lesson Two", order: 2, questionNumbers: [4, 5, 6] },
        ],
        exam: { questionCount: 5, passThreshold: 3, questionNumbers: [1, 2, 3, 4, 5] },
      },
    ],
  };
}

describe("seedRoadmap", () => {
  test("a valid config creates the expected Unit/Lesson/LessonQuestion/UnitExam structure", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { testVersion } = await createTestVersionWithQuestions(6);
    try {
      const result = await seedRoadmap(buildConfig(testVersion.slug));
      assert.equal(result.unitsSeeded, 1);

      const unit = await prisma.unit.findUniqueOrThrow({
        where: { testVersionId_slug: { testVersionId: testVersion.id, slug: "unit-one" } },
        include: { lessons: { include: { lessonQuestions: true } }, exam: { include: { examQuestions: true } } },
      });

      assert.equal(unit.title, "Unit One");
      assert.equal(unit.lessons.length, 2);
      assert.equal(unit.lessons.find((l) => l.slug === "lesson-one")!.lessonQuestions.length, 3);
      assert.equal(unit.lessons.find((l) => l.slug === "lesson-two")!.lessonQuestions.length, 3);
      assert.equal(unit.exam!.questionCount, 5);
      assert.equal(unit.exam!.passThreshold, 3);
      assert.equal(unit.exam!.examQuestions.length, 5);
    } finally {
      await deleteTestVersion(testVersion.id);
    }
  });

  test("running the same config twice does not create duplicates", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { testVersion } = await createTestVersionWithQuestions(6);
    try {
      const config = buildConfig(testVersion.slug);
      await seedRoadmap(config);
      await seedRoadmap(config);

      const unitCount = await prisma.unit.count({ where: { testVersionId: testVersion.id } });
      const lessonCount = await prisma.lesson.count({ where: { unit: { testVersionId: testVersion.id } } });
      const lessonQuestionCount = await prisma.lessonQuestion.count({
        where: { lesson: { unit: { testVersionId: testVersion.id } } },
      });
      const examCount = await prisma.unitExam.count({ where: { unit: { testVersionId: testVersion.id } } });
      const examQuestionCount = await prisma.unitExamQuestion.count({
        where: { unitExam: { unit: { testVersionId: testVersion.id } } },
      });

      assert.equal(unitCount, 1);
      assert.equal(lessonCount, 2);
      assert.equal(lessonQuestionCount, 6);
      assert.equal(examCount, 1);
      assert.equal(examQuestionCount, 5);
    } finally {
      await deleteTestVersion(testVersion.id);
    }
  });

  test("a missing question number fails loudly rather than being skipped", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { testVersion } = await createTestVersionWithQuestions(3); // only questions 1-3 exist
    try {
      const config = buildConfig(testVersion.slug); // lesson-two references question #4, which doesn't exist
      await assert.rejects(() => seedRoadmap(config), /no Question #4 exists/);

      // Nothing partial was left dangling from the failed run.
      const unitCount = await prisma.unit.count({ where: { testVersionId: testVersion.id } });
      assert.equal(unitCount, 0, "lesson-one's unit shouldn't be treated as successfully seeded when lesson-two failed");
    } finally {
      await deleteTestVersion(testVersion.id);
    }
  });

  test("resolveQuestionId throws on an unknown number and never fabricates one", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { testVersion } = await createTestVersionWithQuestions(2);
    try {
      await assert.rejects(() => resolveQuestionId(testVersion.id, 999), /no Question #999 exists/);
    } finally {
      await deleteTestVersion(testVersion.id);
    }
  });

  test("seeding reuses existing Questions and never creates new ones", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { testVersion, questions } = await createTestVersionWithQuestions(6);
    try {
      const countBefore = await prisma.question.count({ where: { testVersionId: testVersion.id } });
      await seedRoadmap(buildConfig(testVersion.slug));
      const countAfter = await prisma.question.count({ where: { testVersionId: testVersion.id } });
      assert.equal(countBefore, countAfter);

      const lessonQuestions = await prisma.lessonQuestion.findMany({
        where: { lesson: { unit: { testVersionId: testVersion.id } } },
      });
      const knownIds = new Set(questions.map((q) => q.id));
      for (const lq of lessonQuestions) {
        assert.ok(knownIds.has(lq.questionId), "every LessonQuestion must point at a pre-existing Question");
      }
    } finally {
      await deleteTestVersion(testVersion.id);
    }
  });

  test("throws loudly if the TestVersion doesn't exist, and never creates one", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    await assert.rejects(() => seedRoadmap(buildConfig("no-such-test-version-slug")), /no TestVersion found/);
    const found = await prisma.testVersion.findUnique({ where: { slug: "no-such-test-version-slug" } });
    assert.equal(found, null);
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
