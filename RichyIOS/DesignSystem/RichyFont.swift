import SwiftUI

/// Two type roles, as on the web: an editorial serif for titles and figures
/// that carry the brand, and the system sans for everything else. The serif is
/// New York via `.design(.serif)` - the face index.html asks for first.
enum RichyFont {
    static func display(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        .system(size: size, weight: weight, design: .serif)
    }

    static func ui(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }

    static func mono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }

    /// The scale the web app actually uses, named.
    enum Size {
        static let caption: CGFloat = 11
        static let footnote: CGFloat = 12.5
        static let subhead: CGFloat = 13.5
        static let body: CGFloat = 15
        static let headline: CGFloat = 17
        static let title: CGFloat = 22
        static let hero: CGFloat = 34
    }
}
