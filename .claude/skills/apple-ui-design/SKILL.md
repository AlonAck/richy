---
name: apple-ui-design
description: Apply Apple's Human Interface Guidelines and Liquid Glass material language to Richy — typography, spacing, motion, native-feeling components, and the real glass system (LiquidButton on web, RichyGlass/LiquidPress on native) — fused with Richy's own identity: cornflower blue as the flagship accent, warm cream grounds, Hebrew-first RTL. Use whenever touching UI code, redesigning a screen, adding a component, or reviewing a screen for visual consistency, on either budget-app.jsx (web) or RichyIOS (native SwiftUI). For a brand-agnostic, pure-Apple version of this same material system (no Richy colors/fonts), use the separate final-apple-designer skill instead — this one is the fusion, that one is the source it's fused from. This is a design-system pass on both the existing web app and the native iOS build, not a decision about whether to build native — see NATIVE_BUILD.md / ROADMAP.md for that.
status: published
---

# Apple-style UI for Richy

Goal: Richy should *feel* like a native iPhone app — consistent, calm,
confident — on both the web app and the native iOS build, through one
design system applied everywhere, not per-screen improvisation. This
directly targets the finding in `reports/qa-sweep-2026-08-25.md` §5 ("why
it looks cheap — there's no design system in use").

## Richy keeps its own identity — this is not "make it look like Apple.com"

Apple's own palette (system blue, pure white/black) does **not** replace
Richy's brand. What we're borrowing from Apple is the *structure and
discipline* — type scale, spacing rhythm, motion, native component
patterns, and now the actual Liquid Glass material — applied using Richy's
own colors and voice. If a change would turn Richy into a generic Apple
clone with no identity of its own, that's a bug in the change, not a
feature. For the brand-agnostic version of this same material system with
none of Richy folded in, see the `final-apple-designer` skill.

**Flagship accent, as of 10 Sep 2026: Cornflower Ocean (blue), replacing
Dark Ember (leather-orange).** Grounds stay the same warm cream/near-black
— only the accent changed:

- Light: hero `#5C7AE3` (cornflower periwinkle) → `#3C4C82` (deep navy,
  the on-cream accent for buttons/marks/links, ~8:1 contrast on cream).
- Dark: accent `#7E9BF2`, hi `#A8BEF8`.
- Web: theme key `"blue"` in the theme table (`budget-app.jsx`). Native:
  `RichyTheme.blue`, label "Cornflower Ocean" (`RichyIOS/DesignSystem/RichyTheme.swift`).
- `Dark Ember` (orange, `#C8673A`/`#E88A5C`) and `Mika's Violet` (purple,
  `#8970C6`/`#B79BFF` — currently `RichyTheme.standard` on native) remain
  as selectable non-default themes, not deleted.

**Open item, not silently fixed here**: native's `RichyTheme.standard` is
still `.purple`, not `.blue` — if cornflower blue is the flagship, that
default should probably move too. Flagging rather than changing it as a
side effect of a design-system doc.

## Typography

```
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
```

Richy's actual measured scale (`RichyIOS/DesignSystem/RichyFont.swift` —
ported from the web's real usage, not generic Apple HIG numbers):

```
--text-hero:     700 34px;   /* rare — a big number, a milestone */
--text-title:    600 22px;   /* screen/section titles */
--text-headline: 600 17px;   /* list row titles, emphasized body-weight */
--text-body:     400 15px;   /* default reading size */
--text-subhead:  400 13.5px; /* secondary line under a headline */
--text-footnote: 400 12.5px; /* fine print */
--text-caption:  400 11px;   /* smallest legible label */
```

Two type roles, same on both platforms: an editorial serif (New York via
`.design(.serif)` natively; the web's `DISP`/`RICHARD_DISP` vars) for
titles, marks, and Richard's verdicts — and the system sans (`UI` on web,
`RichyFont.ui` natively) for everything else. Numbers especially: tabular
figures (`fontVariantNumeric: "tabular-nums"` / `.monospacedDigit()`) so
amounts don't jiggle as digits change.

## Color & elevation

Canonical tokens (`RichyIOS/DesignSystem/RichyColor.swift` — ported
"exact tokens" from the web app, so these are the cross-platform source
of truth):

```
background:  #F7F3EE (light) / #131110 (dark)
card:        #FFFFFF (light) / #1C1915 (dark)
cardRaised:  #FFFFFF (light) / #252018 (dark)   -- sheets/modals, floats above card
ink:         #1A1410 (light) / #EDE8E2 (dark)
ink2:        #6B5C4E (light) / #A09080 (dark)
ink3:        #7A6B5C (light) / #978877 (dark)
separator:   rgba(0,0,0,0.06) (light) / rgba(255,255,255,0.07) (dark)
```

Apple's *elevation* pattern, applied on top of these tokens rather than
Apple's own colors:

```css
.card {
  background: var(--surface-1); /* T.card or RichyColor.card */
  backdrop-filter: blur(20px);
  border-radius: 18px;
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}
```

Rule 1 of this color system, unchanged: **no value without a dark pair.**
Status marks (green/red/gold/blue) get brighter and more saturated on
dark; large tinted areas get deeper, never a flat invert.

## Materials & Liquid Glass — Richy's real implementation

Richy already has a working Liquid Glass system, independently built on
both platforms to the **same physical spec**. This is the canonical
reference for any new glass control — don't re-derive the physics, reuse
these.

### Web — `LiquidButton` (`budget-app.jsx`, `=== LIQUID GLASS BUTTON ===`, ~line 4880)

- **Palette function** (`lqPalette`): four variants — `neutral` (lilac
  glass tint, `LQ_GLASS_LIGHT`/`LQ_GLASS_DARK`), `soft` (the accent hue
  washed over the same lilac glass), filled (pure hue as translucent glass
  under white ink — "the way Apple's tinted glass keeps its color vivid
  rather than shading it toward black"), and `ghost` (no glass at all).
- **The rim recipe** (`lqRim`): halo in the glass's own hue, an inset white
  lining, a bright top edge (the specular cue), a thickness shadow below
  it, a bloom under the top edge, and corner ambient occlusion — nine
  layered shadows, not one border. This is the generalized recipe now also
  documented in `final-apple-designer`'s `reference/web-implementation.md`.
- **"Too dark for glass" rule**: when the accent's luminance is below
  ~0.32, the glass borrows the theme's brighter hue (`orangeHi`/its
  cornflower) instead of lightening arbitrarily — cornflower blue's own
  navy accent (`#3C4C82`) is the actual case this rule exists for; the
  glass renders in `#5C7AE3` instead so it still reads as light material.
- **Gesture physics** (`LQ_HOLD_MS` 340ms, `LQ_FREE` 24px, rubber-band
  beyond that): press squishes, a 340ms hold lifts the capsule with a
  medium haptic, dragging follows 1:1 then rubber-bands, release inside
  commits, outside cancels, always springs back.
- **Accessibility**: `prefers-reduced-transparency` drops to a solid card;
  `prefers-reduced-motion` removes hover/press transforms.

### Native — `RichyGlass.swift` + `LiquidPress.swift` (`RichyIOS/DesignSystem/`)

- **Three renderers behind one modifier** (`.richyGlass(...)`): real
  `.glassEffect()` on iOS 26, a `Material`-based approximation (blur +
  hairline + shadow) on iOS 17–18, and a fully opaque card when Reduce
  Transparency is on. Call sites never branch — this is the exact
  compiler-gate + availability-gate pattern documented in
  `final-apple-designer`'s `reference/swiftui-implementation.md`, and it
  exists here specifically because CI still builds with Xcode 16.4.
- **`RichyGlassContainer`**: the `GlassEffectContainer` wrapper, no-op
  below iOS 26. Same rule as the web: glass cannot sample glass, group
  nearby glass shapes so they share one pass.
- **`LiquidPress`**: matches the web `LiquidButton` spec exactly — 0.34s
  hold, 6pt free travel then eased rubber-band to a 20pt ceiling, the
  capsule stretches along the drag direction like a pulled drop rather
  than just translating, medium haptic on lift, commit-on-release. Spring
  constants: `.interactiveSpring(response: 0.26, dampingFraction: 0.72)`
  while lifted, `.spring(response: 0.52, dampingFraction: 0.72)` on
  settle. Reduce Motion drops the lift/follow/stretch but keeps the haptic
  and the commit.
- **Where glass goes**: navigation layer only — floating buttons, the
  composer, toolbars, tab bar. Never the balance card, a ledger row, or a
  chat bubble (explicit in the file's own doc comment).

**When adding a new glass control on either platform**: match the existing
constants above rather than inventing new hold-times or spring values —
the two platforms were deliberately tuned to feel identical in the hand.

## Spacing — platforms currently disagree, flagging rather than silently unifying

Web (`budget-app.jsx`):
```
xs:4  sm:8  md:16  lg:24  xl:32  2xl:48
```
Native (`RichyIOS/DesignSystem/Spacing.swift`):
```
xs:4  sm:8  md:12  lg:16  xl:20  xxl:24  screen:18
```
`md`/`lg`/`xl` don't match between platforms (web's `md`=16 is native's
`lg`; web's `lg`=24 is native's `xxl`). "One scale, used everywhere" is the
stated goal of this skill — right now there are two scales that happen to
share names. Don't invent a third value to split the difference; use the
correct platform's existing scale for whichever surface you're touching,
and treat reconciling them as a real decision for Alon, not something to
resolve unilaterally inside an unrelated change.

## Native iOS patterns to match

- **Tab bar**: fixed, glass, active tab gets accent color — not a full
  pill/background swap. `richyTabBarMinimize()` lets it shrink on scroll
  (iOS 26 only; older systems keep the fixed bar).
- **Navigation bar**: large title collapses to small centered/left title
  on scroll; back action is a chevron + label.
- **Sheets/modals**: slide up from the bottom, rounded top corners, a drag
  handle, dismiss via swipe-down — not a centered dialog with a dimmed
  backdrop.
- **Lists**: swipe-left reveals actions instead of always-visible icon
  buttons; row press gives a subtle highlight, not a hard color change.
- **Segmented controls**: for 2–4 mutually exclusive views (period
  toggles) instead of separate buttons or a dropdown.
- **Safe areas**: respect notch/home-indicator insets
  (`env(safe-area-inset-*)` on web; Capacitor's `contentInset: automatic`
  handles most of it, but custom fixed-position bars must add the inset
  manually).
- **Dynamic Type**: text should scale with the user's iOS text-size
  setting where feasible; never hardcode a fixed px that ignores it.

## Motion

iOS motion reads as "physical" — things settle into place with a slight
overshoot, not a linear or ease-in-out slide.

```css
/* Has overshoot — sheet open, card appear */
transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
/* No overshoot — fades, subtle state changes */
transition: all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
```

Native's actual spring constants for anything glass/liquid-press related
are the `LiquidPress` values above (`response: 0.26/0.52`,
`dampingFraction: 0.72`) — use those, not a re-derived approximation, for
any new native glass interaction.

Pair motion with the haptics already wired in the app (`budget-app.jsx`
NATIVE BRIDGE block on web; `.sensoryFeedback()` on native) — a sheet
opening, a save succeeding, or a destructive action should trigger both
together, not animation alone. That combination is a big part of what
makes an interaction "feel native" versus "feel like a website."

## Reference library

Alon is collecting short screen recordings of well-made native apps as
ground truth for "what native actually looks and moves like" — see
`reference/`. Each clip gets a dated entry in `reference/notes.md`
describing what it shows in plain language, so you don't have to
re-extract frames to know what's in there. Check that file before
designing a new interaction (a sheet, a transition, a gesture) — there may
already be a real reference for it.

Current references:
- `claude-ios-nav-and-modelsheet-2026-08-27.mov` — iOS push navigation
  (screen slides + underlying screen parallax + seam shadow) and a bottom
  sheet presentation (background dims + scales down while the sheet rises
  with rounded corners + drag handle).
- `apple-watch-app-tabs-and-modals-2026-08-27.mp4` — tab bar + large-title-
  collapses-on-scroll, a consistent card-grid layout, and the three modal
  styles Richy should choose between deliberately: small bottom sheet
  (quick choice), full-screen modal with Cancel (a multi-step flow), and a
  slide-in card (external links).

Full writeup of both in `reference/notes.md`.

## Decided component patterns

Concrete decisions Alon has approved in conversation, so the real build
doesn't have to re-derive them. Add to this list as more get decided -
this is meant to grow into the actual source of truth, not the reference
videos or a chat log.

### Merged action bar (Categories / Profile header shortcuts) - SHIPPED 2026-08-27

Two independent, always-tappable shortcuts in the main app header (sticky
top bar, not a bottom tab bar) - a categories/tag icon and a person icon.
Previously two separate 36px circular buttons in mismatched fills
(`T.orangeDim` vs `T.fill2`), no shared styling, no animation. Real location:
`budget-app.jsx`, `HeaderShortcutBar` component (defined right after
`GlassBackBar`, ~line 30116) and its call site in the App shell's sticky
header (~line 31564).

**Correction to an earlier version of this entry**: it previously described
this as shipped, pointing at `reference/button-bar-mockup.html`'s raw
drag-tracking implementation and one-off color tokens
(`rgba(216,203,184,0.55)` bar fill, `#C8673A` accent). That was never
actually wired into the real app - the file/line was never located. The
mockup was a useful structural reference (one capsule, icon above label, a
sliding inner element) but the real build below diverged from it in two
ways, both deliberate:

1. **Reuses `GlassTabBar`'s already-shipped glass-lens mechanic instead of
   the mockup's standalone drag code.** `GlassTabBar` (same file, just above
   `HeaderShortcutBar`) already implements "measure the active item via refs,
   glide a translucent lens under it with a spring settle" for the bottom
   tab bar - it's the real, working version of the exact pattern the mockup
   was exploring. Rebuilding a second, separate drag-tracking implementation
   for a 2-item header control would fork the motion code and the color
   tokens for no benefit. `HeaderShortcutBar` follows the same shape: refs +
   `getBoundingClientRect` + `useEffect` to place the lens, `var(--m-settle)
   var(--m-spring)` to glide it. One difference from `GlassTabBar`: these two
   buttons are independent shortcuts, not a mutually-exclusive tab set, so
   the lens is simply hidden (not parked on item 0) whenever neither is the
   current tab - true most of the time, since the header shows on every
   screen.
