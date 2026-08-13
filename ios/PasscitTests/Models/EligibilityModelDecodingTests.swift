import Testing
import Foundation
@testable import Passcit

@Suite("Eligibility model decoding/encoding")
struct EligibilityModelDecodingTests {

    private func makeDecoder() -> JSONDecoder {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { fieldDecoder in
            let container = try fieldDecoder.singleValueContainer()
            let string = try container.decode(String.self)
            guard let date = formatter.date(from: string) else {
                throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid ISO8601 date: \(string)")
            }
            return date
        }
        return decoder
    }

    @Test func decodesSubmitResponseForTheGeneralPath() throws {
        let json = """
        {
            "id": "elig_abc123",
            "result": {
                "isMilitaryPath": false,
                "requiredResidencyYears": 5,
                "eligibilityDate": "2027-03-01T00:00:00.000Z",
                "earliestFilingDate": "2026-12-01T00:00:00.000Z",
                "physicalPresenceDaysReq": 913,
                "physicalPresenceDaysActual": 850,
                "totalDaysOutsideUS": 63,
                "longestTripDays": 40,
                "continuousResidenceOk": true,
                "continuousResidenceRisk": "none",
                "selectiveServiceRequired": false,
                "isEligibleNow": false,
                "readinessScore": 68,
                "warnings": ["PHYSICAL_PRESENCE_SHORTFALL"],
                "recommendations": ["WAIT_FOR_ELIGIBILITY_DATE", "GATHER_TRAVEL_DOCS"]
            }
        }
        """.data(using: .utf8)!

        let response = try makeDecoder().decode(SubmitEligibilityResponse.self, from: json)

        #expect(response.id == "elig_abc123")
        #expect(response.result.isMilitaryPath == false)
        #expect(response.result.requiredResidencyYears == 5)
        #expect(response.result.readinessScore == 68)
        #expect(response.result.continuousResidenceRisk == .none)
        #expect(response.result.warnings == [.physicalPresenceShortfall])
        #expect(response.result.recommendations == [.waitForEligibilityDate, .gatherTravelDocs])
    }

    @Test func decodesTheMilitaryPathMinimalResult() throws {
        let json = """
        {
            "id": "elig_mil1",
            "result": {
                "isMilitaryPath": true,
                "requiredResidencyYears": 0,
                "eligibilityDate": "2020-01-01T00:00:00.000Z",
                "earliestFilingDate": "2020-01-01T00:00:00.000Z",
                "physicalPresenceDaysReq": 0,
                "physicalPresenceDaysActual": 0,
                "totalDaysOutsideUS": 12,
                "longestTripDays": 12,
                "continuousResidenceOk": true,
                "continuousResidenceRisk": "none",
                "selectiveServiceRequired": false,
                "isEligibleNow": false,
                "readinessScore": 0,
                "warnings": ["MILITARY_REVIEW_REQUIRED"],
                "recommendations": ["CONSULT_USCIS_MILITARY", "BEGIN_CIVICS_STUDY"]
            }
        }
        """.data(using: .utf8)!

        let response = try makeDecoder().decode(SubmitEligibilityResponse.self, from: json)

        #expect(response.result.isMilitaryPath == true)
        #expect(response.result.warnings == [.militaryReviewRequired])
        #expect(response.result.recommendations == [.consultUSCISMilitary, .beginCivicsStudy])
    }

    @Test func decodesLikelyBrokenContinuousResidenceRisk() throws {
        let json = """
        {
            "isMilitaryPath": false, "requiredResidencyYears": 3,
            "eligibilityDate": "2026-06-01T00:00:00.000Z", "earliestFilingDate": "2026-03-01T00:00:00.000Z",
            "physicalPresenceDaysReq": 548, "physicalPresenceDaysActual": 400,
            "totalDaysOutsideUS": 380, "longestTripDays": 380,
            "continuousResidenceOk": false, "continuousResidenceRisk": "likely_broken",
            "selectiveServiceRequired": false, "isEligibleNow": false, "readinessScore": 15,
            "warnings": ["LONG_ABSENCE_LIKELY_BROKEN", "PHYSICAL_PRESENCE_SHORTFALL"],
            "recommendations": ["GATHER_TRAVEL_DOCS", "GATHER_MARRIAGE_DOCS"]
        }
        """.data(using: .utf8)!

        let result = try makeDecoder().decode(EligibilityResult.self, from: json)

        #expect(result.continuousResidenceRisk == .likelyBroken)
        #expect(result.warnings.contains(.longAbsenceLikelyBroken))
    }

