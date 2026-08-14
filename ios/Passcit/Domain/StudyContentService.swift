import Foundation

// Protocol seam mirroring LearnService/PracticeService/QuestionsService, so
// StudyPanelViewModel/StudyLanguageStore can be tested against mocked
// responses without a live server.
protocol StudyContentServicing {
    func fetchStudyContent(questionId: String, kind: StudyContentKind, language: StudyLanguage) async throws -> StudyContentResponse
    func setStudyLanguage(_ language: StudyLanguage) async throws
    func recordStudyAction(questionId: String, action: StudyActionKind, language: StudyLanguage) async
}

struct StudyContentService: StudyContentServicing {
    let apiClient: APIClient

    private struct StudyContentRequestBody: Encodable {
        let type: String
        let language: String
    }

    private struct StudyLanguageRequestBody: Encodable {
        let language: String
    }

    private struct StudyLanguageResponse: Codable {
        let language: String
    }

    private struct StudyEventRequestBody: Encodable {
        let questionId: String
        let action: String
        let language: String
    }

    func fetchStudyContent(questionId: String, kind: StudyContentKind, language: StudyLanguage) async throws -> StudyContentResponse {
        let endpoint = APIEndpoint(
            path: "/api/questions/\(questionId)/study",
            method: .post,
            body: StudyContentRequestBody(type: kind.rawValue, language: language.rawValue)
        )
        return try await apiClient.send(endpoint, as: StudyContentResponse.self)
    }

    func setStudyLanguage(_ language: StudyLanguage) async throws {
        let endpoint = APIEndpoint(
            path: "/api/user/study-language",
            method: .patch,
            body: StudyLanguageRequestBody(language: language.rawValue)
        )
        _ = try await apiClient.send(endpoint, as: StudyLanguageResponse.self)
    }

    // Fire-and-forget analytics, matching the backend's own contract (always
    // 204, even on failure) — never surfaced to the user, never retried.
    func recordStudyAction(questionId: String, action: StudyActionKind, language: StudyLanguage) async {
        let endpoint = APIEndpoint(
            path: "/api/study-events",
            method: .post,
            body: StudyEventRequestBody(questionId: questionId, action: action.rawValue, language: language.rawValue)
        )
        _ = try? await apiClient.send(endpoint)
    }
}
