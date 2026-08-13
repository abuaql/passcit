import Foundation

// Protocol seam mirroring EligibilityService/LearnService/etc., so
// AccountSettingsViewModel can be tested against mocked responses
// without a live server.
protocol AccountSettingsServicing {
    func updateProfile(displayName: String) async throws -> ProfileUpdateResponse
    func changePassword(currentPassword: String, newPassword: String) async throws
    func fetchContentVersion() async throws -> ContentVersionResponse
}

struct AccountSettingsService: AccountSettingsServicing {
    let apiClient: APIClient

    func updateProfile(displayName: String) async throws -> ProfileUpdateResponse {
        let endpoint = APIEndpoint(
            path: "/api/user/profile",
            method: .patch,
            body: ProfileUpdateRequest(name: displayName)
        )
        return try await apiClient.send(endpoint, as: ProfileUpdateResponse.self)
    }

    // No response model — a successful call either returns 200 or throws;
    // the caller (AccountSettingsViewModel) only needs the latter to
    // decide how to react to the session getting invalidated.
    func changePassword(currentPassword: String, newPassword: String) async throws {
        let endpoint = APIEndpoint(
            path: "/api/user/change-password",
            method: .post,
            body: ChangePasswordRequest(currentPassword: currentPassword, newPassword: newPassword)
        )
        _ = try await apiClient.send(endpoint)
    }

    // Public — the backend route (src/app/api/content/version/route.ts)
    // never requires auth, so this must not attach a bearer token.
    func fetchContentVersion() async throws -> ContentVersionResponse {
        let endpoint = APIEndpoint(path: "/api/content/version", method: .get, requiresAuth: false)
        return try await apiClient.send(endpoint, as: ContentVersionResponse.self)
    }
}
