// Bank Hapoalim - current account (עו"ש) "תנועות בחשבון" export.
//
// What "ייצוא לאקסל" on the Hapoalim site hands out, in the forms it reaches
// Richy: the .xlsx itself (built server side - dates often TEXT, strings often
// inline), and the CSV a person gets by opening it in Excel and saving it
// (windows-1255 from "CSV (Comma delimited)" on a Hebrew Windows, UTF-8 - often
// with a BOM - from "CSV UTF-8").
//
// Shape of the real file:
//   a few report lines   תנועות בחשבון עו"ש / חשבון: 12-600-123456 / תקופה: 01/08/2026 - 31/08/2026 /
//                        הופק בתאריך ... / now and then the balance itself ("יתרה בחשבון: 12,345.67")
//   the table            תאריך | תיאור הפעולה | פרטים | (חשבון) | אסמכתא | תאריך ערך | חובה | זכות | יתרה בש"ח
//                        - פרטים holds the payee of a transfer ("לטובת: דנה כהן"), the card of a
//                          purchase ("כרטיס דביט 4580"), "הוראת קבע" - or nothing. It is TEXT next to
//                          the description, and a reader that takes it for the shop loses every shop.
//                        - תאריך ערך, פרטים and אסמכתא are not on every export; חשבון (the other
//                          side's account, 10-800-12345678) is on some
//   (opening balance)    a figure under יתרה only - not a transaction
//   rows                 one figure per row, in EITHER חובה or זכות, and the running balance after
//                        the row (overdraft too: a leading or a trailing minus)
//   page breaks          an export built for printing repeats the TITLE ROW in the middle of the
//                        data - sometimes with "עמוד 1 מתוך 3", a per-page "סה"כ לעמוד" line, the
//                        first report line again, a blank line, a "carried from the previous page"
//                        balance line
//   (closing balance)
//   (totals)             סה"כ with the debit total under חובה and the credit total under זכות -
//                        two figures on one line
//
// Lines on the account: debit-card and standing-order shops (SHOPS, category
// from the pool), the monthly card bills (ישראכרט / מקס / כאל - transfers: the
// spending itself is on the card statement), deposits / savings / pension
// moves (transfers), ATM cash (Other), Bit / PayBox to and from people (no
// category can be known), bank fees (Other), a debit-card refund now and then,
// salary and other money in (BANK_IN).
//
// Column titles and report lines are written from knowledge of the export:
// web search here turned up no public sample of the file (and the one page that
// might have shown it was blocked), so the wording that varies between the old
// and the new site is varied rather than fixed to one.
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
const grouped = (ip) => ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const commaMoney = (a) => { const [ip, dp] = S(a).toFixed(2).split("."); return grouped(ip) + "." + dp; };   // agorot -> "1,234.50"
// Hebrew text a windows-1255 file can carry: no gershayim / geresh, no curly quotes.
const cp1255Safe = (s) => s.replace(/[״“”]/g, "\"").replace(/[׳’]/g, "'");

// ----------------------------------------------------------------- pools --
// Travel is not one of Richy's default categories: its shops stay out.
const POOL = SHOPS.filter((s) => s.cat !== "Travel");
const byName = (names) => POOL.filter((s) => names.indexOf(s.name) !== -1);
// What an account pays by standing order (הוראת קבע) straight from the bank.
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
const P2P = [bo("העברה בביט"), bo("העברה בביט"), bo("PAYBOX")];
const FEES = ["עמלת פעולה בערוץ ישיר", "דמי ניהול חשבון", "עמלת הקצאת אשראי", "עמלת משיכה מבנקט"];
const PEOPLE = ["דנה כהן", "יוסי לוי", "מיכל אברהם", "אבי מזרחי", "נועה פרץ", "רונית ביטון", "עומר דהן", "שירה אזולאי",
  "איתי פרידמן", "תמר שפירא", "גל אוחיון", "משה בן דוד"];
const EMPLOYERS = ["אינטל אלקטרוניקה בע\"מ", "משרד החינוך", "צ'ק פוינט תוכנה בע\"מ", "עיריית חיפה", "אלביט מערכות בע\"מ",
  "מכבי שירותי בריאות", "סטארט אפ ניישן בע\"מ"];

