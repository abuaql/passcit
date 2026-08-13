import Testing
import Foundation
@testable import Passcit

@Suite("AccountSettingsViewModel")
struct AccountSettingsViewModelTests {

    // AuthManager has no protocol seam (every other call site in the app
    // takes the concrete type directly, e.g. ProfileViewModel), so tests
    // use a real instance backed by an isolated Keychain namespace and an
    // APIClient pointed at an unroutable loopback port — every network
    // call fails fast (connection refused) and is either `try?`-swallowed
    // (refreshCurrentUser) or ignored before the unconditional local clear
    // (logout), so this is deterministic without any network stubbing.
    // bootstrap() is what actually moves AuthManager off its initial
    // .bootstrapping state: with a cached user present it sets
    // .signedIn(cached) synchronously, then a failed reconciliation
    // fetch (unreachable port) is swallowed and the optimistic
    // .signedIn state is kept — see AuthManager.bootstrap().
    private func makeAuthManager(signedInAs user: User = User(id: "u_1", name: "Jane Doe", email: "jane@example.com", image: nil, role: .user)) async -> AuthManager {
        let sessionStore = SessionStore(service: "com.passcit.app.tests.accountsettings")
        sessionStore.clear()
        sessionStore.saveTokens(TokenPair(accessToken: "at1", refreshToken: "rt1", expiresIn: 900, tokenType: "Bearer"))
        sessionStore.saveUser(user)
        let apiClient = APIClient(baseURL: URL(string: "http://127.0.0.1:1")!, sessionStore: sessionStore)
        let authManager = AuthManager(apiClient: apiClient, sessionStore: sessionStore)
        await authManager.bootstrap()
        return authManager
    }

    func makeViewModel(
        displayName: String = "Jane Doe",
        service: MockAccountSettingsService = MockAccountSettingsService(),
        authManager: AuthManager? = nil
    ) async -> (AccountSettingsViewModel, MockAccountSettingsService, AuthManager) {
        let manager: AuthManager
        if let authManager {
            manager = authManager
        } else {
            manager = await makeAuthManager()
        }
        let viewModel = AccountSettingsViewModel(displayName: displayName, accountSettingsService: service, authManager: manager)
        return (viewModel, service, manager)
    }

    // MARK: Display name validation

    @Test func emptyNameProducesAValidationError() async {
        let (viewModel, _, _) = await makeViewModel(displayName: "")
        #expect(viewModel.nameValidationError != nil)
        #expect(viewModel.canSaveName == false)
    }

    @Test func tooShortNameProducesAValidationError() async {
        let (viewModel, _, _) = await makeViewModel(displayName: "J")
        #expect(viewModel.nameValidationError != nil)
    }

    @Test func validNameHasNoValidationErrorAndCanSave() async {
        let (viewModel, _, _) = await makeViewModel(displayName: "Jane Doe")
        #expect(viewModel.nameValidationError == nil)
        #expect(viewModel.canSaveName == true)
    }

    // MARK: Display name submission

    @Test func successfulNameUpdateStoresTheReturnedNameAndSucceeds() async {
        let (viewModel, service, _) = await makeViewModel()
        service.updateProfileResult = .success(AccountSettingsFixtures.profileUpdateResponse(name: "New Name"))

        await viewModel.saveName()

        #expect(viewModel.displayName == "New Name")
        #expect(viewModel.nameSaveSucceeded == true)
        #expect(viewModel.nameError == nil)
        #expect(service.updateProfileCallCount == 1)
    }

    @Test func nameUpdateTrimsWhitespaceBeforeSubmitting() async {
        let (viewModel, service, _) = await makeViewModel(displayName: "  Jane Doe  ")
        service.updateProfileResult = .success(AccountSettingsFixtures.profileUpdateResponse(name: "Jane Doe"))

        await viewModel.saveName()

        #expect(service.lastDisplayName == "Jane Doe")
    }

    @Test func failedNameUpdateSurfacesTheServerMessageAndLeavesSucceededFalse() async {
        let (viewModel, service, _) = await makeViewModel()
        service.updateProfileResult = .failure(APIClientError.server(status: 500, message: "Could not update profile."))

        await viewModel.saveName()

        #expect(viewModel.nameError == "Could not update profile.")
        #expect(viewModel.nameSaveSucceeded == false)
    }

    @Test func sessionExpirationDuringNameUpdateSurfacesTheUserFacingMessage() async {
        let (viewModel, service, _) = await makeViewModel()
        service.updateProfileResult = .failure(APIClientError.sessionExpired)

        await viewModel.saveName()

        #expect(viewModel.nameError == APIClientError.sessionExpired.userMessage)
    }

    @Test func doesNotSubmitNameWhenInvalid() async {
        let (viewModel, service, _) = await makeViewModel(displayName: "")

        await viewModel.saveName()

        #expect(service.updateProfileCallCount == 0)
    }

