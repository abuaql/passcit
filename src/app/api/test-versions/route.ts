import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { getAllTestVersions } from "@/lib/questions";
import { logger } from "@/lib/logger";
import type { TestVersion } from "@/generated/prisma/client";

export interface PublicTestVersion {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
}

/** Exported alongside GET so the shaping logic is directly testable. */
export function toPublicTestVersion(tv: TestVersion): PublicTestVersion {
  return {
    id: tv.id,
    slug: tv.slug,
    name: tv.name,
    description: tv.description,
    isActive: tv.isActive,
    isDefault: tv.isDefault,
  };
}

// getAllTestVersions() already filters to isActive: true and orders by
// year ascending — reused verbatim, not reimplemented here.
export async function GET() {
  const session = await requireUser();
  if (session instanceof Response) return session;

  try {
    const testVersions = await getAllTestVersions();
    return NextResponse.json({ testVersions: testVersions.map(toPublicTestVersion) });
  } catch (error) {
    logger.error("api.testVersions.list", "Could not load test versions", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
