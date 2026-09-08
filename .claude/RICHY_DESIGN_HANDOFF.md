---
purpose: Full context handoff for whoever (or whatever Claude session) picks up Richy's design work next — written so nothing has to be re-explained or re-derived.
compiled: 2026-08-27, from a Cowork conversation with Alon
---

# Richy — design work handoff

Paste this as the opening context when starting a Claude Code session on this
work. It exists so you don't have to re-ask Alon anything already answered
below — if something genuinely isn't covered here, ask him directly rather
than guessing (he's been explicit about this: he'd rather be asked than have
something built on an assumption).

## 0. Start here

**You have no memory of the conversation that produced this document.**
Everything below is real context from that conversation, written down so it
doesn't have to be re-explained — read all of it before writing any code,
not just this section.

**Your actual first task**, once you've read the rest of this file and
`.claude/skills/apple-ui-design/SKILL.md`:

1. Find the real code for the component described in §5 — Alon calls the two
   buttons "Labels" and "Profile" shortcuts in this document, but **that
   naming was never confirmed against the actual source** — it was inferred
   from a small screenshot of two icon buttons (a tag icon, a person icon),
   and the exact file/line in `budget-app.jsx` was never located during the
   conversation that produced this document. Locate it yourself first —
   search for the two icons (a price-tag shape and a person/profile
   silhouette) rendered as separate circular buttons — and confirm with
   Alon that you've found the right thing before changing it, since a wrong
   guess here means editing the wrong screen.
2. Once confirmed, replace it with the approved design in
   `.claude/skills/apple-ui-design/reference/button-bar-mockup.html` (the
   "Decided component patterns" section of `SKILL.md` has the full spec).
3. After that one ships and Alon has actually seen it running in the app
   (not just a mockup), move on to inventorying the rest of the app's
   screens against the design system one at a time, following the same
   propose → ask on real forks → decide → log process documented in §5 —
   don't batch-apply the design system to everything at once before the
   first real component has been confirmed working.

If anything below seems to conflict with what you see in the actual code,
trust the code and ask Alon — this document is a summary of a conversation,
not a live view of the repo.

## 1. What Richy is, and what this specific work is

Richy is a Hebrew-language personal budgeting app (repo: this folder, live
at richy-mgkl.vercel.app). Its differentiator is Richard, an AI financial
advisor meant to actively find and solve the user's money problems — not
just a chat box bolted onto a tracker. Long-term, Alon wants Richy on the
App Store (and eventually Google Play), backed by a real marketing push, a
rewards/brand system that makes people come back and tell friends, and a
24/7 proactive version of Richard that goes well beyond the current
"Spotted Leaks" feature. All of that is the north star — full context on it
is in the project's own instructions and in `ROADMAP.md` / `MOTIVATION_SYSTEM.md`
/ `CAMPAIGN_LAUNCH_2026-10.md` / `DISCOVERABILITY_PLAN_2026-08-19.md` /
`RETENTION_PLAN_2026-08-19.md` — read those for the bigger picture.

**This specific handoff is scoped to one thing: making the app look and feel
like a native Apple app.** Alon's own words: this is currently his highest
priority, ahead of new features. It is NOT a request to rewrite the app in
SwiftUI — see §7 for exactly how that question was resolved (and what's
still genuinely open about it).

## 2. Where things stand — priority order, do not silently reorder this

1. **Bugs first.** `reports/qa-sweep-2026-08-25.md` and `ROADMAP.md`'s Tier 0
   list real, still-open problems — data loss (couples mode silently drops
   transactions), a settings flow that can wipe a budget, offline writes
   that hang forever, etc. Alon explicitly confirmed fixing these comes
   before anything else, including this design work, when it was raised.
   If you're not sure whether a P0 is already fixed, check the code before
   assuming either way — don't take the report's word as current status
   without verifying, and don't assume something is fixed just because time
   has passed.
2. **Design, second.** Everything in this document.
3. **New features (the 24/7 Richard system, the rewards/streaks system in
   `MOTIVATION_SYSTEM.md`) come after that** — Alon said he wants some of
   this "partially in v1" (the Oct 5 launch), but design and bug-fixing
   outrank building new feature surface area right now.

**Launch date: Monday, October 5, 2026** (`CAMPAIGN_LAUNCH_2026-10.md`),
deliberately timed after the Israeli holiday season. Don't propose slipping
this without flagging it explicitly — it wasn't picked casually.

**Current architecture: the app is a single web codebase (`budget-app.jsx`,
~29,700 lines) wrapped into an iOS app via Capacitor** (see
`NATIVE_BUILD.md`) — not a native SwiftUI rewrite. Design work happens in
this file (CSS/JSX), not in Swift. See §7 for why, and for what's still an
open question.

## 3. The design system — read this file first, always

