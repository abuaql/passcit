import Foundation
@testable import Passcit

/// Test double for QuestionsServicing — lets FlashcardDeckViewModel be
/// tested against canned responses/errors without a live server.
final class MockQuestionsService: QuestionsServicing {
    var listResult: Result<[QuestionSummary], Error> = .success([])
    var detailResult: Result<QuestionDetail, Error> = .failure(TestSetupError.notConfigured)
    var toggleFavoriteResult: Result<Bool, Error> = .success(true)
    var setStudyStatusResult: Result<Void, Error> = .success(())

    private(set) var listCallCount = 0
    private(set) var lastListCategory: QuestionCategory?
    private(set) var getQuestionCallCount = 0
    private(set) var lastGetQuestionId: String?
    private(set) var toggleFavoriteCallCount = 0
    private(set) var lastToggleFavoriteId: String?
    private(set) var lastSetStatus: StudyStatus?
    private(set) var lastSetStatusQuestionId: String?

    enum TestSetupError: Error {
        case notConfigured
    }

    func listQuestions(category: QuestionCategory?, favoritesOnly: Bool) async throws -> [QuestionSummary] {
        listCallCount += 1
        lastListCategory = category
        return try listResult.get()
    }

    func getQuestion(id: String) async throws -> QuestionDetail {
        getQuestionCallCount += 1
        lastGetQuestionId = id
        return try detailResult.get()
    }

    func toggleFavorite(questionId: String) async throws -> Bool {
        toggleFavoriteCallCount += 1
        lastToggleFavoriteId = questionId
        return try toggleFavoriteResult.get()
    }

    func setStudyStatus(questionId: String, status: StudyStatus) async throws {
        lastSetStatus = status
        lastSetStatusQuestionId = questionId
        _ = try setStudyStatusResult.get()
    }
}
