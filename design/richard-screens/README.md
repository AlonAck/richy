# Richard — the nine chief screens

Source of record for the Claude Design project `eaa95772-7716-46d4-aca8-dd441caf6edd`
("Richard's UX redesign"). These are pages for Alon's private Richard ops app,
not for Richy — different app, different identity. See
`.claude/skills/richy-apple-design/SKILL.md` for the layout and grid rules this
set established, which apply to both.

The nine `.dc.html` files at the top of this folder are what is live in the
design project. Reach the project with the `DesignSync` tool, not a fetch.

## The palette

Three blues, set 12 Sep 2026, replacing the ivory ground and clay accent:

| | | Role |
|---|---|---|
| Lavender | `#CED9EA` | the page ground |
| Wisteria Blue | `#89A3CB` | tint, wash, and the accent on dark |
| Glaucous | `#6581AB` | fills and strokes |

**None of the three can carry text.** Glaucous is the darkest and sets 3.98:1 on
a white card, 2.98:1 on the Lavender ground — both under the 4.5 floor. Text
uses darker members of the same family: `--r-accent-text` `#375074` and
`--r-accent-deep` `#3F5980`, plus the ink ramp `#111823` → `#4E5766`.

**The ground is the binding surface, not the card.** Lavender is darker than the
white cards, so every text token is measured against the ground. A colour that
reads on a card can still fail on the page. Check both.

The cards stay `#FFFFFF`. The primary button is `#33507C`, not near-black — on a
coloured ground a near-black button reads as a hole. The status green is the one
colour outside the family, because a shipped/blocked mark should not be the same
hue as the accent.

## Why the files are split the way they are

`src/shell.head.html` is everything from `<!doctype>` through `</helmet>`: the
token block, the class layer, the breakpoints and the three accessibility
preference queries. **Every page gets it byte for byte.** A page cannot drift on
colour, type or spacing because it does not own any of that.

`src/body-<slug>.html` is one page's markup, and nothing else.

`src/css-<slug>.css` is the small stylesheet a page needs for its own data mark
or, on the two product screens, its own layout. Every class in it starts
`.r-m-` (a mark) or `.r-x-` (a layout component). These are spliced into the
shared `<style>` block at the `{{PAGE_CSS}}` slot, so they can use every `--r-`
token. Names must be unique across all of them: two pages defining the same name
differently is the failure this split exists to prevent.

`src/classes.txt` is the shell's complete class vocabulary. Nothing outside it
and the two reserved prefixes exists.

## Building

```
node build/assemble.mjs
```

Writes each `.dc.html` from the shell plus that page's body and CSS. Run it from
this folder. It is the only way these files should be produced — editing a
`.dc.html` directly puts the shell out of sync across the set. All nine are in
the build, Iris included; it was hand-built before the shell was extracted and
was added to the build on 12 Sep, which is when it stopped silently missing
shell changes.

```
node build/mkpreview2.mjs <file.dc.html> ...
```

Writes browser-renderable previews (auto / light / dark) and prints a static
audit per file: literal colours in the body, `style-hover` attributes,
character-width caps inside grid tracks, text inside SVG, undeclared classes,
landmarks, and whether a forced line break kept its leading space. All of those
should be zero or complete.

```
node build/mksheet.mjs
```

Writes one self-contained page holding all nine, for looking at the set at once.

## The rules that are easy to break

- **The track is the measure.** Never put a `max-width` in `ch` on text that
  already sits in a sized grid column. It is a second, invisible column edge and
  it always wins, because it is the narrower one.
- **No literal colour in a body.** Every colour is a `var(--r-…)`.
- **Measure text against the ground, not the card.** See the palette note above.
- **`style-hover` is inert** in this runtime. States are real CSS.
- **A forced line break eats the space before it**: write `it <br>is`.
- **Every value has a dark pair**, and the dark block is written twice — once
  under `[data-theme="dark"]`, once under `prefers-color-scheme` — because only
  the attribute reaches CSS.
- **Data marks** are small and dense, capped so their strokes never scale up, no
  dashes (state goes on the node), no text inside the SVG, and they sit in a
  `.r-graphrow` with a legend beside them.

The full record of how this was built, and what the checking caught:
https://claude.ai/code/artifact/295f092f-35cc-4f59-a9ea-953ec7c65a64
