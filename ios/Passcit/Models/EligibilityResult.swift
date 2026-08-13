import Foundation

// Matches src/lib/eligibility.ts's EligibilityBasis/EligibilityResult exactly.
// The server is the sole source of truth for every calculation here —
// this client never computes eligibility, readiness, or risk itself.
enum EligibilityBasis: String, Codable, Equatable, CaseIterable {
    case general = "GENERAL"
    case marriedToCitizen = "MARRIED_TO_CITIZEN"
    case military = "MILITARY"
}

enum MilitaryServiceType: String, Codable, Equatable, CaseIterable {
    case mandatory = "MANDATORY"
    case voluntary = "VOLUNTARY"
}

enum ContinuousResidenceRisk: String, Codable, Equatable {
    case none
    case review
    case likelyBroken = "likely_broken"
}

// Codes, not sentences — the server keeps this language-agnostic and so
// do we; the UI maps each code to display text.
enum EligibilityWarningCode: String, Codable, Equatable {
    case longAbsenceReview = "LONG_ABSENCE_REVIEW"
    case longAbsenceLikelyBroken = "LONG_ABSENCE_LIKELY_BROKEN"
    case physicalPresenceShortfall = "PHYSICAL_PRESENCE_SHORTFALL"
    case militaryReviewRequired = "MILITARY_REVIEW_REQUIRED"
    case selectiveServiceNotRegistered = "SELECTIVE_SERVICE_NOT_REGISTERED"
    case selectiveServiceUnknown = "SELECTIVE_SERVICE_UNKNOWN"
    case under18 = "UNDER_18"
    case goodMoralCharacterConcern = "GOOD_MORAL_CHARACTER_CONCERN"
    case stateResidencyShortfall = "STATE_RESIDENCY_SHORTFALL"
}

enum EligibilityRecommendationCode: String, Codable, Equatable {
    case beginCivicsStudy = "BEGIN_CIVICS_STUDY"
    case startInterviewPractice = "START_INTERVIEW_PRACTICE"
    case gatherTravelDocs = "GATHER_TRAVEL_DOCS"
    case reviewSelectiveService = "REVIEW_SELECTIVE_SERVICE"
    case consultUSCISMilitary = "CONSULT_USCIS_MILITARY"
    case waitForEligibilityDate = "WAIT_FOR_ELIGIBILITY_DATE"
    case gatherMarriageDocs = "GATHER_MARRIAGE_DOCS"
}

// This is always the server's own EligibilityResult, decoded verbatim —
// readinessScore, warnings, and recommendations are never recomputed or
// second-guessed client-side, matching Interview's server-authoritative
// grading precedent.
struct EligibilityResult: Codable, Equatable {
    let isMilitaryPath: Bool
    let requiredResidencyYears: Int
    let eligibilityDate: Date
    let earliestFilingDate: Date
    let physicalPresenceDaysReq: Int
    let physicalPresenceDaysActual: Int
    let totalDaysOutsideUS: Int
    let longestTripDays: Int
    let continuousResidenceOk: Bool
    let continuousResidenceRisk: ContinuousResidenceRisk
    let selectiveServiceRequired: Bool
    let isEligibleNow: Bool
    let readinessScore: Int
    let warnings: [EligibilityWarningCode]
    let recommendations: [EligibilityRecommendationCode]
}

// POST /api/eligibility
struct SubmitEligibilityResponse: Decodable, Equatable {
    let id: String
    let result: EligibilityResult
}

// GET /api/eligibility/:id — readinessScore/isEligibleNow inside `result`
// are live-recomputed server-side against today's date, not frozen at
// creation time.
struct EligibilityCalculation: Decodable, Equatable, Identifiable {
    let id: String
    let state: String
    let createdAt: Date
    let greenCardDate: Date
    let result: EligibilityResult
}