2. **Uses the app's real adaptive color tokens, not the mockup's one-off
   rgba values.** The mockup's colors had no dark-mode counterpart. The real
   build uses `T.navPillGlass` / `T.navPillRim` / `T.navPillShade` for the
   lens (same tokens `GlassTabBar` uses - already adaptive) and `T.fill1` for
   the capsule's resting shell (the app's existing inset/systemFill-style
   wash, also already adaptive). No new colors were introduced.

**Labels: asked, answered, then reversed - current state is ICON-ONLY.**
The mockup was icon-above-label, which suits a bottom tab bar's vertical
room but not a compact sticky top header. Asked Alon; he first chose full
icon+label and the header's side slots were widened `122 -> 168` to fit.
He then reversed it the same session: **remove the words, icons only, and
make the icons black.** Slots went back to `width: 122` (the bar is 102px
icon-only, so 168 was just stealing ~92px from the centre title). Icons are
`size={19}` at `T.ink`, not `T.ink2` - "black" as asked, but via the
adaptive token, so it resolves near-white (`#EDE8E2`) on dark rather than
literally black on a dark ground (rule 1 of the colour system: no value
without a dark pair). **The active/dragged-over item still tints to
`T.orange`** - "make them black" was read as the resting state, since an
all-black bar would delete the only colour cue for which screen you're on.
Flagged to Alon; revisit if he wants the accent gone too — and with the
flagship now blue rather than orange, this tint should resolve to the new
accent token (`T.orange` still refers to the *active theme's* accent
variable, which is now cornflower's `#3C4C82`/`#7E9BF2`, not literally
orange). Labels survive as `aria-label` + `title`, so the control is still
named for screen readers and i18n (`tr("categories")` / `tr("profile")`)
despite showing no text.

