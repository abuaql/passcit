import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { deleteAccount } from "@/lib/account-deletion";
import { logger } from "@/lib/logger";

const bodySchema = z.object({ password: z.string().optional() });

// Self-service only: the target is always the authenticated caller's own
// id (session.user.id) — this endpoint never accepts or trusts a
// client-supplied user id, so one account can never delete another's.
export async function DELETE(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  const password = parsed.success ? parsed.data.password : undefined;

  try {
    const result = await deleteAccount(session.user.id, password);

    switch (result.status) {
      case "password_required":
        return NextResponse.json(
          { error: "Enter your password to confirm account deletion." },
          { status: 400 }
        );
      case "invalid_password":
        return NextResponse.json({ error: "Incorrect password." }, { status: 400 });
      case "blocked_by_authored_content":
        return NextResponse.json(
          { error: "This account has published site content and can't be self-deleted. Contact support." },
          { status: 409 }
        );
      case "ok":
      case "not_found":
        // Idempotent: whether this call did the deleting or the account
        // was already gone, the response is identical either way.
        return NextResponse.json({ ok: true });
    }
  } catch (error) {
    logger.error("api.user.account.delete", "Could not delete account", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
