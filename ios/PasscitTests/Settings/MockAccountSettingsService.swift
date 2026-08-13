import Foundation
@testable import Passcit

/// Test double for AccountSettingsServicing — lets AccountSettingsViewModel
/// be tested against canned responses/errors without a live server. Not a
/// @Test/@Suite itself.
final class MockAccountSettingsService: AccountSettingsServicing {
    var updateProfileResult: Result<ProfileUpdateResponse, Error> = .failure(TestSetupError.notConfigured)
    var changePasswordResult: Result<Void, Error> = .failure(TestSetupError.notConfigured)
    var fetchContentVersionResult: Result<ContentVersionResponse, Error> = .failure(TestSetupError.notConfigured)

    private(set) var updateProfileCallCount = 0
    private(set) var lastDisplayName: String?
    private(set) var changePasswordCallCount = 0
    private(set) var lastCurrentPassword: String?
    private(set) var lastNewPassword: String?
    private(set) var fetchContentVersionCallCount = 0

    enum TestSetupError: Error {
        case notConfigured
    }

    func updateProfile(displayName: String) async throws -> ProfileUpdateResponse {
        updateProfileCallCount += 1
        lastDisplayName = displayName
        return try updateProfileResult.get()
    }

    func changePassword(currentPassword: String, newPassword: String) async throws {
        changePasswordCallCount += 1
        lastCurrentPassword = currentPassword
        lastNewPassword = newPassword
        _ = try changePasswordResult.get()
    }

    func fetchContentVersion() async throws -> ContentVersionResponse {
        fetchContentVersionCallCount += 1
        return try fetchContentVersionResult.get()
    }
}
