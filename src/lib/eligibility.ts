/**
 * Core N-400 eligibility calculations. Every rule here is grounded in
 * USCIS's published requirements (uscis.gov/policy-manual, Volume 12),
 * verified via research before implementation, not assumed from memory.
 *
 * This tool estimates eligibility — it does not and cannot give a legal
 * determination. That distinction is enforced structurally throughout:
 * results are always framed as estimates, and any case with real
 * uncertainty (military service, absences near the disruption threshold,
 * incomplete Selective Service history) routes to a "consult USCIS or an
 * immigration attorney" recommendation rather than a confident answer.
 */

import type { EligibilityBasis } from "@/generated/prisma/client";

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * A `type`, not an `interface`, for the same reason as
 * ReadingWritingAttempt in interview.ts: only type aliases get the
 * implicit index signature that makes them assignable to Prisma's
 * `InputJsonObject` when written to a Json column.
 */
export type Trip = {
  departDate: string; // ISO date
  returnDate: string; // ISO date
};

/** Inclusive of both the departure and return day, matching how USCIS counts physical presence (the day you leave and the day you return both count as days IN the U.S., not abroad). */
function tripDaysAbroad(trip: Trip): number {
  const depart = new Date(trip.departDate);
  const ret = new Date(trip.returnDate);
  const fullDaysBetween = Math.round((ret.getTime() - depart.getTime()) / DAY_MS);
  // Subtract 1: the departure and return days themselves count as
  // present, so only the days strictly between them are "abroad."
  return Math.max(0, fullDaysBetween - 1);
}

export function totalDaysOutsideUS(trips: Trip[]): number {
  return trips.reduce((sum, t) => sum + tripDaysAbroad(t), 0);
}

export function longestTripDays(trips: Trip[]): number {
  return trips.reduce((max, t) => Math.max(max, tripDaysAbroad(t)), 0);
}

/** Years of continuous residence required for the given basis. Military is handled entirely separately — see continuousResidenceRequiredYears is never called for it. */
export function continuousResidenceRequiredYears(basis: EligibilityBasis): number {
  return basis === "MARRIED_TO_CITIZEN" ? 3 : 5;
}

/** Physical presence requirement in days: 913 days (30 months) for the general rule, 548 days (18 months) for the 3-year rule — verified against USCIS's own day counts, not just "half the years" arithmetic, since USCIS states the day figures directly rather than deriving them from a simple year/2 calculation. */
export function physicalPresenceRequiredDays(basis: EligibilityBasis): number {
  return basis === "MARRIED_TO_CITIZEN" ? 548 : 913;
}

/** The statutory period's total calendar days (used to derive physical presence FROM days-outside, since the schema stores the latter). */
function statutoryPeriodDays(greenCardDate: Date, years: number): number {
  const periodEnd = new Date(greenCardDate);
  periodEnd.setFullYear(periodEnd.getFullYear() + years);
  return Math.round((periodEnd.getTime() - greenCardDate.getTime()) / DAY_MS);
}

export function physicalPresenceDays(greenCardDate: Date, basis: EligibilityBasis, daysOutside: number): number {
  const years = continuousResidenceRequiredYears(basis);
  return statutoryPeriodDays(greenCardDate, years) - daysOutside;
}

