/**
 * Verifies a native Google Sign-In ID token against Google's published
 * JWKS. Mirrors apple.ts's structure and the same `jose`-based, no-hand-
 * rolled-crypto approach. Verification only — account policy lives in
 * oauth-account.ts.
 */

import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from "jose";

// Google accepts either form as a valid issuer — both appear in the wild
// depending on token version, so both must be allowed.
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

let googleJWKS: JWTVerifyGetKey | null = null;
function getGoogleRemoteJWKS(): JWTVerifyGetKey {
  if (!googleJWKS) {
    googleJWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  }
  return googleJWKS;
}

/**
 * A comma-separated allowlist, not a single client ID — supports the
 * native iOS OAuth client ID today and additional client IDs (e.g. a web
 * client) later without a code change.
 */
function getConfiguredAudiences(): string[] {
  return (process.env.GOOGLE_VALID_AUDIENCES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export interface GoogleIdentityClaims {
  sub: string;
  email: string | null;
  emailVerified: boolean;
}

export async function verifyGoogleIdToken(
  idToken: string,
  options: { keyResolver?: JWTVerifyGetKey } = {}
): Promise<GoogleIdentityClaims | null> {
  const audiences = getConfiguredAudiences();
  if (audiences.length === 0) return null; // misconfigured — fail closed

  const keyResolver = options.keyResolver ?? getGoogleRemoteJWKS();

  try {
    const { payload } = await jwtVerify(idToken, keyResolver, {
      issuer: GOOGLE_ISSUERS,
      audience: audiences,
    });

    if (typeof payload.sub !== "string" || !payload.sub) return null;

    const email = typeof payload.email === "string" ? payload.email : null;
    const emailVerified = payload.email_verified === true;

    return { sub: payload.sub, email, emailVerified };
  } catch {
    return null;
  }
}
