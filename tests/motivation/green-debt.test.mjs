// A green month judged by the user's main goal, and paying a debt off.
//
// Agreed with Alon on 28 Sep 2026: from October 2026 a green month follows the
// main goal picked in the questionnaire - saving for a goal means keeping what
// the goal needs a month, paying off debt means paying a debt down (or keeping
// more than you spent), irregular income is judged over three months, and
// everyone else keeps "kept more than you spent". Months before October keep
// the old rule, so nobody's streak, XP or level goes down.
//
// And a debt can now be paid off. Save used to refuse 0 and Delete erased the
// debt, so the three debt badges and the Debt Breaker rank were unreachable.
//
//   node tests/motivation/green-debt.test.mjs
import { section, check, eq, done } from "../statement-import/harness.mjs";
import { pullApp, fixToday } from "./extract.mjs";

// Mid-January 2027: August-September 2026 sit under the old rule, October to
// December under the new one, and January is the month in progress.
fixToday("2027-01-15");
const app = pullApp(["motivSnapshot", "greenMonthState", "greenRuleFor", "greenJudge", "greenMonthCopy",
  "debtAfterEdit", "debtPaidOff", "debtPaidByMonth", "debtIsCleared", "monthStats", "RANKS", "GREEN_BY_GOAL_FROM"]);
const { motivSnapshot, greenMonthState, greenRuleFor, greenJudge, greenMonthCopy,
  debtAfterEdit, debtPaidOff, debtPaidByMonth, monthStats, RANKS, GREEN_BY_GOAL_FROM } = app;

// The rule as it stood before this change, verbatim, to prove that everyone
// the change is not meant to touch reads exactly as before.
function legacyGreenMonthState(tx, motiv, targetPct) {
  var stats = monthStats(tx);
  var keys = [], k;
  for (k in stats) keys.push(k);
  keys.sort();
  var now = new Date();
  var thisMonth = now.toISOString().slice(0, 7);
  var bar = targetPct > 0 ? targetPct : 0;
  var paused = {}, i;
  for (i = 0; i < motiv.pauses.length; i++) paused[motiv.pauses[i]] = true;
  var run = 0, total = 0, thisYear = 0, months = [];
  var yr = String(now.getFullYear());
  for (i = 0; i < keys.length; i++) {
    k = keys[i];
    if (k >= thisMonth) continue;
    var s = stats[k];
    var green = s.rate !== null && s.rate >= bar;
    months.push({ key: k, rate: s.rate, green: green, paused: !!paused[k] });
    if (paused[k]) continue;
    if (green) { run++; total++; if (k.slice(0, 4) === yr) thisYear++; }
    else run = 0;
  }
  return { run, total, thisYear, months };
}
const pick = (g) => ({ run: g.run, total: g.total, thisYear: g.thisYear, months: g.months });

let id = 1;
const row = (type, date, amount) => ({ id: id++, type, amount, label: type, date, catId: "c1", category: "Food", repeat: "none", pending: false });
const month = (ym, income, spent) => [row("income", ym + "-05", income), row("expense", ym + "-12", spent)];
const MOTIV = { weekConfirms: [], pauses: [], badges: [], seen: [] };
const GOAL = { coreProblem: "Saving for a specific goal", goalAmt: "4000", savings: "2600", timeline: "1 year", goalName: "Laptop" };

section("the rule each main goal gets");
{
  eq("starts with October 2026", GREEN_BY_GOAL_FROM, "2026-10");
  const g = greenRuleFor(GOAL, []);
  eq("goal: what is left over the timeline", [g.kind, g.need, g.goalName], ["goal", 116.67, "Laptop"]);
  eq("goal with no timeline: nothing to pace, old rule", greenRuleFor(Object.assign({}, GOAL, { timeline: "" })).kind, "base");
  eq("goal already covered: old rule", greenRuleFor(Object.assign({}, GOAL, { savings: "5000" })).kind, "base");
  eq("paying off debt", greenRuleFor({ coreProblem: "Paying off debt" }, []).kind, "debt");
  eq("irregular income", greenRuleFor({ coreProblem: "Managing irregular or variable income" }).kind, "irregular");
  ["Understanding where my money goes", "Planning finances with a partner", "Building financial confidence", "Just getting started with budgeting", ""]
    .forEach((p) => eq("'" + (p || "no answer") + "' keeps the old rule", greenRuleFor({ coreProblem: p }).kind, "base"));
  eq("no questionnaire at all", greenRuleFor(null, null).kind, "base");
}

section("saving for a goal");
{
  const R = greenRuleFor(GOAL, []);
  const stats = monthStats([...month("2026-10", 2000, 1900), ...month("2026-11", 2000, 1800), ...month("2026-09", 2000, 1950)]);
  check("kept 100 of the 116.67 it needs: not green", !greenJudge("2026-10", stats, 0, R).green);
  check("kept 200: green", greenJudge("2026-11", stats, 0, R).green);
  check("September is before the new rule: kept 50, green as before", greenJudge("2026-09", stats, 0, R).green);
}

