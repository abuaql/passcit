import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { isDatabaseReachable } from "./native-auth/test-helpers";

const execFileAsync = promisify(execFile);

// Operational proof, mirroring seed-2025-scope.test.ts's proof for the
// question bank: seeding the 2025 roadmap must never touch 2008's
// Unit/Lesson/LessonQuestion/UnitExam rows. Runs the REAL seed script
// (prisma/seed-roadmap.ts, scoped via its CLI slug filter), not a
// reimplementation, and asserts 2008's roadmap rows are byte-identical
// before and after.
async function snapshotRoadmap(slug: string) {
  const units = await prisma.unit.findMany({
    where: { testVersion: { slug } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      order: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      lessons: {
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          order: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lessonQuestions: { select: { id: true, questionId: true, order: true }, orderBy: { order: "asc" } },
        },
        orderBy: { order: "asc" },
      },
      exam: {
        select: {
          id: true,
          questionCount: true,
          passThreshold: true,
          createdAt: true,
          updatedAt: true,
          examQuestions: { select: { id: true, questionId: true }, orderBy: { questionId: "asc" } },
        },
      },
    },
    orderBy: { order: "asc" },
  });
  return JSON.stringify(units);
}

describe("2025 roadmap seed scoping", () => {
  test("running the roadmap seed script scoped to \"2025\" leaves 2008's roadmap rows byte-identical", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const before = await snapshotRoadmap("2008");

    await execFileAsync("npx", ["tsx", "prisma/seed-roadmap.ts", "2025"], {
      cwd: process.cwd(),
      timeout: 60_000,
    });

    const after = await snapshotRoadmap("2008");
    assert.equal(after, before, "2008's Unit/Lesson/LessonQuestion/UnitExam rows must be byte-identical after a 2025-scoped roadmap seed run");
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
