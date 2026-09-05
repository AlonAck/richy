import SwiftUI

/// The web app's category icon ids, drawn with SF Symbols. Colours come from
/// the account document as "#RRGGBB" strings and are used as-is on both
/// appearances, as the web does.
enum CategoryIcon {
    static func symbol(for id: String?) -> String {
        switch id ?? "" {
        case "home": return "house.fill"
        case "food": return "fork.knife"
        case "car": return "car.fill"
        case "heart": return "heart.fill"
        case "film": return "film.fill"
        case "cart": return "cart.fill"
        case "plane": return "airplane"
        case "briefcase": return "briefcase.fill"
        case "chart": return "chart.line.uptrend.xyaxis"
        case "coins": return "dollarsign.circle.fill"
        case "box": return "shippingbox.fill"
        case "building": return "building.2.fill"
        case "star": return "star.fill"
        case "gift": return "gift.fill"
        case "book": return "book.fill"
        case "phone": return "phone.fill"
        case "bolt": return "bolt.fill"
        case "paw": return "pawprint.fill"
        case "music": return "music.note"
        case "coffee": return "cup.and.saucer.fill"
        case "shirt": return "tshirt.fill"
        case "wrench": return "wrench.fill"
        case "cap": return "graduationcap.fill"
        case "baby": return "figure.and.child.holdinghands"
        case "wallet": return "wallet.pass.fill"
        case "bank": return "building.columns.fill"
        case "opening": return "flag.fill"
        default: return "tag.fill"
        }
    }

    /// A stored "#RRGGBB"; anything unparseable falls back to the accent.
    static func color(_ hex: String?) -> Color {
        guard let hex, let value = parse(hex) else { return RichyColor.accent }
        return Color(hex: value)
    }

    static func parse(_ hex: String) -> UInt32? {
        var text = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.hasPrefix("#") { text.removeFirst() }
        guard text.count == 6, let value = UInt32(text, radix: 16) else { return nil }
        return value
    }
}

/// The rounded tile with a category's glyph, as on the web app's rows.
struct CategoryTile: View {
    let icon: String?
    let colorHex: String?
    var size: CGFloat = 36

    var body: some View {
        let tint = CategoryIcon.color(colorHex)
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
                .fill(tint.opacity(0.16))
            Image(systemName: CategoryIcon.symbol(for: icon))
                .font(.system(size: size * 0.44, weight: .semibold))
                .foregroundStyle(tint)
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

#Preview("Tiles") {
    HStack(spacing: Spacing.md) {
        CategoryTile(icon: "home", colorHex: "#8B6CEF")
        CategoryTile(icon: "food", colorHex: "#27A85F")
        CategoryTile(icon: "car", colorHex: "#D97941")
        CategoryTile(icon: "nope", colorHex: nil)
    }
    .padding()
    .background(RichyColor.background)
}