// --------------------------------------------------------------- make ----
function make(rng) {
  // ---- the file's shape ---------------------------------------------------
  const format = rng.chance(0.6) ? "csv" : "xlsx";
  const encoding = format === "csv" && rng.chance(0.55) ? "windows-1255" : "utf-8";
  const safe = encoding === "windows-1255";
  const txt = (s) => (safe ? cp1255Safe(s) : s);

  const hasDetails = rng.chance(0.85);
  const hasAcct = hasDetails && rng.chance(0.15);
  const hasRef = rng.chance(0.9);
  const hasValue = rng.chance(0.75);
  const hasNote = rng.chance(0.12);
  const keys = ["date", "desc"].concat(hasDetails ? ["details"] : [], hasAcct ? ["acct"] : [], hasRef ? ["ref"] : [],
    hasValue ? ["value"] : [], ["debit", "credit", "bal"], hasNote ? ["note"] : []);
  const col = {};
  keys.forEach((k, i) => { col[k] = i; });
  const width = keys.length;
  const withB = rng.chance(0.1);                  // בחובה / בזכות
  const TITLE = {
    date: rng.chance(0.85) ? "תאריך" : "תאריך הפעולה",
    desc: rng.chance(0.85) ? "תיאור הפעולה" : "תיאור",
    details: rng.chance(0.85) ? "פרטים" : "פרטים נוספים",
    acct: "חשבון",
    ref: rng.chance(0.85) ? "אסמכתא" : "אסמכתה",
    value: "תאריך ערך",
    debit: withB ? "בחובה" : "חובה",
    credit: withB ? "בזכות" : "זכות",
    bal: weighted(rng, [["יתרה בש\"ח", 60], ["יתרה בש''ח", 15], ["יתרה", 15], ["יתרה בש״ח", 10]]),
    note: "הערה"
  };
  const head = keys.map((k) => txt(TITLE[k]));

  // ---- the period ---------------------------------------------------------
  // Whole months, or "the last 30/60/90 days"; never later than August 2026.
  const [ey, em] = addMonths(2026, 9, -rng.int(1, 20));
  const span = weighted(rng, [[1, 60], [2, 25], [3, 15]]);
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
  const cards = rng.shuffle(CARD_BILLS).slice(0, rng.pick([0, 1, 1, 1, 2, 2, 3]))
    .map((c) => ({ b: c.b, day: rng.pick(c.days), base: between(rng, c.b.lo, c.b.hi), last4: String(rng.int(0, 9999)).padStart(4, "0") }));
  const salary = rng.chance(0.85) ? { b: rng.pick([bi("משכורת"), bi("משכורת"), bi("העברת משכורת חברת היי טק בע\"מ")]),
    day: rng.pick([1, 1, 2, 3, 5, 9, 10, 28, 30]), base: between(rng, 7000, 26000), from: rng.pick(EMPLOYERS) } : null;
  const savings = rng.chance(0.45) ? { b: rng.pick(SAVINGS), day: rng.pick([1, 5, 10, 15, 20]), base: between(rng, 200, 2500) } : null;
  const allowance = rng.chance(0.25) ? { b: bi("ביטוח לאומי קצבת ילדים"), day: 20, base: between(rng, 150, 400) } : null;
  const interest = rng.chance(0.2) ? bi("ריבית על פיקדון") : null;
  const debitLast4 = String(rng.int(0, 9999)).padStart(4, "0");
  const branch = rng.int(500, 799);
  const acctNo = String(rng.int(100000, 999999));

  // ---- the lines ----------------------------------------------------------
  // kind: shop | standing | card | saving | unsave | atm | p2p | fee | refund | salary | income
  const lines = [];
  const add = (l) => lines.push(l);
  months.forEach(([y, m]) => {
    if (salary) { const iso = onDay(y, m, salary.day); if (inPeriod(iso)) add({ iso, kind: "salary", src: salary.b, a: Math.max(A(1000), salary.base + A(rng.int(-300, 300))), dir: "in" }); }
    cards.forEach((c) => { const iso = onDay(y, m, c.day); if (inPeriod(iso)) add({ iso, kind: "card", src: c.b, card: c, a: Math.max(A(300), Math.round(c.base * (0.6 + rng() * 0.8))), dir: "out" }); });
    if (savings) { const iso = onDay(y, m, savings.day); if (inPeriod(iso)) add({ iso, kind: "saving", src: savings.b, a: savings.base, dir: "out" }); }
    if (allowance) { const iso = onDay(y, m, allowance.day); if (inPeriod(iso)) add({ iso, kind: "income", src: allowance.b, a: allowance.base, dir: "in" }); }
    if (interest && rng.chance(0.7)) { const iso = onDay(y, m, lastDay(y, m)); if (inPeriod(iso)) add({ iso, kind: "income", src: interest, a: between(rng, interest.lo, interest.hi), dir: "in" }); }
    if (rng.chance(0.5)) { const iso = onDay(y, m, lastDay(y, m)); if (inPeriod(iso)) add({ iso, kind: "fee", src: { name: "דמי ניהול חשבון" }, a: A(rng.pick([9.9, 10.9, 12.9, 14.9, 16.9])), dir: "out" }); }
  });
  const nTotal = weighted(rng, [[rng.int(3, 8), 20], [rng.int(9, 25), 45], [rng.int(26, 60), 35]]);
  // A short statement keeps only some of the monthly lines.
  if (lines.length > nTotal) { const keep = rng.shuffle(lines).slice(0, Math.max(1, nTotal - rng.int(0, 2))); lines.length = 0; keep.forEach(add); }
  while (lines.length < nTotal) {
    const k = weighted(rng, [["shop", 50], ["standing", 12], ["atm", 7], ["p2p-out", 12], ["p2p-in", 6], ["fee", 3], ["saving", 3], ["unsave", 2], ["refund", 2], ["income", 2], ["twin", 2]]);
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
    } else if (k === "fee") {
      add({ iso: anyDay(), kind: "fee", src: { name: rng.pick(FEES) }, a: between(rng, 3.9, 25), dir: "out" });
    } else if (k === "saving") {
      const b = rng.pick(SAVINGS);
      add({ iso: anyDay(), kind: "saving", src: b, a: between(rng, b.lo, b.hi), dir: "out" });
    } else if (k === "unsave") {
      add({ iso: anyDay(), kind: "unsave", src: { name: "פדיון פיקדון" }, a: between(rng, 500, 8000), dir: "in" });
    } else if (k === "refund") {
      const s = rng.pick(POOL.filter((x) => /[א-ת]/.test(x.name)));
      add({ iso: anyDay(), kind: "refund", src: s, a: between(rng, Math.min(10, s.lo), s.hi * 0.6), dir: "in" });
    } else if (k === "twin") {
      // Two of the same on one day - two coffees, two withdrawals. Both real.
      const s = rng.chance(0.5) ? ATM : rng.pick(byName(["ארומה תל אביב", "קפה גרג", "COFIX", "פנגו", "רב קו", "רכבת ישראל"]));
      const iso = anyDay();
      const a = s === ATM ? A(rng.pick([200, 300, 400, 500])) : between(rng, s.lo, s.hi);
      const kind = s === ATM ? "atm" : "shop";
      add({ iso, kind, src: s, a, dir: "out", twin: true });
      if (lines.length < nTotal) add({ iso, kind, src: s, a, dir: "out", twin: true });
    } else {
      const b = rng.pick([bi("ביטוח לאומי קצבת ילדים"), bi("ריבית על פיקדון")]);
      add({ iso: anyDay(), kind: "income", src: b, a: between(rng, b.lo, b.hi), dir: "in" });
    }
  }

  // ---- the description and the details, as the bank writes them -------------
  const counts = { quote: 0, standing: 0, p2pIn: 0, detailsQuote: 0 };
  const acctStr = () => rng.pick(["10", "11", "12", "20", "31"]) + "-" + rng.int(100, 999) + "-" + rng.int(10000, 99999999);
  const twinDesc = new Map();
  lines.forEach((l) => {
    let name = l.src.name, det = "", acct = "";
    if (l.kind === "shop" || l.kind === "standing") {
      if (/[א-ת]/.test(name) && rng.chance(0.08)) name += " " + rng.pick(["בע\"מ", "בע״מ", "(1990) בע\"מ"]);
      if (l.kind === "standing" && rng.chance(0.15)) name = "הו\"ק " + name;
      det = l.kind === "standing" ? rng.pick(["הוראת קבע", "חיוב לפי הרשאה", "", ""])
        : rng.pick(["", "", "כרטיס דביט " + debitLast4, "רכישה בכרטיס דביט " + debitLast4]);
    } else if (l.kind === "card") {
      det = rng.pick(["חיוב כרטיס " + l.card.last4, "כרטיס " + l.card.last4, ""]);
    } else if (l.kind === "saving") {
      det = rng.pick(["לפיקדון " + rng.int(100, 999) + "-" + rng.int(10000, 99999), "העברה בין חשבונות", ""]);
      if (hasAcct && rng.chance(0.6)) acct = "12-" + branch + "-" + acctNo;
    } else if (l.kind === "unsave") {
      det = rng.pick(["פיקדון שהגיע למועדו", ""]);
    } else if (l.kind === "atm") {
      name = weighted(rng, [[ATM.name, 60], ["משיכה מבנקט", 25], ["משיכת מזומן", 15]]);
      det = rng.pick(["בנקט " + rng.int(100, 999), "סניף " + branch, ""]);
    } else if (l.kind === "p2p") {
      const who = rng.pick(PEOPLE);
      det = l.dir === "out" ? rng.pick(["לטובת: " + who, "ל" + who, who]) : rng.pick(["מאת: " + who, "מ" + who, who]);
      if (hasAcct && rng.chance(0.5)) acct = acctStr();
    } else if (l.kind === "salary") {
      det = rng.pick(["מאת: " + salary.from, salary.from, ""]);
      if (hasAcct && rng.chance(0.7)) acct = acctStr();
    } else if (l.kind === "refund") {
      name = rng.chance(0.6) ? "זיכוי " + name : name + " - זיכוי";
      det = rng.pick(["זיכוי כרטיס דביט " + debitLast4, ""]);
    } else if (l.kind === "fee") {
      det = rng.pick(["", "", "עמלות"]);
    }
    if (l.twin) {
      // The two copies read the same.
      const k = l.iso + "|" + l.a + "|" + l.src.name;
      if (twinDesc.has(k)) { [name, det] = twinDesc.get(k); } else twinDesc.set(k, [name, det]);
    }
    l.desc = txt(name);
    l.det = txt(det);
    l.acct = acct;
    if (/"/.test(l.desc)) counts.quote++;
    if (/"/.test(l.det)) counts.detailsQuote++;
    if (l.kind === "standing") counts.standing++;
    if (l.kind === "p2p" && l.dir === "in") counts.p2pIn++;
    l.ref = rng.chance(0.15) ? String(rng.int(1, 99999)).padStart(rng.pick([6, 7, 9]), "0") : String(rng.int(1000, 999999999));
    l.value = rng.chance(0.8) || l.kind === "card" ? l.iso : addDays(l.iso, rng.int(1, 3));
    l.note = hasNote && rng.chance(0.15) ? txt(rng.pick(["מתנה ליום הולדת", "החזר על ארוחה", "שכר דירה", "לבדוק"])) : "";
  });

  // ---- the running balance ------------------------------------------------
  const tagged = lines.map((l) => ({ l, r: rng() }));
  tagged.sort((a, b) => a.l.iso.localeCompare(b.l.iso) || a.r - b.r);
  const chrono = tagged.map((t) => t.l);
  const openA = rng.chance(0.2) ? -between(rng, 200, 12000) : between(rng, 300, 60000);
  let run = openA;
  chrono.forEach((l) => { run += l.dir === "in" ? l.a : -l.a; l.bal = run; });
  const closeA = run;
  const newestFirst = rng.chance(0.55);
  const shown = newestFirst ? chrono.slice().reverse() : chrono;

  // ---- report lines above the table ---------------------------------------
  const dS = fmtD(startIso, "dmy"), dE = fmtD(endIso, "dmy");
  const madeIso = addDays(endIso, rng.int(1, 20));
  const titleCands = [
    rng.pick(["תנועות בחשבון עו\"ש", "תנועות בחשבון עו\"ש", "תנועות אחרונות בחשבון עו\"ש", "פירוט תנועות בחשבון", "בנק הפועלים - תנועות בחשבון"]),
    rng.pick(["חשבון: 12-" + branch + "-" + acctNo, "סניף: " + branch + " חשבון: " + acctNo, "מספר חשבון: " + branch + "-" + acctNo, "עו\"ש " + branch + "-" + acctNo]),
    rng.pick(["תקופה: " + dS + " - " + dE, "מתאריך: " + dS + " עד תאריך: " + dE, "לתקופה " + dS + "-" + dE, "תנועות מתאריך " + dS + " עד " + dE]),
    rng.pick(["הופק בתאריך " + fmtD(madeIso, "dmy"), "תאריך הפקה: " + fmtD(madeIso, "dmy"),
      "הופק בתאריך " + fmtD(madeIso, "dmy") + " בשעה " + String(rng.int(7, 22)).padStart(2, "0") + ":" + String(rng.int(0, 59)).padStart(2, "0")])
  ];
  const nTitles = rng.int(0, 4);
  const titles = rng.shuffle([0, 1, 2, 3]).slice(0, nTitles).sort((a, b) => a - b).map((i) => txt(titleCands[i]));
  // The balance itself among the report lines - a money figure above the table.
  const balTitle = nTitles >= 1 && rng.chance(0.2) ? { label: txt(rng.pick(["יתרה בחשבון:", "יתרה נוכחית:", "יתרה בעו\"ש:"])), a: closeA, split: rng.chance(0.5) } : null;

  // ---- layout choices -------------------------------------------------------
  const opening = rng.chance(0.3);
  const closing = rng.chance(0.3);
  const balLabelAt = rng.chance(0.7) ? "desc" : "date";
  const openLabel = rng.pick(["יתרת פתיחה", "יתרה לתחילת התקופה", "יתרה קודמת"]);
  const closeLabel = rng.pick(["יתרת סגירה", "יתרה לסוף התקופה", "יתרה סופית"]);
  const balDated = rng.chance(0.5);
  const zeroOther = rng.chance(0.1);              // the empty side written as 0
  const gapAfterTitles = titles.length > 0 && rng.chance(0.35);
  const gapBeforeFoot = rng.chance(0.3);

  // Page breaks: the export built for printing.
  const pageBreaks = shown.length >= 5 && rng.chance(0.4);
  let pages = [shown];
  if (pageBreaks) {
    let per = rng.pick([10, 12, 15, 20, 25, 30]);
    if (shown.length <= per) per = rng.int(3, shown.length - 1);
    const first = Math.max(2, per - (titles.length ? rng.int(0, titles.length) : 0));
    pages = [shown.slice(0, first)];
    for (let i = first; i < shown.length; i += per) pages.push(shown.slice(i, i + per));
  }
  const nPages = pages.length;
  const pageNums = pageBreaks && rng.chance(0.5);
  const pageNumAt = rng.chance(0.6) ? "foot" : "head";
  const pageSubs = pageBreaks && rng.chance(0.3);
  const repeatTitle = pageBreaks && titles.length > 0 && rng.chance(0.3);
  const carry = pageBreaks && !newestFirst && rng.chance(0.25);
  const gapAtBreak = pageBreaks && rng.chance(0.5);
  const printTotals = pageSubs ? rng.chance(0.8) : rng.chance(0.4);
  const totalLabel = rng.pick(["סה\"כ", "סה\"כ", "סה\"כ תנועות", "סך הכל", "סה\"כ לתקופה"]);
  const subLabel = rng.pick(["סה\"כ לעמוד", "סה\"כ בעמוד", "סיכום ביניים"]);
  const totalAt = rng.chance(0.5) ? "desc" : "date";
  const zeroTotalShown = rng.chance(0.5);        // a side with nothing on it: 0.00, or empty

  // ---- the table, as abstract cells ------------------------------------------
  const T = (v) => (v === "" || v == null ? null : { t: "text", v });
  const D = (v) => ({ t: "date", v });
  const M = (v) => ({ t: "money", v });
  const R = (v) => ({ t: "ref", v });
  const rows = [];       // { kind, cells, from?, to? }
  titles.forEach((t) => rows.push({ kind: "title", cells: [T(t)] }));
  if (balTitle) rows.push({ kind: "title", cells: balTitle.split ? [T(balTitle.label), M(balTitle.a)] : [{ t: "baltext", v: balTitle }] });
  if (gapAfterTitles) rows.push({ kind: "blank", cells: [] });
  const headRow = () => rows.push({ kind: "head", cells: head.map((h) => T(h)) });
  const blank = () => rows.push({ kind: "blank", cells: [] });
  const balRow = (label, iso, a) => {
    const c = new Array(width).fill(null);
    c[col[balLabelAt]] = T(txt(label));
    if (iso && balDated && balLabelAt === "desc") c[col.date] = D(iso);
    c[col.bal] = M(a);
    rows.push({ kind: "balance", cells: c });
  };
  const statementTotals = [];
  const sumRow = (kind, label, list) => {
    const out = list.reduce((n, l) => n + (l.dir === "out" ? l.a : 0), 0);
    const inn = list.reduce((n, l) => n + (l.dir === "in" ? l.a : 0), 0);
    const c = new Array(width).fill(null);
    c[col[totalAt]] = T(txt(label));
    c[col.debit] = out || zeroTotalShown ? M(out) : null;
    c[col.credit] = inn || zeroTotalShown ? M(inn) : null;
    rows.push({ kind, cells: c, out, inn });
    if (out > 0) statementTotals.push(S(out));
    if (inn > 0) statementTotals.push(S(inn));
  };
  const pageNumRow = (i) => rows.push({ kind: "pagenum", cells: [T(txt("עמוד " + (i + 1) + " מתוך " + nPages))] });

  if (pageNums && pageNumAt === "head") pageNumRow(0);
  headRow();
  const top = newestFirst ? [closing, closeLabel, endIso, closeA] : [opening, openLabel, startIso, openA];
  const bottom = newestFirst ? [opening, openLabel, startIso, openA] : [closing, closeLabel, endIso, closeA];
  if (top[0]) balRow(top[1], top[2], top[3]);
  let firstLineRow = -1, lastLineRow = -1;
  pages.forEach((page, pi) => {
    if (pi > 0) {
      // The break: whatever closes the previous page, then the title row again.
      const prev = pages[pi - 1];
      if (pageSubs) sumRow("subtotal", subLabel, prev);
      if (pageNums && pageNumAt === "foot") pageNumRow(pi - 1);
      if (gapAtBreak) blank();
      if (pageNums && pageNumAt === "head") pageNumRow(pi);
      if (repeatTitle) rows.push({ kind: "title", cells: [T(titles[0])] });
      headRow();
      if (carry) balRow(rng.pick(["יתרה מהעמוד הקודם", "יתרה מועברת"]), null, prev[prev.length - 1].bal);
    }
    page.forEach((l) => {
      const c = new Array(width).fill(null);
      c[col.date] = D(l.iso);
      c[col.desc] = T(l.desc);
      if (hasDetails) c[col.details] = T(l.det);
      if (hasAcct) c[col.acct] = T(l.acct);
      if (hasRef) c[col.ref] = R(l.ref);
      if (hasValue) c[col.value] = D(l.value);
      c[col.debit] = l.dir === "out" ? M(l.a) : zeroOther ? M(0) : null;
      c[col.credit] = l.dir === "in" ? M(l.a) : zeroOther ? M(0) : null;
      c[col.bal] = M(l.bal);
      if (hasNote) c[col.note] = T(l.note);
      if (firstLineRow < 0) firstLineRow = rows.length;
      lastLineRow = rows.length;
      rows.push({ kind: "line", cells: c, l });
    });
  });
  if (pageSubs) sumRow("subtotal", subLabel, pages[nPages - 1]);
  if (pageNums && pageNumAt === "foot") pageNumRow(nPages - 1);
  if ((bottom[0] || printTotals) && gapBeforeFoot) blank();
  const totalFirst = rng.chance(0.5);
  if (bottom[0] && !totalFirst) balRow(bottom[1], bottom[2], bottom[3]);
  if (printTotals) sumRow("total", totalLabel, shown);
  if (bottom[0] && totalFirst) balRow(bottom[1], bottom[2], bottom[3]);

  // ---- traps ----------------------------------------------------------------
  const traps = ["split debit/credit columns", "running balance column"];
  if (hasDetails) traps.push("details column (פרטים) beside the description");
  if (hasAcct) traps.push("counterparty account column");
  if (hasValue) traps.push("value-date column");
  if (hasRef) traps.push("reference column");
  if (hasNote) traps.push("user note column");
  if (titles.length) traps.push("title lines (" + titles.length + ")");
  if (balTitle) traps.push("balance figure in the report lines");
  if (newestFirst) traps.push("newest first");
  if (opening) traps.push("opening balance line");
  if (closing) traps.push("closing balance line");
  if (printTotals) traps.push("total row (debits and credits)");
  if (pageBreaks) traps.push("header row repeated (page break)");
  if (pageNums) traps.push("page number line");
  if (pageSubs) traps.push("subtotal per page");
  if (repeatTitle) traps.push("report line repeated at page break");
  if (carry) traps.push("carried-forward balance line");
  if (zeroOther) traps.push("zero in the unused debit/credit column");
  const negShown = rows.some((r) => r.cells.some((c) => c && c.t === "money" && c.v < 0));
  if (negShown) traps.push("negative (overdraft) balance");
  if (counts.quote) traps.push("quote in shop name");
  if (counts.detailsQuote) traps.push("quote in details");
  if (counts.standing) traps.push("standing order");
  if (counts.p2pIn) traps.push("p2p money in");
  if (lines.some((l) => l.kind === "card")) traps.push("card bill (transfer)");
  if (lines.some((l) => l.kind === "saving" || l.kind === "unsave")) traps.push("savings move (transfer)");
  if (lines.some((l) => l.kind === "atm")) traps.push("cash withdrawal");
  if (lines.some((l) => l.kind === "fee")) traps.push("bank fee");
  if (lines.some((l) => l.kind === "refund")) traps.push("refund to debit card");
  if (lines.some((l) => l.twin)) traps.push("identical twin lines");
  if (hasValue && lines.some((l) => l.value !== l.iso)) traps.push("value date differs from date");
  if (rows.some((r) => r.kind === "blank")) traps.push("blank lines");

  // ---- render ---------------------------------------------------------------
  let file, nameBits;
  if (format === "xlsx") {
    const dateMode = weighted(rng, [["text", 45], ["cell", 35], ["custom", 20]]);
    const textDateStyle = rng.chance(0.8) ? "dmy" : "dmy2";
    const inline = rng.chance(0.4);
    const numericRef = rng.chance(0.6);
    const formulaTotal = printTotals && !pageSubs && rng.chance(0.35);
    const Tx = (s) => (inline ? { inline: s } : s);
    const X = (c) => {
      if (!c) return null;
      if (c.t === "text") return Tx(c.v);
      if (c.t === "baltext") return Tx(c.v.label + " " + (c.v.a < 0 ? "-" : "") + commaMoney(Math.abs(c.v.a)) + " ₪");
      if (c.t === "date") return dateMode === "text" ? Tx(fmtD(c.v, textDateStyle)) : dateMode === "custom" ? { date: c.v, custom: true } : { date: c.v };
      if (c.t === "ref") return numericRef ? { n: Number(c.v) } : Tx(c.v);
      return { n: S(c.v) };
    };
    const letter = (i) => String.fromCharCode(65 + i);
    const out = rows.map((r) => {
      const cells = r.cells.map((c) => X(c));
      if (r.kind === "total" && formulaTotal) {
        const rng1 = (k) => "SUM(" + letter(col[k]) + (firstLineRow + 1) + ":" + letter(col[k]) + (lastLineRow + 1) + ")";
        if (cells[col.debit]) cells[col.debit] = { formula: rng1("debit"), n: S(r.out) };
        if (cells[col.credit]) cells[col.credit] = { formula: rng1("credit"), n: S(r.inn) };
      }
      while (cells.length && cells[cells.length - 1] == null) cells.pop();
      return cells;
    });
    if (dateMode === "text") traps.push("text dates in xlsx");
    if (inline) traps.push("inline strings");
    if (numericRef && hasRef) traps.push("reference as a number");
    if (formulaTotal) traps.push("formula total");
    file = { kind: "xlsx", sheets: [{ name: rng.pick(["תנועות בחשבון", "תנועות עו\"ש", "Sheet1", "גיליון1", "עו\"ש"]), rows: out }] };
    nameBits = ["hapoalim xlsx", "dates " + dateMode + (inline ? ", inline strings" : "")];
  } else {
    const dateStyle = weighted(rng, [["dmy", 70], ["dmy2", 20], ["dmydot", 10]]);
    const moneyStyle = weighted(rng, [["comma", 45], ["plain", 30], ["general", 25]]);
    const negStyle = moneyStyle !== "general" && rng.chance(0.3) ? "trail" : "lead";
    const shekel = moneyStyle !== "general" ? weighted(rng, [["none", 85], ["bal", 8], ["all", 7]]) : "none";
    const shekelFirst = rng.chance(0.5);
    const money = (a, isBal) => {
      const neg = a < 0;
      const abs = Math.abs(a);
      let s;
      if (moneyStyle === "general") s = String(S(abs));
      else {
        s = moneyStyle === "comma" ? commaMoney(abs) : S(abs).toFixed(2);
      }
      if (shekel === "all" || (shekel === "bal" && isBal)) s = shekelFirst ? "₪ " + s : s + " ₪";
      if (!neg) return s;
      return negStyle === "trail" ? s + "-" : "-" + s;
    };
    const cellText = (c, k) => {
      if (!c) return "";
      if (c.t === "date") return fmtD(c.v, dateStyle);
      if (c.t === "money") return money(c.v, k === "bal");
      if (c.t === "baltext") return c.v.label + " " + money(c.v.a, true);
      return c.v;
    };
    const rowTexts = (r) => r.cells.map((c, i) => cellText(c, r.kind === "title" ? "bal" : keys[i]));
    if (dateStyle === "dmy2") traps.push("two-digit years");
    if (dateStyle === "dmydot") traps.push("dotted dates");
    if (moneyStyle === "comma") traps.push("thousands separator (quoted)");
    if (moneyStyle === "general") traps.push("general number format (1234.5)");
    if (negStyle === "trail" && negShown) traps.push("trailing minus");
    if (shekel !== "none") traps.push("shekel sign in " + (shekel === "all" ? "every money cell" : "balance"));

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
    if (/"/.test(text)) traps.push(excelQuotes ? "quoted cell with doubled quote" : "bare quote in cell");
    nameBits = ["hapoalim csv " + (safe ? "cp1255" : "utf-8" + (bom ? "+bom" : "")), eol === "\r\n" ? "crlf" : "lf", "money " + moneyStyle, "dates " + dateStyle];
  }

  // ---- truth, in file order -------------------------------------------------
  const truth = shown.map((l) => ({
    date: l.iso,
    amount: S(l.a),
    type: l.dir === "out" ? "expense" : "income",
    shop: l.desc,
    cat: l.kind === "shop" || l.kind === "standing" || l.kind === "refund" || l.kind === "salary" || l.kind === "income" ? l.src.cat
      : l.kind === "atm" || l.kind === "fee" ? "Other" : null,
    transfer: l.kind === "card" || l.kind === "saving" || l.kind === "unsave",
    refund: l.kind === "refund",
    issuer: null
  }));

  nameBits.push(truth.length + " lines");
  nameBits.push(keys.length + " cols");
  if (newestFirst) nameBits.push("newest first");
  if (pageBreaks) nameBits.push(nPages + " pages (header repeated" + (pageSubs ? ", page subtotals" : "") + ")");
  if (opening || closing) nameBits.push([opening ? "opening" : "", closing ? "closing" : ""].filter(Boolean).join("+") + " balance");
  if (printTotals) nameBits.push("totals row");
  return { name: nameBits.join(", "), kind: "bank", file, truth, statementTotals, traps };
}

export default {
  id: "hapoalim",
  describe: "Bank Hapoalim current-account (עו\"ש) movements: report lines, תאריך/תיאור הפעולה/פרטים/אסמכתא/תאריך ערך/חובה/זכות/יתרה בש\"ח, running balance (overdraft too), page breaks that repeat the title row, page subtotals, opening/closing balance, סה\"כ debits and credits - as CSV (cp1255/utf-8) and .xlsx",
  make
};
