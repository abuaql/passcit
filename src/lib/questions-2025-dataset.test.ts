import "dotenv/config";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import questions2025 from "../../prisma/data/questions-2025.json";

// Structural/traceability integrity checks for the transcribed USCIS
// 2025 (128-question) civics test dataset. These assert facts the
// official source document itself states (128 questions, 20 starred
// 65/20 questions) — not arbitrary numbers — so a future edit that
// breaks the dataset's shape fails loudly here rather than silently
// reaching the app.
interface SeedQuestion {
  number: number;
  category: "AMERICAN_GOVERNMENT" | "AMERICAN_HISTORY" | "INTEGRATED_CIVICS" | "SYMBOLS_AND_HOLIDAYS";
  subcategory: string;
  question: string;
  answers: string[];
  explanation?: string;
  isSpecial65_20?: boolean;
  isDynamicAnswer?: boolean;
  dynamicOfficialKey?: "PRESIDENT" | "VICE_PRESIDENT" | "SPEAKER_OF_THE_HOUSE" | "CHIEF_JUSTICE";
  dynamicNote?: string;
  variesByLocation?: boolean;
  requiredAnswerCount?: number;
}

const questions = questions2025 as SeedQuestion[];

describe("questions-2025.json (official USCIS 2025 civics test)", () => {
  test("contains exactly 128 questions", () => {
    assert.equal(questions.length, 128);
  });

  test("numbers 1-128 are unique and sequential — matches official USCIS numbering", () => {
    const numbers = questions.map((q) => q.number).sort((a, b) => a - b);
    assert.deepEqual(numbers, Array.from({ length: 128 }, (_, i) => i + 1));
  });

  test("exactly 20 questions are marked isSpecial65_20 — matches USCIS's stated 65/20 total", () => {
    const starred = questions.filter((q) => q.isSpecial65_20).map((q) => q.number);
    assert.equal(starred.length, 20);
    // Exact set, transcribed directly from the PDF's asterisk marks —
    // verifies the RIGHT 20 questions are starred, not just the count.
    assert.deepEqual(
      starred,
      [2, 7, 12, 20, 30, 36, 38, 39, 44, 52, 61, 66, 74, 78, 86, 94, 113, 115, 121, 126]
    );
  });

  test("exactly the 4 official dynamic-answer questions are marked, each with a dynamicOfficialKey", () => {
    const dynamic = questions.filter((q) => q.isDynamicAnswer);
    assert.equal(dynamic.length, 4);
    assert.deepEqual(
      dynamic.map((q) => [q.number, q.dynamicOfficialKey]),
      [
        [30, "SPEAKER_OF_THE_HOUSE"],
        [38, "PRESIDENT"],
        [39, "VICE_PRESIDENT"],
        [57, "CHIEF_JUSTICE"],
      ]
    );
  });

  test("no non-dynamic question carries a dynamicOfficialKey", () => {
    const mismatched = questions.filter((q) => q.dynamicOfficialKey && !q.isDynamicAnswer);
    assert.deepEqual(mismatched, []);
  });

  test("exactly the 4 official location-varying questions are marked", () => {
    const varies = questions.filter((q) => q.variesByLocation).map((q) => q.number);
    assert.deepEqual(varies, [23, 29, 61, 62]);
  });

  test("every category is a valid enum value, and SYMBOLS_AND_HOLIDAYS is used only for questions 119-128", () => {
    const validCategories = new Set(["AMERICAN_GOVERNMENT", "AMERICAN_HISTORY", "INTEGRATED_CIVICS", "SYMBOLS_AND_HOLIDAYS"]);
    for (const q of questions) {
      assert.ok(validCategories.has(q.category), `question ${q.number} has invalid category "${q.category}"`);
    }
    const symbolsAndHolidays = questions.filter((q) => q.category === "SYMBOLS_AND_HOLIDAYS").map((q) => q.number);
    assert.deepEqual(symbolsAndHolidays, Array.from({ length: 10 }, (_, i) => i + 119));
    // No other question uses it, and INTEGRATED_CIVICS (the 2008/2020
    // category, not the official 2025 section name) is never used here.
    assert.equal(questions.some((q) => q.category === "INTEGRATED_CIVICS"), false);
  });

  test("every question has non-empty answers, except the 4 location-varying questions", () => {
    for (const q of questions) {
      if (q.variesByLocation) {
        assert.deepEqual(q.answers, [], `question ${q.number} is variesByLocation and should have no static answers`);
      } else {
        assert.ok(q.answers.length > 0, `question ${q.number} has no answers`);
      }
    }
  });

  test("every question has a positive requiredAnswerCount consistent with its own wording", () => {
    // Spot-check the questions whose text explicitly asks for more than
    // one answer — transcribed directly from each question's own
    // "Name two/three/five..." phrasing.
    const expected: Record<number, number> = {
      10: 2, 48: 2, 65: 3, 67: 2, 69: 2, 81: 5, 126: 3,
    };
    for (const [numberStr, count] of Object.entries(expected)) {
      const q = questions.find((q) => q.number === Number(numberStr));
      assert.ok(q, `question ${numberStr} not found`);
      assert.equal(q!.requiredAnswerCount, count, `question ${numberStr} should require ${count} answers`);
    }
    for (const q of questions) {
      assert.ok((q.requiredAnswerCount ?? 1) >= 1, `question ${q.number} has an invalid requiredAnswerCount`);
    }
  });

  test("category question ranges match the official document's section boundaries", () => {
    const byCategory = (cat: string) => questions.filter((q) => q.category === cat).map((q) => q.number);
    assert.deepEqual(byCategory("AMERICAN_GOVERNMENT"), Array.from({ length: 72 }, (_, i) => i + 1));
    assert.deepEqual(byCategory("AMERICAN_HISTORY"), Array.from({ length: 46 }, (_, i) => i + 73));
    assert.deepEqual(byCategory("SYMBOLS_AND_HOLIDAYS"), Array.from({ length: 10 }, (_, i) => i + 119));
  });
});
