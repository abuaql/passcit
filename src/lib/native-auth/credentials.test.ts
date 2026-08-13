import "dotenv/config";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { verifyCredentials } from "./credentials";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "./test-helpers";

describe("credentials", () => {
  let dbReady = false;

  before(async () => {
    dbReady = await isDatabaseReachable();
  });

  test("accepts the correct email/password", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user, password } = await createTestUser();
    try {
      const result = await verifyCredentials(user.email, password);
      assert.ok(result);
      assert.equal(result.id, user.id);
      assert.equal(result.email, user.email);
      assert.equal(result.role, "USER");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rejects a wrong password", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    try {
      assert.equal(await verifyCredentials(user.email, "definitely-wrong"), null);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rejects an email that doesn't exist", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");
    assert.equal(await verifyCredentials("no-such-user@example.test", "whatever123"), null);
  });

  test("rejects a disabled account even with the correct password", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user, password } = await createTestUser({ isActive: false });
    try {
      assert.equal(await verifyCredentials(user.email, password), null);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rejects an OAuth-only account (no password hash)", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser({ withPassword: false });
    try {
      assert.equal(await verifyCredentials(user.email, "anything"), null);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
