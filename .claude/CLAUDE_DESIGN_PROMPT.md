Paste everything below the line into Claude Design.

---

# Design the Richard Watch screens for Richy

You are designing screens for **Richy**, a Hebrew-first personal finance iPhone
app. Its differentiator is **Richard** — an AI money advisor that actively finds
and solves the user's money problems, not a chat box bolted onto a tracker.

The engine behind these screens is already built and returns real, exact numbers.
**Every string and figure in this brief is genuine engine output — use them
verbatim. Do not invent placeholder copy or lorem, and do not round or change a
number.** That literalness is the point: this product's credibility rests on the
figures being real.

Deliver a single canvas of artboards at **393 × 852** (iPhone 15/16 logical
size). Every screen needs a **light and a dark artboard side by side**.

---

## 1. The identity — read this before drawing anything

Richy should *feel* like a native iPhone app: consistent, calm, confident. Borrow
Apple's **structure and discipline** — type scale, spacing rhythm, motion,
native component patterns — and apply them in Richy's own colours.

**This is Richy wearing Apple's tailoring, not an Apple clone.** If a screen
drifts toward Apple blue-and-white system chrome, that is a bug in the design,
not a feature.

Three principles, in priority order:

1. **Deference** — the UI serves the data and never competes with it. In a
   finance app the number is the star.
2. **Clarity** — content is the point; chrome and decoration recede.
3. **Depth** — hierarchy comes from layering (elevation, blur, soft shadow), not
   from borders and dividers everywhere.

---

## 2. Colour — the Cornflower Ocean palette

This is one of three switchable themes. Design in **Cornflower Ocean**. Use
these values exactly.

**Surfaces and ink**

| Role | Light | Dark |
|---|---|---|
| Page background | `#F7F3EE` warm cream | `#131110` |
| Card | `#FFFFFF` | `#262019` |
| Primary text | `#1A1410` | `#F5EFE7` |
| Secondary text | `#6B5C4E` | `#BCAC9A` |
| Tertiary text | `#B0A396` | `#83725F` |
| Inset fill | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.06)` |
| Hairline | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)` |

The background stays **warm cream**, not grey and not white. That warmth against
the cool blue accent is the whole character of this theme — don't neutralise it.

**Accents.** Each element in the data carries a colour *role*, and I need you to
design against the role so the same screen works in all three themes:

| Role | Light | Dark | Used for |
|---|---|---|---|
| **accent** (primary) | `#3C4C82` deep navy | `#7E9BF2` light periwinkle | subscriptions, goals, primary buttons |
| **danger** | `#E03030` | `#EF4A44` | fees, price rises, a month ending short |
| **warning** | `#C8983A` | `#E8B44C` | renewals coming, budgets on pace to blow |
| **info** | `#2E7DD6` | `#5AA9F0` | small-charge drift, saving less than usual |
| **special** | `#9B6DB5` | `#C08FDC` | overlapping/duplicate services |
| **positive** | `#27A85F` | `#3DDC84` | money recovered, amounts saved |

**Hero surface** (for one big number only): light
`linear-gradient(160deg,#5C7AE3 0%,#8493E2 50%,#B2BEED 100%)` with ink `#242C52`;
dark `linear-gradient(160deg,#2A3A66 0%,#1F2B4C 50%,#161E36 100%)` with ink
`#E7EDFC`.

**Primary button:** light `linear-gradient(135deg,#5C7AE3 0%,#4C5E9C 55%,#3C4C82 100%)`,
dark `linear-gradient(135deg,#5F7DE6 0%,#4E67CC 55%,#4055A8 100%)`.

**Dark mode must look intentional, not inverted.** Large tinted areas go *down*
in lightness; small marks and figures go *up* in vividness so they still read
against near-black. Every colour needs a real dark counterpart.

---

## 3. Type, spacing, motion

**Type.** Two families, used with intent:

- **Body, numbers, anything data-dense** — `-apple-system, BlinkMacSystemFont,
  system-ui, "Segoe UI", Roboto, sans-serif`. Numbers must use **tabular
  figures** so amounts don't jiggle as digits change.
- **Serif display** — `"EB Garamond", "Noto Serif Hebrew", Garamond, serif` at
  weight 700, reserved for **editorial moments**: screen titles, a greeting,
  Richard speaking. This serif is Richy's voice; it is what stops the app
  looking like every other fintech. Never set body copy or numbers in it.

```
hero     600 34px/1.15    rare — one big number, a milestone
title    600 22px/1.25    screen and section titles
body     400 17px/1.45    default reading size — never go below
caption  400 13px/1.35    secondary and meta info
```

**Spacing — one scale, no one-off values:** `4 · 8 · 16 · 24 · 32 · 48`. If a
layout needs something off-scale, rethink the layout.

**Cards:** `border-radius: 18px`, soft shadow (`0 4px 24px rgba(0,0,0,0.06)`),
hairline border. Sheets get a larger top radius and a drag handle.

**Motion:** iOS-feeling springs, never linear.
`cubic-bezier(0.34, 1.56, 0.64, 1)` at ~0.35s for a sheet opening or a card
appearing (it overshoots slightly, which is what reads as physical);
`cubic-bezier(0.25, 0.1, 0.25, 1)` at ~0.25s for fades and small state changes.

---

## 4. The core component — a Signal row

Every screen is built from this, so design it first and design it well. The
engine emits every row in one shape: an icon in a role colour, a title, a
subtitle, a money figure, and a set of action buttons.

Draw the row in these states: **default · pressed · with an expanded action
drawer · already-actioned/resolved**.

Real rows to lay out, verbatim:

