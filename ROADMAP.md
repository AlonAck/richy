# Richy — Product Roadmap

> Single source of truth for "where does Richy actually stand." Read this
> instead of re-deriving state from the code every time.
>
> Sources this is built from: `reports/qa-audit-2026-08-17.md`,
> `reports/qa-sweep-2026-08-25.md`, `reports/qa-audit-2026-08-30.md`
> (all three code-verified, file:line or code-string anchored),
> `reports/security-review-2026-08-15.md`, `reports/richy-sim-latest.html`
> (10-persona simulation, post-fix run, 2026-07-27), `APP_STORE_LISTING.md`,
> a full `git log` read and a line-by-line diff of everything uncommitted
> in the working tree as of 2026-09-02.
>
> **Last updated: 2026-09-02** (previous: 2026-08-18). This was a full
> re-audit, not a light touch — the 08-18 version turned out to already be
> missing two entire shipped feature tracks (the motivation/gamification
> layer, the social follow graph) that had shipped 2026-08-12 to 08-14,
> *before* that version was written. Whoever wrote 08-18 either didn't
> check the tree or checked it and didn't add them. Don't repeat that:
> trust `reports/` and the live tree over any checkbox in this file,
> always — see Tier 0's own complaint about exactly this pattern.

---

## Scoring legend
- ⭐⭐⭐ = Churn-causing / trust-destroying.
- ⭐⭐ = Major differentiator.
- ⭐ = Expands addressable market / engagement.

---

## Current state snapshot

**Shipped and live:** expense tracking, budgeting, savings goals, Richard (AI
advisor), CSV/statement import, 50-currency support, debt payoff tracker
(avalanche/snowball), couples/household mode (shared + private ledger),
business accounts (P&L-ish, runway, tax pot), investing/net-worth tracker,
IOU notes, trip planning, EN/HE/AR/RU translation strings.

**Also shipped and live, but missing from every prior version of this file:**
- **Motivation / rewards layer** — streaks, XP levels, a **157-badge**
  collection with rarity tiers, and a social layer (public handles, a follow
  graph, requests). Shipped over five commits, 2026-08-12 to 08-14
  (`0bc48a8` design → `d783e9b`/`0e2d17b` profile home → `6e72c50` the real
  157-badge set → `cd72ed5` follow graph → `92cedd3` legal coverage). This
  is the literal answer to the project brief's "build a system that awards
  the user for using us" — it has been live for three weeks and this file
  never said so until today.
- **Richard Watch** — an always-on engine (`richardWatch`, nine leak/risk
  detectors, a 30-day cash-flow forecast, a Daily Brief, a Goal-at-Risk
  plan) plus four new screens, shipped 2026-08-30 (`6ef1148`, +3,900
  lines). This is the literal answer to "we need a full system that works
  24/7 to find the user's problems and solve them" — it supersedes the old
  "Spotted Leaks is one card that looks backward" framing entirely. See
  Tier 4 and Tier 0 below — it shipped on top of two open defects rather
  than after fixing them, and that trade-off is exactly what Tier 0 exists
  to stop.

**In progress, UNCOMMITTED as of 2026-09-02 — not on any deploy, not
visible to Alon's collaborator until pushed:**
- **Overview hero redesign.** The 5-panel generic dashboard (Balance /
  Trend / Categories / Savings rate / Top merchants) is being replaced with
  4 decision panels: **Safe to Spend** (7-day cash-room math, reserving
  known upcoming charges), **This Month** (a plain-English verdict — On
  track / Plan needs a tune-up / Needs attention — not a chart), **Richard's
  Next Move** (the single highest-severity Richard Watch finding, one tap
  to the plan), and **Money Watcher** (the 24/7 badge, recoverable-money
  total, one tap to the full findings list). This is the first time Richard
  Watch's output appears on the home screen instead of behind a tap — it is
  the single biggest concrete step yet toward "Richard is much more useful
  than a chat at the bottom of the screen." Working diff touches
  `budget-app.jsx` around the `Overview` component's hero carousel
  (`heroWatch`, `safeToSpend`, `heroMonthStatus`, `heroMove` etc.); page
  count and swipe-dot logic already updated to 4 panels.
