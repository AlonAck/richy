import SwiftUI
import FirebaseCore
import FirebaseAuth

@main
struct RichyApp: App {
    private let services: AppServices
    @State private var appState: AppState

    init() {
        let configured = FirebaseBootstrap.configureIfPossible()
        let services = AppServices.live(firebaseConfigured: configured)
        self.services = services
        _appState = State(initialValue: AppState(services: services))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
                .environment(\.services, services)
                .onOpenURL { url in
                    // The Google sign-in sheet returns through the URL scheme
                    // registered at build time; Firebase finishes the handshake.
                    if FirebaseApp.app() != nil {
                        _ = Auth.auth().canHandle(url)
                    }
                }
        }
    }
}
