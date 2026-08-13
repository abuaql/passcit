import AuthenticationServices
import SwiftUI

// Presented as a .sheet from an explicit action (e.g. "Sign in to see your
// progress") — never shown automatically on launch or first-launch finish.
struct AuthSheetView: View {
    let authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: AuthViewModel
    @State private var mode: Mode = .login
    @State private var oauthErrorMessage: String?

    private enum Mode: String, CaseIterable {
        case login = "Sign In"
        case register = "Register"
    }

    init(authManager: AuthManager) {
        self.authManager = authManager
        _viewModel = State(initialValue: AuthViewModel(authManager: authManager))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    oauthButtons

                    if let oauthErrorMessage {
                        Text(oauthErrorMessage)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }

                    dividerWithLabel("or")

                    Picker("Mode", selection: $mode) {
                        ForEach(Mode.allCases, id: \.self) { mode in
                            Text(mode.rawValue).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)

                    switch mode {
                    case .login:
                        LoginView(viewModel: viewModel, onSwitchToRegister: { mode = .register })
                    case .register:
                        RegisterView(viewModel: viewModel, onSwitchToLogin: { mode = .login })
                    }
                }
                .padding()
            }
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    // Apple/Google above the email form, per Apple's Human Interface Guidelines.
    private var oauthButtons: some View {
        VStack(spacing: 12) {
            SignInWithAppleButton(.continue) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                Task { await handleAppleCompletion(result) }
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 44)

            Button {
                Task { await signInWithGoogle() }
            } label: {
                HStack {
                    Image(systemName: "globe")
                    Text("Continue with Google")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
        }
    }

    private func dividerWithLabel(_ label: String) -> some View {
        HStack(spacing: 8) {
            Rectangle().fill(Color(.separator)).frame(height: 1)
            Text(label).font(.caption).foregroundStyle(.secondary)
            Rectangle().fill(Color(.separator)).frame(height: 1)
        }
    }

    private func handleAppleCompletion(_ result: Result<ASAuthorization, Error>) async {
        oauthErrorMessage = nil
        switch result {
        case .success(let authorization):
            do {
                let credential = try AppleCredential(authorization: authorization)
                try await authManager.signInWithApple(credential)
            } catch let error as APIClientError {
                oauthErrorMessage = error.userMessage
            } catch {
                oauthErrorMessage = "Apple sign-in failed. Please try again."
            }
        case .failure(let error):
            if let authError = error as? ASAuthorizationError, authError.code == .canceled {
                // Silent no-op — the user dismissed Apple's sheet.
            } else {
                oauthErrorMessage = "Apple sign-in failed. Please try again."
            }
        }
    }

    private func signInWithGoogle() async {
        oauthErrorMessage = nil
        do {
            try await authManager.signInWithGoogle()
        } catch GoogleSignInError.cancelled {
            // Silent no-op — the user dismissed Google's sheet.
        } catch let error as APIClientError {
            oauthErrorMessage = error.userMessage
        } catch {
            oauthErrorMessage = "Google sign-in failed. Please try again."
        }
    }
}
