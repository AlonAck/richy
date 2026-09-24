// Israel Discount Bank and Mizrahi Tefahot - current-account (עו"ש)
// movements, as the "export to Excel" of each bank's site hands them out and
// as they reach Richy: the .xlsx itself, the CSV a person gets by saving it
// from Excel (windows-1255 from "CSV (Comma delimited)" on a Hebrew Windows,
// UTF-8 - often with a BOM - from "CSV UTF-8", semicolon- or tab-separated
// with 1.234,50 decimals from a Windows set to a European locale), and the
// older .xls that is really an HTML table.
//
// Discount (דיסקונט), "עובר ושב - תנועות אחרונות":
//   report lines        the report name, the account (סניף-חשבון), the period, when it was
//                       made, and on some exports the account's balance ("יתרה בחשבון:")
//                       with its figure - a money figure ABOVE the column titles
//   titles              תאריך | יום ערך | תיאור התנועה | ₪ זכות/חובה | ₪ יתרה | אסמכתא | עמלה | ערוץ ביצוע
//                       - ONE signed amount column: money out negative, money in positive,
//                         the minus written in front or, the Israeli-bank way, at the end
//                         ("1,234.50-"). Its title names BOTH directions (זכות/חובה)
//                       - the running balance right next to it
//                       - יום ערך: a second date, the value date, a day or three later on
//                         some lines - the line's date is תאריך
//                       - אסמכתא: a reference number on every line
//                       - עמלה: a fee column, empty or 0 on almost every line; where a
//                         teller operation carries a fee, the fee is ALSO charged as its
//                         own line (so adding the fee column double-counts it)
//                       - ערוץ ביצוע: how the line was made (אינטרנט, הוראת קבע, כרטיס
//                         דביט, מס"ב...) - text that reads like a category and is not one
//   newest first (mostly), no totals on most exports
//
// Mizrahi Tefahot (מזרחי טפחות), "יתרות ותנועות בחשבון":
//   report lines        report name, account, period, when it was made
//   titles              תאריך | סוג תנועה | זכות | חובה | יתרה | אסמכתא (| תאריך ערך)
//                       - the description sits under סוג תנועה ("kind of movement"),
//                         which no importer expects to be the shop
//                       - זכות (money in) comes BEFORE חובה (money out) - the reverse of
//                         Leumi and Hapoalim
//                       - one figure per line in one of the two, the other empty or 0
//                       - the running balance, which may go below zero
//                       - תאריך ערך at the end, or right after תאריך, on some exports
//   dd/mm/yy dates on many exports
//
// Both: an opening / closing balance line now and then (figure only under
// the balance column), a totals line on some exports (per direction, or the
// net), the column titles printed again half-way down on a long CSV / HTML
// export (the page break of the web view it came from), blank lines.
//
// Lines on the account: shop purchases by debit card or standing order
// (SHOPS, category from the pool; a debit-card refund now and then as money
// in under the shop's name), the monthly card bills (ישראכרט, מקס, כאל -
// transfers: the spending itself is on the card statement), deposits /
// savings / pension moves and money back from a deposit (transfers), ATM cash
// (Other), bank fees (Other), Bit / PayBox to and from people (no category can
// be known), salary and other money in (BANK_IN).
//
// The column titles are written from knowledge of the two exports: the web
// search available when this was written turned up no public sample of either
// file (the israeli-bank-scrapers project reads both banks through their JSON
// APIs - Discount's OperationDate / ValueDate / OperationDescriptionToDisplay /
// OperationAmount / BalanceAfterOperation, Mizrahi's MC02PeulaTaaEZ /
// MC02TnuaTeurEZ / MC02SchumEZ / MC02AsmahtaMekoritEZ - which match the
// columns here but not their exact Hebrew titles), so the titles and report
// wording are varied among the forms these exports have used rather than
// fixed to one.
import { SHOPS, BANK_OUT, BANK_IN, isoDate, csvLine } from "./_lib.mjs";

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
const group = (ip, sep) => ip.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
// Hebrew text a windows-1255 file can carry: no gershayim / geresh, no curly quotes.
const cp1255Safe = (s) => s.replace(/[״“”]/g, "\"").replace(/[׳‘’]/g, "'");

// ----------------------------------------------------------------- pools --
// Travel is not one of Richy's default categories: its shops stay out.
const POOL = SHOPS.filter((s) => s.cat !== "Travel");
const byName = (names) => POOL.filter((s) => names.indexOf(s.name) !== -1);
// What a bank account pays by standing order (הוראת קבע) straight from the account.
const STANDING = byName(["חברת החשמל לישראל", "בזק", "הוט מובייל", "פרטנר תקשורת", "סלקום", "עיריית תל אביב ארנונה",
  "מי אביבים", "הולמס פלייס", "מכבי שירותי בריאות", "יס פלאנט"]);
