import SwiftUI

/// Add or edit one budget: a spending cap or a savings target on a category.
/// Writes the same object the web app writes. A folder budget keeps its
/// folder; only its limit and kind can change here.
struct BudgetFormView: View {
    enum Mode: Equatable {
        case add
        case edit(Budget)
    }

    let mode: Mode

    @Environment(LedgerStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var catId: String
    @State private var limitText: String
    @State private var isTarget: Bool
    @State private var isSaving = false
    @State private var errorMessage: String?
    @FocusState private var limitFocused: Bool

    init(mode: Mode) {
        self.mode = mode
        switch mode {
        case .add:
            _catId = State(initialValue: "")
            _limitText = State(initialValue: "")
            _isTarget = State(initialValue: false)
        case .edit(let budget):
            _catId = State(initialValue: budget.catId)
            _limitText = State(initialValue: BudgetFormView.amountString(budget.limit))
            _isTarget = State(initialValue: budget.isTarget)
        }
    }

    private var existing: Budget? {
        if case .edit(let budget) = mode { return budget }
        return nil
    }

    private var isFolderBudget: Bool {
        catId.hasPrefix(LedgerMath.folderBudgetPrefix)
    }

    private var selectedName: String {
        if isFolderBudget {
            let folderId = existing?.folderId ?? String(catId.dropFirst(LedgerMath.folderBudgetPrefix.count))
            return store.folders.first { $0.id == folderId }?.name ?? existing?.category ?? "Folder"
        }
        return store.categories.first { $0.id == catId }?.name ?? existing?.category ?? ""
    }

    private var limit: Double? {
        let cleaned = limitText.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespaces)
        guard let value = Double(cleaned), value > 0 else { return nil }
        return LedgerMath.round2(value)
    }

    private var canSave: Bool {
        limit != nil && !catId.isEmpty && !isSaving
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Category") {
                    if existing != nil {
                        LabeledContent("Category", value: selectedName)
                    } else {
                        Picker("Category", selection: $catId) {
                            if catId.isEmpty {
                                Text("Choose").tag("")
                            }
                            ForEach(store.categories) { category in
                                Label {
                                    Text(category.name)
                                } icon: {
                                    Image(systemName: CategoryIcon.symbol(for: category.icon))
                                        .foregroundStyle(CategoryIcon.color(category.color))
                                }
                                .tag(category.id)
                            }
                        }
                    }
                }
                .listRowBackground(RichyColor.card)

                Section {
                    Picker("Kind", selection: $isTarget) {
                        Text("Cap").tag(false)
                        Text("Target").tag(true)
                    }
                    .pickerStyle(.segmented)
                } footer: {
                    Text(isTarget ? "Put aside at least this much each month." : "Spend no more than this each month.")
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())

                Section(isTarget ? "Target" : "Limit") {
                    HStack(spacing: Spacing.sm) {
                        Text(store.currency)
                            .font(RichyFont.display(RichyFont.Size.title))
                            .foregroundStyle(RichyColor.ink3)
                        TextField("0", text: $limitText)
                            .keyboardType(.decimalPad)
                            .font(RichyFont.display(RichyFont.Size.title))
                            .foregroundStyle(RichyColor.ink)
                            .focused($limitFocused)
                    }
                }
                .listRowBackground(RichyColor.card)

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(RichyFont.ui(RichyFont.Size.subhead))
                            .foregroundStyle(RichyColor.red)
                    }
                    .listRowBackground(RichyColor.card)
                }
            }
            .scrollContentBackground(.hidden)
            .background(RichyColor.background)
            .tint(RichyColor.accent)
            .navigationTitle(existing == nil ? "New budget" : "Edit budget")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("Save").fontWeight(.semibold)
                        }
                    }
                    .disabled(!canSave)
                }
            }
            .onAppear {
                if catId.isEmpty, let first = store.categories.first {
                    catId = first.id
                }
                limitFocused = true
            }
        }
    }

    private func save() async {
        guard let limit else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        let budget = Budget(catId: catId,
                            category: selectedName.isEmpty ? nil : selectedName,
                            limit: limit,
                            dir: isTarget ? "target" : "cap",
                            mode: existing?.mode,
                            folderId: existing?.folderId,
                            track: existing?.track)
        if await store.saveBudget(budget) {
            dismiss()
        } else {
            errorMessage = store.writeError ?? "Could not save. Try again."
        }
    }

    private static func amountString(_ amount: Double) -> String {
        if amount == amount.rounded() { return String(Int(amount)) }
        return String(format: "%.2f", amount)
    }
}

#Preview("New budget") {
    BudgetFormView(mode: .add)
        .environment(LedgerStore.preview())
}
