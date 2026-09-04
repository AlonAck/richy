import SwiftUI

/// What a person sees when something failed: what went wrong, in plain words,
/// and a way forward when there is one.
struct ErrorView: View {
    let message: String
    let retry: (() -> Void)?

    init(message: String, retry: (() -> Void)? = nil) {
        self.message = message
        self.retry = retry
    }

    init(error: Error, retry: (() -> Void)? = nil) {
        self.init(message: ErrorView.message(for: error), retry: retry)
    }

    static func message(for error: Error) -> String {
        UserFacingError.message(for: error)
    }

    var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 28, weight: .medium))
                .foregroundStyle(RichyColor.gold)
            Text(message)
                .font(RichyFont.ui(RichyFont.Size.body))
                .foregroundStyle(RichyColor.ink2)
                .multilineTextAlignment(.center)
            if let retry {
                Button("Try again", action: retry)
                    .buttonStyle(PrimaryButtonStyle())
                    .frame(maxWidth: 220)
                    .padding(.top, Spacing.sm)
            }
        }
        .padding(Spacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview("Error with retry") {
    ErrorView(error: APIError.rateLimited, retry: {})
        .background(RichyColor.background)
}
