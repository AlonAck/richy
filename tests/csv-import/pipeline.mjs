// The import screen's steps, run end to end on one file, with Alfred stubbed.
// Every function called here is the shipping one, pulled out of budget-app.jsx
// by extract.mjs - this file only strings them together in the order
// ImportSheet does (goMap -> applyReading -> goPreview -> resolveShops ->
// buildTxs), so a file that imports wrong here imports wrong in the app.
import { app } from "./extract.mjs";
import { toCp1255, toUtf8 } from "./fixtures.mjs";
import { buildXlsx } from "./sheet-fixtures.mjs";

const {
  sheetReadBytes, parseCSV, csvSkeleton, csvLocalReading, csvMergeModelMap, csvSettleReading,
  csvReadRows, csvShopOrder, csvPlanShops, csvShopHistory, categorizeShopsWithAI, csvBuildCandidates,
  classifyImportRows, csvTitleKind, csvIsDealAmountTitle, csvIsChargeTitle, setClaude, mapColumnsWithAI
} = app;

// The categories a new account starts with - the real list, read out of the
// app. Note there is no Travel in it: a flight has nowhere better than Other
// or Transport to go, and the suite does not pretend otherwise.
export const CATS = app.DEFAULT_CATEGORIES;
// A date no statement in the suite is from. A line that comes out on it was
// stamped with "today" instead of read - the bug that put a card's total into
// the month as a purchase of its own.
export const TODAY = "2031-01-01";

// The bytes the user's phone would hand the reader.
export function fileBytes(file) {
  if (file.kind === "xlsx") return { bytes: buildXlsx(file.sheets), name: "statement.xlsx" };
  if (file.kind === "html") return { bytes: toUtf8(file.text), name: "statement.xls" };
  let b = file.encoding === "windows-1255" ? toCp1255(file.text) : toUtf8(file.text);
  if (file.bom && file.encoding !== "windows-1255") b = Uint8Array.from([0xef, 0xbb, 0xbf, ...b]);
  return { bytes: b, name: file.name || "statement.csv" };
}

// The reader is asynchronous for a .xlsx (it inflates through a stream), so
// this is too. Nothing may hang: a file the reader never finishes with is a
// file the user is stuck on.
export function readFile(file) {
  const { bytes, name } = fileBytes(file);
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ err: "TIMED OUT reading the file" }), 15000);
    sheetReadBytes(buf, name, (err, out) => {
      clearTimeout(timer);
      if (err) { resolve({ err: err.message }); return; }
      resolve({ rows: out.rows || parseCSV(out.text), encoding: out.encoding || "", sheet: out.sheet || "" });
    });
  });
}

// ---- how the columns get read -------------------------------------------------
// "local"     Alfred unreachable: the screen's local-fallback path
// "model"     Alfred reads the titles right (stood in for by the local reading
//             - the question here is what the rest of the pipeline does with a
//             sound reading)
// "model-deal"      Alfred picks the SHOP's amount (סכום עסקה) over the charge
// "model-currency"  Alfred takes the currency column (מטבע חיוב) as money out
// "model-blank"     Alfred answers with nothing but the header row
// "model-desc-type" Alfred names the transaction-type column (DEB/DD/SO,
//                   רגילה/תשלומים) as the shop
// "model-swap"      Alfred swaps money in and money out on a split file
// Each wrong reading is one a model has actually been seen to give; the
// pipeline is expected to put every one of them right against the rows.
// Every model mode goes through the real mapColumnsWithAI - Alfred's answer is
// written as the JSON he sends, header row counted from the start of the
// lines he was shown - so the reply parsing and the header arithmetic are the
// shipping ones too.
export const MAP_MODES = ["local", "model", "model-deal", "model-currency", "model-blank", "model-desc-type", "model-swap"];

