import Foundation
@testable import Passcit

/// Test double for PracticeServicing — lets PracticeViewModel be tested
/// against canned responses/errors without a live server. Not a
/// @Test/@Suite itself.
final class MockPracticeService: PracticeServicing {
    var testVersionIdResult: Result<String, Error> = .success("tv_2025")
    var startResult: Result<StartPracticeTestResponse, Error> = .failure(TestSetupError.notConfigured)
    var completeResult: Result<PracticeTestResult, Error> = .failure(TestSetupError.notConfigured)

    private(set) var ensureActiveCallCount = 0
    private(set) var startCallCount = 0
    private(set) var completeCallCount = 0
    private(set) var lastStartMode: PracticeMode?
    private(set) var lastStartCategory: QuestionCategory?
    private(set) var lastCompleteTestId: String?
    private(set) var lastCompleteAnswers: [SubmittedPracticeAnswer]?
    private(set) var lastCompleteStoppedEarly: Bool?

    enum TestSetupError: Error {
        case notConfigured
    }

    func ensureActive2025TestVersion() async throws -> String {
        ensureActiveCallCount += 1
        return try testVersionIdResult.get()
    }

    func startPracticeTest(mode: PracticeMode, category: QuestionCategory?) async throws -> StartPracticeTestResponse {
        startCallCount += 1
        lastStartMode = mode
        lastStartCategory = category
        return try startResult.get()
    }

    func completePracticeTest(testId: String, answers: [SubmittedPracticeAnswer], stoppedEarly: Bool) async throws -> PracticeTestResult {
        completeCallCount += 1
        lastCompleteTestId = testId
        lastCompleteAnswers = answers
        lastCompleteStoppedEarly = stoppedEarly
        return try completeResult.get()
    }
}
