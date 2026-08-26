# Build prompt for Claude Code — Richy retention + discoverability (v1.0 submit build)

Paste this whole file into Claude Code at the repo root
(`C:\Users\ackal\Downloads\Budget App\Budget App`), or run
`claude "$(cat CLAUDE_CODE_BUILD_PROMPT.md)"`.

---

## 0. Read these five files before writing any code

1. `RETENTION_PLAN_2026-08-19.md` — why bank sync is dead for v1.0, and Layers 1-5
2. `DISCOVERABILITY_PLAN_2026-08-19.md` — Layer 6, full spec
3. `reports/qa-audit-2026-08-17.md` — Tier 0 bugs, code-verified with file:line
4. `ROADMAP.md` — current state snapshot, don't rebuild anything already shipped
5. `budget-app.jsx` itself — this is a single 29,000+ line file. Every line number
   below was correct as of the Aug 19 2026 audit; **re-verify with grep before
   editing**, the file moves.

Do not re-derive strategy from scratch. The two plan docs are the product
decisions; your job is implementation. If something in this prompt conflicts
with what you find in the code, trust the code and flag the conflict rather
than guessing.

---

## 1. Non-negotiable build order

Work through these phases **in order**. Do not start a phase until the previous
one is done and the app boots cleanly. Each phase should be its own commit (or
small set of commits) with a clear message, so this is reviewable incrementally.

