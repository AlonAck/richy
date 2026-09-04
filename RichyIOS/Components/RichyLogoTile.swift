import SwiftUI

/// The brand mark from the web's splash: a near-black rounded tile with the
/// gold serif "R". Deliberately identical in light and dark.
struct RichyLogoTile: View {
    var size: CGFloat = 64

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.31, style: .continuous)
                .fill(RichyColor.logoTile)
                .shadow(color: Color.black.opacity(0.18), radius: 16, x: 0, y: 12)
            Text("R")
                .font(RichyFont.display(size * 0.62, weight: .medium))
                .foregroundStyle(RichyColor.logoGlyph)
                .offset(y: size * 0.03)
        }
        .frame(width: size, height: size)
        .accessibilityLabel("Richy")
    }
}

#Preview("Logo") {
    VStack(spacing: Spacing.xl) {
        RichyLogoTile(size: 40)
        RichyLogoTile(size: 64)
        RichyLogoTile(size: 96)
    }
    .padding(Spacing.xxl)
    .background(RichyColor.background)
}
