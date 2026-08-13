import "dotenv/config";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { completePracticeTest } from "./practice-test-progress";
import { XP_VALUES, getUserTotalXP } from "./xp";
import { createTestVersionWithQuestions, deleteTestVersion } from "./roadmap-test-helpers";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "./native-auth/test-helpers";

async function createPracticeTest(
  userId: string,
  testVersionId: string,
  overrides: Partial<{ mode: "RANDOM_10" | "MOCK_INTERVIEW"; totalQuestions: number }> = {}
) {
  return prisma.practiceTest.create({
    data: {
      userId,
      testVersionId,
      mode: overrides.mode ?? "RANDOM_10",
      totalQuestions: overrides.totalQuestions ?? 5,
    },
  });
}

describe("completePracticeTest", () => {
  test("completes successfully, grades correctly, and awards XP", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(5);
    const { user } = await createTestUser();
    try {
      const practiceTest = await createPracticeTest(user.id, testVersion.id);
      const answers = questions.map((q, i) => ({
        questionId: q.id,
        selectedAnswer: i < 4 ? "correct" : "wrong", // 4/5 = 80% >= 60% threshold
        isCorrect: i < 4,
      }));

      const result = await completePracticeTest(user.id, practiceTest.id, { answers, stoppedEarly: false });
      assert.equal(result.status, "ok");
      if (result.status !== "ok") return;
      assert.equal(result.score, 4);
      assert.equal(result.totalQuestions, 5);
      assert.equal(result.passed, true);

      assert.equal(await getUserTotalXP(user.id), XP_VALUES.PRACTICE_TEST_COMPLETED);
      const events = await prisma.xPEvent.findMany({ where: { userId: user.id, reason: "PRACTICE_TEST_COMPLETED" } });
      assert.equal(events.length, 1);
      assert.equal(events[0]!.refId, practiceTest.id);

      const answerRows = await prisma.practiceTestAnswer.findMany({ where: { testId: practiceTest.id } });
      assert.equal(answerRows.length, 5);

      const updated = await prisma.practiceTest.findUniqueOrThrow({ where: { id: practiceTest.id } });
      assert.equal(updated.score, 4);
      assert.equal(updated.passed, true);
      assert.ok(updated.completedAt);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("still awards XP when the test is failed — completion, not passing, is what's rewarded", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(5);
    const { user } = await createTestUser();
    try {
      const practiceTest = await createPracticeTest(user.id, testVersion.id);
      const answers = questions.map((q, i) => ({
        questionId: q.id,
        selectedAnswer: i < 1 ? "correct" : "wrong", // 1/5 = 20% < 60%
        isCorrect: i < 1,
      }));

      const result = await completePracticeTest(user.id, practiceTest.id, { answers, stoppedEarly: false });
      assert.equal(result.status, "ok");
      if (result.status !== "ok") return;
      assert.equal(result.passed, false);

      assert.equal(await getUserTotalXP(user.id), XP_VALUES.PRACTICE_TEST_COMPLETED);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("MOCK_INTERVIEW mode grades against the TestVersion's own passThreshold, not the 60% rule", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(10);
    const { user } = await createTestUser();
    try {
      // testVersion.passThreshold is 6 (set by createTestVersionWithQuestions).
      const practiceTest = await createPracticeTest(user.id, testVersion.id, { mode: "MOCK_INTERVIEW", totalQuestions: 10 });
      // 5/10 = 50%, which WOULD pass the generic 60% rule's complement
      // but must fail here since 5 < passThreshold(6).
      const answers = questions.map((q, i) => ({
        questionId: q.id,
        selectedAnswer: i < 5 ? "correct" : "wrong",
        isCorrect: i < 5,
      }));

      const result = await completePracticeTest(user.id, practiceTest.id, { answers, stoppedEarly: false });
      assert.equal(result.status, "ok");
      if (result.status !== "ok") return;
      assert.equal(result.score, 5);
      assert.equal(result.passed, false);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("returns not_found for a nonexistent or not-owned test", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(2);
    const { user: owner } = await createTestUser();
    const { user: stranger } = await createTestUser();
    try {
      const practiceTest = await createPracticeTest(owner.id, testVersion.id, { totalQuestions: 2 });
      const answers = questions.map((q) => ({ questionId: q.id, selectedAnswer: "x", isCorrect: false }));

      const missing = await completePracticeTest(owner.id, "does-not-exist", { answers, stoppedEarly: false });
      assert.equal(missing.status, "not_found");

      const stolen = await completePracticeTest(stranger.id, practiceTest.id, { answers, stoppedEarly: false });
      assert.equal(stolen.status, "not_found");

      // Not touched by the stranger's attempt.
      const untouched = await prisma.practiceTest.findUniqueOrThrow({ where: { id: practiceTest.id } });
      assert.equal(untouched.completedAt, null);
    } finally {
      await deleteTestUser(owner.id);
      await deleteTestUser(stranger.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("a genuine resubmit returns already_completed and never re-awards XP", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(3);
    const { user } = await createTestUser();
    try {
      const practiceTest = await createPracticeTest(user.id, testVersion.id, { totalQuestions: 3 });
      const answers = questions.map((q) => ({ questionId: q.id, selectedAnswer: "correct", isCorrect: true }));

      const first = await completePracticeTest(user.id, practiceTest.id, { answers, stoppedEarly: false });
      assert.equal(first.status, "ok");

      const second = await completePracticeTest(user.id, practiceTest.id, { answers, stoppedEarly: false });
      assert.equal(second.status, "already_completed");

      assert.equal(await getUserTotalXP(user.id), XP_VALUES.PRACTICE_TEST_COMPLETED);
      const events = await prisma.xPEvent.count({ where: { userId: user.id, reason: "PRACTICE_TEST_COMPLETED" } });
      assert.equal(events, 1);
      const answerRows = await prisma.practiceTestAnswer.count({ where: { testId: practiceTest.id } });
      assert.equal(answerRows, 3); // not duplicated either
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("concurrent completion attempts for the same test never award XP twice", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(3);
    const { user } = await createTestUser();
    try {
      const practiceTest = await createPracticeTest(user.id, testVersion.id, { totalQuestions: 3 });
      const answers = questions.map((q) => ({ questionId: q.id, selectedAnswer: "correct", isCorrect: true }));

      const [first, second] = await Promise.all([
        completePracticeTest(user.id, practiceTest.id, { answers, stoppedEarly: false }),
        completePracticeTest(user.id, practiceTest.id, { answers, stoppedEarly: false }),
      ]);
      const statuses = [first.status, second.status].sort();
      assert.deepEqual(statuses, ["already_completed", "ok"]);

      assert.equal(await getUserTotalXP(user.id), XP_VALUES.PRACTICE_TEST_COMPLETED);
      const events = await prisma.xPEvent.count({ where: { userId: user.id, reason: "PRACTICE_TEST_COMPLETED" } });
      assert.equal(events, 1);
      const answerRows = await prisma.practiceTestAnswer.count({ where: { testId: practiceTest.id } });
      assert.equal(answerRows, 3);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("calls recordQuizAnswer and recordStudyActivity as before (question progress and StudySession updated)", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { testVersion, questions } = await createTestVersionWithQuestions(2);
    const { user } = await createTestUser();
    try {
      const practiceTest = await createPracticeTest(user.id, testVersion.id, { totalQuestions: 2 });
      const answers = [
        { questionId: questions[0]!.id, selectedAnswer: "correct", isCorrect: true },
        { questionId: questions[1]!.id, selectedAnswer: "wrong", isCorrect: false },
      ];

      await completePracticeTest(user.id, practiceTest.id, { answers, stoppedEarly: false });

      const progress0 = await prisma.userQuestionProgress.findUnique({
        where: { userId_questionId: { userId: user.id, questionId: questions[0]!.id } },
      });
      const progress1 = await prisma.userQuestionProgress.findUnique({
        where: { userId_questionId: { userId: user.id, questionId: questions[1]!.id } },
      });
      assert.equal(progress0?.status, "KNOWN");
      assert.equal(progress1?.status, "NEEDS_PRACTICE");

      const today = new Date(new Date().toDateString());
      const session = await prisma.studySession.findUnique({
        where: { userId_date_testVersionId: { userId: user.id, date: today, testVersionId: testVersion.id } },
      });
      assert.equal(session?.questionsReviewed, 2);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
