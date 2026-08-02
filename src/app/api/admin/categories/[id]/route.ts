import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { updateAdminTag, deleteAdminTag } from "@/lib/admin-tags";
import { logger } from "@/lib/logger";
import { isUniqueConstraintError } from "@/lib/utils";

const bodySchema = z.object({ name: z.string().min(1).max(100) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  }

  try {
    const tag = await updateAdminTag(id, parsed.data.name);
    return NextResponse.json({ tag });
  } catch (error) {
    const message =
      isUniqueConstraintError(error)
        ? "A category with that name already exists."
        : "Could not update the category.";
    logger.error("api.admin.categories.update", message, error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  try {
    await deleteAdminTag(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("api.admin.categories.delete", "Could not delete the category", error);
    return NextResponse.json({ error: "Could not delete the category." }, { status: 400 });
  }
}
