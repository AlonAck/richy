# Richy — Product Roadmap

> Single source of truth for "where does Richy actually stand." Read this
> instead of re-deriving state from the code every time.
>
> Sources this is built from: `reports/qa-audit-2026-08-17.md` (code-verified,
> file:line), `reports/security-review-2026-08-15.md`, `reports/richy-sim-latest.html`
> (10-persona simulation, post-fix run, 2026-07-27), `APP_STORE_LISTING.md`.
>
> Last updated: 2026-08-18. The previous version of this file (dated 2026-06-23)
> was stale — it listed debt tracker, couples mode, business accounts, CSV
> import, and investing as unbuilt. All five have since shipped. Don't trust
> feature checkboxes in this file either, without dating them — trust the
> reports/ directory and the live site first.

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

**Not shipped:** any live bank connection. "Sync your bank" on the Overview is
a demo-only Israeli-bank simulation (Leumi), not a real integration — see
Tier 0 below, this is currently doing more harm than good.

**Latest user-simulation result (2026-07-27, post-fix, 10 personas):**
impression 6.4/10, AI-usefulness 5.1/10, NPS 5.5, avg max-WTP $3.70/mo,
**60% kept / 40% gave up** — up from a 40%-kept baseline the same day, after
surfacing debt/partner/sync as quick-actions on Overview. Full data:
`reports/richy-sim-latest.html`.

Churn themes across the cohort (frequency = personas who named it):
1. **Bank sync / auto-import, incl. US Plaid — 5/10.** The single biggest
   driver of disappointment. The newly-surfaced "Sync your bank" card *raised*
   expectations, then broke them for anyone not on Leumi in Israel — an
   Israeli non-Leumi user and a US user both named this as their reason for
   giving up, almost verbatim.
2. **Irregular / dual-income onboarding — 4/10.** Freelancers and couples want
   income structure asked about during onboarding itself, not bolted on after.
3. **Auto-categorization / subscription parsing — 2/10.**
4. **Tax/VAT set-aside & invoicing — 2/10** (business persona).
5. **Currency & language localization gaps — 2/10** (DKK missing; Russian UI
   + reference-currency display wanted).
6. Single mentions: debt-first onboarding path, partner accountability
   nudges, business P&L/payroll depth, retirement/longevity projection,
   accessibility (text size, card density).

**Code-level state (QA audit, 2026-08-17, `budget-app.jsx` 27,646 lines):** the
app has several **silent data-loss bugs already in production** and the App
Store copy overstates RTL/translation coverage. This is more urgent than any
Tier 2-4 feature below — see Tier 0.

---

## TIER 0 — Fix before building anything new (P0/P1, code-verified 2026-08-17/15)

Full detail with file:line in `reports/qa-audit-2026-08-17.md` and
`reports/security-review-2026-08-15.md`. Do not re-derive these from scratch —
read those files.

**Silent data loss / lock-outs:**
- Editing a debt sets `createdAt: undefined`, which makes Firestore throw
  synchronously and **silently kills all saving for the rest of the session** —
  the UI stays green while nothing persists. Likely explains most "it lost my
  data" complaints.
- `Activity.saveEdit` rebuilds transactions from scratch instead of merging,
  dropping `opening`/`trip`/`catchUp`/`bizExpense`/`syncSource` flags —
  corrupts opening balance permanently on a no-op edit.
- Boot splash has no timeout — a stalled Firestore connection hangs forever
  with force-quit as the only escape ("the app won't open").
- `_stockGet`'s de-dup map never clears on a hung fetch — permanent spinners
  with no retry.
- Overview chart, 4 Profile settings rows, and Richard's budget context are
  all **hardcoded to `$`** regardless of the user's actual currency.

**Trust-breaking dead ends:**
- The Leumi demo sync writes fabricated transactions into the *real* ledger,
  invisibly, with no bulk-remove and no export label — this directly matches
  what the July simulation flagged as the #1 churn cause (see above).
