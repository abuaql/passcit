import "dotenv/config";
import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";
import { __resetRateLimitStoreForTests } from "@/lib/rate-limit";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "@/lib/native-auth/test-helpers";

function forgotPasswordRequest(body: unknown) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests();
  });

  test("issues a reset token for a registered email", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user } = await createTestUser();
    try {
      const res = await POST(forgotPasswordRequest({ email: user.email }));
      assert.equal(res.status, 200);

      const token = await prisma.passwordResetToken.findFirst({ where: { userId: user.id } });
      assert.ok(token);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("responds identically for an unregistered email — no account enumeration", async () => {
    const registered = await POST(forgotPasswordRequest({ email: "definitely-not-registered@example.test" }));
    const bodyUnregistered = await registered.json();

    assert.equal(registered.status, 200);
    assert.equal(bodyUnregistered.message, "If that email is registered, a reset link has been sent.");
  });

  test("is rate-limited after repeated requests from the same origin", async () => {
    const config = (await import("@/lib/rate-limit")).AUTH_RATE_LIMITS.forgotPassword;
    for (let i = 0; i < config.max; i++) {
      const res = await POST(forgotPasswordRequest({ email: "someone@example.test" }));
      assert.notEqual(res.status, 429);
    }

    const limited = await POST(forgotPasswordRequest({ email: "someone@example.test" }));
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get("Retry-After"));

    const body = await limited.json();
    assert.deepEqual(Object.keys(body), ["error"]);
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
