import SwiftUI

struct ResetPasswordView: View {
    @State private var model: AuthViewModel

    init(auth: any AuthService) {
        _model = State(initialValue: AuthViewModel(auth: auth))
    }

    var body: some View {
        AuthFormScaffold(title: "Reset your password",
                         subtitle: "Enter your email and Richy sends a link to choose a new one.") {
            RichyTextField(title: "Email",
                           text: $model.email,
                           placeholder: "you@example.com",
                           keyboard: .emailAddress,
                           contentType: .emailAddress)
            AuthMessages(model: model)
            PrimaryButton(title: "Send reset link", isBusy: model.isBusy) {
                Task { await model.sendReset() }
            }
            .disabled(!model.canReset)
        }
        .navigationTitle("Reset password")
    }
}

#Preview("Reset") {
    NavigationStack {
        ResetPasswordView(auth: MockAuthService())
    }
}
