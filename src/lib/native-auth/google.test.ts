import "dotenv/config";
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { verifyGoogleIdToken } from "./google";
import { createMockProviderKeySet, signMockToken } from "./test-jwks-helpers";

const AUD = "1234567890-abc.apps.googleusercontent.com";

describe("verifyGoogleIdToken", () => {
  let originalAudiences: string | undefined;

  beforeEach(() => {
    originalAudiences = process.env.GOOGLE_VALID_AUDIENCES;
  });

  afterEach(() => {
    process.env.GOOGLE_VALID_AUDIENCES = originalAudiences;
  });

  test("accepts a validly signed token with an allowed audience", async () => {
    process.env.GOOGLE_VALID_AUDIENCES = AUD;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "google-sub-1", email: "person@example.test", email_verified: true },
      { issuer: "https://accounts.google.com", audience: AUD }
    );

    const claims = await verifyGoogleIdToken(token, { keyResolver });
    assert.deepEqual(claims, { sub: "google-sub-1", email: "person@example.test", emailVerified: true });
  });

  test("accepts the bare 'accounts.google.com' issuer form too", async () => {
    process.env.GOOGLE_VALID_AUDIENCES = AUD;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "google-sub-1", email: "person@example.test", email_verified: true },
      { issuer: "accounts.google.com", audience: AUD }
    );

    const claims = await verifyGoogleIdToken(token, { keyResolver });
    assert.ok(claims);
  });

  test("rejects a token signed with a different key (invalid signature)", async () => {
    process.env.GOOGLE_VALID_AUDIENCES = AUD;
    const { privateKey, kid } = await createMockProviderKeySet();
    const { keyResolver } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "google-sub-1", email: "person@example.test", email_verified: true },
      { issuer: "https://accounts.google.com", audience: AUD }
    );

    assert.equal(await verifyGoogleIdToken(token, { keyResolver }), null);
  });

  test("rejects a token with the wrong issuer", async () => {
    process.env.GOOGLE_VALID_AUDIENCES = AUD;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "google-sub-1", email: "person@example.test", email_verified: true },
      { issuer: "https://not-google.example.test", audience: AUD }
    );

    assert.equal(await verifyGoogleIdToken(token, { keyResolver }), null);
  });

  test("rejects a token whose audience is not in the configured allowlist", async () => {
    process.env.GOOGLE_VALID_AUDIENCES = AUD;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "google-sub-1", email: "person@example.test", email_verified: true },
      { issuer: "https://accounts.google.com", audience: "some-other-client-id.apps.googleusercontent.com" }
    );

    assert.equal(await verifyGoogleIdToken(token, { keyResolver }), null);
  });

  test("accepts a token when multiple client IDs are configured", async () => {
    process.env.GOOGLE_VALID_AUDIENCES = `web-client-id.apps.googleusercontent.com,${AUD}`;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "google-sub-1", email: "person@example.test", email_verified: true },
      { issuer: "https://accounts.google.com", audience: AUD }
    );

    const claims = await verifyGoogleIdToken(token, { keyResolver });
    assert.ok(claims);
  });

  test("rejects when GOOGLE_VALID_AUDIENCES is not configured (fails closed)", async () => {
    delete process.env.GOOGLE_VALID_AUDIENCES;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "google-sub-1", email: "person@example.test", email_verified: true },
      { issuer: "https://accounts.google.com", audience: AUD }
    );

    assert.equal(await verifyGoogleIdToken(token, { keyResolver }), null);
  });

  test("rejects an expired token", async () => {
    process.env.GOOGLE_VALID_AUDIENCES = AUD;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();
    const token = await signMockToken(
      privateKey,
      kid,
      { sub: "google-sub-1", email: "person@example.test", email_verified: true },
      { issuer: "https://accounts.google.com", audience: AUD, expiresInSeconds: -3600 }
    );

    assert.equal(await verifyGoogleIdToken(token, { keyResolver }), null);
  });

  test("treats a missing/false email_verified as unverified", async () => {
    process.env.GOOGLE_VALID_AUDIENCES = AUD;
    const { keyResolver, privateKey, kid } = await createMockProviderKeySet();

    const noEmailToken = await signMockToken(
      privateKey,
      kid,
      { sub: "google-sub-1" },
      { issuer: "https://accounts.google.com", audience: AUD }
    );
    assert.deepEqual(await verifyGoogleIdToken(noEmailToken, { keyResolver }), {
      sub: "google-sub-1",
      email: null,
      emailVerified: false,
    });

    const unverifiedToken = await signMockToken(
      privateKey,
      kid,
      { sub: "google-sub-1", email: "person@example.test", email_verified: false },
      { issuer: "https://accounts.google.com", audience: AUD }
    );
    const claims = await verifyGoogleIdToken(unverifiedToken, { keyResolver });
    assert.equal(claims?.emailVerified, false);
  });

  test("rejects a malformed token", async () => {
    process.env.GOOGLE_VALID_AUDIENCES = AUD;
    assert.equal(await verifyGoogleIdToken("not-a-jwt"), null);
  });
});
