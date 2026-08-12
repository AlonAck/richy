# Badge art

One PNG per badge. Drop files in this folder — `build.mjs` copies the whole
directory into `public/badges/`, so adding art is never a code change.

## Spec

- **Format:** PNG, transparent background
- **Size:** 256 × 256 (drawn at 30px, so this covers 3× displays with room spare)
- **Padding:** keep ~10% clear on all sides — the art sits inside a 56px rounded
  tile and needs to breathe
- **Colour:** bake in whatever colours the badge wants. Do **not** try to match
  the rarity colour — the tile behind the art already carries the rarity wash,
  border and label, and it re-tints per theme. Art that also encoded rarity
  would fight it.
- **Light and dark:** one file serves both. The tile is a translucent wash over
  the card, so mid-tone art reads on either ground; pure white or pure black
  silhouettes will disappear on one of them.

## Naming

Filename is the badge name, lowercased, non-alphanumerics collapsed to hyphens.
`First Coin` → `first-coin.png`. If a badge is ever renamed, either rename the
file or set an explicit `img:` on that badge in `BADGES` (in `budget-app.jsx`).

A missing file is safe: the app falls back to that badge's SVG glyph, so the
set can be filled in one file at a time.

## The 52 files

### A. First steps
```
first-coin.png
opening-act.png
shape-of-it.png
first-line.png
somewhere-to-go.png
tidy-drawer.png
hundred-entries.png
thousand-entries.png
```

### C. Green month
```
first-green.png
twice-over.png
three-deep.png
half-a-year.png
full-year-green.png
two-years-green.png
made-it-good.png
half-kept.png
ten-years-green.png
```

### D. Clean weeks
```
clean-sheet.png
clean-sweep.png
shielded.png
quarter-clean.png
half-year-clean.png
year-of-truth.png
quiet-week.png
hundred-weeks.png
never-missed.png
```

### E. Budgets
```
under-the-line.png
three-months-held.png
six-months-held.png
twelve-months-held.png
clean-board.png
fully-ruled.png
balanced-books.png
the-whole-board.png
```

### F. Goals
```
funded.png
closed-the-book.png
three-closed.png
ten-closed.png
three-at-once.png
ahead-of-schedule.png
long-game.png
```

### G. Savings and cushion
```
first-pot.png
one-month-deep.png
three-months.png
six-months.png
the-thousand.png
five-figures.png
six-figures.png
seven-figures.png
doubled.png
three-pots.png
never-dipped.png
```

## Still to come

This is families A, C, D, E, F and G — the first slice of the 158 in
`MOTIVATION_SYSTEM.md`. The remaining 13 families land once that badge list is
edited (§8), and they will follow the same naming rule.
