// The money profile: judging each user by who they said they are.
//
// Reported case: a teenage friend of the founder earns well for his age from a
// minimum-wage job, keeps most of it, spends like a normal teenager - and the
// app shamed him. These tests run the shipped code on a month like his, and
// check that an account which never answered the new questions reads exactly
// as it did before, against the real old code (legacy.mjs).
//
//   node tests/money-profile/profile.test.mjs
import { readFileSync } from "fs";
import { app } from "./extract.mjs";
import { makeLegacyStory, makeLegacyMonthVerdict, legacySuggestBudgets, legacyLocalRead } from "./legacy.mjs";
import { SRC } from "../statement-import/extract.mjs";
import { section, check, eq, done } from "../statement-import/harness.mjs";

const {
  moneyProfile, keepingState, calmLeakTypes, planSpendRoom, starterBudgets, starterKeep, moneyProfileBlock,
  deriveMoneyStory, alfredWatch, monthVerdict, findMoney, setActiveMoneyProfile, activeMoneyProfile,
  planMonthBasis, keepBarPct, greenRuleFor, greenJudge, greenMonthCopy, dreamMonthState, offlineMonthRead, offlineTipsFor, offlineSavingsAnswer, nextMoveSavingsBar, dollars,
  PROFILE_STRINGS, STAGES, SITUATIONS, SAVE_HABITS, DREAMS, LEAK_OPTIONS, DEFAULT_CATEGORIES
} = app;
const CATS = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
const tokenTr = (k) => k;
const legacyStory = makeLegacyStory();
const legacyVerdict = makeLegacyMonthVerdict(tokenTr, new Proxy({}, { get: (_, k) => k }));

// Every date-dependent rule reads the clock; the whole file runs on one day.
const TODAY = "2026-09-20";
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...a) { if (a.length) super(...a); else super(TODAY + "T12:00:00Z"); }
  static now() { return new RealDate(TODAY + "T12:00:00Z").getTime(); }
};

let nextId = 1;
const spend = (date, amount, label, catId) => {
  const c = CATS.find((x) => x.id === catId);
  return { id: nextId++, type: "expense", amount, label, date, catId, category: c.name, repeat: "none", pending: false };
};
const pay = (date, amount) => ({ id: nextId++, type: "income", amount, label: "Pay - weekend job", date, catId: "c8", category: "Salary", repeat: "none", pending: false });

// A teenager's month: paid 2,000 from a minimum-wage weekend job, family
// covers the basics, and the money goes where a teenager's money goes -
// snacks, the bus, the cinema, pizza with friends. About 800 spent a month,
// the rest kept. September has a bigger month out with friends.
function teenMonth(ym, goingOut, sneakers) {
  const d = (day) => ym + "-" + String(day).padStart(2, "0");
  const rows = [pay(d(10), 2000)];
  const snacks = [14, 18, 12, 22, 16, 11, 19, 15, 13, 17];
  snacks.forEach((a, i) => rows.push(spend(d(1 + i * 2), a, "Kiosk", "c2")));
  [6, 6, 6, 6, 6, 6].forEach((a, i) => rows.push(spend(d(2 + i * 3), a, "Bus", "c3")));
  goingOut.forEach((a, i) => rows.push(spend(d(3 + i * 4), a, i % 2 ? "Pizza with friends" : "Cinema", "c5")));
  // Clothes now and then, on no schedule - not every month on the same day.
  if (sneakers) rows.push(spend(d(sneakers[0]), sneakers[1], "Sneakers", "c6"));
  // The one real subscription in the month, which must still be caught.
  rows.push(spend(d(7), 19.9, "Spotify", "c5"));
  rows.push(spend(d(18), 90, "Phone top-up", "c11"));
  return rows;
}
// September is only up to the 20th, and every row in it must be on or before
// today to count, so the month is built with days 1-19.
const TEEN_TX = [
  ...teenMonth("2026-06", [45, 40, 50, 42], [15, 180]),
  ...teenMonth("2026-07", [44, 48, 41, 46], null),
  ...teenMonth("2026-08", [47, 43, 45, 44], [2, 240]),
  ...teenMonth("2026-09", [70, 85, 90, 80], null).filter((t) => t.date <= "2026-09-19"),
];

const TEEN_ANSWERS = { lifeStage: "Teenager", situation: "family", saveHabit: "most", coreProblem: "Saving for a specific goal" };
const TEEN = moneyProfile(TEEN_ANSWERS);
const NOBODY = moneyProfile({});

// ---------------------------------------------------------------------------
section("the profile itself");
{
  eq("teen: stage", TEEN.stage, "teen");
  eq("teen: keeps half", TEEN.keepRate, 0.5);
  check("teen: small everyday spending is normal", TEEN.everydayNormal === true);
  check("teen: family covers the basics", TEEN.basicsCovered === true);
  check("teen: never held above the old 10% line for 'worth a look'", TEEN.watchBelow <= 10, TEEN.watchBelow);
  eq("unanswered: not answered", NOBODY.answered, false);
  eq("unanswered: the old bands, 10 and 20", [NOBODY.watchBelow, NOBODY.greatAt], [10, 20]);
  eq("unanswered: keeps nothing back", NOBODY.keepRate, 0);
  check("unanswered: nothing is normal", NOBODY.everydayNormal === false);
  // An account that only ever answered the old stage question still benefits.
  const oldTeen = moneyProfile({ lifeStage: "Teenager" });
  check("stage only (older accounts): answered", oldTeen.answered === true);
  check("stage only (older accounts): small spending is normal", oldTeen.everydayNormal === true);
  eq("not saving yet: a month that kept nothing is still worth a look", moneyProfile({ saveHabit: "none" }).watchBelow, 1);
  eq("paying off debt: a thin savings rate is not a warning", moneyProfile({ lifeStage: "Working", coreProblem: "Paying off debt" }).watchBelow, 1);
  check("retired: drawing on savings can be the plan", moneyProfile({ lifeStage: "Retired" }).drawdown === true);
  check("self-employed: judged across months", moneyProfile({ lifeStage: "Self-employed" }).irregular === true);
  check("an unknown stage label is ignored, not guessed", moneyProfile({ lifeStage: "Astronaut" }).answered === false);
}

// ---------------------------------------------------------------------------
section("the teenager's month, as the app used to read it");
{
  const w = alfredWatch({ tx: TEEN_TX, categories: CATS, budgets: [], goals: [], profile: NOBODY });
  const types = w.leaks.map((l) => l.type);
  check("his everyday spending was filed as leaks", types.includes("drift") || types.includes("jump"), types);
  eq("and nothing was set aside as 'worth knowing'", w.notes.length, 0);
}

