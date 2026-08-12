# Richy — Motivation System

Streaks, Levels and Badges. Design proposal, pre-implementation.

**Status:** awaiting your edits to the badge list. Nothing here is built yet.
The friends / social profile page is deliberately **not** designed here — you're
handing me that prompt separately. What this document *does* do is make sure the
data model is ready for it, so the social layer drops in without a migration.

---

## 0. The problem this solves

Every other budgeting app rewards you for *opening the app*. Richy's purpose is
the opposite: to make the app matter less over time, because your money is
handled. So the motivation layer can't reward engagement — it has to reward
**honesty** and **outcomes**.

Three rules everything below obeys:

1. **Never punish an emergency.** A car repair, a medical bill, a lost job. XP
   never decreases, levels never drop, and streaks can be shielded, repaired, or
   paused. A budgeting app that shames you during a bad month is a budgeting app
   you delete during a bad month.
2. **Fair across incomes.** A student on ₪4,000/month and a founder on ₪40,000
   must be able to reach the same level. Anything that's really a readout of
   income lives in *badges*, where rarity carries the flex — never in the level.
3. **No XP for engagement.** Opening the app, chatting with Richard, reading a
   lesson, scrolling the overview: zero XP. XP is for money moving the right way
   and for books being true.

---

## 1. Streaks — three layers

You picked all three. They run at different speeds on purpose: one you can win
this week, one you win this month, and a set that live inside the Budgets tab.

### Layer 1 — Clean Week *(fast, weekly, winnable from week one)*

**Not** "log something every day." A quiet day with no spending is not a
failure, and a daily streak turns into "open the app to protect the number."

A week is **Clean** when you've confirmed the week is complete. One tap, once a
week: Richy shows you the week's logged transactions and asks *"Is this
everything?"* You confirm — clean. A week with zero transactions still counts,
because the claim being made is "my books are true," not "I spent money."

- Bank Sync / Leumi users: the week auto-confirms unless there are unreviewed
  items sitting in the inbox.
- **Anti-gaming:** you can back-confirm at most 2 past weeks. Beyond that the
  week is gone — you can't reconstruct six months of "yes, that was everything."

### Layer 2 — Green Month *(slow, prestige, max 12/year)*

The period ended with savings rate ≥ **your own target**. Uses the existing
period mode (calendar / rolling / custom), so it respects whatever the user
already set.

- No target set → the bar is simply *spent less than you earned*.
- **Anti-gaming:** savings rate is computed net of transfers between your own
  accounts, so shuffling money from balance into a savings pot can't
  manufacture a green month.

### Layer 3 — Budget streaks *(ambient, per budget and per folder)*

Every budget carries its own run, shown as a small counter on its row:

- **Cap budgets** — consecutive periods finished at or under the cap.
- **Growth-target budgets and folders** — consecutive periods the target was met.

Because they're per-object, blowing Groceries doesn't touch Rent. Small,
frequent, concrete wins.

- **Anti-gaming:** the budget must have existed for the *whole* period. You
  can't create a budget on the 28th and claim the month.

### Grace, repair and pause — the part that actually retains users

| Mechanism | Applies to | How it works |
|---|---|---|
| **Shield** | Clean Week | Earn 1 shield per 4 consecutive clean weeks, hold max 2. A missed week silently spends a shield instead of breaking the run. |
| **Make it good** | Green Month | A red period can be repaired in the next one: if the next period's surplus covers *both* periods' shortfall, the streak stitches back together and renders as a repaired link. You genuinely made the money up — so it genuinely counts. |
| **Pause** | All three | Once per rolling 6 periods, mark a period as an exception (job loss, move, medical). The streak pauses rather than breaks, and is labelled honestly as paused — not hidden. |

**Copy rule, non-negotiable:** neutral language everywhere. *"This month came in
red"* — never *"You broke your 7-month streak!"* No red X, no shattering
animation, no guilt. The recovery badges (§5.R) exist specifically to make
coming back feel like an achievement rather than a walk of shame.

---

## 2. Levels — how "all three" reconcile

You said all three. They compose cleanly once you separate **the number** from
**the title**:

- **The level number (1–50) is earned by behaviour and progress against your own
  past.** Fair across incomes. Never drops.
