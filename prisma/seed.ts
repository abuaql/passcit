import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import type { DynamicOfficialKey } from "../src/generated/prisma/client";
import { createDbAdapter } from "../src/lib/db-adapter";
import { prisma as sharedPrisma } from "../src/lib/prisma";
import { seedDynamicOfficials, resolveAnswers, type DynamicOfficialConfig } from "../src/lib/dynamic-officials";
import questions2008 from "./data/questions-2008.json";
import questions2020 from "./data/questions-2020.json";
import questions2025 from "./data/questions-2025.json";

const prisma = new PrismaClient({ adapter: createDbAdapter() });

interface SeedQuestion {
  number: number;
  category: "AMERICAN_GOVERNMENT" | "AMERICAN_HISTORY" | "INTEGRATED_CIVICS" | "SYMBOLS_AND_HOLIDAYS";
  subcategory: string;
  question: string;
  answers: string[];
  explanation?: string;
  isSpecial65_20?: boolean;
  isDynamicAnswer?: boolean;
  // Set only for questions whose answer should be sourced from the
  // DynamicOfficial table at seed time (see seedDynamicOfficials/
  // resolveAnswers below) instead of being hardcoded in this array.
  dynamicOfficialKey?: DynamicOfficialKey;
  dynamicNote?: string;
  variesByLocation?: boolean;
  requiredAnswerCount?: number;
}

// Current officeholders for the 4 dynamic-answer civics questions.
// Independently verified against uscis.gov/citizenship/testupdates (the
// exact source the official USCIS test document itself cites) plus
// corroborating sources — not copied from any version's own seed JSON.
//
// SCOPE (Phase 9 content addition): only the 2025 TestVersion's
// questions reference these via dynamicOfficialKey. 2008 and 2020 keep
// their existing hardcoded-per-version answers, entirely untouched —
// centralizing them onto this table too is a deliberate future
// migration, not part of this change.
const DYNAMIC_OFFICIALS: DynamicOfficialConfig[] = [
  {
    key: "PRESIDENT",
    currentValue: "Donald J. Trump",
    sourceUrl: "https://www.uscis.gov/citizenship/testupdates",
    lastVerifiedAt: new Date("2026-08-12T00:00:00.000Z"),
  },
  {
    key: "VICE_PRESIDENT",
    currentValue: "JD Vance",
    sourceUrl: "https://www.uscis.gov/citizenship/testupdates",
    lastVerifiedAt: new Date("2026-08-12T00:00:00.000Z"),
  },
  {
    key: "SPEAKER_OF_THE_HOUSE",
    currentValue: "Mike Johnson",
    sourceUrl: "https://www.uscis.gov/citizenship/testupdates",
    lastVerifiedAt: new Date("2026-08-12T00:00:00.000Z"),
  },
  {
    key: "CHIEF_JUSTICE",
    currentValue: "John Roberts",
    sourceUrl: "https://www.uscis.gov/citizenship/testupdates",
    lastVerifiedAt: new Date("2026-08-12T00:00:00.000Z"),
  },
];

interface TestVersionConfig {
  slug: string;
  name: string;
  year: number;
  totalQuestions: number;
  questionsAsked: number;
  passThreshold: number;
  isDefault: boolean;
  description: string;
  questions: SeedQuestion[];
  // Thematic, cross-cutting labels — distinct from the fixed USCIS
  // category/subcategory taxonomy. Keyed by tag name -> question numbers
  // WITHIN THIS VERSION (each version has its own numbering). Not
  // exhaustive by design; enough to make tag filtering useful without
  // hand-tagging every question on day one.
  tagAssignments: Record<string, number[]>;
}

// ── Version definitions ──────────────────────────────────────────────
// Adding a future USCIS test version means adding one more entry here
// (plus its own questions-*.json) — nothing else in this file, or the
// schema, needs to change.

