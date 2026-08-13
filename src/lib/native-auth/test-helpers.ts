/**
 * Shared setup/teardown for native-auth tests only. Deliberately named so
 * it does not match the `*.test.ts` glob the test runner discovers —
 * this file has no tests of its own.
 */

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "./access-token";

export interface TestUserOptions {
  isActive?: boolean;
  role?: UserRole;
  withPassword?: boolean;
  password?: string;
}

export async function createTestUser(options: TestUserOptions = {}) {
  const password = options.password ?? "correct-horse-battery-1";
  const passwordHash = options.withPassword === false ? null : await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: `native-auth-test-${randomUUID()}@example.test`,
      name: "Native Auth Test User",
      passwordHash,
      isActive: options.isActive ?? true,
      role: options.role ?? "USER",
    },
  });

  return { user, password };
}

/**
 * Explicitly deletes this user's known test-relevant children before the
 * user row itself, rather than relying solely on ON DELETE CASCADE.
 * Empirically, under this suite's long-lived, heavily-reused connection
 * pool, a single cascading `prisma.user.delete()` was observed to
 * sometimes leave orphaned child rows behind despite the live FK
 * constraints correctly being CASCADE — a session-level MySQL/driver-pool
 * quirk, not a schema problem. Explicit deletes sidestep that for test
 * cleanup, where correctness matters more than brevity.
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await prisma.unitExamAttempt.deleteMany({ where: { userId } });
  await prisma.unitProgress.deleteMany({ where: { userId } });
  await prisma.lessonProgress.deleteMany({ where: { userId } });
  await prisma.nativeRefreshToken.deleteMany({ where: { userId } });
  await prisma.studyStreak.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
}

export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
