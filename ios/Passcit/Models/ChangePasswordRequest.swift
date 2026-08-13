import Foundation

// POST /api/user/change-password — mirrors changePasswordSchema in
// src/lib/validations/auth.ts. The response body (`{ message }`) carries
// nothing the client needs beyond success/failure, so no response model.
struct ChangePasswordRequest: Encodable {
    let currentPassword: String
    let newPassword: String
}
