// Every tr() key must exist in all four languages, and every tr() call must
// resolve. A missing key renders as the raw key name - which looks like a bug
// to the user and reads as English to everyone who isn't reading English.
//
// The keys live in three tables (TRANSLATIONS plus FOLDER_STRINGS and
// ONBOARD_STRINGS, merged into it at load), so they are evaluated rather than
// scraped.
import { readFileSync } from "fs";
const SRC = readFileSync(new URL("../budget-app.jsx", import.meta.url), "utf8");
const LANGS = ["en", "he", "ar", "ru"];

function liftObject(name) {
  const start = SRC.indexOf("\nvar " + name + " = {");
  if (start < 0) throw new Error("not found: " + name);
  let depth = 0, inStr = null, esc = false, inCmt = null;
  const from = SRC.indexOf("{", start);
  for (let j = from; j < SRC.length; j++) {
    const c = SRC[j], nx = SRC[j + 1];
    if (inCmt === "line") { if (c === "\n") inCmt = null; continue; }
    if (inCmt === "block") { if (c === "*" && nx === "/") { inCmt = null; j++; } continue; }
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === inStr) inStr = null; continue; }
    if (c === "/" && nx === "/") { inCmt = "line"; j++; continue; }
    if (c === "/" && nx === "*") { inCmt = "block"; j++; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (!depth) return new Function("return " + SRC.slice(from, j + 1))(); }
  }
  throw new Error("unbalanced: " + name);
}

const merged = {};
for (const c of LANGS) merged[c] = {};
for (const name of ["TRANSLATIONS", "FOLDER_STRINGS", "ONBOARD_STRINGS"]) {
  const obj = liftObject(name);
  for (const c of LANGS) Object.assign(merged[c], obj[c] || {});
}

let bad = 0;
const enKeys = Object.keys(merged.en);
for (const c of LANGS.slice(1)) {
  const missing = enKeys.filter(k => merged[c][k] === undefined);
  const extra = Object.keys(merged[c]).filter(k => merged.en[k] === undefined);
  if (missing.length) { bad += missing.length; console.log("  " + c + " missing " + missing.length + ": " + missing.slice(0, 15).join(", ")); }
  if (extra.length) { bad += extra.length; console.log("  " + c + " has " + extra.length + " keys en lacks: " + extra.slice(0, 15).join(", ")); }
}

const used = [...new Set([...SRC.matchAll(/\btr\("([A-Za-z][A-Za-z0-9_]*)"\)/g)].map(m => m[1]))];
const unresolved = used.filter(k => merged.en[k] === undefined);
if (unresolved.length) { bad += unresolved.length; console.log("  tr() keys with no entry: " + unresolved.join(", ")); }

// Values identical across every language are usually keys nobody translated.
const shared = enKeys.filter(k => {
  const en = merged.en[k];
  return typeof en === "string" && /[A-Za-z]{4}/.test(en) && LANGS.slice(1).every(c => merged[c][k] === en);
});

console.log("\n" + enKeys.length + " keys x " + LANGS.length + " languages; " + used.length + " referenced by tr()");
if (shared.length) console.log("note: " + shared.length + " key(s) share the English value everywhere: " + shared.slice(0, 12).join(", "));
console.log(bad ? bad + " problem(s)" : "All keys present in every language, and every tr() call resolves.");
process.exit(bad ? 1 : 0);
