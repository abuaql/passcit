import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { setUserRole, setUserActive } from "@/lib/admin-users";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success || (parsed.data.role === undefined && parsed.data.isActive === undefined)) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  // An admin demoting or disabling their own account could lock
  // themselves out with no other admin able to fix it.
  if (id === guard.user.id && (parsed.data.role === "USER" || parsed.data.isActive === false)) {
    return NextResponse.json({ error: "You can't demote or disable your own account." }, { status: 400 });
  }

  try {
    if (parsed.data.role !== undefined) await setUserRole(id, parsed.data.role);
    if (parsed.data.isActive !== undefined) await setUserActive(id, parsed.data.isActive);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("api.admin.users.update", "Could not update the user", error);
    return NextResponse.json({ error: "Could not update the user." }, { status: 400 });
  }
}