    @Test func nameSaveSucceededResetsOnANewAttempt() async {
        let (viewModel, service, _) = await makeViewModel()
        service.updateProfileResult = .success(AccountSettingsFixtures.profileUpdateResponse())
        await viewModel.saveName()
        #expect(viewModel.nameSaveSucceeded == true)

        service.updateProfileResult = .failure(APIClientError.server(status: 500, message: "boom"))
        await viewModel.saveName()

        #expect(viewModel.nameSaveSucceeded == false, "a fresh attempt must not carry over the prior success flag")
    }

    @Test func dismissNameErrorClearsIt() async {
        let (viewModel, service, _) = await makeViewModel()
        service.updateProfileResult = .failure(APIClientError.server(status: 500, message: "boom"))
        await viewModel.saveName()
        #expect(viewModel.nameError != nil)

        viewModel.dismissNameError()

        #expect(viewModel.nameError == nil)
    }

    @Test func retryingNameUpdateAfterAFailureCanSucceed() async {
        let (viewModel, service, _) = await makeViewModel()
        service.updateProfileResult = .failure(APIClientError.server(status: 500, message: "boom"))
        await viewModel.saveName()
        #expect(viewModel.nameError != nil)

        service.updateProfileResult = .success(AccountSettingsFixtures.profileUpdateResponse(name: "Jane Doe"))
        await viewModel.saveName()

        #expect(viewModel.nameError == nil)
        #expect(viewModel.nameSaveSucceeded == true)
        #expect(service.updateProfileCallCount == 2)
    }

    // MARK: Password validation

    @Test func mismatchedPasswordConfirmationProducesAValidationError() async {
        let (viewModel, _, _) = await makeViewModel()
        viewModel.currentPassword = "oldPass1"
        viewModel.newPassword = "newPass1"
        viewModel.confirmNewPassword = "different"

        #expect(viewModel.passwordValidationErrors.contains(where: { $0.contains("match") }))
        #expect(viewModel.canChangePassword == false)
    }

    @Test func emptyPasswordFieldsProduceValidationErrors() async {
        let (viewModel, _, _) = await makeViewModel()
        #expect(viewModel.passwordValidationErrors.isEmpty == false)
        #expect(viewModel.canChangePassword == false)
    }

    @Test func validMatchingPasswordsHaveNoValidationErrors() async {
        let (viewModel, _, _) = await makeViewModel()
        viewModel.currentPassword = "oldPass1"
        viewModel.newPassword = "newPass1"
        viewModel.confirmNewPassword = "newPass1"

        #expect(viewModel.passwordValidationErrors.isEmpty)
        #expect(viewModel.canChangePassword == true)
    }

    // MARK: Password submission

    @Test func successfulPasswordChangeClearsFieldsAndSucceeds() async {
        let (viewModel, service, _) = await makeViewModel()
        viewModel.currentPassword = "oldPass1"
        viewModel.newPassword = "newPass1"
        viewModel.confirmNewPassword = "newPass1"
        service.changePasswordResult = .success(())

        await viewModel.changePassword()

        #expect(viewModel.passwordChangeSucceeded == true)
        #expect(viewModel.passwordError == nil)
        #expect(viewModel.currentPassword.isEmpty)
        #expect(viewModel.newPassword.isEmpty)
        #expect(viewModel.confirmNewPassword.isEmpty)
        #expect(service.lastCurrentPassword == "oldPass1")
        #expect(service.lastNewPassword == "newPass1")
    }

    @Test func passwordChangeServerErrorSurfacesItsMessageAndDoesNotClearFields() async {
        let (viewModel, service, _) = await makeViewModel()
        viewModel.currentPassword = "wrongPass"
        viewModel.newPassword = "newPass1"
        viewModel.confirmNewPassword = "newPass1"
        service.changePasswordResult = .failure(APIClientError.server(status: 400, message: "Current password is incorrect."))

        await viewModel.changePassword()

        #expect(viewModel.passwordError == "Current password is incorrect.")
        #expect(viewModel.passwordChangeSucceeded == false)
        #expect(viewModel.currentPassword == "wrongPass", "a failed attempt must not silently clear what the user typed")
    }

    @Test func sessionExpirationDuringPasswordChangeSurfacesTheUserFacingMessage() async {
        let (viewModel, service, _) = await makeViewModel()
        viewModel.currentPassword = "oldPass1"
        viewModel.newPassword = "newPass1"
        viewModel.confirmNewPassword = "newPass1"
        service.changePasswordResult = .failure(APIClientError.sessionExpired)

        await viewModel.changePassword()

        #expect(viewModel.passwordError == APIClientError.sessionExpired.userMessage)
    }

