import Foundation

// The typed, auth-specific session layer that AuthManager/APIClient talk
// to. Wraps KeychainStore rather than exposing raw Keychain calls.
final class SessionStore {
    private let keychain: KeychainStore

    private enum Key: String {
        case accessToken
        case refreshToken
        case accessTokenExpiresAt
        case cachedUser
    }

    init(service: String = "com.passcit.app") {
        self.keychain = KeychainStore(service: service)
    }

    var accessToken: String? {
        keychain.getString(Key.accessToken.rawValue)
    }

    var refreshToken: String? {
        keychain.getString(Key.refreshToken.rawValue)
    }

    var accessTokenExpiresAt: Date? {
        keychain.getString(Key.accessTokenExpiresAt.rawValue).flatMap {
            ISO8601DateFormatter().date(from: $0)
        }
    }

    var cachedUser: User? {
        keychain.getCodable(User.self, for: Key.cachedUser.rawValue)
    }

    var hasSession: Bool {
        refreshToken != nil
    }

    // 30s skew buffer so a request built "now" doesn't race an
    // access token that expires mid-flight.
    var isAccessTokenLikelyValid: Bool {
        guard let expiresAt = accessTokenExpiresAt else { return false }
        return expiresAt > Date().addingTimeInterval(30)
    }

    // MUST be called on every login/register/OAuth/refresh response —
    // refresh tokens rotate on use, so the old one must be overwritten
    // every time, not just on first login.
    func saveTokens(_ pair: TokenPair) {
        keychain.setString(pair.accessToken, for: Key.accessToken.rawValue)
        keychain.setString(pair.refreshToken, for: Key.refreshToken.rawValue)
        let expiresAt = Date().addingTimeInterval(TimeInterval(pair.expiresIn))
        keychain.setString(ISO8601DateFormatter().string(from: expiresAt), for: Key.accessTokenExpiresAt.rawValue)
    }

    func saveUser(_ user: User) {
        keychain.setCodable(user, for: Key.cachedUser.rawValue)
    }

    func clear() {
        keychain.delete(Key.accessToken.rawValue)
        keychain.delete(Key.refreshToken.rawValue)
        keychain.delete(Key.accessTokenExpiresAt.rawValue)
        keychain.delete(Key.cachedUser.rawValue)
    }

    #if DEBUG
    // Verification-only: corrupts the access token while leaving the
    // refresh token intact, to exercise the 401-retry-and-refresh path
    // without waiting out the real 15-minute access token TTL.
    func corruptAccessTokenForTesting() {
        keychain.setString("corrupted-for-testing", for: Key.accessToken.rawValue)
    }
    #endif
}
