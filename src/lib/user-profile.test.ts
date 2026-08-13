import "dotenv/config";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { getPublicUser } from "./user-profile";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "./native-auth/test-helpers";

describe("getPublicUser", () => {
  test("returns exactly the established public shape", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user } = await createTestUser();
    try {
      const result = await getPublicUser(user.id);
      assert.ok(result);
      assert.deepEqual(Object.keys(result!).sort(), ["email", "id", "image", "name", "role"]);
      assert.equal(result!.id, user.id);
      assert.equal(result!.email, user.email);
      assert.equal(result!.role, "USER");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("never includes passwordHash or any other sensitive/internal field", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const { user } = await createTestUser();
    try {
      const result = await getPublicUser(user.id);
      const raw = JSON.stringify(result);
      assert.equal(raw.includes("passwordHash"), false);
      assert.equal("passwordHash" in (result as object), false);
      assert.equal("isActive" in (result as object), false);
      assert.equal("activeTestVersionId" in (result as object), false);
      assert.equal("emailVerified" in (result as object), false);
      assert.equal("createdAt" in (result as object), false);
      assert.equal("updatedAt" in (result as object), false);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("returns null for a nonexistent user", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    assert.equal(await getPublicUser("does-not-exist"), null);
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