**Two interactions the bottom tab bar does NOT have** (added at Alon's
request; this is now the richest control in the app, deliberately):

1. **Drag to choose.** Press anywhere on the bar and slide: the lens
   follows the finger, the item under it lights to the accent, and
   releasing commits that item. Releasing more than ~28px outside the bar
   **cancels** without navigating - the standard iOS control behaviour.
   Handlers live on the bar (not per button) with `setPointerCapture`, so
   the gesture survives leaving a button's box. `touchAction: "none"` stops
   the page claiming the drag as a scroll.
2. **Long press to stretch.** Hold ~340ms and the whole bar does a
   squash-and-stretch (`scale(1.055, 0.945)`) with a MEDIUM haptic; the
   held icon grows to `scale(1.12)`. Dragging past either end rubber-bands
   further, damped by a fractional power (`|over|^0.68`, capped at 26px) so
   it eases toward a limit instead of running away, and the bar widens as
   it flattens the way something elastic actually does. Transition is a
   fast `0.16s` curve while the finger drives it and the full
   `--m-settle/--m-spring` on release, so it tracks live but snaps back.

**Performance - the first cut was laggy, and why.** Alon reported lag on the
first working version. Cause: the stretch was driven through React state on
every `pointermove`, so the bar re-rendered 60-120x/second, and hit-testing
re-measured every button per move - forcing layout on an element that is
simultaneously transformed *and* backdrop-filtered, which is close to a
worst case for the compositor. The fix, and the rule for any future gesture
control in this app: **keep continuous gesture values off React's render
path.**
- Measure rects **once per gesture** at `pointerdown`, not per move.
- Coalesce moves into **one `requestAnimationFrame`**.
- Write the transform **straight to `node.style`**, never via `setState`.
- Keep React state only for what changes rarely (which item is lit, whether
  the long press engaged) - a whole drag is now ~1-2 renders, not hundreds.
