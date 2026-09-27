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
import { makeLegacyStory, makeLegacyMonthVerdict, legacySuggestBudgets } from "./legacy.mjs";
import { SRC } from "../statement-import/extract.mjs";
import { section, check, eq, done } from "../statement-import/harness.mjs";

const {
  moneyProfile, keepingState, calmLeakTypes, planSpendRoom, starterBudgets, starterKeep, moneyProfileBlock,
  deriveMoneyStory, alfredWatch, monthVerdict, findMoney, setActiveMoneyProfile, activeMoneyProfile,
  PROFILE_STRINGS, STAGES, SITUATIONS, SAVE_HABITS, LEAK_OPTIONS, DEFAULT_CATEGORIES
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

done("money profile");
