import "dotenv/config";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import {
  getRoadmap,
  getUnit,
  getLesson,
  isUnitUnlocked,
  computeLessonStatus,
  computeUnitStatus,
  computeResumeTarget,
  type RoadmapUnitSummary,
} from "./roadmap";
import {
  createTestVersionWithQuestions,
  deleteTestVersion,
  createUnit,
  createLesson,
  createUnitExam,
  passUnitExam,
  completeLessonDirectly,
} from "./roadmap-test-helpers";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "./native-auth/test-helpers";

describe("roadmap: pure unlock computation", () => {
  test("computeLessonStatus: locked unit locks every lesson regardless of position", () => {
    assert.equal(
      computeLessonStatus({ unitUnlocked: false, isFirstLesson: true, previousLessonCompleted: true, thisLessonCompleted: false }),
      "LOCKED"
    );
  });

  test("computeLessonStatus: first lesson of an unlocked unit is AVAILABLE", () => {
    assert.equal(
      computeLessonStatus({ unitUnlocked: true, isFirstLesson: true, previousLessonCompleted: false, thisLessonCompleted: false }),
      "AVAILABLE"
    );
  });

  test("computeLessonStatus: a non-first lesson stays LOCKED until the previous one is completed", () => {
    assert.equal(
      computeLessonStatus({ unitUnlocked: true, isFirstLesson: false, previousLessonCompleted: false, thisLessonCompleted: false }),
      "LOCKED"
    );
    assert.equal(
      computeLessonStatus({ unitUnlocked: true, isFirstLesson: false, previousLessonCompleted: true, thisLessonCompleted: false }),
      "AVAILABLE"
    );
  });

  test("computeLessonStatus: a completed lesson stays COMPLETED even if it would otherwise be locked", () => {
    assert.equal(
      computeLessonStatus({ unitUnlocked: true, isFirstLesson: false, previousLessonCompleted: false, thisLessonCompleted: true }),
      "COMPLETED"
    );
  });

  test("computeUnitStatus: locked/available/in-progress/completed", () => {
    assert.equal(computeUnitStatus({ unlocked: false, examPassed: false, completedLessonCount: 0 }), "LOCKED");
    assert.equal(computeUnitStatus({ unlocked: true, examPassed: false, completedLessonCount: 0 }), "AVAILABLE");
    assert.equal(computeUnitStatus({ unlocked: true, examPassed: false, completedLessonCount: 2 }), "IN_PROGRESS");
    assert.equal(computeUnitStatus({ unlocked: true, examPassed: true, completedLessonCount: 0 }), "COMPLETED");
    // Locked always wins, even if (hypothetically) examPassed were somehow true.
    assert.equal(computeUnitStatus({ unlocked: false, examPassed: true, completedLessonCount: 5 }), "LOCKED");
  });

  test("computeResumeTarget: targets the first incomplete lesson of the first non-completed unit", () => {
    const units: RoadmapUnitSummary[] = [
      {
        id: "u1", slug: "u1", title: "U1", description: null, order: 1, status: "IN_PROGRESS", examAvailable: false, examPassed: false,
        lessons: [
          { id: "l1", slug: "l1", title: "L1", order: 1, status: "COMPLETED", questionCount: 1 },
          { id: "l2", slug: "l2", title: "L2", order: 2, status: "AVAILABLE", questionCount: 1 },
        ],
      },
    ];
    assert.deepEqual(computeResumeTarget(units), { type: "lesson", unitId: "u1", lessonId: "l2" });
  });

  test("computeResumeTarget: targets the exam once every lesson is complete", () => {
    const units: RoadmapUnitSummary[] = [
      {
        id: "u1", slug: "u1", title: "U1", description: null, order: 1, status: "IN_PROGRESS", examAvailable: true, examPassed: false,
        lessons: [{ id: "l1", slug: "l1", title: "L1", order: 1, status: "COMPLETED", questionCount: 1 }],
      },
    ];
    assert.deepEqual(computeResumeTarget(units), { type: "exam", unitId: "u1" });
  });

  test("computeResumeTarget: null once every unit is completed", () => {
    const units: RoadmapUnitSummary[] = [
      {
        id: "u1", slug: "u1", title: "U1", description: null, order: 1, status: "COMPLETED", examAvailable: false, examPassed: true,
        lessons: [{ id: "l1", slug: "l1", title: "L1", order: 1, status: "COMPLETED", questionCount: 1 }],
      },
    ];
    assert.equal(computeResumeTarget(units), null);
  });
});