const VERSIONS: TestVersionConfig[] = [
  {
    slug: "2008",
    name: "2008 Civics Test",
    year: 2008,
    totalQuestions: 100,
    questionsAsked: 10,
    passThreshold: 6,
    isDefault: true,
    description:
      "The official USCIS naturalization civics test used since 2008. Still the current test for applicants who filed Form N-400 before October 20, 2025.",
    questions: questions2008 as SeedQuestion[],
    tagAssignments: {
      Constitution: [1, 2, 3, 4, 5, 7, 12, 65, 66],
      Elections: [18, 19, 21, 22, 26, 27, 54],
      "Branches of Government": [13, 14, 15, 16, 17, 37, 38, 41, 42],
      Presidents: [15, 26, 28, 30, 31, 32, 33, 34, 69, 70, 79, 80, 82],
      "Bill of Rights": [5, 6, 9, 10, 48, 50, 51],
      "Civil Rights": [60, 76, 77, 84, 85, 86],
      Wars: [61, 72, 73, 74, 78, 81, 82, 83],
      Geography: [88, 89, 90, 91, 92, 93, 94, 95],
      "Symbols & Holidays": [96, 97, 98, 99, 100],
      "Native Americans": [59, 87],
      "Citizen Duties": [48, 49, 50, 52, 53, 54, 55, 56, 57],
    },
  },
  {
    slug: "2020",
    name: "2020 Civics Test",
    year: 2020,
    totalQuestions: 128,
    questionsAsked: 20,
    passThreshold: 12,
    isDefault: false,
    description:
      "USCIS's 128-question civics test bank, introduced in 2020. This same question bank is what USCIS reused for the 2025 civics test, currently in effect for applicants who filed Form N-400 on or after October 20, 2025.",
    questions: questions2020 as SeedQuestion[],
    tagAssignments: {
      Constitution: [2, 3, 4, 5, 6, 7, 9, 11, 13, 82],
      Elections: [21, 22, 24, 25, 27, 36, 49],
      "Branches of Government": [15, 16, 17, 18, 50, 51, 52],
      Presidents: [17, 36, 38, 39, 40, 41, 42, 43, 44, 45, 86, 87, 94, 105],
      "Bill of Rights": [6, 10, 63, 65, 66],
      "Civil Rights": [75, 98, 99, 112, 113],
      Wars: [76, 91, 92, 100, 101, 106, 110, 111, 114, 115, 116],
      "Symbols & Holidays": [119, 120, 121, 122, 123, 124, 125, 126, 127, 128],
      "Native Americans": [74, 117],
      "Citizen Duties": [63, 64, 66, 67, 68, 69, 70, 71, 72],
    },
  },
  {
    slug: "2025",
    name: "2025 Civics Test",
    year: 2025,
    totalQuestions: 128,
    questionsAsked: 20,
    passThreshold: 12,
    isDefault: false,
    description:
      "The official USCIS 2025 civics test (form M-1778 (09/25)), effective for applicants who file Form N-400 on or after October 20, 2025. Transcribed directly from the USCIS source document — see prisma/data/sources/uscis-2025-civics-test-m1778.pdf.",
    questions: questions2025 as SeedQuestion[],
    // Deliberately empty — thematic tag curation for this version is
    // deferred, same as Unit/Lesson roadmap content (not part of this
    // content-addition change).
    tagAssignments: {},
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN" },
      create: {
        email: adminEmail,
        name: "Admin",
        passwordHash,
        role: "ADMIN",
      },
    });

    await prisma.studyStreak.upsert({
      where: { userId: admin.id },
      update: {},
      create: { userId: admin.id },
    });

    console.log(`✔ Admin account ready: ${admin.email}`);
  } else {
    console.log(
      "ℹ No ADMIN_EMAIL / ADMIN_PASSWORD set in .env — skipping admin bootstrap."
    );
  }
}

