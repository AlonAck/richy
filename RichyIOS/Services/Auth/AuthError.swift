import Foundation

/// Sign-in failures in the words a person should read. Firebase reports these
/// as `NSError`s in the `FIRAuthErrorDomain`; the numbers below are the stable
/// `FIRAuthErrorCode` values, matched by number so this file depends on no SDK
/// symbol and the mock can throw the same cases.
enum AuthError: Error, LocalizedError, Equatable, Sendable {
    case invalidEmail
    /// Firebase's email-enumeration protection answers a wrong password AND an
    /// unknown email with this single code, so the message covers both.
    case invalidCredential
    case wrongPassword
    case userNotFound
    case emailInUse
    case weakPassword
    case userDisabled
    case tooManyRequests
    case network
    case notConfigured
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .invalidEmail:
            return "That doesn't look like an email address."
        case .invalidCredential, .wrongPassword:
            return "Email or password is incorrect."
        case .userNotFound:
            return "No account uses that email. Create one instead?"
        case .emailInUse:
            return "An account already uses that email. Sign in instead?"
        case .weakPassword:
            return "Use at least 6 characters for your password."
        case .userDisabled:
            return "This account has been disabled. Email richysupport@gmail.com for help."
        case .tooManyRequests:
            return "Too many attempts. Wait a few minutes and try again."
        case .network:
            return "Richy couldn't reach the sign-in service. Check your connection and try again."
        case .notConfigured:
            return "Sign-in isn't set up on this device yet."
        case .unknown(let message):
            return message.isEmpty ? "Something went wrong signing in. Try again." : message
        }
    }

    /// Maps anything the auth layer throws to a case above.
    static func from(_ error: Error) -> AuthError {
        if let authError = error as? AuthError { return authError }
        let nsError = error as NSError
        guard nsError.domain == "FIRAuthErrorDomain" else {
            return .unknown(nsError.localizedDescription)
        }
        switch nsError.code {
        case 17004: return .invalidCredential   // FIRAuthErrorCodeInvalidCredential
        case 17005: return .userDisabled        // FIRAuthErrorCodeUserDisabled
        case 17007: return .emailInUse          // FIRAuthErrorCodeEmailAlreadyInUse
        case 17008: return .invalidEmail        // FIRAuthErrorCodeInvalidEmail
        case 17009: return .wrongPassword       // FIRAuthErrorCodeWrongPassword
        case 17010: return .tooManyRequests     // FIRAuthErrorCodeTooManyRequests
        case 17011: return .userNotFound        // FIRAuthErrorCodeUserNotFound
        case 17020: return .network             // FIRAuthErrorCodeNetworkError
        case 17026: return .weakPassword        // FIRAuthErrorCodeWeakPassword
        default: return .unknown(nsError.localizedDescription)
        }
    }
}
