import SwiftUI

/// The web app's `Card`: a white sheet with a continuous 16pt radius and a soft
/// shadow on light; on dark the shadow does nothing against near-black, so a
/// 1px separator ring carries the edge instead (the palette's rule 2).
struct RichyCard<Content: View>: View {
    let padding: CGFloat
    let content: () -> Content

    init(padding: CGFloat = Spacing.lg, @ViewBuilder content: @escaping () -> Content) {
        self.padding = padding
        self.content = content
    }

    var body: some View {
        content()
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RichyColor.card, in: RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                    .strokeBorder(RichyColor.separator, lineWidth: 1)
            )
            .shadow(color: RichyColor.cardShadow, radius: 12, x: 0, y: 4)
    }
}

#Preview("Card") {
    RichyCard {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Left to spend")
                .font(RichyFont.ui(RichyFont.Size.caption, weight: .semibold))
                .foregroundStyle(RichyColor.ink3)
            Text(Money.format(1240.5))
                .font(RichyFont.display(RichyFont.Size.hero))
                .foregroundStyle(RichyColor.ink)
        }
    }
    .padding(Spacing.screen)
    .background(RichyColor.background)
}