**`.claude/skills/apple-ui-design/SKILL.md`** is the actual source of truth
for how anything should look or move. Read it in full before touching any
UI code. Don't treat the summary below as a substitute for reading it — it
has exact color tokens, spacing scale, motion curves, and a growing
"Decided component patterns" section logging specific approved designs so
they don't get re-derived or re-litigated.

The one rule that matters most if you read nothing else: **borrow Apple's
structure and motion discipline, not Apple's colors.** Richy keeps its own
identity — warm cream background (`T.bg: #F7F3EE`), leather-orange accent
(`classic` theme: `#C8673A` / `orangeHi #E07848`), ink colors `#1A1410` /
`#6B5C4E` / `#B0A396` (that last one, `T.ink3`, already has 661 flagged
contrast failures app-wide per the QA sweep — don't add more, fix
opportunistically when you touch something using it). If a change makes
Richy look like Apple's own blue-and-white marketing site, that's a bug in
the change, not a feature. Richy should read as "Richy, wearing Apple's
tailoring" — never as an Apple clone.

Also non-negotiable: **Richy is Hebrew-first.** Any CSS must use logical
properties (`margin-inline-start`, not `margin-left`) so it doesn't break
under RTL. `ROADMAP.md` already flags an RTL gap in the onboarding funnel —
don't reopen it elsewhere with new left/right-hardcoded styles.

## 4. The reference material Alon gave, and exactly what's in it

Two real screen recordings, saved in `.claude/skills/apple-ui-design/reference/`,
with a full plain-language writeup of both in `reference/notes.md`:

