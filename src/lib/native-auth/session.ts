/**
 * Composes the access-token and refresh-token layers into the single
 * {@link TokenPair} shape every native-auth endpoint returns. This is the
 * one place that shape is assembled, so login/register/refresh routes
 * stay thin and never duplicate token-issuance logic.
 */

import { createAccessToken, type UserRole } from "./access-token";
import {
  createRefreshTokenRecord,
  findRefreshTokenWithOwner,
  isRefreshTokenRecordValid,
  isEligibleOwner,
  rotateRefreshTokenRecord,
} from "./refresh-token";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

/** Issues a fresh access + refresh token pair for an authenticated user (login, register). */
export async function issueTokenPair(
  user: { id: string; role: UserRole },
  deviceInfo?: string | null
): Promise<TokenPair> {
  const { token: accessToken, expiresIn } = createAccessToken(user);
  const { rawToken: refreshToken } = await createRefreshTokenRecord(user.id, deviceInfo);
  return { accessToken, refreshToken, expiresIn, tokenType: "Bearer" };
}

/**
 * Validates a presented refresh token and, only if it is genuinely usable
 * (found, unrevoked, unexpired, owner still active), atomically rotates
 * it and issues a new pair. Returns null for every failure mode — the
 * caller (the /refresh route) turns that uniformly into a generic 401,
 * never revealing which specific check failed.
 */
export async function rotateTokenPair(presentedRefreshToken: string): Promise<TokenPair | null> {
  const found = await findRefreshTokenWithOwner(presentedRefreshToken);
  if (!found) return null;

  const { record, owner } = found;
  if (!isRefreshTokenRecordValid(record)) return null;
  if (!isEligibleOwner(owner)) return null;

  const rotated = await rotateRefreshTokenRecord(record);
  if (!rotated) return null;

  const { token: accessToken, expiresIn } = createAccessToken({ id: owner.id, role: owner.role });
  return { accessToken, refreshToken: rotated.rawToken, expiresIn, tokenType: "Bearer" };
}
