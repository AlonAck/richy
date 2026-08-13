# Badge art

The Richy Signature Collection: 157 individually composed achievement badges,
one per row in `BADGES` (in `budget-app.jsx`).

```
badges/
  light/<id>.svg    pearl glass, for light surfaces
  dark/<id>.svg     onyx glass, for dark surfaces
  catalog.json      the source the badge table was generated from
```

## How it hangs together

`id` is both the badge key and its filename — `a-01-opening-balance` is
`light/a-01-opening-balance.svg`. That is deliberate: the table and the art
cannot drift apart, and there is no separate mapping to keep in sync.

`BadgeGlyph` picks the appearance from `T.isDark` at render time. Two files
rather than one re-tinted asset, because the glass is built from baked
gradients that CSS cannot recolour.

**Nothing is drawn behind the art.** Each SVG is already a rounded-square glass
tile carrying its own rarity ring and Richy's gold signature arc. An earlier
version sat these inside a tinted container, which doubled the tile and fought
the ring for the rarity signal.

`build.mjs` copies both folders wholesale into `public/`, so replacing art is a
drag-and-drop and never a code change.

## Replacing or adding art

Keep the filename equal to the badge `id`. Ship both appearances — a badge with
only a light file will show nothing in dark mode. SVG masters are 72×72 and
scale to any size; the app draws them at 56px in grids and can go larger for an
earned-badge reveal without loss.

If you add a badge that isn't in `BADGES` yet, add the row there too — art
alone will never appear.

## Naming

Display names are in the Minecraft advancement register: wry, short, a pun
where one is available. The literal condition lives in each badge's `trig`
field, so the joke never has to carry the meaning — `Ledgerdemain` is the name,
"1,000 transactions" is the trigger.

## What can actually be earned

`BADGE_TESTS` in `budget-app.jsx` holds the computable triggers. A badge with
no entry there is listed and drawn but can never be granted yet — visible as
locked. That is deliberate: showing the whole collection is the point, and
quietly hiding the undecidable ones would misrepresent how much is left.
