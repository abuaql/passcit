import { NextResponse } from "next/server";
import { getContentVersion } from "@/lib/content-version";
import { logger } from "@/lib/logger";

// Public — the native app checks this before deciding whether to refetch
// its cached content, which can happen before the user has signed in.
export async function GET() {
  try {
    const version = await getContentVersion();
    return NextResponse.json({ version });
  } catch (error) {
    logger.error("api.content.version", "Could not compute content version", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
