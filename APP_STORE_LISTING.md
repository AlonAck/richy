# Richy — App Store Connect copy & review notes

Everything here is ready to paste into App Store Connect. Character limits are
noted; counts in parentheses are the current length.

---

## App name — 30 char limit

**`Richy: Budget & Money`** (21)

Alternatives if that name is taken:
- `Richy — Calm Budgeting` (22)
- `Richy: Spending Tracker` (23)

Keep "Richy" first — it's the brand, and Apple weights early words in search.

## Subtitle — 30 char limit

**`Your money has a manager now`** (28)

Alternatives:
- `Budget calmly. Spend clearly.` (29)
- `Budgets, goals & an advisor` (27)

## Promotional text — 170 char limit (editable without a new build)

**`Richard now reads your whole month and tells you what actually changed — not just what you spent. Plus faster budgets, and full Hebrew and Arabic support.`** (152)

Use this field for what's new or seasonal; it appears above the description and
can be changed any time without submitting a build.

## Keywords — 100 char limit, comma-separated, NO spaces

```
budget,expense,tracker,spending,savings,finance,money,goals,debt,networth,advisor,planner,shekel
```
(95)

Do not repeat words already in the app name or subtitle — Apple indexes those
separately, so repeating wastes characters.

## Description — 4000 char limit

```
Richy is a budgeting app that feels calm instead of guilty.

Most money apps hand you a spreadsheet and hope you enjoy it. Richy gives you a
clear picture of your month — and Richard, an AI advisor who has actually read
your numbers and talks to you like a person.

MEET RICHARD
Richard is built into Richy and knows your real figures. Ask him anything:
"How much am I really spending on coffee?" · "Can I afford this?" · "What
should I do with my surplus?" He answers with your actual data, admits when
something is uncertain, and can log an expense or set a budget for you right
from the chat.

SEE WHERE IT GOES
• A dashboard that shows your balance, net worth, and where the month went
• Budgets per category, with progress you can read at a glance
• Trends over time — spot the category that quietly doubled
• Import a CSV from your bank or card, with columns detected automatically

BUILD SOMETHING
• Budget books — goals with a target and a deadline, so saving has a shape
• Savings accounts kept separate from your spending balance, so an emergency
  fund never looks like money you can spend
• A debt payoff tracker with real avalanche and snowball projections
• Trip planning that budgets a getaway without touching your balance

MONEY BETWEEN PEOPLE
• Notes for who owes you and who you owe, with reminders
• Share a household budget with a partner — shared where you want it, private
  where you don't

FOR THE SELF-EMPLOYED
• Separate business accounts with their own cash, budgets and plan
• Runway, unpaid invoices, and a tax pot, kept apart from personal money

BUILT FOR WHEREVER YOU ARE
• 50 currencies with correct symbols and decimal rules
• English, Hebrew, Arabic and Russian — with full right-to-left layout
• Works offline; your data syncs when you're back

YOUR DATA IS YOURS
Export everything as a file whenever you want. Delete your account and all of
your data permanently, from inside the app, in two taps. No ads. No trackers.
We never sell your data.

Richard is an AI assistant, not a licensed financial adviser, and nothing in
Richy is financial advice. Always do your own research before making money
decisions.
```
(~1,950 — comfortably within the limit)

## What's New (for version 1.0.0)

```
The first release of Richy.

Budgets, goals, savings, debt payoff, trips, notes, business accounts and an
investing tracker — with Richard, an AI advisor who knows your real numbers.

Now in English, Hebrew, Arabic and Russian, with full right-to-left layout,
50 currencies, and offline support.
```

## Category & rating

- **Primary category:** Finance
- **Secondary category:** Productivity
- **Age rating:** answer the questionnaire honestly — no objectionable content
  of any kind; "Unrestricted Web Access" = **No** (Richy is not a browser).
  Expected result: **4+**. Richy's own Terms set a 16+ minimum separately,
  which is a contractual limit, not a content rating.

## Required URLs

