import SwiftUI

/// Add or edit one transaction. Writes exactly the record the web app would:
/// same fields, same defaults, the date as a UTC calendar day.
struct TransactionFormView: View {
    enum Mode: Equatable {
        case add
        case edit(Transaction)
    }

    let mode: Mode

    @Environment(LedgerStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var type: TransactionType
    @State private var amountText: String
    @State private var label: String
    @State private var catId: String
    @State private var date: Date
    @State private var pending: Bool
    @State private var isSaving = false
    @State private var errorMessage: String?
    @FocusState private var amountFocused: Bool

    init(mode: Mode) {
        self.mode = mode
        switch mode {
        case .add:
            _type = State(initialValue: .expense)
            _amountText = State(initialValue: "")
            _label = State(initialValue: "")
            _catId = State(initialValue: "")
            _date = State(initialValue: Date())
            _pending = State(initialValue: false)
        case .edit(let record):
            _type = State(initialValue: record.type == .income ? .income : .expense)
            _amountText = State(initialValue: TransactionFormView.amountString(record.amount))
            _label = State(initialValue: record.label)
            _catId = State(initialValue: record.catId)
            _date = State(initialValue: RichyDate.date(from: record.date) ?? Date())
            _pending = State(initialValue: record.pending)
        }
    }

    private var title: String {
        if case .edit = mode { return "Edit transaction" }
        return "New transaction"
    }

    private var amount: Double? {
        let cleaned = amountText.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespaces)
        guard let value = Double(cleaned), value > 0 else { return nil }
        return LedgerMath.round2(value)
    }

    private var selectedCategory: Category? {
        store.categories.first { $0.id == catId }
    }

    private var canSave: Bool {
        amount != nil && selectedCategory != nil && !isSaving
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Type", selection: $type) {
                        Text("Expense").tag(TransactionType.expense)
                        Text("Income").tag(TransactionType.income)
                    }
                    .pickerStyle(.segmented)
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())

                Section("Amount") {
                    HStack(spacing: Spacing.sm) {
                        Text(store.currency)
                            .font(RichyFont.display(RichyFont.Size.title))
                            .foregroundStyle(RichyColor.ink3)
                        TextField("0.00", text: $amountText)
                            .keyboardType(.decimalPad)
                            .font(RichyFont.display(RichyFont.Size.title))
                            .foregroundStyle(RichyColor.ink)
                            .focused($amountFocused)
                    }
                }
                .listRowBackground(RichyColor.card)

                Section("Details") {
                    TextField("What was it?", text: $label)
                        .textInputAutocapitalization(.sentences)
                    Picker("Category", selection: $catId) {
                        if selectedCategory == nil {
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
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                        .environment(\.timeZone, RichyDate.utc)
                    Toggle("Pending", isOn: $pending)
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
            .navigationTitle(title)
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
                if case .add = mode {
                    amountFocused = true
                }
            }
        }
    }

    private func save() async {
        guard let amount, let category = selectedCategory else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        let trimmedLabel = label.trimmingCharacters(in: .whitespacesAndNewlines)
        let isoDate = RichyDate.string(from: date)
        let ok: Bool
        switch mode {
        case .add:
            var draft = TransactionDraft()
            draft.type = type
            draft.amount = amount
            draft.label = trimmedLabel
            draft.catId = category.id
            draft.category = category.name
            draft.date = isoDate
            draft.pending = pending
            ok = await store.add(draft)
        case .edit(let record):
            let edited = record.edited(type: type, amount: amount, label: trimmedLabel, catId: category.id,
                                       category: category.name, date: isoDate, pending: pending)
            ok = await store.update(edited)
        }
        if ok {
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

#Preview("Add") {
    TransactionFormView(mode: .add)
        .environment(LedgerStore.preview())
}

#Preview("Edit") {
    TransactionFormView(mode: .edit(MockLedgerService.sampleTransactions()[2]))
        .environment(LedgerStore.preview())
}
