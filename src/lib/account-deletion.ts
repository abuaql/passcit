/**
 * Self-service account deletion. Hard delete — nothing in this app's
 * schema or documented business rules requires retaining a deleted
 * user's personal records (no compliance/audit table depends on them;
 * admin analytics only ever aggregate counts). No soft-delete field was
 * added: the existing architecture doesn't need one, and inventing one
 * here would be exactly the kind of unnecessary schema change this phase
 * was told to avoid.
 *
 * Two things this file is deliberately careful about:
 *
 * 1. `Announcement.createdBy` is the one FK pointing at User that is
 *    NOT cascading (`onDelete: Restrict`, and the column isn't
 *    nullable) — a raw `prisma.user.delete()` would throw a live
 *    constraint violation for any account that has authored site
 *    content. Checked explicitly up front instead of discovering it via
 *    a thrown error.
 *
 * 2. Every other child table's FK *is* correctly configured as CASCADE
 *    at the database level (verified against information_schema during
 *    inspection) — but this project's own Phase 5/6 testing empirically
 *    found that trusting a single cascading parent delete can still
 *    leave orphaned rows behind under this environment's long-lived
 *    connection pool. Production deletion uses the same fix already
 *    proven for test cleanup: explicit, ordered deletes for every child
 *    table inside one transaction, ending with the User row itself.
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type DeleteAccountResult =
  | { status: "ok" }
  | { status: "not_found" }
  | { status: "password_required" }
  | { status: "invalid_password" }
  | { status: "blocked_by_authored_content" };

export async function deleteAccount(userId: string, password?: string): Promise<DeleteAccountResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  // Idempotent: an already-deleted (or never-existed) account reports
  // the same outcome the caller cares about — "it's gone" — without
  // distinguishing "you just deleted it" from "someone already did."
  if (!user) return { status: "not_found" };

  // The session alone authorizes routine actions elsewhere in this app
  // (e.g. GET /api/user/me), but change-password already establishes the
  // stronger precedent for a sensitive, account-level action: require
  // the current password too, when the account has one. OAuth-only
  // accounts (passwordHash: null) have nothing to verify against, same
  // as change-password's own handling of that case.
  if (user.passwordHash) {
    if (!password) return { status: "password_required" };
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return { status: "invalid_password" };
  }

  const authoredAnnouncementCount = await prisma.announcement.count({ where: { createdBy: userId } });
  if (authoredAnnouncementCount > 0) {
    return { status: "blocked_by_authored_content" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Phase 6/XP
      await tx.xPEvent.deleteMany({ where: { userId } });
      await tx.userXP.deleteMany({ where: { userId } });
      // Phase 5/Roadmap
      await tx.unitExamAttempt.deleteMany({ where: { userId } });
      await tx.unitProgress.deleteMany({ where: { userId } });
      await tx.lessonProgress.deleteMany({ where: { userId } });
      // Interview simulation
      await tx.interviewCivicsAnswer.deleteMany({ where: { interview: { userId } } });
      await tx.interviewSimulation.deleteMany({ where: { userId } });
      // Eligibility
      await tx.eligibilityCalculation.deleteMany({ where: { userId } });
      // Streaks / study sessions
      await tx.studySession.deleteMany({ where: { userId } });
      await tx.studyStreak.deleteMany({ where: { userId } });
      // Voice practice
      await tx.voicePracticeAttempt.deleteMany({ where: { userId } });
      // Practice tests
      await tx.practiceTestAnswer.deleteMany({ where: { test: { userId } } });
      await tx.practiceTest.deleteMany({ where: { userId } });
      // Question-level progress/favorites
      await tx.userQuestionProgress.deleteMany({ where: { userId } });
      // Native auth
      await tx.nativeRefreshToken.deleteMany({ where: { userId } });
      // Web auth
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      // The row itself, last — if a concurrent request already deleted
      // it (raced past the findUnique check above), this throws P2025
      // and Prisma rolls back every delete this transaction made, atomically.
      await tx.user.delete({ where: { id: userId } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      // Lost a race with a concurrent deletion of the same account — the
      // transaction rolled back in full, nothing partial was left behind.
      // Report the same outcome as "already gone."
      return { status: "not_found" };
    }
    throw error;
  }

  return { status: "ok" };
}
