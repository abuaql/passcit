import SwiftUI

@main
struct PasscitApp: App {
    private let apiClient: APIClient
    @State private var authManager: AuthManager

    init() {
        let sessionStore = SessionStore()
        let apiClient = APIClient(sessionStore: sessionStore)
        self.apiClient = apiClient

        let refreshCoordinator = TokenRefreshCoordinator(sessionStore: sessionStore) { refreshToken in
            try await apiClient.send(
                APIEndpoint(
                    path: "/api/native/auth/refresh",
                    method: .post,
                    body: RefreshRequest(refreshToken: refreshToken),
                    requiresAuth: false
                ),
                as: TokenPair.self
            )
        }
        apiClient.refreshHandler = {
            try await refreshCoordinator.refreshIfNeeded()
        }

        let authManager = AuthManager(apiClient: apiClient, sessionStore: sessionStore)
        refreshCoordinator.onSessionExpired = { [weak authManager] in
            authManager?.handleSessionExpired()
        }

        _authManager = State(initialValue: authManager)
    }

    var body: some Scene {
        WindowGroup {
            RootView(apiClient: apiClient)
                .environment(authManager)
        }
    }
}

private struct RefreshRequest: Encodable {
    let refreshToken: String
}
