// Alfred sees the user's debts.
//
// Until 28 Sep 2026 no Alfred prompt carried the Debts screen: the Advisor's
// only "debts" were IOU notes between friends. Someone whose main goal is
// paying off debt got advice that never mentioned their card at 18%. These
// tests run the shipped debtsBlock / debtsLine on real-shaped debts, check
// that every money-advice surface still includes them, and that the server
// guardrail draws the credit line (pay debts down: yes; pick a loan: no).
//
//   node tests/alfred/debts.test.mjs
import { createRequire } from "module";
import { section, check, eq, done } from "../statement-import/harness.mjs";
import { SRC } from "../statement-import/extract.mjs";
import { pullApp, fixToday } from "../motivation/extract.mjs";

fixToday("2026-09-28");
const { debtsBlock, debtsSection, debtsLine, debtPaidOff, debtAfterEdit, setActiveDebts, activeDebts } =
  pullApp(["debtsBlock", "debtsSection", "debtsLine", "debtPaidOff", "debtAfterEdit", "setActiveDebts", "activeDebts"]);

const card = { id: "d1", name: "Credit card", balance: 3200, apr: 18, minPayment: 150, createdAt: "2026-06-01" };
const car = { id: "d2", name: "Car loan", balance: 9800, apr: 6, minPayment: 420, createdAt: "2026-01-01" };
const seeded = { id: "d3", name: "Debt", balance: 5000, apr: 0, minPayment: 0, createdAt: "2026-09-01", fromOnboarding: true };
const has = (text, part) => check("says: " + part, text.includes(part), text);
const lacks = (text, part) => check("does not say: " + part, !text.includes(part), text);

section("nothing tracked");
{
  eq("no debts ever: no section at all", debtsBlock([], "₪"), "");
  eq("no debts: no line", debtsLine([], "₪"), "");
  eq("undefined is fine too", debtsBlock(undefined, "₪"), "");
  eq("no section, not even a blank line", debtsSection([], "₪"), "");
  eq("a section is the block after a blank line", debtsSection([card], "₪"), "\n\n" + debtsBlock([card], "₪"));
}

section("two open debts - the same numbers the Debts screen shows");
{
  const b = debtsBlock([card, car], "₪", 20000);
  has(b, "=== TRACKED DEBTS");
  has(b, "Credit card: ₪3200 owed at 18% a year, minimum ₪150 a month");
  has(b, "Car loan: ₪9800 owed at 6% a year, minimum ₪420 a month");
  has(b, "Total still owed: ₪13000, minimums ₪570 a month");
  // The Debts screen shows "Nov 2028 - 26 months - $1,331.34 interest" for these.
  has(b, "debt-free in 26 months (2028-11), about ₪1331 in interest");
  has(b, "Highest rate (avalanche starts here): Credit card at 18%. Smallest balance (snowball starts here): Credit card at ₪3200.");
  has(b, "does NOT subtract these debts; after them it is ₪7000");
  has(b, "Never recommend a specific lender, loan, card or refinancing product");
  lacks(b, "Paid down");
  lacks(b, "Paid off:");
  eq("one line version", debtsLine([card, car], "₪"), "Tracked debts: ₪13000 owed across 2 debts, the highest rate 18% (Credit card).");
}

section("a debt with no rate or minimum (seeded from the questionnaire)");
{
  const b = debtsBlock([seeded], "₪");
  has(b, "Debt: ₪5000 owed (no interest rate or minimum payment on record - 0 or never entered; check with the user before planning around it)");
  lacks(b, "On minimums alone");
  eq("one debt: no avalanche/snowball line", b.includes("avalanche"), false);
  eq("line without a rate", debtsLine([seeded], "₪"), "Tracked debts: ₪5000 owed across 1 debt.");
  const mixed = debtsBlock([card, seeded], "₪");
  lacks(mixed, "On minimums alone");
  has(mixed, "Credit card: ₪3200 owed at 18% a year");
}

section("minimums that barely cover the interest");
{
  const stuck = { id: "d9", name: "Overdraft", balance: 20000, apr: 24, minPayment: 50 };
  has(debtsBlock([stuck], "$"), "On minimums alone the balance barely moves");
}

