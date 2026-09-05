import SwiftUI

/// The first screen after sign-in: the balance, this month at a glance, where
/// the money went, and the latest activity. Numbers come from `LedgerMath`,
/// the same arithmetic as the web dashboard. Richard's safe-to-spend hero and
/// the widgets he builds arrive with the Richard feature.
struct DashboardView: View {
    let user: AuthUser

    @Environment(LedgerStore.self) private var store
    @Environment(\.services) private var services
    @State private var showProfile = false
    @State private var showAdd = false

    private var firstName: String {
        if let name = user.displayName, let first = name.split(separator: " ").first, !first.isEmpty {
            return String(first)
        }
        if let email = user.email, let at = email.firstIndex(of: "@") { return String(email[..<at]) }
        return "there"
    }

    var body: some View {
        NavigationStack {
            ZStack {
                RichyColor.background.ignoresSafeArea()
                switch store.phase {
                case .loading:
                    LoadingView(label: "Loading your money...")
                case .failed(let message):
                    ErrorView(message: message, retry: { store.retry() })
                case .ready:
                    if store.isEmpty {
                        EmptyStateView(icon: "sparkles",
                                       title: "Wealth is a habit, \(firstName).",
                                       message: "Log your first transaction and the dashboard starts reading your month.",
                                       actionTitle: "Add a transaction",
                                       action: { showAdd = true })
                    } else {
                        content
                    }
                }
            }
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showProfile = true
                    } label: {
                        Image(systemName: "person.crop.circle")
                    }
                    .accessibilityLabel("Profile")
                }
            }
            .sheet(isPresented: $showProfile) {
                ProfileView(user: user, account: services.account)
            }
            .sheet(isPresented: $showAdd) {
                TransactionFormView(mode: .add)
            }
        }
    }

    private var content: some View {
        let month = RichyDate.currentMonth()
        let summary = LedgerMath.monthSummary(store.transactions, month: month)
        let balance = LedgerMath.balance(store.transactions)
        let spend = LedgerMath.spendByCategory(store.transactions, categories: store.categories, month: month)
        let recent = Array(store.transactions.filter { !$0.isTransfer }.prefix(4))
        return ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Wealth is a habit, \(firstName).")
                        .font(RichyFont.display(RichyFont.Size.title))
                        .foregroundStyle(RichyColor.ink)
                    Text("A clear view of your money.")
                        .font(RichyFont.ui(RichyFont.Size.subhead))
                        .italic()
                        .foregroundStyle(RichyColor.ink2)
                }
                .padding(.top, Spacing.sm)

                heroCard(balance: balance, summary: summary)
                if !spend.isEmpty {
                    spendCard(spend, total: summary.expenses)
                }
                recentCard(recent)
            }
            .padding(.horizontal, Spacing.screen)
            .padding(.bottom, Spacing.xxl)
        }
    }

    private func heroCard(balance: Double, summary: MonthSummary) -> some View {
        RichyCard {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("CURRENT BALANCE")
                    .font(RichyFont.ui(RichyFont.Size.caption, weight: .bold))
                    .tracking(1)
                    .foregroundStyle(RichyColor.ink3)
                Text(Money.format(balance, symbol: store.currency))
                    .font(RichyFont.display(RichyFont.Size.hero))
                    .monospacedDigit()
                    .foregroundStyle(balance < 0 ? RichyColor.red : RichyColor.ink)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                Divider().overlay(RichyColor.separator)
                HStack(spacing: Spacing.md) {
                    figure("IN", summary.income, tint: RichyColor.green)
                    figure("OUT", summary.expenses, tint: RichyColor.ink)
                    figure("NET", summary.net, tint: summary.net < 0 ? RichyColor.red : RichyColor.ink, signed: true)
                }
                Text(RichyDate.monthTitle(for: summary.month))
                    .font(RichyFont.ui(RichyFont.Size.footnote))
                    .foregroundStyle(RichyColor.ink3)
            }
        }
    }

    private func figure(_ title: String, _ value: Double, tint: Color, signed: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(RichyFont.ui(RichyFont.Size.caption, weight: .semibold))
                .tracking(0.9)
                .foregroundStyle(RichyColor.ink3)
            Text(Money.format(value, symbol: store.currency, signed: signed))
                .font(RichyFont.ui(RichyFont.Size.headline, weight: .bold))
                .monospacedDigit()
                .foregroundStyle(tint)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func spendCard(_ rows: [CategorySpend], total: Double) -> some View {
        RichyCard {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack(alignment: .firstTextBaseline) {
                    Text("Where your money went")
                        .font(RichyFont.display(RichyFont.Size.headline))
                        .foregroundStyle(RichyColor.ink)
                    Spacer()
                    Text("This month")
                        .font(RichyFont.ui(RichyFont.Size.footnote))
                        .foregroundStyle(RichyColor.ink3)
                }
                ForEach(rows.prefix(5)) { row in
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        HStack(spacing: Spacing.sm) {
                            CategoryTile(icon: row.category.icon, colorHex: row.category.color, size: 28)
                            Text(row.category.name)
                                .font(RichyFont.ui(RichyFont.Size.body, weight: .medium))
                                .foregroundStyle(RichyColor.ink)
                            Spacer()
                            Text(Money.format(row.amount, symbol: store.currency))
                                .font(RichyFont.ui(RichyFont.Size.body, weight: .semibold))
                                .monospacedDigit()
                                .foregroundStyle(RichyColor.ink)
                        }
                        ProgressView(value: row.share)
                            .tint(CategoryIcon.color(row.category.color))
                    }
                }
            }
        }
    }

    private func recentCard(_ rows: [Transaction]) -> some View {
        RichyCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                Text("Latest activity")
                    .font(RichyFont.display(RichyFont.Size.headline))
                    .foregroundStyle(RichyColor.ink)
                    .padding(.horizontal, Spacing.lg)
                    .padding(.top, Spacing.lg)
                    .padding(.bottom, Spacing.sm)
                ForEach(Array(rows.enumerated()), id: \.element.id) { index, record in
                    TransactionRow(transaction: record,
                                   category: LedgerMath.category(for: record, in: store.categories),
                                   currency: store.currency)
                        .padding(.horizontal, Spacing.lg)
                        .padding(.vertical, Spacing.sm)
                    if index < rows.count - 1 {
                        Divider().overlay(RichyColor.separator).padding(.leading, Spacing.lg + 36 + Spacing.md)
                    }
                }
                Color.clear.frame(height: Spacing.sm)
            }
        }
    }
}

#Preview("Dashboard") {
    DashboardView(user: MockAuthService.demoUser)
        .environment(LedgerStore.preview())
        .environment(AppState(services: .mock()))
        .environment(\.services, .mock())
}