- **Money milestones grant XP too** — but as *one-time ratchets*. Cross ₪10,000
  saved once and you keep that XP forever, even if you later spend it. This is
  how "money milestones" get in without letting a bad month de-level anyone.
- **Wealth gates the rank titles.** The grand names on your profile need real
  money moved, not just consistency.

So: a disciplined student climbs to level 50. The title *Vault Keeper* still
needs the money. Both signals exist, neither one blocks the other.

### XP sources

| Source | XP | Notes |
|---|---|---|
| Clean Week | 15 | |
| Green Month | 100 | |
| Budget held under cap for a period | 10 each | capped at 60/period |
| Goal ("budget book") completed | 80 | |
| Debt payment logged | 5 | capped at 20/period |
| Savings rate beat your own trailing 3-period average | 30 | the fairness engine — rewards *improvement*, not income |
| Badge earned | by rarity | 10 / 25 / 60 / 150 / 400 / 1000 |
| Opening the app, chatting with Richard, reading | **0** | deliberate |

### Curve

Cumulative XP to reach level *L* = `round(40 × (L−1)^1.5)`

| Level | 2 | 5 | 10 | 20 | 30 | 40 | 50 |
|---|---|---|---|---|---|---|---|
| Total XP | 40 | 320 | 1,080 | 3,313 | 6,247 | 9,743 | 13,720 |

A consistent user earns roughly **2,600 XP/year from behaviour** plus badges —
landing around level 25 at the end of year one, and level 50 somewhere in year
four or five. Long arc, appropriate for an app you're meant to keep for life.
All numbers are tunable constants in one config object.

### Rank ladder

Themed on *The Richest Man in Babylon*, which the app already quotes in its empty
states. Rename freely — these are placeholders you should feel free to rewrite.

| Rank | Levels | Wealth gate to display the title |
|---|---|---|
| Copper Counter | 1–5 | — |
| Purse Keeper | 6–10 | opening balance recorded + one budget held a full period |
| Lean Purse Mender | 11–15 | one green month |
| Seed Sower | 16–20 | first goal funded, or ₪1,000 in savings |
| Wall Builder | 21–25 | cushion ≥ 1 month of essentials |
| Gold Streamer | 26–30 | 3 green months |
| Debt Breaker | 31–35 | a debt cleared — or, if never in debt, 3 months of cushion |
| Caravan Master | 36–40 | net worth ≥ 2× opening balance |
| Vault Keeper | 41–45 | 6 green months + net worth ≥ 3× opening balance |
| Richest in Babylon | 46–50 | 12 green months + net worth ≥ 5× opening balance |

If you hit level 27 without 3 green months, you display **level 27, Wall
Builder** — the number advances, the title waits. Titles lag; they never block.

---

## 3. Badges — the rarity system

| Rarity | Colour | XP | Who gets it |
|---|---|---|---|
| **Common** | stone `T.ink3` | 10 | most users, week one |
| **Uncommon** | green `T.green` | 25 | a few weeks of real use |
| **Rare** | blue `T.blue` | 60 | months of consistency |
| **Epic** | purple `T.orange` | 150 | about a year, or a genuinely hard feat |
| **Legendary** | gold `T.gold` | 400 | very few users, multi-year |
| **Mythic** | iridescent | 1000 | the crazy ones. Some may never be earned by anyone. |

**Stars.** Within a family, ★ / ★★ / ★★★ mark the stages you asked for. Rarity
rises with stars. Earning ★★ supersedes ★ in the display but you keep both XP.

**The `reveals` column** is the important one, and it's why it's in the list
from day one rather than bolted on when the friends page ships:

- `none` — reveals nothing about your money (*"created your first budget"*)
- `habit` — reveals consistency only
- `wealth` — **reveals or strongly implies income or net worth**

`wealth` badges default to **hidden** on a shared profile even when the user has
turned sharing on generally. Under Amendment 13 financial data is very likely
מידע בעל רגישות מיוחדת, and "Seven Figures" on a public profile is a net-worth
disclosure with a friendly icon on it. Opt-in per badge, never opt-out.

**Early Earner.** Every badge granted by the launch backfill carries an *Early
Earner* marker — you did this before the badges existed. The badge keeps its
real earn-date, so the timeline stays honest.

---

## 4. Reading the list

