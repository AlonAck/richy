import SwiftUI

/// The accent-filled pill from the web app's `BigBtn`: white text, full width,
/// a small press-down, dimmed when disabled.
struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(RichyFont.ui(RichyFont.Size.body, weight: .semibold))
            .foregroundStyle(Color.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(RichyColor.accent, in: Capsule())
            .opacity(isEnabled ? 1 : 0.55)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

/// A quiet secondary action: accent text on the accent tint.
struct SecondaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(RichyFont.ui(RichyFont.Size.body, weight: .semibold))
            .foregroundStyle(RichyColor.accent)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(RichyColor.accentDim, in: Capsule())
            .opacity(isEnabled ? 1 : 0.55)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

/// A primary button that shows a spinner while its work is in flight.
struct PrimaryButton: View {
    let title: String
    var isBusy: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Text(title).opacity(isBusy ? 0 : 1)
                if isBusy {
                    ProgressView().tint(Color.white)
                }
            }
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(isBusy)
    }
}

#Preview("Buttons") {
    VStack(spacing: Spacing.md) {
        PrimaryButton(title: "Sign in", action: {})
        PrimaryButton(title: "Signing in", isBusy: true, action: {})
        Button("Create an account", action: {}).buttonStyle(SecondaryButtonStyle())
        PrimaryButton(title: "Disabled", action: {}).disabled(true)
    }
    .padding(Spacing.screen)
    .background(RichyColor.background)
}
