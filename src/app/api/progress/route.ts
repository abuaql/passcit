import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { setStudyStatus } from "@/lib/progress";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  questionId: z.string().min(1),
  status: z.enum(["NEW", "LEARNING", "KNOWN", "NEEDS_PRACTICE"]),
});

export async function POST(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    await setStudyStatus(session.user.id, parsed.data.questionId, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("api.progress.update", "Could not save progress", error);
    return NextResponse.json({ error: "Could not save progress." }, { status: 500 });
  }
}
