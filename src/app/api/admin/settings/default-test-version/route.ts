import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { setDefaultTestVersion } from "@/lib/admin-settings";
import { logger } from "@/lib/logger";

const bodySchema = z.object({ testVersionId: z.string().min(1) });

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "A test version id is required." }, { status: 400 });
  }

  try {
    await setDefaultTestVersion(parsed.data.testVersionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("api.admin.settings.defaultTestVersion", "Could not update the default test version", error);
    return NextResponse.json({ error: "Could not update the default test version." }, { status: 400 });
  }
}