const bo = (name) => BANK_OUT.find((b) => b.name === name);
const bi = (name) => BANK_IN.find((b) => b.name === name);
// The monthly card bills, in the words the two banks print for them. Cal is
// Discount's own card company, so a Discount account is more likely to carry it.
const CARD_BILLS = [
  { b: bo("ישראכרט"), days: [2, 10], w: { discount: 1, mizrahi: 2 }, names: [["ישראכרט", 4], ["ישראכרט בע\"מ", 1]] },
  { b: bo("מקס איט פיננסים"), days: [10, 15], w: { discount: 1, mizrahi: 2 }, names: [["מקס איט פיננסים", 4], ["מקס איט פיננסים בע\"מ", 1]] },
  { b: bo("כאל חיוב חודשי"), days: [2, 10], w: { discount: 3, mizrahi: 1 }, names: [["כאל חיוב חודשי", 4], ["כאל-כרטיסי אשראי", 1], ["כרטיסי אשראי לישראל", 1]] }
];
const SAVE_NAMES = {
  discount: [["הפקדה לפיקדון", 3], ["העברה לחיסכון", 3], ["קרן השתלמות", 2], ["הפקדה לתכנית חיסכון", 2]],
  mizrahi: [["הפקדה לפיקדון", 3], ["העברה לחיסכון", 3], ["קרן השתלמות", 2], ["הפקדה לפק\"מ", 2]]
};
const UNSAVE_NAMES = {
  discount: [["פדיון פיקדון", 3], ["משיכה מתכנית חיסכון", 1]],
  mizrahi: [["פדיון פיקדון", 3], ["פירעון פק\"מ", 1]]
};
const ATM_NAMES = {
  discount: [["משיכת מזומן כספומט", 3], ["משיכה מדיסקונטומט", 1]],
  mizrahi: [["משיכת מזומן כספומט", 3], ["משיכת מזומנים", 1]]
};
const P2P = [bo("העברה בביט"), bo("PAYBOX")];
const MONTH_FEE = [["דמי ניהול חשבון", 3], ["עמלת פעולה בערוץ ישיר", 2]];
const TELLER_FEE = [["עמלת פעולה ע\"י פקיד", 2], ["עמלת פעולה בסניף", 1]];
// ערוץ ביצוע: how Discount says the line was made.
const CHANNEL = {
  shop: [["כרטיס דביט", 3], ["כרטיס חיוב", 2], ["אינטרנט", 1]],
  refund: [["כרטיס דביט", 1]],
  standing: [["הוראת קבע", 1]],
  card: [["הוראת קבע", 2], ["חיוב כרטיס אשראי", 1]],
  saving: [["אינטרנט", 2], ["אפליקציה", 2], ["סניף", 1]],
  unsave: [["אינטרנט", 2], ["אפליקציה", 1], ["סניף", 1]],
  atm: [["מכשיר אוטומטי", 2], ["דיסקונטומט", 1]],
  p2p: [["אפליקציה", 2], ["ביט", 1], ["סניף", 1]],
  salary: [["מס\"ב", 3], ["העברה בנקאית", 1]],
  income: [["מס\"ב", 2], ["העברה בנקאית", 1]],
  fee: [["", 2], ["עמלות", 1]]
};

