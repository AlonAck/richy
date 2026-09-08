---
name: apple-ui-design
description: Apply Apple's iOS interface design language (Human Interface Guidelines) to Richy's screens — typography, spacing, motion, and native-feeling components like tab bars, sheets, and swipe actions — while keeping Richy's own cream/leather-orange brand identity. Use whenever touching UI code, redesigning a screen, adding a component, or reviewing a screen for visual consistency. This is a design-system pass on the existing web app (budget-app.jsx), not a SwiftUI rewrite — see NATIVE_BUILD.md / ROADMAP.md for that separate, larger decision.
status: published
---

# Apple-style UI for Richy

Goal: Richy should *feel* like a native iPhone app — consistent, calm,
confident — without rewriting it in SwiftUI. Achieved through one design
system applied everywhere, not per-screen improvisation. This directly
targets the finding in `reports/qa-sweep-2026-08-25.md` §5 ("why it looks
cheap — there's no design system in use").

## Richy keeps its own identity — this is not "make it look like Apple.com"

Apple's own palette (blue accent, pure white/black) does **not** replace
Richy's brand: warm cream backgrounds, leather-orange accent, a restrained
data-dense feel (see `/areas/richy.md` project memory or ask if unclear).
What we're borrowing from Apple is the *structure and discipline* —
type scale, spacing rhythm, motion, native component patterns — applied
using Richy's own colors. If a change would turn Richy cream-and-orange
into Apple blue-and-white, that's a bug in the change, not a feature.

## Core principles (from Apple's HIG)

- **Clarity** — content is the point; chrome and decoration recede.
- **Deference** — UI serves the user's data, never competes with it for
  attention (this matters extra for a finance app — the number is the star).
- **Depth** — layering (elevation, blur, subtle shadow) communicates
  hierarchy instead of borders and dividers everywhere.

## Typography

```
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;

--text-hero:    600 34px/1.15;   /* rare — a big number, a milestone */
--text-title:   600 22px/1.25;   /* screen/section titles */
--text-body:    400 17px/1.45;   /* default reading size — do not go below */
--text-caption: 400 13px/1.35;   /* secondary/meta info */
```

Richy already ships serif display type in places (per recent commits) —
keep serif for editorial/greeting moments if that's the established brand
voice, but body text, numbers, and anything data-dense should be the system
sans above. Numbers especially: tabular/monospaced figures so amounts don't
jiggle as digits change.

## Color & elevation

Keep Richy's existing tokens (cream background, leather-orange accent,
dark-mode palette). Apply Apple's *elevation* pattern on top of those colors
instead of introducing Apple's colors:

```
--surface-0: <richy cream/bg>              /* base */
--surface-1: <bg, +blur+shadow>            /* cards */
--surface-2: <bg, +stronger blur+shadow>   /* sheets/modals, floats above surface-1 */
--text-primary / --text-secondary: keep existing, verify 4.5:1 contrast (qa-sweep flagged 661 contrast failures — check `T.ink3`)
```

```css
.card {
  background: var(--surface-1);
  backdrop-filter: blur(20px);
  border-radius: 18px;
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}
```

## Spacing (one scale, used everywhere — this is what "consistent" means in practice)

```
--space-xs: 4px;  --space-sm: 8px;  --space-md: 16px;
--space-lg: 24px; --space-xl: 32px; --space-2xl: 48px;
```

No one-off pixel values in new or touched components. If a spacing need
doesn't fit the scale, that's a signal to reconsider the layout, not to add
a new constant.

## Native iOS patterns to match (this is the part a generic "Apple look" skill misses)

- **Tab bar** (bottom nav): fixed, blurred translucent background, active
  tab gets accent color + optional label weight change — not a full pill/
  background swap. Icons should read as a set (same stroke weight/style).
- **Navigation bar**: large title collapses to a small centered/left title
  on scroll; back action is a chevron + label, not just an icon.
- **Sheets / modals**: slide up from the bottom, rounded top corners,
  a drag handle, dismiss via swipe-down — not a centered dialog box with a
  dimmed backdrop (that's a web/Android pattern, reads as non-native).
- **Lists**: swipe-left reveals actions (delete/edit) instead of always-
  visible icon buttons; row press gives a subtle highlight, not a hard
  color change.
- **Segmented controls**: for 2-4 mutually exclusive views (e.g. period
  toggles) instead of a row of separate buttons or a dropdown.
- **Safe areas**: respect the notch/home-indicator insets
  (`env(safe-area-inset-*)`) — Capacitor's `contentInset: automatic` handles
  most of this, but custom fixed-position bars must add the inset manually.
- **Dynamic Type**: text should scale with the user's iOS text-size setting
  where feasible; never hardcode a fixed px that ignores it for body copy.

## Motion

iOS motion reads as "physical" — things settle into place with a slight
overshoot, not a linear or ease-in-out slide.

```css
/* Standard iOS-feeling spring approximation */
transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); /* has overshoot — use for: sheet open, card appear */
transition: all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);  /* no overshoot — use for: fades, subtle state changes */
```

Pair motion with the haptics already wired in the app (`budget-app.jsx`
NATIVE BRIDGE block) — a sheet opening, a save succeeding, or a destructive
action should trigger both together, not animation alone. That combination
is a big part of what makes an interaction "feel native" versus "feel like
a website" — it's not purely visual.

## Reference library

Alon is collecting short screen recordings of well-made native apps as ground
truth for "what native actually looks and moves like" — see `reference/`.
Each clip gets a dated entry in `reference/notes.md` describing what it shows
in plain language, so you don't have to re-extract frames to know what's in
there. Check that file before designing a new interaction (a sheet, a
transition, a gesture) — there may already be a real reference for it.

Current references:
- `Codex-ios-nav-and-modelsheet-2026-08-27.mov` — iOS push navigation
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
Flagged to Alon; revisit if he wants the accent gone too. Labels survive as
`aria-label` + `title`, so the control is still named for screen readers
and i18n (`tr("categories")` / `tr("profile")`) despite showing no text.

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
`.Codex/dev.html?view=headerbar` (`?current=categories|profile`,
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
- [ ] Spacing uses only the scale above, no one-off pixel values
- [ ] Dark mode variant looks intentional, not just inverted
- [ ] Motion uses the spring curves above, not a plain linear/ease transition
- [ ] Any modal/overlay is a bottom sheet, not a centered dialog
- [ ] Safe-area insets respected on any custom fixed-position element
- [ ] RTL-safe: use logical CSS properties (`margin-inline-start`, not
      `margin-left`) — Richy is Hebrew-first; a design change that only
      works left-to-right reopens the RTL gap already flagged in ROADMAP.md
- [ ] Richy's own cream/leather-orange identity is still visible — this
      should look like Richy wearing Apple's tailoring, not Apple's clone
