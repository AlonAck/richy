# Richy — Product Roadmap to a 100/100 App

> The complete list of features Richy needs to go from its current state
> (20% retention, 3–5/10 AI usefulness in 10-persona simulation) to a
> market-leading personal finance app.
>
> Evidence base: the user-simulation reports in `/reports/` (10 personas,
> 8 of 10 churned) + current category leaders (YNAB, Monarch, Copilot,
> Rocket Money, Empower).
>
> Last updated: 2026-06-23

---

## Scoring legend
- ⭐⭐⭐ = Churn-causing. Users quit *specifically* because this is missing.
- ⭐⭐ = Major differentiator. Turns keepers into advocates.
- ⭐ = Expands addressable market / engagement.

---

## TIER 1 — Table Stakes (why users churned)

### 1. Bank & Card Sync (Automatic Import) ⭐⭐⭐
The single biggest gap. Chloe and Beatriz quit because Richy is 100% manual entry.
- Connect via aggregators: Plaid (US/CA/UK/EU), TrueLayer / Tink (Europe),
  Salt Edge (global), regional providers for India / Africa.
- Auto-pull transactions, balances, credit cards, loans.
- Turns Richy from "a diary you maintain" into "a dashboard that maintains itself."

**COST ANALYSIS (parked 2026-06-23 — revisit in Phase 2, do not build yet):**
- This is a RECURRING per-user cost, not a one-time build. Breaks Richy's current
  "build once, runs free" model (static hosting + Firebase free tier).
- Plaid: ~$0.30 / connected account / month for Transactions + per-call fees. No
  real free production tier. 1k users × 2 accounts ≈ $600/mo, scaling linearly.
- TrueLayer/Tink (UK/EU) and Salt Edge (global) similar; Salt Edge tends to have
  monthly minimums (hundreds of $/mo).
- Regional fragmentation: NO single aggregator covers Richy's real audience
  (India, Colombia, Turkey, Ghana, Brazil, Vietnam per sim). Plaid weak/absent in
  most. Would need 3–4 providers, each its own contract + integration.
- Compliance/legal: handling bank tokens requires security review, real privacy
  policy, data-handling obligations; some providers gate production access on this.
- Maintenance: connections break constantly (bank auth/MFA changes) → ongoing
  support burden, not a finished feature.
- Architecture: cannot call Plaid from browser. Requires a backend (Firebase
  Functions) to hold secrets + exchange tokens. Richy is currently 100%
  client-side — this adds real infrastructure.
- DECISION: CSV import (shipped) covers ~80% of value at $0 recurring + no
  compliance burden. Only build sync once there are paying users (subscription to
  cover per-user fee) AND validated which regions real users are in (to pick the
  right aggregator).

### 2. Local Currency Support ⭐⭐⭐  ✅ SHIPPED (2026-06-23)
**#1 missing feature in the simulation — 8 of 10 personas needed it**
(INR, COP, TRY, GHS, BRL, VND, AUD, PLN). No longer forces USD/EUR/GBP proxies.
- DONE: Currency list expanded 5 → 50 (all sim currencies + majors + big
  economies). Each has a UNIQUE symbol (dollar/yen families use A$, C$, CN¥, etc.
  because the app keys the active currency by symbol), a display name, and a
  minor-unit `dec` field. Stored in `CURRENCY_OPTIONS` with derived `SYM_TO_CODE`
  and `SYM_TO_DEC`.
- DONE: Correct decimal rules — `fmtCur` now respects per-currency digits
  (¥1,500 and ₫250,000 with no decimals, KD12.345 with 3, $1,234.50 with 2).
- DONE: Searchable currency picker in Settings (filter by code/name/symbol,
  shows symbol + code + country name).
- DONE: Foreign-currency expense chips no longer break with the long list —
  curated common set, horizontally scrollable, always includes main + selected.
- DONE: Live FX stays on frankfurter.dev (no new API). Offline `FX_FALLBACK`
  table expanded to all 50 currencies, so cross-currency conversion works even
  for currencies outside frankfurter's ECB set (COP, GHS, VND, NGN, etc.).
- **Achieved the cheapest high-impact win: no third-party dependency added.**
- STILL TODO (deferred): true multi-currency *accounts* (holding balances in
  several currencies at once) — current model is one main currency + per-expense
  foreign amounts. Currency selection during onboarding (today defaults to $,
  changeable in Settings).

