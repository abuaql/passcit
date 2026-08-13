import "dotenv/config";
import { randomUUID } from "crypto";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { handleAppleAuth } from "./route";
import type { AppleIdentityClaims } from "@/lib/native-auth/apple";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "@/lib/native-auth/test-helpers";

function appleRequest(body: unknown) {
  return new Request("http://localhost/api/native/auth/apple", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function fakeVerifier(claims: AppleIdentityClaims | null) {
  return async () => claims;
}

describe("POST /api/native/auth/apple", () => {
  test("existing account: signs in and returns isNewUser: false", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    const providerAccountId = `apple-sub-${randomUUID()}`;
    try {
      await prisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "apple", providerAccountId },
      });

      const res = await handleAppleAuth(appleRequest({ identityToken: "irrelevant-mocked" }), {
        verifyIdentityToken: fakeVerifier({ sub: providerAccountId, email: user.email, emailVerified: true }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.tokenType, "Bearer");
      assert.equal(body.user.id, user.id);
      assert.equal(body.isNewUser, false);
      assert.equal("sub" in body.user, false);
      assert.equal("providerAccountId" in body.user, false);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("new identity + verified email: creates a user, uses the supplied name, isNewUser: true", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const email = `native-auth-test-${randomUUID()}@example.test`;
    const providerAccountId = `apple-sub-${randomUUID()}`;
    try {
      const res = await handleAppleAuth(
        appleRequest({
          identityToken: "irrelevant-mocked",
          name: { firstName: "Ada", lastName: "Lovelace" },
        }),
        { verifyIdentityToken: fakeVerifier({ sub: providerAccountId, email, emailVerified: true }) }
      );

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.isNewUser, true);
      assert.equal(body.user.email, email);
      assert.equal(body.user.name, "Ada Lovelace");

      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      assert.equal(user.passwordHash, null);
    } finally {
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  test("inactive account owner is rejected with the generic error", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser({ isActive: false });
    const providerAccountId = `apple-sub-${randomUUID()}`;
    try {
      await prisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "apple", providerAccountId },
      });

      const res = await handleAppleAuth(appleRequest({ identityToken: "irrelevant-mocked" }), {
        verifyIdentityToken: fakeVerifier({ sub: providerAccountId, email: user.email, emailVerified: true }),
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.error, "Invalid Apple credential.");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("an unverified email is rejected with the generic error, nothing is created", async () => {
    const email = `native-auth-test-${randomUUID()}@example.test`;
    const res = await handleAppleAuth(appleRequest({ identityToken: "irrelevant-mocked" }), {
      verifyIdentityToken: fakeVerifier({
        sub: `apple-sub-${randomUUID()}`,
        email,
        emailVerified: false,
      }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Invalid Apple credential.");
    assert.equal(await prisma.user.count({ where: { email } }), 0);
  });

  test("token verification failure returns the generic error", async () => {
    const res = await handleAppleAuth(appleRequest({ identityToken: "irrelevant-mocked" }), {
      verifyIdentityToken: fakeVerifier(null),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Invalid Apple credential.");
  });

  test("rejects a malformed request body without ever invoking verification", async () => {
    let called = false;
    const res = await handleAppleAuth(appleRequest({}), {
      verifyIdentityToken: async () => {
        called = true;
        return null;
      },
    });
    assert.equal(res.status, 401);
    assert.equal(called, false);
  });

  test("rejects a garbage identity token without any network dependency (real verifier, no mock)", async () => {
    const res = await handleAppleAuth(appleRequest({ identityToken: "not-a-real-jwt" }));
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Invalid Apple credential.");
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