- Consequence to remember: `transform`/`transition` must then be **absent
  from the JSX style object**, or each render overwrites the live value.
- Reset to identity *before* measuring at `pointerdown`, so a fast re-press
  during spring-back doesn't cache mid-stretch rects and skew every hit-test.
- `willChange: transform` is set on press and released ~600ms after settle;
  leaving it on permanently pins a compositor layer for a control that is
  idle almost all the time.
Measured after the fix: **0.04ms per pointermove** (600 synthetic moves in
23.7ms), versus a frame budget of 16.7ms.

Two correctness details worth not re-deriving:
- The lens measures itself in the bar's **layout** space while the bar may
  be mid-stretch, and `getBoundingClientRect` reports **scaled** pixels.
  The placement effect divides the scale back out
  (`row.offsetWidth / rect.width`); without it the lens compounds the
  stretch and drifts off its button exactly when the effect is most visible.
- `onClick` is kept for keyboard/assistive activation but guarded by
  `committedRef`, because pointerup already fired the action - otherwise a
  tap navigates twice.

**Second iteration pass, same session** - four more changes, in order:
1. **Drag to choose + long-press stretch** (above) shipped first.
2. **Icons only, black, no labels.** Alon reversed the icon+label decision -
   see the labels paragraph above for the full reasoning and the reopened
   question (does "black" mean the active state loses its orange too?).
