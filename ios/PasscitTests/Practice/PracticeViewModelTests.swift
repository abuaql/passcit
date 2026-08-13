import Testing
import Foundation
@testable import Passcit

@Suite("PracticeViewModel")
struct PracticeViewModelTests {

    @Test func startNewTestResolvesThe2025SlugThenStartsATest() async throws {
        let mock = MockPracticeService()
        mock.testVersionIdResult = .success("resolved_2025_id")
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [PracticeFixtures.question(id: "q1")]))

        let viewModel = PracticeViewModel(practiceService: mock)
        await viewModel.startNewTest()

        #expect(mock.ensureActiveCallCount == 1)
        #expect(mock.startCallCount == 1)
        #expect(viewModel.phase == .inProgress)
        #expect(viewModel.questions.count == 1)
        #expect(viewModel.errorMessage == nil)
    }

    @Test func startingASecondTestReusesTheCachedTestVersionId() async throws {
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [PracticeFixtures.question(id: "q1")]))
        let viewModel = PracticeViewModel(practiceService: mock)

        await viewModel.startNewTest()
        await viewModel.startNewTest()

        #expect(mock.ensureActiveCallCount == 1, "the resolved+activated id should be cached across starts")
        #expect(mock.startCallCount == 2)
    }

    @Test func surfacesAPIClientErrorOnStartFailure() async throws {
        let mock = MockPracticeService()
        mock.startResult = .failure(APIClientError.sessionExpired)
        let viewModel = PracticeViewModel(practiceService: mock)

        await viewModel.startNewTest()

        #expect(viewModel.phase == .idle)
        #expect(viewModel.errorMessage == "Your session expired. Please sign in again.")
    }

    @Test func surfacesPracticeServiceErrorWhenNo2025ContentExists() async throws {
        let mock = MockPracticeService()
        mock.testVersionIdResult = .failure(PracticeServiceError(message: "The current civics test content isn't available right now."))
        let viewModel = PracticeViewModel(practiceService: mock)

        await viewModel.startNewTest()

        #expect(viewModel.errorMessage == "The current civics test content isn't available right now.")
    }

    @Test func navigatingAdvancesAndRewindsTheCurrentQuestion() async throws {
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [
            PracticeFixtures.question(id: "q1"), PracticeFixtures.question(id: "q2"), PracticeFixtures.question(id: "q3"),
        ]))
        let viewModel = PracticeViewModel(practiceService: mock)
        await viewModel.startNewTest()

        #expect(viewModel.progressText == "Question 1 of 3")
        viewModel.goToNextQuestion()
        #expect(viewModel.currentQuestion?.id == "q2")
        #expect(viewModel.progressText == "Question 2 of 3")
        viewModel.goToNextQuestion()
        #expect(viewModel.isLastQuestion == true)
        viewModel.goToNextQuestion() // already last — no-op
        #expect(viewModel.currentQuestion?.id == "q3")
        viewModel.goToPreviousQuestion()
        #expect(viewModel.currentQuestion?.id == "q2")
    }

    @Test func optionOrderNeverChangesAcrossSelectionOrRepeatedReads() async throws {
        // Regression test for the exact class of bug fixed in Phase 11
        // (LessonViewModel's reshuffling-on-re-render issue) — Practice's
        // options come from the server already-ordered and decoded once,
        // so nothing should ever recompute or reshuffle them.
        let options = [
            PracticeFixtures.option(id: "a", text: "Alpha", isCorrect: false),
            PracticeFixtures.option(id: "b", text: "Bravo", isCorrect: true),
            PracticeFixtures.option(id: "c", text: "Charlie", isCorrect: false),
            PracticeFixtures.option(id: "d", text: "Delta", isCorrect: false),
        ]
        let question = PracticeFixtures.question(id: "q1", options: options)
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [question]))
        let viewModel = PracticeViewModel(practiceService: mock)
        await viewModel.startNewTest()

        let before = viewModel.currentQuestion?.options
        #expect(before == options)

        viewModel.select(options[1], for: "q1")
        let afterSelect = viewModel.currentQuestion?.options
        #expect(afterSelect == before, "selecting an answer must not reorder the options")

        // Reading it again (simulating a second SwiftUI body re-render) must be identical too.
        let readAgain = viewModel.currentQuestion?.options
        #expect(readAgain == before)
    }

    @Test func selectingAnAnswerPersistsPerQuestion() async throws {
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [
            PracticeFixtures.question(id: "q1"), PracticeFixtures.question(id: "q2"),
        ]))
        let viewModel = PracticeViewModel(practiceService: mock)
        await viewModel.startNewTest()

        let q1Option = viewModel.currentQuestion!.options[0]
        viewModel.select(q1Option, for: "q1")
        viewModel.goToNextQuestion()
        #expect(viewModel.selectedOptions["q1"] == q1Option)
        #expect(viewModel.selectedOptions["q2"] == nil)

        viewModel.goToPreviousQuestion()
        #expect(viewModel.selectedOptions["q1"] == q1Option, "the earlier selection must survive navigating away and back")
    }

    @Test func submitBuildsExactlyOneAnswerPerQuestionWithStoppedEarlyFalse() async throws {
        let q1 = PracticeFixtures.question(id: "q1")
        let q2 = PracticeFixtures.question(id: "q2")
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [q1, q2]))
        mock.completeResult = .success(PracticeTestResult(score: 2, totalQuestions: 2, passed: true, stoppedEarly: false))
        let viewModel = PracticeViewModel(practiceService: mock)
        await viewModel.startNewTest()

        viewModel.select(q1.options[0], for: "q1")
        viewModel.goToNextQuestion()
        viewModel.select(q2.options[1], for: "q2")

        await viewModel.submit()

        #expect(mock.completeCallCount == 1)
        #expect(mock.lastCompleteTestId == "test_1")
        #expect(mock.lastCompleteAnswers?.count == 2)
        #expect(mock.lastCompleteStoppedEarly == false)
        #expect(viewModel.phase == .finished)
    }

    @Test func submitDoesNothingUntilEveryQuestionIsAnswered() async throws {
        let q1 = PracticeFixtures.question(id: "q1")
        let q2 = PracticeFixtures.question(id: "q2")
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [q1, q2]))
        let viewModel = PracticeViewModel(practiceService: mock)
        await viewModel.startNewTest()

        viewModel.select(q1.options[0], for: "q1") // only one of two answered

        await viewModel.submit()

        #expect(mock.completeCallCount == 0)
        #expect(viewModel.phase == .inProgress)
    }

    // The explicit security requirement: the submitted isCorrect must
    // come exclusively from the selected server-provided option, never
    // derived by comparing selectedAnswer text against acceptedAnswers
    // or any other locally-maintained notion of "correct." This fixture
    // deliberately makes text-matching against acceptedAnswers say the
    // OPPOSITE of what the option's own isCorrect says, to prove the
    // code path structurally cannot be using acceptedAnswers.
    @Test func submissionIsCorrectComesExclusivelyFromTheSelectedServerOption() async throws {
        let adversarialOptions = [
            // Text-matches acceptedAnswers, but the server marked it WRONG.
            PracticeFixtures.option(id: "looks-right", text: "the Constitution", isCorrect: false),
            // Does NOT text-match acceptedAnswers, but the server marked it RIGHT.
            PracticeFixtures.option(id: "actually-right", text: "Definitely Not The Constitution", isCorrect: true),
        ]
        let question = PracticeFixtures.question(
            id: "q1",
            acceptedAnswers: ["the Constitution"],
            options: adversarialOptions
        )
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [question]))
        mock.completeResult = .success(PracticeTestResult(score: 1, totalQuestions: 1, passed: true, stoppedEarly: false))
        let viewModel = PracticeViewModel(practiceService: mock)
        await viewModel.startNewTest()

        // Select the option whose TEXT matches acceptedAnswers, but whose
        // own isCorrect flag is false.
        viewModel.select(adversarialOptions[0], for: "q1")
        await viewModel.submit()

        let submitted = mock.lastCompleteAnswers?.first
        #expect(submitted?.selectedAnswer == "the Constitution")
        // Must reflect the OPTION's isCorrect (false), not a text-match
        // against acceptedAnswers (which would incorrectly say true).
        #expect(submitted?.isCorrect == false)

        // Now the reverse: select the option that does NOT text-match
        // acceptedAnswers, but IS marked correct by the server.
        let mock2 = MockPracticeService()
        mock2.startResult = .success(PracticeFixtures.startResponse(questions: [question]))
        mock2.completeResult = .success(PracticeTestResult(score: 1, totalQuestions: 1, passed: true, stoppedEarly: false))
        let viewModel2 = PracticeViewModel(practiceService: mock2)
        await viewModel2.startNewTest()
        viewModel2.select(adversarialOptions[1], for: "q1")
        await viewModel2.submit()

        let submitted2 = mock2.lastCompleteAnswers?.first
        #expect(submitted2?.selectedAnswer == "Definitely Not The Constitution")
        #expect(submitted2?.isCorrect == true, "must trust the option's own isCorrect even though it doesn't text-match acceptedAnswers")
    }

    @Test func submitFailureReturnsToInProgressWithAnErrorMessage() async throws {
        let q1 = PracticeFixtures.question(id: "q1")
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [q1]))
        mock.completeResult = .failure(APIClientError.server(status: 409, message: "This test was already submitted."))
        let viewModel = PracticeViewModel(practiceService: mock)
        await viewModel.startNewTest()
        viewModel.select(q1.options[0], for: "q1")

        await viewModel.submit()

        #expect(viewModel.phase == .inProgress)
        #expect(viewModel.errorMessage == "This test was already submitted.")
    }

    @Test func resultReflectsTheServerResponseExactlyWithNoClientRecomputation() async throws {
        let q1 = PracticeFixtures.question(id: "q1")
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [q1]))
        // Deliberately inconsistent with what the client could compute
        // itself, to prove the result screen just renders what the
        // server said rather than recalculating anything.
        mock.completeResult = .success(PracticeTestResult(score: 0, totalQuestions: 1, passed: true, stoppedEarly: false))
        let viewModel = PracticeViewModel(practiceService: mock)
        await viewModel.startNewTest()
        viewModel.select(q1.options[0], for: "q1")

        await viewModel.submit()

        #expect(viewModel.result?.score == 0)
        #expect(viewModel.result?.passed == true)
    }

    @Test func startingAnotherTestAfterFinishingResetsAllPriorState() async throws {
        let q1 = PracticeFixtures.question(id: "q1")
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [q1]))
        mock.completeResult = .success(PracticeTestResult(score: 1, totalQuestions: 1, passed: true, stoppedEarly: false))
        let viewModel = PracticeViewModel(practiceService: mock)
        await viewModel.startNewTest()
        viewModel.select(q1.options[0], for: "q1")
        await viewModel.submit()
        #expect(viewModel.phase == .finished)

        let q2 = PracticeFixtures.question(id: "q2")
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [q2]))
        await viewModel.startNewTest()

        #expect(viewModel.phase == .inProgress)
        #expect(viewModel.currentIndex == 0)
        #expect(viewModel.selectedOptions.isEmpty, "selections from the previous test must not leak into the new one")
        #expect(viewModel.result == nil)
        #expect(viewModel.questions.map(\.id) == ["q2"])
    }

    // MARK: Mode selection — RANDOM_10 default (backward compatibility)

    @Test func defaultModeIsRandom10WithNoCategory() {
        let viewModel = PracticeViewModel(practiceService: MockPracticeService())
        #expect(viewModel.selectedMode == .random10)
        #expect(viewModel.selectedCategory == nil)
        #expect(viewModel.canStart == true)
    }

    @Test func startingWithNoModeChangeSendsRandom10AndNoCategory() async throws {
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [PracticeFixtures.question(id: "q1")]))
        let viewModel = PracticeViewModel(practiceService: mock)

        await viewModel.startNewTest()

        #expect(mock.lastStartMode == .random10)
        #expect(mock.lastStartCategory == nil)
    }

    // MARK: CATEGORY mode

    @Test func categoryModeRequiresACategoryBeforeCanStart() {
        let viewModel = PracticeViewModel(practiceService: MockPracticeService())
        viewModel.selectedMode = .category
        #expect(viewModel.canStart == false)

        viewModel.selectedCategory = .americanHistory
        #expect(viewModel.canStart == true)
    }

    @Test func startingCategoryModeWithoutACategorySelectedDoesNotCallTheService() async throws {
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [PracticeFixtures.question(id: "q1")]))
        let viewModel = PracticeViewModel(practiceService: mock)
        viewModel.selectedMode = .category

        await viewModel.startNewTest()

        #expect(mock.startCallCount == 0)
        #expect(viewModel.phase == .idle)
    }

    @Test func categoryModeSendsEveryCategoryCorrectly() async throws {
        for category in QuestionCategory.allCases {
            let mock = MockPracticeService()
            mock.startResult = .success(PracticeFixtures.startResponse(questions: [PracticeFixtures.question(id: "q1")]))
            let viewModel = PracticeViewModel(practiceService: mock)
            viewModel.selectedMode = .category
            viewModel.selectedCategory = category

            await viewModel.startNewTest()

            #expect(mock.lastStartMode == .category)
            #expect(mock.lastStartCategory == category)
        }
    }

    // MARK: MISSED_ONLY mode

    @Test func missedOnlyModeSendsTheCorrectBackendModeWithNoCategory() async throws {
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [PracticeFixtures.question(id: "q1")]))
        let viewModel = PracticeViewModel(practiceService: mock)
        viewModel.selectedMode = .missedOnly

        await viewModel.startNewTest()

        #expect(mock.lastStartMode == .missedOnly)
        #expect(mock.lastStartCategory == nil)
        #expect(viewModel.phase == .inProgress)
    }

    @Test func missedOnlyModeSurfacesTheBackendsNoMissedQuestionsMessage() async throws {
        let mock = MockPracticeService()
        mock.startResult = .failure(APIClientError.server(status: 400, message: "No missed questions yet — practice a bit first, then come back here."))
        let viewModel = PracticeViewModel(practiceService: mock)
        viewModel.selectedMode = .missedOnly

        await viewModel.startNewTest()

        #expect(viewModel.errorMessage == "No missed questions yet — practice a bit first, then come back here.")
        #expect(viewModel.phase == .idle)
    }

    @Test func startFailureFromTheResultScreenReturnsToIdleRatherThanStayingOnAStaleResult() async throws {
        // Regression case: retrying MISSED_ONLY from "Start Another Test"
        // right after finishing one — if the pool is now empty, the error
        // must not be stranded behind the old .finished result view.
        let q1 = PracticeFixtures.question(id: "q1")
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [q1]))
        mock.completeResult = .success(PracticeTestResult(score: 1, totalQuestions: 1, passed: true, stoppedEarly: false))
        let viewModel = PracticeViewModel(practiceService: mock)
        viewModel.selectedMode = .missedOnly
        await viewModel.startNewTest()
        viewModel.select(q1.options[0], for: "q1")
        await viewModel.submit()
        #expect(viewModel.phase == .finished)

        mock.startResult = .failure(APIClientError.server(status: 400, message: "No missed questions yet — practice a bit first, then come back here."))
        await viewModel.startNewTest()

        #expect(viewModel.phase == .idle)
        #expect(viewModel.errorMessage == "No missed questions yet — practice a bit first, then come back here.")
    }

    // MARK: MOCK_INTERVIEW mode

    @Test func mockInterviewModeSendsTheCorrectBackendModeWithNoCategory() async throws {
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(
            questions: (1...20).map { PracticeFixtures.question(id: "q\($0)") },
            passThreshold: 12,
            questionsAsked: 20
        ))
        let viewModel = PracticeViewModel(practiceService: mock)
        viewModel.selectedMode = .mockInterview

        await viewModel.startNewTest()

        #expect(mock.lastStartMode == .mockInterview)
        #expect(mock.lastStartCategory == nil)
    }

    @Test func mockInterviewUsesServerProvidedQuestionsAskedAndPassThresholdNeverAHardcodedValue() async throws {
        // A deliberately unusual pair of numbers — if the ViewModel ever
        // hardcoded 20/12 (2025's real values) instead of trusting the
        // response, this would catch it.
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(
            questions: (1...7).map { PracticeFixtures.question(id: "q\($0)") },
            passThreshold: 5,
            questionsAsked: 7
        ))
        let viewModel = PracticeViewModel(practiceService: mock)
        viewModel.selectedMode = .mockInterview

        await viewModel.startNewTest()

        #expect(viewModel.questionsAsked == 7)
        #expect(viewModel.passThreshold == 5)
        #expect(viewModel.questions.count == 7, "the actual question count must come from the response array, not a constant")
    }

    @Test func activeModeReflectsTheModeTheCurrentTestWasActuallyStartedWith() async throws {
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [PracticeFixtures.question(id: "q1")]))
        let viewModel = PracticeViewModel(practiceService: mock)
        viewModel.selectedMode = .mockInterview

        await viewModel.startNewTest()

        #expect(viewModel.activeMode == .mockInterview)
    }

    // MARK: Reset on a new test

    @Test func startingANewTestWithADifferentModeUpdatesActiveModeAndThresholds() async throws {
        let mock = MockPracticeService()
        mock.startResult = .success(PracticeFixtures.startResponse(questions: [PracticeFixtures.question(id: "q1")], passThreshold: 6, questionsAsked: 10))
        let viewModel = PracticeViewModel(practiceService: mock)
        await viewModel.startNewTest() // RANDOM_10 default
        #expect(viewModel.activeMode == .random10)

        mock.startResult = .success(PracticeFixtures.startResponse(questions: [PracticeFixtures.question(id: "q2")], passThreshold: 12, questionsAsked: 20))
        viewModel.selectedMode = .mockInterview
        await viewModel.startNewTest()

        #expect(viewModel.activeMode == .mockInterview)
        #expect(viewModel.passThreshold == 12)
        #expect(viewModel.questionsAsked == 20)
    }
}
