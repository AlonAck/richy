import Foundation

enum AuthProvider: String, Codable, Equatable, Sendable {
    case password
    case google
    case apple
    case demo
    case unknown
}

/// The signed-in person, as a plain value. Firebase's `User` object is not
/// Sendable and carries a live session; this is the snapshot the rest of the
/// app is allowed to hold.
struct AuthUser: Equatable, Sendable {
    let uid: String
    let email: String?
    let displayName: String?
    let isEmailVerified: Bool
    let provider: AuthProvider

    init(uid: String,
         email: String?,
         displayName: String? = nil,
         isEmailVerified: Bool = false,
         provider: AuthProvider = .unknown) {
        self.uid = uid
        self.email = email
        self.displayName = displayName
        self.isEmailVerified = isEmailVerified
        self.provider = provider
    }
}
