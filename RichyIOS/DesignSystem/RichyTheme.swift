import SwiftUI

/// The three switchable accent themes from the web app. Only the accent family
/// changes between them; grounds, ink and status colours are shared. Theme
/// switching is wired in a later step; the foundation renders `standard`.
enum RichyTheme: String, CaseIterable, Codable, Sendable {
    case purple
    case classic
    case blue

    static let standard = RichyTheme.purple

    var label: String {
        switch self {
        case .purple: return "Mika's Violet"
        case .classic: return "Dark Ember"
        case .blue: return "Cornflower Ocean"
        }
    }

    var accent: Color {
        switch self {
        case .purple: return Color(light: 0x8970C6, dark: 0xB79BFF)
        case .classic: return Color(light: 0xC8673A, dark: 0xE88A5C)
        case .blue: return Color(light: 0x3C4C82, dark: 0x7E9BF2)
        }
    }

    var accentHi: Color {
        switch self {
        case .purple: return Color(light: 0xC8B1FF, dark: 0xD6C4FF)
        case .classic: return Color(light: 0xE07848, dark: 0xF0A277)
        case .blue: return Color(light: 0x5C7AE3, dark: 0xA8BEF8)
        }
    }

    var accentDim: Color {
        switch self {
        case .purple: return Color(light: 0x8970C6, dark: 0xB79BFF, lightAlpha: 0.13, darkAlpha: 0.18)
        case .classic: return Color(light: 0xC8673A, dark: 0xE88A5C, lightAlpha: 0.13, darkAlpha: 0.18)
        case .blue: return Color(light: 0x5C7AE3, dark: 0x7E9BF2, lightAlpha: 0.15, darkAlpha: 0.18)
        }
    }
}
