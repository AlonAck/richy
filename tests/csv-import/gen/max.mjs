// Max (formerly Leumi Card) - the "פירוט עסקאות" export from max.co.il.
//
// What the real file looks like: an .xlsx (a CSV only when the user opened it
// in Excel and saved it again), one sheet per kind of transaction - "עסקאות
// במועד החיוב" for the month's charges, and on some exports a separate
// 'עסקאות חו"ל ומט"ח' sheet for foreign purchases. Each sheet opens with a
// few report lines (which users, which cards, which month), then a sixteen-
// column table whose titles are fixed by Max, then a "סך הכל" line with the
// label in the first column and the figure under סכום חיוב.
//
// The columns that break importers are all here: TWO money columns (the charge
// and the original deal amount - the full price of an installment plan, or
// dollars on a foreign purchase), TWO date columns (deal date and charge date),
// two currency columns, a 4-digit card column that looks like an amount, and a
// conversion-rate column. Refunds are negative lines with סוג עסקה "זיכוי".
//
// Written from knowledge of the export (the column list is the one Max has
// shipped since ~2021; older exports stop after הערות). Web search did not
// turn up a public sample to check the report lines against, so their wording
// is varied rather than fixed.
import { SHOPS, isoDate, randomDay } from "./_lib.mjs";

// ------------------------------------------------------------ the columns --
const COLS = {
  date: "תאריך עסקה",
  shop: "שם בית העסק",
  cat: "קטגוריה",
  card: "4 ספרות אחרונות של כרטיס האשראי",
  type: "סוג עסקה",
  charge: "סכום חיוב",
  chargeCur: "מטבע חיוב",
  orig: "סכום עסקה מקורי",
  origCur: "מטבע עסקה מקורי",
  chargeDate: "תאריך חיוב",
  notes: "הערות",
  tags: "תיוגים",
  club: "מועדון הנחות",
  discount: "מפתח דיסקונט",
  method: "אופן ביצוע ההעסקה",
  rate: "שער המרה ממטבע מקור/התחשבנות לש\"ח"
};
const KEYS_FULL = ["date", "shop", "cat", "card", "type", "charge", "chargeCur", "orig", "origCur", "chargeDate", "notes", "tags", "club", "discount", "method", "rate"];
const KEYS_OLD = KEYS_FULL.slice(0, 11);      // exports before the tagging features
const KEYS_TAGS = KEYS_FULL.slice(0, 12);

const MAIN_SHEET = "עסקאות במועד החיוב";
const FOREIGN_SHEET = "עסקאות חו\"ל ומט\"ח";

// ------------------------------------------------------------- the shops --
// Travel is not one of Richy's default categories, so its shops stay out of
// the truth rather than asking the importer for a category it cannot pick.
const POOL = SHOPS.filter((s) => s.cat !== "Travel");
const byName = (names) => POOL.filter((s) => names.indexOf(s.name) !== -1);
const FOREIGN_SHOPS = byName(["NETFLIX.COM", "SPOTIFY", "STEAM GAMES", "ALIEXPRESS", "AMAZON MKTPLACE", "SHEIN"]);
const STANDING_SHOPS = byName(["חברת החשמל לישראל", "בזק", "הוט מובייל", "פרטנר תקשורת", "סלקום", "עיריית תל אביב ארנונה",
  "מי אביבים", "הולמס פלייס", "NETFLIX.COM", "SPOTIFY", "יס פלאנט", "מכבי שירותי בריאות"]);
// What people actually split into payments: electronics, furniture, clothes,
// a gym membership - not the supermarket.
const INSTALLMENT_SHOPS = POOL.filter((s) => (s.cat === "Shopping" && s.hi >= 450) || s.name === "הולמס פלייס");

const METHODS = ["אינטרנט", "טלפוני", "ארנק דיגיטלי", "כרטיס נוכח", "Apple Pay", "Google Pay"];

