import SwiftUI

/// The account's budgets against this month's spending. Read-only for now:
/// caps and targets are still set on the web; the numbers here are live.
struct BudgetsView: View {
    @Environment(LedgerStore.self) private var store

    private var rows: [BudgetProgress] {
        LedgerMath.budgets(store.account?.budgets ?? [],
                           categories: store.categories,
                           folders: store.folders,
                           transactions: store.transactions)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                RichyColor.background.ignoresSafeArea()
                switch store.phase {
                case .loading:
                    LoadingView()
                case .failed(let message):
                    ErrorView(message: message, retry: { store.retry() })
                case .ready:
                    if rows.isEmpty {
                        EmptyStateView(icon: "chart.bar.doc.horizontal",
                                       title: "No budgets yet",
                                       message: "Set a cap or a savings target in Richy on the web and it shows up here with live numbers.")
                    } else {
                        list
                    }
                }
            }
            .navigationTitle("Budgets")
        }
    }

    private var list: some View {
        List {
            Section {
                ForEach(rows) { row in
                    BudgetRow(row: row, currency: store.currency)
                }
            } header: {
                Text(RichyDate.monthTitle(for: RichyDate.currentMonth()).uppercased())
                    .font(RichyFont.ui(RichyFont.Size.caption, weight: .semibold))
                    .tracking(0.8)
                    .foregroundStyle(RichyColor.ink3)
            }
            .listRowBackground(RichyColor.card)
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(RichyColor.background)
    }
}

private struct BudgetRow: View {
    let row: BudgetProgress
    let currency: String

    private var tint: Color {
        if row.isOver { return RichyColor.red }
        if row.isTarget && !row.isOff { return RichyColor.green }
        return CategoryIcon.color(row.colorHex)
    }

    private var caption: String {
        let spent = Money.format(row.spent, symbol: currency)
        let limit = Money.format(row.limit, symbol: currency)
        if row.isTarget {
            return row.isOff ? "\(spent) of \(limit) put aside" : "Target reached: \(spent) of \(limit)"
        }
        if row.isOver {
            return "Over by \(Money.format(row.spent - row.limit, symbol: currency))"
        }
        return "\(Money.format(max(row.limit - row.spent, 0), symbol: currency)) left of \(limit)"
    }

    var body: some View {
        HStack(spacing: Spacing.md) {
            CategoryTile(icon: row.icon, colorHex: row.colorHex)
            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Text(row.name)
                        .font(RichyFont.ui(RichyFont.Size.body, weight: .medium))
                        .foregroundStyle(RichyColor.ink)
                    Spacer()
                    Text(Money.format(row.spent, symbol: currency))
                        .font(RichyFont.ui(RichyFont.Size.body, weight: .semibold))
                        .monospacedDigit()
                        .foregroundStyle(row.isOver ? RichyColor.red : RichyColor.ink)
                }
                ProgressView(value: row.fraction)
                    .tint(tint)
                Text(caption)
                    .font(RichyFont.ui(RichyFont.Size.footnote))
                    .foregroundStyle(row.isOver ? RichyColor.red : RichyColor.ink3)
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}

#Preview("Budgets") {
    BudgetsView()
        .environment(LedgerStore.preview())
}
