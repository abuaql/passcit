import "dotenv/config";
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { verifyAppleIdentityToken } from "./apple";
import { createMockProviderKeySet, signMockToken } from "./test-jwks-helpers";

const ISSUER = "https://appleid.apple.com";
const AUD = "com.passcit.ios";

describe("verifyAppleIdentityToken", () => {
  let originalAudiences: string | undefined;

  beforeEach(() => {
    originalAudiences = process.env.APPLE_VALID_AUDIENCES;
  });

  afterEach(() => {
    process.env.APPLE_VALID_AUDIENCES = originalAudiences;
  });

  test("accepts a validly signed token with an allowed audience", async () => {
    process.env.APPLE_VALID_AUDIENCES = AUD;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "apple-sub-1", email: "person@example.test", email_verified: "true" },
      { issuer: ISSUER, audience: AUD }
    );

    const claims = await verifyAppleIdentityToken(token, { keyResolver });
    assert.deepEqual(claims, { sub: "apple-sub-1", email: "person@example.test", emailVerified: true });
  });

  test("rejects a token signed with a different key (invalid signature)", async () => {
    process.env.APPLE_VALID_AUDIENCES = AUD;
    const { privateKey, kid } = await createMockProviderKeySet(); // signs with this key...
    const { keyResolver } = await createMockProviderKeySet(); // ...but verifies against a different key's JWKS
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "apple-sub-1", email: "person@example.test", email_verified: "true" },
      { issuer: ISSUER, audience: AUD }
    );

    assert.equal(await verifyAppleIdentityToken(token, { keyResolver }), null);
  });

  test("rejects a token with the wrong issuer", async () => {
    process.env.APPLE_VALID_AUDIENCES = AUD;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "apple-sub-1", email: "person@example.test", email_verified: "true" },
      { issuer: "https://not-apple.example.test", audience: AUD }
    );

    assert.equal(await verifyAppleIdentityToken(token, { keyResolver }), null);
  });

  test("rejects a token whose audience is not in the configured allowlist", async () => {
    process.env.APPLE_VALID_AUDIENCES = AUD;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "apple-sub-1", email: "person@example.test", email_verified: "true" },
      { issuer: ISSUER, audience: "com.someone-else.app" }
    );

    assert.equal(await verifyAppleIdentityToken(token, { keyResolver }), null);
  });

  test("accepts a token when multiple audiences are configured", async () => {
    process.env.APPLE_VALID_AUDIENCES = `com.passcit.ios.dev, ${AUD} ,com.passcit.ios.staging`;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "apple-sub-1", email: "person@example.test", email_verified: "true" },
      { issuer: ISSUER, audience: AUD }
    );

    const claims = await verifyAppleIdentityToken(token, { keyResolver });
    assert.ok(claims);
    assert.equal(claims.sub, "apple-sub-1");
  });

  test("rejects when APPLE_VALID_AUDIENCES is not configured (fails closed)", async () => {
    delete process.env.APPLE_VALID_AUDIENCES;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "apple-sub-1", email: "person@example.test", email_verified: "true" },
      { issuer: ISSUER, audience: AUD }
    );

    assert.equal(await verifyAppleIdentityToken(token, { keyResolver }), null);
  });

  test("rejects an expired token", async () => {
    process.env.APPLE_VALID_AUDIENCES = AUD;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "apple-sub-1", email: "person@example.test", email_verified: "true" },
      { issuer: ISSUER, audience: AUD, expiresInSeconds: -3600 }
    );

    assert.equal(await verifyAppleIdentityToken(token, { keyResolver }), null);
  });

  test("normalizes email_verified from Apple's boolean-as-string quirk", async () => {
    process.env.APPLE_VALID_AUDIENCES = AUD;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();

    const falseStringToken = await signMockToken(
      privateKey,
      kid,
      { sub: "apple-sub-1", email: "person@example.test", email_verified: "false" },
      { issuer: ISSUER, audience: AUD }
    );
    const claimsFalse = await verifyAppleIdentityToken(falseStringToken, { keyResolver });
    assert.equal(claimsFalse?.emailVerified, false);

    const trueBooleanToken = await signMockToken(
      privateKey,
      kid,
      { sub: "apple-sub-1", email: "person@example.test", email_verified: true },
      { issuer: ISSUER, audience: AUD }
    );
    const claimsTrue = await verifyAppleIdentityToken(trueBooleanToken, { keyResolver });
    assert.equal(claimsTrue?.emailVerified, true);
  });

  test("reports a null email and unverified when the token carries none", async () => {
    process.env.APPLE_VALID_AUDIENCES = AUD;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(privateKey, kid, { sub: "apple-sub-1" }, { issuer: ISSUER, audience: AUD });

    const claims = await verifyAppleIdentityToken(token, { keyResolver });
    assert.deepEqual(claims, { sub: "apple-sub-1", email: null, emailVerified: false });
  });

  test("rejects a malformed token", async () => {
    process.env.APPLE_VALID_AUDIENCES = AUD;
    assert.equal(await verifyAppleIdentityToken("not-a-jwt"), null);
  });
});