`Trigger` is the computable condition. `P` = one period (per the user's period
mode). Money thresholds are in the user's own currency at face value — see
§7 open decisions, because ₪1,000 and $1,000 are not the same feat.

---

## 5. The badge list

### A. First steps

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| Opening Balance | | Common | Every ledger starts with one honest number. | opening balance recorded | none |
| First Coin | | Common | The Richest Man in Babylon started by tracking a single coin. | first transaction logged | none |
| Named | | Common | Richard knows what to call you. | nickname set | none |
| The Plan | | Common | You answered the hard questions. | onboarding questionnaire completed | none |
| Categorised | | Common | You made the app fit your life, not the other way round. | first custom category created | none |
| Filed | | Common | A place for everything. | first folder created | none |
| Books Open | | Common | Your first true week. | first Clean Week | habit |
| Ledger Literate | ★ | Common | Twenty-five entries. The habit is forming. | 25 transactions | none |
| Hundred Coins | ★★ | Uncommon | One hundred entries. The habit has formed. | 100 transactions | none |
| Thousand Coins | ★★★ | Rare | A thousand entries. This is who you are now. | 1,000 transactions | none |
| Ten Thousand Coins | | Epic | Ten thousand. Richard is genuinely impressed. | 10,000 transactions | none |

### B. Savings rate — the staged family

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| Pay Yourself First | ★ | Uncommon | A tenth of what you earned stayed yours. | savings rate ≥ 10% in a P | habit |
| Pay Yourself First | ★★ | Rare | A fifth kept. That's a real margin. | ≥ 20% in a P | habit |
| Pay Yourself First | ★★★ | Epic | Nearly a third. Very few people manage this. | ≥ 30% in a P | habit |
| Half of It | | Legendary | You kept half of everything you earned. | ≥ 50% in a P | wealth |
| The Monk | | Mythic | Seventy percent. We had to check the maths twice. | ≥ 70% in a P | wealth |
| Steady Hand | ★ | Uncommon | Three periods above your own bar. | 3 consecutive P above target | habit |
| Steady Hand | ★★ | Rare | Six periods. Not luck any more. | 6 consecutive | habit |
| Steady Hand | ★★★ | Epic | Twelve periods. A full year of holding the line. | 12 consecutive | habit |
| The Unbroken | | Mythic | Two years without a single miss. | 24 consecutive | habit |
| Better Than Before | ★ | Uncommon | You beat your own average. That's the only race. | savings rate +5pp vs own trailing 3-P average | habit |
| Better Than Before | ★★ | Rare | Ten points better than the you of three months ago. | +10pp | habit |
| Better Than Before | ★★★ | Epic | Twenty points. You changed something real. | +20pp | habit |
| From Nothing | | Rare | You went from saving nothing to saving something. | first P with positive savings rate after ≥3 P at ≤0 | habit |
| The Raise You Gave Yourself | | Rare | You cut enough to equal a pay rise, without one. | expenses down ≥10% over 3 P, income flat or lower | habit |

### C. Green Month streak

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| First Green | | Common | You finished a period in the green. | 1 green month | habit |
| Two in a Row | | Uncommon | Twice is a pattern. | 2 consecutive | habit |
| Quarter Green | ★ | Uncommon | Three straight periods in the black. | 3 consecutive | habit |
| Half Year Green | ★★ | Rare | Six months. Halfway to a perfect year. | 6 consecutive | habit |
| Full Year Green | ★★★ | Epic | Twelve consecutive green months. | 12 consecutive | habit |
| Two Years Green | | Legendary | Twenty-four. This is rarefied air. | 24 consecutive | habit |
| Five Years Green | | Mythic | Sixty consecutive green months. | 60 consecutive | habit |
| Repaired | | Rare | A red month, made good the next. It still counts. | streak stitched via *make it good* | habit |
| Back on the Horse | | Uncommon | You lost a streak and started another straight away. | new green month within 1 P of losing a streak ≥3 | habit |

