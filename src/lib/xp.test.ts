import "dotenv/config";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { XP_VALUES, awardXP, getUserTotalXP } from "./xp";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "./native-auth/test-helpers";

describe("XP_VALUES", () => {
  test("defines a positive amount for every XPReason", () => {
    const reasons: (keyof typeof XP_VALUES)[] = [
      "LESSON_COMPLETED",
      "UNIT_EXAM_PASSED",
      "PRACTICE_TEST_COMPLETED",
      "DAILY_GOAL_MET",
      "STREAK_BONUS",
    ];
    for (const reason of reasons) {
      assert.equal(typeof XP_VALUES[reason], "number");
      assert.ok(XP_VALUES[reason] > 0, `${reason} must award a positive amount`);
    }
  });
});

describe("getUserTotalXP", () => {
  test("returns 0 for a user with no UserXP row yet", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user } = await createTestUser();
    try {
      assert.equal(await getUserTotalXP(user.id), 0);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});

describe("awardXP", () => {
  test("creates UserXP and an XPEvent on first award", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user } = await createTestUser();
    try {
      await prisma.$transaction(async (tx) => {
        await awardXP(tx, user.id, "LESSON_COMPLETED", "lesson-123");
      });

      const userXP = await prisma.userXP.findUnique({ where: { userId: user.id } });
      assert.equal(userXP?.totalXP, XP_VALUES.LESSON_COMPLETED);

      const events = await prisma.xPEvent.findMany({ where: { userId: user.id } });
      assert.equal(events.length, 1);
      assert.equal(events[0]!.amount, XP_VALUES.LESSON_COMPLETED);
      assert.equal(events[0]!.reason, "LESSON_COMPLETED");
      assert.equal(events[0]!.refId, "lesson-123");

      assert.equal(await getUserTotalXP(user.id), XP_VALUES.LESSON_COMPLETED);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("accumulates totalXP across multiple events of different reasons, keeping XPEvent append-only", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user } = await createTestUser();
    try {
      await prisma.$transaction(async (tx) => {
        await awardXP(tx, user.id, "LESSON_COMPLETED", "lesson-1");
      });
      await prisma.$transaction(async (tx) => {
        await awardXP(tx, user.id, "LESSON_COMPLETED", "lesson-2");
      });
      await prisma.$transaction(async (tx) => {
        await awardXP(tx, user.id, "UNIT_EXAM_PASSED", "attempt-1");
      });

      const expectedTotal = XP_VALUES.LESSON_COMPLETED * 2 + XP_VALUES.UNIT_EXAM_PASSED;
      assert.equal(await getUserTotalXP(user.id), expectedTotal);

      const events = await prisma.xPEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
      assert.equal(events.length, 3);
      assert.deepEqual(
        events.map((e) => e.reason),
        ["LESSON_COMPLETED", "LESSON_COMPLETED", "UNIT_EXAM_PASSED"]
      );
      // Reconciliation: summing the ledger must match the denormalized total.
      const summed = events.reduce((sum, e) => sum + e.amount, 0);
      assert.equal(summed, expectedTotal);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("refId is optional and stored as null when omitted", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user } = await createTestUser();
    try {
      await prisma.$transaction(async (tx) => {
        await awardXP(tx, user.id, "STREAK_BONUS");
      });
      const event = await prisma.xPEvent.findFirstOrThrow({ where: { userId: user.id } });
      assert.equal(event.refId, null);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("a failed transaction never persists the XPEvent or the UserXP increment", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user } = await createTestUser();
    try {
      await assert.rejects(
        prisma.$transaction(async (tx) => {
          await awardXP(tx, user.id, "LESSON_COMPLETED", "lesson-x");
          throw new Error("simulated failure after awarding XP");
        })
      );

      assert.equal(await getUserTotalXP(user.id), 0);
      const events = await prisma.xPEvent.findMany({ where: { userId: user.id } });
      assert.equal(events.length, 0);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
