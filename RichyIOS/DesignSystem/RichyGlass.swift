import SwiftUI

/// Liquid Glass for Richy, on an app that still ships to iOS 17.
///
/// **Why this file exists.** `glassEffect`, `GlassEffectContainer`,
/// `glassEffectID` and `tabBarMinimizeBehavior` are iOS 26 symbols: they do
/// not exist in the iOS 18 SDK that Xcode 16.4 carries, and CI builds with
/// Xcode 16.4. An `if #available(iOS 26, *)` check is *not* enough - that
/// gates at runtime, and the compiler still has to resolve the symbol. So
/// every glass call sits behind `#if compiler(>=6.2)`, which is true only on
/// Xcode 26 and newer, and inside that, behind the usual availability check
/// for the OS the app is actually running on.
///
/// This is the **only** file in the app that names an iOS 26 API. Screens ask
/// for `.richyGlass(...)` and get real Liquid Glass on iOS 26, a material
/// approximation on iOS 17-18, and an opaque surface when the person has
/// Reduce Transparency switched on. Nothing else has to know.
///
/// **Where glass goes.** The navigation layer only: floating buttons, the
/// composer, segmented controls, toolbars, the tab bar. Never on content -
/// not the balance card, not a ledger row, not a chat bubble. Glass over
/// glass cannot sample, so anything nested inside a glass panel gets a plain
/// fill instead.
enum RichyGlass {

    /// Which Liquid Glass variant a surface asks for.
    enum Style {
        /// Toolbars, floating buttons, the composer - the everyday surface.
        case regular
        /// Thinner, for glass sitting over bold or busy content.
        case clear
    }

    /// True when the app is both built against the iOS 26 SDK and running on
    /// iOS 26, i.e. when the system is drawing real Liquid Glass. Views use
    /// this to drop the press animations and shadows that only the fallback
    /// needs - interactive glass brings its own.
    static var isActive: Bool {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) { return true }
        return false
        #else
        return false
        #endif
    }

    /// How near two glass shapes have to be before their edges start blending.
    /// The value the floating clusters share, so they all melt alike.
    static let clusterSpacing: CGFloat = 22
}

// MARK: - The material

/// Applies Liquid Glass, or the closest honest thing the running OS has.
///
/// The shape is `InsettableShape` rather than plain `Shape` because the
/// fallback draws a hairline *inside* the edge with `strokeBorder`; a plain
/// `stroke` would straddle it and read as a fat rim on a Retina screen.
private struct RichyGlassModifier<S: InsettableShape>: ViewModifier {
    let style: RichyGlass.Style
    let shape: S
    let tint: Color?
    let interactive: Bool

    /// Reduce Transparency means: no see-through surfaces at all. Apple's own
    /// answer is `Glass.identity`, which draws nothing; we go further and put
    /// a solid card underneath, so a floating control still reads as floating.
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    /// A view builder: the two branches below return different opaque types.
    @ViewBuilder
    func body(content: Content) -> some View {
        if reduceTransparency {
            opaque(content)
        } else {
            glass(content)
        }
    }

    @ViewBuilder
    private func glass(_ content: Content) -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            content.glassEffect(liquid, in: shape)
        } else {
            material(content)
        }
        #else
        material(content)
        #endif
    }

    #if compiler(>=6.2)
    @available(iOS 26.0, *)
    private var liquid: Glass {
        var value: Glass = style == .clear ? .clear : .regular
        if let tint { value = value.tint(tint) }
        if interactive { value = value.interactive(true) }
        return value
    }
    #endif

    /// iOS 17 and 18: a blur plus a hairline plus a soft drop shadow. Not
    /// Liquid Glass - it does not refract or track the light - but it floats
    /// over scrolling content and reads as the same layer of the interface.
    ///
    /// Everything is drawn *inside* `.background`, so the shadow falls from
    /// the surface only. Hung on the outside it would fall from the label as
    /// well, and every piece of text on glass would come out smudged.
    private func material(_ content: Content) -> some View {
        // Stated, because a ternary between two `Material`s will not infer.
        let base: Material = style == .clear ? .ultraThinMaterial : .regularMaterial
        return content.background {
            shape.fill(base)
                .overlay(shape.fill(tint?.opacity(0.22) ?? Color.clear))
                // The lit top edge, then the settled one: together they read
                // as a pane with a thickness rather than a flat blur.
                .overlay(shape.strokeBorder(Color.white.opacity(0.18), lineWidth: 0.75))
                .overlay(shape.strokeBorder(RichyColor.separator, lineWidth: 0.75))
                .shadow(color: Color.black.opacity(0.14), radius: 16, x: 0, y: 6)
        }
    }

    /// Reduce Transparency: a solid surface, still floating. The tint goes
    /// over an opaque card rather than replacing it, so a 13%-alpha accent
    /// stays a tint instead of turning the control see-through again.
    private func opaque(_ content: Content) -> some View {
        content.background {
            shape.fill(RichyColor.cardRaised)
                .overlay(shape.fill(tint ?? Color.clear))
                .overlay(shape.strokeBorder(RichyColor.separator, lineWidth: 1))
                .shadow(color: Color.black.opacity(0.16), radius: 14, x: 0, y: 5)
        }
    }
}