### 3. CSV / Statement Import ⭐⭐⭐  ✅ SHIPPED (2026-06-23)
Fallback for banks the aggregator doesn't cover. Upload CSV, auto-map columns.
Critical for the long tail of international banks.
- DONE: Activity tab → import button. File picker OR paste. Auto-detects delimiter
  (comma/semicolon/tab), columns (date/amount/description), header row. Handles
  US & European number formats, quoted fields, parentheses-negatives. Date format
  toggle (DMY/MDY). "All rows are expenses" mode. Auto-categorizes by merchant
  keywords. Preview with money-in/out totals before importing.
- DONE: Entry-method preference (Manual default vs CSV import). Asked on the
  plan-ready screen at signup, changeable in Profile > Adding transactions.
  When set to "import" the Activity import button becomes primary and the empty
  state leads with import. Stored as `entryMethod` on the user doc.
- STILL TODO: OFX/QIF formats, duplicate detection against existing transactions,
  remembering column mappings per bank.

### 4. Automatic Categorization ⭐⭐⭐
Once transactions flow in, they must self-sort. Merchant-name → category matching,
with one-tap correction the app learns from. Without this, sync is just a different chore.

---

## TIER 2 — Major Differentiators

### 5. Couples / Shared Household Mode ⭐⭐⭐  🚧 PHASE 1 SHIPPED (2026-06-23)
Linh & husband downloaded Richy *specifically* to merge two incomes and left when it couldn't.
Chosen model: couples/household with **shared budget + private logging** (joint
ledger, but each person can keep specific transactions off the shared pot).

**Architecture (key constraint):** Firestore security is document-level, so PRIVATE
data can never live in the shared doc. Design:
- `households/{hid}` — shared budgets, goals, categories, shared transactions
  (each tagged with who paid). Both members read/write it.
- `users/{uid}` — each person's private transactions + personal settings. Never
  leaves their own doc. App shows the union (shared + my private).

- DONE (Phase 1 — the household *space*): `households` collection + CLOUD methods
  (create / loadHousehold / subscribeHousehold via onSnapshot / findInvites /
  inviteToHousehold / cancelInvite / acceptInvite / leaveHousehold / saveHousehold).
  Invite-by-email + accept flow. `CollabView` in Profile → Collab: create household,
  invite by email, see members + pending invites, accept invites addressed to you,
  leave. Live member list via onSnapshot. `householdId` persisted on user doc.
- DONE: firestore.rules updated with `households/{hid}` block (members read/write;
  invited email can read+accept). **USER MUST PUBLISH the updated firestore.rules
  in Firebase console → Firestore → Rules → Publish, or Collab will permission-deny.**
- ⚠️ NOT YET TESTED end-to-end — needs two real accounts + published rules; the
  preview login gate blocks cross-account testing. Phase 1 verified compile + render only.
- DONE (Phase 2 — shared data + private logging): loadData now merges shared
  (budgets/goals/categories/shared-tx) from household doc with personal data
  (all txs including private ones) from user doc. save() now splits: shared txs
  go to households/{hid}, personal txs stay in users/{uid}. Each tx has `shared`
  (bool) and `owner` (uid) fields. Activity form shows "Share with partner"
  toggle + member picker (who paid) when in a household. Phase 2 NOT tested
  end-to-end — needs published rules + two accounts to confirm merge/split works.
- DONE (Phase 3 — live sync): separate subscription effect on households/{hid} for
  shared budgets/goals/categories/tx. When partner edits any of those, the app's
  state updates immediately without a reload. Household membership changes (members,
  invites) also live via onSnapshot. Conflict handling (last-write-wins via Firestore)
  deferred to future hardening pass. ⚠️ Phase 3 also NOT tested end-to-end.
- TODO: Richard awareness of household context (give advice on joint finances).
  Conflict resolution UI for edge cases (simultaneous edits, deletion by one user
  while other is editing).
- Monarch's killer feature — a whole market segment.

### 6. Real Debt Payoff Tracker ⭐⭐⭐
Kwame came only for this and left. A static "Total Debt" number is useless.
- Log each debt with interest rate, minimum payment, balance.
- Avalanche vs. snowball projection with a real debt-free-date countdown.
- Progress visualization. Richard already *talks* avalanche/snowball — let users *track* it.

### 7. Recurring / Subscription Detection ⭐⭐
Auto-detect recurring charges, surface a subscriptions dashboard, flag price hikes
and forgotten trials. Rocket Money built a business on this alone.

