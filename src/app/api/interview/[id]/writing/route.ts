import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { recordWritingAttempt } from "@/lib/interview";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  sentenceId: z.string().min(1),
  sentenceText: z.string().min(1),
  typedAnswer: z.string(),
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
    const result = await recordWritingAttempt(
      id,
      session.user.id,
      { id: parsed.data.sentenceId, text: parsed.data.sentenceText },
      parsed.data.typedAnswer
    );
    return NextResponse.json(result);
  } catch (error) {
    logger.error("api.interview.writing", "Could not record the writing attempt", error);
    return NextResponse.json({ error: "Could not save your answer. Please try again." }, { status: 400 });
  }
}