// ---------------------------------------------------------------------------
section("the teenager's month, read against his own answers");
{
  const w = alfredWatch({ tx: TEEN_TX, categories: CATS, budgets: [], goals: [], profile: TEEN });
  const leakTypes = w.leaks.map((l) => l.type);
  check("no small-purchase leak", !leakTypes.includes("drift"), leakTypes);
  check("no 'category jumped' leak for a bigger month out", !leakTypes.includes("jump"), leakTypes);
  const noteTypes = w.notes.map((n) => n.type);
  check("still visible, as worth knowing", noteTypes.includes("drift") || noteTypes.includes("jump"), noteTypes);
  check("notes carry no warning wording", w.notes.every((n) => !/leak|over|short/i.test(n.title)), w.notes.map((n) => n.title));
  check("notes stay out of every count", w.totals.signals === w.all.length && w.all.every((s) => !w.notes.includes(s)));
  check("he is keeping what he meant to", w.keeping.onTrack === true, w.keeping);
  eq("keeping, this month", w.keeping.basis, "month");
  check("no savings-slip warning", !w.risks.some((r) => r.type === "slip"), w.risks.map((r) => r.type));

  const sep = TEEN_TX.filter((t) => t.date.slice(0, 7) === "2026-09");
  const inc = sep.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const exp = sep.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const rate = Math.round((inc - exp) / inc * 100);
  const v = monthVerdict({ watch: w, savingsRate: rate, hasIncome: true });
  eq("the month reads as good", v.level, "good");

  const leakList = findMoney(TEEN_TX, CATS, { profile: TEEN });
  check("the Spotted Leaks list agrees", !leakList.some((f) => f.type === "drift" || f.type === "jump"));
  const withCalm = findMoney(TEEN_TX, CATS, { profile: TEEN, withCalm: true });
  check("nothing is lost - asked for, the rows are still there", withCalm.length >= leakList.length + w.notes.filter((n) => n.type !== "slip").length);
}

// ---------------------------------------------------------------------------
section("a habit is not a subscription - for anyone");
{
  // Same price, bought many times a month: the kiosk, the bus, the cinema
  // with friends. The detector used to file these as subscriptions to cancel,
  // for every account, and call a pricier film a price rise.
  const rec = findMoney(TEEN_TX, CATS, { profile: NOBODY }).filter((f) => f.type === "recurring" || f.type === "hike");
  const names = rec.map((f) => f.merchant || f.title);
  ["Kiosk", "Bus", "Cinema", "Pizza with friends"].forEach((m) => check(m + " is not a subscription", !names.some((n) => n.indexOf(m) === 0), names));
  check("a real monthly subscription still is", rec.some((f) => f.type === "recurring" && f.merchant === "Spotify"), names);
  check("no invented price rise", !rec.some((f) => f.type === "hike"), names);
  // A daily coffee at one price for three months.
  const coffee = [];
  for (let i = 0; i < 80; i++) { const d = new RealDate(RealDate.UTC(2026, 5, 25) + i * 86400000).toISOString().slice(0, 10); coffee.push(spend(d, 4.5, "Morning coffee", "c2")); }
  check("a daily coffee is not a subscription", !findMoney(coffee, CATS, { profile: NOBODY }).some((f) => f.type === "recurring"));
  const marked = coffee.slice(0, 6).map((t, i) => Object.assign({}, t, { date: "2026-0" + (4 + i) + "-03", repeat: "monthly", label: "Gym" }));
  check("a charge the user marked monthly still is", findMoney(marked, CATS, { profile: NOBODY }).some((f) => f.type === "recurring"));
}

// ---------------------------------------------------------------------------
section("an adult who is NOT meeting their own plan still hears about it");
{
  // Same transactions, but an adult who said they keep a lot while the data
  // says September kept less than that bar would be a different story; here
  // the bar is met, so check the other side with a month that overspends.
  const adult = moneyProfile({ lifeStage: "Working", situation: "own", saveHabit: "lots" });
  const heavy = TEEN_TX.map((t) => (t.date.slice(0, 7) === "2026-09" && t.type === "income") ? Object.assign({}, t, { amount: 700 }) : t);
  const w = alfredWatch({ tx: heavy, categories: CATS, budgets: [], goals: [], profile: adult });
  check("below their own bar: not on track", w.keeping.onTrack === false, w.keeping);
  check("so small purchases are still a leak for them", w.leaks.some((l) => l.type === "drift" || l.type === "jump"), w.leaks.map((l) => l.type));
}

// ---------------------------------------------------------------------------
section("the money story");
{
  const teenStory = deriveMoneyStory({ income: "2000", essentials: "0", overspend: "", leaks: ["goingout"], goalName: "Laptop", goalAmt: "4000", lifeStage: "Teenager", situation: "family", saveHabit: "most" });
  eq("a saver hears what the habit builds", teenStory.mode, "strength");
  eq("from his own numbers: half of 2,000", teenStory.keepMo, 1000);
  eq("a year of it", teenStory.keepYr, 12000);
  eq("the goal at that pace", teenStory.goalMonths, 4);
  check("no invented leak anywhere in it", teenStory.monthlyLeak === undefined && teenStory.derived === undefined);

  const before = legacyStory({ income: "2000", essentials: "0", overspend: "", leaks: ["goingout"], goalName: "Laptop", goalAmt: "4000" });
  eq("what the old code told him: an invented leak", [before.mode, before.derived, before.monthlyLeak], ["full", true, 240]);

  eq("'nowhere really' with no saving habit: no leak story either", deriveMoneyStory({ income: "3000", leaks: ["none"] }).mode, "strengthMin");
  const named = deriveMoneyStory({ income: "4000", leaks: ["delivery"], overspend: "300", saveHabit: "steady" });
  eq("a saver who named an overspend hears it as room, from their own figure", [named.mode, named.roomMo], ["strength", 300]);
  const guess = deriveMoneyStory({ income: "4000", leaks: ["noidea"], overspend: "", saveHabit: "steady" });
  eq("a saver who said 'no idea' is never handed a guessed figure", guess.roomMo, 0);
}

// ---------------------------------------------------------------------------
section("starter budgets");
{
  const b = starterBudgets({ income: "2000", essentials: "150", leaks: [], lifeStage: "Teenager", situation: "family", saveHabit: "most" });
  const by = Object.fromEntries(b.map((x) => [x.category, x.limit]));
  check("no rent budget when family pays it", by.Housing === undefined, b);
  const total = b.reduce((s, x) => s + x.limit, 0);
  check("the budgets leave his half untouched", total <= 2000 - 1000, total);
  check("going out gets the biggest fun share", by.Entertainment > by.Shopping && by.Entertainment > by.Other, by);
  check("the keep line he is shown is at least what he said", starterKeep({ income: "2000" }, b) >= 1000, starterKeep({ income: "2000" }, b));
}

// ---------------------------------------------------------------------------
section("Safe to Spend keeps what they said they keep");
{
  eq("half of 2,000 kept, 620 spent: 380 left to spend", planSpendRoom(2000, 620, TEEN), 380);
  eq("never negative", planSpendRoom(2000, 1500, TEEN), 0);
  eq("no habit given: no change to the number", planSpendRoom(2000, 620, NOBODY), null);
  eq("no income yet: no change to the number", planSpendRoom(0, 620, TEEN), null);
}

// ---------------------------------------------------------------------------
section("the month verdict, profile by profile");
{
  const quiet = { risks: [], leaks: [] };
  const lvl = (P, rate) => monthVerdict({ watch: quiet, savingsRate: rate, hasIncome: true, profile: P }).level;
  eq("'little' saver keeping 6%: on track by their own plan", lvl(moneyProfile({ saveHabit: "little" }), 6), "good");
  eq("unanswered keeping 6%: worth a look, as before", lvl(NOBODY, 6), "watch");
  eq("'not saving yet', kept nothing: worth a look", lvl(moneyProfile({ saveHabit: "none" }), 0), "watch");
  eq("'not saving yet', kept 3%: good", lvl(moneyProfile({ saveHabit: "none" }), 3), "good");
  eq("retired, a negative month: worth a look, not an alarm", lvl(moneyProfile({ lifeStage: "Retired" }), -15), "watch");
  eq("working, a negative month: still needs attention", lvl(moneyProfile({ lifeStage: "Working" }), -15), "attention");
}

