import Foundation

struct DashboardService {
    let apiClient: APIClient

    func fetchDashboard() async throws -> Dashboard {
        try await apiClient.send(APIEndpoint(path: "/api/dashboard", method: .get), as: DashboardResponse.self).dashboard
    }
}
