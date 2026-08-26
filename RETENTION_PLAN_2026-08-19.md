# Richy — Retention Plan: The 70% Problem

**Date:** 19 August 2026
**Decision owner:** Alon
**Ships in:** the v1.0 submit build (freeze 23 Sep, launch 5 Oct)
**Status:** decided — this supersedes ROADMAP.md Phase 2 ordering

---

## 0. First, the honest version of the panic

You said "before we go bankrupt." At under 100 users and ₪0 revenue, **you cannot
go bankrupt.** There is no burn. Your only real cost is your own time.

That's not a reason to relax — it's a reason to aim correctly. The actual risk
isn't insolvency. It's that on **5 October you get exactly one launch**, you point
Apple Search Ads and creator traffic at it, and every user you buy leaks out
through the same hole. A leaky bucket at 100 users is a diary entry. A leaky
bucket at 10,000 users is a 2.1-star App Store rating you can't undo.

Also worth saying plainly: the 70% figure is your read, not a measured cohort.
The *mechanism* is real and well documented — it's how every manual tracker in
the category dies. But by November you should have a real number, not a read.
That's Section 6.

---

## 1. Two of your three options are already dead. Here's why.

### Option A — True open banking sync: **not a cost problem, a license problem**

Your own docs kill this one:

- `LEUMI_FINTEKA_SETUP.md`: Leumi's portal requires **QWAC + QSEAL** eIDAS
  certificates and a registered **ח״פ** *before you can submit the registration
  form.* Not before production — before the sandbox.
- `LEGAL_QUESTIONS_OPEN_FINANCE.md`: the whole category sits under **חוק שירות
  מידע פיננסי, תשפ"ב-2021**, licensed by the **ISA**. You've already found that
  even the white-label route (Finanda / אופן פיננס / פיזבק / פרסונטיקס) has an
  open question — Q1 in your own lawyer brief — as to whether *you* still need
  a licence.

So this isn't "we can't afford ₪X/user." **Even with unlimited money, this is
6-12 months and a lawyer.** It is not an October decision. Stop weighing it.

### Option B — Notification-based sync: **architecturally impossible on iOS**

You're launching on the App Store. iOS gives no third-party app the ability to
read SMS or another app's notifications. Not difficult — **not permitted, at the
OS level.** There is no entitlement to apply for.

And what you actually built is narrower than "notification sync": it forwards
**Google Wallet tap-to-pay** notifications. That misses **Bit, online purchases,
הוראות קבע, bank transfers, standing orders, and cash** — which for a young
Israeli is most of their money.

That's the part that matters: **even at 100% working, it produces incomplete
books.** Incomplete books are worse than no books, because the user stops
trusting the balance and then can't trust anything else in the app. That's
exactly what your Aug 19 sim caught — two personas said they needed sync *just
to trust the balance shown.*

The reason it didn't work when you tried it isn't that you set it up wrong.
It's that it can't work.

### Option C — CSV import: **keep it, but stop calling it the answer**

You're right that a 24-year-old will not log into the Max portal, find the export
button, download a CSV, and upload it. Once, maybe, under duress. Not monthly.

CSV stays as the power-user path. It is not the retention fix.

---

## 2. The thing nobody looked at — and it's the actual bug

I traced `repeat` through `budget-app.jsx`.

**`repeat: "monthly"` is decorative.** `detectRecurring()` (line ~9743) reads it
as a *hint* for the subscriptions report. `detectPriceHikes()` uses it. The
Activity row renders it as a **badge** (line ~10706).

**Nothing anywhere generates next month's transaction.**

So a user who told Richy "rent is ₪3,400, monthly" — who took the time to set the
flag, who saw the badge confirming Richy understood — is still typing rent in
September. And electricity. And ארנונה. And the gym. And Spotify. And their
salary.

For a typical young Israeli, **fixed and recurring items are roughly 60-70% of
all money movement.** You are charging your users manual labour for the two-thirds
of their financial life that never changes, *after they explicitly told you it
never changes.*

That is not a bank-sync problem. That is a `setInterval` you never wrote.

**Second finding:** `quickPicks` already exists — it surfaces the user's
most-repeated expenses as tappable chips. But it lives **inside** the
add-transaction sheet, and `fillFromPick()` only **pre-fills the form.** So
logging the ₪14 coffee you buy every single morning is: tap +, tap chip, check
category, check date, tap Save. Five taps for a transaction Richy could have
predicted with 95% confidence.

