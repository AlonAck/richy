import SwiftUI

struct SignInView: View {
    @State private var model: AuthViewModel
    let onForgotPassword: () -> Void
    let onCreateAccount: () -> Void

    init(auth: any AuthService,
         onForgotPassword: @escaping () -> Void,
         onCreateAccount: @escaping () -> Void) {
        _model = State(initialValue: AuthViewModel(auth: auth))
        self.onForgotPassword = onForgotPassword
        self.onCreateAccount = onCreateAccount
    }

    var body: some View {
        AuthFormScaffold(title: "Welcome back",
                         subtitle: "Sign in with the account you use on the web - same email, same data.") {
            RichyTextField(title: "Email",
                           text: $model.email,
                           placeholder: "you@example.com",
                           keyboard: .emailAddress,
                           contentType: .emailAddress)
            RichyTextField(title: "Password",
                           text: $model.password,
                           placeholder: "Your password",
                           isSecure: true,
                           contentType: .password)
            AuthMessages(model: model)
            PrimaryButton(title: "Sign in", isBusy: model.isBusy) {
                Task { await model.signIn() }
            }
            .disabled(!model.canSignIn)
            OrDivider()
            SocialSignInButtons(model: model)
            Button("Forgot your password?", action: onForgotPassword)
                .font(RichyFont.ui(RichyFont.Size.subhead, weight: .medium))
                .tint(RichyColor.accent)
            Divider()
            Button("New to Richy? Create an account", action: onCreateAccount)
                .font(RichyFont.ui(RichyFont.Size.subhead, weight: .medium))
                .tint(RichyColor.ink2)
        }
        .navigationTitle("Sign in")
    }
}

#Preview("Sign in") {
    NavigationStack {
        SignInView(auth: MockAuthService(), onForgotPassword: {}, onCreateAccount: {})
    }
}
