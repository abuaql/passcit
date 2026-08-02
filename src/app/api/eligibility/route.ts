import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-admin";
import { runAndSaveEligibilityCalculation } from "@/lib/eligibility-data";
import { logger } from "@/lib/logger";

const tripSchema = z
  .object({
    departDate: z.coerce.date(),
    returnDate: z.coerce.date(),
  })
  .refine((t) => t.returnDate >= t.departDate, { message: "A trip cannot return before it departs." });

const bodySchema = z
  .object({
    basis: z.enum(["GENERAL", "MARRIED_TO_CITIZEN", "MILITARY"]),
    greenCardDate: z.coerce.date(),
    state: z.string().min(1).max(100),
    birthDate: z.coerce.date().nullable(),
    marriedToUSCitizen: z.boolean().default(false),
    spouseIsUSCitizen: z.boolean().default(false),
    trips: z.array(tripSchema).max(200), // generous ceiling against pathological payloads, not a realistic travel count
    isMale: z.boolean(),
    selectiveServiceRegisteredAnswer: z.boolean().nullable(),
    goodMoralCharacterConcern: z.boolean().nullable(),
    livedInStateThreeMonths: z.boolean().nullable(),
    militaryCountryServed: z.string().max(100).optional(),
    militaryServiceType: z.enum(["MANDATORY", "VOLUNTARY"]).optional(),
    militaryServiceStart: z.coerce.date().optional(),
    militaryServiceEnd: z.coerce.date().optional(),
    militaryCurrentlyServing: z.boolean().optional(),
    militaryUSArmedForces: z.boolean().optional(),
  })
  // The 3-year rule legally requires both conditions — reject a
  // malformed request rather than let a mismatched combination produce
  // a result that looks like a real 3-year-rule calculation but isn't.
  .refine((b) => b.basis !== "MARRIED_TO_CITIZEN" || (b.marriedToUSCitizen && b.spouseIsUSCitizen), {
    message: "The 3-year rule requires both marriedToUSCitizen and spouseIsUSCitizen.",
  })
  .refine((b) => b.greenCardDate <= new Date(), { message: "Green card date cannot be in the future." });

export async function POST(req: Request) {
  const session = await requireUser();
  if (session instanceof Response) return session;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { state, trips, ...rest } = parsed.data;
    const { id, result } = await runAndSaveEligibilityCalculation(session.user.id, state, {
      ...rest,
      trips: trips.map((t) => ({
        departDate: t.departDate.toISOString(),
        returnDate: t.returnDate.toISOString(),
      })),
    });
    return NextResponse.json({ id, result }, { status: 201 });
  } catch (error) {
    logger.error("api.eligibility.create", "Could not run the eligibility calculation", error);
    return NextResponse.json({ error: "Could not calculate eligibility. Please try again." }, { status: 500 });
  }
}
