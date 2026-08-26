# Richy — iOS Launch Campaign Brief

**Prepared:** 19 Aug 2026 · **Campaign window:** 24 Aug – 18 Oct 2026 · **Launch day: Monday 5 Oct 2026**

> Built from: your answers (19 Aug), `ROADMAP.md`, `reports/qa-audit-2026-08-17.md`,
> `reports/richy-sim-latest.html` (10-persona sim, 27 Jul), `APP_STORE_LISTING.md`,
> live check of richy-mgkl.vercel.app, and market research on the Israeli iOS Finance chart.
> Anything marked **[estimate]** is my judgement, not a verified number.

---

## 0. Three things I'm changing before we start

You gave me a goal, a date, and a budget. Two of the three are wrong, and saying so is why I'm here.

### 0.1 "#1 finance app in Israel" is not winnable, and it's the wrong scoreboard

I pulled the live Israeli iPhone Finance chart. The top ~20 is Bank Hapoalim, Bank Leumi,
Isracard, PayPal and payment wallets. Those are utilities every adult in the country is
*required* to install. You will never out-download Isracard, and you shouldn't want to —
nobody buys a company for beating a bank's install count.

The highest-ranked non-bank money app in Israel was **Splitwise, around rank 24** when I checked
on 19 Aug — charts move daily, so treat the number as a band, not a fixed line. What doesn't move:
there is no Hebrew-native budgeting app anywhere in that chart. That gap is the actual opportunity.

**New scoreboard, in priority order:**

1. **#1 budgeting app in Israel** — beat Splitwise's band. Defensible, quotable, true.
2. **Top 40 overall in Israeli Finance** during launch week.
3. **Rank #1 on Israeli App Store search for `ניהול תקציב`, `מעקב הוצאות`, `תקציב חודשי`.**

That is a headline you can put in a deck: *"the #1 budgeting app in Israel."* "Top 30 in Finance"
is a headline nobody can argue with. "#1 Finance app" is a claim you'd have to keep explaining.

### 0.2 Do not launch in late September. Launch Monday 5 October.

You said "submitting within ~4 weeks," which lands you in the App Store around 21–27 September.
That is the single worst week of the Israeli year to launch anything.

**Rosh Hashanah: 11–13 Sep. Yom Kippur: 20–21 Sep. Sukkot: 25 Sep – 2 Oct.
Shmini Atzeret / Simchat Torah (combined in Israel): 2–3 Oct.**

From 11 Sep to 3 Oct, Israel is on holiday. Press doesn't publish, offices are half-empty,
attention is with family. A launch there disappears.

But look at what those three weeks *are*: the biggest household spending spike of the Israeli
calendar. Gifts, hosting, food, travel, מתנות לחגים. Everyone overspends.

The holidays end Saturday night, 3 October. Sunday 4 October is technically the first working
day — and it's a write-off, because the whole country spends it digging out of three weeks of
backlog. **Monday 5 October is when routine actually restarts, and it's the morning people look
at what the חגים cost them.** The pain then compounds all week: Israeli cards bill on a
selectable date, and the 2nd and the 10th are the common ones — so for a large share of your
audience the actual charge lands *during* your launch week.

That is the highest-intent moment for a budgeting app in the entire Israeli year, and it is
seven weeks away. Launch into it.

**What this buys you:** you told me you have basically no audience. There is no such thing as a
cold launch that charts — launch-week velocity comes from people who already knew you were
coming. Moving from 4 weeks to 7 turns "no audience" from a fatal problem into a solvable one,
and it hands you a three-week content window (the חגים spending spree) where your entire message
writes itself.

**Submission timing:** submit **Wed 23 Sep**, in the quiet gap between Yom Kippur and Sukkot.
Review typically clears in a day or two, but a first submission can get rejected on metadata or
a missing privacy detail — budget for one round trip. Once approved, **hold the release manually**
using App Store Connect's
"Manually release this version" until 5 Oct. You get a fully approved, ready-to-ship binary
sitting in the chamber for ten days — no launch-day review anxiety.

