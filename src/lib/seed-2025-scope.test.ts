import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { isDatabaseReachable } from "./native-auth/test-helpers";

const execFileAsync = promisify(execFile);

// Operational proof for the Phase 9 requirement that seeding the new
// 2025 TestVersion never touches 2008/2020 — runs the REAL seed script
// (scoped via its CLI slug filter), not a reimplementation, and asserts
// the existing versions' rows are byte-identical before and after.
// This deliberately exercises the actual production code path rather
// than inferring "unchanged" from the script being idempotent.
async function snapshotQuestions(slugs: string[]) {
  const rows = await prisma.question.findMany({
    where: { testVersion: { slug: { in: slugs } } },
    select: {
      id: true,
      number: true,
      category: true,
      subcategory: true,
      question: true,
      explanation: true,
      requiredAnswerCount: true,
      isSpecial65_20: true,
      isDynamicAnswer: true,
      dynamicNote: true,
      variesByLocation: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      answers: {
        select: { id: true, text: true, sortOrder: true, createdAt: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ testVersionId: "asc" }, { number: "asc" }],
  });
  return JSON.stringify(rows);
}

describe("2025 seed scoping", () => {
  test("running the seed script scoped to \"2025\" leaves 2008/2020 rows byte-identical", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const before = await snapshotQuestions(["2008", "2020"]);

    await execFileAsync("npx", ["tsx", "prisma/seed.ts", "2025"], {
      cwd: process.cwd(),
      timeout: 60_000,
    });

    const after = await snapshotQuestions(["2008", "2020"]);
    assert.equal(after, before, "2008/2020 Question/QuestionAnswer rows must be byte-identical after a 2025-scoped seed run");
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
