import "dotenv/config";
import { randomUUID } from "crypto";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { getQuestions, getQuestionById, getAllTestVersions } from "./questions";
import { deleteTestVersion } from "./roadmap-test-helpers";
import { createTestUser, deleteTestUser, isDatabaseReachable } from "./native-auth/test-helpers";

async function createTestVersion(overrides: Partial<{ isActive: boolean; year: number }> = {}) {
  return prisma.testVersion.create({
    data: {
      slug: `questions-test-${randomUUID()}`,
      name: "Questions Test Version",
      year: overrides.year ?? 2099,
      totalQuestions: 10,
      questionsAsked: 10,
      passThreshold: 6,
      isDefault: false,
      isActive: overrides.isActive ?? true,
    },
  });
}

async function createQuestion(
  testVersionId: string,
  number: number,
  overrides: Partial<{
    category: "AMERICAN_GOVERNMENT" | "AMERICAN_HISTORY" | "INTEGRATED_CIVICS";
    question: string;
    isActive: boolean;
    isSpecial65_20: boolean;
    explanation: string;
  }> = {}
) {
  return prisma.question.create({
    data: {
      testVersionId,
      number,
      category: overrides.category ?? "AMERICAN_GOVERNMENT",
      subcategory: "Test",
      question: overrides.question ?? `Test question ${number}?`,
      explanation: overrides.explanation ?? `Explanation ${number}.`,
      isActive: overrides.isActive ?? true,
      isSpecial65_20: overrides.isSpecial65_20 ?? false,
      answers: { create: [{ text: `Answer ${number}`, sortOrder: 0 }] },
    },
  });
}

describe("getQuestions", () => {
  test("excludes inactive questions", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await createTestVersion();
    try {
      await createQuestion(testVersion.id, 1, { isActive: true });
      await createQuestion(testVersion.id, 2, { isActive: false });

      const results = await getQuestions({ testVersionId: testVersion.id });
      assert.equal(results.length, 1);
      assert.equal(results[0]!.number, 1);
    } finally {
      await deleteTestVersion(testVersion.id);
    }
  });

  test("filters by category", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await createTestVersion();
    try {
      await createQuestion(testVersion.id, 1, { category: "AMERICAN_GOVERNMENT" });
      await createQuestion(testVersion.id, 2, { category: "AMERICAN_HISTORY" });

      const results = await getQuestions({ testVersionId: testVersion.id, category: "AMERICAN_HISTORY" });
      assert.equal(results.length, 1);
      assert.equal(results[0]!.number, 2);
    } finally {
      await deleteTestVersion(testVersion.id);
    }
  });

  test("filters by a search substring", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await createTestVersion();
    try {
      await createQuestion(testVersion.id, 1, { question: "What is the supreme law of the land?" });
      await createQuestion(testVersion.id, 2, { question: "Who was the first President?" });

      const results = await getQuestions({ testVersionId: testVersion.id, search: "supreme law" });
      assert.equal(results.length, 1);
      assert.equal(results[0]!.number, 1);
    } finally {
      await deleteTestVersion(testVersion.id);
    }
  });

  test("filters by favoritesOnly, scoped to the requesting user", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await createTestVersion();
    const { user } = await createTestUser();
    try {
      const q1 = await createQuestion(testVersion.id, 1);
      await createQuestion(testVersion.id, 2);
      await prisma.userQuestionProgress.create({ data: { userId: user.id, questionId: q1.id, isFavorite: true } });

      const results = await getQuestions({ testVersionId: testVersion.id, favoritesOnly: true, userId: user.id });
      assert.equal(results.length, 1);
      assert.equal(results[0]!.id, q1.id);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("filters by special6520Only", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await createTestVersion();
    try {
      await createQuestion(testVersion.id, 1, { isSpecial65_20: true });
      await createQuestion(testVersion.id, 2, { isSpecial65_20: false });

      const results = await getQuestions({ testVersionId: testVersion.id, special6520Only: true });
      assert.equal(results.length, 1);
      assert.equal(results[0]!.number, 1);
    } finally {
      await deleteTestVersion(testVersion.id);
    }
  });

  test("response shape: exactly the list DTO, no internal/administrative fields", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await createTestVersion();
    const { user } = await createTestUser();
    try {
      await createQuestion(testVersion.id, 1);
      const [result] = await getQuestions({ testVersionId: testVersion.id, userId: user.id });

      const keys = Object.keys(result!).sort();
      assert.deepEqual(keys, [
        "answers",
        "category",
        "id",
        "isDynamicAnswer",
        "isSpecial65_20",
        "number",
        "progress",
        "question",
        "subcategory",
        "tags",
        "variesByLocation",
      ]);
      assert.equal("testVersionId" in result!, false);
      assert.equal("createdAt" in result!, false);
      assert.equal("updatedAt" in result!, false);
      assert.equal("explanation" in result!, false);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});

describe("getQuestionById", () => {
  test("returns full detail for an active question, scoped progress included", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await createTestVersion();
    const { user } = await createTestUser();
    try {
      const question = await createQuestion(testVersion.id, 1, { explanation: "Because the Constitution says so." });

      const result = await getQuestionById(question.id, user.id);
      assert.ok(result);
      assert.equal(result!.id, question.id);
      assert.equal(result!.explanation, "Because the Constitution says so.");
      assert.equal(result!.answers.length, 1);
    } finally {
      await deleteTestUser(user.id);
      await deleteTestVersion(testVersion.id);
    }
  });

  test("returns an inactive question too — the caller (route) is responsible for the isActive check", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const testVersion = await createTestVersion();
    try {
      const question = await createQuestion(testVersion.id, 1, { isActive: false });

      const result = await getQuestionById(question.id);
      assert.ok(result);
      assert.equal(result!.isActive, false);
    } finally {
      await deleteTestVersion(testVersion.id);
    }
  });

  test("returns null for a nonexistent id", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    assert.equal(await getQuestionById("does-not-exist"), null);
  });

  after(async () => {
    await prisma.$disconnect();
  });
});

