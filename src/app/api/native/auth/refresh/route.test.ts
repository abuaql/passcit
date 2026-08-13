import "dotenv/config";
import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";
import { issueTokenPair } from "@/lib/native-auth/session";
import { createRefreshTokenRecord, hashRefreshToken } from "@/lib/native-auth/refresh-token";
import { __resetRateLimitStoreForTests } from "@/lib/rate-limit";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "@/lib/native-auth/test-helpers";

function refreshRequest(body: unknown) {
  return new Request("http://localhost/api/native/auth/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/native/auth/refresh", () => {
  // See login/route.test.ts for why this file resets the rate limiter
  // between tests — it calls the real, now-rate-limited POST handler.
  beforeEach(() => {
    __resetRateLimitStoreForTests();
  });

  test("rotates a valid refresh token and rejects it on replay", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    try {
      const initial = await issueTokenPair({ id: user.id, role: user.role });

      const res = await POST(refreshRequest({ refreshToken: initial.refreshToken }));
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.tokenType, "Bearer");
      assert.equal(typeof body.accessToken, "string");
      // The refresh token is what must change on rotation — the access
      // token is a deterministic encoding of (sub, role, iat, exp), so an
      // access token reissued for the same user within the same second is
      // legitimately byte-identical to the previous one. That's expected:
      // nothing requires access tokens to be unique per issuance, only
      // that they expire quickly and verify correctly.
      assert.notEqual(body.refreshToken, initial.refreshToken);

      // Replaying the original (now-rotated) refresh token must fail.
      const replay = await POST(refreshRequest({ refreshToken: initial.refreshToken }));
      assert.equal(replay.status, 401);
      const replayBody = await replay.json();
      assert.equal(replayBody.error, "Refresh token invalid or expired.");

      // The newly issued refresh token is itself usable.
      const followUp = await POST(refreshRequest({ refreshToken: body.refreshToken }));
      assert.equal(followUp.status, 200);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rejects an unknown refresh token", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const res = await POST(refreshRequest({ refreshToken: "not-a-real-refresh-token" }));
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Refresh token invalid or expired.");
  });

  test("rejects a revoked refresh token", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    try {
      const { rawToken, record } = await createRefreshTokenRecord(user.id);
      await prisma.nativeRefreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });

      const res = await POST(refreshRequest({ refreshToken: rawToken }));
      assert.equal(res.status, 401);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rejects an expired refresh token", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    try {
      const rawToken = "expired-token-for-test";
      await prisma.nativeRefreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashRefreshToken(rawToken),
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const res = await POST(refreshRequest({ refreshToken: rawToken }));
      assert.equal(res.status, 401);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rejects a refresh token whose owner is no longer active", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    try {
      const { rawToken } = await createRefreshTokenRecord(user.id);
      await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

      const res = await POST(refreshRequest({ refreshToken: rawToken }));
      assert.equal(res.status, 401);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rejects a malformed request body", async () => {
    const res = await POST(refreshRequest({}));
    assert.equal(res.status, 401);
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