### 0.3 There is no landing page. Right now you have nowhere to send traffic.

I loaded richy-mgkl.vercel.app as a logged-out visitor. It served the app shell and rendered
**"Richy couldn't start / Something went wrong while loading."** No headline, no pitch, no
signup, no App Store badge.

Every shekel and every video in this plan needs somewhere to land. **This is task #1 of week 1
and it blocks everything downstream.** Two things to fix:

- Build a real marketing page (details in §6, asset L1).
- Whatever a logged-out visitor currently hits, it must never be an error screen. Even before
  the marketing page exists, that route should show the pitch and a waitlist field.

---

## 1. Campaign Overview

**Campaign name:** `אחרי החגים` — "After the Holidays"

The phrase every Israeli says all September to postpone anything hard. You're going to take the
country's favourite excuse and turn it into a start date.

**One-sentence summary:** In the three weeks Israelis are overspending on the holidays, Richy
counts along with them in public — then launches on the first working morning after, when the
bill arrives.

**Primary objective:**
> Reach **#1 budgeting app in the Israeli iOS Finance chart** during launch week (5–11 Oct 2026),
> via **1,000 Israeli downloads and 75+ App Store ratings at 4.5★ or better** in the first 7 days.

**Secondary objectives:**

| # | Objective | Target |
|---|-----------|--------|
| S1 | Pre-launch waitlist built before 5 Oct | **600 emails** |
| S2 | D7 retention of launch cohort | **≥35%** |
| S3 | Free-trial starts, launch week | **250** (25% of downloads) |
| S4 | Trial → paid conversion by 2 Nov | **≥20%** (≈50 paying) |
| S5 | Earned Israeli tech-press coverage | **2 placements** |
| S6 | English global storefront | **live listing only** — see §4.6 |

**Why 1,000 and 75:** [estimate] Apple doesn't publish chart thresholds, and the public ASO data
covers big markets, not Israel. Israel is a ~9M-person storefront where the non-bank Finance
band is thin. 1,000 downloads concentrated in one week is my judgement of what moves you into
the top-40 band and past Splitwise's territory; 75 ratings is roughly the volume where a new app
stops looking abandoned. Treat both as calibration targets, not physics — measure actual rank
daily from day one and adjust.

---

## 2. Target Audience

### Primary: "the חגים hangover" — Israelis 22–32, first real salary, no system

> A 26-year-old in Tel Aviv or Haifa, 2–4 years out of the army, earning ₪9–14k. Money arrives
> and money leaves and she couldn't tell you where. She just spent more than she meant to on the
> holidays and feels vaguely sick about it. She has downloaded a budgeting app before and
> abandoned it in four days. She learns about money from TikTok, not from banks.

**Pain points, ranked — these come from your own July simulation, not from my imagination:**

1. **"I don't know where it went."** Not a math problem. A visibility problem.
2. **Shame.** She feels behind and slightly stupid about money, and every bank app confirms it.
3. **Setup friction.** Your sim measured 40% giving up in the first session. That's the enemy.
4. **Distrust of handing over bank credentials.** Hold that thought — it's §3.
5. **Irregular income.** 4 of 10 personas. Freelancers and couples want this asked during
   onboarding, not bolted on.

**Where she is:** TikTok and Instagram Reels (primary), WhatsApp groups (the sharing layer —
nothing spreads in Israel without it), Israeli Facebook groups on קניות/חיסכון/כלכלת המשפחה,
and App Store search when she's finally motivated.

**Buying stage:** problem-aware, solution-skeptical. She knows she should budget. She doesn't
believe an app will make her do it. **Your job is not to explain budgeting. It's to be
believable.**

### Secondary: the privacy refuser

