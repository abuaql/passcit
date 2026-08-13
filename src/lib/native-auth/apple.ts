/**
 * Verifies a Sign in with Apple native identity token against Apple's
 * published JWKS. Uses `jose` (already a transitive dependency of
 * @auth/core, now declared directly) rather than hand-rolling RS256/JWKS
 * verification — see the Phase 4.2 report for why.
 *
 * This module only verifies the token and extracts its claims; it has no
 * opinion on what to do with them (link/create/reject an account) — that
 * policy lives in oauth-account.ts.
 */

import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from "jose";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

// Created once per process and reused — this is the caching layer.
// `jose`'s remote JWKS also transparently re-fetches when it hits a `kid`
// it doesn't recognize (key rotation), with built-in rate-limiting
// against repeated re-fetch storms for an unknown/invalid `kid`.
let appleJWKS: JWTVerifyGetKey | null = null;
function getAppleRemoteJWKS(): JWTVerifyGetKey {
  if (!appleJWKS) {
    appleJWKS = createRemoteJWKSet(new URL(APPLE_JWKS_URL));
  }
  return appleJWKS;
}

/**
 * Never a single hardcoded audience — a comma-separated allowlist so the
 * native iOS Bundle ID (the correct native `aud`) and, later, a web
 * Services ID can both be configured without a code change.
 */
function getConfiguredAudiences(): string[] {
  return (process.env.APPLE_VALID_AUDIENCES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export interface AppleIdentityClaims {
  sub: string;
  email: string | null;
  /** Apple has sent this as a real boolean and, in some client/token versions, as the strings "true"/"false" — both are normalized here. */
  emailVerified: boolean;
}

export async function verifyAppleIdentityToken(
  identityToken: string,
  options: { keyResolver?: JWTVerifyGetKey } = {}
): Promise<AppleIdentityClaims | null> {
  const audiences = getConfiguredAudiences();
  if (audiences.length === 0) return null; // misconfigured — fail closed, never accept any audience

  const keyResolver = options.keyResolver ?? getAppleRemoteJWKS();

  try {
    const { payload } = await jwtVerify(identityToken, keyResolver, {
      issuer: APPLE_ISSUER,
      audience: audiences,
    });

    if (typeof payload.sub !== "string" || !payload.sub) return null;

    const email = typeof payload.email === "string" ? payload.email : null;
    const emailVerifiedClaim = payload.email_verified;
    const emailVerified = emailVerifiedClaim === true || emailVerifiedClaim === "true";

    return { sub: payload.sub, email, emailVerified };
  } catch {
    // Covers every failure mode jose can raise: bad signature, wrong
    // issuer, wrong/unlisted audience, expired, malformed — all
    // indistinguishable to the caller, matching this app's generic-
    // auth-failure convention.
    return null;
  }
}
