import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { completeInterview } from "@/lib/interview";
import { logger } from "@/lib/logger";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id } = await params;

  try {
    const result = await completeInterview(id, session.user.id);
    return NextResponse.json({
      passed: result.passed,
      readingResult: result.readingResult,
      writingResult: result.writingResult,
      civicsResult: result.civicsResult,
      civicsCorrectCount: result.civicsCorrectCount,
      civicsIncorrectCount: result.civicsIncorrectCount,
      durationSec: result.durationSec,
    });
  } catch (error) {
    logger.error("api.interview.complete", "Could not complete the interview", error);
    return NextResponse.json({ error: "Could not finalize the interview. Please try again." }, { status: 400 });
  }
}
