import Foundation
import Observation

@Observable
final class ProfileViewModel {
    private(set) var isProcessing = false
    private(set) var errorMessage: String?
    private(set) var needsPassword = false

    private let authManager: AuthManager

    init(authManager: AuthManager) {
        self.authManager = authManager
    }

    func signOut() async {
        isProcessing = true
        defer { isProcessing = false }
        await authManager.logout()
    }

    // Returns true on success. On a 400, the server's message tells the
    // user what to do next ("Enter your password..." / "Incorrect
    // password.") — reveal the password field and let them retry.
    func deleteAccount(password: String?) async -> Bool {
        isProcessing = true
        errorMessage = nil
        defer { isProcessing = false }
        do {
            try await authManager.deleteAccount(password: password)
            return true
        } catch let error as APIClientError {
            if case .server(let status, _) = error, status == 400 {
                needsPassword = true
            }
            errorMessage = error.userMessage
            return false
        } catch {
            errorMessage = "Something went wrong. Please try again."
            return false
        }
    }
}