- **Model-tier cost routing.** New `AI_MODEL_CORE` ("claude-sonnet-5") /
  `AI_MODEL_FAST` ("claude-haiku-4-5") split and a `callClaudeFast()`
  wrapper, applied to roughly a dozen short/bounded calls — plan
  translation, business-idea generation, stock-take copy, weekly business
  review, bank-sync help chat, widget-title generation, Found-Money
  narration and cancel-letter drafting. `callClaude()` (Sonnet 5, thinking
  explicitly disabled to hold latency/cost/shape steady) stays for the
  main Advisor conversation and Big-Decision CFO. `api/chat.js` updated to
  match — the model allowlist now only accepts the two new names, with a
  map from the old `claude-sonnet-4-6`/`claude-opus-4-8` strings so a stale
  cached client can't keep hitting the expensive path. **This is launch
  cost control, not a feature** — worth a deliberate review before commit
  since it changes which model writes user-facing copy across a dozen
  surfaces simultaneously, not a single one.

**Not shipped:** any live bank connection. "Sync your bank" on the Overview
is a demo-only Israeli-bank simulation (Leumi), now clearly labelled as a
demo per the 25/30 Aug audits — still not a real integration.

**Latest user-simulation result (2026-07-27, post-fix, 10 personas):**
impression 6.4/10, AI-usefulness 5.1/10, NPS 5.5, avg max-WTP $3.70/mo,
**60% kept / 40% gave up.** Full data: `reports/richy-sim-latest.html`.
This predates both the motivation layer and Richard Watch — **no
simulation has run against either yet.** Re-running the nightly study
after the Overview redesign lands is the single best way to find out
whether either investment is actually moving the churn numbers it was
built to move.

**Code-level state, updated (`budget-app.jsx` now 33,642 lines committed,
+~150 lines uncommitted per the diff above):** three QA audits in a row
(17, 25, 30 Aug) have now found the app has **silent data-loss bugs in
production**, and the third audit found two *new* ones layered on top —
see Tier 0. This remains more urgent than any Tier 2-4 feature.

---

## TIER 0 — Fix before building anything new (P0/P1)

**Read this callout before anything else in this file.** Two audits (17
Aug, 25 Aug) both said "fix before building anything new." The one commit
between the second and third audit was a **3,900-line feature**
(Richard Watch), not a fix. The third audit (30 Aug) found **two new P0s**
sitting on top of the still-open ones from the first two — including a
**second, independent instance of a bug already found once** in the exact
same seven lines. Two defect counts went **up**, not down, while that
feature was being built: the `T.ink3` contrast failure went from 661 to
693 uses, and the UTC-date bug went from 63 to 67 sites. **This file's Tier
0 list has no enforcement mechanism behind it — it loses to whatever is
more interesting that week.** The 30 Aug audit's #1 recommendation is to
fix that, not to fix another bug: freeze new features until this section
is empty. See "RECOMMENDED BUILD SEQUENCE" below for the concrete plan.

Full detail with file:line / code-string anchors in `reports/qa-audit-2026-08-17.md`,
`reports/qa-sweep-2026-08-25.md`, `reports/qa-audit-2026-08-30.md` and
`reports/security-review-2026-08-15.md`. Do not re-derive these from
scratch — read those files. Line numbers in the two older reports no
longer resolve (the file grew ~3,900 lines); the 30 Aug report anchors to
code strings instead, which is why it's quoted below in preference to the
older two where they overlap.

### Genuinely NEW, both P0, found 30 Aug — the two most urgent items on this page

- ~~**Creating or joining a household silently wipes every budget, goal and
  category.**~~ **CLOSED 2 Sep — `f1ad55b`.** See the Closed table below.
- **The investing allocation engine is a second, un-guarded advice
  surface.** `90110af` and `b26496e` correctly closed Stock Scout and put
  a server-side `GUARDRAIL` in front of every Richard chat call. But
  `investPlanOrders` (`:20842`) and `investPlanFor` (`:22736`) are
  **deterministic client code that never calls `api/chat.js`**, so they
  never see the guardrail. They hardcode named securities (VTI, QQQ, VXUS,
  BND, IBIT), select a plan from the user's risk-reaction questionnaire —
  which is suitability profiling — and return a named ticker, a cash
  amount and a share count. That is exactly what `terms.html:49` says
  Richard doesn't do ("not to suggest amounts to invest") while
  `terms.html:52` says Investing is "a tracker: it records holdings you
  already own." **This needs a product decision, not a ticket**: strip
  amounts/share counts and decouple plan selection from the questionnaire,
  or get licensed. Process lesson: the 26 Aug advice fix was scoped to the
  LLM path, so a non-LLM path producing the same output survived it
  untouched — any future guardrail needs to sit where financial strings
  are *rendered*, not at the API boundary. **This is also a direct hit on
  a compliance item already flagged in the Richy Launch Exposure Register
  artifact — see that artifact's Phase 2 entry, updated today with this
  finding.**