### D. Clean Weeks and honesty

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| Clean Run | ★ | Common | Four true weeks in a row. | 4 consecutive Clean Weeks | habit |
| Clean Run | ★★ | Uncommon | Twelve weeks of honest books. | 12 consecutive | habit |
| Clean Run | ★★★ | Rare | Twenty-six weeks. Half a year of the truth. | 26 consecutive | habit |
| Year of Truth | | Epic | Fifty-two consecutive clean weeks. | 52 consecutive | habit |
| Shieldless | | Epic | Half a year clean, and you never once needed a shield. | 26 consecutive with 0 shields spent | habit |
| Same-Day Scribe | | Uncommon | Thirty transactions logged the day they happened. | 30 tx logged on their own date | habit |
| No Ghosts | | Uncommon | A whole period, nothing uncategorised. | 0 uncategorised tx in a P | none |
| Nothing Hidden | | Rare | Six periods, every transaction categorised, every week confirmed. | 6 P with 0 uncategorised + all weeks clean | habit |

### E. Budgets

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| First Limit | | Common | You told your money where to go. | first budget created | none |
| Under the Line | ★ | Uncommon | Every budget, under, for a whole period. | 1 P under all caps | habit |
| Under the Line | ★★ | Rare | Three periods, nothing over. | 3 consecutive | habit |
| Under the Line | ★★★ | Epic | Six periods. Every limit, every time. | 6 consecutive | habit |
| The Whole Board | | Legendary | A full year without a single budget overrun. | 12 consecutive | habit |
| Tight Rope | | Rare | Within two percent of the cap. Under it. | finished a P within 2% of a cap, not over | habit |
| Six Under | | Uncommon | Six budgets, all under, same period. | ≥6 budgets under cap in one P | habit |
| Folder Discipline | | Rare | The folder held — and so did everything inside it. | folder budget met with all child categories under | habit |
| Cut It Down | ★ | Uncommon | A tenth off a category, against your own average. | category spend −10% vs own 3-P average | habit |
| Cut It Down | ★★ | Rare | A quarter off. | −25% | habit |
| Cut It Down | ★★★ | Epic | Half. You genuinely changed a habit. | −50% | habit |
| The Big Cut | | Epic | Total spending down a quarter, and your income didn't drop. | total spend −25% vs own 6-P average, income ≥ flat | habit |

### F. Goals / Budget Books

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| First Book | | Common | A goal with a deadline is a plan, not a wish. | first budget book created | none |
| Goal Getter | ★ | Uncommon | One goal, finished. | 1 goal completed | habit |
| Goal Getter | ★★ | Rare | Three goals, finished. | 3 completed | habit |
| Goal Getter | ★★★ | Epic | Ten goals. You finish what you start. | 10 completed | habit |
| Twenty Books | | Legendary | Twenty completed goals. | 20 completed | habit |
| Ahead of Schedule | | Uncommon | Done before the deadline. | goal completed before its deadline | habit |
| Way Ahead | | Rare | Done in half the time you gave yourself. | completed in ≤50% of planned span | habit |
| Never Dipped | | Rare | Funded to the finish, never once raided. | goal completed with 0 withdrawals | habit |
| Three at Once | | Rare | Three goals funded in parallel. | 3 goals simultaneously ≥50% funded | habit |
| Big Book | | Epic | A goal worth three months of your income. | goal completed, target ≥ 3× monthly income | wealth |
| The Dream | | Legendary | A goal worth a year of your income. Finished. | goal completed, target ≥ 12× monthly income | wealth |

### G. Savings and cushion

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| First Pot | | Common | Money you've decided not to touch. | first savings account opened | none |
| Thousand | ★ | Common | A thousand set aside. | total savings ≥ 1,000 | wealth |
| Five Figures | ★★ | Uncommon | Ten thousand. | ≥ 10,000 | wealth |
| Six Figures | ★★★ | Rare | A hundred thousand. | ≥ 100,000 | wealth |
| Seven Figures | | Legendary | A million, set aside. | ≥ 1,000,000 | wealth |
| Cushion | ★ | Uncommon | One month of essentials, covered. | savings ≥ 1× monthly essentials | habit |
| Cushion | ★★ | Rare | Three months. You can absorb a shock. | ≥ 3× | habit |
| Cushion | ★★★ | Epic | Six months. You can absorb a bad year. | ≥ 6× | habit |
| The Fortress | | Legendary | Twelve months of essentials in reserve. | ≥ 12× | wealth |
| Untouched | | Rare | Six periods without a single withdrawal. | 6 P, 0 savings withdrawals | habit |
| Automatic | | Rare | Twelve periods, funded every single one. | 12 consecutive P with a savings contribution | habit |

