import Foundation
import Observation

@Observable
final class AuthViewModel {
    var email = ""
    var password = ""
    var name = ""
    var isLoading = false
    var errorMessage: String?

    private let authManager: AuthManager

    init(authManager: AuthManager) {
        self.authManager = authManager
    }

    func login() async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }
        do {
            try await authManager.login(email: email, password: password)
        } catch let error as APIClientError {
            errorMessage = error.userMessage
        } catch {
            errorMessage = "Something went wrong. Please try again."
        }
    }

    func register() async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }
        do {
            try await authManager.register(name: name, email: email, password: password)
        } catch let error as APIClientError {
            errorMessage = error.userMessage
        } catch {
            errorMessage = "Something went wrong. Please try again."
        }
    }
}
