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

    /// Google through Firebase's own web flow: a Safari sheet on the Firebase
    /// auth domain, the round trip handled by the SDK. The app registers the
    /// return URL scheme at build time from `GoogleService-Info.plist`.
    func signInWithGoogle() async throws -> AuthUser

    /// Apple, once the system sheet has produced an identity token. `rawNonce`
    /// is the value whose SHA-256 was sent to Apple; `fullName` arrives only
    /// on the very first sign-in and is kept as the display name.
    func signInWithApple(idToken: String, rawNonce: String, fullName: PersonNameComponents?) async throws -> AuthUser
}
