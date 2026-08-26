# Richy — Feature Discoverability Plan

**Date:** 19 August 2026
**Owner:** Alon
**Ships in:** v1.0 submit build — week 4 (Sep 9-15), freeze 23 Sep, launch 5 Oct
**Scope:** how features get found, and what it costs the user's attention
**Sibling doc:** `RETENTION_PLAN_2026-08-19.md` — that one covers manual-entry
churn (Layers 1-5). This one is Layer 6, extracted because it's its own workstream.

Self-contained: you can build from this without reading the retention plan.

---

## 1. The problem, stated properly

Richy has ~15 shipped features. Most users find three of them.

The obvious fix is to advertise the rest, and the obvious objection is that
advertising them turns the app into a nag. **Both of those are answers to the
wrong question**, and Section 3 explains why. First, what's actually there.

---

## 2. Audit — what exists today

### The mechanism already exists, and it's good

`budget-app.jsx` ~L8344 renders an Overview card titled **"Get the most from
Richy"**. It is better engineered than most apps' equivalent:

- Each tip **retires itself the moment the feature is used** (`used:` flag) —
  no settled user stares at a pitch for something they already have.
- Dismissible per-id into `dismissedTips`, persisted (`onDismissTip`, ~L28195,
  writes via `save({ dismissedTips: next })`).
- `tipsUpTop` floats the card high while the account has fewer than 5
  transactions, then drops it below the numbers.
- The whole section disappears when the list empties.

**Keep all of this.** The mechanism is not the problem.

### The payload is the problem

The list is four static items:

| id | Title | Verdict |
|---|---|---|
| `debts` | Crush your debt | Feature has an open **P0 save-killer bug** |
| `collab` | Add your partner | **Good — keep.** Two sim personas flipped from give-up to kept the moment they found it |
| `sync` | Sync your bank | **A lie.** Demo-only Leumi simulation. #1 named churn cause in 12/12 sim runs. Delete it |
| `trip` | Plan a trip | Consuming **25% of the entire discovery surface** — aimed at a broke 24-year-old |

**Never offered anywhere:** statement/CSV import, business accounts, investing &
net worth, savings goals, IOU notes, multi-currency.

### Three more findings

1. **The card is untranslated.** `"Get the most from Richy"` and all four titles
   are hardcoded English string literals with **no `tr()` call**. Hebrew users
   are shown a discovery card they cannot read. One-hour fix, outsized effect.
2. **"Tags" are not a feature.** `tag` in the codebase is (a) Richard's internal
   LLM action-tag syntax and (b) the tag *icon* that opens category management.
   There is nothing to promote.
3. **"CSV import" is developer language.** Your audience does not know what a CSV
   is. Nothing in that string tells a 24-year-old what it does for them.

---

## 3. The principle: stop optimising for awareness

> **A user who never needs the debt tracker, and never learns it exists, is a
> success — not a failure.**

You are not running an awareness campaign. The goal is that **the right feature
appears at the moment it solves a problem the user is having right now.**

Framed that way the hidden-vs-annoying tension disappears: a suggestion that
arrives at the moment of need is not an interruption, it's an answer. Nobody is
annoyed by *"did you mean…"*.

Two consequences that drive everything below:

**A. Findable ≠ promoted.** These are different states with different costs. A
feature sitting visibly where it belongs is *not hidden*, and it never annoys
anyone. Only *promotion* costs attention, and only promotion needs a budget.

**B. Need-triggers, never coverage-triggers.** "User hasn't tried Debts" is a
coverage trigger — it's true for 13 of your 15 features, so it generates infinite
spam. "Balance went negative twice this month" is a need trigger, and it's
self-limiting: **most users will qualify for 2-4 suggestions in their entire
lifetime with the app.** That's not a nag. That's a good product.

---

## 4. The escalation ladder

The mistake is treating discovery as binary — show it or hide it. There are four
volume levels, and **most features should live at the bottom two forever.**

