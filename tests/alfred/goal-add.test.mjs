// Alfred never confirms a goal contribution that will not happen.
//
// ROADMAP P1 (found 6 Sep): `goalAdd` was the one Alfred action whose
// validator checked only the amount and the length of the name - every
// neighbour checks the thing it touches exists. So a goal Alfred misnamed,
// or one that follows a savings pot (whose progress never reads `saved`),
// got a confirm card - "Add 200 to Emergency Fund" - and then nothing
// happened. These tests run the shipped validateAction on the three cases.
//
//   node tests/alfred/goal-add.test.mjs
import { section, check, eq, done } from "../statement-import/harness.mjs";
import { SRC } from "../statement-import/extract.mjs";
import { pullApp } from "../motivation/extract.mjs";

const { validateAction, goalLinkedTo, goalNamed, goalSavedAmount } =
  pullApp(["validateAction", "goalLinkedTo", "goalNamed", "goalSavedAmount"]);

const pot = { id: "sav_1", name: "Rainy day", entries: [{ id: 1, kind: "deposit", amount: 900, date: "2026-09-01", fromMain: true }] };
const own = { id: 1, name: "Laptop", target: 4000, saved: 1200 };
const followsPot = { id: 2, name: "Emergency Fund", target: 3000, saved: 0, linkType: "savings", linkId: "sav_1" };
const followsBalance = { id: 3, name: "Cushion", target: 5000, saved: 0, linkType: "balance" };
const orphaned = { id: 4, name: "Old trip", target: 2000, saved: 300, linkType: "savings", linkId: "sav_gone" };
const ctx = { goals: [own, followsPot, followsBalance, orphaned], savings: [pot], businesses: [], investing: [] };
const add = (name, amount) => validateAction({ kind: "goalAdd", name: name, amount: amount }, ctx);

section("a goal whose progress is its own figure");
{
  eq("adding to it is offered", add("Laptop", 200).ok, true);
  eq("ignoring case and stray spaces, like the goal's own screen", add("  laptop ", 200).ok, true);
  eq("a zero amount is still refused", add("Laptop", 0).ok, false);
}

section("a goal that does not exist");
{
  const r = add("Laptpo", 200);
  eq("is refused", r.ok, false);
  check("and says why", /unknown goal/.test(r.reason || ""), r.reason);
}

section("a goal that follows an account");
{
  const r = add("Emergency Fund", 200);
  eq("following a savings pot: refused", r.ok, false);
  check("naming the pot it follows", /Rainy day/.test(r.reason || ""), r.reason);
  eq("following the main balance: refused", add("Cushion", 200).ok, false);
  // Its pot is gone, so goalSavedAmount falls back to `saved` - adding works.
  eq("a pot that no longer exists: the goal's own figure is live again", add("Old trip", 200).ok, true);
  eq("which is the figure the app shows", goalSavedAmount(orphaned, [], [pot], [], []), 300);
}

section("the rule matches the one the app shows progress by");
{
  eq("own figure: not linked", goalLinkedTo(own, [pot], [], []), null);
  check("savings pot that exists: linked", !!goalLinkedTo(followsPot, [pot], [], []));
  eq("savings pot that exists: progress is the pot", goalSavedAmount(followsPot, [], [pot], [], []), 900);
  eq("goalNamed ignores case and spaces", goalNamed(ctx.goals, " EMERGENCY fund ").id, 2);
  eq("goalNamed finds nothing for an empty name", goalNamed(ctx.goals, "  "), null);
}

section("Alfred is told, and the apply step agrees");
{
  check("the Advisor's goal lines say which goals follow an account",
    /var follows = goalLinkedTo\(g, props\.savings, props\.businesses, props\.investing\);/.test(SRC));
  check("the goalAdd instruction rules those out",
    /never one marked \\"follows\\"/.test(SRC));
  check("the apply step skips a goal that follows an account",
    /var gTarget = goalNamed\(nextGoals, a\.name\);\s*if \(gTarget && !goalLinkedTo\(gTarget, nextSavings, props\.businesses, props\.investing\)\)/.test(SRC));
  check("the validator is given businesses and investing",
    /var validationCtx = \{[^}]*businesses: props\.businesses, investing: props\.investing/.test(SRC));
}

done("Alfred goal contributions");