/** The date the residency-duration requirement (5 or 3 years) is met — the applicant's "anniversary." */
export function eligibilityAnniversaryDate(greenCardDate: Date, basis: EligibilityBasis): Date {
  const years = continuousResidenceRequiredYears(basis);
  const result = new Date(greenCardDate);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/** USCIS allows filing up to 90 days before the anniversary date. */
export function earliestFilingDate(anniversaryDate: Date): Date {
  const result = new Date(anniversaryDate);
  result.setDate(result.getDate() - 90);
  return result;
}

export type ContinuousResidenceRisk = "none" | "review" | "likely_broken";

/**
 * USCIS treats a single absence of 180 days (~6 months) to 1 year as a
 * REBUTTABLE presumption of broken continuous residence — not automatic
 * disqualification, but real risk requiring evidence to overcome. An
 * absence of 1 year (365 days) or more generally breaks continuous
 * residence outright, absent a preserved-residence filing (Form N-470)
 * this tool has no way to verify was made. Both thresholds are reported
 * as risk levels, never as an automatic rejection.
 */
export function assessContinuousResidenceRisk(trips: Trip[]): { risk: ContinuousResidenceRisk; longestTrip: number } {
  const longest = longestTripDays(trips);
  if (longest >= 365) return { risk: "likely_broken", longestTrip: longest };
  if (longest >= 180) return { risk: "review", longestTrip: longest };
  return { risk: "none", longestTrip: longest };
}

/**
 * Selective Service applies to males who were lawful permanent residents
 * in the U.S. at any point between ages 18–25. Someone who entered the
 * U.S. after their 18th birthday gets 30 days from entry rather than 30
 * days from turning 18 — verified via sss.gov and multiple corroborating
 * sources — but that entry-timing nuance doesn't change WHETHER
 * registration applies overall, only the exact deadline, so it isn't
 * modeled here; this only determines applicability, matching Step 5's
 * "collect registration status only when relevant."
 *
 * isMale is a transient wizard input, not a stored field — see the
 * schema comment on EligibilityCalculation for why.
 */
/** Applicants must be 18+ to file Form N-400 — a categorical requirement independent of how the residency math works out. */
export function isUnder18Now(birthDate: Date): boolean {
  const age18Date = new Date(birthDate);
  age18Date.setFullYear(age18Date.getFullYear() + 18);
  return new Date() < age18Date;
}

export function selectiveServiceRequired(birthDate: Date, greenCardDate: Date, isMale: boolean): boolean {
  if (!isMale) return false;
  const age18Date = new Date(birthDate);
  age18Date.setFullYear(age18Date.getFullYear() + 18);
  const age26Date = new Date(birthDate);
  age26Date.setFullYear(age26Date.getFullYear() + 26);
  // Required if the 18–26 window overlaps at all with having been an LPR
  // in the U.S. — i.e., the green card date is before turning 26, and
  // "now" (evaluated at calculation time) is after turning 18.
  const now = new Date();
  return greenCardDate < age26Date && now >= age18Date;
}

/**
 * Warning/recommendation codes rather than raw strings — this module
 * stays pure and language-agnostic; the results UI maps each code to
 * i18n dictionary text. Storing codes (not sentences) in the database's
 * `warnings` JSON column is also the more durable choice for a field
 * that outlives any single phrasing.
 */
export type WarningCode =
  | "LONG_ABSENCE_REVIEW" // 180-364 day single trip
  | "LONG_ABSENCE_LIKELY_BROKEN" // 365+ day single trip
  | "PHYSICAL_PRESENCE_SHORTFALL" // projected days outside exceed what's allowed
  | "MILITARY_REVIEW_REQUIRED" // basis = MILITARY, always shown
  | "SELECTIVE_SERVICE_NOT_REGISTERED" // required but not registered
  | "SELECTIVE_SERVICE_UNKNOWN" // required, registration status not provided
  | "UNDER_18" // categorically can't file yet, regardless of residency math
  | "GOOD_MORAL_CHARACTER_CONCERN" // applicant flagged a possible concern
  | "STATE_RESIDENCY_SHORTFALL"; // hasn't lived in the filing state for the required 3 months

/**
 * Shared by calculateEligibility() and the later re-derivation path when
 * viewing a saved record — kept as one function so both always agree,
 * rather than two copies of the same formula that could drift apart.
 * Deliberately a live calculation based on Date.now() every time it
 * runs, not a value that gets frozen at creation time: "how ready are
 * you NOW" should reflect today's date even weeks after the original
 * calculation, not the date it was first run.
 */
export function computeReadinessScore(params: {
  greenCardDate: Date;
  eligibilityDate: Date;
  continuousResidenceRisk: ContinuousResidenceRisk;
  physicalPresenceShortfall: boolean;
  selectiveServiceRequired: boolean;
  selectiveServiceRegisteredAnswer: boolean | null;
}): number {
  const totalPeriodMs = params.eligibilityDate.getTime() - params.greenCardDate.getTime();
  const elapsedMs = Date.now() - params.greenCardDate.getTime();
  let score = Math.min(100, Math.max(0, (elapsedMs / totalPeriodMs) * 100));
  if (params.continuousResidenceRisk === "review") score -= 15;
  if (params.continuousResidenceRisk === "likely_broken") score -= 40;
  if (params.physicalPresenceShortfall) score -= 20;
  if (params.selectiveServiceRequired && params.selectiveServiceRegisteredAnswer !== true) score -= 15;
  return Math.round(Math.min(100, Math.max(0, score)));
}

export type RecommendationCode =
  | "BEGIN_CIVICS_STUDY"
  | "START_INTERVIEW_PRACTICE"
  | "GATHER_TRAVEL_DOCS"
  | "REVIEW_SELECTIVE_SERVICE"
  | "CONSULT_USCIS_MILITARY"
  | "WAIT_FOR_ELIGIBILITY_DATE"
  | "GATHER_MARRIAGE_DOCS";

/**
 * Derives recommendations from already-known outputs rather than raw
 * wizard inputs — deliberately, so this same function works both right
 * after calculateEligibility() runs AND later, when viewing a saved
 * record where only outputs (not every original input) were persisted.
 * In particular, this never needs `isMale`: that input isn't invertible
 * from the stored `selectiveServiceRequired` boolean (a male who aged
 * out of the registration window produces the same `false` as someone
 * who isn't male at all), so recommendations logic is written to never
 * require reconstructing it.
 */
export function deriveRecommendations(params: {
  basis: EligibilityBasis;
  isEligibleNow: boolean;
  continuousResidenceRisk: ContinuousResidenceRisk;
  selectiveServiceRequired: boolean;
  selectiveServiceRegisteredAnswer: boolean | null;
}): RecommendationCode[] {
  if (params.basis === "MILITARY") {
    return ["CONSULT_USCIS_MILITARY", "BEGIN_CIVICS_STUDY"];
  }
  const recommendations: RecommendationCode[] = [];
  if (params.isEligibleNow) {
    recommendations.push("BEGIN_CIVICS_STUDY", "START_INTERVIEW_PRACTICE");
  } else {
    recommendations.push("WAIT_FOR_ELIGIBILITY_DATE");
  }
  if (params.continuousResidenceRisk !== "none") recommendations.push("GATHER_TRAVEL_DOCS");
  if (params.selectiveServiceRequired && params.selectiveServiceRegisteredAnswer !== true) {
    recommendations.push("REVIEW_SELECTIVE_SERVICE");
  }
  if (params.basis === "MARRIED_TO_CITIZEN") recommendations.push("GATHER_MARRIAGE_DOCS");
  return recommendations;
}

export interface EligibilityInput {
  basis: EligibilityBasis;
  greenCardDate: Date;
  birthDate: Date | null;
  marriedToUSCitizen: boolean;
  spouseIsUSCitizen: boolean;
  trips: Trip[];
  isMale: boolean; // transient wizard input, never persisted on its own
  selectiveServiceRegisteredAnswer: boolean | null; // null = not yet answered
  goodMoralCharacterConcern: boolean | null; // null = not yet answered
  livedInStateThreeMonths: boolean | null; // null = not yet answered
}

export interface EligibilityResult {
  isMilitaryPath: boolean;
  requiredResidencyYears: number;
  eligibilityDate: Date;
  earliestFilingDate: Date;
  physicalPresenceDaysReq: number;
  physicalPresenceDaysActual: number;
  totalDaysOutsideUS: number;
  longestTripDays: number;
  continuousResidenceOk: boolean;
  continuousResidenceRisk: ContinuousResidenceRisk;
  selectiveServiceRequired: boolean;
  isEligibleNow: boolean;
  readinessScore: number; // 0-100, a heuristic estimate, never presented as a legal conclusion
  warnings: WarningCode[];
  recommendations: RecommendationCode[];
}

/**
 * The full calculation. Deliberately returns early with a minimal,
 * non-numeric result for the military path — see the schema comment on
 * EligibilityCalculation for why this tool doesn't attempt to calculate
 * an eligibility date through INA 328/329.
 */
export function calculateEligibility(input: EligibilityInput): EligibilityResult {
  if (input.basis === "MILITARY") {
    return {
      isMilitaryPath: true,
      requiredResidencyYears: 0,
      eligibilityDate: input.greenCardDate,
      earliestFilingDate: input.greenCardDate,
      physicalPresenceDaysReq: 0,
      physicalPresenceDaysActual: 0,
      totalDaysOutsideUS: totalDaysOutsideUS(input.trips),
      longestTripDays: longestTripDays(input.trips),
      continuousResidenceOk: true,
      continuousResidenceRisk: "none",
      selectiveServiceRequired: false,
      isEligibleNow: false,
      readinessScore: 0,
      warnings: ["MILITARY_REVIEW_REQUIRED"],
      recommendations: deriveRecommendations({
        basis: "MILITARY",
        isEligibleNow: false,
        continuousResidenceRisk: "none",
        selectiveServiceRequired: false,
        selectiveServiceRegisteredAnswer: null,
      }),
    };
  }

  const requiredYears = continuousResidenceRequiredYears(input.basis);
  const eligDate = eligibilityAnniversaryDate(input.greenCardDate, input.basis);
  const filingDate = earliestFilingDate(eligDate);
  const daysOutside = totalDaysOutsideUS(input.trips);
  const presenceReq = physicalPresenceRequiredDays(input.basis);
  const presenceActual = physicalPresenceDays(input.greenCardDate, input.basis, daysOutside);
  const { risk, longestTrip } = assessContinuousResidenceRisk(input.trips);
  const continuousOk = risk !== "likely_broken";

  const ssRequired = input.birthDate ? selectiveServiceRequired(input.birthDate, input.greenCardDate, input.isMale) : false;

  const isUnder18 = input.birthDate ? isUnder18Now(input.birthDate) : false;

  const warnings: WarningCode[] = [];
  if (risk === "review") warnings.push("LONG_ABSENCE_REVIEW");
  if (risk === "likely_broken") warnings.push("LONG_ABSENCE_LIKELY_BROKEN");
  if (presenceActual < presenceReq) warnings.push("PHYSICAL_PRESENCE_SHORTFALL");
  if (ssRequired && input.selectiveServiceRegisteredAnswer === false) warnings.push("SELECTIVE_SERVICE_NOT_REGISTERED");
  if (ssRequired && input.selectiveServiceRegisteredAnswer === null) warnings.push("SELECTIVE_SERVICE_UNKNOWN");
  if (isUnder18) warnings.push("UNDER_18");
  if (input.goodMoralCharacterConcern === true) warnings.push("GOOD_MORAL_CHARACTER_CONCERN");
  if (input.livedInStateThreeMonths === false) warnings.push("STATE_RESIDENCY_SHORTFALL");

  const now = new Date();
  const isEligibleNow = now >= eligDate && continuousOk && presenceActual >= presenceReq && !isUnder18;

  const recommendations = deriveRecommendations({
    basis: input.basis,
    isEligibleNow,
    continuousResidenceRisk: risk,
    selectiveServiceRequired: ssRequired,
    selectiveServiceRegisteredAnswer: input.selectiveServiceRegisteredAnswer,
  });

  // A transparent, heuristic estimate — never framed as a legal
  // conclusion.
  const readinessScore = computeReadinessScore({
    greenCardDate: input.greenCardDate,
    eligibilityDate: eligDate,
    continuousResidenceRisk: risk,
    physicalPresenceShortfall: presenceActual < presenceReq,
    selectiveServiceRequired: ssRequired,
    selectiveServiceRegisteredAnswer: input.selectiveServiceRegisteredAnswer,
  });

  return {
    isMilitaryPath: false,
    requiredResidencyYears: requiredYears,
    eligibilityDate: eligDate,
    earliestFilingDate: filingDate,
    physicalPresenceDaysReq: presenceReq,
    physicalPresenceDaysActual: presenceActual,
    totalDaysOutsideUS: daysOutside,
    longestTripDays: longestTrip,
    continuousResidenceOk: continuousOk,
    continuousResidenceRisk: risk,
    selectiveServiceRequired: ssRequired,
    isEligibleNow,
    readinessScore,
    warnings,
    recommendations,
  };
}
