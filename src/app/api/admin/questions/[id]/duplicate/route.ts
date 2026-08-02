import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { duplicateAdminQuestion } from "@/lib/admin-questions";
import { logger } from "@/lib/logger";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  try {
    const duplicate = await duplicateAdminQuestion(id);
    if (!duplicate) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }
    return NextResponse.json({ question: duplicate }, { status: 201 });
  } catch (error) {
    logger.error("api.admin.questions.duplicate", "Could not duplicate the question", error);
    return NextResponse.json({ error: "Could not duplicate the question." }, { status: 400 });
  }
}
