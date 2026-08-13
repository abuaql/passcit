import Foundation
import Observation

@Observable
final class LessonViewModel {
    private(set) var lesson: LessonDetail?
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var currentIndex = 0
    private(set) var selectedOptions: [String: String] = [:] // questionId -> selected option text
    private(set) var isCompleting = false
    private(set) var completionError: String?
    // Generated once per question and cached here — recomputing fresh from
    // options(for:) on every body re-render (e.g. right after a selection
    // changes state) would reshuffle the distractors mid-interaction.
    private(set) var currentOptions: [String]?

    let lessonId: String
    private let learnService: LearnServicing

    init(lessonId: String, learnService: LearnServicing) {
        self.lessonId = lessonId
        self.learnService = learnService
    }

    func loadIfNeeded() async {
        guard lesson == nil else { return }
        await load()
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            lesson = try await learnService.fetchLesson(id: lessonId)
            refreshCurrentOptions()
        } catch let error as APIClientError {
            errorMessage = error.userMessage
        } catch {
            errorMessage = "Something went wrong. Please try again."
        }
    }

    private func refreshCurrentOptions() {
        guard let lesson, let question = currentQuestion else {
            currentOptions = nil
            return
        }
        currentOptions = Self.options(for: question, in: lesson)
    }

    var currentQuestion: LessonQuestionContent? {
        guard let lesson, lesson.questions.indices.contains(currentIndex) else { return nil }
        return lesson.questions[currentIndex]
    }

    var progressText: String? {
        guard let lesson, !lesson.questions.isEmpty else { return nil }
        return "Question \(currentIndex + 1) of \(lesson.questions.count)"
    }

    var isLastQuestion: Bool {
        guard let lesson else { return true }
        return currentIndex >= lesson.questions.count - 1
    }

    func select(option: String, for questionId: String) {
        selectedOptions[questionId] = option
    }

    func goToNextQuestion() {
        guard !isLastQuestion else { return }
        currentIndex += 1
        refreshCurrentOptions()
    }

    func goToPreviousQuestion() {
        currentIndex = max(0, currentIndex - 1)
        refreshCurrentOptions()
    }

    /// Options to present for a question: the accepted answer plus up to
    /// 3 distractors drawn from OTHER questions in the same lesson.
    /// Never invents text — every option is a real, backend-supplied
    /// accepted answer from somewhere in this lesson. Returns nil for a
    /// variesByLocation question (no fixed correct answer exists — the
    /// view should show the explanation instead of a selectable quiz).
    static func options(for question: LessonQuestionContent, in lesson: LessonDetail) -> [String]? {
        guard !question.variesByLocation, let correct = question.answers.first else { return nil }
        let distractorPool = lesson.questions
            .filter { $0.id != question.id && !$0.variesByLocation }
            .compactMap { $0.answers.first }
            .filter { $0 != correct }
        let distractors = Array(Set(distractorPool)).shuffled().prefix(3)
        return ([correct] + distractors).shuffled()
    }

    func isCorrect(_ option: String, for question: LessonQuestionContent) -> Bool {
        question.answers.contains(option)
    }

    @discardableResult
    func completeLesson() async -> Bool {
        isCompleting = true
        completionError = nil
        defer { isCompleting = false }
        do {
            _ = try await learnService.completeLesson(id: lessonId)
            return true
        } catch let error as APIClientError {
            completionError = error.userMessage
            return false
        } catch {
            completionError = "Something went wrong. Please try again."
            return false
        }
    }
}
