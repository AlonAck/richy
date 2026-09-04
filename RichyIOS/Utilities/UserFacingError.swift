import Foundation

/// The sentence a person should read for any error the app can throw.
/// `APIError` and `AuthError` carry their own copy; everything else falls back
/// to the system description.
enum UserFacingError {
    static func message(for error: Error) -> String {
        if let localized = error as? LocalizedError, let description = localized.errorDescription {
            return description
        }
        return error.localizedDescription
    }
}