section("paying off debt");
{
  const debts = [{ id: "d1", balance: 1000, payments: [{ date: "2026-11-20", amount: 400 }] }];
  const R = greenRuleFor({ coreProblem: "Paying off debt" }, debts);
  const stats = monthStats([...month("2026-10", 2000, 2300), ...month("2026-11", 2000, 2300), ...month("2026-12", 2000, 1900)]);
  check("spent more than came in, no debt paid: not green", !greenJudge("2026-10", stats, 0, R).green);
  check("spent more than came in but paid 400 off a debt: green", greenJudge("2026-11", stats, 0, R).green);
  check("kept more than spent: green", greenJudge("2026-12", stats, 0, R).green);
  eq("payments by month", debtPaidByMonth(debts), { "2026-11": 400 });
}

section("irregular income, judged across three months");
{
  const R = greenRuleFor({ coreProblem: "Managing irregular or variable income" });
  const tx = [...month("2026-10", 9000, 2000), ...month("2026-11", 0.01, 2500), row("expense", "2026-12-10", 2500)];
  const stats = monthStats(tx);
  check("a lean month after a big one stays green", greenJudge("2026-11", stats, 0, R).green);
  check("a month with no income at all, carried by October", greenJudge("2026-12", stats, 0, R).green);
  const lean = monthStats([...month("2026-10", 1000, 2000), ...month("2026-11", 1000, 1500), ...month("2026-12", 1000, 900)]);
  check("three months that spent more than came in: not green", !greenJudge("2026-12", lean, 0, R).green);
}

section("the streak: nobody's past changes");
{
  // Five finished months; August and September under the old rule.
  const tx = [...month("2026-08", 2000, 1990), ...month("2026-09", 2000, 1980), ...month("2026-10", 2000, 1700),
    ...month("2026-11", 2000, 1600), ...month("2026-12", 2000, 1500), ...month("2027-01", 2000, 100)];
  const old = legacyGreenMonthState(tx, MOTIV, 0);
  eq("no main goal: identical to the old code", pick(greenMonthState(tx, MOTIV, 0, greenRuleFor({}))), old);
  eq("no rule passed: identical to the old code", pick(greenMonthState(tx, MOTIV, 0)), old);
  const g = greenMonthState(tx, MOTIV, 0, greenRuleFor(GOAL, []));
  eq("goal saver: Aug and Sep judged the old way", g.months.slice(0, 2).map((m) => m.green), old.months.slice(0, 2).map((m) => m.green));
  eq("goal saver: Oct-Dec kept 300, 400, 500 against 116.67", g.months.slice(2).map((m) => m.green), [true, true, true]);
  eq("the month's own rate is still recorded (best-rate badges)", g.months.map((m) => m.rate), old.months.map((m) => m.rate));

  // Wide sweep: many shapes of account, none with a main goal, all identical.
  let same = 0, n = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const t = [];
    for (let m = 0; m < 14; m++) {
      const ym = new Date(Date.UTC(2025, 11 + m, 1)).toISOString().slice(0, 7);
      const inc = (seed * 37 + m * 11) % 5 === 0 ? 0 : 1500 + ((seed * 13 + m * 7) % 9) * 250;
      const out = 1200 + ((seed * 29 + m * 17) % 11) * 210;
      if (inc) t.push(row("income", ym + "-03", inc));
      t.push(row("expense", ym + "-15", out));
    }
    const pauses = seed % 4 ? [] : ["2026-11"];
    const mv = { weekConfirms: [], pauses, badges: [], seen: [] };
    ["", "Building financial confidence", "Understanding where my money goes"].forEach((p) => {
      n++;
      if (JSON.stringify(pick(greenMonthState(t, mv, 0, greenRuleFor({ coreProblem: p })))) === JSON.stringify(legacyGreenMonthState(t, mv, 0))) same++;
    });
  }
  eq("180 generated accounts without a changed goal read exactly as before", same, n);
}

section("a debt month with nothing else logged");
{
  const debts = [{ id: "d1", balance: 0, cleared: true, payments: [{ date: "2026-12-02", amount: 300 }, { date: "2026-08-02", amount: 300 }] }];
  const tx = [...month("2026-10", 2000, 1500), ...month("2026-11", 2000, 1500)];
  const g = greenMonthState(tx, MOTIV, 0, greenRuleFor({ coreProblem: "Paying off debt" }, debts));
  eq("December counts, August (old rule) is not added", g.months.map((m) => m.key), ["2026-10", "2026-11", "2026-12"]);
  eq("three in a row", g.run, 3);
  const base = greenMonthState(tx, MOTIV, 0, greenRuleFor({}, debts));
  eq("someone not paying off debt: the empty month is not added", base.months.map((m) => m.key), ["2026-10", "2026-11"]);
}