---

## 3. The reframe

> **The problem is not that manual entry is hard. It's that Richy asks the user
> for 100% of the effort and gives back books that are only ever ~60% true.**

High effort, untrustworthy output, and the output is *"you overspent."* Effort in,
shame out. Of course they leave at week six.

So we don't automate the input. **We shrink the input surface until manual entry
is survivable, make what's left one tap, and change what the user gets back.**

Working name for the whole thing: **"ריצ'י ממלא את המשעמם."**

---

## 4. The plan — five layers

### Layer 1 — Make `repeat` real *(the single highest-value change in this doc)*

**Build:**
1. A `materializeRecurring(tx, today)` pass on app boot: for every transaction
   flagged `repeat: "monthly"` / `"weekly"`, post the next occurrence(s) up to
   today with `pending: true` and a `recurredFrom: <sourceId>` link.
2. Post them **pending, not settled.** Richy must never assert money moved that it
   can't verify. `pending` is already excluded from every balance calculation
   (verified: lines 1761, 7914, 12181, 20670, 21950) — so this is safe by
   construction.
3. One Overview card: **"3 הוצאות קבועות נכנסו החודש. הכול נכון?"** → one tap
   confirms all, or expand to fix one amount.
4. Idempotency: key on `recurredFrom + period` so a double boot can't duplicate.

**Then, in onboarding — replace the single "monthly income" field.**

That field is already a measured drop-off: 3/10 personas in the Aug 19 sim, and
one small-business owner mixed personal and business income into it, recreating
the exact problem he installed Richy to solve.

New screen: **"מה יוצא לך כל חודש בלי קשר למה שקורה?"** — tappable Israeli
pre-set chips, type the amount once:

> שכר דירה · ארנונה · חשמל · מים · ועד בית · סלולר · אינטרנט · ביטוח בריאות ·
> ביטוח רכב · דלק/רב-קו · חדר כושר · נטפליקס/ספוטיפיי · הוראת קבע לחיסכון ·
> החזר הלוואה

And income asked as **"קבועה"** *or* **"משתנה"** — "משתנה" simply means no
auto-posting income line. That closes sim theme #2 (4/10 personas: freelancers,
business owners, retirees) in the same screen, for free.

**90 seconds of setup buys them a year of not typing.**

**Impact:** removes ~60-70% of required monthly entries.
**Cost:** ₪0 recurring. Days, not weeks.

---

### Layer 2 — Make what's left one tap

**2a. Promote the quick-add chips to the Overview home screen, and make them
save on tap.** *(mandatory for v1.0)*

- Top 4-6 `quickPicks` as chips directly on Overview: `קפה ₪14` · `רכבת ₪16`
- Single tap = logged. Toast with undo. Long-press = open the form to adjust.
- Category comes from `suggestCatId()`, which already works.

This is a *move plus a behaviour change* on code that exists. Five taps → one.

**2b. iOS App Intents — Siri + Control Center + Action Button.** *(try for v1.0,
acceptable in v1.1)*

> **"היי סירי, ריצ'י — ארבעים שקל אוכל."**

Small Swift shim behind Capacitor. Zero recurring cost, works offline, no
permissions to beg for. Nothing in the Israeli category has this — it's also
your single best 8-second launch video.

**2c. Home Screen / Lock Screen widget** with the same top chips. *(v1.1)*

---

### Layer 3 — One weekly session, not daily discipline

Stop asking for a daily habit. Ask for **60 seconds, once a week.** This is the
"Clean Week" you already designed in `MOTIVATION_SYSTEM.md` — build the plumbing
for it now so the motivation layer drops onto something real.

**"סגירת שבוע"** — one screen, user-chosen day:

1. **Confirm** the recurring items that posted (Layer 1).
2. **Fill the gap.** Reuse the `catchUp` primitive that already exists
   (`cuBallpark` / `cuQuickTotal` / `cuByCategory`, ~line 6532) — currently
   onboarding-only. Run it weekly: *"עוד משהו שלא רשמת השבוע?"* One number is a
   valid answer. The books are then honestly complete, flagged `catchUp` so it
   never pollutes category analytics.
