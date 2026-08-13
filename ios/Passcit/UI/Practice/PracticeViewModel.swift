import Foundation
import Observation

@Observable
final class PracticeViewModel {
    enum Phase: Equatable {
        case idle
        case inProgress
        case submitting
        case finished
    }

    private(set) var phase: Phase = .idle
    private(set) var isStarting = false
    private(set) var errorMessage: String?
    private(set) var testId: String?
    private(set) var questions: [PracticeQuestion] = []
    private(set) var currentIndex = 0
    private(set) var selectedOptions: [String: PracticeQuestionOption] = [:] // questionId -> selected option
    private(set) var result: PracticeTestResult?
    // Populated from the most recent start response — MOCK_INTERVIEW in
    // particular relies on these being whatever the server actually
    // sent (20 for 2025, matching TestVersion.questionsAsked), never a
    // client-side constant.
    private(set) var passThreshold: Int?
    private(set) var questionsAsked: Int?
    private(set) var activeMode: PracticeMode?

    // Mode-selection state, set by the start screen before starting.
    // RANDOM_10 is the default — preserves Phase 12's exact original
    // behavior for any caller that never touches these.
    var selectedMode: PracticeMode = .random10
    var selectedCategory: QuestionCategory?

    private let practiceService: PracticeServicing
    private var testVersionId: String?

    init(practiceService: PracticeServicing) {
        self.practiceService = practiceService
    }

    // CATEGORY mode requires a category; every other mode has no
    // additional precondition (MISSED_ONLY's "nothing to review yet"
    // case is a server-side 400, surfaced through the normal error path
    // below, not a client-side validation rule).
    var canStart: Bool {
        selectedMode != .category || selectedCategory != nil
    }

    func startNewTest() async {
        guard canStart else { return }
        isStarting = true
        errorMessage = nil
        defer { isStarting = false }
        do {
            let resolvedTestVersionId: String
            if let testVersionId {
                resolvedTestVersionId = testVersionId
            } else {
                resolvedTestVersionId = try await practiceService.ensureActive2025TestVersion()
            }
            let response = try await practiceService.startPracticeTest(
                mode: selectedMode,
                category: selectedMode == .category ? selectedCategory : nil
            )
            testVersionId = resolvedTestVersionId
            testId = response.testId
            questions = response.questions
            passThreshold = response.passThreshold
            questionsAsked = response.questionsAsked
            activeMode = selectedMode
            currentIndex = 0
            selectedOptions = [:]
            result = nil
            phase = .inProgress
        } catch let error as APIClientError {
            errorMessage = error.userMessage
            // Always land back on the start screen, even when retrying
            // from a finished test's result screen (e.g. "Start Another
            // Test" after a MISSED_ONLY session that just emptied the
            // missed-question pool) — otherwise the error would be set
            // but invisible behind the stale result view.
            phase = .idle
        } catch let error as PracticeServiceError {
            errorMessage = error.message
            phase = .idle
        } catch {
            errorMessage = "Something went wrong. Please try again."
            phase = .idle
        }
    }

    var currentQuestion: PracticeQuestion? {
        questions.indices.contains(currentIndex) ? questions[currentIndex] : nil
    }

    var progressText: String {
        "Question \(currentIndex + 1) of \(questions.count)"
    }

    var isLastQuestion: Bool {
        currentIndex >= questions.count - 1
    }

    var allQuestionsAnswered: Bool {
        !questions.isEmpty && questions.allSatisfy { selectedOptions[$0.id] != nil }
    }

    func select(_ option: PracticeQuestionOption, for questionId: String) {
        selectedOptions[questionId] = option
    }

    func goToNextQuestion() {
        guard !isLastQuestion else { return }
        currentIndex += 1
    }

    func goToPreviousQuestion() {
        currentIndex = max(0, currentIndex - 1)
    }

    /// Builds the completion payload and submits it. `isCorrect` for each
    /// answer is read directly off the PracticeQuestionOption the learner
    /// selected — never recomputed, inferred, or cross-checked against
    /// acceptedAnswers or question text. The server already sent us the
    /// correct-answer determination when the test started; this method's
    /// only job is to relay which option was picked.
    func submit() async {
        guard let testId, allQuestionsAnswered else { return }
        phase = .submitting
        errorMessage = nil

        let answers = questions.compactMap { question -> SubmittedPracticeAnswer? in
            guard let selected = selectedOptions[question.id] else { return nil }
            return SubmittedPracticeAnswer(questionId: question.id, selectedAnswer: selected.text, isCorrect: selected.isCorrect)
        }

        do {
            let response = try await practiceService.completePracticeTest(testId: testId, answers: answers, stoppedEarly: false)
            result = response
            phase = .finished
        } catch let error as APIClientError {
            errorMessage = error.userMessage
            phase = .inProgress
        } catch {
            errorMessage = "Something went wrong. Please try again."
            phase = .inProgress
        }
    }
}
