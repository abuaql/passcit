import Testing
import Foundation
@testable import Passcit

@Suite("InterviewHistoryViewModel")
struct InterviewHistoryViewModelTests {

    @Test func loadIfNeededPopulatesEntriesFromHistory() async {
        let mock = MockInterviewService()
        mock.historyResult = .success([InterviewFixtures.historyEntry(id: "a"), InterviewFixtures.historyEntry(id: "b", passed: false)])
        let viewModel = InterviewHistoryViewModel(interviewService: mock)

        await viewModel.loadIfNeeded()

        #expect(viewModel.entries?.count == 2)
        #expect(viewModel.errorMessage == nil)
    }

    @Test func emptyHistoryYieldsAnEmptyNonNilArray() async {
        let mock = MockInterviewService()
        mock.historyResult = .success([])
        let viewModel = InterviewHistoryViewModel(interviewService: mock)

        await viewModel.loadIfNeeded()

        #expect(viewModel.entries?.isEmpty == true)
    }

    @Test func refreshReloadsEvenWhenAlreadyPopulated() async {
        let mock = MockInterviewService()
        mock.historyResult = .success([InterviewFixtures.historyEntry()])
        let viewModel = InterviewHistoryViewModel(interviewService: mock)

        await viewModel.loadIfNeeded()
        await viewModel.refresh()
        await viewModel.refresh()

        #expect(viewModel.entries?.count == 1)
    }

    @Test func sessionExpirationSurfacesTheUserFacingMessage() async {
        let mock = MockInterviewService()
        mock.historyResult = .failure(APIClientError.sessionExpired)
        let viewModel = InterviewHistoryViewModel(interviewService: mock)

        await viewModel.loadIfNeeded()

        #expect(viewModel.entries == nil)
        #expect(viewModel.errorMessage == "Your session expired. Please sign in again.")
    }

    @Test func genericAPIErrorSurfacesItsServerMessage() async {
        let mock = MockInterviewService()
        mock.historyResult = .failure(APIClientError.server(status: 500, message: "Couldn't load your history."))
        let viewModel = InterviewHistoryViewModel(interviewService: mock)

        await viewModel.loadIfNeeded()

        #expect(viewModel.errorMessage == "Couldn't load your history.")
    }
}