### H. Multipliers — doubling and tripling

> Baseline is your **opening balance**, frozen at onboarding and never moved.
> Current value is **net worth** (balance + savings + investments − debts), so
> moving money into a savings pot never costs you progress.

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| The First Extra | | Common | You have more than you started with. | net worth > opening balance, first time | habit |
| Doubled | ★ | Rare | Twice what you started with. | net worth ≥ 2× opening balance | wealth |
| Tripled | ★★ | Epic | Three times over. | ≥ 3× | wealth |
| Fivefold | ★★★ | Legendary | Five times what you walked in with. | ≥ 5× | wealth |
| Tenfold | | Mythic | Ten times. Richard has removed his hat. | ≥ 10× | wealth |
| Hundredfold | | Mythic | One hundred times your opening balance. | ≥ 100× | wealth |
| Held the Line | | Rare | Twelve periods and you never once dropped below where you began. | net worth ≥ opening balance for 12 consecutive P | habit |

### I. Debt

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| Faced It | | Common | Writing it down is the hardest part. | first debt logged | none |
| Chipped | ★ | Common | A tenth of it, gone. | 10% of a debt repaid | habit |
| Chipped | ★★ | Uncommon | Halfway. | 50% repaid | habit |
| Chipped | ★★★ | Rare | One debt, gone entirely. | a debt cleared to zero | habit |
| Debt Free | | Epic | Nothing owed. Nothing at all. | all tracked debts at zero | wealth |
| Avalanche | | Rare | You killed the expensive one first. That's the right order. | highest-APR debt cleared first | habit |
| Snowball | | Rare | Three debts cleared. | 3 debts cleared | habit |
| Crossed Zero | | Epic | Your net worth turned positive. | net worth crossed from negative to positive | wealth |
| Interest Slayer | | Epic | Thousands you'll never pay in interest. | ≥5,000 projected interest saved vs minimums | habit |
| Never Again | | Rare | Twelve periods and not one new debt. | 12 consecutive P, no new debt added | habit |

### J. Investing

> Deliberately behaviour-only. No badge rewards *buying*, references a specific
> security, or implies an opinion on holdings — see §6.

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| Opened the Door | | Common | You started learning how this works. | investing account created | none |
| Learned It | | Uncommon | All six lessons, read. | all Basics + Core lessons completed | none |
| The Long Game | ★ | Uncommon | Six periods, no panic. | held 6 P with no sells | habit |
| The Long Game | ★★ | Rare | A year of sitting still. | 12 P | habit |
| The Long Game | ★★★ | Epic | Three years. Patience is the whole strategy. | 36 P | habit |
| Steady Contributor | | Rare | Twelve periods, contributed every one. | 12 consecutive P with a contribution | habit |
| Didn't Flinch | | Epic | It dropped ten percent and you didn't move. | held through a P with ≥10% portfolio decline | habit |

### K. Trips

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| First Trip | | Common | A holiday with a plan attached. | first trip created | none |
| Under Budget Abroad | | Rare | You came home under budget. | trip completed under total budget | habit |
| Half the Trip | | Epic | Half the budget, all of the holiday. | trip completed at ≤50% of budget | habit |
| Souvenir Discipline | | Rare | Every category, inside its split. | trip completed, all categories under | habit |
| The Grand Tour | | Legendary | Five trips. Five times under budget. | 5 trips completed, all under | habit |

### L. Notes — money between people

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| Kept Track | | Common | You wrote it down instead of hoping you'd remember. | first note created | none |
| Settled Up | | Common | Squared away. | first note settled | none |
| Clean Slate | ★ | Uncommon | Five settled. | 5 notes settled | none |
| Clean Slate | ★★ | Rare | Twenty-five settled. | 25 settled | none |
| Clean Slate | ★★★ | Epic | A hundred. Nobody keeps books like you. | 100 settled | none |
| Nobody Owes Nobody | | Uncommon | A whole period with nothing outstanding, either way. | 0 open notes for a full P | none |
| The Bank of You | | Rare | Five thousand lent and returned. | ≥5,000 repaid to you across settled notes | wealth |

