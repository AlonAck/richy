import Foundation

/// What the Keychain remembers between launches: enough to draw the signed-in
/// shell before Firebase has restored the real session, and nothing that could
/// authenticate anyone. Never the ID token - Firebase owns and refreshes that.
struct SessionRecord: Codable, Equatable, Sendable {
    static let keychainKey = "session.record.v1"

    let uid: String
    let email: String?
    let provider: AuthProvider
    let signedInAt: Date

    init(user: AuthUser, signedInAt: Date = Date()) {
        uid = user.uid
        email = user.email
        provider = user.provider
        self.signedInAt = signedInAt
    }

    /// A provisional user to render with until the auth listener confirms.
    var provisionalUser: AuthUser {
        AuthUser(uid: uid, email: email, displayName: nil, isEmailVerified: false, provider: provider)
    }
}
