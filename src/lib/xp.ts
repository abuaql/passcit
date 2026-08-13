/**
 * XP is motivational only. The single authoritative XPReason -> amount
 * lookup lives here — nowhere else in the codebase should hardcode an XP
 * value. `awardXP` is the only way an XPEvent is ever created or
 * UserXP.totalXP ever changes.
 *
 * Hard architectural rule: this module is never imported by
 * src/lib/roadmap.ts. Unlock state is computed entirely from
 * UnitProgress/LessonProgress; XP is a side effect of completion, never
 * an input to it.
 *
 * Idempotency is deliberately NOT enforced here — `awardXP` unconditionally
 * creates one XPEvent and increments totalXP each time it's called. The
 * callers (completeLesson, completeUnitExam, practice-test completion)
 * are responsible for only calling this exactly once per genuine
 * completion, using the same race-safe transactional guards that already
 * establish each action's own idempotency. This keeps the "is this a
 * duplicate?" decision where the domain knowledge already lives, rather
 * than duplicating it here.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma, XPReason } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Product-decision constants — deliberately small numbers relative to
 * each other, not tuned against any real engagement data. See the Phase 6
 * report for the reasoning behind the relative sizing.
 */
export const XP_VALUES: Record<XPReason, number> = {
  LESSON_COMPLETED: 10,
  UNIT_EXAM_PASSED: 50,
  PRACTICE_TEST_COMPLETED: 15,
  DAILY_GOAL_MET: 20,
  STREAK_BONUS: 25,
};

/**
 * Awards XP transactionally: one XPEvent insert plus one UserXP
 * increment, both inside the caller's own transaction (`tx`) — never a
 * standalone write outside a transaction, by construction, since every
 * completion path that awards XP must already be atomic with the state
 * change that earned it.
 */
export async function awardXP(tx: Tx, userId: string, reason: XPReason, refId?: string | null): Promise<void> {
  const amount = XP_VALUES[reason];

  await tx.xPEvent.create({
    data: { userId, amount, reason, refId: refId ?? null },
  });

  await tx.userXP.upsert({
    where: { userId },
    update: { totalXP: { increment: amount } },
    create: { userId, totalXP: amount },
  });
}

/**
 * Read-only. Never sums XPEvent — UserXP.totalXP is the source of truth
 * for display; XPEvent is the audit/reconciliation ledger, not a live
 * aggregate to recompute from on every read. Defaults to 0 for a user who
 * has never earned any XP yet (no UserXP row exists until the first award).
 */
export async function getUserTotalXP(userId: string): Promise<number> {
  const record = await prisma.userXP.findUnique({ where: { userId }, select: { totalXP: true } });
  return record?.totalXP ?? 0;
}
