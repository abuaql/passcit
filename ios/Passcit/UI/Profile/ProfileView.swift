import SwiftUI

struct ProfileView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var showSignOutConfirmation = false
    @State private var showDeleteAccountSheet = false
    @State private var isSigningOut = false
    let apiClient: APIClient

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Profile")
        }
    }

    @ViewBuilder
    private var content: some View {
        switch authManager.state {
        case .signedIn(let user):
            List {
                Section {
                    LabeledContent("Name", value: user.name ?? "—")
                    LabeledContent("Email", value: user.email)
                }

                Section {
                    NavigationLink("Account Settings") {
                        AccountSettingsView(apiClient: apiClient, authManager: authManager, currentName: user.name ?? "")
                    }
                }

                Section {
                    NavigationLink("Naturalization Eligibility Check") {
                        EligibilityView(apiClient: apiClient)
                    }
                }

                Section {
                    Button("Sign Out") {
                        showSignOutConfirmation = true
                    }
                    .disabled(isSigningOut)
                }

                Section {
                    Button("Delete Account", role: .destructive) {
                        showDeleteAccountSheet = true
                    }
                }
            }
            .confirmationDialog("Sign out of Passcit?", isPresented: $showSignOutConfirmation, titleVisibility: .visible) {
                Button("Sign Out", role: .destructive) {
                    Task {
                        isSigningOut = true
                        await authManager.logout()
                        isSigningOut = false
                    }
                }
                Button("Cancel", role: .cancel) {}
            }
            .sheet(isPresented: $showDeleteAccountSheet) {
                DeleteAccountSheet(authManager: authManager)
            }
        default:
            EmptyStateView(
                icon: "person.fill",
                title: "No profile yet",
                subtitle: "Sign in from Home to see your account details here."
            )
        }
    }
}
