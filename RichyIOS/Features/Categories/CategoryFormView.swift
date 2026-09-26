import SwiftUI

/// Makes a new category - a name, an icon and a colour - and hands it back to
/// whichever form opened it, so the transaction or budget being filled in
/// picks it straight away instead of the user leaving to make it elsewhere.
/// Writes the same object the web's Categories screen does.
struct CategoryFormView: View {
    /// Called with the saved category, just before the sheet closes.
    var onCreated: (Category) -> Void

    @Environment(LedgerStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var icon = "tag"
    @State private var color = CategoryIcon.colorChoices[0]
    @State private var isSaving = false
    @State private var errorMessage: String?
    @FocusState private var nameFocused: Bool

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var canSave: Bool { !trimmedName.isEmpty && !isSaving }

    private let iconColumns = [GridItem(.adaptive(minimum: 44), spacing: Spacing.sm)]
    private let colorColumns = [GridItem(.adaptive(minimum: 36), spacing: Spacing.md)]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: Spacing.md) {
                        CategoryTile(icon: icon, colorHex: color, size: 44)
                        TextField("Name", text: $name)
                            .font(RichyFont.ui(RichyFont.Size.body, weight: .semibold))
                            .textInputAutocapitalization(.words)
                            .submitLabel(.done)
                            .focused($nameFocused)
                            .onSubmit { Task { await save() } }
                    }
                    .padding(.vertical, Spacing.xs)
                }
                .listRowBackground(RichyColor.card)

                Section("Icon") {
                    LazyVGrid(columns: iconColumns, spacing: Spacing.sm) {
                        ForEach(CategoryIcon.choices, id: \.self) { choice in
                            let isOn = choice == icon
                            Button {
                                icon = choice
                            } label: {
                                Image(systemName: CategoryIcon.symbol(for: choice))
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundStyle(isOn ? CategoryIcon.color(color) : RichyColor.ink3)
                                    .frame(width: 44, height: 44)
                                    .background(isOn ? CategoryIcon.color(color).opacity(0.16) : Color.clear,
                                                in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(choice)
                            .accessibilityAddTraits(isOn ? [.isSelected] : [])
                        }
                    }
                    .padding(.vertical, Spacing.xs)
                }
                .listRowBackground(RichyColor.card)

                Section("Colour") {
                    LazyVGrid(columns: colorColumns, spacing: Spacing.md) {
                        ForEach(CategoryIcon.colorChoices, id: \.self) { choice in
                            let isOn = choice == color
                            Button {
                                color = choice
                            } label: {
                                Circle()
                                    .fill(CategoryIcon.color(choice))
                                    .frame(width: 30, height: 30)
                                    .overlay(Circle().strokeBorder(RichyColor.card, lineWidth: isOn ? 2.5 : 0))
                                    .overlay(Circle().strokeBorder(CategoryIcon.color(choice), lineWidth: isOn ? 1.5 : 0).padding(-3))
                                    .frame(width: 36, height: 36)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(choice)
                            .accessibilityAddTraits(isOn ? [.isSelected] : [])
                        }
                    }
                    .padding(.vertical, Spacing.xs)
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
            .navigationTitle("New category")
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
                            Text("Create").fontWeight(.semibold)
                        }
                    }
                    .disabled(!canSave)
                }
            }
            .onAppear {
                // Start on a colour none of the existing categories wears.
                let used = Set(store.categories.compactMap { $0.color?.uppercased() })
                if let fresh = CategoryIcon.colorChoices.first(where: { !used.contains($0.uppercased()) }) {
                    color = fresh
                }
                nameFocused = true
            }
        }
    }

    private func save() async {
        guard canSave else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        if let category = await store.createCategory(name: trimmedName, icon: icon, color: color) {
            onCreated(category)
            dismiss()
        } else {
            errorMessage = store.writeError ?? "Could not save. Try again."
        }
    }
}

#Preview {
    CategoryFormView { _ in }
        .environment(LedgerStore.preview())
}