| Field | Value |
|---|---|
| Privacy Policy URL | `https://richy-mgkl.vercel.app/privacy.html` |
| Support URL | `https://richy-mgkl.vercel.app` |
| Marketing URL (optional) | `https://richy-mgkl.vercel.app` |

---

# App Review notes — paste into "Notes" in the submission form

```
Thanks for reviewing Richy.

DEMO ACCOUNT
Email:    [FILL IN before submitting]
Password: [FILL IN before submitting]
Sign-up is also open if you prefer to create your own account. Note that Richy
requires users to be 16 or older; the sign-up form validates the date of birth
you enter.

ACCOUNT DELETION (Guideline 5.1.1(v))
Profile tab -> "Privacy & Data" -> "Danger zone" -> "Delete account & data".
Type DELETE to confirm. This permanently erases the account: all financial
records, any bank-sync keys, any bank connection tokens, household membership,
and the sign-in account itself. There is also "Export my data" in the same
section, which downloads a complete copy as a JSON file.

"CONNECT BANK LEUMI (DEMO)" IS A SIMULATION
Profile -> Bank Sync includes a feature labeled "Connect Bank Leumi (Demo)".
It is clearly marked DEMO in the UI, never contacts a bank, never asks for
banking credentials, and only fills the account with clearly fictional sample
transactions so the user can preview what the experience would look like. A
real Open Banking connection would require Bank Leumi to certify Richy as a
licensed third-party provider, which has not happened, and the app says so
explicitly on that screen.

AI ADVISOR ("RICHARD")
Richard is powered by a large language model. Richy is an informational tool,
not a financial adviser; this disclaimer appears on the advisor screen, the
investing screens, and in the Terms of Service. Richard cannot move money,
place trades, or access any external account. The Investing feature is a
tracker for holdings the user already owns — Richy is not a broker and cannot
execute transactions.

NO DOWNLOADED CODE (Guideline 2.5.2)
All executable code ships inside the app bundle. The app is a precompiled
JavaScript bundle plus its runtime libraries (React, the Firebase web SDK and
Clerk), all served from the app's own bundle - there are no remote script tags
and no code is fetched, installed or evaluated at runtime. The app launches with
no network connection at all; you can verify this in Airplane Mode from a cold
start. Network requests are data only: our own API on richy-mgkl.vercel.app,
Firestore, and Clerk's auth endpoints.

DATA COLLECTION
Richy collects only what the app needs to function: email, name, date of birth
(for age verification), and the financial records the user enters themselves.
No advertising identifiers, no location, no analytics or tracking SDKs. Full
detail: https://richy-mgkl.vercel.app/privacy.html

Contact for any questions: richysupport@gmail.com
```

---

## Screenshots

Required: **6.7"** (1290 × 2796) and **5.5"** (1242 × 2208). Apple accepts a
6.7" set alone for newer devices, but supplying both avoids surprises.

**Capture them in the iOS Simulator** (exact pixel sizes, real status bar):

```bash
xcrun simctl list devices          # find an iPhone 15 Pro Max (6.7")
# run the app in that simulator, then per screen:
xcrun simctl io booted screenshot ~/Desktop/richy-01-overview.png
```

The app's own demo data is already set up for this — see `.claude/shots.html`,
which signs into a realistic fictional account (no login, no production data)
and takes `?screen=overview|activity|budgets|goals|advisor|notes` and `&dark=1`.
Point the simulator at your local dev server, or just seed the same demo
account manually.

**Recommended 6 shots, in this order** (the first two are what most people see
in search results, so lead with the strongest):

| # | Screen | Caption to overlay |
|---|---|---|
| 1 | Overview dashboard | "See where the month actually went" |
| 2 | Advisor chat with Richard | "An advisor who's read your numbers" |
| 3 | Budgets with progress bars | "Budgets you can read at a glance" |
| 4 | Goals / budget books | "Give every goal a deadline" |
| 5 | Debt payoff projection | "A real debt-free date" |
| 6 | Overview in dark mode | "Calm in every light" |
