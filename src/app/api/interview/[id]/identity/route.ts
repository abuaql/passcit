import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { completeIdentityStep } from "@/lib/interview";
import { logger } from "@/lib/logger";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id } = await params;

  try {
    await completeIdentityStep(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("api.interview.identity", "Could not complete the identity step", error);
    return NextResponse.json({ error: "Could not save progress." }, { status: 400 });
  }
}
