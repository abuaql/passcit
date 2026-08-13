/**
 * Native access tokens — a minimal, dependency-free HS256 JWT
 * implementation for the iOS app's short-lived bearer token. Not a
 * general-purpose JWT library: one algorithm, one claim shape, one
 * purpose. Reuses AUTH_SECRET (the same secret Auth.js already signs the
 * web session with) rather than introducing a second secret — this is a
 * distinct, self-contained token format that Auth.js's own session
 * decode logic never parses, so sharing the secret creates no
 * cross-format ambiguity.
 */

import { createHmac, timingSafeEqual } from "crypto";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const ACCESS_TOKEN_TYPE = "access";

export type UserRole = "USER" | "ADMIN";

export interface AccessTokenClaims {
  sub: string;
  role: UserRole;
  type: "access";
  iat: number;
  exp: number;
}

export interface AccessTokenResult {
  token: string;
  expiresIn: number;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set — native access tokens cannot be signed or verified.");
  }
  return secret;
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(signingInput: string, secret: string): string {
  return createHmac("sha256", secret).update(signingInput).digest("base64url");
}

/**
 * Issues a signed access token for the given user, valid for 15 minutes
 * from `now`. `now` defaults to the real current time and only needs to
 * be overridden in tests that need to produce an already-expired token.
 */
export function createAccessToken(
  user: { id: string; role: UserRole },
  now: Date = new Date()
): AccessTokenResult {
  const secret = getSecret();
  const issuedAt = Math.floor(now.getTime() / 1000);
  const claims: AccessTokenClaims = {
    sub: user.id,
    role: user.role,
    type: ACCESS_TOKEN_TYPE,
    iat: issuedAt,
    exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
  };

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify(claims));
  const signature = sign(`${header}.${payload}`, secret);

  return { token: `${header}.${payload}.${signature}`, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

/**
 * Verifies signature, expiry, and token type in one pass. Returns null on
 * any failure (forged, expired, malformed, wrong type) — callers never
 * need to distinguish why a token is invalid, matching this app's
 * existing generic-auth-failure convention.
 */
export function verifyAccessToken(token: string): AccessTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) return null;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  const expected = Buffer.from(sign(`${header}.${payload}`, secret));
  const provided = Buffer.from(signature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  let claims: AccessTokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (claims.type !== ACCESS_TOKEN_TYPE) return null;
  if (typeof claims.sub !== "string" || !claims.sub) return null;
  if (claims.role !== "USER" && claims.role !== "ADMIN") return null;
  if (typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000)) return null;

  return claims;
}
