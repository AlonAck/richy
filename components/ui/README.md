# components/ui

Canonical shadcn-format source for third-party components, kept verbatim.

**These files do not run in Richy today.** The app is a single no-build
`budget-app.jsx` compiled in the browser by Babel standalone — there is no
TypeScript, no Tailwind, no bundler, and no `@/` path alias, so nothing here is
imported by anything. They are kept as the upstream reference so a future
Vite/Next migration can drop them straight in (`lib/utils.ts` holds the `cn`
helper they expect). The two packages the liquid-glass button imports
(`@radix-ui/react-slot`, `class-variance-authority`) are installed as
devDependencies for that same future; `clsx` / `tailwind-merge` for
`lib/utils.ts` are still not.

The versions that actually ship live in `budget-app.jsx`, ported to the app's
inline-style, ES5-function house style. Change both together, or delete this
folder if the migration never happens.

| File | Upstream | Ships in `budget-app.jsx` as |
| --- | --- | --- |
| `response-stream.tsx` | prompt-kit `ResponseStream` | `ResponseStream` / `useTextStream` |
| `demo.tsx` | prompt-kit fade-mode demo | — |
| `amount-slider.tsx` | 21st.dev `AmountSlider` / `AmountReadout` | `AmountSlider` / `AmountSettingRow` |
| `amount-slider-demo.tsx` | 21st.dev membership-amount demo | — |
| `gradient-shimmer.tsx` | 21st.dev `GradientShimmer` | `GradientShimmer` (+ `gsBandGradient`, `GS_PRESETS`) |
| `gradient-shimmer-demo.tsx` | 21st.dev sweep demo | — |
| `liquid-glass-button.tsx` | 21st.dev `LiquidButton` (+ `Button`, `MetalButton`) | `LiquidButton` (+ `lqPalette`, `LQ_SIZES`, `ensureLiquidCss`) |
| `liquid-glass-button-demo.tsx` | 21st.dev liquid-glass demo | — |

The gradient shimmer's port drops the `as`/`className` props (every call site
wants a span with inline styles), swaps `useMemo` for a per-render rebuild, and
adds a `color-mix()` feature gate — without that gate, a browser missing
`color-mix` invalidates the whole gradient and the transparent text-fill leaves
the text invisible. It powers `ThinkingPhrase`, so every "Richard is thinking"
wait shimmers; pass `shimmer={false}` to opt a call site out. The band defaults
to the live theme accent (`T.orangeHi → T.orange → T.gold`) rather than
`sunrise`, so it re-tints with the theme.

The amount slider is the one port that deliberately diverges from its upstream:
no Radix (pointer/keyboard handling is hand-rolled), the readout reuses the
app's existing `RollingNum` instead of `AmountReadout`, the range is derived
from each screen's quick-pick amounts rather than passed as `min`/`max`, and the
square grid is toned down to roughly half opacity with a slow drift in place of
the original's flicker. See the comments on `AmountSlider` for the details.

The liquid-glass button is the app's button primitive: `BigBtn`, `JrBtn`,
`GlassActionBtn` and every filled `<button>` render through `LiquidButton`.
Only the `LiquidButton` export is ported — `Button` is shadcn's stock button and
`MetalButton` is a different (metallic) look, and neither has a job in Richy.
Divergences from upstream, all deliberate:

- **No SVG displacement filter.** Upstream points `backdrop-filter` at an
  `feTurbulence`/`feDisplacementMap` filter for the wobbly refraction (and
  renders that `<svg>` inside every button, so the id collides). Only Chromium
  can run it at all — WebKit, i.e. every iPhone and the Capacitor shell,
  ignores `url()` in `backdrop-filter` — and measured in Chromium with 37
  capsules on screen it took the frame from 9 ms to ~385 ms with 12 s stalls.
  The port uses `blur(14px) saturate(160%)`, the same frosted pass the app's
  nav bars use; rim, tint and label are the upstream's.
  `prefers-reduced-transparency` swaps the glass for an opaque card, the same
  call the iOS build makes.
- **No shine.** No specular sweep, no moving highlight — Alon asked for the
  shine to go on the first gallery (9 Sep 2026). The rim's static hairline is
  the only light on the glass.
- **Touch gesture.** A tap commits on release, never on press; releasing more
  than ~28 px outside the capsule cancels. Holding ~340 ms lifts the capsule
  (scale 1.06, MEDIUM haptic) and it follows the finger — 1:1 for 24 px, then
  rubber-banding — until release, which commits inside / cancels outside and
  springs it home. Gesture values are written straight to `node.style` in one
  rAF, never through React state (the `HeaderShortcutBar` rule).
- **No blur over live canvases.** A backdrop filter above `JrShaderBg` /
  `JrFocusRaysBg` would re-filter at 60fps forever; those components flag
  `html.rc-shader-live` while mounted and the stylesheet drops every capsule to
  plain tinted glass for the duration.
- **Variants come from the live palette.** Upstream is always clear with
  `text-primary`; Richy needs a filled primary CTA, so the port adds
  `primary` / `green` / `red` / `gold` (filled, white ink) and a `soft` wash
  (hue-coloured ink), all mixed from `T` at render time so they follow the
  three themes and dark mode. `neutral` is the upstream look. Disabled empties
  the glass rather than dimming to 50% opacity.
- **Capsule shape and sizes.** Upstream mixes `rounded-full` (rim) with
  `rounded-md` (glass layer); the port is a capsule throughout. Sizes are
  `sm` 34 / `md` 44 (default, the HIG minimum target) / `lg` 52 / `xl` 56 /
  `icon`, rather than 32–56 with a 56px default.
- **Press feedback** uses the app's motion tokens (`--m-press`, scale 0.97 on
  press, 1.03 on hover where a pointer can hover) instead of `hover:scale-105`.
- **`busy`** (label + `ThinkingDots`, disables) carries over from `JrBtn`,
  which the primitive replaced. `GlassActionBtn`'s specular sweep did not.
