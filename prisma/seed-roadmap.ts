import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { seedRoadmap } from "../src/lib/roadmap-seed";
import type { RoadmapSeedConfig } from "../src/lib/roadmap-seed";

// ── RoadmapSeedConfig ────────────────────────────────────────────────────
// This is content authoring, not a schema change: adding a unit, lesson,
// or a new TestVersion's roadmap later is purely a matter of editing this
// config (or adding a new entry to ROADMAPS) and re-running this script.
// The actual seeding logic (and its "never create Questions, fail loudly
// on a missing number, idempotent upserts" rules) lives in
// src/lib/roadmap-seed.ts — this file is only the config + CLI entrypoint.

// The 2008 test's 100 questions are numbered sequentially by category
// (1-57 American Government, 58-87 American History, 88-100 Integrated
// Civics — verified against prisma/data/questions-2008.json), which maps
// cleanly onto CLAUDE.md's own worked example ("Unit 1 — American
// Government ... Unit 2 — American History ..."). Lessons are grouped
// into manageable ~9-10 question chunks. Unit 3's exam deliberately uses
// a curated `questionNumbers` pool (the other two units omit it) so both
// exam-question-sourcing paths are exercised against real seeded content,
// not just synthetic test fixtures.
// The 2025 test's 128 questions are numbered sequentially by official
// USCIS subcategory (verified against prisma/data/questions-2025.json,
// itself transcribed directly from the official PDF — see Phase 9):
// Principles of American Government 1-15, System of Government 16-62,
// Rights and Responsibilities 63-72, Colonial Period and Independence
// 73-89, 1800s 90-99, Recent American History... 100-118, Symbols
// 119-124, Holidays 125-128. Units mirror the 3 official categories,
// exactly like 2008. Large subcategories (System of Government, Recent
// American History, Colonial Period) are split into a numbered I/II/III
// sequence of ~8-10 question lessons, matching 2008's own convention —
// a lesson never spans two subcategories. Every one of the 128 questions
// lands in exactly one lesson (exact partition, no gaps/overlaps/reuse).
//
// Unit exam sizes (15/9 for the two large units, 10/6 for Symbols and
// Holidays — that unit's entire lesson-question pool is only 10
// questions, so its exam necessarily draws all of them) and the 60%
// pass bar were product decisions approved alongside this plan, not
// derived from the schema. All three draw randomly from each unit's
// lesson-question pool at runtime (no curated `questionNumbers` pool
// here) — 2008's "Integrated Civics" entry below already exercises the
// curated-pool code path, so this data doesn't need to duplicate that.
const ROADMAPS: RoadmapSeedConfig[] = [
  {
    testVersionSlug: "2025",
    units: [
      {
        slug: "american-government-2025",
        title: "American Government",
        description:
          "The principles of American democracy, the structure of government, and the rights and responsibilities of citizens.",
        order: 1,
        lessons: [
          {
            slug: "principles-of-american-government-1",
            title: "Principles of American Government I",
            order: 1,
            questionNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
          },
          {
            slug: "principles-of-american-government-2",
            title: "Principles of American Government II",
            order: 2,
            questionNumbers: [9, 10, 11, 12, 13, 14, 15],
          },
          {
            slug: "system-of-government-1",
            title: "System of Government I",
            order: 3,
            questionNumbers: [16, 17, 18, 19, 20, 21, 22, 23, 24],
          },
          {
            slug: "system-of-government-2",
            title: "System of Government II",
            order: 4,
            questionNumbers: [25, 26, 27, 28, 29, 30, 31, 32, 33],
          },
          {
            slug: "system-of-government-3",
            title: "System of Government III",
            order: 5,
            questionNumbers: [34, 35, 36, 37, 38, 39, 40, 41, 42],
          },
          {
            slug: "system-of-government-4",
            title: "System of Government IV",
            order: 6,
            questionNumbers: [43, 44, 45, 46, 47, 48, 49, 50, 51, 52],
          },
          {
            slug: "system-of-government-5",
            title: "System of Government V",
            order: 7,
            questionNumbers: [53, 54, 55, 56, 57, 58, 59, 60, 61, 62],
          },
          {
            slug: "rights-and-responsibilities-2025",
            title: "Rights and Responsibilities",
            order: 8,
            questionNumbers: [63, 64, 65, 66, 67, 68, 69, 70, 71, 72],
          },
        ],
        exam: { questionCount: 15, passThreshold: 9 },
      },
      {
        slug: "american-history-2025",
        title: "American History",
        description: "The colonial period, independence, the 1800s, and recent American history.",
        order: 2,
        lessons: [
          {
            slug: "colonial-period-and-independence-1",
            title: "Colonial Period and Independence I",
            order: 1,
            questionNumbers: [73, 74, 75, 76, 77, 78, 79, 80, 81],
          },
          {
            slug: "colonial-period-and-independence-2",
            title: "Colonial Period and Independence II",
            order: 2,
            questionNumbers: [82, 83, 84, 85, 86, 87, 88, 89],
          },
          {
            slug: "the-1800s-2025",
            title: "The 1800s",
            order: 3,
            questionNumbers: [90, 91, 92, 93, 94, 95, 96, 97, 98, 99],
          },
          {
            slug: "recent-american-history-1",
            title: "Recent American History I",
            order: 4,
            questionNumbers: [100, 101, 102, 103, 104, 105, 106, 107, 108, 109],
          },
          {
            slug: "recent-american-history-2",
            title: "Recent American History II",
            order: 5,
            questionNumbers: [110, 111, 112, 113, 114, 115, 116, 117, 118],
          },
        ],
        exam: { questionCount: 15, passThreshold: 9 },
      },
      {
        slug: "symbols-and-holidays-2025",
        title: "Symbols and Holidays",
        description: "The symbols and holidays of the United States.",
        order: 3,
        lessons: [
          {
            slug: "symbols-2025",
            title: "Symbols",
            order: 1,
            questionNumbers: [119, 120, 121, 122, 123, 124],
          },
          {
            slug: "holidays-2025",
            title: "Holidays",
            order: 2,
            questionNumbers: [125, 126, 127, 128],
          },
        ],
        exam: { questionCount: 10, passThreshold: 6 },
      },
    ],
  },
  {
    testVersionSlug: "2008",
    units: [
      {
        slug: "american-government",
        title: "American Government",
        description:
          "The principles of American democracy, the structure of government, and the rights and responsibilities of citizens.",
        order: 1,
        lessons: [
          {
            slug: "principles-of-democracy",
            title: "Principles of American Democracy",
            order: 1,
            questionNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          },
          {
            slug: "system-of-government-1",
            title: "System of Government I",
            order: 2,
            questionNumbers: [10, 11, 12, 13, 14, 15, 16, 17, 18],
          },
          {
            slug: "system-of-government-2",
            title: "System of Government II",
            order: 3,
            questionNumbers: [19, 20, 21, 22, 23, 24, 25, 26, 27],
          },
          {
            slug: "system-of-government-3",
            title: "System of Government III",
            order: 4,
            questionNumbers: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
          },
          {
            slug: "rights-and-responsibilities-1",
            title: "Rights and Responsibilities I",
            order: 5,
            questionNumbers: [38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
          },
          {
            slug: "rights-and-responsibilities-2",
            title: "Rights and Responsibilities II",
            order: 6,
            questionNumbers: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57],
          },
        ],
        exam: { questionCount: 10, passThreshold: 6 },
      },
      {
        slug: "american-history",
        title: "American History",
        description: "The colonial period, independence, the 1800s, and recent American history.",
        order: 2,
        lessons: [
          {
            slug: "colonial-period-and-independence",
            title: "Colonial Period and Independence",
            order: 1,
            questionNumbers: [58, 59, 60, 61, 62, 63, 64, 65, 66, 67],
          },
          {
            slug: "the-1800s",
            title: "The 1800s",
            order: 2,
            questionNumbers: [68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
          },
          {
            slug: "recent-american-history",
            title: "Recent American History",
            order: 3,
            questionNumbers: [78, 79, 80, 81, 82, 83, 84, 85, 86, 87],
          },
        ],
        exam: { questionCount: 10, passThreshold: 6 },
      },
      {
        slug: "integrated-civics",
        title: "Integrated Civics",
        description: "Geography, symbols, and holidays.",
        order: 3,
        lessons: [
          {
            slug: "geography",
            title: "Geography",
            order: 1,
            questionNumbers: [88, 89, 90, 91, 92, 93, 94],
          },
          {
            slug: "symbols-and-holidays",
            title: "Symbols and Holidays",
            order: 2,
            questionNumbers: [95, 96, 97, 98, 99, 100],
          },
        ],
        exam: {
          questionCount: 10,
          passThreshold: 6,
          questionNumbers: [88, 89, 90, 91, 92, 93, 94, 95, 96, 97],
        },
      },
    ],
  },
];

async function main() {
  const filterSlug = process.argv[2];
  const configsToSeed = filterSlug ? ROADMAPS.filter((c) => c.testVersionSlug === filterSlug) : ROADMAPS;
  if (filterSlug && configsToSeed.length === 0) {
    throw new Error(`No roadmap config found for TestVersion slug "${filterSlug}".`);
  }

  for (const config of configsToSeed) {
    const result = await seedRoadmap(config);
    console.log(`✔ Seeded roadmap for TestVersion "${config.testVersionSlug}": ${result.unitsSeeded} units.`);
  }
  console.log("✔ Roadmap seed complete.");
}

main()
  .catch((error) => {
    console.error("Roadmap seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
