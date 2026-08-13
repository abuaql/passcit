import Foundation

struct InterviewServiceError: Error, Equatable {
    let message: String
}

// Protocol seam mirroring LearnService/PracticeService, so a future
// InterviewViewModel (Stage 13C) can be tested against mocked responses
// without a live server.
protocol InterviewServicing {
    func resolveTargetTestVersionId() async throws -> String
    func startInterview(testVersionId: String) async throws -> StartInterviewResponse
    func completeIdentityStep(interviewId: String) async throws
    func submitReadingAttempt(interviewId: String, sentenceId: String, sentenceText: String, transcript: String) async throws -> SectionAttemptResult
    func submitWritingAttempt(interviewId: String, sentenceId: String, sentenceText: String, typedAnswer: String) async throws -> SectionAttemptResult
    func submitCivicsAnswer(interviewId: String, questionId: String, answerText: String, passThreshold: Int, questionsAsked: Int) async throws -> CivicsAnswerResult
    func completeInterview(interviewId: String) async throws -> InterviewCompletionResult
    func fetchHistory() async throws -> [InterviewHistoryEntry]
    func fetchDetail(interviewId: String) async throws -> InterviewDetail
}

struct InterviewService: InterviewServicing {
    let apiClient: APIClient

    // The official USCIS test currently in effect — Interview always
    // targets this explicitly, never the backend's isDefault TestVersion
    // (2008). Unlike Practice Tests, POST /api/interview accepts an
    // explicit testVersionId directly, so no /api/user/active-test-version
    // workaround is needed here.
    static let targetTestVersionSlug = "2025"

    func resolveTargetTestVersionId() async throws -> String {
        let response = try await apiClient.send(APIEndpoint(path: "/api/test-versions", method: .get), as: TestVersionsResponse.self)
        guard let match = response.testVersions.first(where: { $0.slug == Self.targetTestVersionSlug }) else {
            throw InterviewServiceError(message: "The current civics test content isn't available right now.")
        }
        return match.id
    }

    func startInterview(testVersionId: String) async throws -> StartInterviewResponse {
        let endpoint = APIEndpoint(
            path: "/api/interview",
            method: .post,
            body: StartInterviewRequestBody(testVersionId: testVersionId)
        )
        return try await apiClient.send(endpoint, as: StartInterviewResponse.self)
    }

    func completeIdentityStep(interviewId: String) async throws {
        try await apiClient.send(APIEndpoint(path: "/api/interview/\(interviewId)/identity", method: .post))
    }

    func submitReadingAttempt(interviewId: String, sentenceId: String, sentenceText: String, transcript: String) async throws -> SectionAttemptResult {
        let endpoint = APIEndpoint(
            path: "/api/interview/\(interviewId)/reading",
            method: .post,
            body: SubmitReadingAttemptRequestBody(sentenceId: sentenceId, sentenceText: sentenceText, transcript: transcript)
        )
        return try await apiClient.send(endpoint, as: SectionAttemptResult.self)
    }

    func submitWritingAttempt(interviewId: String, sentenceId: String, sentenceText: String, typedAnswer: String) async throws -> SectionAttemptResult {
        let endpoint = APIEndpoint(
            path: "/api/interview/\(interviewId)/writing",
            method: .post,
            body: SubmitWritingAttemptRequestBody(sentenceId: sentenceId, sentenceText: sentenceText, typedAnswer: typedAnswer)
        )
        return try await apiClient.send(endpoint, as: SectionAttemptResult.self)
    }

    func submitCivicsAnswer(interviewId: String, questionId: String, answerText: String, passThreshold: Int, questionsAsked: Int) async throws -> CivicsAnswerResult {
        let endpoint = APIEndpoint(
            path: "/api/interview/\(interviewId)/civics",
            method: .post,
            body: SubmitCivicsAnswerRequestBody(questionId: questionId, answerText: answerText, passThreshold: passThreshold, questionsAsked: questionsAsked)
        )
        return try await apiClient.send(endpoint, as: CivicsAnswerResult.self)
    }

    func completeInterview(interviewId: String) async throws -> InterviewCompletionResult {
        try await apiClient.send(APIEndpoint(path: "/api/interview/\(interviewId)/complete", method: .post), as: InterviewCompletionResult.self)
    }

    func fetchHistory() async throws -> [InterviewHistoryEntry] {
        try await apiClient.send(APIEndpoint(path: "/api/interview", method: .get), as: InterviewHistoryResponse.self).history
    }

    func fetchDetail(interviewId: String) async throws -> InterviewDetail {
        try await apiClient.send(APIEndpoint(path: "/api/interview/\(interviewId)", method: .get), as: InterviewDetailResponse.self).interview
    }
}
