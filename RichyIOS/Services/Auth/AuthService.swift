import Foundation

/// Sign-in, sign-up, session and token access, behind one protocol so the app
/// can run on Firebase in production and on an in-memory mock in previews and
/// demo mode. `TokenProvider` (see APIClient.swift) is how the API client asks
/// for the bearer token without knowing where sessions come from.
protocol AuthService: TokenProvider {
    var currentUser: AuthUser? { get }

    /// Emits the current user as soon as it is iterated, then every change.
    /// Ends when the iterating task is cancelled.
    func authStateChanges() -> AsyncStream<AuthUser?>

    func signIn(email: String, password: String) async throws -> AuthUser
    func signUp(email: String, password: String) async throws -> AuthUser
    func sendPasswordReset(email: String) async throws
    func signOut() throws
}