People who looked at RiseUp, saw ₪55/month and a request to connect their bank, and quietly
closed the tab. They're motivated and unserved. They're also §3.

### Explicitly NOT the audience

Spreadsheet people, FIRE forums, investors, and anyone who says "portfolio." They'll ask for
features that break your ISA position and they don't convert.

---

## 3. Key Messages — including the one that changes your product story

### 3.1 The wedge: turn your biggest weakness into the pitch

Your roadmap lists "no live bank connection" as a gap, and the July sim named the fake
"Sync your bank" card the **#1 cause of churn — 5 of 10 personas.** You've already scheduled
killing it under Tier 0. Good. But you're treating it as a bug fix, and it's bigger than that.

Look at the market. **RiseUp charges ₪55/month (₪44 on annual) and its core mechanic is
connecting to your bank.** Its promise is "להיות בטוב עם הכסף שלך." In March 2025 Geektime ran a
story about an Israeli dev who built a free RiseUp alternative — and the reason he gave for
building it was that people avoid RiseUp over **subscription cost and handing over banking
access.**

You cannot beat RiseUp on automation. You will never win "we connect to your bank" — they're
a licensed financial information service provider and you're one person.

So stop trying. **Take the other side of the trade.**

> **"בלי למסור לאף אחד את חשבון הבנק שלך."**
> *Without handing your bank account to anyone.*

Manual entry stops being a missing feature and becomes a deliberate stance: your numbers stay
yours, and the thirty seconds a day you spend typing them in is the entire reason you actually
know where your money goes. Plus Richard, plus a fifth of the price.

This is the only positioning available to you that is simultaneously **true, defensible, on-brand,
and impossible for RiseUp to copy** — they cannot say it without torching their own model. Take it.

**One honesty rule attached to this:** the moment you ship real bank sync, this message flips
from a stance into a lie. When that day comes the message becomes "connect it if you want, or
don't — your call." Don't let anyone talk you into shipping the message before you're ready to live with it.

### 3.2 Core campaign message

> **"אתה יודע כמה הוצאת על החגים. אתה לא יודע על מה."**
> *You know how much you spent on the holidays. You don't know what on.*
>
> Richy shows you — in Hebrew, in shekels, without connecting to your bank.

### 3.3 Supporting messages

| # | Message (HE) | Translation | Answers | Proof point |
|---|---|---|---|---|
| M1 | בלי למסור לאף אחד את חשבון הבנק שלך | Without handing anyone your bank account | Distrust | No bank credentials requested — verifiable in 10 seconds |
| M2 | ₪14.90 בחודש. לא ₪55. | ₪14.90/month. Not ₪55. | Cost | RiseUp's public price is ₪55/mo (₪44 annual) |
| M3 | ריצ'רד קרא את החודש שלך לפני שאתה שאלת | Richard read your month before you asked | "Another empty tracker" | Live demo of Richard answering on real figures |
| M4 | עברית אמיתית. שקלים אמיתיים. | Real Hebrew. Real shekels. | Localization | Hebrew-first RTL build, ₪ everywhere — see the caveat below |

**Caveat on M4, and I want you to actually hear this one:** your QA audit found the Overview
chart, four Profile rows, and Richard's own budget context are **hardcoded to `$`**, and flagged
that the App Store copy already overstates RTL and translation coverage. You cannot run M4 as a
campaign message and ship hardcoded dollar signs. One screenshot of a `$` in a Hebrew budget
app, posted in a Facebook group, and this message becomes the joke of the launch. **M4 is
blocked on that Tier 0 fix. No exceptions.**

### 3.4 The ISA line — this constrains every script in this campaign

Israel's Investment Advice Law makes no distinction between personal and general investment
advice; both require a license no software can hold. The general-advice exemption is still not
enacted. The ISA proposed licensing requirements for investment influencers in July 2025 and
issued a public warning in January 2026.

**You are about to run a campaign built on finance influencer content. That is precisely the
activity the ISA has said it is watching.**

