import SwiftUI
import UIKit

/// A labelled input on the page ground, matching the web's form rows. Secure
/// fields get a reveal toggle.
struct RichyTextField: View {
    let title: String
    @Binding var text: String
    var placeholder: String = ""
    var isSecure: Bool = false
    var keyboard: UIKeyboardType = .default
    var contentType: UITextContentType? = nil
    var autocapitalization: TextInputAutocapitalization = .never

    @State private var reveal = false

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(title.uppercased())
                .font(RichyFont.ui(RichyFont.Size.caption, weight: .semibold))
                .tracking(0.8)
                .foregroundStyle(RichyColor.ink3)
            HStack(spacing: Spacing.sm) {
                Group {
                    if isSecure && !reveal {
                        SecureField(placeholder, text: $text)
                    } else {
                        TextField(placeholder, text: $text)
                    }
                }
                .font(RichyFont.ui(RichyFont.Size.body))
                .foregroundStyle(RichyColor.ink)
                .keyboardType(keyboard)
                .textContentType(contentType)
                .textInputAutocapitalization(autocapitalization)
                .autocorrectionDisabled()
                if isSecure {
                    Button {
                        reveal.toggle()
                    } label: {
                        Image(systemName: reveal ? "eye.slash" : "eye")
                            .foregroundStyle(RichyColor.ink3)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(reveal ? "Hide password" : "Show password")
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(RichyColor.background, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                    .strokeBorder(RichyColor.separator, lineWidth: 1)
            )
        }
    }
}

#Preview("Fields") {
    struct Demo: View {
        @State private var email = ""
        @State private var password = "hunter2"
        var body: some View {
            VStack(spacing: Spacing.lg) {
                RichyTextField(title: "Email", text: $email, placeholder: "you@example.com",
                               keyboard: .emailAddress, contentType: .emailAddress)
                RichyTextField(title: "Password", text: $password, placeholder: "At least 6 characters",
                               isSecure: true, contentType: .password)
            }
            .padding(Spacing.screen)
            .background(RichyColor.card)
        }
    }
    return Demo()
}
