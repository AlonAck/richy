import SwiftUI

/// The shared layout of every auth screen: a serif title, one sentence of
/// context, and the form inside a card on the page ground.
struct AuthFormScaffold<Content: View>: View {
    let title: String
    let subtitle: String
    let content: () -> Content

    init(title: String, subtitle: String, @ViewBuilder content: @escaping () -> Content) {
        self.title = title
        self.subtitle = subtitle
        self.content = content
    }

    var body: some View {
        ZStack {
            RichyColor.background.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text(title)
                            .font(RichyFont.display(26))
                            .foregroundStyle(RichyColor.ink)
                        Text(subtitle)
                            .font(RichyFont.ui(RichyFont.Size.body))
                            .foregroundStyle(RichyColor.ink2)
                    }
                    RichyCard {
                        VStack(alignment: .leading, spacing: Spacing.lg) {
                            content()
                        }
                    }
                }
                .padding(Spacing.screen)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}

/// The error or info line under a form, in the web's colours.
struct AuthMessages: View {
    let model: AuthViewModel

    var body: some View {
        if let error = model.errorMessage {
            Text(error)
                .font(RichyFont.ui(RichyFont.Size.footnote))
                .foregroundStyle(RichyColor.red)
        }
        if let info = model.infoMessage {
            Text(info)
                .font(RichyFont.ui(RichyFont.Size.footnote))
                .foregroundStyle(RichyColor.green)
        }
    }
}

/// Terms and privacy, as on the web sign-up screen. Opens in the browser.
struct LegalLinks: View {
    var body: some View {
        HStack(spacing: Spacing.lg) {
            Link("Terms", destination: URL(string: "https://richy-mgkl.vercel.app/terms.html")!)
            Link("Privacy", destination: URL(string: "https://richy-mgkl.vercel.app/privacy.html")!)
        }
        .font(RichyFont.ui(RichyFont.Size.footnote, weight: .medium))
        .tint(RichyColor.ink3)
    }
}