### Closed since 25 August — genuine credit, re-verified 30 Aug

| Finding | Closed by |
|---|---|
| Stock Scout was unlicensed personalised investment advice | `90110af` — rebuilt research-only |
| Richard's system prompt was fully client-controlled (security hole + unenforceable ISA boundary) | `b26496e` — server-side prompt registry, investment-advice line enforced |
| Bank Leumi DEMO wrote unmarked fake rows into the real ledger | `b26496e` — now labelled in UI and in Richard's prompt, styled distinctly, purged on disconnect |
| Marketing / legal / store copy misaligned with the law | `8848408` |
| `T.ink3 = #B0A396` failed WCAG contrast outright (2.23:1 on cream, 2.93:1 dark) across 725 render sites | `b551786` — one token, `#7A6B5C` light / `#978877` dark; measured live at 4.65–5.14:1 on every ground it paints on, including the 9.5px nav labels. `88fc56d` had corrected only the `const T` literal, which `applyDarkMode()` overwrites on every render, so nothing had actually changed on screen |
| Richard's "Apply 50/30/20" button was a placebo — `fn: "apply5030 20"` vs `=== "apply50/30/20"` | `88fc56d` repaired the string; `4398107` made the handler merge instead of replace. Both were needed: the handler passed a fresh array to `onSaveBudgets`, so the first working tap would have deleted every budget the split doesn't name — exactly the trap the 25 Aug sweep flagged ("Repair the identifier and you activate a budget-wipe. Fix both.") |
| `firestore.rules:60` — an invited-but-not-joined user could rewrite `memberUids`, evict the creator, or wipe the household | `88fc56d` narrowed it to `memberUids`/`pendingEmails`, which denied every real acceptance because `acceptInvite` also writes `members`; `f996866` pinned it properly — accept or decline only, membership fields constrained field by field, everything else denied by default |
| Service worker cached an error page as the app shell — permanent white screen, no recovery | `88fc56d` — `r.ok` guard before both `c.put()` calls. Verified by running the built handler against 200/404/500/502/503 and an offline fetch: non-OK responses are never cached, a good cached shell survives an outage, and offline boot still works |
| Couples-mode stale closure dropped every transaction added since the effect last ran | `f1ad55b` — functional `setTx`, fixed alongside the household wipe in the same seven lines |
| **NEW-1:** creating or joining a household silently wiped every budget, goal and category, and orphaned every historical `catId` | `f1ad55b` — four layers: seed the household doc on create, merge (union, existing wins) on join, adopt only plan fields the doc actually carries, and a `save()` guard that refuses to write an empty plan array over a non-empty one while still allowing an explicit delete |

### Still open, with evidence it is getting worse — re-verified 30 Aug

| Finding | First flagged | 25 Aug | 30 Aug |
|---|---|---|---|
| UTC/local date split — transactions land on the wrong day/month for Israeli users after midnight | 17 Aug | 63 sites | **67 sites** |
| `enablePersistence` with zero `.finally()` — root cause of "stuck screens": write promises never settle offline, busy flags never clear | 25 Aug | — | Open (13 busy flags, 0 `.finally`) |
| Goal contributions clipped at target; overflow silently destroyed | 17 Aug | open | Open |
| Deleting a stock silently rewrites cash balance; confirm copy says the opposite | 17 Aug | open | Open |
| "Redo Questionnaire" has no exit, survives force-quit, wipes budgets on completion | 25 Aug | — | Open |
| Accessibility — inputs with no label association | 17 Aug | 33 `aria-label` | 47/413 buttons; 0 `htmlFor`, 0 input `id` |

Plus two additions worth folding in from the 30 Aug pass: **Richard can
delete categories/folders bypassing the destructive-confirm UI** (only
`kind === "deleteTx"` gets the red treatment; category/folder deletes get
a mild orange card and skip re-homing/budget cleanup); and **household
invites fail silently** (`findInvites` lowercases the email, `firestore.rules:49`
compares it un-lowercased, permission-denied is swallowed by an empty
catch — the invited partner never learns an invite exists).

