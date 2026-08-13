import Foundation
import Observation

@Observable
final class InterviewDetailViewModel {
    private(set) var detail: InterviewDetail?
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    let interviewId: String
    private let interviewService: InterviewServicing

    init(interviewId: String, interviewService: InterviewServicing) {
        self.interviewId = interviewId
        self.interviewService = interviewService
    }

    func loadIfNeeded() async {
        guard detail == nil else { return }
        await load()
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            detail = try await interviewService.fetchDetail(interviewId: interviewId)
        } catch let error as APIClientError {
            errorMessage = error.userMessage
        } catch {
            errorMessage = "Something went wrong. Please try again."
        }
    }
}