### M. Found Money and Big Decisions

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| First Find | | Common | Richard found money and you went and got it. | first Found Money item acted on | none |
| Treasure Hunter | ★ | Uncommon | Five hundred recovered. | foundMoney.tally ≥ 500 | habit |
| Treasure Hunter | ★★ | Rare | Five thousand recovered. | ≥ 5,000 | habit |
| Treasure Hunter | ★★★ | Epic | Twenty-five thousand, found in your own accounts. | ≥ 25,000 | wealth |
| Subscription Slayer | | Rare | Five recurring charges, cancelled. | 5 recurring charges ended after being surfaced | habit |
| Thought It Through | | Common | You took a decision to a verdict instead of a vibe. | first Big Decision resolved | none |
| Walked Away | | Rare | The maths said no, and you listened. | declined a purchase after an unaffordable verdict | habit |
| Ten Decisions | | Rare | Ten big calls, all thought through. | 10 decisions resolved | none |

### N. Business

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| Open for Business | | Common | Business money, kept separate. Finally. | business account created | none |
| In the Black | | Uncommon | A profitable month. | business P with positive profit | wealth |
| Runway | ★ | Uncommon | Three months of runway. | runway ≥ 3 months | wealth |
| Runway | ★★ | Rare | Six months. You can plan now. | ≥ 6 months | wealth |
| Runway | ★★★ | Epic | A year of runway. | ≥ 12 months | wealth |
| Tax Pot Ready | | Rare | The tax bill holds no fear. | tax pot ≥ estimated liability | habit |
| Paid In Full | | Rare | Every invoice collected, nothing overdue. | full P, 0 overdue invoices, all collected | habit |
| Doubled the Business | | Epic | Twice the revenue of your first full month. | revenue ≥ 2× first full month | wealth |

### O. Household

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| Two Purses | | Common | Money, shared honestly. | joined a household | none |
| Aligned | | Uncommon | Both of you, logging, same period. | both members logged tx in one P | habit |
| Green Together | | Rare | A green month as a household. | household green month | habit |
| A Year Together | | Legendary | Twelve green months, together. | 12 consecutive household green months | habit |

### P. Time served

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| One Month In | | Common | Thirty days. | 30 days since signup | none |
| One Season | | Common | Ninety days. | 90 days | none |
| Half a Year | | Uncommon | Six months with Richy. | 180 days | none |
| One Year | | Rare | A full year. | 365 days | none |
| Two Years | | Epic | Two years. | 730 days | none |
| Five Years | | Legendary | Five years of honest books. | 1,825 days | none |
| Ten Years | | Mythic | A decade. Richard has no words. | 3,650 days | none |
| Early Earner | | Rare | You were here before the badges were. | holds ≥1 backfilled badge | none |

### Q. Restraint — rewarding the thing that didn't happen

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| Slept On It | | Uncommon | You waited a week. The urge passed. | ≥7 days between flagging a large purchase and deciding | habit |
| Said No | | Rare | The best purchase is sometimes the one you don't make. | 3 flagged purchases declined | habit |
| The Empty Cart | | Uncommon | A whole period, nothing spent in a category you normally can't resist. | 0 tx in a category with ≥3-P spending history | habit |
| Quiet Quarter | | Rare | Three periods, no impulse spending at all. | 3 consecutive P with 0 flagged impulse tx | habit |

### R. Recovery — the most important table here

These exist because the moment a user comes back after failing is the moment
the app either keeps them or loses them. Making that moment a *reward* rather
than a walk of shame is worth more than every Legendary in this document.

| Badge | ★ | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|---|
| Came Back | | Uncommon | You came back. That's the hard part. | logged a tx after ≥30 days away | none |
| Caught Up | | Uncommon | A month of gaps, filled in honestly. | backfilled ≥30 days of missing tx | none |
| Rebuilt | | Epic | Three red months, and then you turned it around. | green month after ≥3 consecutive red | habit |
| Out of the Hole | | Epic | You climbed all the way back. | net worth returns to its previous peak after ≥25% drawdown | wealth |
| Second Wind | | Rare | A new streak, longer than the one you lost. | streak exceeds a previously broken one | habit |

### S. Mythic — the crazy ones

You said don't be afraid. Some of these may never be earned by a single user,
and that's the point — a badge nobody has is a badge everybody talks about.

