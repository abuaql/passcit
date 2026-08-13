import Foundation

// Matches POST /api/native/auth/refresh's response exactly, so it also
// doubles as that endpoint's decode target directly.
struct TokenPair: Codable, Equatable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
    let tokenType: String
}
