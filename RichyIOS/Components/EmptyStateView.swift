import SwiftUI

/// A screen or section with nothing in it yet. Says what belongs here and,
/// when there is one, offers the action that would fill it.
struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: Spacing.md) {
            ZStack {
                Circle()
                    .fill(RichyColor.accentDim)
                    .frame(width: 64, height: 64)
                Image(systemName: icon)
                    .font(.system(size: 26, weight: .medium))
                    .foregroundStyle(RichyColor.accent)
            }
            .padding(.bottom, Spacing.xs)
            Text(title)
                .font(RichyFont.display(RichyFont.Size.title))
                .foregroundStyle(RichyColor.ink)
                .multilineTextAlignment(.center)
            Text(message)
                .font(RichyFont.ui(RichyFont.Size.body))
                .foregroundStyle(RichyColor.ink2)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 300)
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .buttonStyle(PrimaryButtonStyle())
                    .frame(maxWidth: 240)
                    .padding(.top, Spacing.sm)
            }
        }
        .padding(Spacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview("Empty with action") {
    EmptyStateView(icon: "list.bullet.rectangle",
                   title: "No transactions yet",
                   message: "Log your first expense and Richy starts reading your month.",
                   actionTitle: "Add a transaction",
                   action: {})
        .background(RichyColor.background)
}
