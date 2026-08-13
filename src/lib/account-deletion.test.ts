import "dotenv/config";
import { randomUUID } from "crypto";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { deleteAccount } from "./account-deletion";
import { createRefreshTokenRecord, hashRefreshToken } from "./native-auth/refresh-token";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "./native-auth/test-helpers";
import { createTestVersionWithQuestions, deleteTestVersion, createUnit, createLesson, createUnitExam } from "./roadmap-test-helpers";
import { awardXP } from "./xp";

/** Counts every row across every table with a userId (or user-scoped path) pointing at this user. */
async function countAllUserRows(userId: string) {
  const [
    accounts,
    sessions,
    passwordResetTokens,
    nativeRefreshTokens,
    userQuestionProgress,
    practiceTests,
    practiceTestAnswers,
    voicePracticeAttempts,
    studyStreaks,
    studySessions,
    eligibilityCalculations,
    interviewSimulations,
    interviewCivicsAnswers,
    unitProgress,
    lessonProgress,
    unitExamAttempts,
    userXP,
    xpEvents,
    user,
  ] = await Promise.all([
    prisma.account.count({ where: { userId } }),
    prisma.session.count({ where: { userId } }),
    prisma.passwordResetToken.count({ where: { userId } }),
    prisma.nativeRefreshToken.count({ where: { userId } }),
    prisma.userQuestionProgress.count({ where: { userId } }),
    prisma.practiceTest.count({ where: { userId } }),
    prisma.practiceTestAnswer.count({ where: { test: { userId } } }),
    prisma.voicePracticeAttempt.count({ where: { userId } }),
    prisma.studyStreak.count({ where: { userId } }),
    prisma.studySession.count({ where: { userId } }),
    prisma.eligibilityCalculation.count({ where: { userId } }),
    prisma.interviewSimulation.count({ where: { userId } }),
    prisma.interviewCivicsAnswer.count({ where: { interview: { userId } } }),
    prisma.unitProgress.count({ where: { userId } }),
    prisma.lessonProgress.count({ where: { userId } }),
    prisma.unitExamAttempt.count({ where: { userId } }),
    prisma.userXP.count({ where: { userId } }),
    prisma.xPEvent.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  return {
    accounts,
    sessions,
    passwordResetTokens,
    nativeRefreshTokens,
    userQuestionProgress,
    practiceTests,
    practiceTestAnswers,
    voicePracticeAttempts,
    studyStreaks,
    studySessions,
    eligibilityCalculations,
    interviewSimulations,
    interviewCivicsAnswers,
    unitProgress,
    lessonProgress,
    unitExamAttempts,
    userXP,
    xpEvents,
    userExists: user !== null,
  };
}

function assertAllZero(counts: Awaited<ReturnType<typeof countAllUserRows>>) {
  for (const [key, value] of Object.entries(counts)) {
    if (key === "userExists") {
      assert.equal(value, false, "the User row itself must be gone");
    } else {
      assert.equal(value, 0, `${key} must be 0 (found ${value})`);
    }
  }
}

describe("deleteAccount", () => {
  test("full deletion: removes the user and every category of owned data, no orphans", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { user, password } = await createTestUser();
    const { testVersion, questions } = await createTestVersionWithQuestions(6);
    try {
      // Populate one row in every user-owned table this endpoint must clean up.
      await prisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "google", providerAccountId: randomUUID() },
      });
      await prisma.session.create({
        data: { userId: user.id, sessionToken: randomUUID(), expires: new Date(Date.now() + 86_400_000) },
      });
      await prisma.passwordResetToken.create({
        data: { userId: user.id, token: randomUUID(), expiresAt: new Date(Date.now() + 3_600_000) },
      });
      await createRefreshTokenRecord(user.id);
      await prisma.userQuestionProgress.create({
        data: { userId: user.id, questionId: questions[0]!.id, isFavorite: true },
      });
      const practiceTest = await prisma.practiceTest.create({
        data: { userId: user.id, testVersionId: testVersion.id, mode: "RANDOM_10", totalQuestions: 1 },
      });
      await prisma.practiceTestAnswer.create({
        data: { testId: practiceTest.id, questionId: questions[0]!.id, userAnswer: "x", isCorrect: true },
      });
      await prisma.voicePracticeAttempt.create({
        data: { userId: user.id, questionId: questions[0]!.id, transcript: "hi", result: "CORRECT" },
      });
      await prisma.studyStreak.create({ data: { userId: user.id, currentStreak: 1, longestStreak: 1 } });
      await prisma.studySession.create({
        data: { userId: user.id, testVersionId: testVersion.id, date: new Date(new Date().toDateString()) },
      });
      await prisma.eligibilityCalculation.create({
        data: {
          userId: user.id,
          greenCardDate: new Date(),
          state: "NY",
          eligibleFilingDate: new Date(),
          requiredResidencyYears: 5,
          physicalPresenceDaysReq: 913,
        },
      });
      const interview = await prisma.interviewSimulation.create({
        data: { userId: user.id, testVersionId: testVersion.id },
      });
      await prisma.interviewCivicsAnswer.create({
        data: { interviewId: interview.id, questionId: questions[0]!.id, isCorrect: true, spokenAnswer: "x" },
      });
      const unit = await createUnit(testVersion.id, 1);
      const lesson = await createLesson(unit.id, 1, questions.map((q) => q.id));
      await createUnitExam(unit.id, 3, 2);
      await prisma.lessonProgress.create({ data: { userId: user.id, lessonId: lesson.id, status: "COMPLETED" } });
      await prisma.unitProgress.create({ data: { userId: user.id, unitId: unit.id, status: "AVAILABLE" } });
      const unitExam = await prisma.unitExam.findUniqueOrThrow({ where: { unitId: unit.id } });
      await prisma.unitExamAttempt.create({
        data: { unitExamId: unitExam.id, userId: user.id, totalQuestions: 3, questionIds: [] },
      });
      await prisma.$transaction(async (tx) => {
        await awardXP(tx, user.id, "LESSON_COMPLETED", lesson.id);
      });

      // Sanity check: everything was actually created before we test deletion.
      const before = await countAllUserRows(user.id);
      assert.equal(before.userExists, true);
      for (const [key, value] of Object.entries(before)) {
        if (key === "userExists") continue;
        assert.ok((value as number) > 0, `expected setup to create at least one ${key} row`);
      }

      const result = await deleteAccount(user.id, password);
      assert.equal(result.status, "ok");

      assertAllZero(await countAllUserRows(user.id));
    } finally {
      await deleteTestVersion(testVersion.id);
      // The user itself should already be gone; this is a no-op safety net.
      await deleteTestUser(user.id);
    }
  });

  test("requires the correct password for a password-based account", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user } = await createTestUser({ password: "correct-horse-battery-1" });
    try {
      const missing = await deleteAccount(user.id);
      assert.equal(missing.status, "password_required");

      const wrong = await deleteAccount(user.id, "not-the-password");
      assert.equal(wrong.status, "invalid_password");

      // The account must still exist after both rejected attempts.
      const stillThere = await prisma.user.findUnique({ where: { id: user.id } });
      assert.ok(stillThere);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("requires no password for an OAuth-only account", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user } = await createTestUser({ withPassword: false });
    try {
      const result = await deleteAccount(user.id);
      assert.equal(result.status, "ok");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("native refresh tokens are invalidated — the row is gone after deletion", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user, password } = await createTestUser();
    try {
      const { rawToken } = await createRefreshTokenRecord(user.id);
      await deleteAccount(user.id, password);

      const stillExists = await prisma.nativeRefreshToken.findFirst({
        where: { tokenHash: hashRefreshToken(rawToken) },
      });
      assert.equal(stillExists, null);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("OAuth Account links are removed", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user, password } = await createTestUser();
    try {
      await prisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "apple", providerAccountId: randomUUID() },
      });
      await deleteAccount(user.id, password);
      assert.equal(await prisma.account.count({ where: { userId: user.id } }), 0);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("an account that has authored an Announcement is blocked, not crashed, and remains intact", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user, password } = await createTestUser({ role: "ADMIN" });
    let announcementId: string | null = null;
    try {
      const announcement = await prisma.announcement.create({
        data: { title: "Test", body: "Body", createdBy: user.id },
      });
      announcementId = announcement.id;

      const result = await deleteAccount(user.id, password);
      assert.equal(result.status, "blocked_by_authored_content");

      const stillThere = await prisma.user.findUnique({ where: { id: user.id } });
      assert.ok(stillThere);
    } finally {
      if (announcementId) await prisma.announcement.delete({ where: { id: announcementId } }).catch(() => undefined);
      await deleteTestUser(user.id);
    }
  });

  test("a second deletion attempt is idempotent", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user, password } = await createTestUser();

    const first = await deleteAccount(user.id, password);
    assert.equal(first.status, "ok");

    const second = await deleteAccount(user.id, password);
    assert.equal(second.status, "not_found");
    // No throw, no crash — both calls report a clean, non-error outcome.
  });

  test("cross-user protection: deleting one account never touches another user's data", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user: victim, password: victimPassword } = await createTestUser();
    const { user: bystander } = await createTestUser();
    try {
      await prisma.studyStreak.create({ data: { userId: bystander.id, currentStreak: 5, longestStreak: 5 } });

      await deleteAccount(victim.id, victimPassword);

      const bystanderStillExists = await prisma.user.findUnique({ where: { id: bystander.id } });
      assert.ok(bystanderStillExists);
      const bystanderStreak = await prisma.studyStreak.findUnique({ where: { userId: bystander.id } });
      assert.ok(bystanderStreak);
      assert.equal(bystanderStreak!.currentStreak, 5);
    } finally {
      await deleteTestUser(bystander.id);
    }
  });

  test("rollback: a genuine concurrent double-deletion never leaves partial data behind", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user, password } = await createTestUser();
    await prisma.studyStreak.create({ data: { userId: user.id, currentStreak: 1, longestStreak: 1 } });

    const [first, second] = await Promise.all([deleteAccount(user.id, password), deleteAccount(user.id, password)]);
    const statuses = [first.status, second.status].sort();

    // Exactly one call does the deleting; the other cleanly reports
    // not_found rather than throwing or partially applying.
    assert.deepEqual(statuses, ["not_found", "ok"]);

    const counts = await countAllUserRows(user.id);
    assertAllZero(counts);
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
