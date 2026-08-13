import Testing
import Foundation
@testable import Passcit

@Suite("SessionStore", .serialized)
final class SessionStoreTests {
    let store = SessionStore(service: "com.passcit.app.tests.session")

    init() { store.clear() }
    deinit { store.clear() }

    @Test func noSessionInitially() {
        #expect(store.hasSession == false)
        #expect(store.isAccessTokenLikelyValid == false)
        #expect(store.cachedUser == nil)
    }

    @Test func saveTokensPersistsAllFields() {
        let pair = TokenPair(accessToken: "at1", refreshToken: "rt1", expiresIn: 900, tokenType: "Bearer")
        store.saveTokens(pair)

        #expect(store.accessToken == "at1")
        #expect(store.refreshToken == "rt1")
        #expect(store.hasSession == true)
        #expect(store.isAccessTokenLikelyValid == true)
    }

    // The refresh token is single-use on the server — every refresh call
    // MUST overwrite the stored one, never accumulate/append.
    @Test func saveTokensOverwritesRefreshTokenOnRotation() {
        store.saveTokens(TokenPair(accessToken: "at1", refreshToken: "rt1", expiresIn: 900, tokenType: "Bearer"))
        store.saveTokens(TokenPair(accessToken: "at2", refreshToken: "rt2", expiresIn: 900, tokenType: "Bearer"))

        #expect(store.accessToken == "at2")
        #expect(store.refreshToken == "rt2")
    }

    @Test func expiredAccessTokenIsNotLikelyValid() {
        store.saveTokens(TokenPair(accessToken: "at1", refreshToken: "rt1", expiresIn: -10, tokenType: "Bearer"))
        #expect(store.isAccessTokenLikelyValid == false)
        // The refresh token itself is unaffected by access-token expiry.
        #expect(store.hasSession == true)
    }

    @Test func saveAndReadCachedUser() {
        let user = User(id: "u_1", name: "Jane", email: "jane@example.com", image: nil, role: .user)
        store.saveUser(user)
        #expect(store.cachedUser == user)
    }

    @Test func clearRemovesEverything() {
        store.saveTokens(TokenPair(accessToken: "at1", refreshToken: "rt1", expiresIn: 900, tokenType: "Bearer"))
        store.saveUser(User(id: "u_1", name: "Jane", email: "jane@example.com", image: nil, role: .user))

        store.clear()

        #expect(store.accessToken == nil)
        #expect(store.refreshToken == nil)
        #expect(store.hasSession == false)
        #expect(store.cachedUser == nil)
    }
}
