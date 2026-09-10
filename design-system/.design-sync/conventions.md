## Richy design system — how to build with it

**No provider or wrapper needed.** Every component reads color from the
bundled `T` token object (imported internally); there's no `ThemeProvider`
to wrap your composition in, and no runtime theme-switching API in this
bundle — everything renders the flagship "Cornflower Ocean" theme
(navy `#3C4C82` / periwinkle `#5C7AE3` accent, warm cream `#F7F3EE`
ground). Just import components and use them directly.

**Styling idiom: inline props, not utility classes.** This is not a
Tailwind-style or class-name design system. Components take literal style
props directly — `color`, `bg`, `variant`, `soft`, `style` — and render with
inline styles internally. There is no `className` vocabulary to learn; the
props ARE the styling surface. Reach for `T` (exported from the bundle) when
you need a raw token value outside a component — e.g. `T.orange` (navy
accent), `T.orangeHi` (periwinkle), `T.ink`/`T.ink2`/`T.ink3` (text, most to
least emphasis), `T.card`/`T.bg` (surfaces), `T.green`/`T.red`/`T.gold`
(status). `UI` and `DISP` are the two font stacks (system sans / editorial
serif) also exported from the bundle.

**`LiquidButton` is the one glass surface — and it's genuinely translucent.**
It injects its own stylesheet on mount (no setup required), but because it's
real `backdrop-filter` glass, it only reads correctly over a background with
visible color/contrast behind it — place it over the cornflower hero
gradient (`linear-gradient(160deg,#5C7AE3,#8493E2 50%,#B2BEED)`) or a photo,
not over flat white. Don't nest a `LiquidButton` inside another glass
surface (there's no shared "glass container" in this package yet) — two
overlapping glass layers won't sample correctly. It has a real hold-to-lift
gesture (long-press stretches and follows the pointer) — that's expected
interactive behavior, not a bug in a static screenshot.

**Where the real API lives**: each component's `.d.ts` in
`components/general/<Name>/` is the authoritative prop contract — written by
hand from the actual source (this package has no TypeScript source, so
these aren't compiler-generated). `<Name>.prompt.md` alongside it has the
one-line summary. `CatBadge.color` is required (no default); everything
else is optional with sensible defaults.

**Typical composition** — a transaction row, the shape most screens need:

```tsx
import { IconBadge, LiquidButton } from 'richy-design-system';

function TransactionRow({ tx }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
      <IconBadge bg={tx.amount > 0 ? '#188A4A' : '#C73A36'} label={tx.amount > 0 ? '+' : '-'} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{tx.merchant}</div>
        <div style={{ fontSize: 13, color: '#6B5C4E' }}>{tx.category} · {tx.date}</div>
      </div>
      <span style={{ fontWeight: 700 }}>{tx.amount > 0 ? '+' : ''}₪{Math.abs(tx.amount).toLocaleString()}</span>
    </div>
  );
}

// A primary CTA on a cornflower hero:
<div style={{ background: 'linear-gradient(160deg,#5C7AE3,#8493E2 50%,#B2BEED)', padding: 24 }}>
  <LiquidButton variant="primary">Continue</LiquidButton>
</div>
```

**Scope note**: this package covers 7 foundational atoms (Card, IconBadge,
CatBadge, BigBtn, ProgressBar, SVGIcon, LiquidButton) extracted from Richy's
production app. Larger composed screens (motion components, full page
layouts, brand guidelines) may exist elsewhere in this project if synced
separately — check the project's other component groups before assuming
this is the complete system.