| Tier | What it is | Attention cost | Rationed? |
|---|---|---|---|
| **0 — Findable** | The feature is simply present where it belongs. An "העלה פירוט" button in Activity's empty state. No card, no badge, no dot. | Zero | Never. Always on |
| **1 — Contextual** | Inline, inside a flow the user is already in, at the moment of relevance. Weekly close shows a gap → "לא בא לך להקליד?" | Near zero | Lightly |
| **2 — Card** | The Overview suggestion card. Pulls attention away from what they came to do. | **Real** | Hard-capped |
| **3 — Push** | Leaves the app to reach them. | **Highest.** Can get you uninstalled | Almost never |

**Rules:**
- Nothing starts above Tier 1. A feature earns its way up.
- **Richy ships zero Tier 3.** No push notifications for feature discovery, ever.
  Push is for the user's own money (a bill due, a budget blown), never for a
  feature pitch.

**Today you have Tier 0 and Tier 2 with nothing between**, and the Tier 2 slots
are spent on a lie and a bug. **Tier 1 is the missing layer and it holds most of
the value** — it's where a suggestion costs nothing because the user is already
standing in front of the thing.

### Tier assignment for every feature

| Feature | Tier | Where it lives |
|---|---|---|
| Statement import | **0 + 1 + 2** | Button in Activity empty state · inline in weekly close · card on stall |
| Debts | **0 + 2** | Profile nav · card on negative balance |
| Couples | **0 + 1** | Profile nav · inline when a partner signal appears |
| Business | **0 + 1** | Profile nav · offered from the עצמאי life-stage option in onboarding |
| Investing | **0 + 1** | Profile nav · inline when a savings goal completes |
| Savings goals | **0** | Already a main tab. Done |
| IOU notes | **0** | Activity nav |
| Trips | **0** | Profile nav. **Demoted from the card entirely** |
| Multi-currency | **0** | Settings. Never promoted |

Note what this does: **six features get *more* findable and *less* promoted at
the same time.** That's the resolution of Alon's question in one table.

---

## 5. Trigger rules

Only fires what the data proves is needed. Priority order top to bottom.

| # | Suggestion | Fires when | Tier |
|---|---|---|---|
| 1 | **Statement import** | 0 transactions logged in 4 days, **or** weekly close shows a gap > 25% of expected | 1, 2 |
| 2 | **Debts** | Running balance goes negative twice in 30 days, **or** a tx label matches `הלוואה / מינוס / החזר / אשראי` | 2 |
| 3 | **Couples** | A recurring non-user name in labels, **or** an IOU note created, **or** `שכר דירה` logged | 1 |
| 4 | **Business** | `עצמאי` / `פרילנסר` chosen in the onboarding life-stage picker | 1 |
| 5 | **Investing** | A savings goal completes, **or** surplus > 0 for 2 consecutive periods | 1 |
| 6 | **Trips** | Cluster of ≥3 foreign-currency transactions in 14 days | 0 only — off by default |

### Copy

Hebrew is the primary. Both strings go through `tr()` — no hardcoded literals.

| Suggestion | Title | Sub |
|---|---|---|
| Statement import | לא בא לך להקליד הכול? | העלה פירוט מהאשראי — ריצ'י ימלא את השאר |
| Debts | יש לך חוב שאתה מחזיר? | ריצ'י יבנה תוכנית יציאה עם תאריך סיום |
| Couples | מנהלים כסף ביחד? | תקציב משותף, כל אחד עם הפרטיות שלו |
| Business | עצמאי? | הפרד עסק מפרטי — תזרים, קופת מס, חשבוניות |
| Investing | יש לך חסכונות במקום אחר? | עקוב אחרי הכול במקום אחד |
| Trips | טיול בקרוב? | ריצ'י יחלק לך תקציב לנסיעה |

**Rename "CSV import" → "העלאת פירוט מהאשראי" everywhere** — in the Activity tab,
in onboarding's entry-method preference, in Richard's prompt, in the App Store
listing. The feature wasn't only hidden; it was **named in a language your user
doesn't speak.** One string, probably doubles uptake on its own.

