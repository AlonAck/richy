import SwiftUI

/// The account's budgets against this month's spending. Plus to add a cap or
/// a target, tap to edit, swipe to delete; the numbers are live.
struct BudgetsView: View {
    @Environment(LedgerStore.self) private var store
    @State private var showAdd = false
    @State private var editing: Budget?

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
                case .loading, .needsSetup:
                    LoadingView()
                case .failed(let message):
                    ErrorView(message: message, retry: { store.retry() })
                case .ready:
                    if rows.isEmpty {
                        EmptyStateView(icon: "chart.bar.doc.horizontal",
                                       title: "No budgets yet",
                                       message: "A cap says spend no more than this; a target says put aside at least this. Both fill up as the month goes.",
                                       actionTitle: "Add a budget",
                                       action: { showAdd = true })
                    } else {
                        list
                    }
                }
            }
            .navigationTitle("Budgets")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAdd = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Add a budget")
                    .disabled(store.phase != .ready)
                }
            }
            .sheet(isPresented: $showAdd) {
                BudgetFormView(mode: .add)
            }
            .sheet(item: $editing) { budget in
                BudgetFormView(mode: .edit(budget))
            }
            .alert("Couldn't save that", isPresented: store.writeErrorShown) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(store.writeError ?? "")
            }
        }
    }

    private var list: some View {
        List {
            Section {
                ForEach(rows) { row in
                    BudgetRow(row: row, currency: store.currency)
                        .contentShape(Rectangle())
                        .onTapGesture { editing = row.budget }
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) {
                                Task { await store.deleteBudget(catId: row.budget.catId) }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
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
        .accessibilityElement(children: .combine)
        .accessibilityHint("Tap to edit, swipe to delete")
    }
}

#Preview("Budgets") {
    BudgetsView()
        .environment(LedgerStore.preview())
}
