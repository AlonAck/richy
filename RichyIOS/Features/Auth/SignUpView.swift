import SwiftUI

/// Email + password sign-up with the same consent the web asks for. Date of
/// birth and the rest of the profile are collected in onboarding, which
/// arrives with the next step - as does the server-side age check.
struct SignUpView: View {
    @State private var model: AuthViewModel
    @State private var consent = false
    let onHaveAccount: () -> Void

    init(auth: any AuthService, onHaveAccount: @escaping () -> Void) {
        _model = State(initialValue: AuthViewModel(auth: auth))
        self.onHaveAccount = onHaveAccount
    }

    var body: some View {
        AuthFormScaffold(title: "Create your account",
                         subtitle: "One account for the web and the app. Your data follows you.") {
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
            Toggle(isOn: $consent) {
                Text("I'm 16 or older and I agree to the Terms and the Privacy Policy.")
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
        SignUpView(auth: MockAuthService(), onHaveAccount: {})
    }
}
