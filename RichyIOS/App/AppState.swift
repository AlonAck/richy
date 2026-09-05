import Foundation
import Observation

/// The app's one piece of global state: who is signed in, and therefore which
/// root screen shows. Everything else lives in feature view models.
@MainActor
@Observable
final class AppState {
    enum Phase: Equatable {
        case booting
        case notConfigured
        case signedOut
        case signedIn(AuthUser)
    }

    private(set) var phase: Phase = .booting
    private(set) var isDemoMode = false

    private let services: AppServices
    private var listener: Task<Void, Never>?

    init(services: AppServices) {
        self.services = services
    }

    /// Called once from the root view. Renders the last known session from the
    /// Keychain immediately, then follows the auth service.
    func start() {
        guard listener == nil else { return }
        if services.mode == .notConfigured {
            phase = .notConfigured
            return
        }
        isDemoMode = services.mode == .demo
        restoreCachedSession()
        listen()
    }

    /// From the not-configured screen: run the app on in-memory services.
    func enterDemoMode() {
        guard services.mode == .notConfigured, listener == nil else { return }
        isDemoMode = true
        phase = .signedOut
        listen()
    }

    func signOut() {
        do {
            try services.auth.signOut()
        } catch {
            Log.auth.error("Sign-out failed")
        }
        apply(nil)
    }

    /// The server has already deleted the account; drop the local session.
    func accountDeleted() {
        signOut()
    }

    private func restoreCachedSession() {
        guard let record = try? services.keychain.value(SessionRecord.self, for: SessionRecord.keychainKey) else {
            return
        }
        phase = .signedIn(record.provisionalUser)
    }

    private func listen() {
        let auth = services.auth
        listener = Task { [weak self] in
            for await user in auth.authStateChanges() {
                guard let self else { return }
                self.apply(user)
            }
        }
    }

    private func apply(_ user: AuthUser?) {
        if let user {
            phase = .signedIn(user)
            try? services.keychain.set(SessionRecord(user: user), for: SessionRecord.keychainKey)
        } else {
            phase = .signedOut
            try? services.keychain.remove(SessionRecord.keychainKey)
        }
    }
}
