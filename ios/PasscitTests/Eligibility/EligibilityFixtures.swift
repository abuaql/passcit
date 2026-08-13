import Foundation
@testable import Passcit

/// Small builders for Eligibility model fixtures. Not a @Test/@Suite itself.
enum EligibilityFixtures {
    static func result(
        isMilitaryPath: Bool = false,
        requiredResidencyYears: Int = 5,
        readinessScore: Int = 72,
        isEligibleNow: Bool = false,
        continuousResidenceRisk: ContinuousResidenceRisk = .none,
        warnings: [EligibilityWarningCode] = [],
        recommendations: [EligibilityRecommendationCode] = [.waitForEligibilityDate]
    ) -> EligibilityResult {
        EligibilityResult(
            isMilitaryPath: isMilitaryPath,
            requiredResidencyYears: requiredResidencyYears,
            eligibilityDate: Date(timeIntervalSince1970: 1_800_000_000),
            earliestFilingDate: Date(timeIntervalSince1970: 1_792_224_000),
            physicalPresenceDaysReq: 913,
            physicalPresenceDaysActual: 850,
            totalDaysOutsideUS: 40,
            longestTripDays: 20,
            continuousResidenceOk: true,
            continuousResidenceRisk: continuousResidenceRisk,
            selectiveServiceRequired: false,
            isEligibleNow: isEligibleNow,
            readinessScore: readinessScore,
            warnings: warnings,
            recommendations: recommendations
        )
    }

    static func submitResponse(id: String = "elig_1", result: EligibilityResult? = nil) -> SubmitEligibilityResponse {
        SubmitEligibilityResponse(id: id, result: result ?? Self.result())
    }

    static func calculation(id: String = "elig_1", state: String = "CA", result: EligibilityResult? = nil) -> EligibilityCalculation {
        EligibilityCalculation(
            id: id,
            state: state,
            createdAt: Date(timeIntervalSince1970: 1_700_000_000),
            greenCardDate: Date(timeIntervalSince1970: 1_600_000_000),
            result: result ?? Self.result()
        )
    }

    static func requestBody(
        basis: EligibilityBasis = .general,
        trips: [EligibilityTrip] = []
    ) -> EligibilityRequestBody {
        EligibilityRequestBody(
            basis: basis,
            greenCardDate: Date(timeIntervalSince1970: 1_600_000_000),
            state: "CA",
            birthDate: Date(timeIntervalSince1970: 500_000_000),
            marriedToUSCitizen: basis == .marriedToCitizen,
            spouseIsUSCitizen: basis == .marriedToCitizen,
            trips: trips,
            isMale: true,
            selectiveServiceRegisteredAnswer: nil,
            goodMoralCharacterConcern: nil,
            livedInStateThreeMonths: nil,
            militaryCountryServed: basis == .military ? "USA" : nil,
            militaryServiceType: basis == .military ? .voluntary : nil,
            militaryServiceStart: nil,
            militaryServiceEnd: nil,
            militaryCurrentlyServing: basis == .military ? true : nil,
            militaryUSArmedForces: basis == .military ? true : nil
        )
    }
}