section("Profile's words for the month");
{
  const cur = (inc, exp) => ({ income: inc, expense: exp, rate: inc > 0 ? Math.round((inc - exp) / inc * 100) : null });
  const goalNow = { kind: "goal", green: false, kept: 50, need: 116.67, goalName: "Laptop" };
  const behind = greenMonthCopy(goalNow, cur(2000, 1950), 0);
  eq("behind the goal's pace is not 'came in red'", [behind.word, behind.tone], ["gmBehindGoal", "warn"]);
  eq("and says what the goal needs", behind.line, "gmGoalPace");
  eq("on pace", greenMonthCopy(Object.assign({}, goalNow, { green: true, kept: 200 }), cur(2000, 1800), 0).word, "gmOnTrack");
  eq("no goal name", greenMonthCopy(Object.assign({}, goalNow, { goalName: "" }), cur(2000, 1950), 0).line, "gmGoalPaceNoName");
  const red = greenMonthCopy({ kind: "base", green: false, rate: -10 }, cur(2000, 2200), 0);
  eq("old rule, spent more than came in", [red.word, red.tone, red.line], ["gmRed", "warn", "gmKeptPct"]);
  const none = greenMonthCopy({ kind: "base", green: false, rate: null }, null, 0);
  eq("no income yet", [none.word, none.tone, none.line], ["gmNoIncome", "none", "gmLogIncome"]);
  const paid = greenMonthCopy({ kind: "debt", green: true, paid: 400, rate: null }, cur(0, 300), 0);
  eq("paid a debt down with no income logged", [paid.word, paid.tone, paid.line], ["gmOnTrack", "good", "gmDebtPaid"]);
  const irr = greenMonthCopy({ kind: "irregular", green: true, rate: 41 }, null, 0);
  eq("irregular: no income this month, judged on three", [irr.word, irr.line], ["gmOnTrack", "gmIrregular"]);
  eq("no judgement passed: the old reading", greenMonthCopy(null, cur(2000, 1500), 0).word, "gmOnTrack");
}

section("paying a debt down");
{
  const d = { id: "d1", name: "Card", balance: 3000, apr: 18, minPayment: 100, createdAt: "2026-06-01" };
  const lower = debtAfterEdit(d, { balance: 2400 }, "2026-11-03");
  eq("a lower balance logs the difference", lower.payments, [{ date: "2026-11-03", amount: 600 }]);
  check("still open", !lower.cleared);
  const higher = debtAfterEdit(lower, { balance: 2500 }, "2026-11-20");
  eq("new charges log no payment", higher.payments.length, 1);
  const zero = debtAfterEdit(higher, { balance: 0 }, "2026-12-01");
  eq("edited to 0: paid off, dated, the rest logged", [zero.cleared, zero.clearedAt, zero.balance, zero.payments[1]], [true, "2026-12-01", 0, { date: "2026-12-01", amount: 2500 }]);
  const button = debtPaidOff(d, "2026-12-05");
  eq("the button does the same", [button.cleared, button.clearedAt, button.payments], [true, "2026-12-05", [{ date: "2026-12-05", amount: 3000 }]]);
  eq("paying it off twice keeps the first date", debtPaidOff(button, "2027-01-02").clearedAt, "2026-12-05");
  const back = debtAfterEdit(button, { balance: 200 }, "2027-01-03");
  eq("a paid-off debt given a balance again reopens", [back.cleared, "clearedAt" in back], [false, false]);
  check("the original is never changed", d.payments === undefined && d.cleared === undefined);
}

section("the debt badges can be earned");
{
  const base = { tx: [], savings: [], budgets: [], goals: [], categories: [], folders: [], onboardingData: {}, motivation: MOTIV };
  const debt = (n, bal) => ({ id: "d" + n, name: "Debt " + n, balance: bal, apr: 10, minPayment: 50 });
  const earned = (debts) => new Set(motivSnapshot(Object.assign({}, base, { debts })).badges.map((b) => b.def.id));
  const breaker = RANKS.find((r) => r.name === "Debt Breaker");

  const one = [debtPaidOff(debt(1, 900), "2026-12-01"), debt(2, 500)];
  const s1 = motivSnapshot(Object.assign({}, base, { debts: one }));
  check("one paid off: Cleared the Slate", earned(one).has("i-04-chipped-stage-3"));
  check("not debt-free while one is open", !earned(one).has("i-05-debt-free"));
  check("Debt Breaker rank opens", breaker.gate(s1.ctx));
  const all = [debtPaidOff(debt(1, 900), "2026-12-01"), debtPaidOff(debt(2, 500), "2026-12-09")];
  check("all paid off: Free and Clear", earned(all).has("i-05-debt-free"));
  const three = [1, 2, 3].map((n) => debtPaidOff(debt(n, 100 * n), "2026-12-0" + n));
  check("three paid off: Snowball's Chance", earned(three).has("i-07-snowball"));
  check("nothing paid off: none of them", !["i-04-chipped-stage-3", "i-05-debt-free", "i-07-snowball"].some((b) => earned([debt(1, 900)]).has(b)));
}

done("green month and debts");