3. **Bar background: thick cream**, not the thin white glass the bottom tab
   bar wears (`T.creamBar`/`creamBarLens`/`creamBarEdge`, adaptive per rule
   1). Three rounds to land here: `0.88` opacity read as muddy/too dark,
   dialed to `0.60` (composited ~`#E4DBCD`); then Alon asked for **solid**
   (no translucency) and **lighter still** - now a flat opaque `#EFE7D9`
   (light) / `#483D31` (dark), no alpha channel at all. Once solid, the
   bar's own `backdrop-filter` was dropped too - blurring behind a fully
   opaque fill blurs nothing, it was pure compositor cost left over from the
   glass phase. (The lens already had no blur, same reasoning, from the
   first cream pass.) Edge bumped `0.15 -> 0.20` alpha to stay visible
   against the lighter fill.
4. **Motion slowed, width trimmed "a little".** Both explicitly local to this
   component (`BAR_SPRING`/`PRESS_EASE`/`SETTLE_EASE`/`DRAG_EASE` inside
   `HeaderShortcutBar`), NOT a change to the shared `var(--m-settle)` token -
   that duration is used all over the app (`GlassTabBar` included), so
   changing it here would have slowed every other spring in Richy as a side
   effect. Live drag-tracking `0.16s -> 0.26s`; press-scale and settle-back
   `var(--m-settle)` (~0.52s) -> a local fixed `0.68s` on the same spring
   curve. Button horizontal padding `16px -> 13px` (each button ~47px ->
   41px, bar ~102px -> 90px); height and border-radius:999 curve untouched.

