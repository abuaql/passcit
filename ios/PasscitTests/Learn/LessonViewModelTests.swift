import Testing
import Foundation
@testable import Passcit

@Suite("LessonViewModel")
struct LessonViewModelTests {

    @Test func loadFetchesTheLessonAndExposesTheFirstQuestion() async throws {
        let mock = MockLearnService()
        let questions = [
            LearnFixtures.question(id: "q1", number: 1, question: "What is the supreme law of the land?", answers: ["the Constitution"]),
            LearnFixtures.question(id: "q2", number: 2, question: "What does the Constitution do?", answers: ["sets up the government"]),
        ]
        mock.lessonResult = .success(LearnFixtures.lessonDetail(questions: questions))

        let viewModel = LessonViewModel(lessonId: "lesson_1", learnService: mock)
        await viewModel.loadIfNeeded()

        #expect(viewModel.lesson != nil)
        #expect(viewModel.currentQuestion?.id == "q1")
        #expect(viewModel.progressText == "Question 1 of 2")
        #expect(viewModel.isLastQuestion == false)
    }

    @Test func currentOptionsStayStableAcrossSelectionsAndOnlyChangeWhenTheQuestionChanges() async throws {
        let mock = MockLearnService()
        mock.lessonResult = .success(LearnFixtures.lessonDetail(questions: [
            LearnFixtures.question(id: "q1", answers: ["the Constitution"]),
            LearnFixtures.question(id: "q2", answers: ["George Washington"]),
            LearnFixtures.question(id: "q3", answers: ["the House of Representatives and the Senate"]),
            LearnFixtures.question(id: "q4", answers: ["27"]),
        ]))
        let viewModel = LessonViewModel(lessonId: "lesson_1", learnService: mock)
        await viewModel.loadIfNeeded()

        let optionsBeforeSelection = viewModel.currentOptions
        #expect(optionsBeforeSelection != nil)

        // Selecting an answer re-renders the view (selectedOptions changes)
        // but must NOT reshuffle/regenerate the option set out from under
        // the learner mid-interaction.
        viewModel.select(option: "the Constitution", for: "q1")
        #expect(viewModel.currentOptions == optionsBeforeSelection)

        viewModel.select(option: "27", for: "q1") // changing the selection again — still stable
        #expect(viewModel.currentOptions == optionsBeforeSelection)

        // Advancing to a new question is the only thing that should refresh it.
        viewModel.goToNextQuestion()
        #expect(viewModel.currentQuestion?.id == "q2")
        #expect(viewModel.currentOptions != nil)
    }

    @Test func navigatingAdvancesAndRewindsTheCurrentQuestion() async throws {
        let mock = MockLearnService()
        mock.lessonResult = .success(LearnFixtures.lessonDetail(questions: [
            LearnFixtures.question(id: "q1"), LearnFixtures.question(id: "q2"), LearnFixtures.question(id: "q3"),
        ]))
        let viewModel = LessonViewModel(lessonId: "lesson_1", learnService: mock)
        await viewModel.loadIfNeeded()

        viewModel.goToNextQuestion()
        #expect(viewModel.currentQuestion?.id == "q2")
        #expect(viewModel.isLastQuestion == false)

        viewModel.goToNextQuestion()
        #expect(viewModel.currentQuestion?.id == "q3")
        #expect(viewModel.isLastQuestion == true)

        viewModel.goToNextQuestion() // already last — no-op
        #expect(viewModel.currentQuestion?.id == "q3")

        viewModel.goToPreviousQuestion()
        #expect(viewModel.currentQuestion?.id == "q2")
    }

    @Test func optionsIncludeTheRealAcceptedAnswerAndOnlyRealDistractorsFromTheSameLesson() {
        let target = LearnFixtures.question(id: "q1", answers: ["the Constitution"])
        let lesson = LearnFixtures.lessonDetail(questions: [
            target,
            LearnFixtures.question(id: "q2", answers: ["George Washington"]),
            LearnFixtures.question(id: "q3", answers: ["the House of Representatives and the Senate"]),
            LearnFixtures.question(id: "q4", answers: ["27"]),
        ])

        let options = LessonViewModel.options(for: target, in: lesson)

        #expect(options != nil)
        #expect(options!.contains("the Constitution"))
        #expect(options!.count <= 4)
        // Every option must be real, backend-supplied text — never invented.
        let allRealAnswers = Set(lesson.questions.flatMap(\.answers))
        for option in options! {
            #expect(allRealAnswers.contains(option))
        }
        // No duplicate options.
        #expect(Set(options!).count == options!.count)
    }

    @Test func optionsAreNilForAVariesByLocationQuestion() {
        let target = LearnFixtures.question(id: "q23", answers: [], variesByLocation: true)
        let lesson = LearnFixtures.lessonDetail(questions: [target, LearnFixtures.question(id: "q1")])

        #expect(LessonViewModel.options(for: target, in: lesson) == nil)
    }

    @Test func isCorrectMatchesAnyAcceptedAnswerVariant() {
        let mock = MockLearnService()
        let viewModel = LessonViewModel(lessonId: "lesson_1", learnService: mock)
        let question = LearnFixtures.question(id: "q38", answers: ["Donald J. Trump", "Donald Trump", "Trump"])

        #expect(viewModel.isCorrect("Trump", for: question) == true)
        #expect(viewModel.isCorrect("Donald J. Trump", for: question) == true)
        #expect(viewModel.isCorrect("Someone else", for: question) == false)
    }

    @Test func completeLessonSucceeds() async throws {
        let mock = MockLearnService()
        mock.completeLessonResult = .success(
            CompleteLessonResponse(
                alreadyCompleted: false,
                lesson: LearnFixtures.lessonDetail(status: .completed, questions: []),
                unit: UnitDetail(
                    id: "u1", testVersionId: "tv_2025", slug: "u1", title: "Unit", description: nil,
                    order: 1, status: .inProgress, lessons: [], examAvailable: false, examPassed: false, exam: nil
                )
            )
        )
        let viewModel = LessonViewModel(lessonId: "lesson_1", learnService: mock)

        let succeeded = await viewModel.completeLesson()

        #expect(succeeded == true)
        #expect(viewModel.completionError == nil)
    }

    @Test func completeLessonSurfacesALockedLessonError() async throws {
        let mock = MockLearnService()
        mock.completeLessonResult = .failure(APIClientError.server(status: 403, message: "This lesson is locked."))
        let viewModel = LessonViewModel(lessonId: "lesson_1", learnService: mock)

        let succeeded = await viewModel.completeLesson()

        #expect(succeeded == false)
        #expect(viewModel.completionError == "This lesson is locked.")
    }

    @Test func completeLessonSurfacesSessionExpiration() async throws {
        let mock = MockLearnService()
        mock.completeLessonResult = .failure(APIClientError.sessionExpired)
        let viewModel = LessonViewModel(lessonId: "lesson_1", learnService: mock)

        let succeeded = await viewModel.completeLesson()

        #expect(succeeded == false)
        #expect(viewModel.completionError == "Your session expired. Please sign in again.")
    }
}
