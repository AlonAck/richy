import SwiftUI
import AuthenticationServices

/// "Continue with Google" and "Continue with Apple", side by side with the
/// email flow. Apple's button is the system one, as its guidelines require
/// when Google sign-in is offered; Google's is drawn in the same shape.
struct SocialSignInButtons: View {
    let model: AuthViewModel
    @Environment(\.colorScheme) private var colorScheme
    @State private var rawNonce = Nonce.random()

    var body: some View {
        VStack(spacing: Spacing.sm) {
            SignInWithAppleButton(.continue) { request in
                rawNonce = Nonce.random()
                request.requestedScopes = [.fullName, .email]
                request.nonce = Nonce.sha256(rawNonce)
            } onCompletion: { result in
                let nonce = rawNonce
                Task { await model.signInWithApple(result, rawNonce: nonce) }
            }
            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
            .frame(height: 48)
            .clipShape(Capsule())
            .disabled(model.isBusy)

            Button {
                Task { await model.signInWithGoogle() }
            } label: {
                HStack(spacing: Spacing.sm) {
                    GoogleMark()
                    Text("Continue with Google")
                        .font(RichyFont.ui(RichyFont.Size.body, weight: .semibold))
                }
                .foregroundStyle(RichyColor.ink)
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(RichyColor.card, in: Capsule())
                .overlay(Capsule().strokeBorder(RichyColor.separator, lineWidth: 1))
            }
            .buttonStyle(.plain)
            .disabled(model.isBusy)
        }
    }
}

/// Google's four-colour "G", drawn so no image asset is needed.
private struct GoogleMark: View {
    var body: some View {
        ZStack {
            Circle()
                .trim(from: 0.0, to: 0.25)
                .stroke(Color(hex: 0x4285F4), lineWidth: 3.2)
            Circle()
                .trim(from: 0.25, to: 0.5)
                .stroke(Color(hex: 0x34A853), lineWidth: 3.2)
            Circle()
                .trim(from: 0.5, to: 0.75)
                .stroke(Color(hex: 0xFBBC05), lineWidth: 3.2)
            Circle()
                .trim(from: 0.75, to: 1.0)
                .stroke(Color(hex: 0xEA4335), lineWidth: 3.2)
        }
        .rotationEffect(.degrees(-45))
        .frame(width: 16, height: 16)
        .accessibilityHidden(true)
    }
}

/// "or" between the social buttons and the email form.
struct OrDivider: View {
    var body: some View {
        HStack(spacing: Spacing.md) {
            Rectangle().fill(RichyColor.separator).frame(height: 1)
            Text("or")
                .font(RichyFont.ui(RichyFont.Size.footnote, weight: .medium))
                .foregroundStyle(RichyColor.ink3)
            Rectangle().fill(RichyColor.separator).frame(height: 1)
        }
    }
}

#Preview("Social buttons") {
    VStack(spacing: Spacing.lg) {
        SocialSignInButtons(model: AuthViewModel(auth: MockAuthService()))
        OrDivider()
    }
    .padding(Spacing.screen)
    .background(RichyColor.background)
}
