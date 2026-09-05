import Foundation
import Security

/// Small, dependency-free wrapper over the iOS Keychain (generic-password
/// items). Firebase Auth stores the actual credential itself; this holds the
/// app's own small secrets - today the `SessionRecord` used for an instant
/// cold-start render. Items are `AfterFirstUnlockThisDeviceOnly`: readable in
/// the background after the first unlock, never migrated to another device.
final class KeychainStore: Sendable {
    enum KeychainError: Error, LocalizedError {
        case unexpectedStatus(OSStatus)

        var errorDescription: String? {
            switch self {
            case .unexpectedStatus(let status):
                return "Keychain error \(status)."
            }
        }
    }

    private let service: String

    init(service: String = Bundle.main.bundleIdentifier ?? "com.richy.app") {
        self.service = service
    }

    // MARK: Raw data

    func set(_ data: Data, for key: String) throws {
        var query = baseQuery(for: key)
        let attributes: [String: Any] = [kSecValueData as String: data]
        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecSuccess { return }
        guard updateStatus == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(updateStatus)
        }
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let addStatus = SecItemAdd(query as CFDictionary, nil)
        guard addStatus == errSecSuccess else {
            throw KeychainError.unexpectedStatus(addStatus)
        }
    }

    func data(for key: String) throws -> Data? {
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = kCFBooleanTrue
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
        return result as? Data
    }

    func remove(_ key: String) throws {
        let status = SecItemDelete(baseQuery(for: key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    // MARK: Codable convenience

    func set<Value: Encodable>(_ value: Value, for key: String) throws {
        try set(try JSONEncoder().encode(value), for: key)
    }

    func value<Value: Decodable>(_ type: Value.Type, for key: String) throws -> Value? {
        guard let data = try data(for: key) else { return nil }
        return try JSONDecoder().decode(type, from: data)
    }

    private func baseQuery(for key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
    }
}