3. **Statement drop — the honest replacement for bank sync.**
   The user long-presses their credit-card SMS thread, or screenshots the
   Max/Cal/Isracard app, and shares it into Richy. Richard parses it into
   transactions.
   - iOS **Share Extension** — 3 taps.
   - No credentials. No licence. No per-user cost. Works with **every** Israeli
     card company, not just Leumi.
   - Cost is per-parse (bounded, ~one statement/week), not per-user-per-month.
   - Ship it as **optional**. Never a promise that can break.

**This is the launch wedge made literal.** You already decided the positioning:
**"בלי למסור לאף אחד את חשבון הבנק שלך."** Now there's a feature that *is* that
sentence: *"ריצ'י לא מבקש את הסיסמה לבנק. תשלח לו תמונה של הפירוט."*

**Legal:** this is Q14 in your lawyer brief — the same posture as the CSV import
you already ship (user-supplied document, no institution access). Get the
lawyer's yes, but do not treat it as blocked; it is materially further from
"שירות מידע פיננסי" than anything in Option A.

---

### Layer 4 — Change what the user gets back

Even with perfect input, if the output is *"you overspent,"* they quit. Effort
has to buy relief, not judgement.

> ## בטוח להוציא היום
> # ₪86

One number, top of Overview, above everything. `(income − fixed costs − goal
contributions − spent so far) ÷ days remaining in period.` Every logged
transaction updates it instantly.

You already have `leftToSpend` on the Overview hero (line 9179) — that's a
*period* figure. This is the **daily** one, and the difference is the whole
point: a period number is an accounting fact, a daily number is **permission.**
`perDay` already exists in the Trips feature (line 12544) — same maths, new home.

**This is the highest-leverage UX change in the document and it's nearly free.**
It's what makes a financially anxious 24-year-old open Richy in a café — not to
confess, but to check whether they're allowed. That is a daily-open habit that
survives a missed week.

**ISA check:** a budgeting calculation on the user's own data is not investment
advice. Safe. Keep Richard away from *"you've got spare — you could invest it."*

---

### Layer 5 — Remove the lie

**Delete the "Sync your bank" card and the Leumi DEMO. Not soften. Delete.**

- #1 named churn cause in **12 of 12** sim runs (91 mentions, 2.5× the next theme).
- It writes fabricated transactions into the *real* ledger with no bulk-remove.
- Shipping it is an **App Store 2.3 (Accurate Metadata)** rejection risk stacked
  on the RTL copy problem you already know about.

The July A/B looked like surfacing it was a win — kept-rate 40%→60%. It wasn't.
That was **borrowed trust on an unmet promise**, and the bill came due in the
Aug 19 run: 50% kept, NPS −1.8.

Replace it with a card that states the position and offers the three real paths:
**הוצאות קבועות · הוספה מהירה · שליחת פירוט.**

---

## 5. Build order — 19 Aug → 23 Sep freeze

Tier 0 does not move. A retention fix on a ledger that silently drops data is
worthless — you'd just be retaining people into a bug.

| Week | Dates | Build |
|---|---|---|
| **1** | Aug 19-25 | **Tier 0 only.** QA audit's five-to-fix: debt-edit save-killer, `Activity.saveEdit` merge, boot-splash timeout, `_stockGet` deadline, hardcoded `$`. Plus the server-side Richard prompt registry. |
| **2** | Aug 26-Sep 1 | **Layer 1** (materialize recurring + pending-confirm card) and **Layer 5** (delete demo sync, replace card). |
| **3** | Sep 2-8 | **Layer 1 onboarding** (fixed-costs chips, fixed/variable income) + **Layer 4** (safe-to-spend). |
| **4** | Sep 9-15 | **Layer 2a** (home-screen chips, tap-to-save) + **Layer 3** (weekly close, share-extension parse). **Layer 2b if it fits.** |
| **5** | Sep 16-23 | Freeze. Translate the signup/onboarding funnel (currently 0% `tr()` coverage), fix the RTL store copy, instrumentation, QA, **submit Wed 23 Sep**, hold release for 5 Oct. |

Week 5 is not padding. The Hebrew funnel translation is a submission blocker —
right now a Hebrew user's first ten minutes are English text in an RTL document,
and your store listing claims otherwise.