Hard rules for every script, caption, and Richard response in this campaign:

- ✅ Allowed: budgeting, cash flow, tracking, saving toward a goal, debt payoff mechanics, "where did it go."
- ❌ Forbidden: any named financial product, fund, stock, or bank. Any ranking, "recommended,"
  or "best fit" badge. Any "what to do with your money." Any implied return.
- ❌ The word **"להשקיע"** does not appear in this campaign. Not once.
- ✅ Every creator asset carries: *"תוכן זה אינו מהווה ייעוץ השקעות ואינו תחליף לייעוץ המותאם אישית."*

This isn't caution for its own sake. Your exit thesis is a bank or investment house that already
holds the license buying you. A regulator file is the one thing that makes you unacquirable.

### 3.5 AI-generated creators — yes to one version, hard no to the other

You picked "pay creators" plus AI-generated influencers. You have Higgsfield wired up, so you can
produce Hebrew short-form at a volume no ₪1,000 budget could otherwise buy. That's a real edge
and we're using it. With one line drawn through the middle:

**✅ A branded AI presenter is fine.** A recurring, clearly stylized character — call her
**"רוני"** — who is visibly Richy's mascot-host, not a person. She explains, demos, narrates.
Disclosed as AI in the bio and on-screen. This is animation with a modern toolchain, and nobody
is deceived.

**❌ AI-generated fake customers giving testimonials is off the table.** A synthetic face saying
"I saved ₪800 with Richy" is a fabricated endorsement from a person who does not exist, about a
financial product, aimed at people who are anxious about money. That is deceptive advertising
under Israeli consumer protection law, it violates TikTok's and Meta's synthetic-media policies,
and it's a permanent App Store risk. I won't write those scripts and you shouldn't run them.

And set the regulatory question aside for a second, because the commercial argument is stronger:
**you are selling trust to people who have been burned by money.** The downside isn't a fine.
It's one Reddit thread — *"the Israeli budgeting app uses fake AI people to fake reviews"* — and
the brand is unrecoverable. You cannot buy back trust in this category. Don't spend it on
something a disclosed mascot does nearly as well.

**Real testimonials come from real users, and you'll have them by week 6.** That's what the
beta group in §5 is for.

---

## 4. Channel Strategy

Ranked by what actually moves the objective at ₪1,000/month.

### 4.1 TikTok + Instagram Reels — AI presenter, Hebrew · **Effort: High · Spend: ₪0**

**Why:** This is where your audience learns about money, and Higgsfield collapses the production
cost of Hebrew short-form to roughly zero. It's the only channel where a solo founder can
out-produce a funded competitor.

**Format:** 20–35s vertical. רוני on camera. Hebrew, spoken, subtitled. One idea per video.
**Volume target: 5/week from week 1, 10/week during launch week.** At this budget, volume *is*
the strategy — you're buying lottery tickets on the algorithm, and you need enough of them.

**The four content pillars:**

1. **"כמה באמת עלו החגים"** — the holiday cost counter. Running series through the whole
   holiday period. Documentary, not sales.
2. **"תשאל את ריצ'רד"** — screen-record Richard answering a real budgeting question. This is
   your best asset; your sim rated AI usefulness 5.1/10, which means Richard is under-explained,
   not bad.
3. **"בלי למסור את הבנק"** — the privacy wedge, stated plainly.
4. **"שבוע ראשון עם ריצ'י"** — a real person's first week. Ships week 6, when you have real users.

**Publishing:** you have TikTok publishing wired through Higgsfield — use it, but schedule for
19:00–22:00 Israel time and never batch-dump. Run new hooks through virality prediction before
committing to a variant.

### 4.2 Israeli Facebook groups + WhatsApp · **Effort: Medium · Spend: ₪0**

**Why:** Underrated by everyone under 30 and still the highest-conversion organic channel in
Israel for household money. Groups on חיסכון, כלכלת המשפחה, זוגיות וכספים, freelancer groups.
Thousands of members, actively asking for exactly this.

