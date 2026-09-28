// The cushion badges and the Wall Builder rank.
//
// They measure savings against a month of essentials, and used to read that
// month from `onboardingData.monthlyEssentials` - a key nothing ever wrote. So
// cushionMonths was 0 for every account and four badges and a rank could
// never be earned. These tests run the shipped motivSnapshot() on real-shaped
// accounts: a questionnaire answer, a teenager whose family pays the basics
// (who honestly answers 0), and an account that skipped the questionnaire.
//
//   node tests/motivation/cushion.test.mjs
import { SRC, grab } from "../statement-import/extract.mjs";
import { section, check, eq, done } from "../statement-import/harness.mjs";

// Same approach as tests/money-profile/extract.mjs: follow the references out
// of the roots and evaluate the real code, never a copy.
const TOP_FN = new Set([...SRC.matchAll(/^function ([A-Za-z_$][\w$]*)\(/gm)].map((m) => m[1]));
const TOP_VAR = new Set([...SRC.matchAll(/^var ([A-Za-z_$][\w$]*) = /gm)].map((m) => m[1]));
const STUBBED = new Set(["T", "tr", "TRANSLATIONS"]);
const order = [], seen = new Set();
function pull(name) {
  if (seen.has(name) || STUBBED.has(name)) return;
  const isFn = TOP_FN.has(name), isVar = TOP_VAR.has(name);
  if (!isFn && !isVar) return;
  seen.add(name);
  if (isFn && /^[A-Z]/.test(name)) return;
  const text = grab(isFn ? "function" : "var", name);
  (text.match(/[A-Za-z_$][\w$]*/g) || []).forEach((id) => { if (id !== name) pull(id); });
  order.push({ name, text, isVar });
}
["motivSnapshot", "cushionEssentials", "RANKS"].forEach(pull);
const lineOf = (text) => SRC.indexOf(text);
const body = [
  "var T = new Proxy({}, { get: function(_, k) { return typeof k === 'string' ? k : undefined; } });",
  "function tr(key) { return key; }",
  ...order.filter((o) => o.isVar).sort((a, b) => lineOf(a.text) - lineOf(b.text)).map((o) => o.text),
  ...order.filter((o) => !o.isVar).map((o) => o.text),
  "return {" + order.map((o) => o.name).join(",") + "};"
].join("\n");

// One fixed day, so "the last three full months" is the same every run.
const TODAY = "2026-09-20";
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...a) { if (a.length) super(...a); else super(TODAY + "T12:00:00Z"); }
  static now() { return new RealDate(TODAY + "T12:00:00Z").getTime(); }
};
const { motivSnapshot, cushionEssentials, RANKS } = new Function(body)();

let id = 1;
const spend = (date, amount) => ({ id: id++, type: "expense", amount, label: "Spend", date, catId: "c2", category: "Food", repeat: "none", pending: false });
const pay = (date, amount) => ({ id: id++, type: "income", amount, label: "Pay", date, catId: "c8", category: "Salary", repeat: "none", pending: false });
const pot = (amount) => ({ id: "s" + id++, name: "Savings", entries: [{ kind: "deposit", amount, date: "2026-06-01" }] });
// June, July and August: paid 2,000, spent 800 each month.
const threeMonths = ["2026-06", "2026-07", "2026-08"].flatMap((ym) => [pay(ym + "-10", 2000), spend(ym + "-12", 500), spend(ym + "-20", 300)]);

const account = (over) => Object.assign({ tx: [], savings: [], budgets: [], goals: [], categories: [], folders: [], debts: [], onboardingData: {} }, over);
const earned = (snap) => new Set(snap.badges.map((b) => b.def.id));
const wallBuilder = RANKS.find((r) => r.name === "Wall Builder");
const CUSHION = ["g-06-cushion-stage-1", "g-07-cushion-stage-2", "g-08-cushion-stage-3", "g-09-the-fortress"];

section("the questionnaire's essentials answer");
{
  const snap = motivSnapshot(account({ onboardingData: { essentials: "2000" }, savings: [pot(6500)], tx: threeMonths }));
  eq("cushion is savings over the answer, not over spending", snap.ctx.cushionMonths, 3.25);
  const got = earned(snap);
  check("one month: Soft Landing", got.has(CUSHION[0]));
  check("three months: Sleeping Soundly", got.has(CUSHION[1]));
  check("not six months yet", !got.has(CUSHION[2]) && !got.has(CUSHION[3]));
  check("Wall Builder rank is open", wallBuilder.gate(snap.ctx));
}

section("the old key, which nothing ever wrote, changes nothing");
{
  const snap = motivSnapshot(account({ onboardingData: { monthlyEssentials: 1 }, savings: [pot(6500)] }));
  eq("no answer and no spending: nothing to measure", snap.ctx.cushionMonths, 0);
  check("no cushion badge from nothing", !CUSHION.some((b) => earned(snap).has(b)));
}

section("family pays the basics: answered 0");
{
  const snap = motivSnapshot(account({
    onboardingData: { lifeStage: "Teen", situation: "family", essentials: "0" },
    savings: [pot(2000)], tx: threeMonths
  }));
  eq("falls back to recent monthly spending", cushionEssentials(account({ onboardingData: { essentials: "0" }, tx: threeMonths })), 800);
  eq("2,000 saved over 800 a month", snap.ctx.cushionMonths, 2.5);
  check("Soft Landing earned", earned(snap).has(CUSHION[0]));
  check("Sleeping Soundly not yet", !earned(snap).has(CUSHION[1]));
}

section("skipped the questionnaire");
{
  const snap = motivSnapshot(account({ savings: [pot(10000)], tx: threeMonths }));
  eq("measured against what they spend", snap.ctx.cushionMonths, 12.5);
  check("every cushion badge, Fortress included", CUSHION.every((b) => earned(snap).has(b)));
}

section("nothing to measure");
{
  const snap = motivSnapshot(account({ savings: [pot(5000)] }));
  eq("no answer, no spending: 0, never a divide by zero", snap.ctx.cushionMonths, 0);
  check("Wall Builder stays closed", !wallBuilder.gate(snap.ctx));
  const typed = motivSnapshot(account({ onboardingData: { essentials: "abc" }, savings: [pot(5000)] }));
  eq("a non-number answer is treated as no answer", typed.ctx.cushionMonths, 0);
}

section("a badge already held is kept");
{
  const held = { weekConfirms: [], pauses: [], badges: [{ id: CUSHION[0], at: "2026-01-01" }], seen: [] };
  const snap = motivSnapshot(account({ motivation: held }));
  check("Soft Landing stays after the savings are spent", earned(snap).has(CUSHION[0]));
  check("and is not announced again", !snap.newBadges.some((b) => b.def.id === CUSHION[0]));
}

done("cushion badges");
