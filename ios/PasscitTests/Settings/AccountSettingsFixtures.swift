import Foundation
@testable import Passcit

/// Small builders for Account Settings model fixtures. Not a @Test/@Suite itself.
enum AccountSettingsFixtures {
    static func profileUpdateResponse(name: String? = "Jane Doe") -> ProfileUpdateResponse {
        ProfileUpdateResponse(name: name)
    }

    static func contentVersion(_ version: String = "a1b2c3d4e5f6a7b8") -> ContentVersionResponse {
        ContentVersionResponse(version: version)
    }
}