**How, and this matters:** you show up as *the guy building it*, not as an ad. "בניתי אפליקציית
תקציב בעברית כי נמאס לי לחבר את הבנק לכל דבר — מחפש 50 אנשים שינסו לפני שהיא עולה לאפ סטור."
That post recruits your beta group, your first ratings, and your real testimonials in one move.

**The WhatsApp loop — build this, it's your only free viral mechanic:** at month close, let a
user export a clean, beautiful, brand-consistent "החודש שלי" summary card as an image with the
Richy mark on it. Nothing spreads in Israel without WhatsApp. Give people something worth
forwarding. Asset P3.

### 4.3 Apple Search Ads — **your entire paid budget** · **Effort: Low · Spend: ₪700/mo**

**Why this and nothing else:** at ₪1,000/month, Meta and TikTok ads are a rounding error — you
cannot buy enough impressions to learn anything. ASA is different: the Israeli storefront is
cheap, and someone typing "ניהול תקציב" into the App Store has already decided to install
*something.* You are paying to be the thing they install. This is the single highest-ROI shekel
available to you.

**Bid on:** `ניהול תקציב`, `מעקב הוצאות`, `תקציב חודשי`, `אפליקציית תקציב`, `חיסכון`,
`הוצאות חודשיות` — and competitor brand terms (`riseup`, `רייזאפ`, `סכם לי`). Brand bidding is
permitted on ASA and in a market this size it is cheap.

**Run it dark until 5 Oct**, then all of it into launch week. Concentration beats duration when
the goal is chart rank.

### 4.4 Israeli tech press · **Effort: Medium · Spend: ₪0**

**Why this is real and not a fantasy:** Geektime already ran this exact story — solo Israeli dev
builds a free alternative to RiseUp, March 2025. The template is proven and the outlet is
reachable by a cold email.

**Your angle is better than his was:** he built his solo *without* AI over seven months. You
built a 27,000-line app *with* Claude Code, and it has an AI advisor inside it. "Solo founder
ships a full fintech product using AI coding agents" is a 2026 story; his was a 2025 story.

**Targets:** Geektime, Calcalist Tech, Globes tech desk, Ynet כלכלה.
**Timing:** pitch Wed 7 Oct — 48 hours *after* launch, with real download numbers in the email.
Nobody covers a launch; they cover traction. Pitching during Sukkot is throwing the story away.

### 4.5 App Store listing (ASO) · **Effort: Low · Spend: ₪0**

Your `APP_STORE_LISTING.md` is written in English and it's good. It is also **wrong for this
campaign.** The Israeli storefront needs a Hebrew localization: Hebrew name, Hebrew subtitle,
Hebrew keyword field, Hebrew screenshots with Hebrew UI. Apple indexes localizations separately —
you are currently invisible to every Hebrew search.

Also: the audit says the current copy overstates RTL/translation coverage. **Fix the copy or ship
the coverage.** Overclaiming in a store listing generates 1-star reviews in week one, and launch-week
reviews are close to permanent.

### 4.6 English / global — **listing only, zero spend**

You said "Israel first, English global second." I'm taking the second half almost entirely off the
table, and here's the arithmetic: ₪1,000/month against Monarch, YNAB, Copilot and Rocket Money in
the US buys you approximately nothing. Splitting a budget this size across two markets means
losing both.

**What "global second" means in practice:** publish the English listing so the app is downloadable
worldwide and organic finds it. Zero spend, zero content, zero effort. Revisit when Israel is won
and there's a real budget. Winning one small market completely is worth more at exit than being
invisible in two.

---

## 5. Content Calendar

Ship gates in **bold**. Everything before 5 Oct exists to make 5 Oct work.

