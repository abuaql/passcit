import Foundation
@testable import Passcit

/// Test double for StudyContentServicing — lets StudyPanelViewModel and
/// StudyLanguageStore be tested against canned responses/errors without a
/// live server.
final class MockStudyContentService: StudyContentServicing {
    var fetchResult: Result<StudyContentResponse, Error> = .failure(TestSetupError.notConfigured)
    var setLanguageResult: Result<Void, Error> = .success(())

    private(set) var fetchCallCount = 0
    private(set) var lastFetchQuestionId: String?
    private(set) var lastFetchKind: StudyContentKind?
    private(set) var lastFetchLanguage: StudyLanguage?
    private(set) var setLanguageCallCount = 0
    private(set) var lastSetLanguage: StudyLanguage?
    private(set) var recordedActions: [(questionId: String, action: StudyActionKind, language: StudyLanguage)] = []

    enum TestSetupError: Error {
        case notConfigured
    }

    func fetchStudyContent(questionId: String, kind: StudyContentKind, language: StudyLanguage) async throws -> StudyContentResponse {
        fetchCallCount += 1
        lastFetchQuestionId = questionId
        lastFetchKind = kind
        lastFetchLanguage = language
        return try fetchResult.get()
    }

    func setStudyLanguage(_ language: StudyLanguage) async throws {
        setLanguageCallCount += 1
        lastSetLanguage = language
        _ = try setLanguageResult.get()
    }

    func recordStudyAction(questionId: String, action: StudyActionKind, language: StudyLanguage) async {
        recordedActions.append((questionId, action, language))
    }
}
