# components/ui

Canonical shadcn-format source for third-party components, kept verbatim.

**These files do not run in Richy today.** The app is a single no-build
`budget-app.jsx` compiled in the browser by Babel standalone — there is no
TypeScript, no Tailwind, no bundler, and no `@/` path alias, so nothing here is
imported by anything. They are kept as the upstream reference so a future
Vite/Next migration can drop them straight in (`lib/utils.ts` holds the `cn`
helper they expect).

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
