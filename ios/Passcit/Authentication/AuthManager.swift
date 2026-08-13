import Foundation
import Observation

@Observable
final class AuthManager {
    private(set) var state: AuthState = .bootstrapping

    private let apiClient: APIClient
    private let sessionStore: SessionStore

    init(apiClient: APIClient, sessionStore: SessionStore) {
        self.apiClient = apiClient
        self.sessionStore = sessionStore
    }

    // Called once from RootView on launch. Enters .signedIn immediately
    // from the cached user if one exists — no network round-trip blocks
    // the UI — then reconciles with the server in the background.
    func bootstrap() async {
        guard sessionStore.hasSession else {
            state = .signedOut
            return
        }
        if let cached = sessionStore.cachedUser {
            state = .signedIn(cached)
        }

        do {
            let fresh = try await fetchCurrentUser()
            sessionStore.saveUser(fresh)
            state = .signedIn(fresh)
        } catch APIClientError.sessionExpired {
            signOutLocally()
        } catch {
            // Network/server hiccup, not a dead session — keep the
            // optimistic cached state if there was one rather than
            // bouncing the user back to signed-out over a blip.
            if sessionStore.cachedUser == nil {
                state = .signedOut
            }
        }
    }

    // Wired to TokenRefreshCoordinator.onSessionExpired from the
    // composition root — fires when a refresh attempt fails outright
    // (dead/expired refresh token), from any call site in the app.
    func handleSessionExpired() {
        signOutLocally()
    }

    func login(email: String, password: String) async throws {
        let response = try await apiClient.send(
            APIEndpoint(
                path: "/api/native/auth/login",
                method: .post,
                body: LoginRequest(email: email, password: password),
                requiresAuth: false
            ),
            as: AuthResponse.self
        )
        applySession(tokens: response.tokenPair, user: response.user)
    }

    func register(name: String, email: String, password: String) async throws {
        let response = try await apiClient.send(
            APIEndpoint(
                path: "/api/native/auth/register",
                method: .post,
                body: RegisterRequest(name: name, email: email, password: password),
                requiresAuth: false
            ),
            as: AuthResponse.self
        )
        applySession(tokens: response.tokenPair, user: response.user)
    }

    // Also the mechanism Stage 3's bootstrap() reconciles the cached user with.
    func fetchCurrentUser() async throws -> User {
        try await apiClient.send(APIEndpoint(path: "/api/user/me", method: .get), as: UserMeResponse.self).user
    }

    // Re-syncs the cached/displayed user from the server — used after a
    // profile edit (e.g. AccountSettingsViewModel's display-name update)
    // so Profile/Home reflect the change immediately without an app
    // restart. Silently no-ops on failure: the edit itself already
    // succeeded, and a transient refresh error shouldn't surface as one.
    func refreshCurrentUser() async {
        guard case .signedIn = state else { return }
        guard let fresh = try? await fetchCurrentUser() else { return }
        sessionStore.saveUser(fresh)
        state = .signedIn(fresh)
    }

    func signInWithApple(_ credential: AppleCredential) async throws {
        let name: AppleNameRequest? = if let first = credential.firstName, let last = credential.lastName {
            AppleNameRequest(firstName: first, lastName: last)
        } else {
            nil
        }
        let response = try await apiClient.send(
            APIEndpoint(
                path: "/api/native/auth/apple",
                method: .post,
                body: AppleAuthRequest(
                    identityToken: credential.identityToken,
                    authorizationCode: credential.authorizationCode,
                    name: name
                ),
                requiresAuth: false
            ),
            as: OAuthAuthResponse.self
        )
        applySession(tokens: response.tokenPair, user: response.user)
    }

    @MainActor
    func signInWithGoogle() async throws {
        // Constructed fresh per attempt — no state needs to persist across
        // sign-in calls, and this avoids storing a @MainActor-isolated type
        // as a property on a type that isn't itself MainActor-isolated.
        let idToken = try await GoogleSignInController().signIn()
        let response = try await apiClient.send(
            APIEndpoint(
                path: "/api/native/auth/google",
                method: .post,
                body: GoogleAuthRequest(idToken: idToken),
                requiresAuth: false
            ),
            as: OAuthAuthResponse.self
        )
        applySession(tokens: response.tokenPair, user: response.user)
    }

    // Best-effort server-side revocation, then always clears the local
    // session regardless of network outcome — the user must be able to
    // sign out even when offline or the server is unreachable.
    func logout() async {
        if let refreshToken = sessionStore.refreshToken {
            _ = try? await apiClient.send(
                APIEndpoint(path: "/api/native/auth/logout", method: .post, body: LogoutRequest(refreshToken: refreshToken))
            )
        }
        signOutLocally()
    }

    // Throws on failure so the caller can inspect the server's message
    // (e.g. "Enter your password..." / "Incorrect password.") and decide
    // whether to reveal a password field and let the user retry.
    func deleteAccount(password: String?) async throws {
        try await apiClient.send(
            APIEndpoint(path: "/api/user/account", method: .delete, body: DeleteAccountRequest(password: password))
        )
        signOutLocally()
    }

    private func applySession(tokens: TokenPair, user: User) {
        sessionStore.saveTokens(tokens)
        sessionStore.saveUser(user)
        state = .signedIn(user)
    }

    private func signOutLocally() {
        sessionStore.clear()
        state = .signedOut
    }
}

private struct LoginRequest: Encodable {
    let email: String
    let password: String
}

private struct RegisterRequest: Encodable {
    let name: String
    let email: String
    let password: String
}

private struct AppleNameRequest: Encodable {
    let firstName: String
    let lastName: String
}

private struct AppleAuthRequest: Encodable {
    let identityToken: String
    let authorizationCode: String?
    let name: AppleNameRequest?
}

private struct GoogleAuthRequest: Encodable {
    let idToken: String
}

private struct LogoutRequest: Encodable {
    let refreshToken: String
}

private struct DeleteAccountRequest: Encodable {
    let password: String?

    private enum CodingKeys: String, CodingKey {
        case password
    }

    // Omits the key entirely when nil (rather than encoding `null`) so an
    // OAuth-only account's first delete attempt sends a bare {}.
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(password, forKey: .password)
    }
}