**Also still open from the original 08-18 version of this file** (not
re-verified with fresh line numbers by the 30 Aug audit, but not reported
closed either — treat as open until re-checked): debt-edit sets
`createdAt: undefined` and silently kills saving for the rest of the
session; `Activity.saveEdit` rebuilds transactions from scratch instead of
merging, dropping `opening`/`trip`/`catchUp`/`bizExpense`/`syncSource`
flags; boot splash has no timeout; `_stockGet`'s de-dup map never clears
on a hung fetch; Overview chart / 4 Profile rows / Richard's budget
context hardcoded to `$`; no undo on CSV import; savings-pot deletion
zeroes linked goals; investing accounts can't be deleted/renamed; business
"graduate" is one-way, wipes the roadmap, and Richard can trigger it
unconfirmed; account-deletion race can report failure after success and
silently recreate an empty account; App Store copy overstates RTL/
translation coverage (signup/onboarding/catch-up still have zero `tr()`
calls per the 30 Aug note that Investing/Business-CFO/Debts/Bank-Sync/most-
of-Profile still render raw English into an RTL document).

**What's genuinely solid** (30 Aug audit, stated because it narrows where
to look): no NaN/Infinity path anywhere (every division and `*100`
traced); float money handled correctly (`round2()` uses `Number.EPSILON`,
`parseImportAmount` handles European decimals/thousands/parenthesised
negatives); one currency formatter, 54-currency table, exactly one literal
`₪` in 2.2MB; client network layer well hardened (`callClaude`/`_stockGet`
both have AbortController + settle-once + hard deadline; `api/chat.js` has
its own 45s abort; boot has an 8s fallback); local AI fallbacks degrade
rather than dead-end; privacy.html names Anthropic explicitly including
image attachments, discloses the six processors and four external `api/`
hosts, covers Amendment 13 and cross-border transfer; `api/delete-account.js`
is well built (verified-token uid only, subcollections before parent,
handle released, batched at 400, `207 partial` rather than lying); rest of
`firestore.rules` is tight (`syncInbox` denies client writes, handles are
create-only, `profileStats` follower-gated, `list` denied) — `:60` is the
one loose rule.

**Why this is Tier 0, ahead of everything below:** you cannot grow toward
#1-on-the-App-Store on a bucket that leaks user data and overpromises a
feature that isn't there — and three audits in a row confirm it's still
leaking. Every hour on a new Tier 2/3/4 feature is an hour not spent
stopping active churn, review-bombing risk and (per the new items above) a
live regulatory exposure.

---

## TIER 1 — Table Stakes

### 1. Bank & Card Sync (Automatic Import) ⭐⭐⭐ — still not built (by design, cost-parked)
Real aggregator sync (Plaid / TrueLayer / Salt Edge) remains parked for cost
and compliance reasons. The demo-only version is now clearly labelled per
the 25/30 Aug audits, which closes the "actively hurts" problem the 08-18
version of this file flagged — the underlying cost decision is unchanged.

<details><summary>Original cost analysis (2026-06-23, still valid)</summary>

- Recurring per-user cost, not one-time — breaks the "build once, runs free"
  model (static hosting + Firebase free tier).
- Plaid ~$0.30/connected account/month + per-call fees, no real free
  production tier. TrueLayer/Tink/Salt Edge similar, often with monthly
  minimums.
- Regional fragmentation: no single aggregator covers Richy's real audience
  (India, Colombia, Turkey, Ghana, Brazil, Vietnam per sim) — would need 3-4
  provider contracts.
- Requires a backend to hold secrets (Richy is currently 100% client-side for
  this purpose).
- DECISION: CSV import covers ~80% of the value at $0 recurring. Only build
  real sync once there are paying users in validated regions.
</details>

### 2. Local Currency Support ⭐⭐⭐ — ✅ SHIPPED (2026-06-23)
50 currencies, correct symbols/decimals, searchable picker, FX fallback table.
Gap remaining: DKK-class edge currencies still missing per sim (Henrik); and
the Tier 0 hardcoded-`$` bugs undermine this everywhere they appear.

### 3. CSV / Statement Import ⭐⭐⭐ — ✅ SHIPPED (2026-06-23)
Auto-detects delimiter/columns/date format, entry-method preference in
onboarding. Gap: no undo/batch-id on import (Tier 0).

