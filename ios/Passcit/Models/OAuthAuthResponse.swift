import Foundation

// POST /api/native/auth/apple and /google share this shape.
struct OAuthAuthResponse: Codable, Equatable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
    let tokenType: String
    let user: User
    let isNewUser: Bool

    var tokenPair: TokenPair {
        TokenPair(accessToken: accessToken, refreshToken: refreshToken, expiresIn: expiresIn, tokenType: tokenType)
    }
}
