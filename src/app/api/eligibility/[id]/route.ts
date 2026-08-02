import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-admin";
import { getEligibilityCalculation } from "@/lib/eligibility-data";
import { logger } from "@/lib/logger";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const { id } = await params;

  try {
    const calculation = await getEligibilityCalculation(id, session.user.id);
    if (!calculation) {
      return NextResponse.json({ error: "Calculation not found." }, { status: 404 });
    }
    return NextResponse.json(calculation);
  } catch (error) {
    logger.error("api.eligibility.get", "Could not load the eligibility calculation", error);
    return NextResponse.json({ error: "Could not load the calculation." }, { status: 500 });
  }
}
