import SwiftUI

struct RootView: View {
    let apiClient: APIClient
    @Environment(AuthManager.self) private var authManager
    @AppStorage("hasCompletedFirstLaunch") private var hasCompletedFirstLaunch = false
    @State private var showAuthSheet = false

    var body: some View {
        content
            .task {
                await authManager.bootstrap()
            }
            .sheet(isPresented: $showAuthSheet) {
                AuthSheetView(authManager: authManager)
            }
            .onChange(of: authManager.state) { _, newState in
                if case .signedIn = newState {
                    showAuthSheet = false
                }
            }
    }

    @ViewBuilder
    private var content: some View {
        if !hasCompletedFirstLaunch {
            FirstLaunchFlowView(onFinish: { hasCompletedFirstLaunch = true })
        } else {
            MainTabView(apiClient: apiClient, onSignInTapped: { showAuthSheet = true })
        }
    }
}
