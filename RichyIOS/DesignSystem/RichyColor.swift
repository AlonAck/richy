import SwiftUI
import UIKit

extension UIColor {
    /// 0xRRGGBB.
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        let red = CGFloat((hex >> 16) & 0xFF) / 255
        let green = CGFloat((hex >> 8) & 0xFF) / 255
        let blue = CGFloat(hex & 0xFF) / 255
        self.init(red: red, green: green, blue: blue, alpha: alpha)
    }
}

extension Color {
    /// A colour that resolves per appearance, the way an asset-catalog colour
    /// with "Any" and "Dark" slots does - without hand-writing catalog JSON.
    init(light: UInt32, dark: UInt32, lightAlpha: CGFloat = 1, darkAlpha: CGFloat = 1) {
        self.init(uiColor: UIColor { traits in
            let isDark = traits.userInterfaceStyle == .dark
            return UIColor(hex: isDark ? dark : light, alpha: isDark ? darkAlpha : lightAlpha)
        })
    }

    init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(uiColor: UIColor(hex: hex, alpha: alpha))
    }
}

/// Richy's colour system, ported from the web app's adaptive palette. Every
/// colour is a light/dark PAIR (rule 1 of that system): nothing keeps a light
/// value on a dark ground. Status marks get brighter on dark; large tinted
/// areas get deeper. Values are the web app's exact tokens.
enum RichyColor {
    // Grounds and ink
    static let background = Color(light: 0xF7F3EE, dark: 0x131110)
    static let card = Color(light: 0xFFFFFF, dark: 0x1C1915)
    static let cardRaised = Color(light: 0xFFFFFF, dark: 0x252018)
    static let cardShadow = Color(light: 0x000000, dark: 0x000000, lightAlpha: 0.05, darkAlpha: 0)
    static let ink = Color(light: 0x1A1410, dark: 0xEDE8E2)
    static let ink2 = Color(light: 0x6B5C4E, dark: 0xA09080)
    static let ink3 = Color(light: 0x7A6B5C, dark: 0x978877)
    static let separator = Color(light: 0x000000, dark: 0xFFFFFF, lightAlpha: 0.06, darkAlpha: 0.07)
    static let fill = Color(light: 0x000000, dark: 0xFFFFFF, lightAlpha: 0.04, darkAlpha: 0.06)

    // Accent: the default "Mika's Violet" theme. See RichyTheme for the others.
    static let accent = RichyTheme.purple.accent
    static let accentHi = RichyTheme.purple.accentHi
    static let accentDim = RichyTheme.purple.accentDim
    static let heroText = Color(light: 0x2A1F4D, dark: 0xEDE7FF)

    // Status marks - brighter and more saturated on dark.
    static let green = Color(light: 0x27A85F, dark: 0x3DDC84)
    static let greenDim = Color(light: 0x27A85F, dark: 0x3DDC84, lightAlpha: 0.15, darkAlpha: 0.18)
    static let red = Color(light: 0xE03030, dark: 0xEF4A44)
    static let redDim = Color(light: 0xE03030, dark: 0xEF4A44, lightAlpha: 0.13, darkAlpha: 0.20)
    static let gold = Color(light: 0xC8983A, dark: 0xE8B44C)
    static let goldDim = Color(light: 0xC8983A, dark: 0xE8B44C, lightAlpha: 0.15, darkAlpha: 0.18)
    static let blue = Color(light: 0x2E7DD6, dark: 0x5AA9F0)
    static let blueDim = Color(light: 0x2E7DD6, dark: 0x5AA9F0, lightAlpha: 0.15, darkAlpha: 0.18)

    // Brand marks that do not flip: the logo tile and its "R".
    static let logoTile = Color(hex: 0x0D0C18)
    static let logoGlyph = Color(hex: 0xC8973A)
}
