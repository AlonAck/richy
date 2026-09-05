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
            WelcomeView(onSignIn: { path.append(.signIn) },
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
    let onSignIn: () -> Void
    let onSignUp: () -> Void

    var body: some View {
        ZStack {
            RichyColor.background.ignoresSafeArea()
            VStack(spacing: Spacing.lg) {
                Spacer()
                RichyLogoTile(size: 72)
                Text("Richy")
                    .font(RichyFont.display(RichyFont.Size.hero))
                    .foregroundStyle(RichyColor.ink)
                Text("Personal budgeting, made calm. A beautiful budget paired with Richard, an AI money coach who knows your numbers.")
                    .font(RichyFont.ui(RichyFont.Size.body))
                    .foregroundStyle(RichyColor.ink2)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 320)
                Spacer()
                VStack(spacing: Spacing.md) {
                    Button("Create an account", action: onSignUp)
                        .buttonStyle(PrimaryButtonStyle())
                    Button("I already have an account", action: onSignIn)
                        .buttonStyle(SecondaryButtonStyle())
                }
                LegalLinks()
                    .padding(.top, Spacing.xs)
            }
            .padding(Spacing.screen)
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}

#Preview("Auth flow") {
    AuthFlowView()
        .environment(\.services, .mock())
}
