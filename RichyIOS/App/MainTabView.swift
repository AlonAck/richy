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
            AlfredChatView(user: user)
                .tabItem { Label("Alfred", systemImage: "bubble.left.and.text.bubble.right") }
        }
        // The bar is glass from iOS 26 on with nothing asked of us; this lets
        // it shrink out of the way while a ledger scrolls, and gives the
        // reading screens their full height back.
        .richyTabBarMinimize()
    }
}

/// A standing notice about the session, not part of any screen's content - so
/// it belongs on the glass layer, as a pill that floats over whatever tab is
/// open rather than a bar welded across the top of it.
private struct DemoBanner: View {
    var body: some View {
        Label("Demo mode - nothing here is saved", systemImage: "eye")
            .font(RichyFont.ui(RichyFont.Size.caption, weight: .semibold))
            .foregroundStyle(RichyColor.heroText)
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, 8)
            .richyGlass(tint: RichyColor.accentHi)
            .padding(.bottom, Spacing.sm)
    }
}

#Preview("Tabs") {
    MainTabView(user: MockAuthService.demoUser, ledger: MockLedgerService())
        .environment(AppState(services: .mock()))
        .environment(\.services, .mock())
}
