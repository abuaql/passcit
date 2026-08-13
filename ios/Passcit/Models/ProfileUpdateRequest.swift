import Foundation

// PATCH /api/user/profile — mirrors updateProfileSchema in
// src/lib/validations/auth.ts (name only).
struct ProfileUpdateRequest: Encodable {
    let name: String
}

// The route only echoes back the updated name, not a full user object.
struct ProfileUpdateResponse: Codable, Equatable {
    let name: String?
}
