/**
 * Reusable roadmap-seeding logic, driven by a RoadmapSeedConfig. Split
 * from prisma/seed-roadmap.ts (the CLI entrypoint) so it can be imported
 * and tested directly — the entrypoint script runs its main() and calls
 * process.exit() on failure the moment it's loaded, which would make it
 * unsafe to import from a test.
 *
 * Hard rules, enforced by construction:
 *  - Never creates a Question (only findUnique lookups).
 *  - Never creates a TestVersion — seeding fails loudly if the slug
 *    doesn't already exist.
 *  - A missing question number is a thrown error, never a skip.
 *  - The whole config runs inside one transaction: a failure partway
 *    through (e.g. one lesson references a missing question number)
 *    rolls back everything from this run, rather than leaving a
 *    half-seeded unit behind.
 *  - Every write is an upsert keyed on the model's own unique
 *    constraint, so re-running with the same config is a no-op, and
 *    re-running with an edited config (e.g. a question removed from a
 *    lesson) cleans up the rows that no longer belong.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export interface RoadmapLessonConfig {
  slug: string;
  title: string;
  summary?: string;
  order: number;
  questionNumbers: number[];
}

export interface RoadmapExamConfig {
  questionCount: number;
  passThreshold: number;
  /** Curated pool. Omitted/empty means "draw from the unit's lesson questions at runtime" — see src/lib/roadmap-progress.ts. */
  questionNumbers?: number[];
}

export interface RoadmapUnitConfig {
  slug: string;
  title: string;
  description?: string;
  order: number;
  lessons: RoadmapLessonConfig[];
  exam: RoadmapExamConfig;
}

export interface RoadmapSeedConfig {
  testVersionSlug: string;
  units: RoadmapUnitConfig[];
}

/** Exported both for direct testing and for reuse below — `tx` defaults to the top-level client so callers outside a transaction can still use it standalone. */
export async function resolveQuestionId(testVersionId: string, number: number, tx: Tx | typeof prisma = prisma): Promise<string> {
  const question = await tx.question.findUnique({
    where: { testVersionId_number: { testVersionId, number } },
    select: { id: true },
  });
  if (!question) {
    throw new Error(
      `Roadmap seed failed: no Question #${number} exists for TestVersion ${testVersionId}. ` +
        `Fix the seed config or the question bank — a missing question number is never silently skipped.`
    );
  }
  return question.id;
}

async function upsertLessonQuestions(tx: Tx, testVersionId: string, lessonId: string, questionNumbers: number[]) {
  const questionIds = await Promise.all(questionNumbers.map((n) => resolveQuestionId(testVersionId, n, tx)));

  for (const [index, questionId] of questionIds.entries()) {
    await tx.lessonQuestion.upsert({
      where: { lessonId_questionId: { lessonId, questionId } },
      update: { order: index },
      create: { lessonId, questionId, order: index },
    });
  }

  // Drops any LessonQuestion rows left over from a previous run whose
  // config has since removed them.
  await tx.lessonQuestion.deleteMany({
    where: { lessonId, questionId: { notIn: questionIds } },
  });
}

async function upsertUnitExam(tx: Tx, testVersionId: string, unitId: string, examConfig: RoadmapExamConfig) {
  const exam = await tx.unitExam.upsert({
    where: { unitId },
    update: { questionCount: examConfig.questionCount, passThreshold: examConfig.passThreshold },
    create: { unitId, questionCount: examConfig.questionCount, passThreshold: examConfig.passThreshold },
  });

  const questionIds = examConfig.questionNumbers
    ? await Promise.all(examConfig.questionNumbers.map((n) => resolveQuestionId(testVersionId, n, tx)))
    : [];

  for (const questionId of questionIds) {
    await tx.unitExamQuestion.upsert({
      where: { unitExamId_questionId: { unitExamId: exam.id, questionId } },
      update: {},
      create: { unitExamId: exam.id, questionId },
    });
  }

  await tx.unitExamQuestion.deleteMany({
    where: { unitExamId: exam.id, questionId: { notIn: questionIds } },
  });
}

export interface SeedRoadmapResult {
  testVersionId: string;
  unitsSeeded: number;
}

export async function seedRoadmap(config: RoadmapSeedConfig): Promise<SeedRoadmapResult> {
  return prisma.$transaction(
    async (tx) => {
      const testVersion = await tx.testVersion.findUnique({ where: { slug: config.testVersionSlug } });
      if (!testVersion) {
        throw new Error(
          `Roadmap seed failed: no TestVersion found for slug "${config.testVersionSlug}". ` +
            `This script never creates a TestVersion — seed the question bank first.`
        );
      }

      for (const unitConfig of config.units) {
        const unit = await tx.unit.upsert({
          where: { testVersionId_slug: { testVersionId: testVersion.id, slug: unitConfig.slug } },
          update: {
            title: unitConfig.title,
            description: unitConfig.description ?? null,
            order: unitConfig.order,
            isActive: true,
          },
          create: {
            testVersionId: testVersion.id,
            slug: unitConfig.slug,
            title: unitConfig.title,
            description: unitConfig.description ?? null,
            order: unitConfig.order,
          },
        });

        for (const lessonConfig of unitConfig.lessons) {
          const lesson = await tx.lesson.upsert({
            where: { unitId_slug: { unitId: unit.id, slug: lessonConfig.slug } },
            update: {
              title: lessonConfig.title,
              summary: lessonConfig.summary ?? null,
              order: lessonConfig.order,
              isActive: true,
            },
            create: {
              unitId: unit.id,
              slug: lessonConfig.slug,
              title: lessonConfig.title,
              summary: lessonConfig.summary ?? null,
              order: lessonConfig.order,
            },
          });

          await upsertLessonQuestions(tx, testVersion.id, lesson.id, lessonConfig.questionNumbers);
        }

        await upsertUnitExam(tx, testVersion.id, unit.id, unitConfig.exam);
      }

      return { testVersionId: testVersion.id, unitsSeeded: config.units.length };
    },
    { timeout: 30_000 }
  );
}
