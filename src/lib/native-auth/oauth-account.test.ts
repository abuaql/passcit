import "dotenv/config";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { resolveOAuthAccount } from "./oauth-account";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "./test-helpers";

function newSub(): string {
  return `sub-${randomUUID()}`;
}

describe("resolveOAuthAccount", () => {
  let dbReady = false;

  before(async () => {
    dbReady = await isDatabaseReachable();
  });

  test("Step A: resolves an existing Account's user without creating anything new", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    const providerAccountId = newSub();
    try {
      await prisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "apple", providerAccountId },
      });

      const result = await resolveOAuthAccount({
        provider: "apple",
        providerAccountId,
        email: user.email,
        emailVerified: true,
      });

      assert.equal(result.status, "ok");
      if (result.status !== "ok") return;
      assert.equal(result.user.id, user.id);
      assert.equal(result.isNewUser, false);
      assert.deepEqual(Object.keys(result.user).sort(), ["email", "id", "image", "name", "role"]);

      const accountCount = await prisma.account.count({ where: { userId: user.id } });
      assert.equal(accountCount, 1);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("Step A: rejects when the account's owner is inactive", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser({ isActive: false });
    const providerAccountId = newSub();
    try {
      await prisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "google", providerAccountId },
      });

      const result = await resolveOAuthAccount({
        provider: "google",
        providerAccountId,
        email: user.email,
        emailVerified: true,
      });

      assert.equal(result.status, "error");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("Step A takes priority even when a different (verified) email is presented", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user: accountOwner } = await createTestUser();
    const { user: emailOwner } = await createTestUser();
    const providerAccountId = newSub();
    try {
      await prisma.account.create({
        data: { userId: accountOwner.id, type: "apple", provider: "apple", providerAccountId },
      });

      // Someone else's email is presented alongside an identity already
      // linked to accountOwner — the identity must win; emailOwner must
      // never be touched or returned.
      const result = await resolveOAuthAccount({
        provider: "apple",
        providerAccountId,
        email: emailOwner.email,
        emailVerified: true,
      });

      assert.equal(result.status, "ok");
      if (result.status !== "ok") return;
      assert.equal(result.user.id, accountOwner.id);
      assert.equal(result.isNewUser, false);

      const emailOwnerAccounts = await prisma.account.count({ where: { userId: emailOwner.id } });
      assert.equal(emailOwnerAccounts, 0);
    } finally {
      await deleteTestUser(accountOwner.id);
      await deleteTestUser(emailOwner.id);
    }
  });

  test("Step B: links a new Account to an existing user matched by verified email, without duplicating the user", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    const providerAccountId = newSub();
    try {
      const result = await resolveOAuthAccount({
        provider: "google",
        providerAccountId,
        email: user.email.toUpperCase(), // normalization check
        emailVerified: true,
      });

      assert.equal(result.status, "ok");
      if (result.status !== "ok") return;
      assert.equal(result.user.id, user.id);
      assert.equal(result.isNewUser, false);

      const userCount = await prisma.user.count({ where: { email: user.email } });
      assert.equal(userCount, 1);

      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider: "google", providerAccountId } },
      });
      assert.equal(account?.userId, user.id);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("Step B: rejects when the matched-by-email user is inactive", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser({ isActive: false });
    const providerAccountId = newSub();
    try {
      const result = await resolveOAuthAccount({
        provider: "google",
        providerAccountId,
        email: user.email,
        emailVerified: true,
      });

      assert.equal(result.status, "error");
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider: "google", providerAccountId } },
      });
      assert.equal(account, null);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("Step C: creates a new User + Account when nothing matches, using the supplied name", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const email = `native-auth-test-${randomUUID()}@example.test`;
    const providerAccountId = newSub();
    try {
      const result = await resolveOAuthAccount({
        provider: "apple",
        providerAccountId,
        email,
        emailVerified: true,
        name: "Ada Lovelace",
      });

      assert.equal(result.status, "ok");
      if (result.status !== "ok") return;
      assert.equal(result.isNewUser, true);
      assert.equal(result.user.email, email);
      assert.equal(result.user.name, "Ada Lovelace");
      assert.equal(result.user.role, "USER");

      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      assert.equal(user.passwordHash, null);
      assert.equal(user.isActive, true);

      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider: "apple", providerAccountId } },
      });
      assert.equal(account?.userId, user.id);
    } finally {
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  test("rejects when no email is present at all", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const result = await resolveOAuthAccount({
      provider: "apple",
      providerAccountId: newSub(),
      email: null,
      emailVerified: false,
    });
    assert.equal(result.status, "error");
  });

  test("rejects when the email is present but not verified — never links, never creates", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    const email = `native-auth-test-${randomUUID()}@example.test`;
    try {
      // Would-be link target exists...
      const linkAttempt = await resolveOAuthAccount({
        provider: "google",
        providerAccountId: newSub(),
        email: user.email,
        emailVerified: false,
      });
      assert.equal(linkAttempt.status, "error");
      assert.equal(await prisma.account.count({ where: { userId: user.id } }), 0);

      // ...and would-be new-user creation also must not happen.
      const createAttempt = await resolveOAuthAccount({
        provider: "google",
        providerAccountId: newSub(),
        email,
        emailVerified: false,
      });
      assert.equal(createAttempt.status, "error");
      assert.equal(await prisma.user.count({ where: { email } }), 0);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("a genuine concurrent claim on the same brand-new identity never double-creates", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    // Real concurrency, not simulated: two calls for the exact same new
    // identity fired at once. Whichever wins, the DB must end up with
    // exactly one User and one Account for it — either because Step A's
    // atomic unique constraint on Account(provider, providerAccountId)
    // rejects the loser's create (the P2002 catch in oauth-account.ts),
    // or because one request's Step A read already sees the other's
    // committed write. Both outcomes are correct; only duplication is not.
    const providerAccountId = newSub();
    const raceEmail = `native-auth-test-${randomUUID()}@example.test`;
    const params = { provider: "apple" as const, providerAccountId, email: raceEmail, emailVerified: true };

    try {
      const [first, second] = await Promise.all([resolveOAuthAccount(params), resolveOAuthAccount(params)]);
      const results = [first, second];
      const succeeded = results.filter((r) => r.status === "ok");

      assert.ok(succeeded.length >= 1, "at least one concurrent call must succeed");
      if (succeeded.length === 2) {
        // Both can legitimately succeed (one created, one linked-via-
        // Step-A) as long as they agree on the same single user.
        assert.equal((succeeded[0] as { user: { id: string } }).user.id, (succeeded[1] as { user: { id: string } }).user.id);
      }

      const userCount = await prisma.user.count({ where: { email: raceEmail } });
      assert.equal(userCount, 1);
      const accountCount = await prisma.account.count({
        where: { provider: "apple", providerAccountId },
      });
      assert.equal(accountCount, 1);
    } finally {
      await prisma.user.deleteMany({ where: { email: raceEmail } });
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
