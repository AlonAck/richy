import Foundation
import FirebaseCore

/// Starts Firebase only when its configuration is actually in the bundle. The
/// web app makes the same distinction (`cloudConfigured()`): an unconfigured
/// build should explain itself, not crash at launch.
enum FirebaseBootstrap {
    /// True when `GoogleService-Info.plist` shipped in the bundle and Firebase
    /// is configured. False means "run on mock services and say so".
    static func configureIfPossible() -> Bool {
        guard Bundle.main.url(forResource: "GoogleService-Info", withExtension: "plist") != nil else {
            Log.app.notice("GoogleService-Info.plist is not in the bundle; running without Firebase")
            return false
        }
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        return true
    }
}
