import SwiftUI

/// Every transaction, newest first, grouped by day. Tap to edit, swipe to
/// delete, plus to add - the web app's Activity tab.
struct ActivityView: View {
    @Environment(LedgerStore.self) private var store
    @State private var showAdd = false
    @State private var editing: Transaction?

    var body: some View {
        NavigationStack {
            ZStack {
                RichyColor.background.ignoresSafeArea()
                switch store.phase {
                case .loading:
                    LoadingView(label: "Loading your activity...")
                case .failed(let message):
                    ErrorView(message: message, retry: { store.retry() })
                case .ready:
                    if store.isEmpty {
                        EmptyStateView(icon: "list.bullet.rectangle",
                                       title: "No transactions yet",
                                       message: "Log your first expense and Richy starts reading your month.",
                                       actionTitle: "Add a transaction",
                                       action: { showAdd = true })
                    } else {
                        list
                    }
                }
            }
            .navigationTitle("Activity")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAdd = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Add a transaction")
                    .disabled(store.phase != .ready)
                }
            }
            .sheet(isPresented: $showAdd) {
                TransactionFormView(mode: .add)
            }
            .sheet(item: $editing) { record in
                TransactionFormView(mode: .edit(record))
            }
            .alert("Couldn't save that", isPresented: writeErrorShown) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(store.writeError ?? "")
            }
        }
    }

    private var list: some View {
        List {
            ForEach(LedgerMath.sections(store.transactions)) { section in
                Section {
                    ForEach(section.transactions) { record in
                        TransactionRow(transaction: record,
                                       category: LedgerMath.category(for: record, in: store.categories),
                                       currency: store.currency)
                            .contentShape(Rectangle())
                            .onTapGesture { editing = record }
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    Task { await store.delete(record) }
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                    }
                } header: {
                    Text(RichyDate.dayLabel(for: section.date))
                        .font(RichyFont.ui(RichyFont.Size.caption, weight: .semibold))
                        .tracking(0.8)
                        .foregroundStyle(RichyColor.ink3)
                }
                .listRowBackground(RichyColor.card)
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(RichyColor.background)
    }

    /// The alert shows while a write error is set and clears it on dismiss.
    private var writeErrorShown: Binding<Bool> {
        Binding(get: { store.writeError != nil },
                set: { if !$0 { store.writeError = nil } })
    }
}

#Preview("Activity") {
    ActivityView()
        .environment(LedgerStore.preview())
}
