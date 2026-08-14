import Foundation

// Protocol seam mirroring LearnService/PracticeService, so
// FlashcardDeckViewModel can be tested against mocked responses without a
// live server.
protocol QuestionsServicing {
    func listQuestions(category: QuestionCategory?, favoritesOnly: Bool) async throws -> [QuestionSummary]
    func getQuestion(id: String) async throws -> QuestionDetail
    func toggleFavorite(questionId: String) async throws -> Bool
    func setStudyStatus(questionId: String, status: StudyStatus) async throws
}

struct QuestionsService: QuestionsServicing {
    let apiClient: APIClient

    private struct SetStudyStatusRequestBody: Encodable {
        let questionId: String
        let status: String
    }

    private struct ToggleFavoriteResponse: Codable {
        let isFavorite: Bool
    }

    private struct SetStudyStatusResponse: Codable {
        let ok: Bool
    }

    func listQuestions(category: QuestionCategory? = nil, favoritesOnly: Bool = false) async throws -> [QuestionSummary] {
        var queryItems: [URLQueryItem] = []
        if let category {
            queryItems.append(URLQueryItem(name: "category", value: category.rawValue))
        }
        if favoritesOnly {
            queryItems.append(URLQueryItem(name: "favoritesOnly", value: "true"))
        }
        let endpoint = APIEndpoint(path: "/api/questions", method: .get, queryItems: queryItems)
        return try await apiClient.send(endpoint, as: QuestionsListResponse.self).questions
    }

    func getQuestion(id: String) async throws -> QuestionDetail {
        try await apiClient.send(APIEndpoint(path: "/api/questions/\(id)", method: .get), as: QuestionDetailResponse.self).question
    }

    func toggleFavorite(questionId: String) async throws -> Bool {
        let endpoint = APIEndpoint(path: "/api/questions/\(questionId)/favorite", method: .post)
        return try await apiClient.send(endpoint, as: ToggleFavoriteResponse.self).isFavorite
    }

    func setStudyStatus(questionId: String, status: StudyStatus) async throws {
        let endpoint = APIEndpoint(
            path: "/api/progress",
            method: .post,
            body: SetStudyStatusRequestBody(questionId: questionId, status: status.rawValue)
        )
        _ = try await apiClient.send(endpoint, as: SetStudyStatusResponse.self)
    }
}
