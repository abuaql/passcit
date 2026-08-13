import Foundation

struct PracticeServiceError: Error, Equatable {
    let message: String
}

// Protocol seam mirroring LearnService, so PracticeViewModel can be
// tested against mocked responses without a live server.
protocol PracticeServicing {
    func ensureActive2025TestVersion() async throws -> String
    func startPracticeTest(mode: PracticeMode, category: QuestionCategory?) async throws -> StartPracticeTestResponse
    func completePracticeTest(testId: String, answers: [SubmittedPracticeAnswer], stoppedEarly: Bool) async throws -> PracticeTestResult
}

struct PracticeService: PracticeServicing {
    let apiClient: APIClient

    // The official USCIS test currently in effect — Practice always
    // targets this, never the backend's isDefault TestVersion (2008).
    static let targetTestVersionSlug = "2025"

    private struct SetActiveTestVersionRequestBody: Encodable {
        let testVersionId: String
    }

    // POST /api/practice-tests has no per-request testVersionId — it
    // always resolves via the backend's own getActiveTestVersion(userId),
    // which reads User.activeTestVersionId. Explicit 2025 targeting is
    // only possible by setting that field first, via the existing
    // /api/user/active-test-version route.
    func ensureActive2025TestVersion() async throws -> String {
        let response = try await apiClient.send(APIEndpoint(path: "/api/test-versions", method: .get), as: TestVersionsResponse.self)
        guard let match = response.testVersions.first(where: { $0.slug == Self.targetTestVersionSlug }) else {
            throw PracticeServiceError(message: "The current civics test content isn't available right now.")
        }
        let endpoint = APIEndpoint(
            path: "/api/user/active-test-version",
            method: .post,
            body: SetActiveTestVersionRequestBody(testVersionId: match.id)
        )
        _ = try await apiClient.send(endpoint, as: SetActiveTestVersionResponse.self)
        return match.id
    }

    func startPracticeTest(mode: PracticeMode, category: QuestionCategory?) async throws -> StartPracticeTestResponse {
        let endpoint = APIEndpoint(
            path: "/api/practice-tests",
            method: .post,
            body: StartPracticeTestRequestBody(mode: mode.rawValue, category: category?.rawValue)
        )
        return try await apiClient.send(endpoint, as: StartPracticeTestResponse.self)
    }

    func completePracticeTest(testId: String, answers: [SubmittedPracticeAnswer], stoppedEarly: Bool) async throws -> PracticeTestResult {
        let endpoint = APIEndpoint(
            path: "/api/practice-tests/\(testId)/complete",
            method: .post,
            body: CompletePracticeTestRequestBody(answers: answers, stoppedEarly: stoppedEarly)
        )
        return try await apiClient.send(endpoint, as: PracticeTestResult.self)
    }
}
