import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { updateAdminQuestion, deleteAdminQuestion, type QuestionInput } from "@/lib/admin-questions";
import { logger } from "@/lib/logger";
import { isUniqueConstraintError } from "@/lib/utils";

const questionInputSchema = z.object({
  testVersionId: z.string().min(1),
  number: z.number().int().positive(),
  category: z.enum(["AMERICAN_GOVERNMENT", "AMERICAN_HISTORY", "INTEGRATED_CIVICS", "SYMBOLS_AND_HOLIDAYS"]),
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  const parsed = questionInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid question data.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const question = await updateAdminQuestion(id, parsed.data as QuestionInput);
    return NextResponse.json({ question });
  } catch (error) {
    const message =
      isUniqueConstraintError(error)
        ? "That question number already exists for this test version."
        : "Could not update the question.";
    logger.error("api.admin.questions.update", message, error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  try {
    await deleteAdminQuestion(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("api.admin.questions.delete", "Could not delete the question", error);
    return NextResponse.json({ error: "Could not delete the question." }, { status: 400 });
  }
}
