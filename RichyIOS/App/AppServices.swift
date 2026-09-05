import SwiftUI

/// Every service the app talks to, assembled once at launch. A plain struct,
/// not a container framework: the app is small enough to read its own wiring.
struct AppServices: Sendable {
    enum Mode: Equatable, Sendable {
        /// Firebase is configured and the real API is used.
        case live
        /// Previews and demo mode: in-memory auth, canned replies, nothing saved.
        case demo
        /// `GoogleService-Info.plist` is missing from the bundle.
        case notConfigured
    }

    let mode: Mode
    let auth: any AuthService
    let api: APIClient
    let chat: any ChatService
    let account: any AccountService
    let ledger: any LedgerService
    let keychain: KeychainStore

    /// Production wiring. Falls back to mocks - and says so through `mode` -
    /// when Firebase could not be configured.
    static func live(environment: APIEnvironment = .standard, firebaseConfigured: Bool) -> AppServices {
        guard firebaseConfigured else { return mock(mode: .notConfigured) }
        let auth = FirebaseAuthService()
        let api = APIClient(environment: environment, tokenProvider: auth)
        return AppServices(mode: .live,
                           auth: auth,
                           api: api,
                           chat: RichyChatService(client: api),
                           account: RichyAccountService(client: api),
                           ledger: FirestoreLedgerService(),
                           keychain: KeychainStore())
    }

    /// In-memory wiring for previews, demo mode and the not-configured state.
    /// Uses its own Keychain service name so demo runs never touch a real
    /// session record.
    static func mock(mode: Mode = .demo, user: AuthUser? = nil) -> AppServices {
        let auth = MockAuthService(user: user)
        let api = APIClient(environment: .standard, tokenProvider: auth)
        return AppServices(mode: mode,
                           auth: auth,
                           api: api,
                           chat: MockChatService(),
                           account: MockAccountService(),
                           ledger: MockLedgerService(),
                           keychain: KeychainStore(service: "com.richy.app.demo"))
    }
}

private struct AppServicesKey: EnvironmentKey {
    static let defaultValue = AppServices.mock()
}

extension EnvironmentValues {
    var services: AppServices {
        get { self[AppServicesKey.self] }
        set { self[AppServicesKey.self] = newValue }
    }
}
