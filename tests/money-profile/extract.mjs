// Pulls the REAL money-profile code, and the watch engine it steers, out of
// budget-app.jsx and evaluates it - the same approach as the statement-import
// tests, so these exercise the shipping code rather than a copy.
//
// The engine leans on a long tail of app helpers (the leak detectors, month
// maths, money formatting), so rather than list them by hand this follows the
// references: every top-level `function NAME(` or `var NAME =` a pulled
// statement mentions is pulled too, until nothing new turns up. Only three
// things are stood in for: T (theme colours - a proxy that returns the token's
// own name), tr (returns the key, so a test can see WHICH text was chosen) and
// React components, which none of this code touches.
import { SRC, grab } from "../statement-import/extract.mjs";

const TOP_FN = new Set([...SRC.matchAll(/^function ([A-Za-z_$][\w$]*)\(/gm)].map((m) => m[1]));
const TOP_VAR = new Set([...SRC.matchAll(/^var ([A-Za-z_$][\w$]*) = /gm)].map((m) => m[1]));
const STUBBED = new Set(["T", "tr", "TRANSLATIONS"]);

export const ROOTS = [
  "moneyProfile", "setActiveMoneyProfile", "activeMoneyProfile", "keepingState", "calmLeakTypes",
  "planSpendRoom", "planMonthBasis", "keepBarPct", "starterBudgets", "starterKeep", "moneyProfileBlock", "deriveMoneyStory",
  "offlineMonthRead", "offlineTipsFor", "offlineSavingsAnswer", "nextMoveSavingsBar",
  "alfredWatch", "monthVerdict", "findMoney", "optionById",
  "STAGES", "SITUATIONS", "SAVE_HABITS", "LEAK_OPTIONS", "LEAK_EXCLUSIVE", "PROFILE_STRINGS", "DEFAULT_CATEGORIES"
];

const order = [];
const seen = new Set();
function pull(name) {
  if (seen.has(name) || STUBBED.has(name)) return;
  const isFn = TOP_FN.has(name), isVar = TOP_VAR.has(name);
  if (!isFn && !isVar) return;
  seen.add(name);
  // Components are capitalised and render JSX; nothing under test calls one.
  if (isFn && /^[A-Z]/.test(name)) return;
  const text = grab(isFn ? "function" : "var", name);
  const ids = new Set(text.match(/[A-Za-z_$][\w$]*/g) || []);
  ids.forEach((id) => { if (id !== name) pull(id); });
  order.push({ name, text, isVar });
}
ROOTS.forEach(pull);

// Vars first (in file order, since one var can be built from another), then
// every function - declarations hoist, so their order does not matter.
const lineOf = (text) => SRC.indexOf(text);
const vars = order.filter((o) => o.isVar).sort((a, b) => lineOf(a.text) - lineOf(b.text));
const fns = order.filter((o) => !o.isVar);

const body = [
  "var T = new Proxy({}, { get: function(_, k) { return typeof k === 'string' ? k : undefined; } });",
  "function tr(key) { return key; }",
  ...vars.map((o) => o.text),
  ...fns.map((o) => o.text),
  "return {" + order.map((o) => o.name).join(",") + "};"
].join("\n");

export const app = new Function(body)();
export const pulled = order.map((o) => o.name);
