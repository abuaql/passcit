import Testing
import Foundation
@testable import Passcit

@Suite("KeychainStore", .serialized)
final class KeychainStoreTests {
    let store = KeychainStore(service: "com.passcit.app.tests.keychain")

    init() {
        store.delete("test-key")
    }

    deinit {
        store.delete("test-key")
    }

    @Test func setAndGetData() {
        store.set(Data("hello".utf8), for: "test-key")
        #expect(store.get("test-key") == Data("hello".utf8))
    }

    @Test func setOverwritesPreviousValue() {
        store.set(Data("first".utf8), for: "test-key")
        store.set(Data("second".utf8), for: "test-key")
        #expect(store.get("test-key") == Data("second".utf8))
    }

    @Test func deleteRemovesValue() {
        store.set(Data("hello".utf8), for: "test-key")
        store.delete("test-key")
        #expect(store.get("test-key") == nil)
    }

    @Test func getMissingKeyReturnsNil() {
        #expect(store.get("does-not-exist") == nil)
    }

    @Test func stringConvenienceRoundTrips() {
        store.setString("a-refresh-token", for: "test-key")
        #expect(store.getString("test-key") == "a-refresh-token")
    }

    @Test func codableConvenienceRoundTrips() {
        let user = User(id: "u_1", name: "Jane", email: "jane@example.com", image: nil, role: .user)
        store.setCodable(user, for: "test-key")
        #expect(store.getCodable(User.self, for: "test-key") == user)
    }
}
