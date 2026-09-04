import Foundation
import FirebaseAuth

/// The real thing: Firebase Auth's iOS SDK. It persists the session in the
/// Keychain and refreshes ID tokens on its own; this class only translates
/// between the SDK's `User` and the app's `AuthUser`, and between the SDK's
/// errors and `AuthError`.
final class FirebaseAuthService: AuthService {
    var currentUser: AuthUser? {
        Auth.auth().currentUser.map(AuthUser.init(firebaseUser:))
    }

    func authStateChanges() -> AsyncStream<AuthUser?> {
        AsyncStream { continuation in
            let handle = Auth.auth().addStateDidChangeListener { _, user in
                continuation.yield(user.map(AuthUser.init(firebaseUser:)))
            }
            let box = ListenerBox(handle: handle)
            continuation.onTermination = { _ in
                Auth.auth().removeStateDidChangeListener(box.handle)
            }
        }
    }

    func signIn(email: String, password: String) async throws -> AuthUser {
        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            Log.auth.info("Signed in with password")
            return AuthUser(firebaseUser: result.user)
        } catch {
            throw AuthError.from(error)
        }
    }

    func signUp(email: String, password: String) async throws -> AuthUser {
        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)
            Log.auth.info("Created account with password")
            return AuthUser(firebaseUser: result.user)
        } catch {
            throw AuthError.from(error)
        }
    }

    func sendPasswordReset(email: String) async throws {
        do {
            try await Auth.auth().sendPasswordReset(withEmail: email)
        } catch {
            throw AuthError.from(error)
        }
    }

    func signOut() throws {
        do {
            try Auth.auth().signOut()
            Log.auth.info("Signed out")
        } catch {
            throw AuthError.from(error)
        }
    }

    func idToken(forceRefresh: Bool) async throws -> String? {
        guard let user = Auth.auth().currentUser else { return nil }
        return try await user.getIDToken(forcingRefresh: forceRefresh)
    }
}

/// The listener handle is an `NSObjectProtocol`, which the compiler cannot
/// prove Sendable; boxing it keeps the `onTermination` closure clean.
private final class ListenerBox: @unchecked Sendable {
    let handle: NSObjectProtocol

    init(handle: NSObjectProtocol) {
        self.handle = handle
    }
}

extension AuthUser {
    init(firebaseUser user: User) {
        let providerID = user.providerData.first?.providerID ?? ""
        let provider: AuthProvider
        switch providerID {
        case "password": provider = .password
        case "google.com": provider = .google
        case "apple.com": provider = .apple
        default: provider = .unknown
        }
        self.init(uid: user.uid,
                  email: user.email,
                  displayName: user.displayName,
                  isEmailVerified: user.isEmailVerified,
                  provider: provider)
    }
}
