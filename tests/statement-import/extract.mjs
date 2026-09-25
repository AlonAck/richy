// Pulls the REAL statement-import code out of budget-app.jsx and evaluates it,
// so these tests exercise the shipping code rather than a copy that can drift.
// The app is one file with no module boundary, so there is nothing to import;
// every top-level `function imp...` and `var IMP_...` is found by name and
// brace-matched out, together with the handful of app helpers it leans on.
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
let SRC = readFileSync(join(ROOT, "budget-app.jsx"), "utf8");
// While the code is being written outside the app, IMP_SRC names extra files
// to read it from. Unset in normal runs.
if (process.env.IMP_SRC) {
  for (const f of process.env.IMP_SRC.split(";").filter(Boolean)) SRC += "\n" + readFileSync(f, "utf8");
}

// One top-level statement starting at `at`: to the brace that closes a
// function, or to the semicolon that ends a `var` at depth zero. Strings,
// template literals, regex literals and comments are stepped over so a brace
// or semicolon inside them does not end it early.
function statementEnd(at) {
  let depth = 0, i = at, seenBrace = false;
  const isFn = SRC.startsWith("function", at);
  while (i < SRC.length) {
    const ch = SRC[i];
    if (ch === "/" && SRC[i + 1] === "/") { i = SRC.indexOf("\n", i); if (i < 0) return SRC.length; continue; }
    if (ch === "/" && SRC[i + 1] === "*") { i = SRC.indexOf("*/", i + 2) + 2; continue; }
    if (ch === "\"" || ch === "'" || ch === "`") {
      const q = ch; i++;
      while (i < SRC.length && SRC[i] !== q) { if (SRC[i] === "\\") i++; i++; }
      i++; continue;
    }
    if (ch === "/") {
      // A regex literal: a slash where an operand is expected.
      let j = i - 1;
      while (j > at && /\s/.test(SRC[j])) j--;
      if ("(,=:[!&|?{};+-*%<>~^".includes(SRC[j]) || /\breturn$/.test(SRC.slice(Math.max(at, j - 6), j + 1))) {
        i++;
        let cls = false;
        while (i < SRC.length) {
          const c = SRC[i];
          if (c === "\\") { i += 2; continue; }
          if (c === "[") cls = true; else if (c === "]") cls = false;
          else if (c === "/" && !cls) break;
          else if (c === "\n") break;
          i++;
        }
        i++; continue;
      }
    }
    if (ch === "{" || ch === "(" || ch === "[") { depth++; if (ch === "{") seenBrace = true; }
    else if (ch === "}" || ch === ")" || ch === "]") {
      depth--;
      if (isFn && depth === 0 && ch === "}" && seenBrace) return i + 1;
    } else if (ch === ";" && depth === 0 && !isFn) return i + 1;
    i++;
  }
  throw new Error("unterminated statement at " + at);
}
function grab(kind, name) {
  const re = new RegExp("^" + kind + " " + name.replace(/\$/g, "\\$") + (kind === "function" ? "\\(" : " = "), "m");
  const m = re.exec(SRC);
  if (!m) throw new Error(kind + " not found: " + name);
  return SRC.slice(m.index, statementEnd(m.index));
}

// The statement-import code: everything named imp*/IMP_*.
const IMP_FNS = [...new Set([...SRC.matchAll(/^function (imp[A-Z]\w*)\(/gm)].map((m) => m[1]))];
const IMP_VARS = [...new Set([...SRC.matchAll(/^var (IMP_[A-Z0-9_]+) = /gm)].map((m) => m[1]))];

// The app helpers it uses. Pulled from the same file, so a change to how the
// app normalises a shop name is a change these tests see.
const APP_FNS = ["normalizeMerchant", "shopKey", "catById", "catByName", "isOpening", "isTransfer", "dayGap",
  "keywordCatName", "catMatchText", "catWordChar", "catHasKeyword"];
const APP_VARS = ["IMPORT_CAT_KEYWORDS", "CURRENCY_OPTIONS", "DEFAULT_CATEGORIES"];

const body = [
  // Stand-ins for the browser and the app shell. Nothing here leaves the machine.
  "var CLOUD = { getIdToken: function() { return Promise.resolve(null); } };",
  "function alfredApiUrl() { return 'http://localhost/api/chat'; }",
  ...APP_VARS.map((n) => grab("var", n)),
  ...APP_FNS.map((n) => grab("function", n)),
  ...IMP_VARS.map((n) => grab("var", n)),
  ...IMP_FNS.map((n) => grab("function", n)),
  "return {" + [...APP_VARS, ...APP_FNS, ...IMP_VARS, ...IMP_FNS].join(",") + "};"
].join("\n");

export const app = new Function(body)();
export const names = { IMP_FNS, IMP_VARS };
export { SRC, ROOT };
