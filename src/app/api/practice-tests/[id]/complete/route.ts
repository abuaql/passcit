import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { recordQuizAnswer, recordStudyActivity } from "@/lib/progress";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  stoppedEarly: z.boolean().default(false),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedAnswer: z.string(),
        isCorrect: z.boolean(),
      })
    )
    .min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const test = await prisma.practiceTest.findUnique({
      where: { id },
      include: { testVersion: { select: { passThreshold: true } } },
    });
    if (!test || test.userId !== session.user.id) {
      return NextResponse.json({ error: "Test not found." }, { status: 404 });
    }
    if (test.completedAt) {
      return NextResponse.json({ error: "This test was already submitted." }, { status: 409 });
    }

    const { answers, stoppedEarly } = parsed.data;
    const score = answers.filter((a) => a.isCorrect).length;

    const passed =
      test.mode === "MOCK_INTERVIEW"
        ? score >= test.testVersion.passThreshold
        : score / answers.length >= 0.6;

    await prisma.$transaction([
      prisma.practiceTest.update({
        where: { id },
        data: { score, passed, stoppedEarly, completedAt: new Date() },
      }),
      prisma.practiceTestAnswer.createMany({
        data: answers.map((a) => ({
          testId: id,
          questionId: a.questionId,
          userAnswer: a.selectedAnswer,
          isCorrect: a.isCorrect,
        })),
      }),
    ]);

    for (const answer of answers) {
      await recordQuizAnswer(session.user.id, answer.questionId, answer.isCorrect);
    }
    await recordStudyActivity(session.user.id, test.testVersionId, answers.length);

    return NextResponse.json({ score, totalQuestions: answers.length, passed, stoppedEarly });
  } catch (error) {
    logger.error("api.practiceTests.complete", "Could not complete the practice test", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