| Week | Dates | Content / Work | Channel | Notes | Status |
|------|-------|----------------|---------|-------|--------|
| **1** | Aug 24–30 | **Landing page live + waitlist capture** | Web | Blocks everything. Logged-out visitors must never see an error | ☐ |
| 1 | Aug 24–30 | Tier 0 fixes begin: debt-edit data loss, Activity.saveEdit, boot timeout, `$` hardcoding | Product | **Hard gate on submission** | ☐ |
| 1 | Aug 24–30 | Kill the Leumi demo sync card + purge fabricated transactions | Product | #1 churn cause in your own sim | ☐ |
| 1 | Aug 24–30 | Build רוני: character sheet, voice, 3 pilot videos | TikTok/IG | Test hooks before committing to a look | ☐ |
| **2** | Aug 31–Sep 6 | 5 videos/wk cadence starts — pillar 1 + 3 | TikTok/IG | Pre-holiday: "כמה תוציא החודש?" | ☐ |
| 2 | Aug 31–Sep 6 | Founder post in 5 Facebook groups → **recruit 50 beta users** | FB/WhatsApp | Source of real testimonials + day-1 ratings | ☐ |
| 2 | Aug 31–Sep 6 | Hebrew App Store listing: name, subtitle, keywords, 6 screenshots | ASO | Hebrew UI in every screenshot | ☐ |
| **3** | Sep 7–13 | **Holiday spend series launches** (ר"ה 11–13 Sep) | TikTok/IG | Highest-intent content of the year. Count in public | ☐ |
| 3 | Sep 7–13 | Beta group onboarded, feedback loop open | Product | Watch first-session dropout vs the 40% baseline | ☐ |
| 3 | Sep 7–13 | Waitlist push: "נפתח אחרי החגים" | All | Target 300 by end of week | ☐ |
| **4** | Sep 14–20 | **Tier 0 sign-off — go/no-go** | Product | No fix, no submit. Non-negotiable | ☐ |
| 4 | Sep 14–20 | Build binary, ASA campaigns configured (paused) | Product/Paid | Ready to switch on, not spending | ☐ |
| 4 | Sep 14–20 | Holiday series continues; press pitch drafted | TikTok/PR | Don't send yet | ☐ |
| **5** | Sep 21–27 | **Submit to App Store — Wed 23 Sep** | Product | Yom Kippur 20–21, Sukkot from 25th. Aim for the gap | ☐ |
| 5 | Sep 21–27 | Set **"Manually release this version"** | Product | Approved binary held for 5 Oct | ☐ |
| 5 | Sep 21–27 | Launch assets finished: WhatsApp share card, 10 launch videos banked | All | Build now, publish later | ☐ |
| **6** | Sep 28–Oct 4 | Sukkot → Simchat Torah (ends Sat 3 Oct). Low output. Holiday series finale | TikTok/IG | Country is offline. Don't fight it | ☐ |
| 6 | Sep 28–Oct 4 | Waitlist warm-up email: "יום שני. אחרי החגים." | Email | Sun 4 Oct, evening | ☐ |
| **7** | **Mon Oct 5** | **🚀 LAUNCH.** Release. Waitlist email 09:00. All 10 videos. ASA live. Every group post | All | The bill has arrived. This is the moment | ☐ |
| 7 | Oct 5–11 | Beta group ratings drive — personal asks, not a broadcast | Direct | Target 75 ratings by Sun 11 Oct | ☐ |
| 7 | **Wed Oct 7** | **Press pitch sent — with 48h download numbers in it** | PR | Traction is the story, not the launch | ☐ |
| 7 | Oct 5–11 | Daily rank check + ASA keyword pruning | Paid | Kill anything over ₪12 CPI | ☐ |
| **8** | Oct 12–18 | Real-user "שבוע ראשון" testimonials ship | TikTok/IG | Real people now. This is what pillar 4 was waiting for | ☐ |
| 8 | Oct 12–18 | Trial-expiry cohort → first conversion read | Product | The number that decides everything after this | ☐ |
| 8 | Oct 12–18 | **Retro: rank achieved, CPI, D7, trial→paid → plan November** | — | | ☐ |

**Dependencies, stated plainly:**
`Tier 0 fixes` → `submission` → `held binary` → `launch day`
`Landing page` → `all pre-launch traffic` → `waitlist` → `launch-day velocity`
`Beta group (wk 2)` → `real testimonials + day-1 ratings` (wk 7)
`$ hardcoding fix` → **message M4 may be used**

---

## 6. Content Pieces Needed

**Must-have — the launch does not happen without these:**

| ID | Asset | What it is | By |
|----|-------|-----------|-----|
| L1 | Marketing landing page | Hebrew, RTL, mobile-first. Hero = the privacy wedge. Waitlist field → App Store badge on 5 Oct. Live Richard demo if you can manage it | **Aug 30** |
| L2 | Hebrew App Store listing | Name, 30-char subtitle, keyword field, description, 6 Hebrew-UI screenshots + preview video | Sep 6 |
| P1 | רוני character kit | Locked look, voice, 3 pilot videos | Aug 30 |
| P2 | Holiday spend series | 12–15 videos across weeks 3–6 | Sep 7 → Oct 4 |
| P3 | WhatsApp share card | Exportable "החודש שלי" image, branded. Your only free viral loop | Sep 27 |
| P4 | Launch-day video bank | 10 videos ready to publish 5 Oct | Sep 27 |
| E1 | Waitlist emails ×3 | Confirm · warm-up (4 Oct) · launch (5 Oct 09:00) | Oct 4 |
| PR1 | Press pitch | 150-word Hebrew pitch + fact sheet. Angle: solo founder ships fintech with AI agents | Oct 6 |
| C1 | Compliance footer | ISA disclosure + AI-disclosure line, on every creator asset | Aug 30 |

**Nice-to-have:** onboarding video for the listing preview, a "RiseUp vs Richy" honest comparison
page (strong SEO, but only publish it once you're confident every claim survives scrutiny),
Arabic and Russian listings (you have the strings — but not this campaign; one language done
properly first).

---

## 7. Success Metrics

**Primary KPI:** #1 budgeting app in Israeli iOS Finance during 5–11 Oct.
Proxy: **1,000 Israeli downloads + 75 ratings ≥4.5★ in 7 days** [estimate].

| KPI | Target | Source | Cadence |
|-----|--------|--------|---------|
| Israeli downloads, launch week | 1,000 | App Store Connect | Daily |
| Finance category rank (IL) | Top 40 | Manual chart check + Appfigures | Daily, 09:00 |
| Ratings volume / average | 75 / ≥4.5★ | App Store Connect | Daily |
| Waitlist before launch | 600 | Landing page | Weekly |
| **First-session completion** | **≥75%** | Product analytics | Weekly |
| D1 / D7 retention | 55% / 35% | App Store Connect | Weekly |
| Trial starts | 250 (25% of installs) | StoreKit | Daily, launch week |
| Trial → paid | ≥20% | StoreKit | From Oct 12 |
| Blended CPI (ASA) | <₪12 | ASA dashboard | Daily |
| Videos published | 5/wk, 10 launch week | Manual | Weekly |

**The one to actually watch:** first-session completion. Your simulation measured **40% giving
up in session one.** At that rate, every download this campaign buys leaks straight out the
bottom — you'd be paying to fill a bucket with a hole in it. If that number isn't fixed by
launch, none of the rest matters. It is the highest-leverage metric on this page and it's a
product number, not a marketing one.

**Reporting:** daily 5-line check during launch week (downloads, rank, ratings, trials, CPI).
Weekly otherwise. Full retro 18 Oct.

---

## 8. Budget — ₪1,000/month

| Item | Aug | Sep | Oct | Rationale |
|------|-----|-----|-----|-----------|
| Apple Search Ads | ₪0 | ₪100 | **₪700** | Dark until launch, then concentrated. Rank is a velocity game |
| Higgsfield credits | ₪400 | ₪400 | ₪200 | Video production is the whole organic engine |
| Landing page hosting/domain | ₪100 | ₪0 | ₪0 | Vercel free tier + a `.co.il` domain |
| Reserve | ₪500 | ₪500 | ₪100 | Unspent budget in Aug/Sep **rolls into October's ASA** |
| **Total** | ₪1,000 | ₪1,000 | ₪1,000 | |

**Effective launch-month firepower: ~₪1,800** if you hold the reserve. At ₪12 CPI that's ~150
paid installs — roughly 15% of the target. **The other 85% has to come from organic, the
waitlist, and the beta group.** That's not a flaw in the plan; it's the honest arithmetic of
launching on ₪1,000/month, and it's exactly why weeks 1–6 are audience-building rather than
promotion.

**Do not spend on:** Meta ads, TikTok ads, paid human influencers, PR agencies. At this budget
each of them buys a sample size too small to learn from.

---

## 9. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **Tier 0 not done by 23 Sep** | Medium | **Fatal** | Hard go/no-go on 20 Sep. If it slips, slip the launch — the calendar is not worth a data-loss bug in launch-week reviews. Next-best date: Mon 2 Nov |
| R2 | 40% first-session dropout persists | **High** | High | Product work, not marketing. Fix onboarding — especially the irregular/dual-income question your sim flagged 4/10 times. If unfixed by 28 Sep, cut the download target and spend the month on activation |
| R3 | Waitlist stalls under 300 | Medium | High | Trigger at 21 Sep. Response: shift ASA budget earlier to buy pre-launch installs, and double group outreach. Do not launch to nobody |
| R4 | AI presenter reads as cheap / gets flagged | Medium | Medium | Disclose in bio and on-screen from video one. Test 3 looks in week 1. If engagement is flat by week 3, pivot to screen-recording + voiceover — losing the face costs less than losing credibility |
| R5 | ISA attention on finance-creator content | Low | **Fatal** | §3.4 rules, no exceptions. Disclosure on every asset. Never name a financial product |
| R6 | RiseUp responds on price | Low | Medium | They won't for one indie app — and if they cut to ₪14.90 they break their own model. If it happens, compete on privacy, not price |
| R7 | Launch-week 1★ reviews from overclaimed listing | Medium | High | Fix the RTL/translation overclaim in the store copy before submission. Early reviews are close to permanent |

---

## 10. Next Steps — this week

1. **Decide the 5 October date.** Everything else depends on it. If you'd rather go early, tell me and I'll rebuild the calendar — but I'll argue with you first.
2. **Start the landing page today.** It blocks every channel in this plan.
3. **Confirm the Tier 0 fix schedule lands before 20 Sep**, especially the `$` hardcoding — message M4 is blocked on it.
4. **Lock pricing.** My recommendation: **₪14.90/month or ₪99/year, 14-day free trial.** Your sim's max WTP was $3.70 (~₪13); ₪14.90 sits just above it, which is right for a launch price with an annual escape hatch, and it reads as *deliberately* a quarter of RiseUp. 14 days beats 7 (a budgeting app needs a user to see a month bend) and beats 30 (you need a conversion signal before November).
5. **Post in the first Facebook group this week** and start recruiting 50 beta users. They are your day-one ratings and your only source of real testimonials.
6. **Register a `.co.il` domain.** `richy-mgkl.vercel.app` is not a URL you can put in a press pitch.

---

### Where this sits against the north star

#1 budgeting app in Israel is not the exit. It's the proof that gets you the exit — the thing a
bank or investment house can look at and see a Hebrew-native, mobile-first audience they don't
have and can't build. They already own the license you can't get. You own the users they can't
reach. That's the trade, and this campaign is how you build your side of it.
