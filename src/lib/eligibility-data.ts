import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  calculateEligibility,
  physicalPresenceDays,
  deriveRecommendations,
  computeReadinessScore,
  isUnder18Now,
  type EligibilityInput,
  type EligibilityResult,
} from "@/lib/eligibility";

/**
 * Runs the calculation and persists it in one step. userId is optional —
 * signed-out use isn't currently exposed by any route, but the schema
 * already supports it (EligibilityCalculation.userId is nullable), so
 * this doesn't force a login requirement that isn't otherwise there.
 */
export async function runAndSaveEligibilityCalculation(
  userId: string | null,
  state: string,
  input: EligibilityInput & {
    militaryCountryServed?: string;
    militaryServiceType?: "MANDATORY" | "VOLUNTARY";
    militaryServiceStart?: Date;
    militaryServiceEnd?: Date;
    militaryCurrentlyServing?: boolean;
    militaryUSArmedForces?: boolean;
  }
) {
  const result = calculateEligibility(input);

  const saved = await prisma.eligibilityCalculation.create({
    data: {
      userId,
      basis: input.basis,
      greenCardDate: input.greenCardDate,
      state,
      birthDate: input.birthDate,
      marriedToUSCitizen: input.marriedToUSCitizen,
      spouseIsUSCitizen: input.spouseIsUSCitizen,
      militaryCountryServed: input.militaryCountryServed,
      militaryServiceType: input.militaryServiceType,
      militaryServiceStart: input.militaryServiceStart,
      militaryServiceEnd: input.militaryServiceEnd,
      militaryCurrentlyServing: input.militaryCurrentlyServing,
      militaryUSArmedForces: input.militaryUSArmedForces,
      travelHistory: input.trips satisfies Prisma.InputJsonValue,
      totalDaysOutsideUS: result.totalDaysOutsideUS,
      longestTripDays: result.longestTripDays,
      selectiveServiceRequired: result.selectiveServiceRequired,
      selectiveServiceRegistered: input.selectiveServiceRegisteredAnswer,
      eligibleFilingDate: result.earliestFilingDate,
      requiredResidencyYears: result.requiredResidencyYears,
      physicalPresenceDaysReq: result.physicalPresenceDaysReq,
      continuousResidenceOk: result.continuousResidenceOk,
      warnings: result.warnings satisfies Prisma.InputJsonValue,
    },
  });

  return { id: saved.id, result };
}

/**
 * Fetches a saved calculation and re-derives every genuinely time- or
 * trip-dependent value from stored inputs, rather than storing every
 * derived field twice. `selectiveServiceRequired` and `warnings` are
 * used directly from storage rather than recomputed — deliberately,
 * since recomputing them would require reconstructing the original
 * `isMale` wizard input, which isn't recoverable from the stored boolean
 * output (a male who aged out of the registration window and someone
 * who was never male both produce `selectiveServiceRequired: false`,
 * identically). `deriveRecommendations()` was written specifically to
 * never need that reconstruction, so recommendations stay accurate here
 * without it.
 */
export async function getEligibilityCalculation(id: string, userId: string | null) {
  const record = await prisma.eligibilityCalculation.findUnique({ where: { id } });
  if (!record) return null;
  if (record.userId && record.userId !== userId) return null;

  const isMilitaryPath = record.basis === "MILITARY";
  const eligibilityDate = addYears(record.greenCardDate, record.requiredResidencyYears);
  const physicalPresenceDaysActual = isMilitaryPath
    ? 0
    : physicalPresenceDays(record.greenCardDate, record.basis, record.totalDaysOutsideUS);
  const continuousResidenceRisk =
    record.longestTripDays >= 365 ? "likely_broken" : record.longestTripDays >= 180 ? "review" : "none";
  const isUnder18 = record.birthDate ? isUnder18Now(record.birthDate) : false;
  const isEligibleNow =
    !isMilitaryPath &&
    new Date() >= eligibilityDate &&
    record.continuousResidenceOk &&
    physicalPresenceDaysActual >= record.physicalPresenceDaysReq &&
    !isUnder18;

  const result: EligibilityResult = {
    isMilitaryPath,
    requiredResidencyYears: record.requiredResidencyYears,
    eligibilityDate,
    earliestFilingDate: record.eligibleFilingDate,
    physicalPresenceDaysReq: record.physicalPresenceDaysReq,
    physicalPresenceDaysActual,
    totalDaysOutsideUS: record.totalDaysOutsideUS,
    longestTripDays: record.longestTripDays,
    continuousResidenceOk: record.continuousResidenceOk,
    continuousResidenceRisk,
    selectiveServiceRequired: record.selectiveServiceRequired ?? false,
    isEligibleNow,
    // A live re-check, not stored: "how ready are you NOW" should
    // reflect today's date even for a calculation run weeks ago, not
    // the date it was originally computed.
    readinessScore: isMilitaryPath
      ? 0
      : computeReadinessScore({
          greenCardDate: record.greenCardDate,
          eligibilityDate,
          continuousResidenceRisk,
          physicalPresenceShortfall: physicalPresenceDaysActual < record.physicalPresenceDaysReq,
          selectiveServiceRequired: record.selectiveServiceRequired ?? false,
          selectiveServiceRegisteredAnswer: record.selectiveServiceRegistered,
        }),
    warnings: (record.warnings as EligibilityResult["warnings"]) ?? [],
    recommendations: deriveRecommendations({
      basis: record.basis,
      isEligibleNow,
      continuousResidenceRisk,
      selectiveServiceRequired: record.selectiveServiceRequired ?? false,
      selectiveServiceRegisteredAnswer: record.selectiveServiceRegistered,
    }),
  };

  return { id: record.id, state: record.state, createdAt: record.createdAt, greenCardDate: record.greenCardDate, result };
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}
