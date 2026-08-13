import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { getQuestionById } from "@/lib/questions";
import { logger } from "@/lib/logger";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id } = await params;

  try {
    const question = await getQuestionById(id, session.user.id);
    if (!question || !question.isActive) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }
    return NextResponse.json({ question });
  } catch (error) {
    logger.error("api.questions.get", "Could not load question", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
