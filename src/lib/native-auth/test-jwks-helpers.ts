/**
 * Test-only helpers for building a local, self-signed "Apple/Google-
 * shaped" JWKS and signing tokens against it, so apple.ts/google.ts's
 * real verification logic (jose's jwtVerify + a JWKS key resolver) can be
 * exercised without ever calling Apple's or Google's real endpoints.
 * Deliberately not named `*.test.ts` — it has no tests of its own.
 */

import { randomUUID, webcrypto } from "crypto";
import { exportJWK, SignJWT, createLocalJWKSet, type JWTVerifyGetKey } from "jose";

export interface MockProviderKeySet {
  keyResolver: JWTVerifyGetKey;
  privateKey: CryptoKey;
  kid: string;
}

/** A fresh RSA keypair + a local JWKS built from its public half, standing in for a provider's real published JWKS. */
export async function createMockProviderKeySet(): Promise<MockProviderKeySet> {
  const { privateKey, publicKey } = (await webcrypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"]
  )) as CryptoKeyPair;

  const kid = randomUUID();
  const publicJwk = await exportJWK(publicKey);
  const keyResolver = createLocalJWKSet({
    keys: [{ ...publicJwk, kid, alg: "RS256", use: "sig" }],
  });

  return { keyResolver, privateKey, kid };
}

export interface SignMockTokenOptions {
  issuer: string;
  audience: string;
  /** Seconds from now; negative produces an already-expired token. Defaults to 1 hour. */
  expiresInSeconds?: number;
  /** Sign with the wrong `kid` (still a valid signature under the same key) to simulate a mismatched/rotated key id. */
  kidOverride?: string;
}

export async function signMockToken(
  privateKey: CryptoKey,
  kid: string,
  claims: Record<string, unknown>,
  options: SignMockTokenOptions
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: options.kidOverride ?? kid })
    .setIssuedAt(now)
    .setIssuer(options.issuer)
    .setAudience(options.audience)
    .setExpirationTime(now + (options.expiresInSeconds ?? 3600))
    .sign(privateKey);
}