section("paying down and paying off");
{
  const lower = debtAfterEdit(card, { balance: 2600 }, "2026-09-10");
  const paidCar = debtPaidOff(car, "2026-08-15");
  const b = debtsBlock([lower, paidCar], "₪", 10000);
  has(b, "Credit card: ₪2600 owed");
  lacks(b, "Car loan: ₪");
  has(b, "Total still owed: ₪2600");
  has(b, "Paid down: ₪600 this month, ₪10400 since Richy started recording payments.");
  has(b, "Paid off: Car loan (2026-08).");
  eq("paid-off debts leave the line", debtsLine([lower, paidCar], "₪"), "Tracked debts: ₪2600 owed across 1 debt, the highest rate 18% (Credit card).");
  const allDone = debtsBlock([debtPaidOff(card, "2026-09-20")], "₪", 5000);
  has(allDone, "Nothing owed right now - every tracked debt is paid off.");
  lacks(allDone, "after them it is");
  eq("nothing open: no line", debtsLine([debtPaidOff(card, "2026-09-20")], "₪"), "");
}

section("the user's currency, never dollars by default");
{
  has(debtsBlock([card], "€"), "Credit card: €3200 owed");
  has(debtsBlock([card]), "Credit card: $3200 owed");
}

section("the list the prompts read");
{
  setActiveDebts([card]);
  eq("set by App, read by the prompts", activeDebts().map((d) => d.name), ["Credit card"]);
  setActiveDebts(null);
  eq("null reads as none", activeDebts(), []);
}

section("every money-advice surface carries the debts");
{
  // Screens hold JSX, which the statement parser doesn't read; a top-level
  // function runs until the next line that starts a top-level function.
  const body = (name) => {
    const start = SRC.search(new RegExp("^(export default )?function " + name + "\\(", "m"));
    if (start < 0) throw new Error("no function " + name);
    const rest = SRC.slice(start + 1);
    const next = rest.search(/^(export default )?function [A-Za-z_$]/m);
    return SRC.slice(start, next < 0 ? SRC.length : start + 1 + next);
  };
  // Each surface appends the section exactly once, as a term of its prompt.
  check("Advisor (analysis, Focus Mode and chat share its data block)", /\+ debtsSection\(activeDebts\(\), cs, netWorth\)/.test(body("Advisor")));
  check("the Advisor's IOU notes are no longer headed as debts", !body("Advisor").includes("OPEN NOTES / DEBTS"));
  check("Full Analysis chat", /\+ debtsSection\(activeDebts\(\), _currency\.sym, netWorth\)/.test(body("FullAnalysisView")));
  check("Your Plan chat", /\+ debtsSection\(activeDebts\(\), _currency\.sym\)/.test(body("PlanView")));
  check("investing coach", /var coachDebts = debtsLine\(activeDebts\(\), _currency\.sym\);\s*if \(coachDebts\) lines\.push\(/.test(body("sendInvestCoach")));
  check("Found Money", /var fmDebts = debtsLine\(activeDebts\(\), _currency\.sym\);/.test(body("FoundMoney")) && /totalLine \+ debtLine \+/.test(body("FoundMoney")));
  check("App sets the list on every render", /setActiveDebts\(debts\);/.test(SRC));
  check("Stock Scout stays out: debts next to a single stock would read as a view on that stock",
    !/activeDebts\(\)/.test(body("runStockScout")) && !/activeDebts\(\)/.test(body("sendScoutChat")) && !/activeDebts\(\)/.test(body("runStockTake")));
}

section("the server guardrail draws the credit line");
{
  const require = createRequire(import.meta.url);
  const prompts = require("../../api/_prompts.js");
  const g = prompts.GUARDRAIL;
  check("paying off debts is budgeting help", g.includes("Helping someone pay off debts they already have is budgeting too"));
  check("no lender, loan, card or refinancing picks", g.includes("never recommend a specific lender, loan, credit card, refinancing or consolidation product"));
  check("never tells anyone to take on credit", g.includes("never tell anyone to take on new credit"));
  check("the investment line is unchanged", g.includes("must never give an opinion on the advisability of buying, selling, or holding any specific security"));
}

done("Alfred sees debts");
