import Testing
import Foundation
@testable import Passcit

@Suite("LearnViewModel")
struct LearnViewModelTests {

    @Test func loadResolvesThe2025SlugThenFetchesTheRoadmapByItsResolvedId() async throws {
        let mock = MockLearnService()
        mock.testVersionIdResult = .success("resolved_2025_id")
        mock.roadmapResult = .success(LearnFixtures.roadmap(units: []))

        let viewModel = LearnViewModel(learnService: mock)
        await viewModel.loadIfNeeded()

        #expect(mock.resolveCallCount == 1)
        #expect(mock.lastFetchedRoadmapTestVersionId == "resolved_2025_id")
        #expect(viewModel.roadmap != nil)
        #expect(viewModel.errorMessage == nil)
    }

    @Test func loadIfNeededOnlyResolvesTheTestVersionIdOnce() async throws {
        let mock = MockLearnService()
        mock.roadmapResult = .success(LearnFixtures.roadmap(units: []))
        let viewModel = LearnViewModel(learnService: mock)

        await viewModel.loadIfNeeded()
        await viewModel.refresh()
        await viewModel.refresh()

        #expect(mock.resolveCallCount == 1, "the resolved id should be cached across refreshes")
        #expect(mock.fetchRoadmapCallCount == 3)
    }

    @Test func surfacesAPIClientErrorUserMessage() async throws {
        let mock = MockLearnService()
        mock.roadmapResult = .failure(APIClientError.sessionExpired)
        let viewModel = LearnViewModel(learnService: mock)

        await viewModel.loadIfNeeded()

        #expect(viewModel.roadmap == nil)
        #expect(viewModel.errorMessage == "Your session expired. Please sign in again.")
    }

    @Test func surfacesLearnServiceErrorWhenNo2025ContentExists() async throws {
        let mock = MockLearnService()
        mock.testVersionIdResult = .failure(LearnServiceError(message: "The current civics test content isn't available right now."))
        let viewModel = LearnViewModel(learnService: mock)

        await viewModel.loadIfNeeded()

        #expect(viewModel.errorMessage == "The current civics test content isn't available right now.")
    }

    @Test func resumeSummaryForALessonTarget() {
        let lesson = LearnFixtures.lesson(id: "l2", title: "System of Government II", order: 2)
        let unit = LearnFixtures.unit(id: "u1", title: "American Government", lessons: [lesson])
        let roadmap = LearnFixtures.roadmap(units: [unit], resumeTarget: .lesson(unitId: "u1", lessonId: "l2"))

        let summary = LearnViewModel.resumeSummary(for: roadmap)

        #expect(summary?.title == "System of Government II")
        #expect(summary?.subtitle == "American Government")
        #expect(summary?.route == .lesson(id: "l2"))
    }

    @Test func resumeSummaryForAnExamTarget() {
        let unit = LearnFixtures.unit(id: "u1", title: "American Government")
        let roadmap = LearnFixtures.roadmap(units: [unit], resumeTarget: .exam(unitId: "u1"))

        let summary = LearnViewModel.resumeSummary(for: roadmap)

        #expect(summary?.title == "American Government Exam")
        #expect(summary?.route == .unitExam(unitId: "u1"))
    }

    @Test func resumeSummaryIsNilWhenTheRoadmapHasNothingToResume() {
        let roadmap = LearnFixtures.roadmap(units: [], resumeTarget: nil)
        #expect(LearnViewModel.resumeSummary(for: roadmap) == nil)
    }

    @Test func previousUnitTitleIsTheImmediatelyPrecedingUnit() {
        let units = [
            LearnFixtures.unit(id: "u1", title: "American Government", order: 1),
            LearnFixtures.unit(id: "u2", title: "American History", order: 2, status: .locked),
            LearnFixtures.unit(id: "u3", title: "Symbols and Holidays", order: 3, status: .locked),
        ]
        #expect(LearnViewModel.previousUnitTitle(before: units[1], in: units) == "American Government")
        #expect(LearnViewModel.previousUnitTitle(before: units[2], in: units) == "American History")
    }

    @Test func firstUnitHasNoPreviousUnitTitle() {
        let units = [LearnFixtures.unit(id: "u1", title: "American Government", order: 1)]
        #expect(LearnViewModel.previousUnitTitle(before: units[0], in: units) == nil)
    }
}
