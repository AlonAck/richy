import SwiftUI

/// The signed-in shell. Three tabs for the foundation; Activity, Budgets and
/// Goals join the bar with their features.
struct MainTabView: View {
    let user: AuthUser
    @Environment(AppState.self) private var appState
    @Environment(\.services) private var services

    var body: some View {
        TabView {
            HomePlaceholderView()
                .tabItem { Label("Dashboard", systemImage: "sparkles") }
            RichardPlaceholderView()
                .tabItem { Label("Richard", systemImage: "bubble.left.and.text.bubble.right") }
            ProfileView(user: user, account: services.account)
                .tabItem { Label("Profile", systemImage: "person.crop.circle") }
        }
        .tint(RichyColor.accent)
        .safeAreaInset(edge: .top) {
            if appState.isDemoMode {
                DemoBanner()
            }
        }
    }
}

private struct DemoBanner: View {
    var body: some View {
        Text("Demo mode - nothing here is saved")
            .font(RichyFont.ui(RichyFont.Size.caption, weight: .semibold))
            .foregroundStyle(RichyColor.heroText)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .background(RichyColor.accentHi)
    }
}

#Preview("Tabs") {
    MainTabView(user: MockAuthService.demoUser)
        .environment(AppState(services: .mock()))
        .environment(\.services, .mock())
}
