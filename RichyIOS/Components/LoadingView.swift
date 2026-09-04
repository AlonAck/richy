import SwiftUI

struct LoadingView: View {
    var label: String? = nil

    var body: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
                .tint(RichyColor.accent)
            if let label {
                Text(label)
                    .font(RichyFont.ui(RichyFont.Size.subhead))
                    .foregroundStyle(RichyColor.ink3)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview("Loading") {
    LoadingView(label: "Loading your money...")
        .background(RichyColor.background)
}
