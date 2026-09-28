// Pulls the REAL motivation code out of budget-app.jsx and evaluates it, the
// same way tests/money-profile/extract.mjs does: every top-level function or
// var a pulled statement mentions is pulled too, until nothing new turns up.
// Only T (theme colours), tr (returns the key, so a test can see WHICH text
// was chosen) and React components are stood in for.
import { SRC, grab } from "../statement-import/extract.mjs";

const TOP_FN = new Set([...SRC.matchAll(/^function ([A-Za-z_$][\w$]*)\(/gm)].map((m) => m[1]));
const TOP_VAR = new Set([...SRC.matchAll(/^var ([A-Za-z_$][\w$]*) = /gm)].map((m) => m[1]));
const STUBBED = new Set(["T", "tr", "TRANSLATIONS"]);

export function pullApp(roots) {
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
  roots.forEach(pull);
  const lineOf = (text) => SRC.indexOf(text);
  const body = [
    "var T = new Proxy({}, { get: function(_, k) { return typeof k === 'string' ? k : undefined; } });",
    "function tr(key) { return key; }",
    ...order.filter((o) => o.isVar).sort((a, b) => lineOf(a.text) - lineOf(b.text)).map((o) => o.text),
    ...order.filter((o) => !o.isVar).map((o) => o.text),
    "return {" + order.map((o) => o.name).join(",") + "};"
  ].join("\n");
  return new Function(body)();
}

// Every date-dependent rule reads the clock; a test file runs on one day.
export function fixToday(iso) {
  const RealDate = Date;
  globalThis.Date = class extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(iso + "T12:00:00Z"); }
    static now() { return new RealDate(iso + "T12:00:00Z").getTime(); }
  };
}