    @Test func doesNotSubmitPasswordChangeWhenInvalid() async {
        let (viewModel, service, _) = await makeViewModel()
        viewModel.currentPassword = "oldPass1"
        viewModel.newPassword = "newPass1"
        viewModel.confirmNewPassword = "mismatch"

        await viewModel.changePassword()

        #expect(service.changePasswordCallCount == 0)
    }

    @Test func passwordChangeSucceededResetsOnANewAttempt() async {
        let (viewModel, service, _) = await makeViewModel()
        viewModel.currentPassword = "oldPass1"
        viewModel.newPassword = "newPass1"
        viewModel.confirmNewPassword = "newPass1"
        service.changePasswordResult = .success(())
        await viewModel.changePassword()
        #expect(viewModel.passwordChangeSucceeded == true)

        viewModel.currentPassword = "oldPass1"
        viewModel.newPassword = "newPass2"
        viewModel.confirmNewPassword = "newPass2"
        service.changePasswordResult = .failure(APIClientError.server(status: 500, message: "boom"))
        await viewModel.changePassword()

        #expect(viewModel.passwordChangeSucceeded == false)
    }

    @Test func dismissPasswordErrorClearsIt() async {
        let (viewModel, service, _) = await makeViewModel()
        viewModel.currentPassword = "oldPass1"
        viewModel.newPassword = "newPass1"
        viewModel.confirmNewPassword = "newPass1"
        service.changePasswordResult = .failure(APIClientError.server(status: 500, message: "boom"))
        await viewModel.changePassword()
        #expect(viewModel.passwordError != nil)

        viewModel.dismissPasswordError()

        #expect(viewModel.passwordError == nil)
    }

    // MARK: Post-password-change session handling

    @Test func acknowledgingAPasswordChangeSignsOutLocally() async {
        let authManager = await makeAuthManager()
        let (viewModel, service, _) = await makeViewModel(authManager: authManager)
        viewModel.currentPassword = "oldPass1"
        viewModel.newPassword = "newPass1"
        viewModel.confirmNewPassword = "newPass1"
        service.changePasswordResult = .success(())
        await viewModel.changePassword()

        await viewModel.acknowledgePasswordChange()

        #expect(authManager.state == .signedOut)
    }

    @Test func acknowledgingWithoutAPriorSuccessDoesNotSignOut() async {
        let authManager = await makeAuthManager()
        let (viewModel, _, _) = await makeViewModel(authManager: authManager)

        await viewModel.acknowledgePasswordChange()

        if case .signedIn = authManager.state {
            // expected: untouched
        } else {
            Issue.record("acknowledging without a successful password change must not sign the user out")
        }
    }

    // MARK: Screen disappearance

    // SwiftUI can reuse this screen's @State across a pop/push cycle
    // (e.g. a NavigationLink pushed from a stable List row), so leftover
    // password text must not linger in memory once the user navigates
    // away without submitting.
    @Test func clearPasswordFieldsResetsAllThreePasswordFields() async {
        let (viewModel, _, _) = await makeViewModel()
        viewModel.currentPassword = "oldPass1"
        viewModel.newPassword = "newPass1"
        viewModel.confirmNewPassword = "newPass1"

        viewModel.clearPasswordFields()

        #expect(viewModel.currentPassword.isEmpty)
        #expect(viewModel.newPassword.isEmpty)
        #expect(viewModel.confirmNewPassword.isEmpty)
    }

    // MARK: Loading state

    @Test func isSavingNameIsFalseAfterCompletion() async {
        let (viewModel, service, _) = await makeViewModel()
        service.updateProfileResult = .success(AccountSettingsFixtures.profileUpdateResponse())

        await viewModel.saveName()

        #expect(viewModel.isSavingName == false)
    }

    @Test func isChangingPasswordIsFalseAfterCompletion() async {
        let (viewModel, service, _) = await makeViewModel()
        viewModel.currentPassword = "oldPass1"
        viewModel.newPassword = "newPass1"
        viewModel.confirmNewPassword = "newPass1"
        service.changePasswordResult = .success(())

        await viewModel.changePassword()

        #expect(viewModel.isChangingPassword == false)
    }

    // MARK: Content version

    @Test func fetchContentVersionStoresTheDecodedVersion() async {
        let (viewModel, service, _) = await makeViewModel()
        service.fetchContentVersionResult = .success(AccountSettingsFixtures.contentVersion("abc123"))

        await viewModel.fetchContentVersion()

        #expect(viewModel.contentVersion == "abc123")
        #expect(service.fetchContentVersionCallCount == 1)
    }

    @Test func fetchContentVersionFailureLeavesItNil() async {
        let (viewModel, service, _) = await makeViewModel()
        service.fetchContentVersionResult = .failure(APIClientError.server(status: 500, message: "boom"))

        await viewModel.fetchContentVersion()

        #expect(viewModel.contentVersion == nil)
    }
}
