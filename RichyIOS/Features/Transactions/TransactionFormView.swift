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
    /// Scopes the morphing of the expense/income switch.
    @Namespace private var glass

    /// - Parameter initialType: which side of the ledger a new entry starts
    ///   on. The quick-add cluster names it before the sheet opens, so the
    ///   form arrives already set to what was tapped.
    init(mode: Mode, initialType: TransactionType = .expense) {
        self.mode = mode
        switch mode {
        case .add:
            _type = State(initialValue: initialType == .income ? .income : .expense)
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

    /// The card bill or account transfer being edited, if that is what it is.
    /// It has no category of its own, so the picker offers "leave it a
    /// transfer" as its current choice instead of demanding a category.
    private var statementTransfer: Transaction? {
        if case .edit(let record) = mode, record.isStatementTransfer { return record }
        return nil
    }

    /// Still a transfer: the picker has not been moved off it.
    private var keepsTransfer: Bool {
        guard let record = statementTransfer else { return false }
        return catId == record.catId
    }

    private var canSave: Bool {
        amount != nil && (selectedCategory != nil || keepsTransfer) && !isSaving
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    amountHero
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: Spacing.sm, leading: 0, bottom: Spacing.lg, trailing: 0))

                Section("Details") {
                    TextField("What was it?", text: $label)
                        .textInputAutocapitalization(.sentences)
                    Picker("Category", selection: $catId) {
                        if let record = statementTransfer {
                            Label {
                                Text(TransferLook.name(record))
                            } icon: {
                                Image(systemName: CategoryIcon.symbol(for: TransferLook.icon(record)))
                                    .foregroundStyle(RichyColor.ink3)
                            }
                            .tag(record.catId)
                        } else if selectedCategory == nil {
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

    // MARK: The hero

    /// What the whole sheet is for: which way the money went, and how much.
    /// The switch is the one glass control on this screen - a control that
    /// floats over the form rather than a row inside it. The amount below it
    /// is content, and stays plain.
    private var amountHero: some View {
        VStack(spacing: Spacing.lg) {
            typeSwitch
            HStack(alignment: .firstTextBaseline, spacing: Spacing.sm) {
                Text(store.currency)
                    .font(RichyFont.display(RichyFont.Size.title))
                    .foregroundStyle(RichyColor.ink3)
                TextField("0.00", text: $amountText)
                    .keyboardType(.decimalPad)
                    .font(RichyFont.display(RichyFont.Size.hero))
                    .monospacedDigit()
                    .foregroundStyle(type == .income ? RichyColor.green : RichyColor.ink)
                    .focused($amountFocused)
                    .accessibilityLabel("Amount")
            }
            .animation(.easeInOut(duration: 0.2), value: type)
        }
        .padding(.horizontal, Spacing.lg)
    }

    /// Expense or income, as two halves of one pill. The lit half is a single
    /// piece of glass carrying one identity, so on iOS 26 it does not fade
    /// out on one side and in on the other - it stretches across the track
    /// and settles, the way the system's own segmented glass does. Older
    /// systems get the same pill sliding on a spring.
    private var typeSwitch: some View {
        RichyGlassContainer(spacing: 14) {
            HStack(spacing: 6) {
                segment("Expense", value: .expense, tint: RichyColor.accent)
                segment("Income", value: .income, tint: RichyColor.green)
            }
            .padding(4)
            .background(RichyColor.fill, in: Capsule(style: .continuous))
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Type")
    }

    @ViewBuilder
    private func segment(_ title: String, value: TransactionType, tint: Color) -> some View {
        let isSelected = type == value
        Button {
            withAnimation(.spring(response: 0.34, dampingFraction: 0.82)) { type = value }
        } label: {
            // Named `face`, not `label`: the view already has a `label` field
            // for the transaction's own text.
            let face = Text(title)
                .font(RichyFont.ui(RichyFont.Size.body, weight: .semibold))
                .foregroundStyle(isSelected ? Color.white : RichyColor.ink2)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            if isSelected {
                face
                    .richyGlass(tint: tint, interactive: true)
                    .richyGlassID("transaction-type", in: glass)
            } else {
                face.contentShape(Capsule(style: .continuous))
            }
        }
        .buttonStyle(RichyGlassButtonStyle())
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : [.isButton])
    }

    private func save() async {
        guard let amount else { return }
        let category = selectedCategory
        guard category != nil || keepsTransfer else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        let trimmedLabel = label.trimmingCharacters(in: .whitespacesAndNewlines)
        let isoDate = RichyDate.string(from: date)
        let ok: Bool
        switch mode {
        case .add:
            guard let category else { return }
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
            // No category picked means the transfer stays a transfer, under
            // its own catId and name.
            let edited = record.edited(type: type, amount: amount, label: trimmedLabel,
                                       catId: category?.id ?? record.catId,
                                       category: category?.name ?? record.category,
                                       date: isoDate, pending: pending)
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