### 8. Bills & Due-Date Calendar ⭐⭐
Upcoming bills, reminders before due dates, "safe to spend" after what's owed.
Prevents overdrafts.

### 9. Irregular / Variable Income Handling ⭐⭐
Tomasz (freelancer, one of the only keepers) needs this.
- Income smoothing / averaging.
- "Buffer month" strategy (live on last month's income — the YNAB method).
- Variable-income-aware budgets.

---

## TIER 3 — Specialized Segments

### 10. Business / Personal Separation ⭐⭐
Beatriz (bakery owner) left — no way to separate business from personal money.
- Tag transactions business vs. personal.
- Basic profit/loss view, supplier/COGS categories.
- NOTE: consider a separate product. Don't half-build it.

### 11. Remittance / International Transfer Tracking ⭐⭐
Yusuf sends money home to Turkey — his biggest "expense" isn't really spending.
- Dedicated transfer type that locks the exchange rate, shows what recipient *receives*.
- Recurring family-obligation category.

### 12. Investment & Net Worth Tracking ⭐⭐
- Link brokerage / retirement accounts, track portfolio value.
- True net worth (assets − liabilities) over time, not just transaction sums.
- Graduates users from "budgeter" to "wealth tracker" (Monarch / Empower territory).

### 13. Gross vs. Net Pay Education ⭐
Yusuf was shocked by his German net pay. A small "understand your payslip" tool
(taxes, deductions explained) — cheap to build, sticky for new earners / immigrants.

---

## TIER 4 — Engagement & Retention Layer

### 14. Reports & Trends ⭐⭐
Month-over-month, year-over-year, spending heatmaps, category trends, cash-flow forecasting.
"Where did $9k go last quarter?" (Chloe's exact question) must be answerable in two taps.

### 15. Smart Notifications ⭐⭐
Proactive, not nagging: "80% through Food budget with 10 days left,"
"Unusual $400 charge," "On track to hit your goal early."

### 16. Goals That Auto-Fund ⭐
Make existing Goals automatic: round-ups, scheduled auto-contributions,
"pay yourself first" transfers.

### 17. Multi-Device + Web App ⭐⭐
Currently single-device. Real sync across phone, tablet, web is baseline expectation.

### 18. Offline-First + Performance ⭐
Works without signal, syncs later. Speed is a feature.

---

## THE MOAT — Richard (the AI advisor)

No competitor has a genuinely good conversational advisor. This is Richy's real edge.
Foundation already built this session: context-aware (knows user's core problem),
honest about app limits, and able to ACT on the app (log expenses/income, set budgets,
create goals via confirmation cards).

Push further:
- **Proactive insights** — Richard surfaces things unprompted ("Your dining out doubled").
- **Natural-language queries** — "How much on coffee since January?" → real answer from real data.
- **Scenario modeling** — "Can I afford $1,500/mo rent?" → run against actual cash flow.
- **Expand the action system** — recurring bills, goal adjustments, bulk recategorization.

---

## ALREADY SHIPPED (this improvement cycle, 2026-06-23)
- Onboarding "What's your biggest financial challenge?" discovery step (`coreProblem`).
- Core problem flows into onboarding plan, monthly analysis, and plan chat.
- Richard personalizes advice to the user's stated challenge.
- Richard is honest about app limits (no bank sync, couples, debt calc, business).
- Monthly analysis sends detailed budget data (per-category actual vs. limit, goals).
- Richard can update the app from chat (expense / income / budget / goal / goalAdd)
  with a confirmation card + clear in-chat heads-up before any change.

---

## RECOMMENDED BUILD SEQUENCE

| Phase | Build | Rationale |
|-------|-------|-----------|
| **1. Stop the bleeding** | Currency support → CSV import → debt tracker | Cheapest wins, recover churned personas, no 3rd-party dependency |
| **2. Go mainstream** | Bank sync + auto-categorization | Expensive (aggregator cost/compliance) but it's the price of entry |
| **3. Differentiate** | Couples mode + subscription detection + reports | Turn keepers into advocates |
| **4. Expand** | Investments, business mode, remittance | New market segments |
| **Throughout** | Richard as proactive, action-taking advisor | The defensible moat |

---

## STRATEGIC READ
Richy's design and AI advisor are already ahead of the market — every simulated user
praised the look and Richard's voice. What loses them is **plumbing**: no sync, no local
currency, no real debt/couples/business support.

**Fastest highest-impact first move: Local Currency Support** — #1 gap, no third-party
integration, unblocks the most personas at once.
