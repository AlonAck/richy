import SwiftUI

/// Every transaction, newest first, grouped by day. Tap to edit, swipe to
/// delete, and the floating glass cluster to add - the web app's Activity tab.
struct ActivityView: View {
    @Environment(LedgerStore.self) private var store
    @State private var showAdd = false
    @State private var editing: Transaction?
    /// Which side of the ledger the quick-add cluster asked for.
    @State private var addType: TransactionType = .expense

    var body: some View {
        NavigationStack {
            ZStack {
                RichyColor.background.ignoresSafeArea()
                switch store.phase {
                case .loading, .needsSetup:
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
            // The plus that used to sit in the toolbar is now the floating
            // cluster below: same action, within a thumb's reach of the list
            // it acts on, and it names the two kinds of entry up front.
            .overlay {
                if store.phase == .ready && !store.isEmpty {
                    QuickAddCluster { type in
                        addType = type
                        showAdd = true
                    }
                }
            }
            .navigationTitle("Activity")
            .sheet(isPresented: $showAdd) {
                TransactionFormView(mode: .add, initialType: addType)
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
        // Rows stay opaque: glass is for the layer above the content, and a
        // ledger row is content. What the list gives the glass is something
        // worth refracting - so leave room for the cluster to sit over it and
        // still let the last row scroll clear.
        .safeAreaPadding(.bottom, 74)
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
