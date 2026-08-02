import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminQuestion, type QuestionInput } from "@/lib/admin-questions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { isUniqueConstraintError } from "@/lib/utils";

const questionInputSchema = z.object({
  testVersionId: z.string().min(1),
  number: z.number().int().positive(),
  category: z.enum(["AMERICAN_GOVERNMENT", "AMERICAN_HISTORY", "INTEGRATED_CIVICS"]),
  subcategory: z.string().min(1),
  question: z.string().min(1),
  explanation: z.string().nullable().optional(),
  answers: z.array(z.string()).min(1),
  requiredAnswerCount: z.number().int().min(1).optional(),
  isSpecial65_20: z.boolean().optional(),
  isDynamicAnswer: z.boolean().optional(),
  dynamicNote: z.string().nullable().optional(),
  variesByLocation: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const parsed = questionInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid question data.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const question = await createAdminQuestion(parsed.data as QuestionInput);
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    const message =
      isUniqueConstraintError(error)
        ? "That question number already exists for this test version."
        : "Could not create the question.";
    logger.error("api.admin.questions.create", message, error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Bulk import: an array of QuestionInput-shaped objects (the same shape
// exported by GET /api/admin/questions/export, and the same shape as
// prisma/data/questions-*.json). Upserts by [testVersionId, number].
const importSchema = z.array(questionInputSchema);

export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const parsed = importSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import file.", details: parsed.error.flatten() }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const item of parsed.data) {
    try {
      const existing = await prisma.question.findUnique({
        where: { testVersionId_number: { testVersionId: item.testVersionId, number: item.number } },
        select: { id: true },
      });

      if (existing) {
        await prisma.$transaction([
          prisma.questionAnswer.deleteMany({ where: { questionId: existing.id } }),
          prisma.question.update({
            where: { id: existing.id },
            data: {
              category: item.category,
              subcategory: item.subcategory,
              question: item.question,
              explanation: item.explanation ?? null,
              requiredAnswerCount: item.requiredAnswerCount ?? 1,
              isSpecial65_20: item.isSpecial65_20 ?? false,
              isDynamicAnswer: item.isDynamicAnswer ?? false,
              dynamicNote: item.dynamicNote ?? null,
              variesByLocation: item.variesByLocation ?? false,
              isActive: item.isActive ?? true,
              answers: {
                create: item.answers.filter((a) => a.trim()).map((text, i) => ({ text: text.trim(), sortOrder: i })),
              },
            },
          }),
        ]);
        updated++;
      } else {
        await createAdminQuestion(item as QuestionInput);
        created++;
      }
    } catch (error) {
      logger.error("api.admin.questions.import", `Question #${item.number} (${item.testVersionId}) failed to import`, error);
      errors.push(`Question #${item.number} (${item.testVersionId}): failed to import.`);
    }
  }

  return NextResponse.json({ created, updated, errors });
}
