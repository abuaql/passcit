import "dotenv/config";
import { randomUUID } from "crypto";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { handleGoogleAuth } from "./route";
import type { GoogleIdentityClaims } from "@/lib/native-auth/google";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "@/lib/native-auth/test-helpers";

function googleRequest(body: unknown) {
  return new Request("http://localhost/api/native/auth/google", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function fakeVerifier(claims: GoogleIdentityClaims | null) {
  return async () => claims;
}

describe("POST /api/native/auth/google", () => {
  test("existing account: signs in and returns isNewUser: false", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    const providerAccountId = `google-sub-${randomUUID()}`;
    try {
      await prisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "google", providerAccountId },
      });

      const res = await handleGoogleAuth(googleRequest({ idToken: "irrelevant-mocked" }), {
        verifyIdToken: fakeVerifier({ sub: providerAccountId, email: user.email, emailVerified: true }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.user.id, user.id);
      assert.equal(body.isNewUser, false);
      assert.equal("sub" in body.user, false);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("verified-email account linking: reuses the existing user, does not duplicate", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    const providerAccountId = `google-sub-${randomUUID()}`;
    try {
      const res = await handleGoogleAuth(googleRequest({ idToken: "irrelevant-mocked" }), {
        verifyIdToken: fakeVerifier({ sub: providerAccountId, email: user.email, emailVerified: true }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.user.id, user.id);
      assert.equal(body.isNewUser, false);
      assert.equal(await prisma.user.count({ where: { email: user.email } }), 1);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("new identity + verified email: creates a user, isNewUser: true", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const email = `native-auth-test-${randomUUID()}@example.test`;
    const providerAccountId = `google-sub-${randomUUID()}`;
    try {
      const res = await handleGoogleAuth(googleRequest({ idToken: "irrelevant-mocked" }), {
        verifyIdToken: fakeVerifier({ sub: providerAccountId, email, emailVerified: true }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.isNewUser, true);
      assert.equal(body.user.email, email);

      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      assert.equal(user.passwordHash, null);
    } finally {
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  test("inactive account owner is rejected with the generic error", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser({ isActive: false });
    const providerAccountId = `google-sub-${randomUUID()}`;
    try {
      await prisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "google", providerAccountId },
      });

      const res = await handleGoogleAuth(googleRequest({ idToken: "irrelevant-mocked" }), {
        verifyIdToken: fakeVerifier({ sub: providerAccountId, email: user.email, emailVerified: true }),
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.error, "Invalid Google credential.");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("an unverified email is rejected with the generic error, nothing is created", async () => {
    const email = `native-auth-test-${randomUUID()}@example.test`;
    const res = await handleGoogleAuth(googleRequest({ idToken: "irrelevant-mocked" }), {
      verifyIdToken: fakeVerifier({ sub: `google-sub-${randomUUID()}`, email, emailVerified: false }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Invalid Google credential.");
    assert.equal(await prisma.user.count({ where: { email } }), 0);
  });

  test("token verification failure returns the generic error", async () => {
    const res = await handleGoogleAuth(googleRequest({ idToken: "irrelevant-mocked" }), {
      verifyIdToken: fakeVerifier(null),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Invalid Google credential.");
  });

  test("rejects a malformed request body without ever invoking verification", async () => {
    let called = false;
    const res = await handleGoogleAuth(googleRequest({}), {
      verifyIdToken: async () => {
        called = true;
        return null;
      },
    });
    assert.equal(res.status, 401);
    assert.equal(called, false);
  });

  test("rejects a garbage id token without any network dependency (real verifier, no mock)", async () => {
    const res = await handleGoogleAuth(googleRequest({ idToken: "not-a-real-jwt" }));
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Invalid Google credential.");
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
