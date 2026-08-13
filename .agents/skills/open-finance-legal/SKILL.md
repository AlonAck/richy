---
name: open-finance-legal
description: Israeli regulatory constraints on Richy — financial-information-service licensing under חוק שירות מידע פיננסי (ISA), the investment-advice line for the Richard AI assistant, DEMO labelling, Bank Sync exposure, and privacy (Amendment 13, cross-border storage, LLM data processing). Use when working on Open Banking / Open Finance connectivity, Richard's system prompt or content limits, the Leumi DEMO feature, how Bank Sync is marketed, privacy.html / terms.html, or an agreement with a licensed aggregator.
status: draft
---

# Richy × Open Finance — the regulatory constraints that touch the code

Findings from a text-based analysis of the Israeli statutes (10 Aug 2026),
answering [`LEGAL_QUESTIONS_OPEN_FINANCE.md`](../../../LEGAL_QUESTIONS_OPEN_FINANCE.md).

**Status: not a licensed legal opinion.** It is a reading of primary sources
(full text of חוק שירות מידע פיננסי as updated to 1.7.2026, חוק ייעוץ השקעות,
the ISA capital/insurance directive, the cross-border transfer regulations).
Several conclusions are flagged below as needing confirmation from the ISA
itself. Unlicensed practice carries criminal exposure — s.57(a)(1): two years
imprisonment or a fine, doubled for a corporation — so "probably fine" is not a
sufficient basis for shipping at scale.

Full Hebrew analysis: [`reference/analysis-he.md`](reference/analysis-he.md).

## The three answers

1. **White-label does not exempt Richy from licensing — branding alone never
   does.** The only statutory exemption (s.3(a)) covers a גוף פיננסי, a מייצג,
   or a body designated by the Minister. Richy is none of these. A real
   structure is possible, because the law expressly recognises outsourcing *by a
   licensed provider* — but then the aggregator must genuinely be the party
   contracting with the customer (the s.26 agreement, the consent screens, the
   liability), and Richy must be a pure technology provider with no independent
   judgement over how the data is used.
2. **A type-(3) licence fits the model** (Richy consumes data collected by
   someone else rather than collecting it). QWAC/QSEAL appear to belong to the
   type-(1)/(2) pipeline that reaches the data source directly — likely not
   required for a pure type-(3) provider.
3. **~₪600,000 of insurance or alternative collateral**, computed from the
   official formula (below), plus fees and advisory costs that are not
   published.

## What this means for the code — ranked

### 1. Richard needs a hard content guardrail (most urgent)

A disclaimer is currently carrying this, and it does not hold. The relevant
exemption — s.3(a)(4), ייעוץ השקעות בכלי התקשורת — is conditioned (s.3(b)) on
telling the user the advice *is not* a substitute for advice that accounts for
their individual data and needs. Richard is built around doing exactly the
opposite; personalisation to real data is its value. So the exemption is a poor
fit and the disclaimer built on it does not protect the app.