// ---------------------------------------------------------------------------
section("a budget cap run past, while still keeping their own bar");
{
  // The starter budgets give going out a cap. His bigger September out (325,
  // plus Spotify, by the 19th) runs well past a 150 one - and he is still
  // keeping most of his pay. Before, that was "Entertainment is already 195
  // over" and a month that was "worth a look".
  const caps = [{ catId: "c5", category: "Entertainment", limit: 150 }];
  const sep = TEEN_TX.filter((t) => t.date.slice(0, 7) === "2026-09");
  const inc = sep.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const exp = sep.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const rate = Math.round((inc - exp) / inc * 100);

  const w = alfredWatch({ tx: TEEN_TX, categories: CATS, budgets: caps, goals: [], profile: TEEN });
  check("not a risk", !w.risks.some((r) => r.type === "pace"), w.risks.map((r) => r.title));
  const note = w.notes.find((n) => n.type === "pace");
  check("still visible, as worth knowing", !!note, w.notes.map((n) => n.type));
  check("said as no harm done, with what he keeps", !!note && /no harm done/.test(note.subtitle) && note.subtitle.includes(w.keeping.rate + "%"), note && note.subtitle);
  check("no warning wording", !!note && !/already|over\b|short/i.test(note.title), note && note.title);
  eq("the month still reads as good", monthVerdict({ watch: w, savingsRate: rate, hasIncome: true }).level, "good");

  const old = alfredWatch({ tx: TEEN_TX, categories: CATS, budgets: caps, goals: [], profile: NOBODY });
  check("unanswered: the alert stays, as before", old.risks.some((r) => r.type === "pace") && !old.notes.some((n) => n.type === "pace"));
  eq("unanswered: the old verdict", monthVerdict({ watch: old, savingsRate: rate, hasIncome: true }).level,
    legacyVerdict({ watch: old, savingsRate: rate, hasIncome: true }).level);
}
{
  // An adult keeping 20% whose fun spending, at its pace, would take the month
  // below that bar: on track today, not by the 30th. That is exactly what a
  // pace alert is for, so it stays one.
  const tx = [];
  ["2026-06", "2026-07", "2026-08"].forEach((ym) => { tx.push(pay(ym + "-01", 3000)); tx.push(spend(ym + "-12", 2000, "Rent and life", "c1")); });
  tx.push(pay("2026-09-01", 3000));
  tx.push(spend("2026-09-02", 300, "Groceries and life", "c2"));
  [3, 7, 11, 15, 19].forEach((d) => tx.push(spend("2026-09-" + String(d).padStart(2, "0"), 300, "Night out", "c5")));
  const adult = moneyProfile({ lifeStage: "Working", situation: "own", saveHabit: "lots" });
  const w = alfredWatch({ tx, categories: CATS, budgets: [{ catId: "c5", category: "Entertainment", limit: 1000 }], goals: [], profile: adult });
  check("on track so far this month", w.keeping.onTrack === true, w.keeping);
  check("but the pace would sink the bar: still a risk", w.risks.some((r) => r.type === "pace"), w.risks.map((r) => r.title));
  check("and not softened into a note", !w.notes.some((n) => n.type === "pace"));
}

// ---------------------------------------------------------------------------
section("a retiree drawing on savings is not told the month 'ends short'");
{
  const tx = [];
  ["2026-06", "2026-07", "2026-08"].forEach((ym) => { tx.push(pay(ym + "-01", 2000)); tx.push(spend(ym + "-10", 2600, "Living costs", "c2")); });
  tx.push(pay("2026-09-01", 2000));
  tx.push(spend("2026-09-10", 2600, "Living costs", "c2"));
  const retired = moneyProfile({ lifeStage: "Retired" });
  const w = alfredWatch({ tx, categories: CATS, budgets: [], goals: [], profile: retired });
  check("no cash-cliff risk", !w.risks.some((r) => r.type === "cliff"), w.risks.map((r) => r.title));
  const note = w.notes.find((n) => n.type === "cliff");
  check("said as drawing on savings", !!note && /from savings/.test(note.title), note && note.title);
  eq("a drawdown month is worth a look, not an alarm", monthVerdict({ watch: w, savingsRate: -30, hasIncome: true }).level, "watch");
  const old = alfredWatch({ tx, categories: CATS, budgets: [], goals: [], profile: NOBODY });
  check("unanswered: the cliff stays a risk, as before", old.risks.some((r) => r.type === "cliff"));
  eq("unanswered: and still needs attention", monthVerdict({ watch: old, savingsRate: -30, hasIncome: true }).level, "attention");
}

