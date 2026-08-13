import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { completePracticeTest } from "@/lib/practice-test-progress";
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
    const result = await completePracticeTest(session.user.id, id, parsed.data);

    switch (result.status) {
      case "not_found":
        return NextResponse.json({ error: "Test not found." }, { status: 404 });
      case "already_completed":
        return NextResponse.json({ error: "This test was already submitted." }, { status: 409 });
      case "ok":
        return NextResponse.json({
          score: result.score,
          totalQuestions: result.totalQuestions,
          passed: result.passed,
          stoppedEarly: result.stoppedEarly,
        });
    }
  } catch (error) {
    logger.error("api.practiceTests.complete", "Could not complete the practice test", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