describe("getAllTestVersions", () => {
  test("excludes inactive versions and orders by year ascending", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const older = await createTestVersion({ year: 2010 });
    const newer = await createTestVersion({ year: 2020 });
    const inactive = await createTestVersion({ year: 2015, isActive: false });
    try {
      const results = await getAllTestVersions();
      const ids = results.map((tv) => tv.id);

      assert.equal(ids.includes(inactive.id), false);
      const olderIndex = ids.indexOf(older.id);
      const newerIndex = ids.indexOf(newer.id);
      assert.ok(olderIndex !== -1 && newerIndex !== -1);
      assert.ok(olderIndex < newerIndex, "2010 must sort before 2020");
    } finally {
      await deleteTestVersion(older.id);
      await deleteTestVersion(newer.id);
      await deleteTestVersion(inactive.id);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });
});

// Exercises the real, live-seeded "2025" TestVersion (the official USCIS
// 2025 civics test) through the SAME generic code paths above — proves
// no endpoint/lib change was needed to expose it (Phase 9 content plan
// §5), using the actual dataset rather than a synthetic fixture.
describe("2025 TestVersion (real seeded data)", () => {
  test("is included in getAllTestVersions with the expected public shape", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const versions = await getAllTestVersions();
    const version2025 = versions.find((v) => v.slug === "2025");
    assert.ok(version2025, "the 2025 TestVersion must exist and be active");
    assert.equal(version2025!.totalQuestions, 128);
    assert.equal(version2025!.questionsAsked, 20);
    assert.equal(version2025!.passThreshold, 12);
    assert.equal(version2025!.isDefault, false);
  });

  test("getQuestions returns exactly 128 active questions for the 2025 TestVersion — dynamic, not hardcoded", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const version2025 = await prisma.testVersion.findUniqueOrThrow({ where: { slug: "2025" } });
    const results = await getQuestions({ testVersionId: version2025.id });
    assert.equal(results.length, version2025.totalQuestions, "returned count must match the TestVersion's own totalQuestions, not a hardcoded number");
    assert.equal(results.length, 128);
  });

  test("getQuestionById returns the transcribed official text for a known question, with the dynamic answer resolved", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");
    const version2025 = await prisma.testVersion.findUniqueOrThrow({ where: { slug: "2025" } });
    const q38 = await prisma.question.findUniqueOrThrow({
      where: { testVersionId_number: { testVersionId: version2025.id, number: 38 } },
    });

    const result = await getQuestionById(q38.id);
    assert.ok(result);
    assert.equal(result!.question, "What is the name of the President of the United States now?");
    assert.equal(result!.isDynamicAnswer, true);
    assert.ok(result!.answers.length > 0);
    // Primary answer must come from the DynamicOfficial table, not a
    // value baked directly into questions-2025.json's transcription.
    const official = await prisma.dynamicOfficial.findUniqueOrThrow({ where: { key: "PRESIDENT" } });
    assert.equal(result!.answers[0]!.text, official.currentValue);
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