async function seedTestVersion(config: TestVersionConfig) {
  const testVersion = await prisma.testVersion.upsert({
    where: { slug: config.slug },
    update: {
      name: config.name,
      year: config.year,
      totalQuestions: config.totalQuestions,
      questionsAsked: config.questionsAsked,
      passThreshold: config.passThreshold,
      isDefault: config.isDefault,
      isActive: true,
      description: config.description,
    },
    create: {
      slug: config.slug,
      name: config.name,
      year: config.year,
      totalQuestions: config.totalQuestions,
      questionsAsked: config.questionsAsked,
      passThreshold: config.passThreshold,
      isDefault: config.isDefault,
      isActive: true,
      description: config.description,
    },
  });

  const questionIdByNumber = new Map<number, string>();

  for (const q of config.questions) {
    const question = await prisma.question.upsert({
      where: { testVersionId_number: { testVersionId: testVersion.id, number: q.number } },
      update: {
        category: q.category,
        subcategory: q.subcategory,
        question: q.question,
        explanation: q.explanation ?? null,
        requiredAnswerCount: q.requiredAnswerCount ?? 1,
        isSpecial65_20: q.isSpecial65_20 ?? false,
        isDynamicAnswer: q.isDynamicAnswer ?? false,
        dynamicOfficialKey: q.dynamicOfficialKey ?? null,
        dynamicNote: q.dynamicNote ?? null,
        variesByLocation: q.variesByLocation ?? false,
        isActive: true,
      },
      create: {
        testVersionId: testVersion.id,
        number: q.number,
        category: q.category,
        subcategory: q.subcategory,
        question: q.question,
        explanation: q.explanation ?? null,
        requiredAnswerCount: q.requiredAnswerCount ?? 1,
        isSpecial65_20: q.isSpecial65_20 ?? false,
        isDynamicAnswer: q.isDynamicAnswer ?? false,
        dynamicOfficialKey: q.dynamicOfficialKey ?? null,
        dynamicNote: q.dynamicNote ?? null,
        variesByLocation: q.variesByLocation ?? false,
      },
    });

    questionIdByNumber.set(q.number, question.id);

    // Replace this question's answers wholesale — simplest way to keep
    // the seed idempotent without needing a natural unique key per answer.
    const answers = await resolveAnswers(q.answers, q.dynamicOfficialKey);
    await prisma.questionAnswer.deleteMany({ where: { questionId: question.id } });
    if (answers.length > 0) {
      await prisma.questionAnswer.createMany({
        data: answers.map((text, i) => ({ questionId: question.id, text, sortOrder: i })),
      });
    }
  }

  console.log(`✔ Seeded ${config.questions.length} questions for the ${config.name}.`);

  for (const [tagName, numbers] of Object.entries(config.tagAssignments)) {
    const slug = slugify(tagName);
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: { name: tagName },
      create: { name: tagName, slug },
    });

    for (const number of numbers) {
      const questionId = questionIdByNumber.get(number);
      if (!questionId) continue;

      await prisma.questionTag.upsert({
        where: { questionId_tagId: { questionId, tagId: tag.id } },
        update: {},
        create: { questionId, tagId: tag.id },
      });
    }
  }

  console.log(`✔ Seeded ${Object.keys(config.tagAssignments).length} tags for ${config.name}.`);
}

async function main() {
  await seedAdmin();
  await seedDynamicOfficials(DYNAMIC_OFFICIALS);
  console.log(`✔ Seeded ${DYNAMIC_OFFICIALS.length} dynamic officials.`);

  // Optional slug filter (e.g. `tsx prisma/seed.ts 2025`) so a single
  // TestVersion can be (re)seeded without touching any other version's
  // rows at all — no upsert/delete/create call is made against them.
  // Omitted, this seeds every version, same as before.
  const filterSlug = process.argv[2];
  const versionsToSeed = filterSlug ? VERSIONS.filter((v) => v.slug === filterSlug) : VERSIONS;

  if (filterSlug && versionsToSeed.length === 0) {
    throw new Error(`No TestVersion config found for slug "${filterSlug}".`);
  }

  for (const version of versionsToSeed) {
    await seedTestVersion(version);
  }
  console.log("✔ Seed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    // dynamic-officials.ts (src/lib) uses the shared prisma singleton,
    // separate from this script's own client — both need closing for
    // the process to exit cleanly.
    await prisma.$disconnect();
    await sharedPrisma.$disconnect();
  });