- "Sync your bank · Auto-import transactions" on Overview promises something
  that doesn't exist for ~everyone who taps it. Two of four simulated
  quitters named this exact card.
- No undo on CSV import, savings-pot deletion silently zeroes linked goals,
  investing accounts can't be deleted/renamed, business "graduate" wipes the
  roadmap and **Richard can trigger it with no confirmation**.

**Security / regulatory:**
- **Richard's system prompt is fully client-controlled** — any user can send
  an arbitrary system prompt to your Anthropic key. This is both a cost/abuse
  hole and the reason the ISA-regulated "no personalized investment advice"
  boundary is currently unenforceable. This is the one item that's a direct
  hit against the north-star regulatory constraint — treat as blocking.
- Account-deletion race can report failure after it actually succeeded, then
  silently recreates an empty account (GDPR / App Store 5.1.1(v) exposure).

**App Store copy risk:**
- The listing claims "full right-to-left layout." Signup, onboarding, and the
  catch-up flow have **zero** translation calls, and RTL support is
  direction-only (no logical CSS, 101 hardcoded physical alignments). A
  Hebrew user's first ten minutes are English text in an RTL document. Fix:
  soften the store copy until the funnel is actually translated — one field,
  no build required, but do it before submission.

**Why this is Tier 0, ahead of every feature below:** you cannot grow toward
#1-on-the-App-Store on a bucket that's leaking user data and overpromising a
feature that isn't there. Every hour spent on a new Tier 2/3 feature right now
is an hour not spent stopping active churn and review-bombing risk. The QA
audit's "five to fix first" (debt-edit save-killer, saveEdit merge, boot
timeout, stock-fetch deadline, currency hardcoding) plus the bank-sync card
fix (B2) and the server-side prompt registry (security #5) are the actual
next build, full stop.

---

## TIER 1 — Table Stakes

### 1. Bank & Card Sync (Automatic Import) ⭐⭐⭐ — still not built (by design, cost-parked)
Real aggregator sync (Plaid / TrueLayer / Salt Edge) remains parked for cost
and compliance reasons — see the original cost analysis below, still valid.
**What changed:** the demo-only version now actively hurts more than it helps
because it's surfaced prominently with no scope-qualifier. Fix the card copy
(Tier 0) before revisiting whether to fund real sync.

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
onboarding. Gap: no undo/batch-id on import (Tier 0, B7).

### 4. Automatic Categorization ⭐⭐⭐ — not built
Still the biggest sim ask after bank sync (#3 theme). Merchant-name matching
with learn-from-correction. Worth doing regardless of bank sync status, since
it also helps CSV-imported data.

---

## TIER 2 — Major Differentiators

### 5. Couples / Shared Household Mode ⭐⭐⭐ — ✅ SHIPPED, needs onboarding integration
Shared budget + private logging, live sync, invite flow — all built. Sim gap:
onboarding still asks single-income-first; couples want combined-income
framing up front, not a bolt-on after signup (Shira, Nadav — both "flipped"
from would-give-up to kept once they found the partner card, meaning it
converts *if* found — the fix is visibility timing, not the feature itself).

### 6. Real Debt Payoff Tracker ⭐⭐⭐ — ✅ SHIPPED — has a P0 bug
Avalanche/snowball, real debt-free-date. **The debt-edit save-killer (Tier 0)
lives in this feature** — fix that before promoting debt tracker any further.

### 7. Recurring / Subscription Detection ⭐⭐ — not built
Ties directly to sim theme #3 (auto-categorization/subscription parsing).

### 8. Bills & Due-Date Calendar ⭐⭐ — not built

### 9. Irregular / Variable Income Handling ⭐⭐ — partially addressed
Business accounts give freelancers a tax pot; true income smoothing /
buffer-month budgeting is still open and is sim theme #2 (4/10 personas).

---

## TIER 3 — Specialized Segments

### 10. Business / Personal Separation ⭐⭐ — ✅ SHIPPED
Business accounts with cash/budgets/plan, runway, tax pot. Gaps per sim
(Eitan, still gave up): no invoicing/VAT handling, no real P&L/payroll
forecasting — the current build is closer to "personal budgeting reskinned"
than QuickBooks-lite. Also has a P0-adjacent bug: business "graduate" is
one-way and wipes the roadmap, and Richard can trigger it unconfirmed (Tier 0).

### 11. Remittance / International Transfer Tracking ⭐⭐ — not built

### 12. Investment & Net Worth Tracking ⭐⭐ — ✅ SHIPPED — has lock-out bugs
Portfolio tracking, net worth over time. Gaps: accounts can't be
deleted/renamed (permanent typo), and deleting a stock silently rewrites cash
balance with no disclosure of the delta (Tier 0, A7).

### 13. Gross vs. Net Pay Education ⭐ — not built

---

## TIER 4 — Engagement & Retention Layer

### 14. Reports & Trends ⭐⭐ — not built
### 15. Smart Notifications ⭐⭐ — not built
### 16. Goals That Auto-Fund ⭐ — not built
### 17. Multi-Device + Web App ⭐⭐ — web app exists (this *is* the product); true multi-device sync state unverified
### 18. Offline-First + Performance ⭐ — offline-first shipped per store copy; unverified end-to-end

---

## THE MOAT — Richard (the AI advisor)

Every simulated persona who commented on Richard praised the voice — this is
genuinely ahead of the category. But two things undercut it right now:

- **The system-prompt injection hole (Tier 0)** means the safety/regulatory
  guardrails you've written for Richard are advisory, not enforced — a
  modified client can override them entirely. This is the top blocker on the
  moat, not a feature gap.
- Push further once Tier 0 is closed: proactive unprompted insights, real
  natural-language data queries, scenario modeling ("can I afford $1,500/mo
  rent"), and an expanded action system (recurring bills, bulk
  recategorization).

---

## RECOMMENDED BUILD SEQUENCE (revised 2026-08-18)

| Phase | Build | Rationale |
|-------|-------|-----------|
| **0. Stop the bleeding (new, highest priority)** | QA audit's "five to fix first" (debt-edit save-killer, saveEdit merge, boot timeout, stock-fetch deadline, currency hardcoding) + bank-sync card copy fix + server-side Richard prompt registry | Active silent data loss, an overpromising card causing measured churn, and an unenforceable regulatory boundary — all worse than any missing feature |
| **1. Close the dead ends** | Demo-transaction labeling/removal, CSV import undo, destructive-action confirmations, investing account delete/rename | Same class of trust damage as Phase 0, lower severity |
| **2. Convert what's already built** | Surface couples mode earlier in onboarding (combined-income framing), variable-income/buffer-month budgeting, subscription/recurring detection | These are already-shipped or near-shipped capabilities being undersold — cheaper than new builds |
| **3. Store readiness** | Translate the signup/onboarding funnel (0% `tr()` coverage today), swap physical CSS for logical properties, soften RTL claim until done | App Store copy currently overstates what's true — 2.3 risk |
| **4. Real bank sync** | Only once there are paying users in validated regions (per original cost analysis) | Recurring cost model needs revenue first |
| **Throughout** | Richard as proactive, action-taking advisor | The defensible moat — but only once the prompt hole is closed |

---

## STRATEGIC READ (revised)

The June assessment — "design and Richard are ahead of market, plumbing is
the gap" — is still directionally true, but the plumbing gap has changed
shape. Most of Tier 1-3 got built. What's now costing trust is quality, not
absence: features that silently lose data, a sync card that overpromises, and
regulatory guardrails that live only in the browser. **The fastest path to
the north star right now is not a new feature — it's making the app trust-
worthy at what it already claims to do**, then converting the couples/
debt/business builds that are underperforming their sim potential because
they're hard to find or half-tested.
