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

```
cd design-system
npm install
npm run build
```

This produces `dist/richy-ds.js` (an IIFE exposing `window.RichyDS.*`) and
`dist/styles.css`. Verified building cleanly as of 2026-08-24.

## Next step: run /design-sync

Once `dist/` exists and builds cleanly, run `/design-sync` again from the
repo root — the converter will detect this as a `package` shape (no
Storybook) and walk you through scoping which components to sync and
grading their previews.

## Caveats

- Only 6 of the app's ~60 UI functions were extracted (the simplest,
  self-contained visual atoms). Most components in `budget-app.jsx` are
  screen-level (`Overview`, `Activity`, `Budgets`, `Profile`, `SocialView`,
  `BusinessView`, ...) or depend on app state/hooks not meaningful outside
  the app — those aren't candidates for a component-library sync as-is.
  That now also includes newer composites shipped since this package was
  extracted: `WidgetCard` (5-shape dashboard widget), `BadgeTile`/
  `BadgeGlyph` (the badge collection), `LevelMark`, `StatCell`, `Disc`
  (initials avatar) and `ProfileRow` — none have a package equivalent yet.
- `tokens.js` is a static snapshot of the app's non-default ("purple")
  theme — the live app's runtime default is `"blue"` (Cornflower Ocean).
  The live app mutates these values at runtime for dark mode and theme
  switching; that behavior isn't reproduced here.
- `tokens.js` also carries the badge rarity ramp (`RARITY_COLOR`,
  `RARITY_LABEL`, `MYTHIC_GRADIENT`) as a light-theme snapshot; see
  `motivation-doc/tokens.css` for the paired dark-mode ramp.
- `motion.js` is a trimmed copy of the app's `ensureMotionCss()` — only the
  CSS custom properties `BigBtn`'s press feedback and `ProgressBar`'s
  grow-in animation need, not the full keyframe vocabulary (`rcRise`,
  `rcPop`, `rcFlash`, ...) that powers screens this package doesn't extract.
- `SVGIcon`'s icon bank was trimmed to only the icons the shipped
  components reference, to keep this scaffold minimal.
