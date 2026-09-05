import SwiftUI

/// Email + password sign-up with what the web's sign-up asks for: name, date
/// of birth (Richy is 16+), currency, and the consent line. The account
/// document is written right after the login is created, so the first
/// screen after this is the dashboard, not a setup form.
struct SignUpView: View {
    @State private var model: AuthViewModel
    @State private var consent = false
    let onHaveAccount: () -> Void

    init(auth: any AuthService, ledger: (any LedgerService)? = nil, onHaveAccount: @escaping () -> Void) {
        _model = State(initialValue: AuthViewModel(auth: auth, ledger: ledger))
        self.onHaveAccount = onHaveAccount
    }

    var body: some View {
        @Bindable var model = model
        AuthFormScaffold(title: "Create your account",
                         subtitle: "One account for the web and the app. Your data follows you.") {
            RichyTextField(title: "Your name",
                           text: $model.fullName,
                           placeholder: "How Richard should address you",
                           contentType: .name,
                           autocapitalization: .words)
            RichyTextField(title: "Email",
                           text: $model.email,
                           placeholder: "you@example.com",
                           keyboard: .emailAddress,
                           contentType: .emailAddress)
            RichyTextField(title: "Password",
                           text: $model.password,
                           placeholder: "At least 6 characters",
                           isSecure: true,
                           contentType: .newPassword)
            RichyTextField(title: "Confirm password",
                           text: $model.confirmPassword,
                           placeholder: "Type it again",
                           isSecure: true,
                           contentType: .newPassword)
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("DATE OF BIRTH")
                    .font(RichyFont.ui(RichyFont.Size.caption, weight: .semibold))
                    .tracking(0.8)
                    .foregroundStyle(RichyColor.ink3)
                DatePicker("Date of birth", selection: $model.dob, in: ...Date(), displayedComponents: .date)
                    .labelsHidden()
                    .environment(\.timeZone, RichyDate.utc)
            }
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("CURRENCY")
                    .font(RichyFont.ui(RichyFont.Size.caption, weight: .semibold))
                    .tracking(0.8)
                    .foregroundStyle(RichyColor.ink3)
                Picker("Currency", selection: $model.currency) {
                    ForEach(Currencies.options) { option in
                        Text(option.label).tag(option.symbol)
                    }
                }
                .labelsHidden()
                .tint(RichyColor.ink)
            }
            Toggle(isOn: $consent) {
                Text("I'm 16 or older and I agree to the Terms and the Privacy Policy. I understand Richard is an AI: the numbers I keep in Richy are sent to Richy's server and on to Anthropic to generate his replies.")
                    .font(RichyFont.ui(RichyFont.Size.footnote))
                    .foregroundStyle(RichyColor.ink2)
            }
            .tint(RichyColor.accent)
            LegalLinks()
            AuthMessages(model: model)
            PrimaryButton(title: "Create account", isBusy: model.isBusy) {
                Task { await model.signUp() }
            }
            .disabled(!(model.canSignUp && consent))
            Divider()
            Button("Already have an account? Sign in", action: onHaveAccount)
                .font(RichyFont.ui(RichyFont.Size.subhead, weight: .medium))
                .tint(RichyColor.ink2)
        }
        .navigationTitle("Create account")
    }
}

#Preview("Sign up") {
    NavigationStack {
        SignUpView(auth: MockAuthService(), ledger: MockLedgerService(), onHaveAccount: {})
    }
}
