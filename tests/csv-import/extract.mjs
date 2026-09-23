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
  // tests need is written that way. Cuts at the first semicolon OUTSIDE a
  // string, so that a trailing end-of-line comment does not defeat the match
  // and a value that contains a semicolon (the delimiter list) survives it.
  const re = new RegExp("^var " + name + " = ", "m");
  const m = re.exec(SRC);
  if (!m) throw new Error("var not found in budget-app.jsx: " + name);
  let q = null;
  for (let i = m.index + m[0].length; i < SRC.length; i++) {
    const ch = SRC[i];
    if (q) { if (ch === "\\") i++; else if (ch === q) q = null; continue; }
    if (ch === "\"" || ch === "'") { q = ch; continue; }
    if (ch === ";") return SRC.slice(m.index, i + 1);
    if (ch === "\n") break;
  }
  throw new Error("unterminated var in budget-app.jsx: " + name);
}

// A multi-line concatenated string constant (the two system prompts).
function grabPrompt(name) {
  const at = SRC.indexOf("\nvar " + name + " = ");
  if (at < 0) throw new Error("prompt not found: " + name);
  const end = SRC.indexOf(";\n", at);
  if (end < 0) throw new Error("unterminated prompt: " + name);
  return SRC.slice(at, end + 1);
}

const VARS = ["SHEET_NS", "SHEET_MAX_SHEETS", "CSV_DELIMS", "CSV_SNIFF_BYTES", "CSV_SNIFF_ROWS", "SHEET_MAX_ROWS", "SHEET_MAX_COLS", "SHEET_MAX_TABLES", "XLSX_DATE_FMT_IDS",
  "SHEET_MAX_BYTES", "SHEET_MAX_INFLATE", "SHEET_MAX_ENTRIES", "SHEET_MAX_STRINGS", "SHEET_DAMAGED", "SHEET_TOO_BIG",
  "CSV_HEAD_MAX", "CSV_SHAPE_MAX", "CSV_CELL_MAX", "CSV_NUL",
  "CSV_SEP_CELL", "CSV_SEP_ROW", "CSV_SEP_PART",
  "CSV_SHOPS_PER_CALL", "CSV_SHOPS_MAX", "CSV_SHOP_EXAMPLES",
  "AI_MODEL_CSV_MAP", "AI_CSV_MAP_EFFORT", "AI_CSV_MAP_TOKENS", "AI_MODEL_CSV_SHOPS"];

const FNS = ["pad2", "csvTitleKind", "csvIsChargeTitle", "csvIsDealAmountTitle", "parseCSV", "csvScan", "csvPickDelim", "sniffMap", "parseImportDate", "parseImportAmount",
  "normalizeMerchant", "shopKey", "labelSimilarity", "dayGap", "dupScore",
  "csvDecodeBytes", "csvIsDateCell", "csvIsNumberCell", "csvCellKind", "csvRowKinds",
  "csvRowIsData", "csvFirstDataRow", "csvMaskCell", "csvSectionRows", "csvColumnProfiles", "csvSkeleton",
  "csvHash", "csvFingerprint", "csvDetectDateFormat", "csvDetectSign", "csvColumnKinds", "csvRepairMap", "csvDistinctText", "csvFlowWord", "csvFindFlowColumn", "csvRowMoney", "csvIsRefund", "csvHasAny", "csvTransferKind", "csvIncomeKind", "csvRowCategory", "csvSectorCat", "guessImportCatId", "round2",
  // Which lines are purchases, and the import's steps outside the screen.
  "csvSummaryText", "csvSummaryRow", "csvTitleRow", "csvCellsKey", "csvReadRows",
  "csvLocalReading", "csvMergeModelMap", "csvSettleReading", "csvBuildCandidates", "csvShopOrder",
  // The duplicate check the screen runs on the built rows.
  "dupKey", "bestDupMatch", "classifyImportRows",
  // Who decides a shop's category, and the fallbacks under it.
  "catById", "catByName", "catMatchText", "catWordChar", "catHasKeyword", "keywordCatName", "catIsNoise",
  "topKey", "labelHasWord", "suggestCatId", "csvShopHistory", "csvHistoryCat", "csvPlanShops",
  "csvParseJsonBlock", "csvParseJsonObjects", "csvLooseName", "csvShopAnswers", "csvCol", "csvConf", "alfredErr",
  // The spreadsheet reader. Everything from the zip directory up to "what kind
  // of file is this" is pulled in, because a .xlsx is read byte by byte and
  // the tests build real ones to feed it.
  "sheetChar", "sheetUnxml", "sheetAttr", "sheetAttrNS", "sheetEachTag", "sheetSection",
  "sheetCleanCell", "sheetHasContent", "sheetHasRows", "sheetUtf8",
  "sheetU16", "sheetU32", "zipEntries", "zipEntryBytes", "sheetInflate",
  "zipEntryText", "zipReadText", "xlsxSharedStrings", "sheetFmtIsDate",
  "xlsxDateStyles", "sheetColFromRef", "sheetSerialToDate", "xlsxSheetRows",
  "xlsxSheetList", "xlsxRelPath", "xlsxRelMap", "sheetMergeTables", "sheetStatementTitles", "xlsxRead",
  "htmlText", "htmlTableRegions", "htmlRowCells",
  "htmlRegionRows", "sheetTableScore", "htmlSheetRows", "xmlssRows",
  "sheetIsZip", "sheetIsOle", "sheetMagicRefusal", "sheetLooksBinary", "sheetMarkupKind", "sheetReadBytes", "sheetReadNote",
  // These two make a network call in the app. They are pulled in anyway so the
  // code that reads a real model's answer - the fence stripping, the
  // out-of-range clamping, the per-chunk failure handling - is the code under
  // test, not a paraphrase of it. callClaude is stubbed via setClaude below.
  "mapColumnsWithAI", "categorizeShopsWithAI"];

// Multi-line constants: the two system prompts and the keyword map - and the
// regular expressions, whose quote marks would confuse grabVar's string walk.
const PROMPTS = ["CSV_MAP_SYSTEM", "CSV_SHOPS_SYSTEM", "IMPORT_CAT_KEYWORDS", "CSV_TRANSFER_WORDS",
  "CSV_TITLE_CURRENCY", "CSV_TITLE_REFERENCE", "CSV_TITLE_BALANCE", "CSV_TITLE_SECTOR",
  "CSV_SUM_HE", "CSV_SUM_HE_START", "CSV_SUM_EN", "CSV_TITLE_WORD", "CSV_SECTOR_RULES",
  "DEFAULT_CATEGORIES"];

const body = [
  "var DUP_CERTAIN = 0.86, DUP_MAYBE = 0.55;",
  // The stand-in for the network. Tests set it; nothing here ever leaves the
  // machine.
  "var __claude = function() { throw new Error('callClaude was not stubbed'); };",
  "function callClaude(messages, system, maxTokens, callback, model, timeoutMs, extra) {",
  "  return __claude(messages, system, maxTokens, callback, model, timeoutMs, extra);",
  "}",
  "function setClaude(fn) { __claude = fn; }",
  ...VARS.map(grabVar),
  ...PROMPTS.map(grabPrompt),
  ...FNS.map(grabFunction),
  "return {" + [...VARS, ...PROMPTS, ...FNS].join(",") + ", setClaude: setClaude};"
].join("\n");

export const app = new Function(body)();
export { SRC, ROOT };
