import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { setActiveTestVersion } from "@/lib/questions";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  testVersionId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const version = await setActiveTestVersion(session.user.id, parsed.data.testVersionId);
    return NextResponse.json({ testVersion: version });
  } catch (error) {
    logger.error("api.user.activeTestVersion", "Could not switch test version", error);
    return NextResponse.json({ error: "Could not switch test version." }, { status: 400 });
  }
}
