import SwiftUI

/// The account's savings goals and how far along each one is. Plus to add,
/// tap to edit, swipe to delete; progress is live.
struct GoalsView: View {
    @Environment(LedgerStore.self) private var store
    @State private var showAdd = false
    @State private var editing: Goal?

    private var goals: [Goal] { store.account?.goals ?? [] }

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
                    if goals.isEmpty {
                        EmptyStateView(icon: "target",
                                       title: "No goals yet",
                                       message: "Name something you are saving for and watch it fill up.",
                                       actionTitle: "Add a goal",
                                       action: { showAdd = true })
                    } else {
                        list
                    }
                }
            }
            .navigationTitle("Goals")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAdd = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Add a goal")
                    .disabled(store.phase != .ready)
                }
            }
            .sheet(isPresented: $showAdd) {
                GoalFormView(mode: .add)
            }
            .sheet(item: $editing) { goal in
                GoalFormView(mode: .edit(goal))
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
            ForEach(goals) { goal in
                GoalRow(goal: goal, currency: store.currency)
                    .contentShape(Rectangle())
                    .onTapGesture { editing = goal }
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            Task { await store.deleteGoal(id: goal.id) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                    .listRowBackground(RichyColor.card)
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(RichyColor.background)
    }
}

private struct GoalRow: View {
    let goal: Goal
    let currency: String

    private var deadlineText: String? {
        guard let deadline = goal.deadline, !deadline.isEmpty else { return nil }
        return "By " + RichyDate.dayLabel(for: deadline)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(alignment: .firstTextBaseline) {
                Text(goal.name)
                    .font(RichyFont.display(RichyFont.Size.headline))
                    .foregroundStyle(RichyColor.ink)
                Spacer()
                Text("\(Int((goal.progress * 100).rounded()))%")
                    .font(RichyFont.ui(RichyFont.Size.subhead, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(goal.progress >= 1 ? RichyColor.green : RichyColor.accent)
            }
            ProgressView(value: goal.progress)
                .tint(goal.progress >= 1 ? RichyColor.green : RichyColor.accent)
            HStack {
                Text("\(Money.format(goal.saved, symbol: currency)) of \(Money.format(goal.target, symbol: currency))")
                    .font(RichyFont.ui(RichyFont.Size.footnote))
                    .monospacedDigit()
                    .foregroundStyle(RichyColor.ink3)
                Spacer()
                if let deadlineText {
                    Text(deadlineText)
                        .font(RichyFont.ui(RichyFont.Size.footnote))
                        .foregroundStyle(RichyColor.ink3)
                }
            }
        }
        .padding(.vertical, Spacing.xs)
        .accessibilityElement(children: .combine)
        .accessibilityHint("Tap to edit, swipe to delete")
    }
}

#Preview("Goals") {
    GoalsView()
        .environment(LedgerStore.preview())
}