**Accessibility trade-off, not silently accepted**: button height is now
29px (icon 15 + 7px vertical padding x2), under the 44px minimum in the
checklist below. This was Alon's explicit request (reduce size/height,
keep width/curve) so it shipped, but it's flagged here rather than quietly
passing the checklist - worth a second look before this ships to users, or
at least a deliberate "we're fine with 29px here" call.

**Verification note**: verified via a permanent dev-harness view,
`.claude/dev.html?view=headerbar` (`?current=categories|profile`,
`?lang=he`, `?dark=1`) - not the real signed-in app, since the harness
cannot authenticate. It replicates the sticky header markup and mounts the
real `HeaderShortcutBar`. Driven with synthetic `PointerEvent`s, confirmed:
lens appears on press even when neither tab is current; long-press stretch
fires at 340ms; dragging re-lights the correct item and slides the lens;
overshoot rubber-bands (`translateX(7.37px) scale(1.107, 0.926)`) and
springs back to identity on release; releasing away **cancels**; a plain tap
fires the handler **exactly once**; a bare `.click()` (keyboard path) still
navigates. Under RTL the lens lands on the dragged button to the pixel
(175 vs 175) - hit-testing is rect-based, so there is no mirrored code path
to keep in sync. Dark tokens apply; buttons measure 47x45, clearing the
44px minimum. **Still unverified: how any of this feels on a real iPhone** -
in particular whether the stretch transform interacts badly with the
`backdrop-filter` on the same element (a known WebKit trouble spot), and
whether a pinned, blurred, animated header janks while scrolling on older
hardware. Alon should check both on device.

Rejected earlier attempts (from the mockup phase, before real integration),
so they aren't re-proposed:
1. Separate circular buttons in mismatched fills, no motion - the original
   problem.
2. A bright glass "shine" radial highlight tracking the pointer - too
   showy, not what the references do.
3. A dark radial press-shadow tracking the pointer - "too much shadow,"
   and any per-button `:active` darken/scale visually re-splits the bar
   into halves, defeating "one component."
4. A second, standalone drag-tracking implementation copied from the mockup
   - rejected in favor of reusing `GlassTabBar`'s already-shipped mechanic
   (see above), so the app has one glass-lens implementation, not two.

## Checklist before calling a screen done

- [ ] Touch targets ≥ 44×44px
- [ ] Text contrast ≥ 4.5:1 (check against `T.ink3` — 661 failures were
      flagged app-wide as of the 25 Aug QA sweep; don't add more)
- [ ] Spacing uses only the correct platform's scale above, no one-off
      pixel values (see the web/native mismatch flagged above)
- [ ] Dark mode variant looks intentional, not just inverted
- [ ] Motion uses the spring curves above, not a plain linear/ease transition
- [ ] Any new glass control reuses `LiquidButton`/`lqPalette` (web) or
      `.richyGlass()`/`LiquidPress` (native) rather than a new one-off
      implementation
- [ ] Any glass cluster shares a container (`GlassTabBar`-style lens
      grouping on web, `RichyGlassContainer` on native) — no lone glass
      shapes sampling independently
- [ ] Glass has a verified Reduce Transparency fallback and Reduce Motion
      path, not just the default render
- [ ] Any modal/overlay is a bottom sheet, not a centered dialog
- [ ] Safe-area insets respected on any custom fixed-position element
- [ ] RTL-safe: use logical CSS properties (`margin-inline-start`, not
      `margin-left`) — Richy is Hebrew-first; a design change that only
      works left-to-right reopens the RTL gap already flagged in ROADMAP.md
- [ ] Richy's own identity is still visible — cornflower blue as the accent,
      warm cream/near-black grounds — this should look like Richy wearing
      Apple's tailoring, not Apple's clone
