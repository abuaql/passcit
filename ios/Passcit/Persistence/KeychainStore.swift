import Foundation
import Security

// Generic Keychain wrapper, not auth-specific — SessionStore builds the
// auth-specific meaning on top. `service` is injectable so tests can use
// an isolated namespace instead of colliding with real app state.
struct KeychainStore {
    let service: String

    func set(_ data: Data, for key: String) {
        delete(key)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    func get(_ key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess else { return nil }
        return result as? Data
    }

    func delete(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }

    func setString(_ value: String, for key: String) {
        set(Data(value.utf8), for: key)
    }

    func getString(_ key: String) -> String? {
        get(key).flatMap { String(data: $0, encoding: .utf8) }
    }

    func setCodable<T: Encodable>(_ value: T, for key: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        set(data, for: key)
    }

    func getCodable<T: Decodable>(_ type: T.Type, for key: String) -> T? {
        guard let data = get(key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }
}
