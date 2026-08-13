import "dotenv/config";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import {
  generateRefreshToken,
  hashRefreshToken,
  isRefreshTokenRecordValid,
  isEligibleOwner,
  createRefreshTokenRecord,
  findRefreshTokenWithOwner,
  rotateRefreshTokenRecord,
  revokeRefreshTokenForUser,
  revokeAllRefreshTokensForUser,
} from "./refresh-token";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "./test-helpers";

describe("refresh-token: pure logic", () => {
  test("generateRefreshToken produces long, distinct opaque strings", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    assert.notEqual(a, b);
    assert.ok(a.length >= 40);
  });

  test("hashRefreshToken is deterministic and one-way-looking", () => {
    const raw = generateRefreshToken();
    const hash1 = hashRefreshToken(raw);
    const hash2 = hashRefreshToken(raw);
    assert.equal(hash1, hash2);
    assert.notEqual(hash1, raw);
    assert.match(hash1, /^[0-9a-f]{64}$/); // sha256 hex digest
  });

  test("isRefreshTokenRecordValid", () => {
    const future = new Date(Date.now() + 1000);
    const past = new Date(Date.now() - 1000);
    assert.equal(isRefreshTokenRecordValid({ revokedAt: null, expiresAt: future }), true);
    assert.equal(isRefreshTokenRecordValid({ revokedAt: new Date(), expiresAt: future }), false);
    assert.equal(isRefreshTokenRecordValid({ revokedAt: null, expiresAt: past }), false);
    assert.equal(isRefreshTokenRecordValid({ revokedAt: new Date(), expiresAt: past }), false);
  });

  test("isEligibleOwner", () => {
    assert.equal(isEligibleOwner(null), false);
    assert.equal(isEligibleOwner(undefined), false);
    assert.equal(isEligibleOwner({ id: "u1", role: "USER", isActive: false }), false);
    assert.equal(isEligibleOwner({ id: "u1", role: "USER", isActive: true }), true);
  });
});

describe("refresh-token: persistence", () => {
  let dbReady = false;

  before(async () => {
    dbReady = await isDatabaseReachable();
  });

  test("createRefreshTokenRecord persists only the hash, never the raw token", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    try {
      const { rawToken, record } = await createRefreshTokenRecord(user.id);
      assert.equal(record.tokenHash, hashRefreshToken(rawToken));
      assert.notEqual(record.tokenHash, rawToken);

      const row = await prisma.nativeRefreshToken.findUniqueOrThrow({ where: { id: record.id } });
      assert.equal(JSON.stringify(row).includes(rawToken), false);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("findRefreshTokenWithOwner resolves the record and owner by raw token", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    try {
      const { rawToken } = await createRefreshTokenRecord(user.id);
      const found = await findRefreshTokenWithOwner(rawToken);
      assert.ok(found);
      assert.equal(found.owner?.id, user.id);
      assert.equal(found.record.userId, user.id);

      assert.equal(await findRefreshTokenWithOwner("not-a-real-token"), null);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("rotateRefreshTokenRecord revokes the old token and prevents replay", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    try {
      const { rawToken, record } = await createRefreshTokenRecord(user.id);

      const rotated = await rotateRefreshTokenRecord(record);
      assert.ok(rotated);
      assert.notEqual(rotated.rawToken, rawToken);

      // The old raw token must no longer be usable (replay prevention).
      const oldLookup = await findRefreshTokenWithOwner(rawToken);
      assert.ok(oldLookup);
      assert.equal(isRefreshTokenRecordValid(oldLookup.record), false);

      // The new token is fresh and valid.
      const newLookup = await findRefreshTokenWithOwner(rotated.rawToken);
      assert.ok(newLookup);
      assert.equal(isRefreshTokenRecordValid(newLookup.record), true);

      // Rotating the same (stale, in-memory) record a second time must
      // fail — the DB row is already revoked, so the conditional
      // updateMany matches zero rows. This is what makes concurrent
      // double-rotation of one token impossible.
      const secondRotation = await rotateRefreshTokenRecord(record);
      assert.equal(secondRotation, null);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("revokeRefreshTokenForUser only revokes the caller's own token, and is idempotent", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user: owner } = await createTestUser();
    const { user: otherUser } = await createTestUser();
    try {
      const { rawToken } = await createRefreshTokenRecord(owner.id);

      // A different user cannot revoke someone else's token.
      await revokeRefreshTokenForUser(rawToken, otherUser.id);
      let lookup = await findRefreshTokenWithOwner(rawToken);
      assert.equal(isRefreshTokenRecordValid(lookup!.record), true);

      // The owner can.
      await revokeRefreshTokenForUser(rawToken, owner.id);
      lookup = await findRefreshTokenWithOwner(rawToken);
      assert.equal(isRefreshTokenRecordValid(lookup!.record), false);

      // Calling it again (already revoked) must not throw.
      await assert.doesNotReject(revokeRefreshTokenForUser(rawToken, owner.id));
    } finally {
      await deleteTestUser(owner.id);
      await deleteTestUser(otherUser.id);
    }
  });

  test("revokeAllRefreshTokensForUser revokes only that user's active tokens", async (t) => {
    if (!dbReady) return t.skip("no database reachable in this environment");

    const { user } = await createTestUser();
    const { user: otherUser } = await createTestUser();
    try {
      const first = await createRefreshTokenRecord(user.id);
      const second = await createRefreshTokenRecord(user.id);
      const untouched = await createRefreshTokenRecord(otherUser.id);

      const revokedCount = await revokeAllRefreshTokensForUser(user.id);
      assert.equal(revokedCount, 2);

      const firstLookup = await findRefreshTokenWithOwner(first.rawToken);
      const secondLookup = await findRefreshTokenWithOwner(second.rawToken);
      const otherLookup = await findRefreshTokenWithOwner(untouched.rawToken);

      assert.equal(isRefreshTokenRecordValid(firstLookup!.record), false);
      assert.equal(isRefreshTokenRecordValid(secondLookup!.record), false);
      assert.equal(isRefreshTokenRecordValid(otherLookup!.record), true);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestUser(otherUser.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
