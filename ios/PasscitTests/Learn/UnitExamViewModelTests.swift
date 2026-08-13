import Testing
import Foundation
@testable import Passcit

@Suite("UnitExamViewModel")
struct UnitExamViewModelTests {

    private func makeStartResponse(questionIds: [String]) -> StartExamResponse {
        StartExamResponse(
            attemptId: "attempt_1",
            passThreshold: 9,
            totalQuestions: questionIds.count,
            questions: questionIds.map { id in
                ExamQuestion(id: id, number: 1, category: "AMERICAN_GOVERNMENT", question: "Question \(id)?",
                             options: [ExamQuestionOption(id: "option-0", text: "A"), ExamQuestionOption(id: "option-1", text: "B")])
            }
        )
    }

    @Test func loadIntroFetchesUnitDetailOnlyOnce() async throws {
        let mock = MockLearnService()
        mock.unitResult = .success(UnitDetail(
            id: "u1", testVersionId: "tv_2025", slug: "u1", title: "American Government", description: nil,
            order: 1, status: .available, lessons: [], examAvailable: true, examPassed: false,
            exam: UnitExamInfo(questionCount: 15, passThreshold: 9)
        ))
        let viewModel = UnitExamViewModel(unitId: "u1", unitTitle: "American Government", learnService: mock)

        await viewModel.loadIntroIfNeeded()
        await viewModel.loadIntroIfNeeded()

        #expect(viewModel.unitDetail?.exam?.questionCount == 15)
        #expect(viewModel.phase == .notStarted)
    }

    @Test func startBeginsAnAttemptAndEntersInProgress() async throws {
        let mock = MockLearnService()
        mock.startExamResult = .success(makeStartResponse(questionIds: ["q1", "q2"]))
        let viewModel = UnitExamViewModel(unitId: "u1", unitTitle: "American Government", learnService: mock)

        await viewModel.start()

        #expect(viewModel.phase == .inProgress)
        #expect(viewModel.questions.count == 2)
        #expect(viewModel.currentQuestion?.id == "q1")
        #expect(viewModel.passThreshold == 9)
    }

    @Test func allQuestionsAnsweredRequiresEveryQuestionToHaveASelection() async throws {
        let mock = MockLearnService()
        mock.startExamResult = .success(makeStartResponse(questionIds: ["q1", "q2"]))
        let viewModel = UnitExamViewModel(unitId: "u1", unitTitle: "Unit", learnService: mock)
        await viewModel.start()

        #expect(viewModel.allQuestionsAnswered == false)
        viewModel.select(option: "A", for: "q1")
        #expect(viewModel.allQuestionsAnswered == false)
        viewModel.select(option: "B", for: "q2")
        #expect(viewModel.allQuestionsAnswered == true)
    }

    @Test func submitSendsExactlyOneAnswerPerQuestionAndEntersFinished() async throws {
        let mock = MockLearnService()
        mock.startExamResult = .success(makeStartResponse(questionIds: ["q1", "q2"]))
        mock.completeExamResult = .success(CompleteExamResponse(
            alreadyCompleted: false,
            attempt: UnitExamAttempt(id: "attempt_1", result: .passed, score: 2, totalQuestions: 2, passThreshold: 1, completedAt: Date())
        ))
        let viewModel = UnitExamViewModel(unitId: "u1", unitTitle: "Unit", learnService: mock)
        await viewModel.start()
        viewModel.select(option: "A", for: "q1")
        viewModel.select(option: "B", for: "q2")

        await viewModel.submit()

        #expect(viewModel.phase == .finished)
        #expect(viewModel.result?.result == .passed)
        #expect(mock.completeUnitExamAnswers?.count == 2)
        #expect(mock.completeUnitExamAnswers?.contains(SubmittedAnswer(questionId: "q1", selectedAnswer: "A")) == true)
    }

    @Test func submitDoesNothingUntilEveryQuestionIsAnswered() async throws {
        let mock = MockLearnService()
        mock.startExamResult = .success(makeStartResponse(questionIds: ["q1", "q2"]))
        let viewModel = UnitExamViewModel(unitId: "u1", unitTitle: "Unit", learnService: mock)
        await viewModel.start()
        viewModel.select(option: "A", for: "q1") // only one of two answered

        await viewModel.submit()

        #expect(viewModel.phase == .inProgress, "must not submit an incomplete attempt")
        #expect(mock.completeUnitExamAnswers == nil)
    }

    @Test func aFailedResultStaysDecodableAndSurfacesTheScore() async throws {
        let mock = MockLearnService()
        mock.startExamResult = .success(makeStartResponse(questionIds: ["q1"]))
        mock.completeExamResult = .success(CompleteExamResponse(
            alreadyCompleted: false,
            attempt: UnitExamAttempt(id: "attempt_1", result: .failed, score: 0, totalQuestions: 1, passThreshold: 1, completedAt: Date())
        ))
        let viewModel = UnitExamViewModel(unitId: "u1", unitTitle: "Unit", learnService: mock)
        await viewModel.start()
        viewModel.select(option: "A", for: "q1")

        await viewModel.submit()

        #expect(viewModel.result?.result == .failed)
        #expect(viewModel.result?.score == 0)
    }

    @Test func submitFailureReturnsToInProgressWithAnErrorMessage() async throws {
        let mock = MockLearnService()
        mock.startExamResult = .success(makeStartResponse(questionIds: ["q1"]))
        mock.completeExamResult = .failure(APIClientError.server(status: 400, message: "Submitted answers don't match this exam attempt."))
        let viewModel = UnitExamViewModel(unitId: "u1", unitTitle: "Unit", learnService: mock)
        await viewModel.start()
        viewModel.select(option: "A", for: "q1")

        await viewModel.submit()

        #expect(viewModel.phase == .inProgress, "a failed submission should let the learner retry, not strand them")
        #expect(viewModel.errorMessage == "Submitted answers don't match this exam attempt.")
    }

    @Test func startSurfacesSessionExpiration() async throws {
        let mock = MockLearnService()
        mock.startExamResult = .failure(APIClientError.sessionExpired)
        let viewModel = UnitExamViewModel(unitId: "u1", unitTitle: "Unit", learnService: mock)

        await viewModel.start()

        #expect(viewModel.phase == .notStarted)
        #expect(viewModel.errorMessage == "Your session expired. Please sign in again.")
    }
}
