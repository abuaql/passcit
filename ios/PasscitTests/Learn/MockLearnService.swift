import Foundation
@testable import Passcit

/// Test double for LearnServicing — lets Learn's ViewModels be tested
/// against canned responses/errors without a live server, per this
/// phase's own testing requirement. Not a @Test/@Suite itself.
final class MockLearnService: LearnServicing {
    var testVersionIdResult: Result<String, Error> = .success("tv_2025")
    var roadmapResult: Result<Roadmap, Error> = .failure(TestSetupError.notConfigured)
    var unitResult: Result<UnitDetail, Error> = .failure(TestSetupError.notConfigured)
    var lessonResult: Result<LessonDetail, Error> = .failure(TestSetupError.notConfigured)
    var completeLessonResult: Result<CompleteLessonResponse, Error> = .failure(TestSetupError.notConfigured)
    var startExamResult: Result<StartExamResponse, Error> = .failure(TestSetupError.notConfigured)
    var completeExamResult: Result<CompleteExamResponse, Error> = .failure(TestSetupError.notConfigured)

    private(set) var resolveCallCount = 0
    private(set) var fetchRoadmapCallCount = 0
    private(set) var lastFetchedRoadmapTestVersionId: String?
    private(set) var completeUnitExamAnswers: [SubmittedAnswer]?

    enum TestSetupError: Error {
        case notConfigured
    }

    func resolveTargetTestVersionId() async throws -> String {
        resolveCallCount += 1
        return try testVersionIdResult.get()
    }

    func fetchRoadmap(testVersionId: String) async throws -> Roadmap {
        fetchRoadmapCallCount += 1
        lastFetchedRoadmapTestVersionId = testVersionId
        return try roadmapResult.get()
    }

    func fetchUnit(id: String) async throws -> UnitDetail {
        try unitResult.get()
    }

    func fetchLesson(id: String) async throws -> LessonDetail {
        try lessonResult.get()
    }

    func completeLesson(id: String) async throws -> CompleteLessonResponse {
        try completeLessonResult.get()
    }

    func startUnitExam(unitId: String) async throws -> StartExamResponse {
        try startExamResult.get()
    }

    func completeUnitExam(unitId: String, attemptId: String, answers: [SubmittedAnswer]) async throws -> CompleteExamResponse {
        completeUnitExamAnswers = answers
        return try completeExamResult.get()
    }
}
