import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { getActiveTestVersion } from "@/lib/questions";
import { startInterview, getInterviewHistory } from "@/lib/interview";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  testVersionId: z.string().min(1).optional(),
});

export async function GET() {
  const session = await requireUser();
  if (session instanceof Response) return session;

  try {
    const history = await getInterviewHistory(session.user.id);
    return NextResponse.json({ history });
  } catch (error) {
    logger.error("api.interview.history", "Could not load interview history", error);
    return NextResponse.json({ error: "Could not load interview history." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    // If the applicant didn't explicitly choose a version (e.g. the entry
    // point that skips the picker), fall back to their active one.
    const testVersion = parsed.data.testVersionId
      ? { id: parsed.data.testVersionId }
      : await getActiveTestVersion(session.user.id);

    const result = await startInterview(session.user.id, testVersion.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("api.interview.start", "Could not start the interview", error);
    return NextResponse.json({ error: "Could not start the interview. Please try again." }, { status: 500 });
  }
}
