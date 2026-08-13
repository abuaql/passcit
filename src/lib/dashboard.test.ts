import "dotenv/config";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { getDashboard, computeDailyGoal, DAILY_GOAL_TARGET } from "./dashboard";
import { awardXP, XP_VALUES } from "./xp";
import {
  createTestVersionWithQuestions,
  deleteTestVersion,
  createUnit,
  createLesson,
  createUnitExam,
  completeLessonDirectly,
  passUnitExam,
} from "./roadmap-test-helpers";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "./native-auth/test-helpers";

function todayDate(): Date {
  return new Date(new Date().toDateString());
}

describe("computeDailyGoal", () => {
  test("target is the fixed global constant", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion } = await createTestVersionWithQuestions(1);
    const { user } = await createTestUser();
    try {
      const goal = await computeDailyGoal(user.id, testVersion.id);
      assert.equal(goal.target, DAILY_GOAL_TARGET);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("progress is 0 and met is false for a user who hasn't studied today", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion } = await createTestVersionWithQuestions(1);
    const { user } = await createTestUser();
    try {
      const goal = await computeDailyGoal(user.id, testVersion.id);
      assert.equal(goal.progress, 0);
      assert.equal(goal.met, false);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("met is false just below target and true at/above it", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion } = await createTestVersionWithQuestions(1);
    const { user } = await createTestUser();
    try {
      await prisma.studySession.create({
        data: { userId: user.id, testVersionId: testVersion.id, date: todayDate(), questionsReviewed: DAILY_GOAL_TARGET - 1 },
      });
      const belowTarget = await computeDailyGoal(user.id, testVersion.id);
      assert.equal(belowTarget.progress, DAILY_GOAL_TARGET - 1);
      assert.equal(belowTarget.met, false);

      await prisma.studySession.update({
        where: { userId_date_testVersionId: { userId: user.id, date: todayDate(), testVersionId: testVersion.id } },
        data: { questionsReviewed: DAILY_GOAL_TARGET },
      });
      const atTarget = await computeDailyGoal(user.id, testVersion.id);
      assert.equal(atTarget.met, true);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("only counts today — yesterday's activity does not bleed in", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion } = await createTestVersionWithQuestions(1);
    const { user } = await createTestUser();
    try {
      const yesterday = new Date(todayDate());
      yesterday.setDate(yesterday.getDate() - 1);
      await prisma.studySession.create({
        data: { userId: user.id, testVersionId: testVersion.id, date: yesterday, questionsReviewed: 999 },
      });

      const goal = await computeDailyGoal(user.id, testVersion.id);
      assert.equal(goal.progress, 0);
      assert.equal(goal.met, false);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});

describe("getDashboard", () => {
  test("works for a user with no roadmap progress at all — first lesson is the resume target", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(6);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson1 = await createLesson(unit.id, 1, questions.slice(0, 3).map((q) => q.id));
      await createLesson(unit.id, 2, questions.slice(3, 6).map((q) => q.id));
      await createUnitExam(unit.id, 3, 2);

      const dashboard = await getDashboard(user.id, testVersion.id);
      assert.deepEqual(dashboard.resume, { type: "LESSON", unitId: unit.id, lessonId: lesson1.id });
      assert.equal(dashboard.xp.totalXP, 0);
      assert.equal(dashboard.dailyGoal.target, DAILY_GOAL_TARGET);
      assert.equal(dashboard.dailyGoal.progress, 0);
      assert.equal(dashboard.stats.currentStreak, 0);
      assert.equal(dashboard.stats.totalQuestions, 6);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("resumes at the second lesson once the first is completed", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(6);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson1 = await createLesson(unit.id, 1, questions.slice(0, 3).map((q) => q.id));
      const lesson2 = await createLesson(unit.id, 2, questions.slice(3, 6).map((q) => q.id));
      await createUnitExam(unit.id, 3, 2);
      await completeLessonDirectly(user.id, lesson1.id);

      const dashboard = await getDashboard(user.id, testVersion.id);
      assert.deepEqual(dashboard.resume, { type: "LESSON", unitId: unit.id, lessonId: lesson2.id });
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("resumes at the unit exam once every lesson is completed", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(3);
    const { user } = await createTestUser();
    try {
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await createUnitExam(unit.id, 3, 2);
      await completeLessonDirectly(user.id, lesson.id);

      const dashboard = await getDashboard(user.id, testVersion.id);
      assert.deepEqual(dashboard.resume, { type: "UNIT_EXAM", unitId: unit.id });
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("resumes at the newly-unlocked next unit's first lesson after passing an exam", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(6);
    const { user } = await createTestUser();
    try {
      const unit1 = await createUnit(testVersion.id, 1);
      const unit2 = await createUnit(testVersion.id, 2);
      const lesson1 = await createLesson(unit1.id, 1, questions.slice(0, 3).map((q) => q.id));
      const lesson2 = await createLesson(unit2.id, 1, questions.slice(3, 6).map((q) => q.id));
      await createUnitExam(unit1.id, 3, 2);
      await completeLessonDirectly(user.id, lesson1.id);
      await passUnitExam(user.id, unit1.id);

      const dashboard = await getDashboard(user.id, testVersion.id);
      assert.deepEqual(dashboard.resume, { type: "LESSON", unitId: unit2.id, lessonId: lesson2.id });
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("does not 500 for a TestVersion with no seeded roadmap — resume is null", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion } = await createTestVersionWithQuestions(1); // no Unit rows created at all
    const { user } = await createTestUser();
    try {
      const dashboard = await getDashboard(user.id, testVersion.id);
      assert.equal(dashboard.resume, null);
      assert.equal(dashboard.xp.totalXP, 0);
      assert.equal(dashboard.dailyGoal.progress, 0);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("reflects the user's real totalXP", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion } = await createTestVersionWithQuestions(1);
    const { user } = await createTestUser();
    try {
      await prisma.$transaction(async (tx) => {
        await awardXP(tx, user.id, "LESSON_COMPLETED", "lesson-a");
        await awardXP(tx, user.id, "UNIT_EXAM_PASSED", "attempt-a");
      });

      const dashboard = await getDashboard(user.id, testVersion.id);
      assert.equal(dashboard.xp.totalXP, XP_VALUES.LESSON_COMPLETED + XP_VALUES.UNIT_EXAM_PASSED);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