extension View {
    /// Puts this view on the glass layer.
    ///
    /// - Parameters:
    ///   - style: `.regular` for most controls, `.clear` over busy content.
    ///   - shape: the glass shape. A capsule by default, as on Apple's own
    ///     floating controls.
    ///   - tint: a colour pushed through the glass, for a control that has to
    ///     read as the primary action.
    ///   - interactive: makes the glass scale and shimmer under a finger.
    ///     iOS only, and only worth setting on something tappable.
    func richyGlass<S: InsettableShape>(_ style: RichyGlass.Style = .regular,
                                        in shape: S = Capsule(style: .continuous),
                                        tint: Color? = nil,
                                        interactive: Bool = false) -> some View {
        modifier(RichyGlassModifier(style: style, shape: shape, tint: tint, interactive: interactive))
            // Glass registers taps on its content, not on the shape behind it.
            // Without this a 56pt button only answers on the glyph inside it.
            .contentShape(shape)
    }

    /// Ties this glass shape to an identity so it can morph into the other
    /// shapes in the same container. No-op below iOS 26.
    @ViewBuilder
    func richyGlassID(_ id: some Hashable & Sendable, in namespace: Namespace.ID) -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            self.glassEffectID(id, in: namespace)
        } else {
            self
        }
        #else
        self
        #endif
    }

    /// Lets the tab bar shrink out of the way as a list scrolls down. iOS 26
    /// only; older systems keep the fixed bar they have always had.
    @ViewBuilder
    func richyTabBarMinimize() -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            self.tabBarMinimizeBehavior(.onScrollDown)
        } else {
            self
        }
        #else
        self
        #endif
    }
}

// MARK: - Container

/// Groups nearby glass shapes so they share one sampling region.
///
/// This matters twice over. Visually, glass cannot sample glass: two loose
/// glass shapes side by side pick up different backdrops and stop looking
/// like one material. And each loose glass shape costs its own backdrop layer
/// - three offscreen textures - so a cluster outside a container is also the
/// expensive way to draw it.
struct RichyGlassContainer<Content: View>: View {
    var spacing: CGFloat = RichyGlass.clusterSpacing
    @ViewBuilder var content: Content

    var body: some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: spacing) { content }
        } else {
            content
        }
        #else
        content
        #endif
    }
}

// MARK: - Buttons

/// A button that lives on the glass layer: no fill of its own, a small
/// press-down only where the system is not already animating the glass.
///
/// `.buttonStyle(.glass)` would do this on iOS 26, but it has no iOS 17
/// spelling, and mixing the two would mean every call site carrying its own
/// `#if`. Driving the same `.richyGlass` modifier from one style keeps every
/// glass control in the app on a single code path. The name carries the
/// prefix on purpose: SwiftUI ships its own `GlassButtonStyle` on iOS 26, and
/// a same-named type in this module would shadow it.
struct RichyGlassButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        let shouldScale = !RichyGlass.isActive && !reduceMotion
        return configuration.label
            .scaleEffect(shouldScale && configuration.isPressed ? 0.94 : 1)
            .animation(.spring(response: 0.28, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

#Preview("Glass over content") {
    ZStack {
        ScrollView {
            VStack(spacing: Spacing.md) {
                ForEach(0..<12, id: \.self) { index in
                    RichyCard {
                        Text("Card \(index)")
                            .font(RichyFont.ui(RichyFont.Size.body))
                            .foregroundStyle(RichyColor.ink)
                    }
                }
            }
            .padding(Spacing.screen)
        }
        .background(RichyColor.background)

        VStack {
            Spacer()
            RichyGlassContainer {
                HStack(spacing: Spacing.md) {
                    Label("Expense", systemImage: "arrow.down")
                        .font(RichyFont.ui(RichyFont.Size.subhead, weight: .semibold))
                        .foregroundStyle(RichyColor.ink)
                        .padding(.horizontal, Spacing.lg)
                        .padding(.vertical, Spacing.md)
                        .richyGlass()

                    Image(systemName: "plus")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(Color.white)
                        .frame(width: 56, height: 56)
                        .richyGlass(in: Circle(), tint: RichyColor.accent, interactive: true)
                }
            }
            .padding(.bottom, Spacing.xxl)
        }
    }
}
