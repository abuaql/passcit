import Foundation

// Thrown by resolveTargetTestVersionId when the backend has no
// TestVersion matching `targetTestVersionSlug` — distinct from
// APIClientError since it's a content-availability problem, not a
// networking one.
struct LearnServiceError: Error, Equatable {
    let message: String
}

// A protocol seam (unlike DashboardService, which talks to the concrete
// APIClient actor directly) so Learn's ViewModels can be tested against
// mocked responses without a live server, per this phase's own testing
// requirement — there's no other seam like this in the app yet.
protocol LearnServicing {
    func resolveTargetTestVersionId() async throws -> String
    func fetchRoadmap(testVersionId: String) async throws -> Roadmap
    func fetchUnit(id: String) async throws -> UnitDetail
    func fetchLesson(id: String) async throws -> LessonDetail
    func completeLesson(id: String) async throws -> CompleteLessonResponse
    func startUnitExam(unitId: String) async throws -> StartExamResponse
    func completeUnitExam(unitId: String, attemptId: String, answers: [SubmittedAnswer]) async throws -> CompleteExamResponse
}

struct LearnService: LearnServicing {
    let apiClient: APIClient

    // The official USCIS test currently in effect — Learn always targets
    // this by slug-resolved id, never the backend's isDefault TestVersion
    // (which remains "2008").
    static let targetTestVersionSlug = "2025"

    func resolveTargetTestVersionId() async throws -> String {
        let response = try await apiClient.send(APIEndpoint(path: "/api/test-versions", method: .get), as: TestVersionsResponse.self)
        guard let match = response.testVersions.first(where: { $0.slug == Self.targetTestVersionSlug }) else {
            throw LearnServiceError(message: "The current civics test content isn't available right now.")
        }
        return match.id
    }

    func fetchRoadmap(testVersionId: String) async throws -> Roadmap {
        let endpoint = APIEndpoint(
            path: "/api/roadmap",
            method: .get,
            queryItems: [URLQueryItem(name: "testVersionId", value: testVersionId)]
        )
        return try await apiClient.send(endpoint, as: RoadmapResponse.self).roadmap
    }

    func fetchUnit(id: String) async throws -> UnitDetail {
        try await apiClient.send(APIEndpoint(path: "/api/units/\(id)", method: .get), as: UnitDetailResponse.self).unit
    }

    func fetchLesson(id: String) async throws -> LessonDetail {
        try await apiClient.send(APIEndpoint(path: "/api/lessons/\(id)", method: .get), as: LessonResponse.self).lesson
    }

    func completeLesson(id: String) async throws -> CompleteLessonResponse {
        try await apiClient.send(APIEndpoint(path: "/api/lessons/\(id)/complete", method: .post), as: CompleteLessonResponse.self)
    }

    func startUnitExam(unitId: String) async throws -> StartExamResponse {
        try await apiClient.send(APIEndpoint(path: "/api/units/\(unitId)/exam/start", method: .post), as: StartExamResponse.self)
    }

    func completeUnitExam(unitId: String, attemptId: String, answers: [SubmittedAnswer]) async throws -> CompleteExamResponse {
        let endpoint = APIEndpoint(
            path: "/api/units/\(unitId)/exam/\(attemptId)/complete",
            method: .post,
            body: CompleteExamRequestBody(answers: answers)
        )
        return try await apiClient.send(endpoint, as: CompleteExamResponse.self)
    }
}
