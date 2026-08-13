import "dotenv/config";
import { randomUUID } from "crypto";
import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";
import { __resetRateLimitStoreForTests } from "@/lib/rate-limit";
import { isDatabaseReachable } from "@/lib/native-auth/test-helpers";

function registerRequest(body: unknown) {
  return new Request("http://localhost/api/native/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/native/auth/register", () => {
  // See login/route.test.ts for why this file resets the rate limiter
  // between tests — it calls the real, now-rate-limited POST handler.
  beforeEach(() => {
    __resetRateLimitStoreForTests();
  });

  test("creates a user + StudyStreak and returns a token pair", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const email = `native-auth-test-${randomUUID()}@example.test`;
    try {
      const res = await POST(
        registerRequest({ name: "New Learner", email, password: "correct-horse-1" })
      );
      assert.equal(res.status, 201);

      const body = await res.json();
      assert.equal(body.tokenType, "Bearer");
      assert.equal(typeof body.accessToken, "string");
      assert.equal(typeof body.refreshToken, "string");
      assert.equal(body.user.email, email);
      assert.equal(body.user.role, "USER");

      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      assert.equal(user.name, "New Learner");
      assert.notEqual(user.passwordHash, null);

      const streak = await prisma.studyStreak.findUnique({ where: { userId: user.id } });
      assert.ok(streak);

      const tokenCount = await prisma.nativeRefreshToken.count({ where: { userId: user.id } });
      assert.equal(tokenCount, 1);
    } finally {
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  test("rejects a duplicate email", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const email = `native-auth-test-${randomUUID()}@example.test`;
    try {
      const first = await POST(registerRequest({ name: "First", email, password: "correct-horse-1" }));
      assert.equal(first.status, 201);

      const second = await POST(registerRequest({ name: "Second", email, password: "correct-horse-2" }));
      assert.equal(second.status, 409);
      const body = await second.json();
      assert.equal(body.error, "An account with this email already exists.");

      const count = await prisma.user.count({ where: { email } });
      assert.equal(count, 1);
    } finally {
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  test("rejects invalid input with a validation message", async () => {
    const res = await POST(
      registerRequest({ name: "A", email: "not-an-email", password: "short" })
    );
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(typeof body.error, "string");
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
