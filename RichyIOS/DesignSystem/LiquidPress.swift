import SwiftUI

/// The press behaviour every Richy button shares, matching the web app's
/// `LiquidButton` (budget-app.jsx, `=== LIQUID GLASS BUTTON ===`) so the two
/// feel the same in the hand. Alon's spec, 9-10 Sep 2026:
///
///   - **A tap commits on release, never on press.** SwiftUI's `Button`
///     already fires on touch-up inside and cancels a release outside its
///     bounds, so this modifier adds nothing there - it only makes sure
///     nothing below ever fires early.
///   - **Hold and the capsule lifts.** After ~0.34 s the button scales to
///     1.06 with a medium haptic. It then stays where it is: the drag moves
///     it one-to-one for 6 pt and eases onto a hard ceiling of 20 pt, and
///     what the pull really does is stretch it - the capsule elongates along
///     the drag and thins across it, like a drop of liquid being pulled.
///     Release inside commits (the Button's own action), release outside
///     cancels, and either way it springs home.
///   - A finger that travels more than 10 pt before the hold completes is
///     scrolling: the long press fails and the scroll view keeps the gesture.
///
/// One difference from the web: there the label is counter-scaled so only the
/// glass stretches. Here the modifier wraps a finished view, label included,
/// so the whole capsule stretches together.
///
/// The follow offset lives in `@GestureState`, so it resets by itself when
/// the system cancels the gesture (an incoming call, a scroll that wins);
/// nothing here can get stuck lifted. Reduce Motion drops the lift, the
/// follow and the stretch, and keeps the haptic and the commit-on-release.
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

        /// The raw finger travel, before the follow curve or the stretch.
        var drag: CGSize {
            if case .lifted(let translation) = self { return translation }
            return .zero
        }
    }

    /// Same numbers as the web primitive (LQ_HOLD_MS, LQ_FREE, LQ_PULL,
    /// LQ_STRETCH, LQ_STRETCH_AT, LQ_SCROLL).
    private static let holdSeconds: Double = 0.34
    private static let freeTravel: CGFloat = 6
    private static let maxPull: CGFloat = 14
    private static let stretch: CGFloat = 0.03
    private static let stretchAt: CGFloat = 80
    private static let scrollSlop: CGFloat = 10
    private static let liftScale: CGFloat = 1.06
    private static let pressScale: CGFloat = 0.97

    /// 1:1 for `freeTravel`, then easing onto a ceiling of
    /// `freeTravel + maxPull` however far the finger goes.
    private static func follow(_ value: CGFloat) -> CGFloat {
        let sign: CGFloat = value < 0 ? -1 : 1
        var distance = abs(value)
        if distance > freeTravel {
            distance = freeTravel + maxPull * (1 - exp(-(distance - freeTravel) / (maxPull * 2)))
        }
        return sign * distance
    }

    /// The pull that stays put: how far along the drag the capsule elongates,
    /// and by how much. Zero when the finger has not moved.
    private static func pull(_ drag: CGSize) -> (angle: Angle, along: CGFloat, across: CGFloat) {
        let distance = sqrt(drag.width * drag.width + drag.height * drag.height)
        guard distance > 0.5 else { return (.zero, 1, 1) }
        let amount = stretch * (1 - exp(-distance / stretchAt))
        return (.radians(atan2(drag.height, drag.width)), 1 + amount, 1 - amount * 0.55)
    }

    func body(content: Content) -> some View {
        let lifted = lift.isLifted && !reduceMotion
        let drag = lift.drag
        let pull = Self.pull(drag)
        let offset = lifted ? CGSize(width: Self.follow(drag.width), height: Self.follow(drag.height)) : .zero
        let gesture = LongPressGesture(minimumDuration: Self.holdSeconds, maximumDistance: Self.scrollSlop)
            .sequenced(before: DragGesture(minimumDistance: 0, coordinateSpace: .local))
            .updating($lift) { value, state, _ in
                switch value {
                case .second(true, let drag):
                    state = .lifted(drag?.translation ?? .zero)
                default:
                    state = .idle
                }
            }

        return content
            // R(angle) . scale . R(-angle): the stretch runs along the drag,
            // whichever way the finger went.
            .rotationEffect(lifted ? -pull.angle : .zero)
            .scaleEffect(x: lifted ? pull.along : 1, y: lifted ? pull.across : 1)
            .rotationEffect(lifted ? pull.angle : .zero)
            .scaleEffect(lifted ? Self.liftScale : (isPressed && !reduceMotion ? Self.pressScale : 1))
            .offset(offset)
            .shadow(color: Color.black.opacity(lifted ? 0.18 : 0), radius: lifted ? 18 : 0, y: lifted ? 12 : 0)
            .zIndex(lifted ? 5 : 0)
            .animation(lifted ? .interactiveSpring(response: 0.26, dampingFraction: 0.82)
                              : .spring(response: 0.52, dampingFraction: 0.82), value: lift)
            .animation(.easeOut(duration: 0.12), value: isPressed)
            .simultaneousGesture(gesture, including: isEnabled ? .all : .none)
            .sensoryFeedback(.impact(weight: .medium), trigger: lift.isLifted) { wasLifted, isLifted in
                isLifted && !wasLifted
            }
    }
}

extension View {
    /// Richy's shared press feel: squish on press, lift-and-stretch on a hold,
    /// commit on release. Apply inside a `ButtonStyle` with the style's
    /// `configuration.isPressed`.
    func liquidPress(isPressed: Bool) -> some View {
        modifier(LiquidPressModifier(isPressed: isPressed))
    }
}
