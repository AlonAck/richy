import SwiftUI

/// Shown once, to someone signed in whose account document does not exist
/// yet: a first Google or Apple sign-in from the phone. Collects what the
/// web's sign-up asks for - name, date of birth (16+), currency, language -
/// records consent, and creates the same document the web would.
struct AccountSetupView: View {
    let user: AuthUser

    @Environment(LedgerStore.self) private var store
    @Environment(AppState.self) private var appState

    @State private var name: String
    @State private var dob: Date
    @State private var currency: String
    @State private var lang: String
    @State private var openingText = ""
    @State private var notes = ""
    @State private var consent = false
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var underage = false

    init(user: AuthUser) {
        self.user = user
        _name = State(initialValue: user.displayName ?? "")
        _dob = State(initialValue: Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date())
        _currency = State(initialValue: Currencies.defaultSymbol())
        let preferred = Locale.preferredLanguages.first.map { String($0.prefix(2)) } ?? "en"
        _lang = State(initialValue: Currencies.languages.contains { $0.code == preferred } ? preferred : "en")
    }

    private var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }

    private var openingBalance: Double {
        let cleaned = openingText.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespaces)
        return max(Double(cleaned) ?? 0, 0)
    }

    private var canSave: Bool {
        !trimmedName.isEmpty && consent && !isSaving
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Almost there, \(firstName).")
                            .font(RichyFont.display(26))
                            .foregroundStyle(RichyColor.ink)
                        Text("A few details Richy needs before your first month, the same ones the web asks for.")
                            .font(RichyFont.ui(RichyFont.Size.body))
                            .foregroundStyle(RichyColor.ink2)
                    }
                    .padding(.vertical, Spacing.xs)
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())

                Section("About you") {
                    TextField("Your name", text: $name)
                        .textContentType(.name)
                        .textInputAutocapitalization(.words)
                    DatePicker("Date of birth", selection: $dob, in: ...Date(), displayedComponents: .date)
                        .environment(\.timeZone, RichyDate.utc)
                }
                .listRowBackground(RichyColor.card)

                Section("Money") {
                    Picker("Currency", selection: $currency) {
                        ForEach(Currencies.options) { option in
                            Text(option.label).tag(option.symbol)
                        }
                    }
                    Picker("Language", selection: $lang) {
                        ForEach(Currencies.languages, id: \.code) { language in
                            Text(language.name).tag(language.code)
                        }
                    }
                    HStack {
                        Text("Starting balance")
                        Spacer()
                        Text(currency).foregroundStyle(RichyColor.ink3)
                        TextField("optional", text: $openingText)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: 140)
                    }
                }
                .listRowBackground(RichyColor.card)

                Section {
                    TextField("Anything Richard should know? (optional)", text: $notes, axis: .vertical)
                        .lineLimit(2...5)
                } footer: {
                    Text("For example: my rent is paid by my parents, or I get paid every two weeks. Richard treats this as fact.")
                }
                .listRowBackground(RichyColor.card)

                Section {
                    Toggle(isOn: $consent) {
                        Text("I'm 16 or older and I agree to the Terms and the Privacy Policy. I understand Richard is an AI: the numbers I keep in Richy are sent to Richy's server and on to Anthropic to generate his replies.")
                            .font(RichyFont.ui(RichyFont.Size.footnote))
                            .foregroundStyle(RichyColor.ink2)
                    }
                    .tint(RichyColor.accent)
                    LegalLinks()
                } footer: {
                    if let errorMessage {
                        Text(errorMessage)
                            .foregroundStyle(RichyColor.red)
                    }
                }
                .listRowBackground(RichyColor.card)

                Section {
                    PrimaryButton(title: "Start using Richy", isBusy: isSaving) {
                        Task { await save() }
                    }
                    .disabled(!canSave)
                    Button("Sign out") { appState.signOut() }
                        .buttonStyle(SecondaryButtonStyle())
                        .disabled(isSaving)
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            }
            .scrollContentBackground(.hidden)
            .background(RichyColor.background)
            .tint(RichyColor.accent)
            .navigationTitle("Set up your account")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Richy is for people 16 and older", isPresented: $underage) {
                Button("Sign out", role: .cancel) { appState.signOut() }
            } message: {
                Text("The date of birth you entered is under 16, so Richy cannot open an account. See section 2 of the Terms.")
            }
        }
    }

    private var firstName: String {
        if let first = trimmedName.split(separator: " ").first, !first.isEmpty { return String(first) }
        if let email = user.email, let at = email.firstIndex(of: "@") { return String(email[..<at]) }
        return "there"
    }

    private func save() async {
        errorMessage = nil
        let dobText = RichyDate.string(from: dob)
        guard let age = RichyDate.age(dob: dobText) else {
            errorMessage = "That date of birth could not be read."
            return
        }
        if age < RichyDate.minimumAge {
            underage = true
            return
        }
        if age > 120 {
            errorMessage = "Check the date of birth."
            return
        }
        isSaving = true
        defer { isSaving = false }
        var draft = AccountDraft(displayName: trimmedName, email: user.email, dob: dobText)
        draft.lang = lang
        draft.currency = currency
        draft.richardNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        draft.openingBalance = openingBalance
        if !(await store.createAccount(draft)) {
            errorMessage = store.writeError ?? "Could not create your account. Try again."
        }
    }
}

#Preview("Account setup") {
    AccountSetupView(user: MockAuthService.demoUser)
        .environment(LedgerStore.preview())
        .environment(AppState(services: .mock()))
}
