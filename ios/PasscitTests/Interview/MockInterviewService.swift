import Foundation
@testable import Passcit

/// Test double for InterviewServicing — lets a future InterviewViewModel
/// (Stage 13C) be tested against canned responses/errors without a live
/// server. Not a @Test/@Suite itself.
final class MockInterviewService: InterviewServicing {
    var testVersionIdResult: Result<String, Error> = .success("tv_2025")
    var startResult: Result<StartInterviewResponse, Error> = .failure(TestSetupError.notConfigured)
    var completeIdentityResult: Result<Void, Error> = .success(())
    var readingResult: Result<SectionAttemptResult, Error> = .failure(TestSetupError.notConfigured)
    var writingResult: Result<SectionAttemptResult, Error> = .failure(TestSetupError.notConfigured)
    var civicsResult: Result<CivicsAnswerResult, Error> = .failure(TestSetupError.notConfigured)
    var completeInterviewResult: Result<InterviewCompletionResult, Error> = .failure(TestSetupError.notConfigured)
    var historyResult: Result<[InterviewHistoryEntry], Error> = .success([])
    var detailResult: Result<InterviewDetail, Error> = .failure(TestSetupError.notConfigured)

    private(set) var resolveCallCount = 0
    private(set) var startCallCount = 0
    private(set) var lastStartTestVersionId: String?
    private(set) var completeIdentityCallCount = 0
    private(set) var readingCallCount = 0
    private(set) var lastReadingSubmission: (sentenceId: String, sentenceText: String, transcript: String)?
    private(set) var writingCallCount = 0
    private(set) var lastWritingSubmission: (sentenceId: String, sentenceText: String, typedAnswer: String)?
    private(set) var civicsCallCount = 0
    private(set) var lastCivicsSubmission: (questionId: String, answerText: String, passThreshold: Int, questionsAsked: Int)?
    private(set) var completeInterviewCallCount = 0

    enum TestSetupError: Error {
        case notConfigured
    }

    func resolveTargetTestVersionId() async throws -> String {
        resolveCallCount += 1
        return try testVersionIdResult.get()
    }

    func startInterview(testVersionId: String) async throws -> StartInterviewResponse {
        startCallCount += 1
        lastStartTestVersionId = testVersionId
        return try startResult.get()
    }

    func completeIdentityStep(interviewId: String) async throws {
        completeIdentityCallCount += 1
        try completeIdentityResult.get()
    }

    func submitReadingAttempt(interviewId: String, sentenceId: String, sentenceText: String, transcript: String) async throws -> SectionAttemptResult {
        readingCallCount += 1
        lastReadingSubmission = (sentenceId, sentenceText, transcript)
        return try readingResult.get()
    }

    func submitWritingAttempt(interviewId: String, sentenceId: String, sentenceText: String, typedAnswer: String) async throws -> SectionAttemptResult {
        writingCallCount += 1
        lastWritingSubmission = (sentenceId, sentenceText, typedAnswer)
        return try writingResult.get()
    }

    func submitCivicsAnswer(interviewId: String, questionId: String, answerText: String, passThreshold: Int, questionsAsked: Int) async throws -> CivicsAnswerResult {
        civicsCallCount += 1
        lastCivicsSubmission = (questionId, answerText, passThreshold, questionsAsked)
        return try civicsResult.get()
    }

    func completeInterview(interviewId: String) async throws -> InterviewCompletionResult {
        completeInterviewCallCount += 1
        return try completeInterviewResult.get()
    }

    func fetchHistory() async throws -> [InterviewHistoryEntry] {
        try historyResult.get()
    }

    func fetchDetail(interviewId: String) async throws -> InterviewDetail {
        try detailResult.get()
    }
}