| Phase | Content | Why it's gated |
|---|---|---|
| **1** | Tier 0 bug fixes (Section 2) | Everything downstream is worthless if the ledger silently loses data |
| **2** | Layer 5 — delete the Leumi demo sync card (Section 4) | Must be gone before Layer 6 promotes anything, or you're promoting the lie |
| **3** | Layer 1 — materialize recurring + onboarding rework (Section 3) | The core fix; biggest single win |
| **4** | Layer 4 — daily safe-to-spend (Section 5) | Small, high-leverage, no dependencies once Layer 1 exists |
| **5** | Layer 2 — quick-add promotion (Section 6) | Depends on nothing above but is lower priority than 1/4/5 |
| **6** | Layer 3 — weekly close + statement-parse share extension (Section 7) | Statement parse is the highest-effort item; do it last so simpler wins ship first if time runs out |
| **7** | Layer 6 — discoverability (Section 8) | Explicitly depends on Phase 2 (nothing to promote until the lie is gone) and Phase 1 (don't promote features with open bugs) |
| **8** | Hebrew `tr()` coverage pass (Section 9) | Touches strings introduced in every phase above — do it last, once, not per-phase |

**If you run low on time or budget, stop after any complete phase and report
status.** Do not leave a phase half-done — an incomplete Layer 1 (recurring
posts but no confirm UI, e.g.) is worse than not starting it, because it changes
balances without the user's awareness.

---

## 2. Phase 1 — Tier 0 fixes

Full detail with file:line is in `reports/qa-audit-2026-08-17.md`. Do not
re-diagnose — that report is code-verified. Fix, in this order:

1. **Debt-edit save-killer.** Editing a debt sets `createdAt: undefined`, which
   makes Firestore throw synchronously and silently kills all saving for the
   rest of the session. Find the debt-edit path and ensure `createdAt` is never
   overwritten with `undefined` — preserve the original value or omit the key
   entirely rather than setting it to `undefined`.
2. **`Activity.saveEdit` merge bug.** It rebuilds the transaction object from
   scratch on edit instead of merging, dropping `opening`/`trip`/`catchUp`/
   `bizExpense`/`syncSource` flags. Fix to merge onto the existing object
   (`Object.assign({}, existingTx, editedFields)` or equivalent) so untouched
   flags survive.
3. **Boot splash has no timeout.** A stalled Firestore connection hangs forever
   with force-quit as the only escape. Add a timeout (8-10s is reasonable) that
   falls through to an error state with retry, not an infinite spinner.
4. **`_stockGet`'s de-dup map never clears on a hung fetch.** Permanent spinners
   with no retry. Add a timeout/cleanup so a hung request eventually clears the
   dedup entry and allows retry.
5. **Hardcoded `$` in 4+ places** — Overview chart, 4 Profile settings rows,
   Richard's budget context. Replace with the user's actual currency symbol
   (there's already a working `mainSym`/currency-symbol mechanism used
   elsewhere in the file — reuse it, don't reinvent).
6. **Richard's system prompt is client-controlled.** Any user can send an
   arbitrary system prompt to the Anthropic key. Move prompt construction
   server-side (a prompt registry/endpoint the client cannot override) so the
   ISA "no personalized investment advice" guardrail is actually enforced, not
   advisory. This is a security fix as much as a regulatory one — treat as
   blocking.
7. **Account-deletion race** can report failure after actually succeeding, then
   silently recreates an empty account. Fix the race so success/failure state
   is checked once, atomically, after the operation settles.

**Acceptance for Phase 1:** manually reproduce each of the 7 bugs against
current `main` first (confirm they still exist — the QA audit is from Aug 17,
two days old), then verify each is fixed. No regressions in debt tracker,
Activity edit, boot flow, investing, currency display, or Richard chat.

---

## 3. Phase 3 — Layer 1: make `repeat` real

### 3a. Materialize recurring transactions

**The bug:** `repeat: "monthly"` / `"weekly"` on a transaction is currently
decorative. `detectRecurring()` (~L9743) reads it only as a hint for the
subscriptions report. The Activity row renders it as a badge (~L10706). Nothing
generates the next occurrence.

**Build:**
1. A `materializeRecurring(tx, today)` function, run on app boot (find where
   `tx` state is loaded/hydrated — near `loadData()`, search for
   `dismissedTips` state initialization at ~L27751 as a landmark, the tx-loading
   logic is nearby in the same component).
2. For every transaction where `repeat === "monthly"` or `"weekly"`, and no
   more recent occurrence with `recurredFrom` pointing at it exists, post the
   next occurrence(s) up to `today`. New fields: `recurredFrom: <sourceTxId>`,
   `pending: true`.
3. **Critical: post as `pending: true`, not settled.** Verify these balance
   calculations exclude `pending` before relying on it (spot-checked, should
   still hold, re-verify): lines ~1761, ~7914, ~12181, ~20670, ~21950 — all
   filter on `!t.pending`. Richy must never assert money moved that it hasn't
   confirmed.
4. **Idempotency:** key materialization on `recurredFrom + period` (e.g. the
   target month/week) so a double boot, or the same day loading twice, can't
   duplicate a posting. Check for an existing tx with the same
   `recurredFrom` + period before inserting.
5. One Overview card/section: **"3 הוצאות קבועות נכנסו החודש. הכול נכון?"**
   ("3 recurring items posted this month. All correct?") — tap to confirm all
   at once (flips `pending` → settled for the batch), or expand to adjust one
   amount before confirming. Reuse existing pending-transaction UI patterns if
   present rather than building new components from scratch.

### 3b. Onboarding rework

Current onboarding (`OnboardingScreen`, starts ~L6945) has:
- `STAGES` array (~L6938-6941): `Teenager / Student / Working / Parent`,
  rendered as a picker at `qIndex === 2` (~L7354-7368).
- A single **"Monthly income"** `QuickAmount` field at `qIndex === 4`
  (~L7386-7389).
- A **"Monthly essentials"** `QuickAmount` field at `qIndex === 5`
  (~L7391-7394) — this may be a usable hook for the new fixed-costs step;
  evaluate whether to extend it or replace it.
- A mirrored "edit financial info" screen later in the file (~L26081-26104)
  that duplicates this same life-stage/income/essentials shape — **update
  both places**, or better, extract a shared component if the duplication
  makes that easy without a large refactor.

**Changes:**

1. **Add life-stage options.** Extend `STAGES` with at minimum: freelancer/
   self-employed (עצמאי/פרילנסר) and retired (גמלאי). Consider "relocating
   abroad" if it fits the existing card layout without crowding. This closes
   sim theme: 4/10 personas in the Aug 19 run hit missing options here.
2. **Replace the single "Monthly income" step** with an income *type* choice:
   **"קבועה"** (fixed) or **"משתנה"** (variable). If fixed, keep the existing
   amount entry. If variable, skip amount entry entirely — this is the flag
   that later suppresses any auto-posted income line. Store as
   `incomeType: "fixed" | "variable"` alongside the existing `income` field.
3. **Replace or extend "Monthly essentials"** with a fixed-costs picker:
   tappable Israeli preset chips (שכר דירה, ארנונה, חשמל, מים, ועד בית, סלולר,
   אינטרנט, ביטוח בריאות, ביטוח רכב, דלק/רב-קו, חדר כושר, נטפליקס/ספוטיפיי,
   הוראת קבע לחיסכון, החזר הלוואה), each with an amount field. On selection,
   create a transaction per chip with `repeat: "monthly"` so Phase 3a's
   materializer picks them up automatically from day one. This is the piece
   that actually delivers "90 seconds of setup buys a year of not typing" —
   don't skip it in favor of just relabeling the essentials field.
4. Add the new `en`/`he`/`ar`/`ru` translation keys for all new copy (see
   Phase 8 — but add the keys now, alongside the feature, don't defer the
   *keys themselves*, only the full-file translation sweep is deferred).

**Acceptance for 3a+3b:** create a transaction with `repeat: "monthly"`,
advance the system clock (or fake `today`) by 32 days, reload, confirm a new
pending transaction appears with correct `recurredFrom` linkage and does not
affect settled balance until confirmed. Complete onboarding as a new user,
verify fixed-cost chips create `repeat: "monthly"` transactions that appear in
the confirm card next month. Complete onboarding choosing "משתנה" income,
verify no income transaction is auto-posted.

---

## 4. Phase 2 — Layer 5: delete the Leumi demo sync

1. Remove the `sync` entry from the tips array in `Overview` (~L8353,
   `{ id: "sync", icon: "refresh", title: "Sync your bank", ... }`).
2. Remove or fully gate off the Leumi DEMO simulation feature — the one that
   writes fabricated transactions into the real ledger. Find all writes tagged
   with the demo-sync source (search for how it's labeled/tagged, likely near
   `syncInbox` or a demo-specific source string) and remove the entry points
   that create fake transactions. Do not remove the real Leumi Open Banking
   OAuth pipeline described in `LEUMI_FINTEKA_SETUP.md` if it's cleanly
   separated and inert (it requires env vars that presumably aren't set) —
   confirm it's genuinely dormant before deciding whether to touch it at all;
   if unsure, leave that pipeline alone and only remove the DEMO/simulation
   path.
3. Any existing fabricated demo transactions already in a test/dev account
   should have a one-time cleanup path, but do **not** silently delete real
   user transactions in production data — if you can't distinguish demo tx
   from real ones reliably, leave existing data alone and just stop generating
   new fake transactions.

**Acceptance:** the "Sync your bank" tip no longer appears anywhere. No code
path can write a fabricated transaction into `tx`/`syncInbox` from the demo
flow. The app doesn't reference "DEMO" bank sync in any user-facing copy.

---

## 5. Phase 4 — Layer 4: daily safe-to-spend

1. Add a new hero stat to Overview, above or alongside the existing
   `leftToSpend` (period figure, ~L9179 and ~L13455 — leave that one alone,
   it's a different, valid metric).
2. Formula: `(income − fixed costs − goal contributions − spent so far) ÷ days
   remaining in the current period`. Reuse the `perDay` math pattern already
   working in the Trips feature (~L12544) as your reference implementation —
   same shape of calculation, new context.
3. Label: **"בטוח להוציא היום"** with the number beneath, same visual weight
   class as the existing hero numbers on Overview.
4. Must update live as transactions are logged in the current session, not
   just on reload.
5. **ISA guardrail:** this is a budgeting calculation on the user's own data,
   not investment advice — safe to ship without extra disclaimers. Do not let
   this number or its surrounding copy suggest investing the "safe to spend"
   surplus; keep it purely about today's spending permission.

**Acceptance:** log a transaction, confirm the number updates without reload.
Verify it goes negative gracefully (don't clamp to zero silently — a negative
"safe to spend" is itself useful information, style it distinctly e.g. in red
rather than hiding the fact).

---

## 6. Phase 5 — Layer 2: quick-add promotion

1. Move (or duplicate with a shared data source) the top 4-6 `quickPicks`
   items (comment at ~L10188, currently only usable inside the add-transaction
   sheet via `fillFromPick()`) onto the Overview screen directly as tappable
   chips.
2. **Single tap = logged immediately** — not pre-filled into a form requiring
   another Save tap. Use the existing transaction-creation path (same shape as
   `tx` objects built at ~L10258) with category from `suggestCatId()` (already
   working, reuse as-is).
3. Show a toast confirming the log with an **undo** action (find/reuse any
   existing toast/undo pattern in the file before building a new one).
4. Long-press (or a small edit affordance) opens the full add-transaction form
   pre-filled, for when the user wants to adjust amount/date before saving —
   preserve the existing `fillFromPick()` behavior as the long-press path.

**Do not attempt iOS App Intents / Siri shortcuts or a home-screen widget in
this pass** — those require native Capacitor/Swift work outside this
JS-file's scope and are explicitly v1.1-acceptable per the plan. Skip them
unless you have separately confirmed native tooling is set up for this
repo.

**Acceptance:** tap a quick-pick chip on Overview, confirm a transaction is
created with correct amount/category/date=today, toast appears with working
undo, balance updates immediately.

---

## 7. Phase 6 — Layer 3: weekly close + statement parse

### 7a. Weekly close ("סגירת שבוע")

1. One screen/modal, opened from a new Overview entry point, on a user-chosen
   day (default to a sensible day, e.g. Sunday for Israel, configurable in
   Profile).
2. Step 1: show and let the user confirm the recurring items that posted this
   week from Phase 3a's materializer.
3. Step 2: reuse the existing `catchUp` primitive (`cuBallpark` /
   `cuQuickTotal` / `cuByCategory`, transaction-creation logic around
   ~L6532-6544) — currently only used during onboarding's catch-up flow. Wire
   the same functions to run on a weekly cadence instead: **"עוד משהו שלא רשמת
   השבוע?"** A single ballpark number is a valid, complete answer. Tag the
   resulting transaction(s) `catchUp: true` exactly as the onboarding flow
   already does, so it's excluded from category-level analytics but included
   in balance.

### 7b. Statement-screenshot import (iOS Share Extension)

This is the highest-effort item in the whole prompt and touches native code.
Scope it carefully:

1. If this repo does not already have a working iOS Share Extension target set
   up in the Capacitor/native project (check `native/`, `capacitor.config.json`,
   and `NATIVE_BUILD.md` first), **stop and report back** rather than
   attempting to scaffold a new Xcode target blind — that needs Alon's Mac/
   Xcode environment, not something to guess at from this JS file alone.
2. If the native scaffolding does exist, the extension should accept a shared
   image (screenshot of a card statement, or a long-press-shared SMS thread),
   hand it to Richard/the LLM for parsing into a list of proposed
   transactions, and present them for one-tap bulk confirm before writing to
   `tx`. Mirror the CSV import's existing duplicate-detection approach if one
   exists (check for it near the CSV import code) rather than building fresh
   dedup logic.
3. **Do not send raw financial screenshots to any endpoint without going
   through the same LLM pathway Richard already uses** — no new third-party
   service, no new data flow that hasn't been through the same privacy
   review as existing features.

**If 7b can't be completed in this pass (likely, given the native-tooling
dependency), ship 7a alone and clearly report 7b as deferred, not attempted
silently.**

---

## 8. Phase 7 — Layer 6: discoverability

Full spec is in `DISCOVERABILITY_PLAN_2026-08-19.md` Sections 4-8. Condensed
build spec:

### 8a. Tier 0 placement pass (do this first within Phase 7 — highest value per hour)

Make these features visibly present where they belong, with **no card, no
badge, no promotion** — just findable:
- Statement/CSV import: a clear button in Activity's empty state (not just
  buried in a menu).
- Business, Investing, Trips: visible entries in Profile nav if not already.
- Rename **"CSV import" → "העלאת פירוט מהאשראי"** everywhere it appears in
  UI copy (Activity tab, onboarding's entry-method preference, any settings
  reference) and in Richard's system prompt (~L15243 already describes the
  capability — update the description text to match the new name, keep the
  underlying function names as-is unless trivial to rename).

### 8b. Data model

Add three new fields alongside the existing `dismissedTips` array (state
declared ~L27751, persisted via `save()` ~L28120, same pattern):

```js
shownCount:       {},   // { debts: 2, statement: 1 }
lastSuggestionAt: "",   // ISO date of the last NEW suggestion shown
quietUntil:       "",   // ISO date; system fully silent until then
```

Plus one transient, in-memory-only counter (not persisted):
`consecutiveDismissals` (resets to 0 on any tap-through).

### 8c. `pickSuggestion()`

Replace the static `tips` array (~L8353-8358, already reduced by Phase 2's
removal of the `sync` entry, and note `debts`/`collab`/`trip` — demote `trip`
to Tier-0-only per the plan, drop it from this array entirely) with a
`SUGGESTIONS` array of shape `{ id, icon, titleKey, subKey, used(ctx), trigger(ctx), go() }`
and a `pickSuggestion(ctx)` function implementing:

1. Gate: if `quietUntil` is set and in the future, return null.
2. Gate: if `lastSuggestionAt` was fewer than 7 days ago, keep showing whatever
   is currently active rather than picking a new one.
3. Otherwise filter `SUGGESTIONS` by: not `used(ctx)`, not in `dismissedTips`,
   `shownCount[id] < 3`, and `trigger(ctx)` is true. Return the first match by
   priority order (see trigger table below), or null.

Trigger rules, priority order:

| # | id | Trigger |
|---|---|---|
| 1 | `statement` | 0 transactions logged in 4 days, OR weekly close shows a gap >25% of expected recurring total |
| 2 | `debts` | Running balance negative twice in 30 days, OR a tx label matches `הלוואה\|מינוס\|החזר\|אשראי` |
| 3 | `collab` | (keep existing `used` check — already good) |

Ship only these two new triggers (statement, debts) plus the existing `collab`
tip if time is short — this matches the plan's cut line. Business, investing,
and trips triggers from the plan doc are lower priority; implement them if
time allows, in the order listed in `DISCOVERABILITY_PLAN_2026-08-19.md`
Section 5.

### 8d. Dismissal handling

```js
function onDismissTip(id) {
  var next = dismissedTips.concat([id]);
  consecutiveDismissals += 1;
  var patch = { dismissedTips: next };
  if (consecutiveDismissals >= 2) {
    patch.quietUntil = addDays(todayISO(), 30);
    // surface a one-tap "פחות הצעות?" affordance here on this dismissal
  }
  setDismissedTips(next);
  save(patch);
}
```

Any tap-through to a suggestion resets `consecutiveDismissals` to 0 and
increments `shownCount[id]`.

### 8e. Richard integration

In `richardSystem()` (~L7515), append one line describing the currently-active
suggestion (if any) to the system context, e.g.:

```
"SITUATION: this user hasn't logged a transaction in 6 days. If it comes up
naturally, mention they can upload a card statement photo from Activity
instead of typing everything by hand. Say it once, warmly, and don't repeat
it later in the same conversation."
```

This piggybacks on the existing capability description at ~L15243 — don't
duplicate that text, just add the situational trigger.

**ISA guardrail:** any Richard mention tied to the investing trigger must stay
at "track what you already have" register — never "you should invest this."
Same rule that already governs Richard elsewhere in the file; don't relax it
here.

**No push notifications for any of this.** Not in this phase, not as a
stretch goal.

---

## 9. Phase 8 — Hebrew translation sweep

1. Every string introduced in Phases 1-7 must go through the existing `tr()` /
   translation-key pattern (see the `en`/`he`/`ar`/`ru` blocks starting
   ~L428) — add keys to all four blocks, not just `en`.
2. Separately: audit the tips-card section header and its four (now fewer)
   titles/subs for hardcoded English literals with no `tr()` call, and fix
   those too even though they predate this build.
3. This does **not** need to cover the full onboarding-funnel translation gap
   mentioned in `ROADMAP.md` (0% `tr()` coverage on signup/onboarding) — that
   is a separate, larger pre-submission task tracked there. Scope this phase to
   strings this build introduced or touched.

---

## 10. Definition of done

- App builds and boots with no console errors.
- Every "Acceptance" checklist above passes.
- No existing feature regresses — pay particular attention to: debt tracker,
  Activity edit/delete, CSV import, investing accounts, couples/household mode,
  Richard chat (all flows), and currency display, since Tier 0 fixes touch all
  of them.
- `git diff` is reviewable in the phase-sized commits described in Section 1 —
  do not squash everything into one commit.
- At the end, write a short status report: which phases fully shipped, which
  were partially shipped (and exactly what's missing), and which were skipped
  entirely with the reason (7b is the most likely candidate).

Do not mark anything "done" that hasn't been exercised at least once against
running code. If you can't run the app in this environment, say so explicitly
rather than reporting success on faith.
