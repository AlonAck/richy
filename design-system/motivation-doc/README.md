# Motivation Doc — design system

The visual system behind the **Streaks, Levels & Badges** artifact
(`MOTIVATION_SYSTEM.md` rendered as a published page). `tokens.css` is the
buildable half; this file is the reasoning, so the next document in this
family looks like it came from the same studio.

This is a **document theme**, deliberately separate from the in-app component
styles in `../src`. Same product palette, different job: long-form reading and
a 157-row scannable index, not app chrome.

---

## The one rule

**Page furniture is monochrome. Rarity is the only chroma.**

Rules, borders, headings, links, active states — all ink. The six rarity hues
are the only saturated colour anywhere on the page.

This is a constraint, not a stylistic preference. Rarity is the axis a reader
scans the badge index by. Richy's product accent is `#8970C6`, which is
*already* the Epic tier — so a page accent drawn from the product palette
would collide with a rarity, and a page accent drawn from outside it would be
a seventh hue competing with six that carry meaning. Rather than invent one,
the page spends its boldness entirely on the ramp and keeps everything else
quiet.

Consequence worth knowing: **selected states invert instead of tinting.**
An active filter chip becomes ink-ground/paper-text. That's why `--inv-bg` /
`--inv-ink` exist as first-class tokens.

---

## Colour

Sourced from the real `T` object in `budget-app.jsx`, so the rarity ramp
previews true against the shipping app.

| Token | Light | Dark | Product origin |
|---|---|---|---|
| `--bg` | `#F7F3EE` | `#141210` | `T.bg` / `T.dark` |
| `--surface` | `#FFFFFF` | `#1E1A16` | `T.card` / `T.darkCard` |
| `--surface2` | `#FBF8F4` | `#252018` | — / `T.darkCard2` |
| `--ink` | `#1A1410` | `#F2EBE3` | `T.ink` |
| `--ink2` | `#6B5C4E` | `#B0A396` | `T.ink2` |
| `--ink3` | `#9C8E80` | `#847768` | near `T.ink3` |

The neutrals are warm, not grey — they're Richy's own paper. That was
inherited, not chosen; the project's existing system outranks a fresh
palette.

### The rarity ramp

| Tier | Light | Dark | Product token |
|---|---|---|---|
| Common | `#9A8D80` | `#A2958A` | `T.ink3` `#B0A396` |
| Uncommon | `#1F8F4E` | `#4FC97F` | `T.green` `#27A85F` |
| Rare | `#2467BE` | `#5B9CF5` | `T.blue` `#2E7DD6` |
| Epic | `#7457B8` | `#C8B1FF` | `T.orange` `#8970C6` |
| Legendary | `#A87B22` | `#E0B45C` | `T.gold` `#C8983A` |
| Mythic | `--grad-mythic` | `--grad-mythic` | none — gradient |

Doc values are darkened from the raw product tokens for body-text contrast on
paper; the raw tokens are tuned for chips and fills in-app, not for 10px
uppercase mono on white.

**Mythic is a gradient, not a colour** — the spec calls the tier
"iridescent", so `.c-m` clips `--grad-mythic` to the glyphs and shimmers it
over 9s. This is the page's only motion flourish, and it's disabled under
`prefers-reduced-motion`. Don't add a second one.

### Reward currencies

Each currency borrows a rarity hue rather than introducing new colour:

| Currency | Hue | Reasoning |
|---|---|---|
| XP | ink | universal — must not read as a tier |
| Shield | Rare blue | |
| Repair | Uncommon green | green = a period made good |
| Pause | Epic purple | |
| Capacity | Legendary gold | permanent, so it takes the permanent-feeling hue |
| Booster | dashed border, no hue | **dashed = temporary.** Form, not colour, encodes expiry |

That last row is the useful trick: boosters are the only currency that runs
out, and the dashed border says so without spending a hue.

---

## Type

Two families define the product: bundled serif faces for headings and the
native UI stack for every other role. On Apple platforms that stack resolves
to San Francisco without embedding Apple's restricted font files.

| Role | Stack | Job |
|---|---|---|
| Display | EB Garamond 700 italic → Noto Serif Hebrew / Noto Naskh Arabic | headings and title-role text |
| UI | San Francisco / native system UI | prose, controls, labels, and data |

Display is bold and inclined, with script-aware companions for Hebrew and
Arabic. Prose sits near 65ch;
tables and the badge index are exempt because they're scanned, not read.
`font-variant-numeric: tabular-nums` on every column of digits.

---

## Layout

Sticky scroll-spy rail (216px) + content well, splitting at 1140px. Below
that the rail collapses to a sticky `<select>` — a better jump control on
touch than a cramped horizontal scroller.

Structural devices earn their place:

- **Section numbers** (§0–§8) mirror the source document's own numbering, so
  the page and the markdown can be discussed interchangeably.
- **The numbered `.rules` list** in §0 is numbered because the three rules are
  referenced by number elsewhere in the doc ("rule 2 of §0").
- **Family letters** (A–S) are the badge taxonomy's real keys.

Nothing else is numbered. Decorative `01 / 02 / 03` markers were avoided
precisely because most of this content is a set, not a sequence.

Spacing comes from flex/grid `gap`, never per-element margins — margins
collapse and double unpredictably across the section/callout boundary. Wide
content scrolls inside `.ds-scroller`; the body never scrolls sideways.

---

## Theming

Token-level, three layers, in this order:

1. `:root` — light values
2. `@media (prefers-color-scheme: dark)` — redefines **only tokens**
3. `:root[data-theme="dark"]` / `[data-theme="light"]` — redefines tokens again

Layer 3 must exist for **both** directions: the Artifact viewer's theme toggle
stamps `data-theme` on the root element and has to beat the OS media query
either way. Style components through tokens only — never write component rules
inside the media query, or layer 3 can't reach them.

Dark-mode rarity hues **lighten**; they are not inverted. The ramp keeps the
same relative order and legibility on both grounds.

---

## Files

- `tokens.css` — custom properties, type scale, rarity/currency classes,
  surface and control primitives. Framework-free, drop-in.
- `README.md` — this file.

Not wired into `../build.mjs`: that bundle builds React components from
`../src`, and this is a stylesheet for standalone documents. Link it directly
or inline it.
