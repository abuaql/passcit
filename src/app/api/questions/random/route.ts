import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { getActiveTestVersion, getRandomQuestion } from "@/lib/questions";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { searchParams } = new URL(req.url);
  const exclude = searchParams.get("exclude") ?? undefined;

  try {
    const testVersion = await getActiveTestVersion(session.user.id);
    const question = await getRandomQuestion(testVersion.id, exclude, session.user.id);
    if (!question) {
      return NextResponse.json({ error: "No questions available." }, { status: 404 });
    }
    return NextResponse.json({ question });
  } catch (error) {
    logger.error("api.questions.random", "Could not fetch a random question", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
