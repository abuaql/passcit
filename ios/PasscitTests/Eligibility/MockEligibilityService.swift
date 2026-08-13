import Foundation
@testable import Passcit

/// Test double for EligibilityServicing — lets EligibilityViewModel
/// (Stage 14B) be tested against canned responses/errors without a live
/// server. Not a @Test/@Suite itself.
final class MockEligibilityService: EligibilityServicing {
    var submitResult: Result<SubmitEligibilityResponse, Error> = .failure(TestSetupError.notConfigured)
    var fetchResult: Result<EligibilityCalculation, Error> = .failure(TestSetupError.notConfigured)

    private(set) var submitCallCount = 0
    private(set) var lastSubmittedRequest: EligibilityRequestBody?
    private(set) var fetchCallCount = 0
    private(set) var lastFetchedId: String?

    enum TestSetupError: Error {
        case notConfigured
    }

    func submitCalculation(_ request: EligibilityRequestBody) async throws -> SubmitEligibilityResponse {
        submitCallCount += 1
        lastSubmittedRequest = request
        return try submitResult.get()
    }

    func fetchCalculation(id: String) async throws -> EligibilityCalculation {
        fetchCallCount += 1
        lastFetchedId = id
        return try fetchResult.get()
    }
}
