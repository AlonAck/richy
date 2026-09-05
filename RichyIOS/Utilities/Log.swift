import Foundation
import OSLog

/// Structured logging. Log events and outcomes, never payloads: no request or
/// response bodies, no amounts, no message text. A finance app's logs are part
/// of its privacy surface.
enum Log {
    private static let subsystem = Bundle.main.bundleIdentifier ?? "com.richy.app"

    static let app = Logger(subsystem: subsystem, category: "app")
    static let auth = Logger(subsystem: subsystem, category: "auth")
    static let network = Logger(subsystem: subsystem, category: "network")
    static let keychain = Logger(subsystem: subsystem, category: "keychain")
}