```
[accent · repeat icon]   Planet Fitness                        $480.00/yr
                         $40.00/mo · 6 charges, last 2026-08-11
                         [ Draft cancellation ]  [ Keep it ]

[danger · shield icon]   ATM and cash fees ×6                   $42.00/yr
                         $21.00 across 6 months — about $3.50/mo
                         [ Draft refund request ] [ Count as recovered ] [ Looks fine ]

[warning · calendar]     Amazon Prime renews in 25 days        $139.00/yr
                         $139.00 yearly, due 2026-09-23 — based on one
                         charge, so worth checking
                         [ Remind me before ] [ Draft cancellation ]

[special · film icon]    2 services doing the same job         $155.88/yr
                         NETFLIX.COM, HULU — $28.98/mo together, dropping
                         HULU saves $155.88/yr
                         [ Draft cancellation ] [ Keep it ]

[info · coins icon]      11 small charges in Food                    $49.50
                         $49.50 this month in charges under $7.79 —
                         14% of everything you spent
                         [ Got it ]
```

**One problem I specifically need you to solve.** Some rows describe money that
another row already counts — a price rise lives *inside* its own subscription's
cost, and an overlapping service is one of the subscriptions listed above it.
Those rows are worth showing (each carries a different decision) but their figure
must not read as adding to the total. Right now they look identical to counted
rows and the list appears to sum to more than it does. Design a treatment that
makes "already counted above" unmistakable without burying the row.

Three kinds of money that must never look interchangeable, and must never be
summed together on screen:

- **recurring** — keeps leaving every month until something changes → "…/mo", "…/yr"
- **one-off** — a single amount to claim back → "…to claim back"
- **observed** — already spent, nothing brings it back → "…this month"

---

## 5. The screens

### A. Daily brief — the home of the feature

What Richard found since the user last looked. Ranked by urgency, not by date.
Each row carries a horizon: **now / soon / watch** — this is the main thing to
design around, so a blown budget and a forgotten subscription can share a screen
without either drowning the other.

Header figures: `$125.04/mo` recoverable, `$89.90` to claim back, `12 open`.
Headline: **"12 new leaks worth $125.04/mo plus $89.90 to claim back."**

**Design the quiet state as carefully as the busy one** — headline *"Nothing
needs you today."* Most days should be quiet, and a calm, confident empty state
is what earns trust in an app that watches your money continuously. If the quiet
state looks like an error or an empty list, the whole feature reads as broken.

### B. Goal at risk, and the plan that fixes it — the most important screen

This is the "advisor, not tracker" difference in a single view. Design it as the
hero.

> **Emergency Fund is behind by $53.98/mo**
> $2,000.00 saved of $3,000.00 · due 2026-11-29
> $1,000.00 to go, 3 months left
> Needs $333.33/mo · currently saving $279.35/mo
>
> **Cancelling 2 things covers it — $69.99/mo freed**
> · Planet Fitness — $40.00/mo
> · Adobe Creative — $29.99/mo
> [ Cancel both ]  [ Pick different ones ]

The emotional arc matters: *problem → the exact fix → one tap*. The user should
finish reading and know precisely what to do. Also design the harder variant
where cancelling everything available still doesn't close the gap — it must feel
honest and constructive, not defeating.

### C. Next 30 days

A timeline of every charge the user's own history says is coming — date, days
away, merchant, amount, and a confidence level. Some are certain, some are
likely; show the difference honestly.

```
2026-09-02  (+4d)   Rent              $1,900.00   high
2026-09-04  (+6d)   Supermarket         $902.50   high
2026-09-04  (+6d)   NETFLIX.COM          $15.99   high
2026-09-06  (+8d)   Adobe Creative       $29.99   high
2026-09-11 (+13d)   Planet Fitness       $40.00   high
```
Total: `$3,198.48` across 6 charges.

### D. Two warning cards

**Budget pace** — the number that matters is the *daily allowance*, not the fact
that they're over:

> **Food is on pace to go over**
> $1,400.00 of $900.00 with 19 days left — **$0.00/day keeps it under**

Also the already-blown variant: *"Food is already $500.00 over — $1,400.00
against a $900.00 cap, 19 days still to go."*

**Cash cliff:**

> **This month ends $365.98 short**
> $4,365.98 spent and $310.00 of known charges still to land, against $4,000.00 in

---

## 6. Rules before you call a screen done

- Touch targets ≥ 44 × 44px
- Text contrast ≥ 4.5:1 — the tertiary ink is the usual offender
- Spacing only from the scale; no one-off pixel values
- Any modal is a **bottom sheet** with a drag handle — never a centered dialog
  with a dimmed backdrop, which reads as web/Android
- Back navigation is a **chevron plus a label**, not a bare icon
- Large title collapses to a small title on scroll
- Respect safe-area insets on anything fixed
- **RTL-safe.** Richy is Hebrew-first. Use logical direction throughout and show
  at least one screen mirrored — a design that only works left-to-right is not
  finished.
- Dark variant looks deliberate, not inverted
- Richy's warm cream and its serif voice are still visible

---

## 7. What I want back

One canvas, artboards laid out in this order:

1. Signal row — all four states, light and dark
2. Daily brief — busy state, light and dark
3. Daily brief — quiet state, light and dark
4. Goal at risk with the plan — light and dark (**give this the most attention**)
5. Goal at risk — the variant where the gap can't be closed
6. Next 30 days — light and dark
7. Budget pace and cash cliff cards — light and dark
8. One screen mirrored for Hebrew RTL

Where a real decision exists — how "already counted" reads, how horizon is shown,
how the quiet state feels — show me **two options side by side** rather than
picking silently. I'd rather choose than be handed one answer.