    @Test func decodesGetCalculationResponse() throws {
        let json = """
        {
            "id": "elig_xyz",
            "state": "TX",
            "createdAt": "2026-01-15T10:30:00.000Z",
            "greenCardDate": "2021-01-15T00:00:00.000Z",
            "result": {
                "isMilitaryPath": false, "requiredResidencyYears": 5,
                "eligibilityDate": "2026-01-15T00:00:00.000Z", "earliestFilingDate": "2025-10-17T00:00:00.000Z",
                "physicalPresenceDaysReq": 913, "physicalPresenceDaysActual": 913,
                "totalDaysOutsideUS": 0, "longestTripDays": 0,
                "continuousResidenceOk": true, "continuousResidenceRisk": "none",
                "selectiveServiceRequired": false, "isEligibleNow": true, "readinessScore": 100,
                "warnings": [], "recommendations": ["BEGIN_CIVICS_STUDY", "START_INTERVIEW_PRACTICE"]
            }
        }
        """.data(using: .utf8)!

        let calculation = try makeDecoder().decode(EligibilityCalculation.self, from: json)

        #expect(calculation.id == "elig_xyz")
        #expect(calculation.state == "TX")
        #expect(calculation.result.isEligibleNow == true)
        #expect(calculation.result.readinessScore == 100)
        #expect(calculation.result.warnings.isEmpty)
    }

    // MARK: Request-body encoding

    @Test func encodingSendsExplicitNullForNullableFieldsRatherThanOmittingThem() throws {
        let body = EligibilityFixtures.requestBody(basis: .general)
        let data = try JSONEncoder().encode(body)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        #expect(object?.keys.contains("selectiveServiceRegisteredAnswer") == true, "nullable field must be present")
        #expect(object?["selectiveServiceRegisteredAnswer"] is NSNull, "nil nullable field must serialize as null, not be omitted")
        #expect(object?.keys.contains("goodMoralCharacterConcern") == true)
        #expect(object?["goodMoralCharacterConcern"] is NSNull)
        #expect(object?.keys.contains("livedInStateThreeMonths") == true)
        #expect(object?["livedInStateThreeMonths"] is NSNull)
    }

    @Test func encodingOmitsOptionalMilitaryFieldsWhenNilForANonMilitaryBasis() throws {
        let body = EligibilityFixtures.requestBody(basis: .general)
        let data = try JSONEncoder().encode(body)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        #expect(object?.keys.contains("militaryCountryServed") == false, "optional field must be omitted, not sent as null")
        #expect(object?.keys.contains("militaryServiceType") == false)
    }

    @Test func encodingIncludesOptionalMilitaryFieldsWhenPresentForTheMilitaryBasis() throws {
        let body = EligibilityFixtures.requestBody(basis: .military)
        let data = try JSONEncoder().encode(body)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        #expect(object?["militaryCountryServed"] as? String == "USA")
        #expect(object?["militaryServiceType"] as? String == "VOLUNTARY")
        #expect(object?["basis"] as? String == "MILITARY")
    }

    @Test func encodingFormatsDatesAsISO8601StringsNotRawNumbers() throws {
        let body = EligibilityFixtures.requestBody()
        let data = try JSONEncoder().encode(body)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        let greenCardDate = try #require(object?["greenCardDate"] as? String)
        #expect(greenCardDate.contains("T"), "must be an ISO8601 string, not a raw timestamp number")
        #expect(ISO8601DateFormatter().date(from: greenCardDate.replacingOccurrences(of: ".000Z", with: "Z")) != nil || greenCardDate.hasSuffix("Z"))
    }

    @Test func encodingSerializesTripsAsAnArrayOfDepartReturnDateStrings() throws {
        let trip = EligibilityTrip(departDate: Date(timeIntervalSince1970: 1_600_000_000), returnDate: Date(timeIntervalSince1970: 1_600_500_000))
        let body = EligibilityFixtures.requestBody(trips: [trip])
        let data = try JSONEncoder().encode(body)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let trips = try #require(object?["trips"] as? [[String: Any]])

        #expect(trips.count == 1)
        #expect((trips[0]["departDate"] as? String)?.contains("T") == true)
        #expect((trips[0]["returnDate"] as? String)?.contains("T") == true)
        #expect(trips[0]["id"] == nil, "the UI-only trip identity must never be sent to the server")
    }
}
