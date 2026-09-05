import SwiftUI

/// The signed-in shell: the web app's five tabs. Profile opens from the
/// Dashboard's toolbar, as on the web. One `LedgerStore` is created here per
/// session and shared with every tab through the environment.
struct MainTabView: View {
    let user: AuthUser
    @Environment(AppState.self) private var appState
    @State private var store: LedgerStore

    init(user: AuthUser, ledger: any LedgerService) {
        self.user = user
        _store = State(initialValue: LedgerStore(uid: user.uid, ledger: ledger))
    }

    var body: some View {
        Group {
            if store.phase == .needsSetup {
                AccountSetupView(user: user)
            } else {
                tabs
            }
        }
        .environment(store)
        .tint(RichyColor.accent)
        .safeAreaInset(edge: .top) {
            if appState.isDemoMode {
                DemoBanner()
            }
        }
        .onAppear { store.start() }
        .onDisappear { store.stop() }
    }

    private var tabs: some View {
        TabView {
            DashboardView(user: user)
                .tabItem { Label("Dashboard", systemImage: "square.grid.2x2") }
            ActivityView()
                .tabItem { Label("Activity", systemImage: "waveform.path.ecg") }
            BudgetsView()
                .tabItem { Label("Budgets", systemImage: "chart.bar.doc.horizontal") }
            GoalsView()
                .tabItem { Label("Goals", systemImage: "target") }
            RichardChatView(user: user)
                .tabItem { Label("Richard", systemImage: "bubble.left.and.text.bubble.right") }
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
    MainTabView(user: MockAuthService.demoUser, ledger: MockLedgerService())
        .environment(AppState(services: .mock()))
        .environment(\.services, .mock())
}