function modelAnswer(parsed, sk, mode) {
  const hRow = sk.titleRow;
  const local = csvLocalReading(parsed, hRow);
  const head = parsed[hRow] || [];
  const r = { date: local.date, desc: local.desc, amount: local.amount, debit: local.debit, credit: local.credit, cat: local.cat };
  let conf = "high";
  if (mode === "model-deal") {
    const deal = head.findIndex((h) => csvIsDealAmountTitle(h) && !csvIsChargeTitle(h));
    if (deal >= 0 && r.amount >= 0) r.amount = deal;
  } else if (mode === "model-currency") {
    const cur = head.findIndex((h) => csvTitleKind(h) === "currency");
    if (cur >= 0) { r.debit = cur; r.amount = -1; }
  } else if (mode === "model-blank") {
    r.date = r.desc = r.amount = r.debit = r.credit = r.cat = -1;
    conf = "low";
  } else if (mode === "model-desc-type") {
    const ty = head.findIndex((h) => /סוג ה?עסקה|סוג ה?פעולה|סוג תנועה|transaction type|^type$/i.test(String(h || "").trim()));
    if (ty >= 0 && ty !== r.desc) r.desc = ty;
  } else if (mode === "model-swap") {
    if (r.debit >= 0 && r.credit >= 0) { const d = r.debit; r.debit = r.credit; r.credit = d; }
  }
  const col = (c) => (c >= 0 ? c : null);
  return {
    header_row_index: hRow - (sk.headFrom || 0),
    date_column: col(r.date), shop_column: col(r.desc), amount_column: col(r.amount),
    debit_column: col(r.debit), credit_column: col(r.credit), category_column: col(r.cat),
    date_format: "unknown", amount_sign_convention: "unknown",
    confidence: { header_row_index: "high", date_column: conf, shop_column: conf, amount_column: conf }
  };
}

// "saved" is the next month: the layout the user confirmed last time for this
// bank (profile, as doImport stores it) read straight back, no call made -
// goMap's saved branch. The rest is goMap step for step.
export function readColumns(parsed, mode, profile) {
  const sk = csvSkeleton(parsed);
  if (mode === "saved" && profile) {
    const savedOut = typeof profile.positiveOut === "boolean" ? profile.positiveOut : false;
    const hRow = typeof profile.headerRow === "number" ? profile.headerRow : 0;
    return { hRow, st: csvSettleReading(parsed, hRow, profile.map, savedOut ? "positive_is_expense" : "", null,
      typeof profile.preferDMY === "boolean" ? profile.preferDMY : undefined, profile.signByHand ? (savedOut ? "positive_out" : "negative_out") : "") };
  }
  if (!sk.head.length) {
    return { hRow: -1, st: csvSettleReading(parsed, -1, csvLocalReading(parsed, -1), "", null) };
  }
  if (mode === "local") {
    const hRow = sk.titleRow;
    return { hRow, st: csvSettleReading(parsed, hRow, csvLocalReading(parsed, hRow), "", null) };
  }
  const answer = modelAnswer(parsed, sk, mode);
  let r = null, err = null;
  setClaude((messages, system, maxTokens, cb) => cb(null, JSON.stringify(answer)));
  mapColumnsWithAI(sk, (e, got) => { err = e; r = got; });
  setClaude(null);
  if (err || !r) {
    const hRow = sk.titleRow;
    return { hRow, st: csvSettleReading(parsed, hRow, csvLocalReading(parsed, hRow), "", null) };
  }
  const hRow = r.headerRowIndex >= 0 ? r.headerRowIndex : sk.titleRow;
  const m = csvMergeModelMap(r, csvLocalReading(parsed, hRow));
  return { hRow, st: csvSettleReading(parsed, hRow, m, r.sign, r.confidence) };
}

// ---- Alfred sorting the shops ---------------------------------------------------
// "oracle"    answers every shop right (from `know`: name -> category), by number
// "echo"      the OLD answer shape - keyed by the name, with the name not quite
//             copied (a gershayim for the quote, the spacing changed) - which
//             is what lost shops to Other before
// "cutoff"    the right answers, but a long one cut off two thirds of the way
//             through - what the output cap does to an answer that runs long
// "down"      unreachable
// "shrug"     answers Other for everything
export const SHOP_MODES = ["oracle", "echo", "cutoff", "down", "shrug"];