// ---------------------------------------------------------------------------
section("Redo Questionnaire is a way to change answers, not a trap");
{
  // These live inside App, which no test can mount; the checks read the
  // shipped source the way the other component checks in this file do. The
  // behaviour itself was walked in the running app (.claude/shots.html).
  const body = (sig) => {
    const at = SRC.indexOf(sig);
    return at < 0 ? "" : SRC.slice(at, SRC.indexOf("\n  }\n", at));
  };
  const retake = body("function handleRetakePlan() {");
  check("tapping Redo writes nothing to the account", retake.includes("setRedoing(true)") && !/persistBlob|onboardingDone\s*=\s*false|setOnboardingDone\(false\)/.test(retake), retake);
  check("the questionnaire opens on the saved answers, with a way out",
    /initial=\{redoing \?/.test(SRC) && /onCancel=\{redoing \? cancelRedo : null\}/.test(SRC) && /props\.onCancel && <JrIconBtn icon="close"/.test(SRC));
  check("Back cancels a redo instead of being swallowed", /if \(redoing\) \{ cancelRedo\(\); return true; \}/.test(SRC));
  const cancel = body("function cancelRedo() {");
  check("leaving a redo puts the account's language and currency back", /applyLangDir\(lang\); _currency\.sym = currency/.test(cancel) && cancel.includes("setRedoing(false)"));
  const complete = body("function handleOnboardingComplete(");
  check("finishing no longer replaces every budget", !/merged\.budgets = suggestedBudgets/.test(complete));
  check("suggestions only fill categories with no budget", /!have\.some\(function\(x\) \{ return x\.catId === b\.catId; \}\)/.test(complete));
  check("answers the questionnaire does not ask survive a redo", /Object\.assign\(\{\}, current\.onboardingData \|\| \{\}, oData \|\| \{\}\)/.test(complete));
  check("an account stuck by the old Redo is let back in",
    /var finishedBefore = !!\(data\.plan && data\.onboardingData && Object\.keys\(data\.onboardingData\)\.length\)/.test(SRC)
    && /setOnboardingDone\(data\.onboardingDone === true \|\| finishedBefore\)/.test(SRC));
  const redoKeys = ["obRedoClose", "obRedoOnlyNew", "obRedoUseNew", "obRedoKeepOld"];
  const redoBlock = SRC.slice(SRC.indexOf("var REDO_STRINGS = {"), SRC.indexOf("for (var _rdc in REDO_STRINGS)"));
  ["en:", "he:", "ar:", "ru:"].forEach((lang) => {
    const line = redoBlock.split("\n").find((l) => l.trim().startsWith(lang)) || "";
    check("redo strings in " + lang.slice(0, 2), redoKeys.every((k) => line.includes(k + ":\"")), line.slice(0, 80));
  });
}

// ---------------------------------------------------------------------------
section("a saver keeping less than usual, but still above the bar");
{
  // Kept 60% of 3,000 for three months, 40% in September: the old code warned.
  const tx = [];
  ["2026-06", "2026-07", "2026-08"].forEach((ym) => {
    tx.push(pay(ym + "-05", 3000));
    tx.push(spend(ym + "-12", 1200, "Groceries and life", "c2"));
  });
  tx.push(pay("2026-09-05", 3000));
  tx.push(spend("2026-09-12", 1800, "Groceries and life", "c2"));
  const saver = moneyProfile({ lifeStage: "Working", saveHabit: "most" });
  const now = alfredWatch({ tx, categories: CATS, budgets: [], goals: [], profile: saver });
  check("not a warning for them", !now.risks.some((r) => r.type === "slip"), now.risks.map((r) => r.type));
  check("told, as worth knowing", now.notes.some((n) => n.type === "slip"), now.notes.map((n) => n.type));
  check("the note does not claim they beat a plan they did not", now.notes.filter((n) => n.type === "slip").every((n) => !/above your 50%/.test(n.subtitle)), now.notes.map((n) => n.subtitle));
  const old = alfredWatch({ tx, categories: CATS, budgets: [], goals: [], profile: NOBODY });
  check("unanswered: the warning stays, as before", old.risks.some((r) => r.type === "slip"));
}

// ---------------------------------------------------------------------------
section("an account that never answered reads exactly as before");
{
  const quiet = { risks: [], leaks: [] };
  const withPace = { risks: [{ type: "pace", title: "Food is on pace to go over" }], leaks: [] };
  const withCliff = { risks: [{ type: "cliff", title: "This month ends short" }], leaks: [] };
  let same = 0, total = 0;
  [quiet, withPace, withCliff].forEach((w) => {
    [-30, -1, 0, 1, 5, 9, 10, 11, 19, 20, 21, 55].forEach((rate) => {
      [true, false].forEach((hasIncome) => {
        total++;
        const a = monthVerdict({ watch: w, savingsRate: rate, hasIncome, profile: NOBODY });
        const b = legacyVerdict({ watch: w, savingsRate: rate, hasIncome });
        if (a.level === b.level && a.score === b.score && a.reason === b.reason) same++;
        else check("verdict " + rate + "/" + hasIncome, false, { now: [a.level, a.score], before: [b.level, b.score] });
      });
    });
  });
  eq("verdict: every case matches the old code", same, total);

  let sameStory = 0, stories = 0;
  ["", "1500", "5000"].forEach((income) => {
    ["", "0", "200", "3000"].forEach((overspend) => {
      [[], ["noidea"], ["delivery", "goingout"], ["subs"]].forEach((leaks) => {
        stories++;
        const d = { income, overspend, leaks, goalName: "Trip", goalAmt: "3000" };
        if (JSON.stringify(deriveMoneyStory(d)) === JSON.stringify(legacyStory(d))) sameStory++;
        else check("story " + JSON.stringify(d), false, { now: deriveMoneyStory(d), before: legacyStory(d) });
      });
    });
  });
  eq("money story: every case matches the old code", sameStory, stories);

  let sameB = 0, budgets = 0;
  ["", "900", "4000", "12000"].forEach((income) => {
    ["", "0", "700", "3500", "15000"].forEach((essentials) => {
      [[], ["goingout"], ["delivery"], ["impulse", "subs"], ["noidea"]].forEach((leaks) => {
        budgets++;
        const now = starterBudgets({ income, essentials, leaks });
        const before = legacySuggestBudgets(income, essentials, leaks);
        if (JSON.stringify(now) === JSON.stringify(before)) sameB++;
        else check("budgets " + [income, essentials, leaks].join("/"), false, { now, before });
      });
    });
  });
  eq("starter budgets: every case matches the old code", sameB, budgets);

  eq("nothing is calmed", calmLeakTypes(TEEN_TX, NOBODY), null);
  eq("no profile block for Alfred", moneyProfileBlock(NOBODY, null), "");
}

// ---------------------------------------------------------------------------
section("the account's profile reaches the engine by default");
{
  setActiveMoneyProfile(TEEN_ANSWERS);
  eq("active profile is the account's", activeMoneyProfile().stage, "teen");
  const w = alfredWatch({ tx: TEEN_TX, categories: CATS, budgets: [], goals: [] });
  check("so the leak list is calm without anyone passing it", !w.leaks.some((l) => l.type === "drift" || l.type === "jump"));
  check("and the Spotted Leaks list too", !findMoney(TEEN_TX, CATS).some((f) => f.type === "drift" || f.type === "jump"));
  setActiveMoneyProfile({});
  check("signing out / a new account resets it", activeMoneyProfile().answered === false);
  setActiveMoneyProfile(null);
}

// ---------------------------------------------------------------------------
section("what Alfred is told");
{
  const k = keepingState(TEEN_TX, TEEN);
  const block = moneyProfileBlock(TEEN, k);
  check("stage, situation and habit are in it", /Teenager/.test(block) && /family/.test(block) && /Most of what I earn/.test(block));
  check("told not to call a teenager's spending leaks", /Never call them leaks/.test(block));
  check("told he already saves well", /already save well/.test(block));
  check("told his real number this month", block.indexOf(k.rate + "%") >= 0, k);
  // Every prompt that sees the user's money must carry it: onboarding's plan
  // and the Advisor's shared data block.
  check("the onboarding plan prompt carries it", /moneyProfileBlock\(profileP, null\)/.test(SRC));
  check("the Advisor's data block carries it", /\+ moneyProfileBlock\(activeMoneyProfile\(\), keepingState\(/.test(SRC));
}

// ---------------------------------------------------------------------------
section("every word, in all four languages");
{
  const langs = ["en", "he", "ar", "ru"];
  const en = Object.keys(PROFILE_STRINGS.en);
  langs.forEach((l) => {
    const missing = en.filter((k) => !PROFILE_STRINGS[l] || typeof PROFILE_STRINGS[l][k] !== "string" || !PROFILE_STRINGS[l][k].trim());
    eq(l + ": no key missing", missing, []);
    const extra = Object.keys(PROFILE_STRINGS[l] || {}).filter((k) => !en.includes(k));
    eq(l + ": no stray key", extra, []);
    const holes = en.filter((k) => {
      const want = (PROFILE_STRINGS.en[k].match(/\{\w+\}/g) || []).sort().join();
      const got = ((PROFILE_STRINGS[l][k] || "").match(/\{\w+\}/g) || []).sort().join();
      return want !== got;
    });
    eq(l + ": every {placeholder} kept", holes, []);
  });
  // The option tables name their words by key; each must exist somewhere in
  // the app in all four languages.
  const keys = [];
  STAGES.forEach((s) => keys.push(s.tKey, s.sub));
  SITUATIONS.forEach((s) => keys.push(s.tKey));
  SAVE_HABITS.forEach((s) => keys.push(s.tKey));
  LEAK_OPTIONS.forEach((s) => keys.push(s.tKey));
  const short = keys.filter((k) => (SRC.match(new RegExp("[{ ,]" + k + ":\"", "g")) || []).length < 4);
  eq("option words exist in all four languages", short, []);
  check("the greeting no longer promises nine questions", !/Nine quick questions/.test(SRC));
}

// ---------------------------------------------------------------------------
section("Safe to Spend reads the calendar month, not the dashboard's week/year toggle");
{
  // The dashboard's income and expense follow its header toggle. Measured
  // against a week, a payday that fell last week read as no income and the
  // habit stopped being protected; against a year, it never bit at all.
  const sepExp = TEEN_TX.filter((t) => t.date.slice(0, 7) === "2026-09" && t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const b = planMonthBasis(TEEN_TX, TEEN);
  eq("after payday: this month's pay", b.income, 2000);
  eq("this month's spending, however the dashboard is scoped", b.expense, Math.round(sepExp * 100) / 100);
  // Before this month's pay lands, the money being spent is last month's.
  const prePay = TEEN_TX.filter((t) => !(t.date.slice(0, 7) === "2026-09" && t.type === "income"));
  const pb = planMonthBasis(prePay, TEEN);
  eq("before payday: the recent monthly pay stands in", pb.income, 2000);
  check("so the habit is still protected before payday", planSpendRoom(pb.income, pb.expense, TEEN) !== null);
  // Irregular income: the recent average is a floor, not a replacement.
  const self = moneyProfile({ lifeStage: "Self-employed", saveHabit: "steady" });
  const withSepPay = (amt) => TEEN_TX.map((t) => (t.date.slice(0, 7) === "2026-09" && t.type === "income") ? Object.assign({}, t, { amount: amt }) : t);
  eq("irregular, a thin month so far: the average is the floor", planMonthBasis(withSepPay(500), self).income, 2000);
  eq("irregular, a big month: this month's pay", planMonthBasis(withSepPay(3500), self).income, 3500);
  eq("salaried, a raise this month: this month's pay, not the average", planMonthBasis(withSepPay(3500), TEEN).income, 3500);
  eq("nothing ever earned: no change to the number", planSpendRoom(planMonthBasis([], TEEN).income, 0, TEEN), null);
  check("the hero measures over the month", /var heroKeepBasis = planMonthBasis\(tx, mpHero\)/.test(SRC) && /planSpendRoom\(heroKeepBasis\.income, heroKeepBasis\.expense, mpHero\)/.test(SRC));
  check("and no longer over the header's timeframe", !/planSpendRoom\(income, expense, mpHero\)/.test(SRC));
}

// ---------------------------------------------------------------------------
section("the offline analysis grades by the same bar as everything else");
{
  const top = (v) => ({ name: "Entertainment", val: v });
  let same = 0, total = 0;
  [-30, -1, 0, 1, 5, 9, 10, 11, 19, 20, 21, 55].forEach((rate) => {
    [0, 325].forEach((v) => {
      total++;
      const a = offlineMonthRead(rate, NOBODY, top(v));
      const b = legacyLocalRead(rate, "Entertainment", v, dollars);
      if (JSON.stringify([a.score, a.label, a.insights, a.headline]) === JSON.stringify([b.score, b.label, b.insights, b.headline])) same++;
      else check("offline read " + rate + "/" + v, false, { now: a, before: b });
    });
  });
  eq("unanswered: every case matches the old code", same, total);

  const teen55 = offlineMonthRead(55, TEEN, top(325));
  eq("teen keeping 55% (plans 50%): excellent", teen55.score, 85);
  eq("and told he is right on his own plan", teen55.insights[0].title, "Right On Your Plan");
  eq("his biggest category is where it went, not a cut to make", teen55.insights[1].title, "Where It Goes");
  ["45", "30"].forEach((r) => eq("teen keeping " + r + "% of a planned 50%: a solid share, not a shortfall", offlineMonthRead(+r, TEEN, top(325)).insights[0].title, "A Solid Share"));
  check("no 'aim for 20%' for anyone who answered", [55, 45, 30, 12, 3].every((r) => offlineMonthRead(r, TEEN, top(325)).insights.every((i) => !/20%/.test(i.body))));
  const teen12 = offlineMonthRead(12, TEEN, top(325));
  eq("teen keeping 12% of a planned 50%: a nudge", teen12.insights[0].title, "Grow Your Savings Rate");
  check("the nudge names his own bar, not a textbook one", /50%/.test(teen12.insights[0].body), teen12.insights[0].body);
  eq("'a little' saver at 7%: on plan", offlineMonthRead(7, moneyProfile({ saveHabit: "little" }), top(0)).insights[0].title, "Right On Your Plan");
  // A bar they never chose (a student who gave no habit gets 5% by default) is
  // not something to be told they fell short of.
  const student = moneyProfile({ lifeStage: "Student" });
  const st2 = offlineMonthRead(2, student, top(0)).insights[0];
  check("no habit given: nudged without a number they never chose", st2.title === "Grow Your Savings Rate" && !/5%/.test(st2.body), st2);
  check("the chat says the same", !/5%/.test(offlineSavingsAnswer(3, student, { name: "Food", val: 90 }) || "5%"));
  eq("'not saving yet' at 3%: a real start", offlineMonthRead(3, moneyProfile({ saveHabit: "none" }), top(0)).insights[0].title, "A Real Start");
  const ret = offlineMonthRead(-10, moneyProfile({ lifeStage: "Retired" }), top(0));
  eq("retired, a negative month: not 'needs work'", [ret.score, ret.insights[0].title], [55, "Drawing On Savings"]);

  const TIPS = ["The 50/30/20 Rule", "Pay Yourself First", "The Latte Factor", "Avoid Lifestyle Inflation", "Build Your Emergency Fund First"].map((title) => ({ title, body: "" }));
  eq("unanswered: every tip can show", offlineTipsFor(TIPS, NOBODY).length, 5);
  eq("the teenager: no latte factor, no rent-sized cushion, no 'keep 10%'", offlineTipsFor(TIPS, TEEN).map((t) => t.title), ["Avoid Lifestyle Inflation"]);
  check("the Advisor's offline analysis is graded by these", /var laRead = offlineMonthRead\(savings, laP,/.test(SRC) && /var fitTips = offlineTipsFor\(tips, laP\)/.test(SRC));
  // Each tip the filter names must still exist, or it would silently stop filtering.
  ["The 50/30/20 Rule", "Pay Yourself First", "The Latte Factor", "Build Your Emergency Fund First"].forEach((t) => check("tip still in the app: " + t, SRC.indexOf('title: "' + t + '"') >= 0));
}

// ---------------------------------------------------------------------------
section("the offline chat and the next-move card use their bar too");
{
  const little = moneyProfile({ lifeStage: "Teenager", saveHabit: "little" });
  eq("20% and up: the general answer", offlineSavingsAnswer(25, TEEN, null), null);
  eq("never answered: the general answer", offlineSavingsAnswer(8, NOBODY, null), null);
  const onPlan = offlineSavingsAnswer(8, little, { name: "Entertainment", val: 300 });
  check("on their own plan: told so", /right on the 5%/.test(onPlan || ""), onPlan);
  check("and, young, that fun is part of the plan", /not a leak/.test(onPlan || ""), onPlan);
  const under = offlineSavingsAnswer(3, little, { name: "Entertainment", val: 300 });
  check("under it: measured against their 5%, not 20%", /under the 5%/.test(under || "") && !/20%/.test(under || ""), under);
  check("retired, negative: living on savings can be the plan", /can be the plan/.test(offlineSavingsAnswer(-5, moneyProfile({ lifeStage: "Retired" }), null) || ""));
  check("the 30% answer no longer tells anyone to invest the surplus", !/make sure that surplus is invested/.test(SRC));
  eq("next move bar: unanswered 20, as before", nextMoveSavingsBar(NOBODY), 20);
  eq("next move bar: never above 20", nextMoveSavingsBar(TEEN), 20);
  eq("next move bar: a 'little' saver's own 5%", nextMoveSavingsBar(little), 5);
  eq("next move bar: a young user who gave no habit", nextMoveSavingsBar(moneyProfile({ lifeStage: "Student" })), 5);
  check("the next-move card reads it", /if \(savings < nextMoveSavingsBar\(activeMoneyProfile\(\)\) && allCats\.length > 0\)/.test(SRC));
  eq("keepBarPct: the teenager's own 50%", keepBarPct(TEEN), 50);
  eq("keepBarPct: unanswered, the old 10% line", keepBarPct(NOBODY), 10);
}

// ---------------------------------------------------------------------------
section("every Alfred chat that grades the user knows who they are");
{
  check("the Full Analysis chat carries the profile", /moneyProfileBlock\(faP, keepingState\(tx, faP\)\)/.test(SRC));
  check("the plan chat carries the profile", /moneyProfileBlock\(activeMoneyProfile\(\), null\)/.test(SRC));
  const goal = moneyProfileBlock(moneyProfile({ lifeStage: "Working", coreProblem: "Saving for a specific goal" }), null);
  check("saving for a goal: judged by the goal's pace", /goal's pace/.test(goal), goal);
  const clarity = moneyProfileBlock(moneyProfile({ lifeStage: "Student", coreProblem: "Understanding where my money goes" }), null);
  check("understanding where it goes: patterns shown without judgment", /without judgment/.test(clarity), clarity);
  const partner = moneyProfileBlock(moneyProfile({ lifeStage: "Working", situation: "shared", coreProblem: "Planning finances with a partner" }), null);
  check("with a partner: shared costs counted", /shared costs/.test(partner), partner);
  // Every answer to "what are you trying to achieve" changes the rules Alfred
  // is given - read straight off the option list, so a new one can't be missed.
  const base = moneyProfileBlock(moneyProfile({ lifeStage: "Working" }), null);
  const PROBLEMS = SRC.match(/var PROBLEM_OPTIONS = \[[\s\S]*?\];/)[0].match(/label: "([^"]+)"/g).map((s) => s.slice(8, -1));
  eq("seven main challenges on the list", PROBLEMS.length, 7);
  const unchanged = PROBLEMS.filter((p) => moneyProfileBlock(moneyProfile({ lifeStage: "Working", coreProblem: p }), null) === base);
  eq("every main challenge adds its own rule", unchanged, []);
}

// ---------------------------------------------------------------------------
section("the pact never claims a habit they don't have");
{
  const notSaving = deriveMoneyStory({ income: "3000", leaks: ["none"], saveHabit: "none" });
  eq("in control, not saving yet: the calm story", notSaving.mode, "strengthMin");
  eq("which knows they don't save yet", notSaving.saves, false);
  const savesNoIncome = deriveMoneyStory({ income: "", leaks: ["goingout"], saveHabit: "steady" });
  eq("saves, gave no income: the calm story, knowing they save", [savesNoIncome.mode, savesNoIncome.saves], ["strengthMin", true]);
  check("'keep paying myself first' is only promised by savers", /props\.keeps \? tr\("cmKeepItem2"\)/.test(SRC) && /keeps=\{s\.mode === "strength" \|\| \(s\.mode === "strengthMin" && s\.saves\)\}/.test(SRC));
}

// ---------------------------------------------------------------------------
section("a phone top-up and a bus card are bills, not subscriptions to cancel");
{
  // A teenager's two fixed costs, paid the way teenagers pay them. The phone
  // top-up used to be his biggest "leak" and Alfred's next move on the dashboard.
  const monthly = (label, amount, catId) => ["2026-06-18", "2026-07-18", "2026-08-18", "2026-09-18"].map((d) => spend(d, amount, label, catId));
  const found = (rows) => findMoney(rows, CATS, { profile: NOBODY }).filter((f) => f.type === "recurring").map((f) => f.merchant);
  eq("a phone top-up in Other is not a leak", found(monthly("Phone top-up", 90, "c11")), []);
  eq("a Rav-Kav top-up is not a leak", found(monthly("Rav-Kav top up", 60, "c3")), []);
  eq("nor in Hebrew", found(monthly("טעינת טלפון פלאפון", 59, "c11")), []);
  const phoneCat = CATS.concat([{ id: "c_phone", name: "Phone", color: "#000", icon: "box" }]);
  const golan = monthly("Golan", 29.9, "c11").map((t) => Object.assign({}, t, { catId: "c_phone", category: "Phone" }));
  eq("anything filed under a Phone category is a bill", findMoney(golan, phoneCat, { profile: NOBODY }).filter((f) => f.type === "recurring").length, 0);
  eq("while the same charge in Other is still flagged", findMoney(monthly("Golan", 29.9, "c11"), CATS, { profile: NOBODY }).filter((f) => f.type === "recurring").length, 1);
  eq("a real subscription still is one", found(monthly("Spotify", 19.9, "c5")), ["Spotify"]);
  eq("and so is a streaming service", found(monthly("Netflix", 54.9, "c5")), ["Netflix"]);
}

// ---------------------------------------------------------------------------
section("the end of the questionnaire speaks the user's language");
{
  // The offline plan and the starter-budget names were English on the Hebrew
  // plan screen - the one screen every new user lands on.
  check("the offline plan is built from translated sentences", /tr\("lpIntro"\)/.test(SRC) && !/"Start here, " \+ props\.username/.test(SRC));
  check("its challenge is the translated option, not the stored English", /var challenge = probRow \? tr\(probRow\.tKey\)/.test(SRC));
  check("starter budgets show their names in the user's language", /\{catDisplay\(b\.category\)\}/.test(SRC));
  check("no 'compound' in the plan's promise - it only adds up", !/compound into real wealth/.test(SRC) && /add up to real wealth/.test(PROFILE_STRINGS.en.lpGoal));
}

// ---------------------------------------------------------------------------
section("the plan screen only claims the share the budgets really keep");
{
  const roomy = starterBudgets({ income: "2000", essentials: "150", leaks: [], lifeStage: "Teenager", situation: "family", saveHabit: "most" });
  check("low essentials: the budgets keep his half", starterKeep({ income: "2000" }, roomy) >= 1000);
  const tight = starterBudgets({ income: "3000", essentials: "2000", leaks: [], lifeStage: "Working", situation: "own", saveHabit: "most" });
  const kept = starterKeep({ income: "3000" }, tight);
  check("high essentials: they keep less than the half named", kept < 1500, kept);
  check("so the line says the amount without claiming the share", /\{planKeepsShare\s*\? tr\("obBudgetKeeps"\)/.test(SRC) && /: tr\("obBudgetKeepsShort"\)/.test(SRC));
}

// ---------------------------------------------------------------------------
section("the one thing they would put their money into");
{
  // "If you could put your money into one thing, what would it be?" - asked in
  // onboarding so the plan knows what the money is FOR, not only what's in the way.
  eq("five answers on the list", DREAMS.map((d) => d.id), ["business", "save", "invest", "home", "life"]);
  const langs = ["en", "he", "ar", "ru"];
  const keys = ["obQDreamHead", "obQDreamSub", "obBudgetDream", "obBudgetDreamShort", "obGoalBusiness", "obGoalInvest",
    "stsKeepsDream", "gmDreamPace", "gmDreamPace3", "dcKicker", "dcProgress", "dcProgress3", "dcNoIncome", "dcDone", "dcBehind", "dcAfterDebt"];
  DREAMS.forEach((d) => {
    keys.push(d.tKey, d.sub, d.forKey, "lpDream_" + d.id, "dashTipDream_" + d.id, "dashTipDreamSub_" + d.id, "advisorQDream_" + d.id);
  });
  const missing = [];
  langs.forEach((l) => keys.forEach((k) => { if (!PROFILE_STRINGS[l][k]) missing.push(l + "." + k); }));
  eq("every string exists in all four languages", missing, []);
  const named = langs.filter((l) => keys.some((k) => /Alfred|אלפרד|ריצ'רד|ريتشارد|Ричард/.test(PROFILE_STRINGS[l][k])));
  eq("none of them name the coach", named, []);

  check("answering only this question still counts as answered", moneyProfile({ dream: "business" }).answered === true);
  eq("an unknown id is ignored", moneyProfile({ dream: "yacht" }).dream, "");

  // Alfred hears it in every prompt that carries the profile, with its own rule.
  const base = moneyProfileBlock(moneyProfile({ lifeStage: "Working" }), null);
  const sameAsBase = DREAMS.filter((d) => moneyProfileBlock(moneyProfile({ lifeStage: "Working", dream: d.id }), null) === base).map((d) => d.id);
  eq("every answer changes what Alfred is told", sameAsBase, []);
  const biz = moneyProfileBlock(moneyProfile({ lifeStage: "Working", dream: "business" }), null);
  check("business: recommendation first, then fitted to them", /Give your recommendation for it first/.test(biz) && /Building my own business/.test(biz), biz);
  check("business: pointed at the Business account, not talked out of it", /Business account/.test(biz) && /Do not talk them out of it/.test(biz), biz);
  check("every answer carries the balance rule", DREAMS.every((d) => /guilt-free amount/.test(moneyProfileBlock(moneyProfile({ dream: d.id }), null))));
  const inv = moneyProfileBlock(moneyProfile({ dream: "invest" }), null);
  check("investing stays on the right side of the advice line", /never name specific securities/.test(inv) && /never promise or predict returns/.test(inv), inv);
  check("enjoying life is a goal, not a leak", /not a leak/.test(moneyProfileBlock(moneyProfile({ dream: "life" }), null)));

  // The working person with a salary and a business in mind.
  const a = { income: "9000", essentials: "4500", leaks: [], lifeStage: "Working", situation: "own" };
  const keptFor = (dream, extra) => starterKeep({ income: "9000" }, starterBudgets(Object.assign({}, a, { dream }, extra || {})));
  const disc = 4500;
  check("business: a real share set aside for it", keptFor("business") >= disc * 0.25, keptFor("business"));
  check("save as much as I can keeps the most", keptFor("save") > keptFor("business") && keptFor("save") > keptFor("life"), [keptFor("save"), keptFor("business"), keptFor("life")]);
  check("enjoy life now keeps the least - but still something", keptFor("life") < keptFor("invest") && keptFor("life") >= disc * 0.1, [keptFor("life"), keptFor("invest")]);
  DREAMS.forEach((d) => {
    const b = starterBudgets(Object.assign({}, a, { dream: d.id }));
    const fun = b.filter((x) => x.catId === "c5" || x.catId === "c6").reduce((s, x) => s + x.limit, 0);
    check(d.id + ": never a month of living on nothing - at least half of what's left is to enjoy", fun >= disc * 0.5 * 0.875, fun);
  });
  const lifeB = Object.fromEntries(starterBudgets(Object.assign({}, a, { dream: "life" })).map((x) => [x.catId, x.limit]));
  check("enjoy life: Entertainment leads", lifeB.c5 > lifeB.c6, lifeB);
  // "Most of what I earn" is half of 9,000 - all of what essentials leave, so
  // the old 10% spending floor is what's left to spend.
  check("a habit that already keeps more wins over the answer", keptFor("life", { saveHabit: "most" }) > keptFor("life") && keptFor("life", { saveHabit: "most" }) >= disc * 0.9, keptFor("life", { saveHabit: "most" }));
  const noDream = starterBudgets(a);
  const legacyB = legacySuggestBudgets("9000", "4500", []);
  eq("no answer: the budgets are what they always were", noDream.map((x) => x.limit), legacyB.map((x) => x.limit));

  // Wiring: the question is on the screen, its answer is saved, sent, and editable.
  check("a screen in the questionnaire", /qIndex === QI\.dream &&/.test(SRC) && /\{ h: tr\("obQDreamHead"\), s: tr\("obQDreamSub"\) \}/.test(SRC));
  check("saved with the rest of the answers", /saveHabit: saveHabit, dream: dream, income: income, essentials/.test(SRC));
  check("in the plan prompt and the plan request", /dreamAsk/.test(SRC) && /If I could put my money into one thing: /.test(SRC));
  check("the starter budgets are built with it", /saveHabit: saveHabit, dream: dream, coreProblem: coreProblem \}\);/.test(SRC));
  check("editable from the Financial Profile", /chipRow\(DREAMS\.map/.test(SRC));
  check("the dashboard shows its card", /\{dreamId && <DreamCard tx=\{tx\} profile=\{dreamP\} onBuild=\{dreamBuild\} \/>\}/.test(SRC));
  check("Alfred's first suggested question is about it", /tr\("advisorQDream_" \+ activeMoneyProfile\(\)\.dream\)/.test(SRC));
  check("Safe to Spend says what it holds back", /tr\("stsKeepsDream"\)/.test(SRC));
}

// ---------------------------------------------------------------------------
section("the one thing, every day after onboarding");
{
  // Working, 9,000 a month, 4,500 of essentials, wants to build a business:
  // the plan puts a quarter of the 4,500 left - 1,125 - toward it every month.
  const BIZ = { lifeStage: "Working", situation: "own", income: "9000", essentials: "4500", dream: "business" };
  const P = moneyProfile(BIZ);
  eq("the monthly amount for it", P.dreamMonthly, 1125);
  eq("as a share of income", Math.round(P.planRate * 1000) / 1000, 0.125);
  eq("their bar is that share, not the generic 10%", keepBarPct(P), 13);
  eq("Safe to Spend holds it back: 9,000 in, 3,000 spent, 4,875 free", planSpendRoom(9000, 3000, P), 4875);
  check("without the answer it doesn't", planSpendRoom(9000, 3000, moneyProfile(Object.assign({}, BIZ, { dream: "" }))) === null);
  const saver = moneyProfile(Object.assign({}, BIZ, { saveHabit: "lots" }));
  eq("a habit that keeps more still sets the bar", Math.round(saver.planRate * 100), 20);
  eq("no income given: no amount, nothing held back", moneyProfile({ dream: "business" }).dreamMonthly, 0);

  // The green month (and with it the streak, the XP and the level) follows it.
  const R = greenRuleFor(BIZ, []);
  eq("green means keeping the business amount", [R.kind, R.need, R.dream], ["dream", 1125, "business"]);
  eq("a debt challenge still comes first", greenRuleFor(Object.assign({}, BIZ, { coreProblem: "Paying off debt" }), []).kind, "debt");
  eq("no answer: the old rule", greenRuleFor(Object.assign({}, BIZ, { dream: "" }), []).kind, "base");
  const stats = { "2026-10": { income: 9000, expense: 7500, rate: 17 } };
  const j = greenJudge("2026-10", stats, 10, R);
  eq("1,500 kept of 1,125 is green", [j.kind, j.green, j.kept], ["dream", true, 1500]);
  eq("8,200 spent is not", greenJudge("2026-10", { "2026-10": { income: 9000, expense: 8200, rate: 9 } }, 10, R).green, false);
  eq("before the new rules began, the old one", greenJudge("2026-09", { "2026-09": { income: 9000, expense: 8200, rate: 9 } }, 5, R).kind, "base");
  const copy = greenMonthCopy(greenJudge("2026-10", { "2026-10": { income: 9000, expense: 8200, rate: 9 } }, 10, R), { income: 9000, expense: 8200 }, 10);
  eq("the Profile card says it in the plan's words", [copy.line, copy.word], ["gmDreamPace", "gmBehindGoal"]);

  // The dashboard card: this month so far, from the same numbers.
  const tx = [
    { id: 1, type: "income", amount: 9000, date: "2026-09-01", catId: "c8", category: "Salary" },
    { id: 2, type: "expense", amount: 7600, date: "2026-09-05", catId: "c1", category: "Housing" },
  ];
  const st = dreamMonthState(tx, P, "2026-09-20");
  eq("kept so far, the gap, days left", [st.kept, st.gap, st.daysLeft], [1400, 0, 11]);
  check("covered", st.done && st.pct === 100, st);
  const behind = dreamMonthState(tx.concat([{ id: 3, type: "expense", amount: 900, date: "2026-09-10", catId: "c6", category: "Shopping" }]), P, "2026-09-20");
  eq("500 kept: 625 to go, 57 a day less over 11 days", [behind.kept, behind.gap, behind.perDay, behind.pct], [500, 625, 57, 44]);
  const empty = dreamMonthState([], P, "2026-09-20");
  check("no income yet: nothing claimed", !empty.done && empty.income === 0, empty);
}

// ---------------------------------------------------------------------------
section("the one thing, fitted to everything else they told us");
{
  const BASE = { lifeStage: "Working", situation: "own", income: "9000", essentials: "4500", dream: "business" };
  const with_ = (x) => moneyProfile(Object.assign({}, BASE, x));
  const blockOf = (x) => moneyProfileBlock(with_(x), null);

  // Paying off debt is the challenge: the debt comes first, nothing is held back.
  const debt = with_({ coreProblem: "Paying off debt" });
  eq("debt first: no monthly amount", [debt.dreamActive, debt.dreamMonthly, debt.planRate], [false, 0, 0]);
  eq("debt first: Safe to Spend holds nothing back for it", planSpendRoom(9000, 3000, debt), null);
  eq("debt first: the green month is the debt rule", greenRuleFor(Object.assign({}, BASE, { coreProblem: "Paying off debt" }), []).kind, "debt");
  check("debt first: Alfred is told", /the debt comes first/.test(blockOf({ coreProblem: "Paying off debt" })));
  const debtB = starterBudgets(Object.assign({}, BASE, { leaks: [], coreProblem: "Paying off debt" }));
  eq("debt first: the starter budgets are the plain ones", debtB.map((x) => x.limit), legacySuggestBudgets("9000", "4500", []).map((x) => x.limit));

  // Retired: may be living on savings by design.
  const ret = with_({ lifeStage: "Retired" });
  eq("retired: nothing held back, no dream green rule", [ret.dreamMonthly, greenRuleFor(Object.assign({}, BASE, { lifeStage: "Retired" }), []).kind], [0, "base"]);
  check("retired: Alfred is told why", /retired and may be living on savings/.test(blockOf({ lifeStage: "Retired" })));

  // Others depend on them: a smaller share.
  const sup = with_({ situation: "supporting" });
  eq("supporting others: 60% of the usual share", sup.dreamMonthly, 675);
  check("supporting others: Alfred is told", /deliberately smaller/.test(blockOf({ situation: "supporting" })));

  // A debt they mentioned, without it being the challenge.
  check("a stated debt: Alfred weighs it before investing", /high-interest debt is paid first/.test(blockOf({ debt: "12000" })));
  check("no debt: no debt line", !/high-interest debt/.test(blockOf({ debt: "0" })));
  // No cushion yet.
  check("savings under a month of essentials: cushion first", /cushion comes before any money they could lose/.test(blockOf({ savings: "1000" })));
  check("a real cushion: no warning", !/cushion comes before/.test(blockOf({ savings: "20000" })));
  check("enjoying life: no cushion lecture", !/cushion comes before/.test(blockOf({ savings: "0", dream: "life" })));
  // Age and stage.
  check("their age is in it", /Age: 17/.test(blockOf({ age: "17", lifeStage: "Teenager", situation: "family" })));
  check("young, family covers basics: the cheapest time to build", /cheapest time of their life/.test(blockOf({ lifeStage: "Teenager", situation: "family" })));

  // The month is judged on what really came in.
  const P = with_({});
  const R = greenRuleFor(BASE, []);
  eq("a 6,000 month needs a quarter of the 1,500 it leaves", greenJudge("2026-10", { "2026-10": { income: 6000, expense: 5500, rate: 8 } }, 10, R).need, 375);
  eq("and 500 kept makes it green", greenJudge("2026-10", { "2026-10": { income: 6000, expense: 5500, rate: 8 } }, 10, R).green, true);
  eq("Safe to Spend holds back less in a smaller month", planSpendRoom(6000, 3000, P), 2625);
  eq("a month with no income is not green", greenJudge("2026-10", { "2026-10": { income: 0, expense: 300, rate: null } }, 10, R).green, false);

  // Irregular income: three months together, like everything else they're judged on.
  const SELF = Object.assign({}, BASE, { lifeStage: "Self-employed" });
  const RS = greenRuleFor(SELF, []);
  check("self-employed: judged over three months", RS.kind === "dream" && RS.irregular, RS);
  const lumpy = { "2026-08": { income: 15000, expense: 9000, rate: 40 }, "2026-09": { income: 3000, expense: 4000, rate: -33 }, "2026-10": { income: 9000, expense: 8500, rate: 6 } };
  const j3 = greenJudge("2026-10", lumpy, 10, RS);
  eq("a lean month inside a good quarter is still green", [j3.green, j3.kept, j3.need, j3.months], [true, 5500, 3750, 3]);
  eq("the same month alone would not be", greenJudge("2026-10", lumpy, 10, R).green, false);
  eq("the Profile card says 'three months'", greenMonthCopy(j3, { income: 9000, expense: 8500 }, 10).line, "gmDreamPace3");
  const cardTx = [
    { id: 1, type: "income", amount: 15000, date: "2026-07-03", catId: "c8", category: "Salary" },
    { id: 2, type: "expense", amount: 9000, date: "2026-07-04", catId: "c1", category: "Housing" },
    { id: 3, type: "income", amount: 3000, date: "2026-08-03", catId: "c8", category: "Salary" },
    { id: 4, type: "expense", amount: 4000, date: "2026-08-04", catId: "c1", category: "Housing" },
    { id: 5, type: "income", amount: 9000, date: "2026-09-03", catId: "c8", category: "Salary" },
    { id: 6, type: "expense", amount: 8500, date: "2026-09-04", catId: "c1", category: "Housing" },
  ];
  const st3 = dreamMonthState(cardTx, moneyProfile(SELF), "2026-09-20");
  eq("the card agrees: three months, covered", [st3.months, st3.done, st3.kept], [3, true, 5500]);
}

done("money profile");
