# Richy Design System (extracted)

A small, real, buildable component package pulled out of `budget-app.jsx` so
`/design-sync` has something to work with. These are the same functions that
run in the live app — copied verbatim, not reimplemented — wired up with a
minimal esbuild step that produces a `dist/` bundle.

## Components

- `Card` — base surface (flat or "liquid glass")
- `IconBadge` — rounded-square icon chip (transaction direction)
- `CatBadge` — category color chip (solid or soft/tinted)
- `BigBtn` — full-width primary action button
- `ProgressBar` — thin capsule progress track
- `SVGIcon` — line icon renderer (trimmed icon set: up, down, box, check, home, food, car, heart, coins)

## Build

This environment has no Node.js installed, so the build has **not** been run
or verified yet. On a machine with Node 18+:

```
cd design-system
npm install
npm run build
```

This produces `dist/richy-ds.js` (an IIFE exposing `window.RichyDS.*`) and
`dist/styles.css`.

## Next step: run /design-sync

Once `dist/` exists and builds cleanly, run `/design-sync` again from the
repo root — the converter will detect this as a `package` shape (no
Storybook) and walk you through scoping which components to sync and
grading their previews.

## Caveats

- Only 6 of the app's ~60 UI functions were extracted (the simplest,
  self-contained visual atoms). Most components in `budget-app.jsx` are
  screen-level (`Overview`, `Activity`, `Budgets`, ...) or depend on app
  state/hooks not meaningful outside the app — those aren't candidates for
  a component-library sync as-is.
- `tokens.js` is a static snapshot of the default ("purple") theme. The
  live app mutates these values at runtime for dark mode and theme
  switching; that behavior isn't reproduced here.
- `SVGIcon`'s icon bank was trimmed to only the icons the shipped
  components reference, to keep this scaffold minimal.