| Badge | Rarity | What the user sees | Trigger | Reveals |
|---|---|---|---|---|
| The Perfect Period | Mythic | Every budget under. Half your income saved. Nothing uncategorised. One period, everything right. | all caps under + savings rate ≥50% + 0 uncategorised in one P | wealth |
| Perfect Year | Mythic | Twelve green months. Fifty-two clean weeks. Not one budget overrun. | 12 green + 52 clean + 0 overruns in 12 P | habit |
| The Ascetic | Mythic | You lived on a tenth of what you earned. | expenses ≤10% of income for a full P | wealth |
| Ghost Month | Legendary | A whole month, essentials only. Nothing else. | full P with 0 discretionary-category spend | habit |
| Nothing Left to Find | Mythic | Twelve periods. No overruns. And Richard could not find you a single wasted shekel. | 12 consecutive P, 0 overruns, 0 open Found Money findings | habit |
| Millionaire's Ledger | Legendary | Seven figures — and still logging every coin. | net worth ≥ 1,000,000 in a green month | wealth |
| Ten Years Green | Mythic | One hundred and twenty consecutive green months. | 120 consecutive | habit |
| The Babylonian | Mythic | Level 50, every gate passed. There is nothing left to earn. | max level + all rank gates | wealth |

---

**Total: 158 badges** across 19 families — 35 Common, 41 Uncommon, 46 Rare, 24
Epic, 12 Legendary, 10 Mythic.

---

## 6. Constraints this design is already obeying

**Investing badges and the ISA line.** Per `.claude/skills/open-finance-legal`,
Richard must not opine on the כדאיות of holding, buying or selling a security.
A badge is app-generated commentary tied to real holdings, so the same line
applies: nothing in §J rewards buying, names a security, or implies a position
is good. They reward patience and study only. *Didn't Flinch* is the closest to
the line — it's framed as behaviour ("you didn't move"), not as a verdict, and
I'd still run it past whoever reviews the Richard prompt.

**Amendment 13 and the badge list.** Financial data is very likely מידע אישי
בעל רגישות מיוחדת. That's why `reveals` exists on every row now rather than
later: `wealth` badges are net-worth and income disclosures, and they must be
individually opt-in on any shared profile, defaulted off, with the sharing
state stored per badge rather than as one global flag. Building that field in
now means the friends page you're about to spec doesn't need a data migration.

**Streak mechanics and vulnerable users.** Shields, repair and pause aren't
generosity — they're the difference between a tool and a stick to beat yourself
with, for someone in genuine financial distress. Worth holding onto if the
system ever gets tuned for engagement.

---

## 7. Open decisions — I need your call

1. **Currency thresholds.** Fixed-amount badges (*Thousand*, *Five Figures*,
   *Seven Figures*) are the same numeral in whatever currency the user picked —
   so ₪1,000 and $1,000 are the same badge for very different feats. Options:
   (a) same numeral everywhere, simplest and what most apps do; (b) per-currency
   thresholds; (c) drop absolute amounts entirely and make every money badge
   income-relative. I lean (a) with the income-relative badges carrying the real
   fairness load, which is how it's written above.

2. **Translation volume.** ~158 badges × name + description × 4 languages ≈
   1,264 new strings. Options: translate everything; or keep badge *names* in
   English as proper nouns (common in games) and translate only descriptions,
   roughly halving it. Your call — the app's Hebrew is currently complete, so
   English-only names would be the first place it isn't.

3. **Notification pressure.** 158 badges is a lot of potential interruptions. I'd
   propose: Common badges accumulate silently and appear in a weekly digest;
   Rare and above get a moment. Otherwise the backfill alone fires forty toasts
   on first launch.

4. **The backfill moment.** *Early Earner* is in. Do you want the first-run
   reveal to be one ceremonial screen ("here's everything you'd already earned"),
   or a quiet grant with a badge-count notification? The screen is better but
   it's a whole build.

5. **Where this lives in the UI.** Profile tab is the obvious home. Levels and
   streaks probably also want a presence on Overview. I haven't designed any
   screens yet — tell me if you want that before or after the friends page.

---

## 8. What happens next

1. You edit this list — cut, rename, add, re-rarity.
2. I implement streaks + levels + badges against the edited list.
3. You hand me the friends / social profile prompt, and the `reveals` field and
   per-badge sharing state are already sitting there waiting for it.
