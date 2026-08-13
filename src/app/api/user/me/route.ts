import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { getPublicUser } from "@/lib/user-profile";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await requireUser();
  if (session instanceof Response) return session;

  try {
    const user = await getPublicUser(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    logger.error("api.user.me", "Could not load current user", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
