import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { updateSiteSettings } from "@/lib/admin-settings";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  siteName: z.string().min(1).max(100),
  logoUrl: z.string().url().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
  voiceDefaultRate: z.number().min(0.5).max(2),
  maintenanceMode: z.boolean(),
});

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const settings = await updateSiteSettings(parsed.data, guard.user.id);
    return NextResponse.json({ settings });
  } catch (error) {
    logger.error("api.admin.settings.update", "Could not save settings", error);
    return NextResponse.json({ error: "Could not save settings." }, { status: 400 });
  }
}
