import Foundation
import Observation

@Observable
final class UnitExamViewModel {
    enum Phase: Equatable {
        case notStarted
        case inProgress
        case submitting
        case finished
    }

    private(set) var phase: Phase = .notStarted
    private(set) var unitDetail: UnitDetail?
    private(set) var isLoadingIntro = false
    private(set) var isStarting = false
    private(set) var errorMessage: String?
    private(set) var attemptId: String?
    private(set) var passThreshold = 0
    private(set) var totalQuestions = 0
    private(set) var questions: [ExamQuestion] = []
    private(set) var currentIndex = 0
    private(set) var selectedOptions: [String: String] = [:] // questionId -> selected option text
    private(set) var result: UnitExamAttempt?

    let unitId: String
    let unitTitle: String
    private let learnService: LearnServicing

    init(unitId: String, unitTitle: String, learnService: LearnServicing) {
        self.unitId = unitId
        self.unitTitle = unitTitle
        self.learnService = learnService
    }

    func loadIntroIfNeeded() async {
        guard unitDetail == nil else { return }
        isLoadingIntro = true
        errorMessage = nil
        defer { isLoadingIntro = false }
        do {
            unitDetail = try await learnService.fetchUnit(id: unitId)
        } catch let error as APIClientError {
            errorMessage = error.userMessage
        } catch {
            errorMessage = "Something went wrong. Please try again."
        }
    }

    func start() async {
        isStarting = true
        errorMessage = nil
        defer { isStarting = false }
        do {
            let response = try await learnService.startUnitExam(unitId: unitId)
            attemptId = response.attemptId
            passThreshold = response.passThreshold
            totalQuestions = response.totalQuestions
            questions = response.questions
            currentIndex = 0
            selectedOptions = [:]
            phase = .inProgress
        } catch let error as APIClientError {
            errorMessage = error.userMessage
        } catch {
            errorMessage = "Something went wrong. Please try again."
        }
    }

    var currentQuestion: ExamQuestion? {
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

    func select(option: String, for questionId: String) {
        selectedOptions[questionId] = option
    }

    func goToNextQuestion() {
        guard !isLastQuestion else { return }
        currentIndex += 1
    }

    func goToPreviousQuestion() {
        currentIndex = max(0, currentIndex - 1)
    }

    func submit() async {
        guard let attemptId, allQuestionsAnswered else { return }
        phase = .submitting
        errorMessage = nil
        let answers = questions.map { SubmittedAnswer(questionId: $0.id, selectedAnswer: selectedOptions[$0.id] ?? "") }
        do {
            let response = try await learnService.completeUnitExam(unitId: unitId, attemptId: attemptId, answers: answers)
            result = response.attempt
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
