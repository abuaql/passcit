import "dotenv/config";
import { test, describe, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";
import { __resetRateLimitStoreForTests } from "@/lib/rate-limit";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "@/lib/native-auth/test-helpers";

function loginRequest(body: unknown) {
  return new Request("http://localhost/api/native/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/native/auth/login", () => {
  let dbReady = false;

  before(async () => {
    dbReady = await isDatabaseReachable();
  });

  // This file exercises the real POST handler directly, which is now
  // rate-limited. These requests carry no forwarded-IP header, so every
  // call in this file would otherwise share one bucket — reset before
  // each test so this suite's own behavior is what's under test, not
  // Phase 7's rate limiter (that has its own dedicated test file).
  beforeEach(() => {
    __resetRateLimitStoreForTests();
  });

  test("succeeds with correct credentials and persists a refresh token", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user, password } = await createTestUser();
    try {
      const res = await POST(loginRequest({ email: user.email, password }));
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.tokenType, "Bearer");
      assert.equal(body.expiresIn, 900);
      assert.equal(typeof body.accessToken, "string");
      assert.equal(typeof body.refreshToken, "string");
      assert.equal(body.user.id, user.id);
      assert.equal(body.user.email, user.email);
      assert.equal(body.user.role, "USER");
      assert.equal("passwordHash" in body.user, false);

      const tokenCount = await prisma.nativeRefreshToken.count({ where: { userId: user.id } });
      assert.equal(tokenCount, 1);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rejects a wrong password with a generic message", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    try {
      const res = await POST(loginRequest({ email: user.email, password: "wrong-password-1" }));
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.error, "Invalid credentials.");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rejects an email that doesn't exist with the same generic message", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const res = await POST(loginRequest({ email: "nobody@example.test", password: "whatever123" }));
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Invalid credentials.");
  });

  test("rejects a disabled account with the same generic message", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user, password } = await createTestUser({ isActive: false });
    try {
      const res = await POST(loginRequest({ email: user.email, password }));
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.error, "Invalid credentials.");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rejects a malformed request body with the same generic message", async () => {
    const res = await POST(loginRequest({ email: "not-an-email" }));
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Invalid credentials.");
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
