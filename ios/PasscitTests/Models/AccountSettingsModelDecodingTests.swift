import Testing
import Foundation
@testable import Passcit

@Suite("Account Settings model decoding/encoding")
struct AccountSettingsModelDecodingTests {

    // MARK: ProfileUpdateRequest encoding

    @Test func profileUpdateRequestEncodesTheNameField() throws {
        let request = ProfileUpdateRequest(name: "Jane Doe")
        let data = try JSONEncoder().encode(request)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        #expect(object?["name"] as? String == "Jane Doe")
        #expect(object?.count == 1, "must not send extra fields the backend's Zod schema doesn't expect")
    }

    // MARK: ProfileUpdateResponse decoding

    @Test func decodesProfileUpdateResponse() throws {
        let json = """
        { "name": "Jane Doe" }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(ProfileUpdateResponse.self, from: json)

        #expect(response.name == "Jane Doe")
    }

    @Test func decodesProfileUpdateResponseWithNullName() throws {
        let json = """
        { "name": null }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(ProfileUpdateResponse.self, from: json)

        #expect(response.name == nil)
    }

    // MARK: ChangePasswordRequest encoding

    @Test func changePasswordRequestEncodesBothPasswordFields() throws {
        let request = ChangePasswordRequest(currentPassword: "oldPass1", newPassword: "newPass2")
        let data = try JSONEncoder().encode(request)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        #expect(object?["currentPassword"] as? String == "oldPass1")
        #expect(object?["newPassword"] as? String == "newPass2")
        #expect(object?.count == 2)
    }

    // MARK: ContentVersionResponse decoding

    @Test func decodesContentVersionResponse() throws {
        let json = """
        { "version": "a1b2c3d4e5f6a7b8" }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(ContentVersionResponse.self, from: json)

        #expect(response.version == "a1b2c3d4e5f6a7b8")
    }
}