// --------------------------------------------------------------- make ----
function make(rng) {
  const bank = rng.chance(0.5) ? "discount" : "mizrahi";
  const disc = bank === "discount";

  // ---- the file's shape ---------------------------------------------------
  const format = weighted(rng, [["csv", 55], ["xlsx", 33], ["html", 12]]);
  const encoding = format === "csv" && rng.chance(0.55) ? "windows-1255" : "utf-8";
  const safe = encoding === "windows-1255";
  const txt = (s) => (safe ? cp1255Safe(s) : s);

  // Columns, in each bank's order; the words vary by export generation.
  let keys, titleOf;
  let hasValue = false, hasRef, hasFee = false, hasChan = false, valueAt = "";
  if (disc) {
    hasValue = rng.chance(0.75);
    hasRef = rng.chance(0.85);
    hasFee = rng.chance(0.55);
    hasChan = rng.chance(0.55);
    keys = ["date"].concat(hasValue ? ["value"] : [], ["desc", "amt", "bal"], hasRef ? ["ref"] : [], hasFee ? ["fee"] : [], hasChan ? ["chan"] : []);
    titleOf = {
      date: "תאריך",
      value: weighted(rng, [["יום ערך", 4], ["תאריך ערך", 1]]),
      desc: weighted(rng, [["תיאור התנועה", 4], ["תיאור", 1]]),
      amt: weighted(rng, [["₪ זכות/חובה", 4], ["זכות/חובה ₪", 2], ["זכות/חובה", 1]]),
      bal: weighted(rng, [["₪ יתרה", 4], ["יתרה ₪", 2], ["יתרה", 1]]),
      ref: "אסמכתא",
      fee: weighted(rng, [["עמלה", 3], ["₪ עמלה", 1]]),
      chan: weighted(rng, [["ערוץ ביצוע", 4], ["ערוץ", 1]])
    };
  } else {
    hasRef = rng.chance(0.85);
    valueAt = weighted(rng, [["", 55], ["end", 30], ["second", 15]]);
    hasValue = valueAt !== "";
    keys = ["date"].concat(valueAt === "second" ? ["value"] : [], ["desc", "credit", "debit", "bal"], hasRef ? ["ref"] : [], valueAt === "end" ? ["value"] : []);
    titleOf = {
      date: "תאריך",
      value: "תאריך ערך",
      desc: weighted(rng, [["סוג תנועה", 5], ["סוג התנועה", 1]]),
      credit: "זכות",
      debit: "חובה",
      bal: weighted(rng, [["יתרה", 3], ["יתרה בש\"ח", 2], ["יתרה בש''ח", 1]]),
      ref: weighted(rng, [["אסמכתא", 4], ["אסמכתה", 1]])
    };
  }
  const col = {};
  keys.forEach((k, i) => { col[k] = i; });
  const width = keys.length;
  const head = keys.map((k) => txt(titleOf[k]));

  // ---- the period ---------------------------------------------------------
  // Whole months, or "the last 30/60/90 days" from a random day; never later
  // than August 2026.
  const [ey, em] = addMonths(2026, 9, -rng.int(1, 20));
  const span = weighted(rng, [[1, 65], [2, 25], [3, 10]]);
  let startIso, endIso;
  if (rng.chance(0.65)) {
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
  const months = [];
  for (let [y, m] = [Number(startIso.slice(0, 4)), Number(startIso.slice(5, 7))]; isoDate(y, m, 1) <= endIso; [y, m] = addMonths(y, m, 1)) months.push([y, m]);
  const onDay = (y, m, d) => isoDate(y, m, Math.min(d, lastDay(y, m)));

  // ---- this account holder ------------------------------------------------
  const cardPool = [];
  CARD_BILLS.forEach((c) => { for (let i = 0; i < c.w[bank]; i++) cardPool.push(c); });
  const cards = [];
  const nCards = rng.pick([0, 1, 1, 1, 2, 2, 3]);
  for (const c of rng.shuffle(cardPool)) {
    if (cards.length >= nCards) break;
    if (cards.some((x) => x.c === c)) continue;
    cards.push({ c, day: rng.pick(c.days), base: between(rng, c.b.lo, c.b.hi), name: weighted(rng, c.names) });
  }
  const salary = rng.chance(0.85) ? { b: rng.pick([bi("משכורת"), bi("העברת משכורת חברת היי טק בע\"מ")]), day: rng.pick([1, 1, 2, 3, 5, 9, 10, 28, 30]),
    base: between(rng, 7000, 26000) } : null;
  const savings = rng.chance(0.45) ? { name: weighted(rng, SAVE_NAMES[bank]), day: rng.pick([1, 5, 10, 15, 20]), base: between(rng, 200, 2500) } : null;
  const allowance = rng.chance(0.25) ? { b: bi("ביטוח לאומי קצבת ילדים"), day: 20, base: between(rng, 150, 400) } : null;
  const interest = rng.chance(0.2) ? bi("ריבית על פיקדון") : null;
  const monthFee = rng.chance(0.35) ? { name: weighted(rng, MONTH_FEE), base: between(rng, 5, 32) } : null;

  // ---- the lines ----------------------------------------------------------
  // kind: shop | standing | refund | card | saving | unsave | atm | p2p | salary | income | fee
  // a: agorot, always positive; dir: "out" | "in"; name: the text as the bank writes it.
  const lines = [];
  const add = (l) => { lines.push(l); return l; };
  months.forEach(([y, m]) => {
    if (salary) { const iso = onDay(y, m, salary.day); if (inPeriod(iso)) add({ iso, kind: "salary", name: salary.b.name, cat: salary.b.cat, a: Math.max(A(1000), salary.base + A(rng.int(-300, 300))), dir: "in" }); }
    cards.forEach((c) => { const iso = onDay(y, m, c.day); if (inPeriod(iso)) add({ iso, kind: "card", name: c.name, cat: null, a: Math.max(A(300), Math.round(c.base * (0.6 + rng() * 0.8))), dir: "out" }); });
    if (savings) { const iso = onDay(y, m, savings.day); if (inPeriod(iso)) add({ iso, kind: "saving", name: savings.name, cat: "Savings", a: savings.base, dir: "out" }); }
    if (allowance) { const iso = onDay(y, m, allowance.day); if (inPeriod(iso)) add({ iso, kind: "income", name: allowance.b.name, cat: allowance.b.cat, a: allowance.base, dir: "in" }); }
    if (interest && rng.chance(0.7)) { const iso = onDay(y, m, lastDay(y, m)); if (inPeriod(iso)) add({ iso, kind: "income", name: interest.name, cat: interest.cat, a: between(rng, interest.lo, interest.hi), dir: "in" }); }
    if (monthFee) { const iso = onDay(y, m, rng.pick([1, lastDay(y, m)])); if (inPeriod(iso)) add({ iso, kind: "fee", name: monthFee.name, cat: "Other", a: monthFee.base, dir: "out" }); }
  });
  // At most 58 here: a teller fee adds up to two lines of its own below.
  const nTotal = rng.int(3, 58);
  if (lines.length > nTotal) { const keep = rng.shuffle(lines).slice(0, Math.max(1, nTotal - rng.int(0, 2))); lines.length = 0; keep.forEach((l) => lines.push(l)); }
  while (lines.length < nTotal) {
    const k = weighted(rng, [["shop", 58], ["standing", 10], ["atm", 7], ["p2p-out", 12], ["p2p-in", 5], ["saving", 3], ["unsave", 2], ["income", 1], ["refund", 2]]);
    if (k === "shop") {
      const s = rng.pick(POOL);
      add({ iso: anyDay(), kind: "shop", name: s.name, cat: s.cat, a: between(rng, s.lo, s.hi), dir: "out" });
    } else if (k === "standing") {
      const s = rng.pick(STANDING);
      add({ iso: anyDay(), kind: "standing", name: s.name, cat: s.cat, a: between(rng, s.lo, s.hi), dir: "out" });
    } else if (k === "refund") {
      // A debit-card refund: the shop's name, as money IN - mostly for a
      // purchase on this same statement (in full or in part, on the day or
      // after it), now and then for one from an earlier month.
      const bought = lines.filter((l) => l.kind === "shop");
      if (bought.length && rng.chance(0.65)) {
        const src = rng.pick(bought);
        const a = rng.chance(0.5) ? src.a : Math.max(100, Math.round(src.a * (0.1 + rng() * 0.9)));
        add({ iso: fromDayNum(rng.int(dayNum(src.iso), d1)), kind: "refund", name: src.name, cat: src.cat, a, dir: "in", of: src });
      } else {
        const s = rng.pick(POOL);
        add({ iso: anyDay(), kind: "refund", name: s.name, cat: s.cat, a: between(rng, s.lo, Math.max(s.lo, s.hi / 2)), dir: "in" });
      }
    } else if (k === "atm") {
      add({ iso: anyDay(), kind: "atm", name: weighted(rng, ATM_NAMES[bank]), cat: "Other", a: A(rng.pick([100, 200, 200, 300, 400, 500, 500, 700, 1000])), dir: "out" });
    } else if (k === "p2p-out") {
      const p = rng.pick(P2P);
      add({ iso: anyDay(), kind: "p2p", name: p.name, cat: null, a: rng.chance(0.5) ? A(rng.int(2, 40) * 10) : between(rng, p.lo, p.hi), dir: "out" });
    } else if (k === "p2p-in") {
      const p = rng.pick(P2P);
      add({ iso: anyDay(), kind: "p2p", name: p.name, cat: null, a: rng.chance(0.5) ? A(rng.int(2, 30) * 10) : between(rng, 20, 350), dir: "in" });
    } else if (k === "saving") {
      add({ iso: anyDay(), kind: "saving", name: weighted(rng, SAVE_NAMES[bank]), cat: "Savings", a: between(rng, 200, 3000), dir: "out" });
    } else if (k === "unsave") {
      add({ iso: anyDay(), kind: "unsave", name: weighted(rng, UNSAVE_NAMES[bank]), cat: "Savings", a: between(rng, 500, 8000), dir: "in" });
    } else {
      const b = rng.pick([bi("ביטוח לאומי קצבת ילדים"), bi("ריבית על פיקדון")]);
      add({ iso: anyDay(), kind: "income", name: b.name, cat: b.cat, a: between(rng, b.lo, b.hi), dir: "in" });
    }
  }

  // ---- the description, reference, value date, channel ------------------------
  const zeroFee = rng.pick(["", "", "0.00", "0"]);   // how the fee column writes "no fee"
  lines.forEach((l) => {
    let name = l.name;
    if ((l.kind === "shop" || l.kind === "standing") && /[א-ת]/.test(name) && rng.chance(0.08)) {
      name += " " + rng.pick(["בע\"מ", "בע״מ", "(1990) בע\"מ"]);
    }
    // A refund reads exactly as the purchase it refunds.
    l.desc = l.of ? l.of.desc : txt(name);
    l.ref = disc
      ? (rng.chance(0.2) ? String(rng.int(1, 99999)).padStart(rng.pick([6, 8]), "0") : String(rng.int(100000, 999999999)))
      : (rng.chance(0.25) ? String(rng.int(1, 9999)).padStart(6, "0") : String(rng.int(1000, 9999999)));
    // A value date after the line's date: the weekend, a cheque, a card-bill day.
    l.value = rng.chance(0.78) ? l.iso : addDays(l.iso, rng.int(1, 3));
    l.chan = hasChan ? weighted(rng, CHANNEL[l.kind === "standing" ? "standing" : l.kind]) : "";
    l.fee = 0;
  });
  // A teller operation that carried a fee: the fee column says so, and the
  // fee is charged as its own line on the same day, right after it.
  const tellerFees = [];
  if (hasFee && rng.chance(0.3)) {
    const cands = rng.shuffle(lines.filter((l) => l.kind === "saving" || l.kind === "unsave" || l.kind === "p2p"));
    cands.slice(0, rng.int(1, 2)).forEach((l) => {
      l.fee = A(rng.pick([3.5, 5.9, 6.9, 8.9, 10.6]));
      if (hasChan) l.chan = "סניף";
      const f = { iso: l.iso, kind: "fee", name: weighted(rng, TELLER_FEE), cat: "Other", a: l.fee, dir: "out", parent: l };
      f.desc = txt(f.name);
      f.ref = l.ref;
      f.value = l.value;
      f.chan = hasChan ? "סניף" : "";
      f.fee = 0;
      tellerFees.push(f);
    });
  }

  // ---- the running balance ------------------------------------------------
  // Oldest first, same-day lines in a random order the file keeps; a teller
  // fee straight after the line it was charged for.
  const tagged = lines.map((l) => ({ l, r: rng() }));
  tagged.sort((a, b) => a.l.iso.localeCompare(b.l.iso) || a.r - b.r);
  const chrono = [];
  tagged.forEach((t) => { chrono.push(t.l); tellerFees.filter((f) => f.parent === t.l).forEach((f) => chrono.push(f)); });
  const openA = rng.chance(0.15) ? -between(rng, 200, 9000) : between(rng, 500, 45000);
  let run = openA;
  chrono.forEach((l) => { run += l.dir === "in" ? l.a : -l.a; l.bal = run; });
  const closeA = run;
  const newestFirst = rng.chance(disc ? 0.65 : 0.45);
  const shown = newestFirst ? chrono.slice().reverse() : chrono;

  const opening = rng.chance(0.3);
  const closing = rng.chance(0.3);
  const balLabelAt = rng.chance(0.7) ? "desc" : "date";
  const openLabel = disc ? weighted(rng, [["יתרת פתיחה", 3], ["יתרה לתחילת התקופה", 1]]) : weighted(rng, [["יתרת פתיחה", 3], ["יתרה קודמת", 1]]);
  const closeLabel = disc ? weighted(rng, [["יתרת סגירה", 3], ["יתרה לסוף התקופה", 1]]) : weighted(rng, [["יתרת סגירה", 3], ["יתרה נוכחית", 1]]);
  const balDated = rng.chance(0.5);
  const sumOut = chrono.reduce((n, l) => n + (l.dir === "out" ? l.a : 0), 0);
  const sumIn = chrono.reduce((n, l) => n + (l.dir === "in" ? l.a : 0), 0);
  const net = sumIn - sumOut;
  // Totals: Discount under its one signed column - a line per direction, or
  // the period's net; Mizrahi under זכות and חובה - one line with both
  // figures, or a line per direction.
  const printTotals = rng.chance(0.22);
  const totalForm = disc ? (rng.chance(0.6) ? "split" : "net") : (rng.chance(0.5) ? "row" : "split");
  const totalAt = rng.chance(0.6) ? "desc" : "date";
  const zeroOther = !disc && rng.chance(0.15);  // the empty side written as 0
  const gapAfterTitles = rng.chance(0.3);
  const gapBeforeFoot = rng.chance(0.3);

  // ---- report lines above the table ---------------------------------------
  const branch = disc ? String(rng.int(1, 199)).padStart(3, "0") : String(rng.int(400, 699));
  const acctNo = disc ? String(rng.int(1000000, 99999999)) : String(rng.int(100000, 999999));
  const acct = branch + "-" + acctNo;
  const dS = fmtD(startIso, "dmy"), dE = fmtD(endIso, "dmy");
  const madeIso = addDays(endIso, rng.int(1, 20));
  const hhmm = String(rng.int(7, 22)).padStart(2, "0") + ":" + String(rng.int(0, 59)).padStart(2, "0");
  const titleCands = disc ? [
    rng.pick(["עובר ושב - תנועות אחרונות", "תנועות בחשבון עו\"ש", "פירוט תנועות בחשבון", "דיסקונט - תנועות בחשבון"]),
    rng.pick(["מספר חשבון: " + acct, "חשבון: " + acct, "סניף " + branch + " חשבון " + acctNo]),
    rng.pick(["מתאריך: " + dS + " עד תאריך: " + dE, "תנועות לתקופה " + dS + " - " + dE, "טווח תאריכים: " + dS + " - " + dE]),
    rng.pick(["תאריך הפקה: " + fmtD(madeIso, "dmy") + " " + hhmm, "הופק בתאריך " + fmtD(madeIso, "dmy")])
  ] : [
    rng.pick(["יתרות ותנועות בחשבון", "תנועות בחשבון עו\"ש", "מזרחי טפחות - תנועות בחשבון", "פירוט תנועות"]),
    rng.pick(["חשבון: " + acct, "מספר חשבון " + acct, "סניף: " + branch + " חשבון: " + acctNo]),
    rng.pick(["לתקופה: " + dS + " - " + dE, "מתאריך " + dS + " עד " + dE, "תנועות מ-" + dS + " עד " + dE]),
    rng.pick(["הופק בתאריך " + fmtD(madeIso, "dmy"), "תאריך הפקה: " + fmtD(madeIso, "dmy"), "הופק בתאריך " + fmtD(madeIso, "dmy") + " בשעה " + hhmm])
  ];
  const nTitles = rng.int(0, 4);
  const titles = rng.shuffle([0, 1, 2, 3]).slice(0, nTitles).sort((a, b) => a - b).map((i) => txt(titleCands[i]));
  // Discount's page shows the account's balance at the top; some exports
  // carry it into the file, label and figure in two cells or one.
  const balTitle = disc && rng.chance(0.18) ? (rng.chance(0.5) ? "cells" : "text") : "";

  // ---- the table, as abstract cells ------------------------------------------
  // A cell: { t: "text"|"date"|"money"|"ref"|"fee", v }. Rendered per format below.
  const T = (v) => (v === "" || v == null ? null : { t: "text", v });
  const D = (v) => ({ t: "date", v });
  const M = (v) => ({ t: "money", v });
  const R = (v) => ({ t: "ref", v });
  const F = (v) => ({ t: "fee", v });
  const rows = [];       // { kind: "title"|"baltitle"|"blank"|"head"|"line"|"balance"|"total", cells }
  titles.forEach((t) => rows.push({ kind: "title", cells: [T(t)] }));
  if (balTitle) rows.push({ kind: "baltitle", cells: [T("יתרה בחשבון:"), M(closeA)], form: balTitle });
  if ((titles.length || balTitle) && gapAfterTitles) rows.push({ kind: "blank", cells: [] });
  rows.push({ kind: "head", cells: head.map((h) => T(h)) });
  const balRow = (label, iso, a) => {
    const c = new Array(width).fill(null);
    c[col[balLabelAt]] = T(txt(label));
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
    if (disc) c[col.amt] = M(l.dir === "out" ? -l.a : l.a);
    else {
      c[col.credit] = l.dir === "in" ? M(l.a) : zeroOther ? M(0) : null;
      c[col.debit] = l.dir === "out" ? M(l.a) : zeroOther ? M(0) : null;
    }
    c[col.bal] = M(l.bal);
    if (hasRef) c[col.ref] = R(l.ref);
    if (hasFee) c[col.fee] = F(l.fee);
    if (hasChan) c[col.chan] = T(txt(l.chan));
    rows.push({ kind: "line", cells: c, l });
  });
  if ((bottom[0] || printTotals) && gapBeforeFoot) rows.push({ kind: "blank", cells: [] });
  if (bottom[0]) balRow(bottom[1], bottom[2], bottom[3]);
  const statementTotals = [];
  const totalRow = (label, fill) => {
    const c = new Array(width).fill(null);
    c[col[totalAt]] = T(txt(label));
    fill(c);
    rows.push({ kind: "total", cells: c });
  };
  if (printTotals) {
    if (disc && totalForm === "split") {
      if (sumIn > 0) { totalRow(rng.pick(["סה\"כ זכות", "סה\"כ זכות"]), (c) => { c[col.amt] = M(sumIn); }); statementTotals.push(S(sumIn)); }
      if (sumOut > 0) { totalRow(rng.pick(["סה\"כ חובה", "סה\"כ חובה"]), (c) => { c[col.amt] = M(-sumOut); }); statementTotals.push(S(sumOut)); }
    } else if (disc) {
      if (net !== 0) { totalRow(rng.pick(["סה\"כ תנועות בתקופה", "סה\"כ", "סך הכל"]), (c) => { c[col.amt] = M(net); }); statementTotals.push(S(Math.abs(net))); }
    } else if (totalForm === "row") {
      totalRow(rng.pick(["סה\"כ", "סה\"כ תנועות", "סך הכל"]), (c) => {
        c[col.credit] = sumIn > 0 ? M(sumIn) : zeroOther ? M(0) : null;
        c[col.debit] = sumOut > 0 ? M(sumOut) : zeroOther ? M(0) : null;
      });
      if (sumIn > 0) statementTotals.push(S(sumIn));
      if (sumOut > 0) statementTotals.push(S(sumOut));
    } else {
      if (sumIn > 0) { totalRow("סה\"כ זכות", (c) => { c[col.credit] = M(sumIn); }); statementTotals.push(S(sumIn)); }
      if (sumOut > 0) { totalRow("סה\"כ חובה", (c) => { c[col.debit] = M(sumOut); }); statementTotals.push(S(sumOut)); }
    }
  }
  const hasTotalRows = rows.some((r) => r.kind === "total");

  // ---- traps ---------------------------------------------------------------
  const traps = ["running balance column"];
  if (disc) {
    traps.push("one signed amount column titled זכות/חובה");
    if (/₪/.test(titleOf.amt)) traps.push("shekel sign in the amount title");
  } else {
    traps.push("description under סוג תנועה", "credit column before debit column");
    if (zeroOther) traps.push("zero in the unused debit/credit column");
  }
  if (hasValue) traps.push("value-date column" + (valueAt === "second" ? " right after the date" : ""));
  if (hasRef) traps.push("reference column");
  if (hasFee) traps.push("fee column");
  if (tellerFees.length) traps.push("fee in the fee column AND as its own line");
  if (hasChan) traps.push("channel column (text that reads like a category)");
  if (titles.length) traps.push("title lines (" + titles.length + ")");
  if (balTitle) traps.push("account balance above the column titles (" + balTitle + ")");
  if (newestFirst) traps.push("newest first");
  if (opening) traps.push("opening balance line");
  if (closing) traps.push("closing balance line");
  if (hasTotalRows) traps.push("total row" + (disc ? (totalForm === "net" ? " (net)" : "s per direction, signed") : (totalForm === "row" ? " (both columns)" : "s per direction")));
  if (chrono.some((l) => l.bal < 0) || (opening && openA < 0)) traps.push("negative (overdraft) balance");
  if (lines.some((l) => /["״]/.test(l.desc))) traps.push("quote in shop name");
  if (lines.some((l) => l.kind === "standing")) traps.push("standing order");
  if (lines.some((l) => l.kind === "p2p" && l.dir === "in")) traps.push("p2p money in");
  if (lines.some((l) => l.kind === "refund")) traps.push("debit-card refund (shop name as money in)");
  if (lines.some((l) => l.kind === "card")) traps.push("card bill (transfer)");
  if (lines.some((l) => l.kind === "saving" || l.kind === "unsave")) traps.push("savings move (transfer)");
  if (lines.some((l) => l.kind === "atm")) traps.push("cash withdrawal");
  if (lines.some((l) => l.kind === "fee")) traps.push("bank fee line");
  if (hasValue && chrono.some((l) => l.value !== l.iso)) traps.push("value date differs from date");

  // ---- render ---------------------------------------------------------------
  let file, nameBits;
  const bankName = disc ? "discount" : "mizrahi";
  if (format === "xlsx") {
    const dateMode = rng.pick(["cell", "cell", "custom", "text"]);
    const textDateStyle = disc ? (rng.chance(0.8) ? "dmy" : "dmy2") : (rng.chance(0.5) ? "dmy2" : "dmy");
    const inline = rng.chance(0.25);
    const numericRef = rng.chance(0.6);
    const formulaTotal = rng.chance(0.4);
    // Some exporters write every figure as text, formatted the way the site
    // shows it - the trailing minus included.
    const textMoney = rng.chance(0.12);
    const textNegTrail = rng.chance(0.5);
    const moneyText = (a) => {
      const [ip, dp] = (Math.abs(a) / 100).toFixed(2).split(".");
      const s = group(ip, ",") + "." + dp;
      return a < 0 ? (textNegTrail ? s + "-" : "-" + s) : s;
    };
    const str = (s) => (inline ? { inline: s } : s);
    const X = (c) => {
      if (!c) return null;
      if (c.t === "text") return str(c.v);
      if (c.t === "date") return dateMode === "text" ? str(fmtD(c.v, textDateStyle))
        : dateMode === "custom" ? { date: c.v, custom: true } : { date: c.v };
      if (c.t === "ref") return numericRef ? { n: Number(c.v) } : str(c.v);
      if (c.t === "fee") return c.v ? (textMoney ? str(moneyText(c.v)) : { n: S(c.v) }) : (zeroFee === "" ? null : { n: 0 });
      return textMoney ? str(moneyText(c.v)) : { n: S(c.v) };
    };
    const firstLine = rows.findIndex((r) => r.kind === "line") + 1;
    const lastLine = rows.length - rows.slice().reverse().findIndex((r) => r.kind === "line");
    const letter = (i) => String.fromCharCode(65 + i);
    const rng1 = (k) => letter(col[k]) + firstLine + ":" + letter(col[k]) + lastLine;
    let usedFormula = false;
    const out = rows.map((r) => {
      let cells;
      if (r.kind === "baltitle" && r.form === "text") cells = [str("יתרה בחשבון: " + moneyText(closeA) + " ₪")];
      else cells = r.cells.map((c) => X(c));
      if (r.kind === "total" && formulaTotal && !textMoney) {
        cells.forEach((cell, i) => {
          if (!cell || cell.n === undefined || cell.n === 0) return;
          const k = keys[i];
          let f;
          if (disc && totalForm === "net") f = "SUM(" + rng1("amt") + ")";
          else if (disc) f = "SUMIF(" + rng1("amt") + ",\"" + (cell.n > 0 ? ">0" : "<0") + "\")";
          else f = "SUM(" + rng1(k) + ")";
          cells[i] = { formula: f, n: cell.n };
          usedFormula = true;
        });
      }
      while (cells.length && cells[cells.length - 1] == null) cells.pop();
      return cells;
    });
    if (dateMode === "text") traps.push("text dates in xlsx");
    if (numericRef && hasRef) traps.push("reference as a number");
    if (usedFormula) traps.push("formula total");
    if (textMoney) traps.push("money as text in xlsx" + (textNegTrail && rows.some((r) => r.cells.some((c) => c && c.t === "money" && c.v < 0)) ? " (trailing minus)" : ""));
    const sheetName = disc ? rng.pick(["תנועות אחרונות", "עובר ושב", "Sheet1"]) : rng.pick(["תנועות בחשבון", "גיליון1", "Sheet1"]);
    file = { kind: "xlsx", sheets: [{ name: sheetName, rows: out }] };
    nameBits = [bankName + " xlsx", "dates " + dateMode + (textMoney ? ", money as text" : "")];
  } else {
    // Text forms: CSV and the HTML .xls share how a cell reads.
    const sep = format === "csv" ? weighted(rng, [[",", 70], [";", 20], ["\t", 10]]) : ",";
    const dateStyle = disc ? weighted(rng, [["dmy", 70], ["dmy2", 15], ["dmydot", 15]]) : weighted(rng, [["dmy", 50], ["dmy2", 40], ["dmydot", 10]]);
    const moneyStyle = format === "html" ? weighted(rng, [["comma", 2], ["plain", 1]])
      : sep === "," ? weighted(rng, [["plain", 3], ["comma", 3], ["general", 1]])
      : sep === ";" ? weighted(rng, [["plain", 2], ["comma", 1], ["euro", 3]])
      : weighted(rng, [["plain", 2], ["comma", 2], ["euro", 1]]);
    const negTrail = rng.chance(disc ? 0.4 : 0.25);
    const shekel = moneyStyle !== "general" && rng.chance(0.1);
    const shekelFirst = rng.chance(0.5);
    const money = (a, k) => {
      const neg = a < 0;
      const abs = Math.abs(a);
      let s;
      if (moneyStyle === "general") s = String(S(abs));
      else {
        const [ip, dp] = (abs / 100).toFixed(2).split(".");
        s = moneyStyle === "comma" ? group(ip, ",") + "." + dp : moneyStyle === "euro" ? group(ip, ".") + "," + dp : ip + "." + dp;
      }
      if (shekel && (k === "amt" || k === "bal")) s = shekelFirst ? "₪ " + s : s + " ₪";
      if (!neg) return s;
      return negTrail ? s + "-" : "-" + s;
    };
    const cellText = (c, k) => {
      if (!c) return "";
      if (c.t === "date") return fmtD(c.v, dateStyle);
      if (c.t === "money") return money(c.v, k);
      if (c.t === "fee") return c.v ? money(c.v, k) : zeroFee;
      return c.v;
    };
    const rowTexts = (r) => {
      if (r.kind === "baltitle") {
        const fig = money(closeA, "bal");
        return r.form === "text" ? ["יתרה בחשבון: " + fig + (shekel ? "" : " ₪")] : ["יתרה בחשבון:", fig];
      }
      return r.cells.map((c, i) => cellText(c, keys[i]));
    };
    // The column titles again, half-way down a long export: the page break
    // of the web view the file was saved from.
    if (rng.chance(0.14) && shown.length >= 12) {
      const lineIdx = rows.map((r, i) => (r.kind === "line" ? i : -1)).filter((i) => i >= 0);
      const at = lineIdx[rng.int(4, lineIdx.length - 4)];
      const ins = [{ kind: "head", cells: head.map((h) => T(h)) }];
      if (rng.chance(0.5)) ins.unshift({ kind: "blank", cells: [] });
      rows.splice(at, 0, ...ins);
      traps.push("column titles repeated mid-file");
    }
    if (dateStyle === "dmy2") traps.push("two-digit years");
    if (dateStyle === "dmydot") traps.push("dotted dates");
    if (moneyStyle === "comma") traps.push("thousands separator" + (format === "csv" && sep === "," ? " (quoted)" : ""));
    if (moneyStyle === "euro") traps.push("1.234,50 decimals");
    if (moneyStyle === "general") traps.push("figures without fixed decimals");
    const anyNeg = rows.some((r) => r.cells.some((c) => c && (c.t === "money") && c.v < 0));
    if (negTrail && anyNeg) traps.push("trailing minus");
    if (shekel) traps.push("shekel sign in money cells");

    if (format === "csv") {
      const eol = rng.chance(0.7) ? "\r\n" : "\n";
      const bom = encoding === "utf-8" && rng.chance(0.6);
      const pad = rng.chance(0.5);
      const excelQuotes = rng.chance(0.5);
      const q = (s) => (s.indexOf(sep) !== -1 || /[\r\n]/.test(s) || /^"/.test(s) || s.indexOf("\"") !== -1
        ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s);
      const out = rows.map((r) => {
        const cells = rowTexts(r);
        if (pad) while (cells.length < width) cells.push("");
        else while (cells.length && cells[cells.length - 1] === "") cells.pop();
        return excelQuotes ? cells.map(q).join(sep) : csvLine(cells, sep);
      });
      let text = out.join(eol);
      if (rng.chance(0.5)) text += eol;
      file = { kind: "csv", text, encoding, bom };
      if (pad) traps.push("padded empty cells");
      if (excelQuotes && /""/.test(text)) traps.push("quoted cell with doubled quote");
      if (sep !== ",") traps.push(sep === ";" ? "semicolon separated" : "tab separated");
      nameBits = [bankName + " csv " + (safe ? "cp1255" : "utf-8" + (bom ? "+bom" : "")), sep === "," ? "comma" : sep === ";" ? "semicolon" : "tab",
        eol === "\r\n" ? "crlf" : "lf", "money " + moneyStyle + (negTrail ? " trailing-minus" : ""), "dates " + dateStyle];
    } else {
      const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const thHead = rng.chance(0.5);
      const out = [
        "<html dir=\"rtl\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\"><head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"><title>"
          + esc(titleCands[0]) + "</title></head><body>",
        "<table border=\"1\" cellspacing=\"0\" cellpadding=\"2\" dir=\"rtl\">"
      ];
      rows.forEach((r) => {
        if (r.kind === "blank") { out.push("<tr><td colspan=\"" + width + "\">&nbsp;</td></tr>"); return; }
        if (r.kind === "title") { out.push("<tr><td colspan=\"" + width + "\"><b>" + esc(r.cells[0].v) + "</b></td></tr>"); return; }
        const cells = rowTexts(r);
        if (r.kind === "baltitle") { out.push("<tr>" + cells.map((s) => "<td>" + esc(s) + "</td>").join("") + "</tr>"); return; }
        while (cells.length < width) cells.push("");
        const tag = r.kind === "head" && thHead ? "th" : "td";
        out.push("<tr>" + cells.map((s) => "<" + tag + ">" + (s ? esc(s) : "&nbsp;") + "</" + tag + ">").join("") + "</tr>");
      });
      out.push("</table>", "</body></html>");
      file = { kind: "html", text: out.join("\n") };
      nameBits = [bankName + " html .xls", "money " + moneyStyle + (negTrail ? " trailing-minus" : ""), "dates " + dateStyle];
    }
  }

  // ---- truth, in file order -------------------------------------------------
  const truth = shown.map((l) => ({
    date: l.iso,
    amount: S(l.a),
    type: l.dir === "out" ? "expense" : "income",
    shop: l.desc,
    cat: l.cat,
    transfer: l.kind === "card" || l.kind === "saving" || l.kind === "unsave",
    refund: l.kind === "refund",
    issuer: null
  }));

  nameBits.push(truth.length + " lines");
  nameBits.push(keys.length + " cols");
  if (newestFirst) nameBits.push("newest first");
  if (opening || closing) nameBits.push([opening ? "opening" : "", closing ? "closing" : ""].filter(Boolean).join("+") + " balance");
  if (hasTotalRows) nameBits.push("totals " + totalForm);
  if (tellerFees.length) nameBits.push("teller fee");
  return { name: nameBits.join(", "), kind: "bank", file, truth, statementTotals, traps };
}

export default {
  id: "discount-mizrahi",
  describe: "Discount (תאריך/יום ערך/תיאור התנועה/₪ זכות-חובה signed/₪ יתרה/אסמכתא/עמלה/ערוץ ביצוע) and Mizrahi Tefahot (תאריך/סוג תנועה/זכות/חובה/יתרה/אסמכתא) current-account movements - running balance, trailing minus, balance and total lines, repeated titles - as CSV (cp1255/utf-8, , ; tab), .xlsx and the HTML .xls",
  make
};