### 4. Automatic Categorization ⭐⭐⭐ — not built
Still the biggest sim ask after bank sync. Worth doing regardless of
bank-sync status, since it also helps CSV-imported data.

---

## TIER 2 — Major Differentiators

### 5. Couples / Shared Household Mode ⭐⭐⭐ — ✅ SHIPPED — **now has two P0 bugs, one brand new**
Shared budget + private logging, live sync, invite flow. Sim gap: onboarding
still asks single-income-first (Shira, Nadav both "flipped" once they found
the partner card). **New as of 30 Aug: creating/joining a household can wipe
budgets/goals/categories entirely — see Tier 0, NEW-1.** Also: the 25 Aug
stale-closure bug (dropped transactions) and the household-invite silent-fail
bug are both still open. This feature needs the Tier 0 save()-guard fix
before it gets promoted or surfaced any further.

### 6. Real Debt Payoff Tracker ⭐⭐⭐ — ✅ SHIPPED — has a P0 bug
Avalanche/snowball, real debt-free-date. The debt-edit save-killer (Tier 0)
lives in this feature — fix that before promoting debt tracker any further.

### 7. Recurring / Subscription Detection ⭐⭐ — partially built via Richard Watch
Richard Watch's fee/renewal/overlap/trial/drift detectors (shipped 30 Aug)
cover a meaningful slice of this — worth re-scoring against the sim's
"auto-categorization/subscription parsing" theme once the Overview redesign
that surfaces it is committed and re-simulated.

### 8. Bills & Due-Date Calendar ⭐⭐ — partially built via Richard Watch
The 30-day forecast / "Next 30 Days" screen covers upcoming known charges;
a dedicated calendar view is still not built.

