// Bank Leumi - current account (עו"ש) "תנועות בחשבון" export.
//
// What the "export to Excel" on the Leumi site hands out, in the forms it
// reaches Richy: the .xlsx itself, the CSV a person gets by opening it in
// Excel and saving it (windows-1255 from "CSV (Comma delimited)" on a Hebrew
// Windows, UTF-8 - often with a BOM - from "CSV UTF-8"), and now and then the
// older .xls that is really an HTML table.
//
// Shape of the real file:
//   a few report lines        תנועות בחשבון / חשבון: 802-123456/78 / לתקופה: 01/08/2026 - 31/08/2026 / תאריך הפקה ...
//   the table                 תאריך | תאריך ערך | תיאור | אסמכתא | בחובה | בזכות | היתרה בש"ח | (תיאור מורחב)
//                             - תאריך ערך is not always there; חובה/זכות without the ב on some exports;
//                               the balance titled יתרה, יתרה בש"ח, היתרה בש"ח or היתרה בש''ח
//   (opening balance)         יתרת פתיחה - only a figure under the balance column, not a transaction
//   rows                      one money figure per row, in EITHER the debit or the credit column
//                             (the other one empty, or 0 on some exports), and the running balance
//                             after the row - which is the trap: it is money, it sits right next to
//                             the amount, and it is the biggest number on the line
//   (closing balance)         יתרת סגירה
//   (totals)                  סה"כ with the debit total under חובה and the credit total under זכות
//
// Newest-first or oldest-first; the running balance is consistent row to row
// either way (each row's figure is the balance after that row), and may go
// below zero (overdraft) - written with a leading or, the Israeli-bank way, a
// trailing minus.
//
// Lines on the account: shop purchases by debit card or standing order
// (SHOPS, category from the pool), the monthly card bills (ישראכרט, מקס, כאל -
// transfers, the spending itself is on the card statement), deposits /
// savings / pension moves (transfers), ATM cash (Other), Bit / PayBox to and
// from people (no category can be known), salary and other money in (BANK_IN).
//
// Column titles and report lines are written from knowledge of the export:
// the web search available here turned up no public sample of the file, so the
// titles and report wording are varied among the forms Leumi has used rather
// than fixed to one.
import { SHOPS, BANK_OUT, BANK_IN, isoDate } from "./_lib.mjs";

