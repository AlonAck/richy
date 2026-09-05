import SwiftUI

/// Picks the root screen from the session phase. There is deliberately no
/// other routing at this level: features own their own navigation stacks.
struct RootView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        Group {
            switch appState.phase {
            case .booting:
                BootView()
            case .notConfigured:
                NotConfiguredView()
            case .signedOut:
                AuthFlowView()
            case .signedIn(let user):
                MainTabView(user: user)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: appState.phase)
        .task {
            await appState.start()
        }
    }
}

#Preview("Signed out") {
    RootView()
        .environment(AppState(services: .mock()))
        .environment(\.services, .mock())
}