describe("roadmap: reads against real data", () => {
  let dbReady = false;
  before(async () => {
    dbReady = await isDatabaseReachable();
  });

  test("Unit 1 is AVAILABLE and Unit 2 is LOCKED for a fresh user; Unit 2 unlocks after Unit 1's exam passes", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { testVersion, questions } = await createTestVersionWithQuestions(20);
    const { user } = await createTestUser();
    try {
      const unit1 = await createUnit(testVersion.id, 1);
      const unit2 = await createUnit(testVersion.id, 2);
      await createLesson(unit1.id, 1, questions.slice(0, 5).map((q) => q.id));
      await createLesson(unit2.id, 1, questions.slice(5, 10).map((q) => q.id));
      await createUnitExam(unit1.id, 5, 3);
      await createUnitExam(unit2.id, 5, 3);

      const roadmapBefore = await getRoadmap(user.id, testVersion.id);
      const u1Before = roadmapBefore.units.find((u) => u.id === unit1.id)!;
      const u2Before = roadmapBefore.units.find((u) => u.id === unit2.id)!;
      assert.equal(u1Before.status, "AVAILABLE");
      assert.equal(u2Before.status, "LOCKED");
      assert.equal(await isUnitUnlocked(user.id, unit2), false);

      await passUnitExam(user.id, unit1.id);

      const roadmapAfter = await getRoadmap(user.id, testVersion.id);
      const u1After = roadmapAfter.units.find((u) => u.id === unit1.id)!;
      const u2After = roadmapAfter.units.find((u) => u.id === unit2.id)!;
      assert.equal(u1After.status, "COMPLETED");
      assert.equal(u2After.status, "AVAILABLE");
      assert.equal(await isUnitUnlocked(user.id, unit2), true);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("Lesson 1 is AVAILABLE; Lesson 2 stays LOCKED until Lesson 1 is completed", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { testVersion, questions } = await createTestVersionWithQuestions(6);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson1 = await createLesson(unit.id, 1, questions.slice(0, 3).map((q) => q.id));
      const lesson2 = await createLesson(unit.id, 2, questions.slice(3, 6).map((q) => q.id));

      const unitBefore = await getUnit(user.id, unit.id);
      assert.equal(unitBefore!.lessons.find((l) => l.id === lesson1.id)!.status, "AVAILABLE");
      assert.equal(unitBefore!.lessons.find((l) => l.id === lesson2.id)!.status, "LOCKED");

      await completeLessonDirectly(user.id, lesson1.id);

      const unitAfter = await getUnit(user.id, unit.id);
      assert.equal(unitAfter!.lessons.find((l) => l.id === lesson1.id)!.status, "COMPLETED");
      assert.equal(unitAfter!.lessons.find((l) => l.id === lesson2.id)!.status, "AVAILABLE");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("the exam is unavailable until every lesson in the unit is completed", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { testVersion, questions } = await createTestVersionWithQuestions(6);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson1 = await createLesson(unit.id, 1, questions.slice(0, 3).map((q) => q.id));
      const lesson2 = await createLesson(unit.id, 2, questions.slice(3, 6).map((q) => q.id));
      await createUnitExam(unit.id, 5, 3);

      assert.equal((await getUnit(user.id, unit.id))!.examAvailable, false);

      await completeLessonDirectly(user.id, lesson1.id);
      assert.equal((await getUnit(user.id, unit.id))!.examAvailable, false, "one lesson still incomplete");

      await completeLessonDirectly(user.id, lesson2.id);
      assert.equal((await getUnit(user.id, unit.id))!.examAvailable, true);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("XP has no bearing on unlocking — no XP concept exists anywhere in this computation", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");
    // Phase 5 introduces no XP model/field at all, so unlocking cannot
    // read XP even by accident — verified structurally: neither
    // computeUnitStatus's nor computeLessonStatus's parameter lists
    // contain anything XP-related, and the roadmap's computed shape has
    // no xp field to have been influenced by one.
    const { testVersion, questions } = await createTestVersionWithQuestions(3);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      await createLesson(unit.id, 1, questions.map((q) => q.id));
      const roadmap = await getRoadmap(user.id, testVersion.id);
      const unit1 = roadmap.units[0]!;
      assert.equal("xp" in unit1, false);
      // The unlock predicate's only inputs are unlocked/examPassed/lesson
      // completion — awarding XP separately (a different, untested-here
      // subsystem) cannot change this unit's computed status.
      assert.equal(computeUnitStatus({ unlocked: true, examPassed: false, completedLessonCount: 1 }), "IN_PROGRESS");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("getLesson returns ordered question content inline, including accepted answers", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { testVersion, questions } = await createTestVersionWithQuestions(3);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));

      const detail = await getLesson(user.id, lesson.id);
      assert.ok(detail);
      assert.equal(detail!.questions.length, 3);
      assert.deepEqual(
        detail!.questions.map((q) => q.number),
        [1, 2, 3]
      );
      assert.equal(detail!.questions[0]!.answers[0], "Correct answer 1");
      assert.equal(detail!.questions[0]!.explanation, "Explanation for question 1.");
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("reads never create UnitProgress or LessonProgress rows", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { testVersion, questions } = await createTestVersionWithQuestions(6);
    const { user } = await createTestUser();
    try {
      const unit1 = await createUnit(testVersion.id, 1);
      const unit2 = await createUnit(testVersion.id, 2);
      const lesson1 = await createLesson(unit1.id, 1, questions.slice(0, 3).map((q) => q.id));
      await createLesson(unit2.id, 1, questions.slice(3, 6).map((q) => q.id));
      await createUnitExam(unit1.id, 3, 2);

      await getRoadmap(user.id, testVersion.id);
      await getUnit(user.id, unit1.id);
      await getUnit(user.id, unit2.id);
      await getLesson(user.id, lesson1.id);

      const unitProgressCount = await prisma.unitProgress.count({ where: { userId: user.id } });
      const lessonProgressCount = await prisma.lessonProgress.count({ where: { userId: user.id } });
      assert.equal(unitProgressCount, 0);
      assert.equal(lessonProgressCount, 0);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});

// Exercises getRoadmap/computeResumeTarget against the real, live-seeded
// 2025 roadmap (Phase 10) — proves the existing generic-over-TestVersion
// read path serves the new content correctly, with no code changes.
describe("2025 roadmap (real seeded content)", () => {
  test("a fresh user sees Unit 1 AVAILABLE, Units 2-3 LOCKED, and resumes at Unit 1's first lesson", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await prisma.testVersion.findUniqueOrThrow({ where: { slug: "2025" } });
    const { user } = await createTestUser();
    try {
      const roadmap = await getRoadmap(user.id, testVersion.id);
      assert.equal(roadmap.units.length, 3);

      const [unit1, unit2, unit3] = roadmap.units;
      assert.equal(unit1!.slug, "american-government-2025");
      assert.equal(unit1!.status, "AVAILABLE");
      assert.equal(unit2!.status, "LOCKED");
      assert.equal(unit3!.status, "LOCKED");
      assert.equal(unit1!.lessons.length, 8);

      const firstLesson = unit1!.lessons.find((l) => l.order === 1)!;
      assert.equal(firstLesson.slug, "principles-of-american-government-1");
      assert.deepEqual(roadmap.resumeTarget, { type: "lesson", unitId: unit1!.id, lessonId: firstLesson.id });
    } finally {
      await deleteTestUser(user.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
