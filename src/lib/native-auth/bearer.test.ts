/**
 * Covers "bearer authentication through requireUser()" at the layer that
 * can actually be exercised outside Next.js's request machinery.
 * requireUser() itself (src/lib/require-admin.ts) calls Next's
 * `headers()`/`auth()`, both of which throw when invoked outside a real
 * request scope ("headers was called outside a request scope") — so it
 * cannot be unit-tested directly without a Next.js test harness this
 * project doesn't have. resolveBearerUser() is the pure, DB-touching but
 * request-context-free logic requireUser() delegates to for its bearer
 * fallback; testing it here covers the actual verification/resolution
 * behavior. requireUser() itself is a thin, directly-inspectable
 * orchestrator on top of this function plus Auth.js's own auth().
 */
import "dotenv/config";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { resolveBearerUser } from "./bearer";
import { createAccessToken } from "./access-token";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "./test-helpers";

describe("bearer", () => {
  let dbReady = false;

  before(async () => {
    dbReady = await isDatabaseReachable();
  });

  test("resolves an active user from a valid bearer token", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    try {
      const { token } = createAccessToken({ id: user.id, role: user.role });
      const resolved = await resolveBearerUser(`Bearer ${token}`);
      assert.deepEqual(resolved, { id: user.id, role: "USER" });
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rejects a token for a since-deactivated user", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    try {
      const { token } = createAccessToken({ id: user.id, role: user.role });
      await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

      assert.equal(await resolveBearerUser(`Bearer ${token}`), null);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rejects a token for a user that no longer exists", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { token } = createAccessToken({ id: "does-not-exist", role: "USER" });
    assert.equal(await resolveBearerUser(`Bearer ${token}`), null);
  });

  test("rejects headers missing the Bearer prefix", async () => {
    assert.equal(await resolveBearerUser("Basic sometoken"), null);
    assert.equal(await resolveBearerUser("sometoken"), null);
  });

  test("rejects a null/absent header", async () => {
    assert.equal(await resolveBearerUser(null), null);
    assert.equal(await resolveBearerUser(undefined), null);
    assert.equal(await resolveBearerUser("Bearer "), null);
  });

  test("rejects an invalid/garbage token", async () => {
    assert.equal(await resolveBearerUser("Bearer not-a-real-jwt"), null);
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
