/**
 * Reusable logic for the DynamicOfficial lookup table, split out from
 * prisma/seed.ts (the CLI entrypoint) for the same reason
 * roadmap-seed.ts is split from prisma/seed-roadmap.ts — the entrypoint
 * script runs its main() the moment it's loaded, which makes it unsafe
 * to import from a test.
 */

import { prisma } from "@/lib/prisma";
import type { DynamicOfficialKey } from "@/generated/prisma/client";

export interface DynamicOfficialConfig {
  key: DynamicOfficialKey;
  currentValue: string;
  sourceUrl: string;
  lastVerifiedAt: Date;
}

export async function seedDynamicOfficials(officials: DynamicOfficialConfig[]): Promise<void> {
  for (const official of officials) {
    await prisma.dynamicOfficial.upsert({
      where: { key: official.key },
      update: {
        currentValue: official.currentValue,
        sourceUrl: official.sourceUrl,
        lastVerifiedAt: official.lastVerifiedAt,
      },
      create: official,
    });
  }
}

/**
 * For a question with a dynamicOfficialKey, the current officeholder
 * name becomes the primary (sortOrder 0) accepted answer, with any
 * other declared accepted variants kept as additional alternates. For
 * every other question (no key), the declared answers are used as-is.
 */
export async function resolveAnswers(
  answers: string[],
  dynamicOfficialKey: DynamicOfficialKey | null | undefined
): Promise<string[]> {
  if (!dynamicOfficialKey) return answers;

  const official = await prisma.dynamicOfficial.findUnique({ where: { key: dynamicOfficialKey } });
  if (!official) return answers;

  return [official.currentValue, ...answers.filter((a) => a !== official.currentValue)];
}