// ------------------------------------------------------------------ util --
const A = (n) => Math.round(n * 100);           // shekels -> agorot
const S = (a) => a / 100;                        // agorot -> shekels (exact to 2dp)
const between = (rng, lo, hi) => A(lo + rng() * (hi - lo));
function weighted(rng, pairs) {
  let x = rng() * pairs.reduce((s, p) => s + p[1], 0);
  for (const [v, w] of pairs) { if ((x -= w) < 0) return v; }
  return pairs[pairs.length - 1][0];
}
function dayNum(iso) { const [y, m, d] = iso.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); }
function fromDayNum(n) { const t = new Date(n * 86400000); return isoDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
const addDays = (iso, k) => fromDayNum(dayNum(iso) + k);
function addMonths(y, m, k) { const z = y * 12 + (m - 1) + k; return [Math.floor(z / 12), (z % 12) + 1]; }
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
function fmtD(iso, style) {
  const [y, m, d] = iso.split("-");
  if (style === "dmy2") return d + "/" + m + "/" + y.slice(2);
  if (style === "dmydot") return d + "." + m + "." + y;
  return d + "/" + m + "/" + y;
}
// Hebrew text a windows-1255 file can carry: no gershayim / geresh, no curly quotes.
const cp1255Safe = (s) => s.replace(/[״“”]/g, "\"").replace(/[׳’]/g, "'");

// ----------------------------------------------------------------- pools --
// Travel is not one of Richy's default categories: its shops stay out.
const POOL = SHOPS.filter((s) => s.cat !== "Travel");
const byName = (names) => POOL.filter((s) => names.indexOf(s.name) !== -1);
// What a bank account pays by standing order (הוראת קבע) straight from the account.
const STANDING = byName(["חברת החשמל לישראל", "בזק", "הוט מובייל", "פרטנר תקשורת", "סלקום", "עיריית תל אביב ארנונה",
  "מי אביבים", "הולמס פלייס", "מכבי שירותי בריאות", "יס פלאנט"]);
const bo = (name) => BANK_OUT.find((b) => b.name === name);
const bi = (name) => BANK_IN.find((b) => b.name === name);
const CARD_BILLS = [
  { b: bo("ישראכרט"), days: [2, 10] },
  { b: bo("מקס איט פיננסים"), days: [10, 15] },
  { b: bo("כאל חיוב חודשי"), days: [2, 10] }
];
const SAVINGS = [bo("הפקדה לפיקדון"), bo("העברה לחיסכון"), bo("קרן השתלמות")];
const ATM = bo("משיכת מזומן כספומט");
const P2P = [bo("העברה בביט"), bo("PAYBOX")];

// Column titles. Leumi's order is fixed; the words vary by export generation.
const TITLES = {
  date: () => "תאריך",
  value: () => "תאריך ערך",
  desc: (rng) => (rng.chance(0.85) ? "תיאור" : "תיאור התנועה"),
  ref: (rng) => (rng.chance(0.8) ? "אסמכתא" : "מס' אסמכתא"),
  ext: (rng) => rng.pick(["תיאור מורחב", "הערה", "פרטים נוספים"])
};

// --------------------------------------------------------------- make ----
function make(rng) {
  // ---- the file's shape ---------------------------------------------------
  const format = weighted(rng, [["csv", 55], ["xlsx", 35], ["html", 10]]);
  const encoding = format === "csv" && rng.chance(0.55) ? "windows-1255" : "utf-8";
  const safe = encoding === "windows-1255";
  const txt = (s) => (safe ? cp1255Safe(s) : s);

  const hasValue = rng.chance(0.6);
  const hasRef = rng.chance(0.85);
  const hasExt = rng.chance(0.3);
  const splitB = rng.chance(0.6);                 // בחובה/בזכות rather than חובה/זכות
  const balTitle = rng.pick(["היתרה בש\"ח", "היתרה בש\"ח", "יתרה", "יתרה בש\"ח", "היתרה בש''ח"]);
  const keys = ["date"].concat(hasValue ? ["value"] : [], ["desc"], hasRef ? ["ref"] : [], ["debit", "credit", "bal"], hasExt ? ["ext"] : []);
  const col = {};
  keys.forEach((k, i) => { col[k] = i; });
  const width = keys.length;
  const head = keys.map((k) => (k === "debit" ? (splitB ? "בחובה" : "חובה") : k === "credit" ? (splitB ? "בזכות" : "זכות")
    : k === "bal" ? balTitle : TITLES[k](rng)));

  // ---- the period ---------------------------------------------------------
  // Whole months, or "the last 30/60/90 days" from a random day; never later
  // than August 2026.
  const [ey, em] = addMonths(2026, 9, -rng.int(1, 20));
  const span = weighted(rng, [[1, 65], [2, 25], [3, 10]]);
  let startIso, endIso;
  if (rng.chance(0.7)) {
    const [sy, sm] = addMonths(ey, em, -(span - 1));
    startIso = isoDate(sy, sm, 1);
    endIso = isoDate(ey, em, lastDay(ey, em));
  } else {
    endIso = isoDate(ey, em, rng.int(1, lastDay(ey, em)));
    startIso = addDays(endIso, -(span * 30 - 1));
  }
  const d0 = dayNum(startIso), d1 = dayNum(endIso);
  const inPeriod = (iso) => { const n = dayNum(iso); return n >= d0 && n <= d1; };
  const anyDay = () => fromDayNum(rng.int(d0, d1));
  // The calendar months the period touches.
  const months = [];
  for (let [y, m] = [Number(startIso.slice(0, 4)), Number(startIso.slice(5, 7))]; isoDate(y, m, 1) <= endIso; [y, m] = addMonths(y, m, 1)) months.push([y, m]);
  const onDay = (y, m, d) => isoDate(y, m, Math.min(d, lastDay(y, m)));

  // ---- this account holder ------------------------------------------------
  const cards = rng.shuffle(CARD_BILLS).slice(0, rng.pick([0, 1, 1, 1, 2, 2, 3]))
    .map((c) => ({ b: c.b, day: rng.pick(c.days), base: between(rng, c.b.lo, c.b.hi) }));
  const salary = rng.chance(0.85) ? { b: rng.pick([bi("משכורת"), bi("העברת משכורת חברת היי טק בע\"מ")]), day: rng.pick([1, 1, 2, 3, 5, 9, 10, 28, 30]),
    base: between(rng, 7000, 26000) } : null;
  const savings = rng.chance(0.45) ? { b: rng.pick(SAVINGS), day: rng.pick([1, 5, 10, 15, 20]), base: between(rng, 200, 2500) } : null;
  const allowance = rng.chance(0.25) ? { b: bi("ביטוח לאומי קצבת ילדים"), day: 20, base: between(rng, 150, 400) } : null;
  const interest = rng.chance(0.2) ? bi("ריבית על פיקדון") : null;

  // ---- the lines ----------------------------------------------------------
  // kind: shop | standing | card | saving | unsave | atm | p2p-out | p2p-in | salary | income
  const lines = [];
  const add = (l) => lines.push(l);
  months.forEach(([y, m]) => {
    if (salary) { const iso = onDay(y, m, salary.day); if (inPeriod(iso)) add({ iso, kind: "salary", src: salary.b, a: Math.max(A(1000), salary.base + A(rng.int(-300, 300))), dir: "in" }); }
    cards.forEach((c) => { const iso = onDay(y, m, c.day); if (inPeriod(iso)) add({ iso, kind: "card", src: c.b, a: Math.max(A(300), Math.round(c.base * (0.6 + rng() * 0.8))), dir: "out" }); });
    if (savings) { const iso = onDay(y, m, savings.day); if (inPeriod(iso)) add({ iso, kind: "saving", src: savings.b, a: savings.base, dir: "out" }); }
    if (allowance) { const iso = onDay(y, m, allowance.day); if (inPeriod(iso)) add({ iso, kind: "income", src: allowance.b, a: allowance.base, dir: "in" }); }
    if (interest && rng.chance(0.7)) { const iso = onDay(y, m, lastDay(y, m)); if (inPeriod(iso)) add({ iso, kind: "income", src: interest, a: between(rng, interest.lo, interest.hi), dir: "in" }); }
  });
  const nTotal = rng.int(3, 60);
  // A short statement keeps only some of the monthly lines.
  if (lines.length > nTotal) { const keep = rng.shuffle(lines).slice(0, Math.max(1, nTotal - rng.int(0, 2))); lines.length = 0; keep.forEach(add); }
  while (lines.length < nTotal) {
    const k = weighted(rng, [["shop", 60], ["standing", 10], ["atm", 7], ["p2p-out", 12], ["p2p-in", 5], ["saving", 3], ["unsave", 2], ["income", 1]]);
    if (k === "shop") {
      const s = rng.pick(POOL);
      add({ iso: anyDay(), kind: "shop", src: s, a: between(rng, s.lo, s.hi), dir: "out" });
    } else if (k === "standing") {
      const s = rng.pick(STANDING);
      add({ iso: anyDay(), kind: "standing", src: s, a: between(rng, s.lo, s.hi), dir: "out" });
    } else if (k === "atm") {
      add({ iso: anyDay(), kind: "atm", src: ATM, a: A(rng.pick([100, 200, 200, 300, 400, 500, 500, 700, 1000])), dir: "out" });
    } else if (k === "p2p-out") {
      const p = rng.pick(P2P);
      add({ iso: anyDay(), kind: "p2p", src: p, a: rng.chance(0.5) ? A(rng.int(2, 40) * 10) : between(rng, p.lo, p.hi), dir: "out" });
    } else if (k === "p2p-in") {
      const p = rng.pick(P2P);
      add({ iso: anyDay(), kind: "p2p", src: p, a: rng.chance(0.5) ? A(rng.int(2, 30) * 10) : between(rng, 20, 350), dir: "in" });
    } else if (k === "saving") {
      const b = rng.pick(SAVINGS);
      add({ iso: anyDay(), kind: "saving", src: b, a: between(rng, b.lo, b.hi), dir: "out" });
    } else if (k === "unsave") {
      add({ iso: anyDay(), kind: "unsave", src: { name: "פדיון פיקדון" }, a: between(rng, 500, 8000), dir: "in" });
    } else {
      const b = rng.pick([bi("ביטוח לאומי קצבת ילדים"), bi("ריבית על פיקדון")]);
      add({ iso: anyDay(), kind: "income", src: b, a: between(rng, b.lo, b.hi), dir: "in" });
    }
  }

  // ---- the description text, as the bank writes it --------------------------
  const counts = { quote: 0, standing: 0, p2pIn: 0 };
  lines.forEach((l) => {
    let name = l.src.name;
    if ((l.kind === "shop" || l.kind === "standing") && /[א-ת]/.test(name) && rng.chance(0.08)) {
      name += " " + rng.pick(["בע\"מ", "בע״מ", "(1990) בע\"מ"]);
    }
    if (l.kind === "atm" && rng.chance(0.3)) name = "משיכה מכספומט";
    l.desc = txt(name);
    if (/["״]/.test(l.desc)) counts.quote++;
    if (l.kind === "standing") counts.standing++;
    if (l.kind === "p2p" && l.dir === "in") counts.p2pIn++;
    // אסמכתא: a voucher number, leading zeros and all on some lines.
    l.ref = rng.chance(0.15) ? String(rng.int(1, 999999)).padStart(rng.pick([7, 9]), "0") : String(rng.int(10000, 99999999));
    l.value = rng.chance(0.8) ? l.iso : addDays(l.iso, rng.int(1, 3));
    const last4 = String(rng.int(0, 9999)).padStart(4, "0");
    l.ext = !hasExt || rng.chance(0.35) ? "" : txt(({
      shop: rng.pick(["כרטיס דביט " + last4, "רכישה בכרטיס " + last4]),
      standing: "הוראת קבע",
      card: "חיוב כרטיס אשראי",
      saving: rng.pick(["העברה לחשבון חיסכון", "הפקדה", "העברה בין חשבונות"]),
      unsave: "פיקדון שהגיע למועדו",
      atm: "סניף " + rng.int(600, 990),
      p2p: l.dir === "out" ? "העברה לאיש קשר" : "העברה מאיש קשר",
      salary: "העברה מחשבון " + rng.int(10, 20) + "-" + rng.int(100, 999) + "-" + rng.int(100000, 999999),
      income: "זיכוי"
    })[l.kind] || "");
  });

  // ---- the running balance ------------------------------------------------
  // Oldest first, same-day lines in a random order that the file keeps.
  const tagged = lines.map((l) => ({ l, r: rng() }));
  tagged.sort((a, b) => a.l.iso.localeCompare(b.l.iso) || a.r - b.r);
  const chrono = tagged.map((t) => t.l);
  const openA = rng.chance(0.15) ? -between(rng, 200, 9000) : between(rng, 500, 45000);
  let run = openA;
  chrono.forEach((l) => { run += l.dir === "in" ? l.a : -l.a; l.bal = run; });
  const closeA = run;
  const newestFirst = rng.chance(0.5);
  const shown = newestFirst ? chrono.slice().reverse() : chrono;

  const opening = rng.chance(0.35);
  const closing = rng.chance(0.3);
  const balLabelAt = rng.chance(0.7) ? "desc" : "date";
  const openLabel = rng.chance(0.8) ? "יתרת פתיחה" : "יתרה לתחילת התקופה";
  const closeLabel = rng.chance(0.8) ? "יתרת סגירה" : "יתרה לסוף התקופה";
  const balDated = rng.chance(0.5);
  const printTotals = rng.chance(0.25);
  const totalLabel = rng.pick(["סה\"כ", "סה\"כ תנועות", "סך הכל"]);
  const totalAt = rng.chance(0.5) ? "desc" : "date";
  const sumOut = chrono.reduce((n, l) => n + (l.dir === "out" ? l.a : 0), 0);
  const sumIn = chrono.reduce((n, l) => n + (l.dir === "in" ? l.a : 0), 0);
  const zeroOther = rng.chance(0.15);            // the empty side written as 0
  const gapAfterTitles = rng.chance(0.3);
  const gapBeforeFoot = rng.chance(0.3);

  // ---- report lines above the table ---------------------------------------
  const branch = rng.int(600, 990);
  const acctNo = String(rng.int(10000, 999999));
  const acct = branch + "-" + acctNo + "/" + String(rng.int(0, 99)).padStart(2, "0");
  const dS = fmtD(startIso, "dmy"), dE = fmtD(endIso, "dmy");
  const madeIso = addDays(endIso, rng.int(1, 20));
  const titleCands = [
    rng.pick(["תנועות בחשבון", "תנועות בחשבון עו\"ש", "פירוט תנועות בחשבון", "בנק לאומי - תנועות בחשבון"]),
    rng.pick(["חשבון: " + acct, "מספר חשבון: " + acct, "חשבון עו\"ש " + acct, "סניף " + branch + " חשבון " + acctNo]),
    rng.pick(["לתקופה: " + dS + " - " + dE, "מתאריך " + dS + " עד " + dE, "תנועות מ-" + dS + " עד " + dE]),
    rng.pick(["תאריך הפקה: " + fmtD(madeIso, "dmy"), "הופק בתאריך " + fmtD(madeIso, "dmy"),
      "הופק בתאריך " + fmtD(madeIso, "dmy") + " בשעה " + String(rng.int(7, 22)).padStart(2, "0") + ":" + String(rng.int(0, 59)).padStart(2, "0")])
  ];
  const nTitles = rng.int(0, 4);
  const titles = rng.shuffle([0, 1, 2, 3]).slice(0, nTitles).sort((a, b) => a - b).map((i) => txt(titleCands[i]));

  // ---- the table, as abstract cells ------------------------------------------
  // A cell: { t: "text"|"date"|"money"|"ref", v }. Rendered per format below.
  const T = (v) => (v === "" || v == null ? null : { t: "text", v });
  const D = (v) => ({ t: "date", v });
  const M = (v) => ({ t: "money", v });
  const R = (v) => ({ t: "ref", v });
  const rows = [];       // { kind: "title"|"blank"|"head"|"line"|"balance"|"total", cells }
  titles.forEach((t) => rows.push({ kind: "title", cells: [T(t)] }));
  if (titles.length && gapAfterTitles) rows.push({ kind: "blank", cells: [] });
  rows.push({ kind: "head", cells: head.map((h) => T(txt(h))) });
  const balRow = (label, iso, a) => {
    const c = new Array(width).fill(null);
    c[col[balLabelAt]] = T(label);
    if (balDated && balLabelAt === "desc") c[col.date] = D(iso);
    c[col.bal] = M(a);
    rows.push({ kind: "balance", cells: c });
  };
  const top = newestFirst ? [closing, closeLabel, endIso, closeA] : [opening, openLabel, startIso, openA];
  const bottom = newestFirst ? [opening, openLabel, startIso, openA] : [closing, closeLabel, endIso, closeA];
  if (top[0]) balRow(top[1], top[2], top[3]);
  shown.forEach((l) => {
    const c = new Array(width).fill(null);
    c[col.date] = D(l.iso);
    if (hasValue) c[col.value] = D(l.value);
    c[col.desc] = T(l.desc);
    if (hasRef) c[col.ref] = R(l.ref);
    c[col.debit] = l.dir === "out" ? M(l.a) : zeroOther ? M(0) : null;
    c[col.credit] = l.dir === "in" ? M(l.a) : zeroOther ? M(0) : null;
    c[col.bal] = M(l.bal);
    if (hasExt) c[col.ext] = T(l.ext);
    rows.push({ kind: "line", cells: c, l });
  });
  if ((bottom[0] || printTotals) && gapBeforeFoot) rows.push({ kind: "blank", cells: [] });
  if (bottom[0]) balRow(bottom[1], bottom[2], bottom[3]);
  const statementTotals = [];
  if (printTotals) {
    const c = new Array(width).fill(null);
    c[col[totalAt]] = T(txt(totalLabel));
    c[col.debit] = M(sumOut);
    c[col.credit] = M(sumIn);
    rows.push({ kind: "total", cells: c });
    if (sumOut > 0) statementTotals.push(S(sumOut));
    if (sumIn > 0) statementTotals.push(S(sumIn));
  }

  // ---- render ---------------------------------------------------------------
  const traps = ["split debit/credit columns", "running balance column"];
  if (hasValue) traps.push("value-date column");
  if (hasRef) traps.push("reference column");
  if (hasExt) traps.push("extended-description column");
  if (titles.length) traps.push("title lines (" + titles.length + ")");
  if (newestFirst) traps.push("newest first");
  if (opening) traps.push("opening balance line");
  if (closing) traps.push("closing balance line");
  if (printTotals) traps.push("total row");
  if (zeroOther) traps.push("zero in the unused debit/credit column");
  const negShown = rows.some((r) => r.cells.some((c) => c && c.t === "money" && c.v < 0));
  if (negShown) traps.push("negative (overdraft) balance");
  if (counts.quote) traps.push("quote in shop name");
  if (counts.standing) traps.push("standing order");
  if (counts.p2pIn) traps.push("p2p money in");
  if (lines.some((l) => l.kind === "card")) traps.push("card bill (transfer)");
  if (lines.some((l) => l.kind === "saving" || l.kind === "unsave")) traps.push("savings move (transfer)");
  if (lines.some((l) => l.kind === "atm")) traps.push("cash withdrawal");
  if (lines.some((l) => l.value !== l.iso) && hasValue) traps.push("value date differs from date");

  let file, nameBits;
  if (format === "xlsx") {
    const dateMode = rng.pick(["cell", "cell", "custom", "text"]);
    const textDateStyle = rng.chance(0.6) ? "dmy2" : "dmy";
    const inline = rng.chance(0.25);
    const numericRef = rng.chance(0.6);
    const formulaTotal = rng.chance(0.4);
    const X = (c, r) => {
      if (!c) return null;
      if (c.t === "text") return inline ? { inline: c.v } : c.v;
      if (c.t === "date") return dateMode === "text" ? (inline ? { inline: fmtD(c.v, textDateStyle) } : fmtD(c.v, textDateStyle))
        : dateMode === "custom" ? { date: c.v, custom: true } : { date: c.v };
      if (c.t === "ref") return numericRef ? { n: Number(c.v) } : (inline ? { inline: c.v } : c.v);
      return { n: S(c.v) };
    };
    const firstLine = rows.findIndex((r) => r.kind === "line") + 1;
    const lastLine = rows.length - rows.slice().reverse().findIndex((r) => r.kind === "line");
    const letter = (i) => String.fromCharCode(65 + i);
    const out = rows.map((r) => {
      const cells = r.cells.map((c) => X(c));
      if (r.kind === "total" && formulaTotal) {
        cells[col.debit] = { formula: "SUM(" + letter(col.debit) + firstLine + ":" + letter(col.debit) + lastLine + ")", n: S(sumOut) };
        cells[col.credit] = { formula: "SUM(" + letter(col.credit) + firstLine + ":" + letter(col.credit) + lastLine + ")", n: S(sumIn) };
      }
      while (cells.length && cells[cells.length - 1] == null) cells.pop();
      return cells;
    });
    if (dateMode === "text") traps.push("text dates in xlsx");
    if (numericRef && hasRef) traps.push("reference as a number");
    if (formulaTotal && printTotals) traps.push("formula total");
    file = { kind: "xlsx", sheets: [{ name: rng.pick(["תנועות בחשבון", "תנועות עו\"ש", "Sheet1", "גיליון1"]), rows: out }] };
    nameBits = ["leumi xlsx", "dates " + dateMode];
  } else {
    // Text forms: CSV and the HTML .xls share how a cell reads.
    const dateStyle = weighted(rng, [["dmy", 55], ["dmy2", 35], ["dmydot", 10]]);
    const moneyStyle = format === "html" ? rng.pick(["comma", "comma", "plain"]) : rng.pick(["plain", "comma", "comma", "general"]);
    const negStyle = moneyStyle !== "general" && rng.chance(0.35) ? "trail" : "lead";
    const shekel = moneyStyle !== "general" && rng.chance(0.1);
    const shekelFirst = rng.chance(0.5);
    const money = (a, isBal) => {
      const neg = a < 0;
      const abs = Math.abs(a);
      let s;
      if (moneyStyle === "general") s = String(S(abs));
      else {
        const [ip, dp] = S(abs).toFixed(2).split(".");
        s = (moneyStyle === "comma" ? ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ip) + "." + dp;
      }
      if (shekel && isBal) s = shekelFirst ? "₪ " + s : s + " ₪";
      if (!neg) return s;
      return negStyle === "trail" ? s + "-" : "-" + s;
    };
    const cellText = (c, k) => {
      if (!c) return "";
      if (c.t === "date") return fmtD(c.v, dateStyle);
      if (c.t === "money") return money(c.v, k === "bal");
      return c.v;
    };
    const rowTexts = (r) => r.cells.map((c, i) => cellText(c, keys[i]));
    if (dateStyle === "dmy2") traps.push("two-digit years");
    if (dateStyle === "dmydot") traps.push("dotted dates");
    if (moneyStyle === "comma") traps.push("thousands separator" + (format === "csv" ? " (quoted)" : ""));
    if (negStyle === "trail" && negShown) traps.push("trailing minus");
    if (shekel) traps.push("shekel sign in balance");

    if (format === "csv") {
      const eol = rng.chance(0.7) ? "\r\n" : "\n";
      const bom = encoding === "utf-8" && rng.chance(0.6);
      const pad = rng.chance(0.5);
      const excelQuotes = rng.chance(0.5);
      const q = (s) => (s.indexOf(",") !== -1 || /[\r\n]/.test(s) || /^"/.test(s) || (excelQuotes && s.indexOf("\"") !== -1)
        ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s);
      const out = rows.map((r) => {
        const cells = rowTexts(r);
        if (pad) while (cells.length < width) cells.push("");
        else while (cells.length && cells[cells.length - 1] === "") cells.pop();
        return cells.map(q).join(",");
      });
      let text = out.join(eol);
      if (rng.chance(0.5)) text += eol;
      file = { kind: "csv", text, encoding, bom };
      if (pad) traps.push("padded empty cells");
      if (excelQuotes && /"/.test(text)) traps.push("quoted cell with doubled quote");
      nameBits = ["leumi csv " + (safe ? "cp1255" : "utf-8" + (bom ? "+bom" : "")), eol === "\r\n" ? "crlf" : "lf", "money " + moneyStyle, "dates " + dateStyle];
    } else {
      const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const thHead = rng.chance(0.5);
      const out = [
        "<html dir=\"rtl\"><head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"><title>" + esc(titleCands[0]) + "</title></head><body>",
        "<table border=\"1\" cellspacing=\"0\" cellpadding=\"2\" dir=\"rtl\">"
      ];
      rows.forEach((r) => {
        if (r.kind === "blank") { out.push("<tr><td colspan=\"" + width + "\">&nbsp;</td></tr>"); return; }
        if (r.kind === "title") { out.push("<tr><td colspan=\"" + width + "\"><b>" + esc(r.cells[0].v) + "</b></td></tr>"); return; }
        const cells = rowTexts(r);
        while (cells.length < width) cells.push("");
        const tag = r.kind === "head" && thHead ? "th" : "td";
        out.push("<tr>" + cells.map((s) => "<" + tag + ">" + (s ? esc(s) : "&nbsp;") + "</" + tag + ">").join("") + "</tr>");
      });
      out.push("</table>", "</body></html>");
      file = { kind: "html", text: out.join("\n") };
      nameBits = ["leumi html .xls", "money " + moneyStyle, "dates " + dateStyle];
    }
  }

  // ---- truth, in file order -------------------------------------------------
  const truth = shown.map((l) => ({
    date: l.iso,
    amount: S(l.a),
    type: l.dir === "out" ? "expense" : "income",
    shop: l.desc,
    cat: l.kind === "shop" || l.kind === "standing" || l.kind === "salary" || l.kind === "income" ? l.src.cat
      : l.kind === "atm" ? "Other" : null,
    transfer: l.kind === "card" || l.kind === "saving" || l.kind === "unsave",
    refund: false,
    issuer: null
  }));

  nameBits.push(truth.length + " lines");
  nameBits.push(keys.length + " cols" + (hasValue ? " +value-date" : "") + (hasExt ? " +ext" : ""));
  if (newestFirst) nameBits.push("newest first");
  if (opening || closing) nameBits.push([opening ? "opening" : "", closing ? "closing" : ""].filter(Boolean).join("+") + " balance");
  if (printTotals) nameBits.push("totals row");
  return { name: nameBits.join(", "), kind: "bank", file, truth, statementTotals, traps };
}

export default {
  id: "leumi",
  describe: "Bank Leumi current-account (עו\"ש) movements: report lines, תאריך/תאריך ערך/תיאור/אסמכתא/חובה/זכות/יתרה, running balance (overdraft too), opening/closing balance lines, totals - as CSV (cp1255/utf-8), .xlsx and the HTML .xls",
  make
};
