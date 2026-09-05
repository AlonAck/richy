import SwiftUI

/// Add or edit one savings goal. Writes the same object the web app writes;
/// a goal linked to a savings pot, business or investing account keeps that
/// link untouched.
struct GoalFormView: View {
    enum Mode: Equatable {
        case add
        case edit(Goal)
    }

    let mode: Mode

    @Environment(LedgerStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var targetText: String
    @State private var savedText: String
    @State private var hasDeadline: Bool
    @State private var deadline: Date
    @State private var isSaving = false
    @State private var errorMessage: String?
    @FocusState private var nameFocused: Bool

    init(mode: Mode) {
        self.mode = mode
        switch mode {
        case .add:
            _name = State(initialValue: "")
            _targetText = State(initialValue: "")
            _savedText = State(initialValue: "")
            _hasDeadline = State(initialValue: false)
            _deadline = State(initialValue: Calendar.current.date(byAdding: .month, value: 6, to: Date()) ?? Date())
        case .edit(let goal):
            _name = State(initialValue: goal.name)
            _targetText = State(initialValue: GoalFormView.amountString(goal.target))
            _savedText = State(initialValue: GoalFormView.amountString(goal.saved))
            let stored = goal.deadline.flatMap { RichyDate.date(from: $0) }
            _hasDeadline = State(initialValue: stored != nil)
            _deadline = State(initialValue: stored ?? (Calendar.current.date(byAdding: .month, value: 6, to: Date()) ?? Date()))
        }
    }

    private var existing: Goal? {
        if case .edit(let goal) = mode { return goal }
        return nil
    }

    private var target: Double? {
        GoalFormView.amount(targetText).flatMap { $0 > 0 ? $0 : nil }
    }

    private var saved: Double {
        GoalFormView.amount(savedText) ?? 0
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && target != nil && !isSaving
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Goal") {
                    TextField("What are you saving for?", text: $name)
                        .textInputAutocapitalization(.sentences)
                        .focused($nameFocused)
                }
                .listRowBackground(RichyColor.card)

                Section("Amounts") {
                    amountRow("Target", text: $targetText)
                    amountRow("Saved so far", text: $savedText)
                }
                .listRowBackground(RichyColor.card)

                Section {
                    Toggle("Deadline", isOn: $hasDeadline)
                    if hasDeadline {
                        DatePicker("By", selection: $deadline, displayedComponents: .date)
                            .environment(\.timeZone, RichyDate.utc)
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
            .navigationTitle(existing == nil ? "New goal" : "Edit goal")
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
                if existing == nil {
                    nameFocused = true
                }
            }
        }
    }

    private func amountRow(_ title: String, text: Binding<String>) -> some View {
        HStack {
            Text(title)
                .foregroundStyle(RichyColor.ink)
            Spacer()
            Text(store.currency)
                .foregroundStyle(RichyColor.ink3)
            TextField("0", text: text)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 140)
                .foregroundStyle(RichyColor.ink)
        }
    }

    private func save() async {
        guard let target else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        let goal = Goal(id: existing?.id ?? RichyDate.newId(),
                        name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                        target: target,
                        saved: LedgerMath.round2(saved),
                        deadline: hasDeadline ? RichyDate.string(from: deadline) : nil,
                        linkType: existing?.linkType,
                        linkId: existing?.linkId)
        if await store.saveGoal(goal) {
            dismiss()
        } else {
            errorMessage = store.writeError ?? "Could not save. Try again."
        }
    }

    private static func amount(_ text: String) -> Double? {
        let cleaned = text.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespaces)
        guard let value = Double(cleaned), value >= 0 else { return nil }
        return LedgerMath.round2(value)
    }

    private static func amountString(_ amount: Double) -> String {
        if amount == 0 { return "" }
        if amount == amount.rounded() { return String(Int(amount)) }
        return String(format: "%.2f", amount)
    }
}

#Preview("New goal") {
    GoalFormView(mode: .add)
        .environment(LedgerStore.preview())
}
