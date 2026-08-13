import "dotenv/config";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { seedDynamicOfficials, resolveAnswers } from "./dynamic-officials";
import { isDatabaseReachable } from "./native-auth/test-helpers";

type Key = "PRESIDENT" | "VICE_PRESIDENT" | "SPEAKER_OF_THE_HOUSE" | "CHIEF_JUSTICE";

// These tests exercise real DynamicOfficial keys (the enum has exactly
// 4 values, all meaningful production data — there's no synthetic 5th
// key to test against instead). Every test that mutates a key snapshots
// whatever was there first and restores it afterward, rather than
// deleting it — this table is shared, real seed data other suites
// (e.g. questions.test.ts's 2025 dynamic-answer test) also depend on.
async function withRestoredKey<T>(key: Key, fn: () => Promise<T>): Promise<T> {
  const original = await prisma.dynamicOfficial.findUnique({ where: { key } });
  try {
    return await fn();
  } finally {
    if (original) {
      // upsert, not update — the test body may have deleted the row
      // entirely (not just modified it), so there may be nothing to
      // update back onto.
      await prisma.dynamicOfficial.upsert({
        where: { key },
        update: {
          currentValue: original.currentValue,
          sourceUrl: original.sourceUrl,
          lastVerifiedAt: original.lastVerifiedAt,
        },
        create: original,
      });
    } else {
      await prisma.dynamicOfficial.deleteMany({ where: { key } });
    }
  }
}

describe("seedDynamicOfficials", () => {
  test("creates a row on first run, updates it on a later run with a new value", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    await withRestoredKey("PRESIDENT", async () => {
      await seedDynamicOfficials([
        { key: "PRESIDENT", currentValue: "Test Name One", sourceUrl: "https://example.test/a", lastVerifiedAt: new Date("2026-01-01") },
      ]);
      const first = await prisma.dynamicOfficial.findUniqueOrThrow({ where: { key: "PRESIDENT" } });
      assert.equal(first.currentValue, "Test Name One");

      await seedDynamicOfficials([
        { key: "PRESIDENT", currentValue: "Test Name Two", sourceUrl: "https://example.test/b", lastVerifiedAt: new Date("2026-02-01") },
      ]);
      const second = await prisma.dynamicOfficial.findUniqueOrThrow({ where: { key: "PRESIDENT" } });
      assert.equal(second.currentValue, "Test Name Two");
      assert.equal(second.sourceUrl, "https://example.test/b");
      // Same row updated in place, not a duplicate — the whole point of
      // the unique key.
      assert.equal(second.id, first.id);
    });
  });

  after(async () => {
    await prisma.$disconnect();
  });
});

describe("resolveAnswers", () => {
  test("returns the declared answers unchanged when no dynamicOfficialKey is given", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const result = await resolveAnswers(["Constitution", "U.S. Constitution"], undefined);
    assert.deepEqual(result, ["Constitution", "U.S. Constitution"]);
  });

  test("puts the current DynamicOfficial value first, keeping other declared answers as alternates", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    await withRestoredKey("CHIEF_JUSTICE", async () => {
      await seedDynamicOfficials([
        { key: "CHIEF_JUSTICE", currentValue: "Jane Test Roberts", sourceUrl: "https://example.test", lastVerifiedAt: new Date() },
      ]);

      const result = await resolveAnswers(["John Roberts", "John G. Roberts, Jr."], "CHIEF_JUSTICE");
      assert.deepEqual(result, ["Jane Test Roberts", "John Roberts", "John G. Roberts, Jr."]);
    });
  });

  test("does not duplicate the current value if it was already among the declared answers", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    await withRestoredKey("SPEAKER_OF_THE_HOUSE", async () => {
      await seedDynamicOfficials([
        { key: "SPEAKER_OF_THE_HOUSE", currentValue: "Mike Johnson", sourceUrl: "https://example.test", lastVerifiedAt: new Date() },
      ]);

      const result = await resolveAnswers(["Mike Johnson", "Johnson"], "SPEAKER_OF_THE_HOUSE");
      assert.deepEqual(result, ["Mike Johnson", "Johnson"]);
    });
  });

  test("falls back to the declared answers if no DynamicOfficial row exists for the key", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    await withRestoredKey("VICE_PRESIDENT", async () => {
      await prisma.dynamicOfficial.deleteMany({ where: { key: "VICE_PRESIDENT" } });
      const result = await resolveAnswers(["Some Name"], "VICE_PRESIDENT");
      assert.deepEqual(result, ["Some Name"]);
    });
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