function shopStub(mode, know) {
  return (messages, system, maxTokens, cb) => {
    if (mode === "down") { const e = new Error("network"); e.kind = "network"; cb(e, null); return; }
    const body = JSON.parse(messages[0].content);
    const ans = body.shops.map((s) => {
      const cat = mode === "shrug" ? "Other" : (know(s.name) || "Other");
      if (mode === "echo") return { shop: s.name.replace(/"/g, "״").replace(/ (?=\S)/, "  "), category: cat, confidence: "high" };
      return { i: s.i, category: cat, confidence: "high" };
    });
    let text = JSON.stringify(ans);
    if (mode === "cutoff" && ans.length > 30) text = text.slice(0, Math.floor(text.length * 0.66));
    cb(null, text);
  };
}

// The whole import. opts: { mapMode, shopMode, know, existing, saved }.
// Returns { err } or { rows, read, st, cands, shopMeta, hRow }.
export async function runImport(file, opts) {
  opts = opts || {};
  const got = await readFile(file);
  if (got.err) return { err: got.err };
  const parsed = got.rows;
  const { hRow, st } = readColumns(parsed, opts.mapMode || "local", opts.profile);
  const map = st.map;
  const head = hRow >= 0 ? parsed[hRow] : null;
  const read = csvReadRows(parsed.slice(hRow >= 0 ? hRow + 1 : 0), head, map, st.sign.splitAmt, st.sign.positiveOut, st.fmt.preferDMY, TODAY,
    hRow > 0 ? parsed.slice(0, hRow) : null);

  const existing = opts.existing || [];
  const saved = opts.saved || {};
  const order = csvShopOrder(read.items, st.sign.positiveOut);
  const plan = csvPlanShops(order, saved, csvShopHistory(existing, false, CATS), CATS);
  const shops = plan.out;
  let shopMeta = { asked: 0 };
  if (plan.ask.length) {
    setClaude(shopStub(opts.shopMode || "oracle", opts.know || (() => "")));
    categorizeShopsWithAI(plan.ask.map((s) => ({ name: s.label, hint: s.hint })), CATS, [], (e, answers, meta) => {
      plan.ask.forEach((s) => {
        const g = answers[s.label];
        if (g) shops[s.key] = { category: g.category, confidence: g.confidence, source: "alfred", label: s.label };
      });
      shopMeta = Object.assign({ asked: plan.ask.length, err: !!e }, meta);
    });
    setClaude(null);
  }
  const ctx = { cats: CATS, shops, saved, tx: existing, incomeHist: csvShopHistory(existing, true, CATS), spendHist: csvShopHistory(existing, false, CATS) };
  const cands = csvBuildCandidates(read.items, st.sign.positiveOut, ctx, 1000);
  const classified = classifyImportRows(cands, existing);
  // What doImport would write, with every look-alike question answered "two
  // purchases - add it" (the file's own lines are real), and what it would
  // remember: the layout for this bank and every shop settled.
  const written = classified.fresh.concat(classified.maybes.map((m) => m.tx)).map((t) => {
    const c = {}; for (const k in t) if (k !== "catSure" && k !== "shopK" && k !== "flowGuess" && k !== "dateGuess") c[k] = t[k];
    return c;
  });
  const m = st.map;
  const profile = { map: { date: m.date, amount: m.amount, desc: m.desc, debit: m.debit, credit: m.credit, cat: m.cat >= 0 ? m.cat : -1 },
    headerRow: hRow, splitAmt: st.sign.splitAmt, positiveOut: st.sign.positiveOut, signByHand: false, preferDMY: st.fmt.preferDMY };
  const learned = {};
  for (const k in shops) { const v = shops[k]; if (v && v.category && v.source !== "saved" && v.source !== "history") learned[k] = { category: v.category, source: v.source === "user" ? "user" : "ai", label: v.label || k }; }
  return { rows: parsed, hRow, st, read, cands, classified, written, profile, learned, shopMeta, shops };
}