**Cut line if you slip:** Layer 2b/2c → v1.1. Layer 3 statement-parse → v1.1
(ship weekly-close without it). **Layers 1, 4 and 5 are not cuttable.** They are
the plan.

---

## 6. What we measure

You don't have a retention number. You have a read. Ship these four events with
v1.0 so that by mid-November you have a cohort:

1. `D1 / D7 / D30 return`
2. `transactions_logged_per_active_week`
3. `pct_users_with_recurring_configured` — the Layer 1 adoption gate
4. `days_since_last_transaction` — the churn *leading* indicator; alert at 10

**North-star retention metric: % of signups who log ≥1 transaction in week 4.**
Everything in this document is aimed at that one number.

Baselines to beat, from the sim: kept-rate 50%, NPS −1.8, buy@5 17.1%.

**The one test still un-run** (recommended in the Jul 27 report, still open):
does kept-rate hold once the bank-sync bait is gone? Layer 5 runs it for you by
force. Watch it.

---

## 7. What we are deliberately not doing

- **Not building bank sync.** Not a real one, not a fake one, not a "coming soon"
  badge. Nothing that implies it exists.
- **Not chasing auto-categorisation** as a headline feature. `suggestCatId()` is
  good enough; Layer 1 removes most of the transactions that would need it.
- **Not adding gamification yet.** `MOTIVATION_SYSTEM.md` is a strong design and
  it stays parked until v1.1 — streaks on top of an input problem is polish on a
  leak. Layer 3's weekly close is deliberately built so Clean Week drops straight
  onto it with no migration.
- **Not spending money.** Every item here is ₪0 recurring cost. At ₪0 revenue
  that isn't a preference, it's the constraint.

---

## 8. When bank sync comes back

Not never — **not now, and not for free.**

The sequence:

1. Launch 5 Oct without it, positioned as a deliberate privacy stance.
2. Reach **~1,000 paying subscribers** at ₪14.90/mo ≈ **₪15k MRR**.
3. *Then* open the white-label conversation with **פיננדה / אופן פיננס** — one of
   the four licence holders your brief identified as able to pass data to another
   provider. At ₪15k MRR you walk in as a customer with revenue. Today you walk
   in as a hobby project, and the answer is no.
4. When it ships, it ships **as the paid tier.** You only pay per-user costs for
   users who pay you. That flips it from a cost problem to a margin problem, and
   it makes the upgrade pitch write itself: *"תפסיק להקליד."*

Put it on the roadmap **gated on that MRR number**, not on a date. That way it
stops being a thing you feel guilty about and becomes a thing you've earned.

---

## 9. The one-sentence version

**Richy's churn isn't caused by the absence of bank sync — it's caused by asking
users to hand-type the two-thirds of their financial life that never changes,
and then answering their effort with a number that makes them feel bad. Fix
those two things and you don't need bank sync to survive to 1,000 subscribers —
you need it to grow past them.**

---
---

# Layer 6 — Discoverability *(moved to its own document)*

Alon's point, 19 Aug: *"a lot of features seem hidden and hard to find — I'm sure
no one knows CSV import exists."* He's right about the symptom. CSV import is not
offered anywhere; neither is business accounts or investing.

That work outgrew this document. **It now lives in
`DISCOVERABILITY_PLAN_2026-08-19.md`** — audit, escalation ladder, trigger rules,
attention budget, build spec and copy.

The three things from it that affect *this* plan:

1. **It ships in week 4**, alongside Layer 2a. It's a payload change to code that
   already exists, not a new system.
2. **It is strictly gated on Tier 0 (week 1) and Layer 5 (week 2).**
   Discoverability multiplies whatever sits underneath it — promoting a feature
   with an open data-loss bug produces *faster* churn, not slower. The Jul 27 A/B
   is the proof: surfacing quick-actions lifted kept-rate 40%→60%, and three
   weeks later the run came in at 50% kept / NPS −1.8, because the card driving
   the lift was the empty bank-sync promise.
3. **"CSV import" gets renamed to "העלאת פירוט מהאשראי"**, and the tips card gets
   `tr()` calls — it's currently hardcoded English, so Hebrew users are shown a
   discovery card they can't read. Both ride along with week 5's funnel
   translation.

Everything else — the ladder, the budget, the Richard integration — is in the
sibling doc. Don't duplicate it here; that's how ROADMAP.md went stale.