// ------------------------------------------------------------------ util --
const A = (n) => Math.round(n * 100);            // shekels -> agorot
const S = (a) => a / 100;                         // agorot -> shekels (exact to 2dp)
function addMonths(y, m, k) {
  const z = (y * 12 + (m - 1)) + k;
  return [Math.floor(z / 12), (z % 12) + 1];
}
function lastDay(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function ddmmyyyy(iso, sep) { const [y, m, d] = iso.split("-"); return d + sep + m + sep + y; }
// Hebrew text that a windows-1255 file can carry: no gershayim, no euro sign.
const cp1255Safe = (s) => s.replace(/[״“”]/g, "\"").replace(/[׳’]/g, "'");
function randomLast4(rng) { return String(rng.int(0, 9999)).padStart(4, "0"); }

// One shop, possibly with the legal suffix Israeli acquirers print.
function shopName(rng, s, safe) {
  let name = s.name;
  if (/[א-ת]/.test(name) && rng.chance(0.1)) name += " " + rng.pick(["בע\"מ", "בע״מ", "(1990) בע\"מ", "בע\"מ - סניף מרכז"]);
  return safe ? cp1255Safe(name) : name;
}

// --------------------------------------------------------------- make ----
function make(rng) {
  // ---- the statement's shape --------------------------------------------
  const isCsv = rng.chance(0.3);
  const encoding = isCsv ? (rng.chance(0.5) ? "windows-1255" : "utf-8") : "utf-8";
  const safe = encoding === "windows-1255";
  const keys = rng.chance(0.7) ? KEYS_FULL : rng.chance(0.65) ? KEYS_OLD : KEYS_TAGS;
  const col = {};
  keys.forEach((k, i) => { col[k] = i; });

  // Billing month: one of the last twenty months before September 2026.
  const [y, m] = addMonths(2026, 9, -rng.int(1, 20));
  const [cy, cm] = addMonths(y, m, 1);
  const chargeIso = isoDate(cy, cm, rng.pick([2, 10, 15]));

  const nCards = rng.pick([1, 1, 1, 2, 2, 3]);
  const cards = [];
  while (cards.length < nCards) { const c = randomLast4(rng); if (cards.indexOf(c) === -1) cards.push(c); }

  const pForeign = rng.pick([0, 0.05, 0.1, 0.2]);
  const pInst = rng.pick([0, 0.08, 0.15]);
  const pStanding = rng.pick([0, 0.06, 0.12]);
  const ilsLabel = rng.chance(0.8) ? "₪" : "ש\"ח";
  const usdLabel = rng.chance(0.6) ? "USD" : "$";
  const eurLabel = safe || rng.chance(0.6) ? "EUR" : "€";
  const methodsOn = rng.chance(0.5);

  // ---- the lines --------------------------------------------------------
  // chargeA / origA are signed agorot; negative on a refund.
  const lines = [];
  const counts = { inst: 0, foreign: 0, standing: 0, refund: 0, suffix: 0 };
  const nBuy = rng.int(3, 58);
  for (let i = 0; i < nBuy; i++) {
    const r = rng();
    const card = rng.pick(cards);
    if (r < pForeign && FOREIGN_SHOPS.length) {
      const s = rng.pick(FOREIGN_SHOPS);
      const eur = rng.chance(0.15);
      const rate = eur ? 3.85 + rng() * 0.45 : 3.4 + rng() * 0.55;
      const rate4 = Math.round(rate * 10000) / 10000;
      const target = s.lo + rng() * (s.hi - s.lo);
      const origA = Math.max(100, A(target / rate4));
      const chargeA = Math.round(origA * rate4);
      lines.push({ iso: randomDay(rng, y, m), shop: s.name, s, card, type: "רגילה", chargeA, origA,
        origCur: eur ? eurLabel : usdLabel, rate: rate4, note: null, method: "אינטרנט", section: "foreign", refund: false });
      counts.foreign++;
    } else if (r < pForeign + pInst && INSTALLMENT_SHOPS.length) {
      const s = rng.pick(INSTALLMENT_SHOPS);
      const fullA = A(Math.max(300, s.lo) + rng() * (s.hi * 1.2 - Math.max(300, s.lo)));
      // The dearer the purchase, the longer the plan Max offers on it.
      const N = fullA < 100000 ? rng.pick([2, 3, 3, 4, 5, 6]) : fullA < 300000 ? rng.pick([3, 4, 6, 6, 8, 10, 12]) : rng.pick([6, 10, 12, 12, 18, 24, 36]);
      const k = rng.int(1, N);
      const base = Math.floor(fullA / N);
      const first = fullA - base * (N - 1);            // the first payment carries the remainder
      const [py, pm] = addMonths(y, m, -(k - 1));
      const name = shopName(rng, s, safe);
      if (name !== s.name) counts.suffix++;
      lines.push({ iso: randomDay(rng, py, pm), shop: name, s, card, type: "תשלומים", chargeA: k === 1 ? first : base, origA: fullA,
        origCur: ilsLabel, rate: null, note: "תשלום " + k + " מתוך " + N, method: methodsOn ? rng.pick(METHODS) : null, section: "main", refund: false });
      counts.inst++;
    } else if (r < pForeign + pInst + pStanding && STANDING_SHOPS.length) {
      const s = rng.pick(STANDING_SHOPS);
      const a = A(s.lo + rng() * (s.hi - s.lo));
      const name = shopName(rng, s, safe);
      if (name !== s.name) counts.suffix++;
      // A standing order is charged on a fixed day, often before the 10th.
      lines.push({ iso: isoDate(y, m, rng.int(1, Math.min(lastDay(y, m), 12))), shop: name, s, card, type: "הוראת קבע", chargeA: a, origA: a,
        origCur: ilsLabel, rate: null, note: null, method: null, section: "main", refund: false });
      counts.standing++;
    } else {
      const s = rng.pick(POOL);
      const a = A(s.lo + rng() * (s.hi - s.lo));
      const name = shopName(rng, s, safe);
      if (name !== s.name) counts.suffix++;
      lines.push({ iso: randomDay(rng, y, m), shop: name, s, card, type: "רגילה", chargeA: a, origA: a,
        origCur: ilsLabel, rate: null, note: null, method: methodsOn ? rng.pick(METHODS) : null, section: "main", refund: false });
    }
  }
  // Refunds: a negative line against a regular purchase in the same month,
  // never more than that purchase and never against every purchase there is
  // (a statement that nets to nothing prints no total).
  const regular = lines.filter((l) => l.type === "רגילה" && l.section === "main");
  if (regular.length >= 2 && rng.chance(0.4)) {
    const k = Math.min(rng.int(1, 2), regular.length - 1);
    rng.shuffle(regular).slice(0, k).forEach((src) => {
      const back = Math.min(src.chargeA, A(10 + rng() * S(src.chargeA)));
      lines.push({ iso: randomDay(rng, y, m), shop: src.shop, s: src.s, card: src.card, type: "זיכוי", chargeA: -back, origA: -back,
        origCur: ilsLabel, rate: null, note: rng.chance(0.3) ? "זיכוי" : null, method: null, section: "main", refund: true });
      counts.refund++;
    });
  }

  // ---- where the foreign lines go ---------------------------------------
  const nMain = lines.filter((l) => l.section === "main").length;
  let foreignAt = "inline";
  if (counts.foreign && nMain) {
    const r = rng();
    foreignAt = isCsv ? (r < 0.7 ? "inline" : "block") : (r < 0.5 ? "inline" : r < 0.8 ? "sheet" : "block");
  }
  if (foreignAt === "inline") lines.forEach((l) => { l.section = "main"; });

  const desc = rng.chance(0.4);
  const order = (a, b) => (desc ? b.iso.localeCompare(a.iso) : a.iso.localeCompare(b.iso));
  const mainLines = lines.filter((l) => l.section === "main").sort(order);
  const foreignLines = lines.filter((l) => l.section === "foreign").sort(order);

  // ---- report lines above the table -------------------------------------
  const lastIso = isoDate(y, m, lastDay(y, m));
  const period = rng.pick([
    String(m).padStart(2, "0") + "/" + y,
    ddmmyyyy(isoDate(y, m, 1), "/") + " - " + ddmmyyyy(lastIso, "/"),
    "עסקאות לחיוב ב-" + ddmmyyyy(chargeIso, "/"),
    "חודש חיוב: " + String(cm).padStart(2, "0") + "/" + cy
  ]);
  const titleCands = [
    rng.pick(["פירוט עסקאות", MAIN_SHEET, "max - פירוט עסקאות"]),
    "כל המשתמשים (" + rng.int(1, 2) + ")",
    nCards === 1 ? rng.pick(["כל הכרטיסים", "כרטיס מסתיים ב-" + cards[0]]) : "כל הכרטיסים",
    period,
    "הופק בתאריך " + ddmmyyyy(isoDate(cy, cm, rng.int(1, 28)), "/")
  ];
  const nTitles = rng.int(0, 4);
  const titleIdx = rng.shuffle([0, 1, 2, 3, 4]).slice(0, nTitles).sort((a, b) => a - b);
  const titles = titleIdx.map((i) => titleCands[i]).map((t) => (safe ? cp1255Safe(t) : t));
  const gapAfterTitles = nTitles > 0 && rng.chance(0.3);

  // ---- totals -----------------------------------------------------------
  const printTotals = rng.chance(0.9);
  const totalLabel = rng.chance(0.8) ? "סך הכל" : "סה\"כ";
  const grand = foreignAt === "block" && rng.chance(0.5);
  const footnote = rng.chance(0.15) ? rng.pick([
    "* עסקאות בחו\"ל מוצגות לפי שער ההמרה ביום החיוב",
    "* ייתכנו הבדלים בין הפירוט לבין דף החיוב החודשי",
    "לשאלות ניתן לפנות למוקד max"
  ]) : null;
  const sum = (ls) => ls.reduce((n, l) => n + l.chargeA, 0);

  // ---- render -----------------------------------------------------------
  const statementTotals = [];
  const traps = ["charge + original-amount columns", "charge-date column", "card-number column", "currency column"];
  if (titles.length) traps.push("title lines (" + titles.length + ")");
  if (counts.inst) traps.push("installment");
  if (counts.foreign) traps.push("foreign currency", "conversion-rate column" + (keys.indexOf("rate") === -1 ? " (absent, old layout)" : ""));
  if (counts.standing) traps.push("standing order");
  if (counts.refund) traps.push("refund");
  if (counts.suffix) traps.push("quote in shop name");
  if (nCards > 1) traps.push("multiple cards");
  if (desc) traps.push("newest first");
  if (foreignAt === "sheet") traps.push("second sheet (foreign)", "subtotal per sheet");
  if (foreignAt === "block") traps.push("section header repeated", "subtotal per section");
  if (printTotals) traps.push("total row");
  if (printTotals && grand) traps.push("grand total");
  if (footnote) traps.push("footnote line");

  let file, nameBits;
  if (!isCsv) {
    // ---------------------------------------------------------------- xlsx
    const dateMode = rng.pick(["cell", "cell", "custom", "text"]);   // Max's own export has written all three
    const inline = rng.chance(0.25);
    const cardNumeric = rng.chance(0.3);
    const formulaTotal = rng.chance(0.25);
    const totalCur = rng.chance(0.3);
    if (dateMode === "text") traps.push("text dates in xlsx");
    if (cardNumeric) traps.push("card digits as numbers");
    if (formulaTotal && printTotals) traps.push("formula total");
    const T = (s) => (s == null || s === "" ? null : inline ? { inline: s } : s);
    const D = (iso) => (dateMode === "text" ? T(ddmmyyyy(iso, "-")) : dateMode === "custom" ? { date: iso, custom: true } : { date: iso });
    const width = keys.length;
    const blankRow = () => [];
    const cells = (l) => {
      const row = new Array(width).fill(null);
      const put = (k, v) => { if (col[k] !== undefined) row[col[k]] = v; };
      put("date", D(l.iso));
      put("shop", T(l.shop));
      put("cat", T(l.s.issuer));
      put("card", cardNumeric ? { n: Number(l.card) } : T(l.card));   // a number loses its leading zero, as in Excel
      put("type", T(l.type));
      put("charge", { n: S(l.chargeA) });
      put("chargeCur", T(ilsLabel));
      put("orig", { n: S(l.origA) });
      put("origCur", T(l.origCur));
      put("chargeDate", D(chargeIso));
      put("notes", T(l.note));
      put("method", T(l.method));
      if (l.rate) put("rate", { n: l.rate });
      return row;
    };
    const colLetter = String.fromCharCode(65 + col.charge);
    const totalRow = (label, a, fromRow, toRow) => {
      const row = new Array(col.charge + 1).fill(null);
      row[0] = T(label);
      row[col.charge] = formulaTotal && fromRow ? { formula: "SUM(" + colLetter + fromRow + ":" + colLetter + toRow + ")", n: S(a) } : { n: S(a) };
      if (totalCur && col.chargeCur !== undefined) { row.length = col.chargeCur + 1; row[col.chargeCur] = T(ilsLabel); }
      return row;
    };
    // One table: its header, its lines, its total. Returns the rows.
    const table = (rows, ls, lead) => {
      (lead || []).forEach((t) => rows.push([T(t)]));
      rows.push(keys.map((k) => T(COLS[k])));
      const from = rows.length + 1;
      ls.forEach((l) => rows.push(cells(l)));
      const to = rows.length;
      const a = sum(ls);
      if (printTotals && a > 0) { rows.push(totalRow(totalLabel, a, from, to)); statementTotals.push(S(a)); }
    };
    const sheets = [];
    const rows1 = [];
    titles.forEach((t) => rows1.push([T(t)]));
    if (gapAfterTitles) rows1.push(blankRow());
    table(rows1, mainLines, []);
    if (foreignAt === "block") {
      if (rng.chance(0.6)) rows1.push(blankRow());
      table(rows1, foreignLines, [FOREIGN_SHEET]);
      if (printTotals && grand) {
        const g = sum(mainLines) + sum(foreignLines);
        rows1.push(totalRow(totalLabel + " לחיוב", g, null, null));
        statementTotals.push(S(g));
      }
    }
    if (footnote) { rows1.push(blankRow()); rows1.push([T(footnote)]); }
    sheets.push({ name: MAIN_SHEET, rows: rows1 });
    if (foreignAt === "sheet") {
      const rows2 = [];
      const lead2 = [FOREIGN_SHEET].concat(titles.filter((t) => t !== MAIN_SHEET && t !== "פירוט עסקאות"));
      lead2.forEach((t) => rows2.push([T(t)]));
      table(rows2, foreignLines, []);
      sheets.push({ name: FOREIGN_SHEET, rows: rows2 });
    }
    file = { kind: "xlsx", sheets };
    nameBits = ["max xlsx", sheets.length + " sheet" + (sheets.length > 1 ? "s" : ""), "dates " + dateMode];
  } else {
    // ----------------------------------------------------------------- csv
    // What Excel writes when the user saves the sheet as CSV: CRLF, the rows
    // padded out to the width of the table, numbers as the cell displayed them.
    const eol = rng.chance(0.75) ? "\r\n" : "\n";
    const bom = encoding === "utf-8" && rng.chance(0.7);
    const pad = rng.chance(0.5);
    const moneyStyle = rng.pick(["general", "fixed", "comma", "comma", "shekel"]);
    const shekelFirst = rng.chance(0.5);
    const dateSep = rng.chance(0.75) ? "-" : "/";
    const excelQuotes = rng.chance(0.5);        // Excel quotes a cell with a quote in it; many tools do not
    const width = keys.length;
    const money = (a, withSign) => {
      const n = S(a);
      if (moneyStyle === "general") return String(n);
      const neg = n < 0, abs = Math.abs(n).toFixed(2);
      const [ip, dp] = abs.split(".");
      const grouped = moneyStyle === "fixed" ? ip : ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      let s = grouped + "." + dp;
      if (moneyStyle === "shekel" && withSign) s = shekelFirst ? "₪ " + s : s + " ₪";
      return (neg ? "-" : "") + s;
    };
    const cellText = (c) => {
      const s = c == null ? "" : String(c);
      if (s.indexOf(",") !== -1 || /[\r\n]/.test(s) || /^"/.test(s) || (excelQuotes && s.indexOf("\"") !== -1)) return "\"" + s.replace(/"/g, "\"\"") + "\"";
      return s;
    };
    const out = [];
    const line = (cells) => {
      const row = cells.slice();
      if (pad) while (row.length < width) row.push("");
      out.push(row.map(cellText).join(","));
    };
    const cells = (l) => {
      const row = new Array(width).fill("");
      const put = (k, v) => { if (col[k] !== undefined) row[col[k]] = v == null ? "" : v; };
      put("date", ddmmyyyy(l.iso, dateSep));
      put("shop", l.shop);
      put("cat", l.s.issuer);
      put("card", l.card);
      put("type", l.type);
      put("charge", money(l.chargeA, true));
      put("chargeCur", ilsLabel);
      put("orig", money(l.origA, false));
      put("origCur", l.origCur);
      put("chargeDate", ddmmyyyy(chargeIso, dateSep));
      put("notes", l.note);
      put("method", l.method);
      if (l.rate) put("rate", String(l.rate));
      if (!pad) { while (row.length && row[row.length - 1] === "") row.pop(); }
      return row;
    };
    const totalLine = (label, a) => {
      const row = new Array(col.charge + 1).fill("");
      row[0] = label;
      row[col.charge] = money(a, true);
      line(row);
    };
    const table = (ls, lead) => {
      (lead || []).forEach((t) => line([t]));
      line(keys.map((k) => COLS[k]));
      ls.forEach((l) => line(cells(l)));
      const a = sum(ls);
      if (printTotals && a > 0) { totalLine(totalLabel, a); statementTotals.push(S(a)); }
    };
    titles.forEach((t) => line([t]));
    if (gapAfterTitles) out.push(pad ? new Array(width).fill("").join(",") : "");
    table(mainLines);
    if (foreignAt === "block") {
      if (rng.chance(0.6)) out.push(pad ? new Array(width).fill("").join(",") : "");
      table(foreignLines, [safe ? cp1255Safe(FOREIGN_SHEET) : FOREIGN_SHEET]);
      if (printTotals && grand) {
        const g = sum(mainLines) + sum(foreignLines);
        totalLine(totalLabel + " לחיוב", g);
        statementTotals.push(S(g));
      }
    }
    if (footnote) { out.push(""); line([footnote]); }
    let text = out.join(eol);
    if (rng.chance(0.5)) text += eol;
    file = { kind: "csv", text, encoding, bom };
    if (pad) traps.push("padded empty cells");
    if (moneyStyle === "comma") traps.push("thousands separator (quoted)");
    if (moneyStyle === "shekel") traps.push("shekel sign in amount");
    if (excelQuotes && counts.suffix) traps.push("quoted cell with doubled quote");
    nameBits = ["max csv " + (encoding === "windows-1255" ? "cp1255" : "utf-8" + (bom ? "+bom" : "")), eol === "\r\n" ? "crlf" : "lf", "money " + moneyStyle];
  }

  // ---- truth, in file order ---------------------------------------------
  const ordered = foreignAt === "inline" ? mainLines : mainLines.concat(foreignLines);
  const truth = ordered.map((l) => ({
    date: l.iso,
    amount: S(Math.abs(l.chargeA)),
    type: l.chargeA < 0 ? "income" : "expense",
    shop: l.shop,
    cat: l.s.cat,
    transfer: false,
    refund: l.refund,
    issuer: l.s.issuer
  }));

  nameBits.push(truth.length + " lines");
  if (counts.inst) nameBits.push(counts.inst + " installments");
  if (counts.foreign) nameBits.push(counts.foreign + " foreign" + (foreignAt !== "inline" ? " (" + foreignAt + ")" : ""));
  if (counts.refund) nameBits.push(counts.refund + " refund" + (counts.refund > 1 ? "s" : ""));
  if (!printTotals) nameBits.push("no total");
  return { name: nameBits.join(", "), kind: "card", file, truth, statementTotals, traps };
}

export default {
  id: "max",
  describe: "Max (ex Leumi Card) transaction export: xlsx or re-saved CSV, report lines, 16 fixed columns, installments, foreign, refunds, סך הכל rows",
  make
};