### 9. Irregular / Variable Income Handling ⭐⭐ — partially addressed
Business accounts give freelancers a tax pot; true income smoothing /
buffer-month budgeting is still open (sim theme #2).

---

## TIER 3 — Specialized Segments

### 10. Business / Personal Separation ⭐⭐ — ✅ SHIPPED
Gaps per sim: no invoicing/VAT, no real P&L/payroll forecasting. Also has a
P0-adjacent bug: business "graduate" is one-way and wipes the roadmap, and
Richard can trigger it unconfirmed (Tier 0).

### 11. Remittance / International Transfer Tracking ⭐⭐ — not built

### 12. Investment & Net Worth Tracking ⭐⭐ — ✅ SHIPPED — **has lock-out bugs AND, per 30 Aug, an unlicensed-advice bug**
Portfolio tracking, net worth over time. Gaps: accounts can't be
deleted/renamed; deleting a stock silently rewrites cash with no disclosure
(Tier 0). **New as of 30 Aug: `investPlanOrders`/`investPlanFor` emit named
tickers, cash amounts and share counts from a suitability questionnaire,
outside the guardrail — see Tier 0, NEW-2. Treat this feature as blocked on
a product decision, not just a bug fix, before it's promoted further.**

### 13. Gross vs. Net Pay Education ⭐ — not built

---

## TIER 4 — Engagement & Retention Layer

### 14. Reports & Trends ⭐⭐ — not built
### 15. Smart Notifications ⭐⭐ — not built
### 16. Goals That Auto-Fund ⭐ — not built
### 17. Multi-Device + Web App ⭐⭐ — web app exists (this *is* the product); true multi-device sync state unverified
### 18. Offline-First + Performance ⭐ — offline-first shipped per store copy; unverified end-to-end. Tier 0's `.finally()`-less writes are the concrete bug hiding under this checkbox.

### 19. Motivation / Rewards Layer ⭐⭐⭐ — ✅ SHIPPED 2026-08-12–08-14 — **missing from this roadmap until today**
Streaks (weekly-confirm based, a broken streak described in neutral words
per the design doc), an XP/level system (`xpForLevel`/`levelFor`), a
**157-badge collection** across ~19 families with rarity tiers (common
through legendary-equivalent), and a social layer — public handles, a
follow graph, follow requests, a "find people" screen — all wired into a
rebuilt Profile screen (`d783e9b`, `0e2d17b`) with legal coverage for the
social/achievement surface added the same week (`92cedd3`). **This is the
literal, already-built answer to the brief's "we need to make it a brand
and build a system that awards the user for using us."** It has had zero
dedicated QA pass — none of the three 2026 QA audits scoped it — and the
Richy Launch Exposure Register artifact already flags the store-policy
risk around public achievements disclosing financial amounts (Play's
"never publicly disclose financial/payment data" rule). Recommend a
dedicated audit pass on this system before it's promoted in marketing.

### 20. Richard Watch — 24/7 Proactive Engine ⭐⭐⭐ — ✅ SHIPPED (engine + screens) 2026-08-30, **Overview integration IN PROGRESS, UNCOMMITTED**
The direct, already-built answer to the brief's "we need a full system
that works 24/7 to find the user's problems and solve them so they achieve
their goals." Nine detectors, 30-day forecast, Daily Brief, Goal-at-Risk
plan — see Current State Snapshot above for the uncommitted Overview
integration that puts this on the home screen for the first time. Caveat,
directly from the audit that shipped the same day: **it was built on top
of two known, still-open defects (the `ink3` contrast failure and the UTC
date bug) instead of after fixing them, and both got measurably worse
while it was being built.** Don't repeat that with the Overview
integration — land the Tier 0 items in the same window, not after.

---

## THE MOAT — Richard (the AI advisor)

Every simulated persona who commented on Richard praised the voice — this is
genuinely ahead of the category. Three things now bear on it:

- **The system-prompt injection hole is closed** (`b26496e`) — the LLM path
  is enforced server-side.
- **But a second, non-LLM advice surface was found open on 30 Aug** — the
  deterministic investing allocation engine (Tier 0, NEW-2). The guardrail
  needs to live where financial strings are *rendered*, not just at the API
  boundary, or this pattern will recur every time a new deterministic
  feature touches money advice.
- **The Overview redesign (uncommitted) is the first time Richard's
  proactive output — not just his chat — appears on the home screen.**
  This is the real test of "much more useful than a chat at the bottom of
  the screen." Once committed, re-run the nightly simulation and watch
  AI-usefulness specifically (5.1/10 baseline, pre-Richard-Watch,
  pre-motivation-layer, pre-redesign).

Push further once Tier 0 is closed: real natural-language data queries,
scenario modeling ("can I afford $1,500/mo rent"), and an expanded action
system (recurring bills, bulk recategorization).

---

## RECOMMENDED BUILD SEQUENCE (revised 2026-09-02, per the 30 Aug audit's "nine-day plan")

| Phase | Build | Rationale |
|-------|-------|-----------|
| **0. Stop the bleeding — 2 days** | Four one-line fixes (`T.ink3` hex, `apply5030 20` typo, `if (!r.ok)` before both `sw.js c.put()` calls, `firestore.rules:60` field pin) + the `save()` empty-array guard (closes NEW-1 and the 25 Aug stale closure in one change) + the functional-form fix for the stale closure | Under an hour of actual fix time for the four one-liners; the `save()` guard is the single highest-leverage change on the page |
| **1. Reversibility — 5 days** | One 10-second Undo toast pattern applied everywhere (replaces the "eight separate confirmation dialogs" approach); then goal-overflow clipping, the stock-delete cash rewrite + its false confirm copy, `onSaveFinancial` whole-key replace, routing Richard's category/folder deletes through the red destructive card | Converts the entire "dead end" complaint class into a non-issue in one change |
| **2. Stuck screens — 2 days** | One `localToday()`/`localMonth()` helper replacing all 67 UTC sites; `.finally()` on all 13 busy flags; `.catch()` + `saveError` banner on the sync-inbox write; AbortController on both `sendTest` copies | Fixes wrong-day/wrong-month and "the app won't respond" complaints together |
| **3. Decide, don't ticket** | NEW-2 (investing allocation engine) needs a product decision: strip amounts/share counts, or get licensed | Blocking on the moat, not just a bug |
| **4. Before submission** | Accessibility sweep (`htmlFor`/`id` on 90 inputs, `aria-label` on 413 buttons, 44px `JrIconBtn`); translate the five untranslated screen groups (Investing, Business/CFO, Debts, Bank Sync, most of Profile) | App Store Guideline 1.5 / Play accessibility concern, not just quality |
| **5. Add the missing signal** | Error telemetry — three audits in a row had to read 33,000+ lines by hand because there is no other signal; this is higher-leverage than any single bug fix | The 25 Aug report called this out and it's still true |
| **6. Only then** | Land the uncommitted Overview redesign and model-tier routing, re-run the nightly sim, decide on real bank sync once there's revenue | These are real progress but they are not what's currently costing trust |

---

## STRATEGIC READ (revised 2026-09-02)

The original brief asked for two specific things beyond the base product:
**"a full system that works 24/7 to find the user's problems and solve
them"** and **"a system that awards the user for using us."** Both are now
**built and shipped** — Richard Watch (30 Aug) and the motivation/rewards
layer (12-14 Aug). That's real progress, and it went unrecorded in this
file for three weeks in the second case.

But the pattern that keeps recurring — and the reason this file exists in
the shape it does — is that **new capability keeps landing ahead of
already-known defects, not after them.** Richard Watch shipped on top of a
contrast failure and a date bug that both got worse while it was being
built. The system-prompt guardrail closed one advice-leak path and missed
a second, structurally identical one sitting right next to it. The
motivation layer — genuinely well-designed, per its own doc — has had zero
QA attention in three audits. None of this is a reason to stop building;
it's a reason the sequence above puts a hard stop before the next feature,
not after it. **The fastest path to the north star is not a new build —
it's making Tier 0 actually reach zero, once, on purpose, before the next
thing ships on top of it.**


---

## NATIVE MIGRATION TRACK — SwiftUI iOS (folded in 2026-09-02 from a separate planning session)

A separate AI-assisted session has been scoping the native SwiftUI build in
parallel, outside this repo's own tracking. Folding its decisions and open
items in here so there's one place both tracks read from. **One real
contradiction with an existing decision was found doing this — see the
first bullet below — it needs Alon's confirmation, not a silent pick.**

**⚠️ Contradiction with the 2026-08-29 decision above, needs resolving:**
that decision (confirmed directly with Alon, not to be silently re-decided)
was Android on the *same* timeline as iOS for the 5 Oct launch. The native
planning session defaulted to **iOS-first, Android deferred to a later,
separate workstream** unless explicitly expanded. These can't both be true.
Given the 33-days-to-launch, zero-native-code-written state, iOS-first is
probably the more realistic path — but that's a call for Alon to make
explicitly, not something to resolve by picking whichever doc is newer.

**Decisions already locked (consistent with this file's earlier 08-27/08-29
entries, no conflict):**
- Build a real native SwiftUI app — not `WKWebView` wrapping the existing
  site.
- Keep the existing backend: Vercel APIs, Firebase Auth, Firestore,
  existing UIDs and existing data. No migration to Supabase or
  Clerk for launch convenience — either would be a separate, explicitly
  approved project. *(Corrected 2026-09-04: Firebase **Storage** is not
  used anywhere in this codebase — zero references in the client, the API
  routes or the HTML. Don't add the Storage SDK to the iOS project or
  declare it in privacy metadata.)*
- Keep the web client (richy-mgkl.vercel.app) operational throughout —
  native and web should authenticate as the same user against the same
  data, not fork into two products.
- Store account-holder structure: the account(s) will be held by someone
  other than the person building the app, who is added as an authorized
  team member rather than the account holder, with a plan to transfer the
  Apple Account Holder role directly once circumstances allow, and to set
  up a separate verified Google Play developer account for Android later
  via app transfer. **This doesn't change the entity-vs-individual analysis
  already in the Launch Exposure Register's Phase 0 item** — the same
  Apple 5.1.1(ix) / Play Organization-registration risk applies regardless
  of which individual holds the account, so that item's guidance stands
  as written.

**Proposed native MVP scope — PROPOSED ONLY, not yet checked against the
Tier 1-3 feature list above, needs Alon's confirmation before it's treated
as decided:**
- In scope: email/password auth (+ recovery, existing-account
  compatibility), Sign in with Apple / account linking if Google sign-in
  stays, dashboard + budget summary, transactions (view/add/edit), Richard
  chat with AI consent + visible AI-identification + report/flag controls,
  profile, data export, full account deletion, settings + legal links.
- Deferred by default (would need to be explicitly restored): couples/
  household mode, public handles/achievements/social layer, bank-
  notification importing, voice/synthetic audio, advanced investing/
  personalized-advice flows.
- **This proposed scope would defer both major Tier 2 differentiators
  (couples mode, Tier 19's motivation/social layer) out of the native MVP
  entirely** — worth flagging explicitly since both are fully built and
  live in the web app today. That's a legitimate scope-control call, but
  it's a product decision with real trade-offs, not a technical default.

**Target architecture (native client):** SwiftUI app calling the existing
Vercel API layer, with Firebase Auth (and, after the document split below,
Firestore) used directly — mirrors this repo's current client/server split,
just with a native client instead of the React web app. Built 2026-09-04 in
the folder shape Alon specified, under `RichyIOS/`: `App/` (entry point,
`AppState`, `AppServices`, root routing), `Features/<name>/` (Auth, Boot,
Home, Richard, Profile — views plus `@Observable` view models),
`Components/`, `Models/` (Codable account document), `Services/`
(Networking, Auth, Firebase, Chat, Account — protocol-backed, with
in-memory mocks so views never call Firebase/HTTP directly and every screen
previews offline), `DesignSystem/`, `Utilities/`. Anthropic credentials
stay server-side, as they already do; the native app ships zero secrets.

**Phase tracker (0 = access/prereqs, through 8 = post-launch/ownership
transition).** Currently at **Phase 2 — Native foundation (written, not
yet compiled)**.

- **Phase 0 — done.** Repo access is direct (the earlier "no access"
  blocker never applied here). Bundle id kept as `com.richy.app`, the id
  already in `capacitor.config.json`. Still owed by Alon before the Mac
  session: register the iOS app in Firebase project `richy-91667` and
  download `GoogleService-Info.plist`; confirm a Mac with Xcode 16.4+.
- **Phase 1 — done 2026-09-03/04, against commit `0f5d45d`.** Full audit
  of architecture, 41 routes, auth providers, Firestore schema and rules,
  7 API routes, 21 env vars, AI payload paths and open P0s, classified
  into keep / change / rebuild. Written up in the **Taking Richy Native**
  artifact: https://claude.ai/code/artifact/ea459fb7-651b-4b23-85cf-2ffcfe7fe1a5
  Two corrections to earlier records besides the Storage one above:
  `api/_prompts.js` is a complete server-side prompt registry with a
  `build()` function, but `api/chat.js` never calls it — it still takes
  `system` verbatim from the client and only appends `GUARDRAIL`, so the
  27 "You are Richard" prompts still live in the client; and the 25 Aug
  "server-side prompt registry" credit in the Tier 0 closed table is
  therefore only half true.
  **The one finding that gates every native write:** `users/{uid}` is a
  single document that `CLOUD.saveUser()` overwrites wholesale with
  `.set()` from React state. Two signed-in clients would clobber each
  other, which contradicts the "same user, same data" decision above. The
  split (`tx` and `richardChats` to subcollections, field-level
  `update()` on the parent, UUIDs instead of `Date.now()` ids) is backend
  work that needs no Mac and must land before the native app writes
  anything.
- **Phase 2 — in progress, 2026-09-04.** The SwiftUI foundation is
  written under `RichyIOS/` (56 Swift files, ~2,800 lines): app entry,
  session state, XcodeGen `project.yml` (iOS 17, Swift 5 mode,
  FirebaseCore + FirebaseAuth only), `APIClient` actor, `AuthService`
  (Firebase + mock), Keychain session record, Codable models for the
  account document, the design tokens ported from the web palette,
  loading/error/empty components, real sign-in/sign-up/reset screens, and
  a Profile with sign out and account deletion through
  `/api/delete-account`. It reads and writes **nothing** in Firestore.
  **Not yet compiled** — this machine has no Swift toolchain;
  `RichyIOS/README.md` is the Mac checklist. Do not mark Phase 2 done
  until a build has passed on the Mac.
- **Next (owner: Alon):** the Firebase iOS app registration and plist,
  then one Mac session: `xcodegen generate` → build → sign in with a test
  account. **Next (owner: AI, no Mac needed):** the document split above,
  then wiring `promptId` into `api/chat.js`.
- **Still open, unchanged:** the Android-timeline contradiction at the top
  of this section, and the PROPOSED-ONLY MVP scope. Both are restated in
  the artifact; neither blocks the foundation.

**Safe-build ground rules carried over, still binding:** no live account
creation, identity verification, store submissions, purchases, OAuth
authorization, or destructive-deletion testing without explicit
confirmation at the time; no real user financial data in any test/staging
work; Anthropic and other privileged credentials never move client-side.