Where the line actually sits, per the s.1 definition in חוק ייעוץ השקעות
(תשנ"ה-1995) — advice on the *כדאיות* of investing in, holding, buying or
selling **ניירות ערך** or **נכסים פיננסיים** (a closed list: mutual-fund units,
foreign-fund shares/units, options, futures, structured products, index
products, קרנות השתלמות):

- **Outside the definition entirely** — general budgeting talk: spending
  patterns, cash flow, "can I afford X", savings goals. This is most of what
  Richard does today.
- **Across the line** — commentary on a specific security or financial asset,
  and in particular reacting to holdings shown in the investment-tracking
  screen. "I see you're holding X, consider…" is close to a textbook match for
  the regulated activity, because Richard both sees the actual holdings and
  gives an opinion on them.

Fix at the system-prompt / logic level in [`api/chat.js`](../../../api/chat.js),
not in the UI: block recommendations on specific securities or financial assets,
block any hold/buy/sell opinion on what the investment screen displays, and
redirect those questions to generic educational framing or a deflection to a
licensed advisor.

### 2. Strengthen the DEMO labelling on the Leumi feature

Consumer-deception risk (חוק הגנת הצרכן), not a licensing risk — the DEMO makes
no bank connection and generates fictitious transactions. The test is whether
someone who did not read every word would still be confused, not whether the
word DEMO appears somewhere. Small caption text is weak; a persistent visual
treatment — distinct background colour, a watermark that does not disappear, a
banner that cannot be dismissed — is what holds up.

### 3. Do not market Bank Sync as "automatic bank connection" yet

The reading that Bank Sync falls outside the law is reasonable: איסוף is defined
as access to financial information *held by a מקור מידע* through the financial
information interface system, and Bank Sync touches no financial institution's
systems — the notification has already arrived on the user's own device, via an
automation the user configured. s.60 (the screen-scraping prohibition, using the
customer's own bank credentials) confirms the mischief the legislature had in
mind, and Bank Sync is not it. CSV import is lower-risk still, since there is no
automation at all.

But this is a reading of a definition, not settled law, and regulators tend to
read "collecting financial information" purposively. The risk scales with how
prominent the feature becomes. Keep it out of flagship marketing until either
the ISA confirms informally or the exposure is consciously accepted.

### 4. Privacy — backend work, not just a policy edit

Amendment 13 has been in force since **14 Aug 2025**; this is present tense.

- Financial data in Richy is very likely **מידע אישי בעל רגישות מיוחדת**, which
  raises the security bar. (Sources converge on "פעילות פיננסית" being one of
  the new express categories, but the amended text of s.7 was not verified
  against רשומות — check before relying on it in a formal statement.)
- A real **DPA with the LLM provider** is required. Regulation 15 of the data
  security regulations imposes specific obligations for engaging an outsourcing
  provider with access to the database — prior vetting, an agreement containing
  the components the regulator specified, periodic review. Generic vendor ToS is
  not enough; the authority publishes a ready-made vetting questionnaire.
- **Cross-border transfer** (Firebase/GCP, and the LLM call itself) needs a
  specific look. The contractual route in reg. 2(4) of תקנות הגנת הפרטיות
  (העברת מידע אל מאגרי מידע שמחוץ לגבולות המדינה) was narrowed by a **13 Apr
  2026 גילוי דעת**: the overseas holder must comply fully and precisely with
  Israeli privacy law, not merely "reasonably adapt". Check the actual GCP
  agreement against this rather than assuming standard cloud terms cover it.
  ISO 27001 (guidance 3/2018) is an alternative route for the security piece.
- A privacy policy predating Aug 2025 needs a rewrite, not a patch: informed
  consent, disclosure that financial data goes to an external AI provider and
  why, overseas storage, and data-subject rights including the new right to
  erasure. Applies to [`privacy.html`](../../../privacy.html) and
  [`terms.html`](../../../terms.html).
- **DPO appointment** becomes an obligation once scale grows — processing
  sensitive data is Richy's main business, not a side effect. No numeric
  threshold was located for "היקף ניכר". Separately, processing sensitive data
  on ≥100,000 data subjects triggers a notification duty to the authority.
- **s.31** requires immediate reporting of a severe security event to the
  regulator, the relevant data source, *and* the head of the Privacy Protection
  Authority — dual reporting, not one.

### 5. Architectural note

If the white-label / aggregator route is ever chosen over Richy's own licence,
the aggregator has to be the one exercising judgement over how the data is used,
with Richy a pure technology provider. Richard-with-opinions is in tension with
that model. No action now, but worth knowing before architecting around a
specific path.

## Statutory map

| Question | Where the answer lives |
|---|---|
| The three service types | **s.1**, definition of "שירות מידע פיננסי" — *not* s.29(a), which is what the questions doc cited |
| Type (3) | Online use of financial info collected by another and transferred under para (1) |
| To whom a provider may transfer data | s.29; s.29(a)(3) is the channel by which an aggregator feeds a type-(3) provider |
| Licensing duty | s.2(a), keyed to the s.1 definition |
| The only exemption | s.3(a) — גוף פיננסי / מייצג / designated body |
| Applicant must be a company | s.4(a)(1); control and management in Israel, s.4(a)(2); foreign-corporation route, s.18 |
| Application documents | s.5 — business plan + declaration of financial means; Magna forms ט010, ט011, ט012, ט014 |
| Integrity / fitness | s.7(b) — ISA publishes a list of circumstances indicating פגם במהימנות (not located) |
| Customer agreement, consent, cancellation | s.26 |
| Licence cancelled | s.28(e) — all customers are deemed to have cancelled their agreements |
| Security-event reporting | s.31 |
| Info security, officer appointments | s.35, s.35(b)(1) |
| Capital / insurance / collateral | s.36(a) — no number in the statute; delegated to ISA directive |
| Requirements may vary by scope and type | s.36(a) — the statutory basis for lighter treatment of a small type-(3) provider |
| Ongoing reporting | s.36(b)–(c) |
| Fees | s.59 — regulations not located |
| Screen-scraping prohibition | s.60; offence under s.57(b) |
| Compensation for data leakage | s.61 |
| Unlicensed practice | s.57(a)(1) — 2 years or a fine, doubled for a corporation |

## The ₪600,000

s.36(a) sets no figure. The ISA directive of **23 May 2024** does. Its chapters
ב'–ז' — the initial-capital table of ₪80k / ₪200k / ₪500k / ₪1.4M — speak
expressly of "חברה העוסקת בשירותי תשלום או בייזום בסיסי", without mentioning a
financial-information-service provider. Chapter ח' (insurance and deposit) *does*
expressly cover "חברה שעוסקת במתן שירות מידע פיננסי". Reading: a company doing
only financial information service is subject to chapter ח' alone.

Appendix 6 formula = risk-profile criterion + activity-type criterion +
activity-scope criterion, each with a ₪200,000 floor. For an early-stage
company all three sit at the floor → **~₪600,000** of cover. This is a coverage
amount, not a cost: the cost is the annual premium, or locking up the sum if the
alternative route is taken (a deposit in tradable government bonds held in trust
by a lawyer or accountant).

The chapter-scope reading is the single most expensive assumption here — the
gap between ₪600k and ₪1.4M+ is material. Confirm with the ISA before budgeting.

## Not settled — worth a preliminary approach to the regulator

Both authorities have a mechanism for this (ISA staff position; the Privacy
Protection Authority's חוות דעת מקדמית, with a 60-day response commitment).

- Whether Bank Sync is "collecting financial information" at all.
- Whether chapters ב'–ז' of the capital directive reach a
  financial-information-only provider.
- Whether QWAC/QSEAL are genuinely unnecessary for type (3) — before writing off
  the work already done against Leumi's portal.
- Whether the information-security officer may be outsourced, and whether the
  same person may serve as compliance officer.
- Whether there is a small-entity carve-out for corporate governance,
  equivalent to חברת ניהול תיקים גדולה in the investment-advice law.
- Licensing and annual fees, and the current פגם במהימנות list.

## Aggregators

Of the 19 licence holders, four are permitted to transfer information to another
financial-information-service provider (type (1) in the "לרבות" form): **פיננדה,
אופן פיננס, פיזבק, פרסונטיקס**. Any agreement should nail down who the formal
s.26 provider is, how liability for a leak is split (s.61), and the s.29(b)
notification. Guard against exclusivity, data lock-in, and the aggregator
inheriting the end-user relationship through its own consent screens.

## Files

| File | What it is |
|---|---|
| `reference/analysis-he.md` | The full Hebrew analysis, verbatim, with sources |
| `../../../LEGAL_QUESTIONS_OPEN_FINANCE.md` | The questions this answers |