**ISA guardrail on #5.** Investing copy stays at *"עקוב אחרי מה שכבר יש לך"*.
Never *"כדאי להשקיע"*, never a named product, never a ranking, never a return
figure. Same rule applies to anything Richard says on the same trigger.

---

## 6. The attention budget

> **Ceiling: no user sees more than ~6 Tier-2 impressions in their first 90 days.**
> Design backwards from that number.

Four rules, implement them literally:

1. **One active suggestion. Ever.** Never a list. A list is a menu; one timed
   card is advice.
2. **7-day global cooldown** between new suggestions — global, not per-tip.
3. **Three strikes and it's dead.** Shown 3× without a tap → retire permanently,
   not snooze.
4. **Two consecutive dismissals → the whole system goes silent for 30 days.**
   This is the safety valve that matters most. Two dismissals in a row means "I'm
   not in a browsing mood" — believe them the first time they say it.

**Give them the off switch, visibly.** On the *second* dismissal, the dismissal
itself asks: **"פחות הצעות?"** — one tap, permanently quieter. Offering the exit
is exactly what makes the on-state feel trustworthy instead of extractive.

---

## 7. Richard is the primary channel

You have an AI advisor. That is the unfair advantage here, and it's mostly
already wired.

> **Card:** "Crush your debt — payoff plan + debt-free date" `[×]`
>
> **Richard:** *"שמתי לב שהחודש נכנסת למינוס פעמיים. יש לך חוב שאתה מחזיר? אני
> יכול לבנות לך תוכנית יציאה עם תאריך."*

Identical information, completely different register. **A card is an ad. Richard
saying it is advice.** And the key property: **a conversational mention costs
nothing from the attention budget**, because the user opened the Advisor tab
themselves. Unlimited headroom, near-zero annoyance risk.

### It's already half-built

Richard's system prompt (~L15243) already contains:

> *"Richy CAN import a CSV bank or card statement from the Activity tab (it maps
> columns, handles separate money-in/money-out columns, auto-categorizes from
> history, and skips duplicates) — point users tired of manual entry there."*

So Richard already **knows** the capability. What's missing is *situational
awareness* — he only mentions it if the user complains first.

**The fix is one line.** Append the currently-active nudge to the system context
in `richardSystem()` (~L7515):

```
"SITUATION: this user has logged nothing for 6 days. If it fits naturally,
mention that they can upload a card statement from Activity instead of typing.
Say it once, warmly, and never repeat it in this conversation."
```

That's the whole integration. No proactive-messaging engine, no new UI.

**Route discovery through Richard first; keep the Overview card for the two or
three things Richard can't reach in time.** It also compounds the moat instead of
adding UI chrome — every sim persona who commented on Richard praised the voice.

---

## 8. Build spec

### Data model

Three new persisted fields alongside the existing `dismissedTips` array:

```js
shownCount:       {},   // { debts: 2, statement: 1 }
lastSuggestionAt: "",   // ISO date of the last NEW suggestion shown
quietUntil:       "",   // ISO date; system fully silent until then
```

Plus one transient counter, in-memory only:

```js
consecutiveDismissals: 0   // resets to 0 on any tap
```

All three persisted fields go through the existing `save(next)` path (~L28120) —
same as `dismissedTips` does today. No schema migration: absent fields default to
`{}` / `""`.

### The one function

```js
// Returns a single suggestion object, or null. Called from Overview render.
function pickSuggestion(ctx) {
  var today = todayISO();

  // --- gates, cheapest first ---
  if (ctx.quietUntil && today < ctx.quietUntil) return null;
  if (ctx.lastSuggestionAt && daysBetween(ctx.lastSuggestionAt, today) < 7) {
    return ctx.activeSuggestion || null;      // keep showing the current one
  }

  // --- need-triggers, priority order ---
  var candidates = SUGGESTIONS.filter(function(s) {
    if (s.used(ctx)) return false;                       // already using it
    if (ctx.dismissedTips.indexOf(s.id) >= 0) return false;
    if ((ctx.shownCount[s.id] || 0) >= 3) return false;  // three strikes
    return s.trigger(ctx);                               // the actual need test
  });

  return candidates[0] || null;
}
```

