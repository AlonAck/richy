import SwiftUI

/// The floating add control that sits over the Dashboard and the Activity
/// list: one glass circle that opens into two labelled glass capsules.
///
/// Logging a transaction is the thing people do most in Richy, so it gets the
/// one permanently visible control in the app. It lives on the glass layer
/// rather than in the toolbar because it has to stay reachable with a thumb
/// while a long ledger scrolls underneath it.
///
/// The three shapes share one `RichyGlassContainer`, so on iOS 26 they are a
/// single pool of glass: the capsules grow out of the circle and melt back
/// into it instead of fading in beside it. Below iOS 26 the same layout
/// springs in over a blurred material.
struct QuickAddCluster: View {
    /// Called with the type to open the transaction form on.
    let onPick: (TransactionType) -> Void

    @State private var isOpen = false
    @Namespace private var glass
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var openAnimation: Animation {
        reduceMotion ? .easeInOut(duration: 0.2) : .spring(response: 0.38, dampingFraction: 0.78)
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            scrim
            RichyGlassContainer {
                VStack(alignment: .trailing, spacing: Spacing.md) {
                    if isOpen {
                        action(title: "Income",
                               symbol: "arrow.down.backward",
                               tint: RichyColor.green,
                               type: .income)
                        action(title: "Expense",
                               symbol: "arrow.up.forward",
                               tint: RichyColor.red,
                               type: .expense)
                    }
                    toggle
                }
            }
            .padding(.trailing, Spacing.xl)
            .padding(.bottom, Spacing.lg)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
    }

    /// Catches the tap that closes the cluster. Present only while open, so it
    /// never sits between a finger and the list underneath.
    @ViewBuilder
    private var scrim: some View {
        if isOpen {
            Rectangle()
                .fill(Color.black.opacity(0.18))
                .ignoresSafeArea()
                .transition(.opacity)
                .onTapGesture { close() }
                .accessibilityLabel("Close")
                .accessibilityAddTraits(.isButton)
        }
    }

    private var toggle: some View {
        Button {
            withAnimation(openAnimation) { isOpen.toggle() }
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(Color.white)
                // Only the glyph turns. Rotating a view that carries glass
                // makes the shape itself morph unpredictably, so the rotation
                // stays strictly inside the glass.
                .rotationEffect(.degrees(isOpen ? 45 : 0))
                .frame(width: 58, height: 58)
                .richyGlass(in: Circle(), tint: RichyColor.accent, interactive: true)
                .richyGlassID("quick-add-toggle", in: glass)
        }
        .buttonStyle(RichyGlassButtonStyle())
        .accessibilityLabel(isOpen ? "Close" : "Add a transaction")
    }

    private func action(title: String, symbol: String, tint: Color, type: TransactionType) -> some View {
        Button {
            close()
            onPick(type)
        } label: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: symbol)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(tint)
                Text(title)
                    .font(RichyFont.ui(RichyFont.Size.body, weight: .semibold))
                    .foregroundStyle(RichyColor.ink)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, 13)
            .richyGlass(interactive: true)
            .richyGlassID("quick-add-\(type.rawValue)", in: glass)
        }
        .buttonStyle(RichyGlassButtonStyle())
        // On iOS 26 the glass morph is the animation; adding a transition on
        // top of it fights the shape. Older systems have no morph, so they
        // get a spring out of the corner instead.
        .transition(RichyGlass.isActive
                    ? AnyTransition.identity
                    : AnyTransition.scale(scale: 0.7, anchor: .bottomTrailing).combined(with: .opacity))
    }

    private func close() {
        withAnimation(openAnimation) { isOpen = false }
    }
}

#Preview("Quick add") {
    ZStack {
        RichyColor.background.ignoresSafeArea()
        ScrollView {
            VStack(spacing: Spacing.md) {
                ForEach(0..<10, id: \.self) { index in
                    RichyCard {
                        Text("Something behind the glass \(index)")
                            .font(RichyFont.ui(RichyFont.Size.body))
                            .foregroundStyle(RichyColor.ink)
                    }
                }
            }
            .padding(Spacing.screen)
        }
    }
    .overlay { QuickAddCluster { _ in } }
}
