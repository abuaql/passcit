import Foundation

// Protocol seam mirroring LearnService/PracticeService/InterviewService,
// so EligibilityViewModel (Stage 14B) can be tested against mocked
// responses without a live server.
protocol EligibilityServicing {
    func submitCalculation(_ request: EligibilityRequestBody) async throws -> SubmitEligibilityResponse
    func fetchCalculation(id: String) async throws -> EligibilityCalculation
}

struct EligibilityService: EligibilityServicing {
    let apiClient: APIClient

    func submitCalculation(_ request: EligibilityRequestBody) async throws -> SubmitEligibilityResponse {
        let endpoint = APIEndpoint(path: "/api/eligibility", method: .post, body: request)
        return try await apiClient.send(endpoint, as: SubmitEligibilityResponse.self)
    }

    func fetchCalculation(id: String) async throws -> EligibilityCalculation {
        try await apiClient.send(APIEndpoint(path: "/api/eligibility/\(id)", method: .get), as: EligibilityCalculation.self)
    }
}
