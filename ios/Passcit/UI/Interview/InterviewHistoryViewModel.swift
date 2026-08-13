import Foundation
import Observation

@Observable
final class InterviewHistoryViewModel {
    private(set) var entries: [InterviewHistoryEntry]?
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    private let interviewService: InterviewServicing

    init(interviewService: InterviewServicing) {
        self.interviewService = interviewService
    }

    func loadIfNeeded() async {
        guard entries == nil else { return }
        await refresh()
    }

    func refresh() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            entries = try await interviewService.fetchHistory()
        } catch let error as APIClientError {
            errorMessage = error.userMessage
        } catch {
            errorMessage = "Something went wrong. Please try again."
        }
    }
}