`SUGGESTIONS` is an ordered array; each entry is
`{ id, icon, titleKey, subKey, used(ctx), trigger(ctx), go() }` — the same shape
as today's `tips` array plus a `trigger` function. **This is a payload change to
existing code, not a new system.**

### Dismissal handling

```js
function onDismissTip(id) {
  var next = dismissedTips.concat([id]);
  consecutiveDismissals += 1;
  var patch = { dismissedTips: next };
  if (consecutiveDismissals >= 2) {
    patch.quietUntil = addDays(todayISO(), 30);   // safety valve
    // and surface the one-tap "פחות הצעות?" opt-out here
  }
  setDismissedTips(next);
  save(patch);
}
```

Tapping a suggestion sets `consecutiveDismissals = 0`.

### Translation

Every string in the card goes through `tr()`, including the section header
`"Get the most from Richy"` → `tr("getTheMost")`. Add the keys to all four
language blocks (`en` / `he` / `ar` / `ru`, ~L428-431). **This rides along with
week 5's onboarding-funnel translation work — do them together.**

---

## 9. Instrumentation

Log three events per suggestion: `shown` → `tapped` → `feature_used_7d`.

Read them like this:

- **Tap rate < 10%** → the **trigger** is wrong. Fix the moment, not the copy.
- **Tapped but unused at 7 days** → the **feature** is the problem, not the
  trigger. Stop promoting it and go fix it.

That distinction is what stops this becoming another thing you guess at. Within
two months it tells you which of your 15 features actually deserve to exist —
which is a roadmap input you do not currently have.

Also log `quietUntil` activations. If more than ~15% of users trip the two-strike
silence, the triggers are firing on people who don't need them.

---

## 10. Build order

Week 4 of the v1.0 plan (**Sep 9-15**), alongside the home-screen quick-add chips.

**Hard prerequisites** — this ships *after*:
- **Tier 0 bug fixes (week 1).** Non-negotiable. Discoverability multiplies
  whatever sits underneath it: promote a feature with an open data-loss bug and
  you get *faster* churn, with more disappointment per user. The Jul 27 A/B is
  the cautionary tale — surfacing quick-actions lifted kept-rate 40%→60%, and
  three weeks later the run came in at 50% kept, NPS −1.8, because the card
  driving the lift was the empty bank-sync promise.
- **Deleting the `sync` tip (week 2).**

**Order within the week:**

1. Delete `trip` from the card, demote to Tier 0. *(minutes)*
2. `tr()` the card + rename CSV import → "העלאת פירוט מהאשראי". *(~1 hour)*
3. Tier 0 placement pass: make all six under-found features visibly present where
   they belong. *(half a day — this is the highest value-per-hour item in the doc)*
4. Two Richard situational hints (statement import, debts). *(~1 hour)*
5. `pickSuggestion()` + the three fields + cooldown rules. *(~60 lines)*
6. Trigger rules #1 and #2 only.

**Cut line:** if the week runs out, ship **1, 2, 3 and 4** and skip the card logic
entirely. The card is the *least* valuable part of this document. Steps 2 and 3
are not cuttable — they're hours of work with disproportionate effect.

---

## 11. What we are deliberately not doing

- **No push notifications for feature discovery.** Ever. Push is for the user's
  own money, not for a pitch.
- **No product tour, no coach marks, no "what's new" modal.** A tour is a list
  delivered before the user has any context to hang it on. It reads as homework.
- **No badges or red dots on nav items.** Manufactured urgency for something the
  user didn't ask about. It works once and costs trust permanently.
- **No feature list in the App Store listing or launch creative.** RiseUp charges
  ₪55/month on a single promise; at ₪14.90 you need one promise too, not fifteen
  features. **Features are proof, not pitch.** Feature discovery is an in-app
  retention mechanic — it is not a launch message.

---

## 12. The one-sentence version

**Stop trying to make users aware of features and start making features arrive at
the moment they're needed — most of them just need to be findable, only two or
three ever need to be promoted, and Richard can deliver those better than a card
can.**
