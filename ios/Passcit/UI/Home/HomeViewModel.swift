import Foundation
import Observation

@Observable
final class HomeViewModel {
    private(set) var dashboard: Dashboard?
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    private let dashboardService: DashboardService

    init(dashboardService: DashboardService) {
        self.dashboardService = dashboardService
    }

    func loadIfNeeded() async {
        guard dashboard == nil else { return }
        await load()
    }

    func refresh() async {
        await load()
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            dashboard = try await dashboardService.fetchDashboard()
        } catch let error as APIClientError {
            // .sessionExpired is handled globally — AuthManager already
            // transitions to .signedOut via TokenRefreshCoordinator, and
            // HomeView re-renders the signed-out prompt automatically.
            errorMessage = error.userMessage
        } catch {
            errorMessage = "Something went wrong. Please try again."
        }
    }
}
