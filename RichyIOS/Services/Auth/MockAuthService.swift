import Foundation

/// In-memory auth for previews, demo mode and tests. Any email containing "@"
/// with a non-empty password signs in; nothing touches the network.
final class MockAuthService: AuthService, @unchecked Sendable {
    static let demoUser = AuthUser(uid: "demo-uid",
                                   email: "demo@richy.app",
                                   displayName: "Demo",
                                   isEmailVerified: true,
                                   provider: .demo)

    private let lock = NSLock()
    private var user: AuthUser?
    private var continuations: [UUID: AsyncStream<AuthUser?>.Continuation] = [:]

    init(user: AuthUser? = nil) {
        self.user = user
    }

    var currentUser: AuthUser? {
        lock.lock()
        defer { lock.unlock() }
        return user
    }

    func authStateChanges() -> AsyncStream<AuthUser?> {
        AsyncStream { continuation in
            let id = UUID()
            lock.lock()
            continuations[id] = continuation
            let current = user
            lock.unlock()
            continuation.yield(current)
            continuation.onTermination = { [weak self] _ in
                guard let self else { return }
                self.lock.lock()
                self.continuations[id] = nil
                self.lock.unlock()
            }
        }
    }

    func signIn(email: String, password: String) async throws -> AuthUser {
        try await Task.sleep(nanoseconds: 400_000_000)
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.contains("@") else { throw AuthError.invalidEmail }
        guard !password.isEmpty else { throw AuthError.invalidCredential }
        let signedIn = AuthUser(uid: "demo-uid", email: trimmed, displayName: nil, isEmailVerified: true, provider: .demo)
        update(signedIn)
        return signedIn
    }

    func signUp(email: String, password: String) async throws -> AuthUser {
        try await Task.sleep(nanoseconds: 400_000_000)
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.contains("@") else { throw AuthError.invalidEmail }
        guard password.count >= 6 else { throw AuthError.weakPassword }
        let created = AuthUser(uid: "demo-uid", email: trimmed, displayName: nil, isEmailVerified: false, provider: .demo)
        update(created)
        return created
    }

    func sendPasswordReset(email: String) async throws {
        try await Task.sleep(nanoseconds: 300_000_000)
        guard email.contains("@") else { throw AuthError.invalidEmail }
    }

    func signOut() throws {
        update(nil)
    }

    func idToken(forceRefresh: Bool) async throws -> String? {
        currentUser == nil ? nil : "demo-token"
    }

    private func update(_ next: AuthUser?) {
        lock.lock()
        user = next
        let listeners = Array(continuations.values)
        lock.unlock()
        for continuation in listeners {
            continuation.yield(next)
        }
    }
}
