/**
 * Persistence and lifecycle for native refresh tokens. The raw token is a
 * cryptographically random opaque string, known only to the client — the
 * database only ever stores a one-way SHA-256 hash of it (same principle
 * as User.passwordHash never storing a plaintext password).
 */

import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { NativeRefreshToken } from "@/generated/prisma/client";
import type { UserRole } from "./access-token";

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface RefreshTokenOwner {
  id: string;
  role: UserRole;
  isActive: boolean;
}

/** 256 bits of randomness, opaque — carries no claims, unlike the access token. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/** One-way hash — the only form of the refresh token ever persisted. */
export function hashRefreshToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Pure predicate: is this token record usable right now? No I/O. */
export function isRefreshTokenRecordValid(
  record: Pick<NativeRefreshToken, "revokedAt" | "expiresAt">,
  now: Date = new Date()
): boolean {
  return record.revokedAt === null && record.expiresAt.getTime() > now.getTime();
}

/** Pure predicate: is this the owner of a still-usable account? No I/O. */
export function isEligibleOwner(user: RefreshTokenOwner | null | undefined): user is RefreshTokenOwner {
  return !!user && user.isActive;
}

/** Generates, hashes, and persists a new refresh token for a user. Returns the raw token once — it is never retrievable again. */
export async function createRefreshTokenRecord(
  userId: string,
  deviceInfo?: string | null,
  now: Date = new Date()
): Promise<{ rawToken: string; record: NativeRefreshToken }> {
  const rawToken = generateRefreshToken();
  const record = await prisma.nativeRefreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(rawToken),
      deviceInfo: deviceInfo ?? null,
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return { rawToken, record };
}

/** Looks up a presented raw token by its hash, along with the owning user's auth-relevant fields. */
export async function findRefreshTokenWithOwner(
  rawToken: string
): Promise<{ record: NativeRefreshToken; owner: RefreshTokenOwner | null } | null> {
  const record = await prisma.nativeRefreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(rawToken) },
    include: { user: { select: { id: true, role: true, isActive: true } } },
  });
  if (!record) return null;

  const { user, ...tokenRecord } = record;
  return { record: tokenRecord, owner: user };
}

/**
 * Validates and rotates a refresh token record in one atomic step: the
 * conditional `updateMany` (matching only if still unrevoked) and the
 * creation of its replacement both happen inside a single transaction, so
 * two concurrent rotations of the same token can never both succeed — the
 * second one finds zero rows to revoke and is rejected. This is what
 * makes the old token unusable after rotation, even under a race.
 */
export async function rotateRefreshTokenRecord(
  record: NativeRefreshToken,
  now: Date = new Date()
): Promise<{ rawToken: string; record: NativeRefreshToken } | null> {
  return prisma.$transaction(async (tx) => {
    const revoked = await tx.nativeRefreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: now },
    });
    if (revoked.count === 0) {
      // Already rotated or revoked since it was read — reject rather than
      // silently issuing a second valid successor for the same token.
      return null;
    }

    const rawToken = generateRefreshToken();
    const newRecord = await tx.nativeRefreshToken.create({
      data: {
        userId: record.userId,
        tokenHash: hashRefreshToken(rawToken),
        deviceInfo: record.deviceInfo,
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return { rawToken, record: newRecord };
  });
}

/**
 * Revokes a single refresh token, but only if it belongs to `userId`. A
 * token that doesn't exist, is already revoked, or belongs to someone
 * else all match zero rows and no-op — the caller cannot distinguish
 * these cases, which is what makes this both idempotent and safe against
 * revoking another user's session.
 */
export async function revokeRefreshTokenForUser(
  rawToken: string,
  userId: string,
  now: Date = new Date()
): Promise<void> {
  await prisma.nativeRefreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(rawToken), userId, revokedAt: null },
    data: { revokedAt: now },
  });
}

/** Revokes every still-active refresh token for a user — used when a password change should sign out all other sessions. */
export async function revokeAllRefreshTokensForUser(
  userId: string,
  now: Date = new Date()
): Promise<number> {
  const result = await prisma.nativeRefreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });
  return result.count;
}
