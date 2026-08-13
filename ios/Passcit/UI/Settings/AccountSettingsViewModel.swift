import Foundation
import Observation

/// Drives the Account Settings screen's two independent sub-flows —
/// display name and password — each with its own submitting/error/success
/// state so one section's failure never blocks or clears the other.
///
/// Password change is special: the backend revokes every refresh token
/// (including this device's) on success, so this device's session is
/// already dead server-side the moment the call returns. Rather than
/// silently tearing the screen down out from under the user the instant
/// `authManager.state` flips, `passwordChangeSucceeded` is surfaced first
/// so the view can show a clear "you'll need to sign in again" message;
/// `acknowledgePasswordChange()` performs the actual local sign-out once
/// the user has seen it. A real mid-session expiry (a 401 during any other
/// call) is still handled globally by AuthManager/TokenRefreshCoordinator,
/// same as every other screen — this view model doesn't special-case it.
@Observable
final class AccountSettingsViewModel {
    var displayName: String
    private(set) var isSavingName = false
    private(set) var nameError: String?
    private(set) var nameSaveSucceeded = false

    var currentPassword = ""
    var newPassword = ""
    var confirmNewPassword = ""
    private(set) var isChangingPassword = false
    private(set) var passwordError: String?
    private(set) var passwordChangeSucceeded = false

    private(set) var contentVersion: String?

    private let accountSettingsService: AccountSettingsServicing
    private let authManager: AuthManager

    init(displayName: String, accountSettingsService: AccountSettingsServicing, authManager: AuthManager) {
        self.displayName = displayName
        self.accountSettingsService = accountSettingsService
        self.authManager = authManager
    }

    // MARK: Display name

    /// Only catches obviously-invalid input (mirrors the backend's
    /// `updateProfileSchema` minimum) — the server remains the source of
    /// truth for anything more nuanced.
    var nameValidationError: String? {
        let trimmed = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return "Enter a name."
        }
        if trimmed.count < 2 {
            return "Name must be at least 2 characters."
        }
        return nil
    }

    var canSaveName: Bool {
        nameValidationError == nil && !isSavingName
    }

    func saveName() async {
        guard canSaveName else { return }
        isSavingName = true
        nameError = nil
        nameSaveSucceeded = false
        defer { isSavingName = false }

        let trimmed = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            let response = try await accountSettingsService.updateProfile(displayName: trimmed)
            displayName = response.name ?? trimmed
            nameSaveSucceeded = true
            // Reflect the new name in Profile/Home immediately — no
            // restart required. Best-effort: the edit already succeeded
            // above regardless of whether this refresh does.
            await authManager.refreshCurrentUser()
        } catch let error as APIClientError {
            nameError = error.userMessage
        } catch {
            nameError = "Something went wrong. Please try again."
        }
    }

    func dismissNameError() {
        nameError = nil
    }

    // MARK: Password

    /// Required fields plus confirmation match — the complex password
    /// composition rule (8+ chars, letter, number) lives only on the
    /// server (`passwordField` in src/lib/validations/auth.ts) and isn't
    /// duplicated here.
    var passwordValidationErrors: [String] {
        var errors: [String] = []
        if currentPassword.isEmpty {
            errors.append("Enter your current password.")
        }
        if newPassword.isEmpty {
            errors.append("Enter a new password.")
        }
        if newPassword != confirmNewPassword {
            errors.append("New password and confirmation don't match.")
        }
        return errors
    }

    var canChangePassword: Bool {
        passwordValidationErrors.isEmpty && !isChangingPassword
    }

    func changePassword() async {
        guard canChangePassword else { return }
        isChangingPassword = true
        passwordError = nil
        passwordChangeSucceeded = false
        defer { isChangingPassword = false }

        do {
            try await accountSettingsService.changePassword(currentPassword: currentPassword, newPassword: newPassword)
            currentPassword = ""
            newPassword = ""
            confirmNewPassword = ""
            passwordChangeSucceeded = true
        } catch let error as APIClientError {
            passwordError = error.userMessage
        } catch {
            passwordError = "Something went wrong. Please try again."
        }
    }

    func dismissPasswordError() {
        passwordError = nil
    }

    /// Called from the view's `.onDisappear`. SwiftUI can reuse this
    /// screen's `@State` across a pop/push cycle when it's pushed from a
    /// stable List row, so a typed-but-unsubmitted password would
    /// otherwise still be sitting in memory (and visibly pre-filled) the
    /// next time this screen appears.
    func clearPasswordFields() {
        currentPassword = ""
        newPassword = ""
        confirmNewPassword = ""
    }

    /// Call once the user has acknowledged the post-change "you'll need to
    /// sign in again" message. Reuses AuthManager.logout() — its best-effort
    /// remote revoke call is a harmless no-op here since the server already
    /// revoked this refresh token, and its local-clear path is exactly what
    /// this device's already-dead session needs.
    func acknowledgePasswordChange() async {
        guard passwordChangeSucceeded else { return }
        await authManager.logout()
    }

    // MARK: Content version

    /// Infrastructure-only: fetched and decoded so the endpoint has real
    /// native coverage, but deliberately not wired into any cache
    /// invalidation behavior — see Phase 17 §6.
    func fetchContentVersion() async {
        contentVersion = try? await accountSettingsService.fetchContentVersion().version
    }
}