**`claude-ios-nav-and-modelsheet-2026-08-27.mov`** — the Claude iOS app
itself. Shows: (1) push navigation between screens — the outgoing screen
visibly slides left and stays partly visible underneath, with a soft
drop-shadow at the seam, not a plain fade; (2) a bottom sheet ("Select
model") — the background dims AND scales down a few percent at once while
the sheet rises with rounded top corners and a small drag-handle bar, with
the app's own logo mark bridging the seam between the two layers.

**`apple-watch-app-tabs-and-modals-2026-08-27.mp4`** — Apple's own Watch
companion app. Shows: (1) a large title that shrinks and re-centers as you
scroll; (2) a perfectly consistent 2-column card grid (every card: bold
title, image, one caption line, same shape, no exceptions); (3) three
distinct modal styles used for three distinct purposes and never mixed — a
small bottom sheet for a quick in-context choice, a full-screen modal with
a top-right Cancel for a multi-step flow, and a slide-in card (with the
previous screen still peeking at the edge) for anything that leaves the
app, like an external link opening in Safari; (4) the actual tab bar
structure this project's first built component now copies — one
translucent, blurred capsule holding icon-above-label items, with a single
lighter inner capsule as the only moving part, sliding to whichever item is
active/touched.

**Deeper visual analysis done on both clips** (Alon asked for a genuinely
close look — corner curves, alignment, "shine," motion — not just the
high-level patterns above):

- iOS's current look (this is iOS 26, "Liquid Glass") uses real translucency
  on chrome elements — the tab bar visibly blurs and tints from whatever
  scrolls behind it, not a flat fill.
- A soft diagonal gloss/sheen shows up on prominent elements (a primary
  pill button like "Start Pairing") but **not** on small utility icon
  buttons (mic, "+") which stay flat matte. Shine correlates with a
  component's prominence/role — it is not applied uniformly to everything.
- Grouping convention: mutually-related items that behave like radio
  choices sit inside ONE continuous card separated by hairline dividers;
  separate, independent actions are each their own individually-rounded
  pill with a visible gap between them — two different groupings for two
  different relationships between items, not arbitrary.
- Corner radius is a small family of values tied to a component's role
  (full circle/pill for small controls and CTAs, moderate rounded-rect for
  cards, a larger continuous "squircle" curve for sheet top corners) — not
  one constant everywhere.

More references are expected — Alon said he'll keep adding them. Check
`reference/notes.md` for the current full list before assuming the above
is everything.

## 5. Worked example — read this as the template for how to approach every component

The first real component built this way was a "merged action bar" (two
shortcuts — e.g. Labels / Profile — that were previously two separate
circular buttons in mismatched colors with no shared styling and no
animation). The process, in order, matters as much as the result:

1. Alon flagged the problem screenshot and said what he didn't like:
   separated, inconsistent colors, no animation.
2. Two genuine ambiguities were surfaced and asked about instead of
   guessed: are these two mutually-exclusive states (→ a segmented toggle)
   or two independent, always-available shortcuts (→ a grouped bar,
   answer: **independent**)? And which color direction — deeper cream or
   the orange brand accent (→ both were mocked up; Alon picked **cream**)?
3. First build used a bright "glass shine" highlight that tracked the
   pointer on drag — **rejected**, too showy, not what the actual
   references do.
4. Second build swapped it for a dark "shadow" tracking the pointer, with
   each button darkening/shrinking on its own `:active` state — **rejected**
   ("too much shadow," and the per-button state visually re-split the bar
   into two halves, defeating the "one component" goal).
5. Final build: thrown out and rebuilt directly copying the Apple Watch
   tab bar's actual structure (see §4) in Richy's colors — one translucent
   blurred capsule, icon above label, a single sliding inner capsule as the
   only moving part, tinting to Richy's orange accent when active. This is
   what shipped. Full spec and the working HTML reference are both in
   `.claude/skills/apple-ui-design/SKILL.md` under "Decided component
   patterns" and `reference/button-bar-mockup.html`.

**Apply this same loop to every other screen/component**: read the
references and the skill first, propose against them (mock up small pieces
if a decision is genuinely open, the way `reference/button-bar-mockup.html`
was built), ask rather than guess on real forks, and log the final decision
(plus rejected alternatives, so they don't get re-proposed later) back into
`SKILL.md`.

## 6. How Alon works, and how he wants this run

- **Solo developer, Windows 11.** None of this design/CSS work needs a Mac
  or Xcode — that's only needed for the native iOS wrapping step
  (`NATIVE_BUILD.md`) and App Store submission. Don't wait for Mac time to
  do design work.
- His girlfriend has the MacBook Pro needed for Xcode; they typically get
  2-3 day stretches together, roughly weekly, sometimes over Zoom instead
  of in person (in which case he directs her remotely). That time should be
  reserved for the Xcode-specific step, not spent on anything doable on
  Windows.
- He has Claude Max.
- **He wants to be treated as a startup advisor's client, not just handed
  outputs** — push back with real opinions when something seems off, don't
  execute a request uncritically if there's a better idea. He said this
  explicitly and it's a standing preference, not a one-time note.
- **Explain things in the simplest possible terms, briefly** — a few
  sentences, not a wall of text, no unexplained jargon. If a technical term
  actually matters, explain it plainly rather than skipping it or assuming
  he knows it.
- **Ask rather than guess.** This was stated explicitly and emphatically:
  during any high-effort or detailed work, and any time you'd otherwise
  have to guess instead of knowing for sure, ask him directly — proactively,
  even if he hasn't asked to be consulted. This is the single most
  important process rule in this document.
- He has said more than once that his biggest frustration with prior AI
  collaboration on this project was things turning into "a mess" —
  drifting into unplanned work, redoing the same decision multiple times,
  losing track of what was already decided. `reports/qa-sweep-2026-08-25.md`
  documents a real instance of this (cosmetic commits repeated four times
  while real bugs sat open). The antidote is what this document and the
  skill file are for — check them before starting, update them as you go,
  don't rely on memory of a past conversation.

## 7. The SwiftUI/native question — resolved for now, not fully closed

Worth being honest about how this actually went, not just stating a
conclusion: Alon initially wanted to delay the Oct 5 launch to build a true
native SwiftUI app (and, separately, "a version that fits Android" too).
That was pushed back on hard — a full rewrite, in two different native
languages, for a solo developer with limited weekly Mac time, is a
multi-month undertaking that would blow past the deliberately-chosen launch
window. Alon then clarified his real motivation was wanting Apple's native
UI feel and animations specifically, not the SwiftUI technology for its own
sake. The working resolution that's actually being built toward right now:
**get the native look and feel through the design system and real motion
work in the existing web app, and treat a genuine SwiftUI (and Android
native) rewrite as a separate, later decision** — not committed to, not
ruled out, just not what's being built right now.

**This was never stated by Alon as a final, explicit decision in so many
words** — it's the direction the work has actually moved in and he's kept
going along with it. If a moment comes where the CSS/motion approach
clearly isn't achieving the native feel he wants, that's exactly the kind
of thing to surface to him directly rather than either quietly pushing
forward or quietly reopening the rewrite question.

## 8. Tooling and model guidance

- **Use Claude Code for the actual implementation**, not a chat tool and
  not a visual design canvas — this is a refinement pass on real, existing
  screens, run against a real dev build, not new screens designed from
  nothing. The repo already has a screenshot-based dev workflow
  (`.claude/dev.html`, `.claude/shots.html`, `.claude/serve.ps1`) that looks
  built for exactly this — use it.
- **Model: Sonnet as the default** for applying the design system — it's
  well-specified work at this point, not a hard reasoning problem. **Switch
  to Opus** for anything touching real calculations or money logic (so a
  styling change can't quietly break a number), for genuinely hard bugs, or
  any time something feels off. Alon has Claude Max — don't hesitate to use
  Opus when it's warranted.
- **Turn effort/thinking up specifically when verifying** a change didn't
  break real functionality; default effort is fine for mechanical styling
  work.
