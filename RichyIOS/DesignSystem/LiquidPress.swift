import SwiftUI

/// The press behaviour every Richy button shares, matching the web app's
/// `LiquidButton` (budget-app.jsx, `=== LIQUID GLASS BUTTON ===`) so the two
/// feel the same in the hand. Alon's spec, 9 Sep 2026:
///
///   - **A tap commits on release, never on press.** SwiftUI's `Button`
///     already fires on touch-up inside and cancels a release outside its
///     bounds, so this modifier adds nothing there - it only makes sure
///     nothing below ever fires early.
///   - **Hold and the capsule lifts.** After ~0.34 s the button scales to
///     1.06 with a medium haptic, then follows the finger: one-to-one for the
///     first 24 pt, rubber-banding beyond so it eases toward a limit instead
///     of running away. Release inside commits (the Button's own action),
///     release outside cancels, and either way it springs home.
///   - A finger that travels more than 10 pt before the hold completes is
///     scrolling: the long press fails and the scroll view keeps the gesture.
///
/// The follow offset lives in `@GestureState`, so it resets by itself when
/// the system cancels the gesture (an incoming call, a scroll that wins);
/// nothing here can get stuck lifted. Reduce Motion drops the lift and the
/// follow and keeps the haptic and the commit-on-release.
struct LiquidPressModifier: ViewModifier {
    /// The button style's `configuration.isPressed`: the plain press squish.
    let isPressed: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var isEnabled
    @GestureState private var lift: LiftState = .idle

    enum LiftState: Equatable {
        case idle
        case lifted(CGSize)

        var isLifted: Bool {
            if case .lifted = self { return true }
            return false
        }

        var offset: CGSize {
            if case .lifted(let translation) = self { return translation }
            return .zero
        }
    }

    /// Same numbers as the web primitive (LQ_HOLD_MS, LQ_FREE, LQ_SCROLL).
    private static let holdSeconds: Double = 0.34
    private static let freeTravel: CGFloat = 24
    private static let scrollSlop: CGFloat = 10
    private static let liftScale: CGFloat = 1.06
    private static let pressScale: CGFloat = 0.97

    /// 1:1 for `freeTravel`, then |over|^0.68 capped, the HeaderShortcutBar
    /// rubber-band on the web.
    private static func follow(_ value: CGFloat) -> CGFloat {
        let sign: CGFloat = value < 0 ? -1 : 1
        var distance = abs(value)
        if distance > freeTravel {
            distance = freeTravel + min(pow(distance - freeTravel, 0.68), 36)
        }
        return sign * distance
    }

    func body(content: Content) -> some View {
        let lifted = lift.isLifted && !reduceMotion
        let gesture = LongPressGesture(minimumDuration: Self.holdSeconds, maximumDistance: Self.scrollSlop)
            .sequenced(before: DragGesture(minimumDistance: 0, coordinateSpace: .local))
            .updating($lift) { value, state, _ in
                switch value {
                case .second(true, let drag):
                    let translation = drag?.translation ?? .zero
                    state = .lifted(CGSize(width: Self.follow(translation.width),
                                           height: Self.follow(translation.height)))
                default:
                    state = .idle
                }
            }

        return content
            .scaleEffect(lifted ? Self.liftScale : (isPressed && !reduceMotion ? Self.pressScale : 1))
            .offset(lifted ? lift.offset : .zero)
            .shadow(color: Color.black.opacity(lifted ? 0.18 : 0), radius: lifted ? 18 : 0, y: lifted ? 12 : 0)
            .zIndex(lifted ? 5 : 0)
            .animation(lifted ? .interactiveSpring(response: 0.26, dampingFraction: 0.72)
                              : .spring(response: 0.52, dampingFraction: 0.72), value: lift)
            .animation(.easeOut(duration: 0.12), value: isPressed)
            .simultaneousGesture(gesture, including: isEnabled ? .all : .none)
            .sensoryFeedback(.impact(weight: .medium), trigger: lift.isLifted) { wasLifted, isLifted in
                isLifted && !wasLifted
            }
    }
}

extension View {
    /// Richy's shared press feel: squish on press, lift-and-follow on a hold,
    /// commit on release. Apply inside a `ButtonStyle` with the style's
    /// `configuration.isPressed`.
    func liquidPress(isPressed: Bool) -> some View {
        modifier(LiquidPressModifier(isPressed: isPressed))
    }
}
