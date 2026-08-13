import Foundation

// POST /api/native/auth/login and /register share this shape.
struct AuthResponse: Codable, Equatable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
    let tokenType: String
    let user: User

    var tokenPair: TokenPair {
        TokenPair(accessToken: accessToken, refreshToken: refreshToken, expiresIn: expiresIn, tokenType: tokenType)
    }
}
