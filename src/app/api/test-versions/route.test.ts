import "dotenv/config";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { toPublicTestVersion } from "./route";
import type { TestVersion } from "@/generated/prisma/client";

function fakeTestVersion(overrides: Partial<TestVersion> = {}): TestVersion {
  return {
    id: "tv_1",
    slug: "2008",
    name: "2008 Civics Test",
    year: 2008,
    totalQuestions: 100,
    questionsAsked: 10,
    passThreshold: 6,
    isDefault: true,
    isActive: true,
    description: "The official test.",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("toPublicTestVersion", () => {
  test("returns exactly the documented public fields", () => {
    const result = toPublicTestVersion(fakeTestVersion());
    assert.deepEqual(Object.keys(result).sort(), ["description", "id", "isActive", "isDefault", "name", "slug"]);
  });

  test("never leaks administrative/internal fields", () => {
    const result = toPublicTestVersion(fakeTestVersion());
    const raw = JSON.stringify(result);
    assert.equal(raw.includes("passThreshold"), false);
    assert.equal(raw.includes("questionsAsked"), false);
    assert.equal(raw.includes("totalQuestions"), false);
    assert.equal("year" in result, false);
    assert.equal("createdAt" in result, false);
    assert.equal("updatedAt" in result, false);
  });

  test("preserves isActive/isDefault/description values verbatim", () => {
    const inactive = toPublicTestVersion(fakeTestVersion({ isActive: false, isDefault: false, description: null }));
    assert.equal(inactive.isActive, false);
    assert.equal(inactive.isDefault, false);
    assert.equal(inactive.description, null);
  });
});
