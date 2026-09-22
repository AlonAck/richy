// Pulls the REAL functions out of budget-app.jsx and evaluates them, so these
// tests exercise the shipping code rather than a copy of it that can drift.
// The app is one 39k-line file with no module boundary, so there is nothing to
// import; brace-matching from a name is the honest way in.
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = readFileSync(join(ROOT, "budget-app.jsx"), "utf8");

function grabFunction(name) {
  const at = SRC.indexOf("\nfunction " + name + "(");
  if (at < 0) throw new Error("function not found in budget-app.jsx: " + name);
  let i = SRC.indexOf("{", at), depth = 0;
  for (; i < SRC.length; i++) {
    if (SRC[i] === "{") depth++;
    else if (SRC[i] === "}") { depth--; if (!depth) return SRC.slice(at, i + 1); }
  }
  throw new Error("unbalanced braces reading " + name);
}

function grabVar(name) {
  // Single-line `var NAME = ...;` declarations only - every constant these
  // tests need is written that way. Stops at the first semicolon so a trailing
  // end-of-line comment does not defeat the match.
  const re = new RegExp("^var " + name + " = [^;\\n]*;", "m");
  const m = re.exec(SRC);
  if (!m) throw new Error("var not found in budget-app.jsx: " + name);
  return m[0];
}

// A multi-line concatenated string constant (the two system prompts).
function grabPrompt(name) {
  const at = SRC.indexOf("\nvar " + name + " = ");
  if (at < 0) throw new Error("prompt not found: " + name);
  const end = SRC.indexOf(";\n", at);
  if (end < 0) throw new Error("unterminated prompt: " + name);
  return SRC.slice(at, end + 1);
}

const VARS = ["CSV_HEAD_MAX", "CSV_SHAPE_MAX", "CSV_CELL_MAX", "CSV_NUL",
  "CSV_SEP_CELL", "CSV_SEP_ROW", "CSV_SEP_PART",
  "CSV_SHOPS_PER_CALL", "CSV_SHOPS_MAX", "CSV_SHOP_EXAMPLES",
  "AI_MODEL_CSV_MAP", "AI_MODEL_CSV_SHOPS"];

const FNS = ["pad2", "parseCSV", "sniffMap", "parseImportDate", "parseImportAmount",
  "normalizeMerchant", "shopKey", "labelSimilarity", "dayGap", "dupScore",
  "csvDecodeBytes", "csvIsDateCell", "csvIsNumberCell", "csvCellKind", "csvRowKinds",
  "csvRowIsData", "csvFirstDataRow", "csvMaskCell", "csvColumnProfiles", "csvSkeleton",
  "csvHash", "csvFingerprint", "csvDetectDateFormat", "csvDetectSign",
  "csvParseJsonBlock", "csvCol", "csvConf", "alfredErr",
  // These two make a network call in the app. They are pulled in anyway so the
  // code that reads a real model's answer - the fence stripping, the
  // out-of-range clamping, the per-chunk failure handling - is the code under
  // test, not a paraphrase of it. callClaude is stubbed via setClaude below.
  "mapColumnsWithAI", "categorizeShopsWithAI"];

const PROMPTS = ["CSV_MAP_SYSTEM", "CSV_SHOPS_SYSTEM"];

const body = [
  "var DUP_CERTAIN = 0.86, DUP_MAYBE = 0.55;",
  // The stand-in for the network. Tests set it; nothing here ever leaves the
  // machine.
  "var __claude = function() { throw new Error('callClaude was not stubbed'); };",
  "function callClaude(messages, system, maxTokens, callback, model, timeoutMs) {",
  "  return __claude(messages, system, maxTokens, callback, model, timeoutMs);",
  "}",
  "function setClaude(fn) { __claude = fn; }",
  ...VARS.map(grabVar),
  ...PROMPTS.map(grabPrompt),
  ...FNS.map(grabFunction),
  "return {" + [...VARS, ...PROMPTS, ...FNS].join(",") + ", setClaude: setClaude};"
].join("\n");

export const app = new Function(body)();
export { SRC, ROOT };
