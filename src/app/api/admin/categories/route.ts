import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminTag } from "@/lib/admin-tags";
import { logger } from "@/lib/logger";
import { isUniqueConstraintError } from "@/lib/utils";

const bodySchema = z.object({ name: z.string().min(1).max(100) });

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  }

  try {
    const tag = await createAdminTag(parsed.data.name);
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    const message =
      isUniqueConstraintError(error)
        ? "A category with that name already exists."
        : error instanceof Error
          ? error.message
          : "Could not create the category.";
    logger.error("api.admin.categories.create", message, error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
