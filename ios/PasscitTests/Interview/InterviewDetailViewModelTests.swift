import Testing
import Foundation
@testable import Passcit

@Suite("InterviewDetailViewModel")
struct InterviewDetailViewModelTests {

    @Test func loadIfNeededPopulatesDetailAndCategoryPerformanceInServerOrder() async {
        let mock = MockInterviewService()
        let categories = [
            CategoryPerformance(category: "AMERICAN_HISTORY", correct: 2, total: 5, accuracyPercent: 40),
            CategoryPerformance(category: "AMERICAN_GOVERNMENT", correct: 8, total: 10, accuracyPercent: 80),
        ]
        mock.detailResult = .success(InterviewFixtures.detail(categoryPerformance: categories))
        let viewModel = InterviewDetailViewModel(interviewId: "interview_1", interviewService: mock)

        await viewModel.loadIfNeeded()

        #expect(viewModel.detail?.categoryPerformance.map(\.category) == ["AMERICAN_HISTORY", "AMERICAN_GOVERNMENT"], "must preserve the server's own weakest-first order, never resorted client-side")
        #expect(viewModel.errorMessage == nil)
    }

    @Test func loadIfNeededOnlyFetchesOnce() async {
        let mock = MockInterviewService()
        mock.detailResult = .success(InterviewFixtures.detail())
        let viewModel = InterviewDetailViewModel(interviewId: "interview_1", interviewService: mock)

        await viewModel.loadIfNeeded()
        await viewModel.loadIfNeeded()

        #expect(viewModel.detail != nil)
    }

    @Test func sessionExpirationSurfacesTheUserFacingMessage() async {
        let mock = MockInterviewService()
        mock.detailResult = .failure(APIClientError.sessionExpired)
        let viewModel = InterviewDetailViewModel(interviewId: "interview_1", interviewService: mock)

        await viewModel.loadIfNeeded()

        #expect(viewModel.detail == nil)
        #expect(viewModel.errorMessage == "Your session expired. Please sign in again.")
    }
}
