import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { recordCivicsAnswer } from "@/lib/interview";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  questionId: z.string().min(1),
  answerText: z.string(),
  passThreshold: z.number().int().positive(),
  questionsAsked: z.number().int().positive(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    // Never trust the client for what counts as correct — always look the
    // question's real accepted answers up from the database.
    const question = await prisma.question.findUnique({
      where: { id: parsed.data.questionId },
      select: { requiredAnswerCount: true, answers: { select: { text: true } } },
    });
    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    const result = await recordCivicsAnswer(
      id,
      session.user.id,
      parsed.data.questionId,
      parsed.data.answerText,
      question.answers.map((a) => a.text),
      question.requiredAnswerCount,
      parsed.data.passThreshold,
      parsed.data.questionsAsked
    );
    return NextResponse.json(result);
  } catch (error) {
    logger.error("api.interview.civics", "Could not record the civics answer", error);
    return NextResponse.json({ error: "Could not save your answer. Please try again." }, { status: 400 });
  }
}
