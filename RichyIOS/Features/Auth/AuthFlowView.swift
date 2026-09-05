import SwiftUI

enum AuthRoute: Hashable {
    case signIn
    case signUp
    case reset
}

/// Welcome -> sign in / create account / reset password. Each screen gets its
/// own view model, built from the environment's auth service.
struct AuthFlowView: View {
    @Environment(\.services) private var services
    @State private var path: [AuthRoute] = []

    var body: some View {
        NavigationStack(path: $path) {
            WelcomeView(auth: services.auth,
                        onSignIn: { path.append(.signIn) },
                        onSignUp: { path.append(.signUp) })
                .navigationDestination(for: AuthRoute.self) { route in
                    switch route {
                    case .signIn:
                        SignInView(auth: services.auth,
                                   onForgotPassword: { path.append(.reset) },
                                   onCreateAccount: { path = [.signUp] })
                    case .signUp:
                        SignUpView(auth: services.auth,
                                   onHaveAccount: { path = [.signIn] })
                    case .reset:
                        ResetPasswordView(auth: services.auth)
                    }
                }
        }
        .tint(RichyColor.accent)
    }
}

private struct WelcomeView: View {
    @State private var model: AuthViewModel
    let onSignIn: () -> Void
    let onSignUp: () -> Void

    init(auth: any AuthService, onSignIn: @escaping () -> Void, onSignUp: @escaping () -> Void) {
        _model = State(initialValue: AuthViewModel(auth: auth))
        self.onSignIn = onSignIn
        self.onSignUp = onSignUp
    }

    var body: some View {
        ZStack {
            RichyColor.background.ignoresSafeArea()
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    Spacer(minLength: Spacing.xxl)
                    RichyLogoTile(size: 72)
                    Text("Richy")
                        .font(RichyFont.display(RichyFont.Size.hero))
                        .foregroundStyle(RichyColor.ink)
                    Text("Personal budgeting, made calm. A beautiful budget paired with Richard, an AI money coach who knows your numbers.")
                        .font(RichyFont.ui(RichyFont.Size.body))
                        .foregroundStyle(RichyColor.ink2)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 320)
                    Spacer(minLength: Spacing.xxl)
                    VStack(spacing: Spacing.md) {
                        SocialSignInButtons(model: model)
                        OrDivider()
                        Button("Create an account with email", action: onSignUp)
                            .buttonStyle(PrimaryButtonStyle())
                            .disabled(model.isBusy)
                        Button("I already have an account", action: onSignIn)
                            .buttonStyle(SecondaryButtonStyle())
                            .disabled(model.isBusy)
                        AuthMessages(model: model)
                        if model.isBusy {
                            ProgressView().tint(RichyColor.accent)
                        }
                    }
                    LegalLinks()
                        .padding(.top, Spacing.xs)
                }
                .padding(Spacing.screen)
                .frame(maxWidth: .infinity)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}

#Preview("Auth flow") {
    AuthFlowView()
        .environment(\.services, .mock())
}
