import "dotenv/config";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { getContentVersion, computeVersionHash } from "./content-version";
import { isDatabaseReachable } from "./native-auth/test-helpers";

describe("computeVersionHash (pure)", () => {
  test("never throws for an empty array — the unseeded-database fallback", () => {
    const hash = computeVersionHash([]);
    assert.equal(typeof hash, "string");
    assert.match(hash, /^[0-9a-f]{16}$/);
  });

  test("is deterministic for the same input", () => {
    const date = new Date("2026-01-01T00:00:00Z");
    assert.equal(computeVersionHash([date]), computeVersionHash([date]));
  });

  test("only depends on the maximum timestamp, not the order or count of inputs", () => {
    const a = new Date("2026-01-01T00:00:00Z");
    const b = new Date("2026-06-01T00:00:00Z");
    assert.equal(computeVersionHash([a, b]), computeVersionHash([b, a]));
    assert.equal(computeVersionHash([b]), computeVersionHash([a, b]));
  });

  test("changes when the maximum timestamp changes", () => {
    const a = new Date("2026-01-01T00:00:00Z");
    const b = new Date("2026-06-01T00:00:00Z");
    assert.notEqual(computeVersionHash([a]), computeVersionHash([b]));
  });

  test("never exposes a raw timestamp — output is opaque hex, not parseable as a date", () => {
    const hash = computeVersionHash([new Date("2026-01-01T00:00:00Z")]);
    assert.equal(Number.isNaN(Date.parse(hash)), true);
  });
});

describe("getContentVersion", () => {
  test("is stable across repeated calls when nothing has changed", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const first = await getContentVersion();
    const second = await getContentVersion();
    assert.equal(first, second);
  });

  test("changes after a content row is updated", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const question = await prisma.question.findFirstOrThrow({ select: { id: true, subcategory: true } });

    const before = await getContentVersion();
    // Touch the row without changing its meaning — bumps `updatedAt`,
    // which is exactly what should move the version signal.
    await prisma.question.update({ where: { id: question.id }, data: { subcategory: question.subcategory } });
    const after = await getContentVersion();

    assert.notEqual(before, after);
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
