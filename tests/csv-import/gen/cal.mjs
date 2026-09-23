// Cal (Visa Cal / כאל) - the "פירוט עסקאות" export from cal-online.co.il.
//
// What the real file looks like: a few report lines ("פירוט עסקאות", "לכרטיס
// ויזה המסתיים ב-1234", "לחיוב ב-02/10/2026"), then a seven-column table -
// תאריך העסקה | שם בית העסק | סכום העסקה | סכום החיוב | סוג העסקה | ענף | הערות
// - and a "סה"כ" / "סה"כ לחיוב" line with the label in the first column and the
// figure under סכום החיוב. The digital site hands out an .xlsx whose title
// cells carry a line break ("תאריך\nעסקה") and whose amounts are often TEXT
// with the shekel sign in them ("₪ 1,234.50"); the older site handed out an
// HTML table named .xls with only five columns (the notes column is "פירוט
// נוסף" there, and there is no type or sector column at all). People who open
// either in Excel and save it again produce the CSV.
//
// The traps that break importers, all drawn at random here:
//   - TWO money columns: סכום העסקה is the full price of an installment plan
//     (or the dollars of a foreign purchase), סכום החיוב is what was charged
//     this month. Only the charge is money that left the account.
//   - a charge DATE column, sometimes sitting between the two amounts
//   - dates as dd/mm/yy
//   - installments ("תשלום 2 מתוך 6" in הערות), credit plans ("קרדיט")
//   - foreign purchases: "$ 12.99" in the deal column, shekels in the charge
//   - refunds: negative lines, "זיכוי" in סוג העסקה (or only in the notes on
//     the old layout)
//   - total rows, a total printed ABOVE the table among the report lines,
//     per-card subtotals with the header repeated for each card, a separate
//     foreign block with its own header in a different column order
//   - a sector (ענף) text with a comma in it ("מסעדות, קפה וברים")
//   - a card column, a voucher column, a currency column, a conversion rate
//   - a discount note that makes the deal amount differ from the charge
//   - shop names with a bare quote in them (בע"מ)
//
// Written from knowledge of the export. Web search did not turn up a public
// sample to check the column titles against, so the wording that varies
// between Cal's old and new site (with or without the ה, with a line break
// or without) is varied here rather than fixed.
import { SHOPS, isoDate, randomDay } from "./_lib.mjs";

// ------------------------------------------------------------- the shops --
// Travel is not one of Richy's default categories, so its shops stay out of
// the truth rather than asking the importer for a category it cannot pick.
const POOL = SHOPS.filter((s) => s.cat !== "Travel");
const byName = (names) => POOL.filter((s) => names.indexOf(s.name) !== -1);
const FOREIGN_SHOPS = byName(["NETFLIX.COM", "SPOTIFY", "STEAM GAMES", "ALIEXPRESS", "AMAZON MKTPLACE", "SHEIN"]);
const STANDING_SHOPS = byName(["חברת החשמל לישראל", "בזק", "הוט מובייל", "פרטנר תקשורת", "סלקום", "עיריית תל אביב ארנונה",
  "מי אביבים", "הולמס פלייס", "NETFLIX.COM", "SPOTIFY", "יס פלאנט", "מכבי שירותי בריאות"]);
// What people split into payments: electronics, furniture, clothes, a gym.
const INSTALLMENT_SHOPS = POOL.filter((s) => (s.cat === "Shopping" && s.hi >= 450) || s.name === "הולמס פלייס");
// Bit / PayBox paid by card: a real charge whose category nobody can know.
const P2P = [
  { name: "העברה בביט", issuer: "העברת כספים", lo: 20, hi: 600 },
  { name: "ביט", issuer: "העברת כספים", lo: 20, hi: 500 },
  { name: "PAYBOX", issuer: "העברת כספים", lo: 20, hi: 400 }
];

// ------------------------------------------------------------ the columns --
// hey = the titles with the definite article (the old site and most CSVs),
// bare = without it, nl = the digital site's xlsx, a line break in the cell.
const HEADS = {
  date:       { hey: "תאריך העסקה", bare: "תאריך עסקה", nl: "תאריך\nעסקה" },
  shop:       { hey: "שם בית העסק", bare: "שם בית עסק", nl: "שם בית\nעסק" },
  deal:       { hey: "סכום העסקה", bare: "סכום עסקה", nl: "סכום\nעסקה" },
  charge:     { hey: "סכום החיוב", bare: "סכום חיוב", nl: "סכום\nחיוב" },
  chargeDate: { hey: "תאריך החיוב", bare: "תאריך חיוב", nl: "תאריך\nחיוב" },
  type:       { hey: "סוג העסקה", bare: "סוג עסקה", nl: "סוג\nעסקה" },
  sector:     { hey: "ענף", bare: "ענף", nl: "ענף" },
  notes:      { hey: "הערות", bare: "הערות", nl: "הערות" },
  card:       { hey: "4 ספרות אחרונות של כרטיס האשראי", bare: "כרטיס", nl: "4 ספרות\nאחרונות" },
  dealCur:    { hey: "מטבע העסקה", bare: "מטבע עסקה", nl: "מטבע\nעסקה" },
  chargeCur:  { hey: "מטבע החיוב", bare: "מטבע חיוב", nl: "מטבע\nחיוב" },
  voucher:    { hey: "מספר שובר", bare: "אסמכתא", nl: "מספר\nשובר" },
  rate:       { hey: "שער ההמרה", bare: "שער המרה", nl: "שער\nהמרה" }
};
const OLD_NOTES = "פירוט נוסף";
// The foreign block's own table, in an order that is not the main table's.
const FOREIGN_KEYS = [
  ["date", "shop", "dealCur", "deal", "charge", "sector", "notes"],
  ["shop", "date", "deal", "dealCur", "charge", "type", "notes"],
  ["date", "chargeDate", "shop", "charge", "deal", "dealCur", "rate", "notes"]
];

const TYPE = { regular: "רגילה", inst: "תשלומים", credit: "קרדיט", standing: "הוראת קבע", refund: "זיכוי" };

// ------------------------------------------------------------------ util --
const A = (n) => Math.round(n * 100);            // shekels -> agorot
const S = (a) => a / 100;                         // agorot -> shekels (exact to 2dp)
function addMonths(y, m, k) {
  const z = (y * 12 + (m - 1)) + k;
  return [Math.floor(z / 12), (z % 12) + 1];
}
function lastDay(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
// Hebrew text that a windows-1255 file can carry: no gershayim, no euro sign,
// no bidi marks, no no-break space.
const cp1255Safe = (s) => s.replace(/[״“”]/g, "\"").replace(/[׳’]/g, "'").replace(/€/g, "EUR").replace(/[\u200e\u200f]/g, "").replace(/\u00a0/g, " ");
function randomLast4(rng) { return String(rng.int(0, 9999)).padStart(4, "0"); }
function grouped(v) {
  const [ip, dp] = v.toFixed(2).split(".");
  return ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dp;
}

// One shop, possibly with the legal suffix Israeli acquirers print.
function shopName(rng, s, safe) {
  let name = s.name;
  if (/[א-ת]/.test(name) && rng.chance(0.08)) name += " " + rng.pick(["בע\"מ", "בע״מ", "(1990) בע\"מ", "בע\"מ - סניף מרכז"]);
  return safe ? cp1255Safe(name) : name;
}

// --------------------------------------------------------------- make ----
function make(rng) {
  // ---- the statement's shape --------------------------------------------
  const fmt = rng.pick(["csv", "csv", "csv", "csv", "xlsx", "xlsx", "xlsx", "html", "html"]);
  const encoding = fmt === "csv" && rng.chance(0.45) ? "windows-1255" : "utf-8";
  const safe = encoding === "windows-1255";
  const q = (s) => (safe ? cp1255Safe(s) : s);
  const old = fmt === "html" ? rng.chance(0.45) : rng.chance(0.12);
  const headStyle = old ? rng.pick(["hey", "hey", "bare"])
    : rng.chance(fmt === "csv" ? 0.12 : 0.4) ? "nl" : rng.chance(0.6) ? "hey" : "bare";
  const headTitle = (k) => (old && k === "notes" ? OLD_NOTES : HEADS[k][headStyle]);
  const gersh = !safe && rng.chance(0.25);       // total labels written with ״ rather than "
  const lbl = (s) => q(gersh ? s.replace(/"/g, "״") : s);

  // Billing month: one of the last twenty months before September 2026.
  const [y, m] = addMonths(2026, 9, -rng.int(1, 20));
  const [cy, cm] = addMonths(y, m, 1);
  const chargeIso = isoDate(cy, cm, rng.pick([2, 2, 10, 10, 15]));

  const cardMode = old ? "single" : rng.pick(["single", "single", "single", "single", "single", "single", "sections", "column"]);
  const nCards = cardMode === "single" ? 1 : rng.int(2, 3);
  const cards = [];
  while (cards.length < nCards) { const c = randomLast4(rng); if (cards.indexOf(c) === -1) cards.push(c); }
  const brands = cards.map(() => rng.pick(["ויזה", "ויזה", "ויזה", "מאסטרקארד", "דיינרס"]));

  // ---- the columns of the main table ------------------------------------
  const cardCol = !old && (cardMode === "column" || (cardMode === "single" && rng.chance(0.12)));
  const cardNumeric = rng.chance(0.3);           // xlsx only: the digits as a number, leading zero gone
  let keys;
  if (old) {
    keys = ["date", "shop", "deal", "charge", "notes"];
  } else {
    const chargeDateCol = rng.chance(0.35);
    const between = rng.chance(0.65);
    keys = ["date", "shop", "deal"];
    if (rng.chance(0.2)) keys.push("dealCur");
    if (chargeDateCol && between) keys.push("chargeDate");
    keys.push("charge");
    if (rng.chance(0.15)) keys.push("chargeCur");
    if (chargeDateCol && !between) keys.push("chargeDate");
    keys.push("type", "sector", "notes");
    if (rng.chance(0.15)) keys.push("voucher");
    if (cardCol) keys.splice(rng.pick([0, 2, keys.length]), 0, "card");
  }

  // ---- the lines --------------------------------------------------------
  const pForeign = rng.pick([0, 0.05, 0.1, 0.18]);
  const pInst = rng.pick([0, 0.08, 0.15]);
  const pStanding = rng.pick([0, 0.06, 0.12]);
  const pP2p = rng.pick([0, 0, 0.04]);
  const lines = [];
  const counts = { inst: 0, credit: 0, foreign: 0, standing: 0, refund: 0, suffix: 0, p2p: 0, discount: 0 };
  const nBuy = rng.int(3, 58);
  for (let i = 0; i < nBuy; i++) {
    const card = i < nCards ? cards[i] : rng.pick(cards);     // every card gets a line
    const r = rng();
    const base = { card, voucher: String(rng.int(1000000, 99999999)), rate: null, note: null, refund: false, section: "main" };
    if (r < pForeign) {
      const s = rng.pick(FOREIGN_SHOPS);
      const eur = rng.chance(0.15);
      const rate4 = Math.round((eur ? 3.85 + rng() * 0.45 : 3.4 + rng() * 0.55) * 10000) / 10000;
      const target = s.lo + rng() * (s.hi - s.lo);
      const dealA = Math.max(100, A(target / rate4));
      const chargeA = Math.round(dealA * rate4);
      const note = rng.pick([null, null, "עסקה בחו\"ל", "עסקה במט\"ח", "שער המרה " + rate4.toFixed(4)]);
      lines.push(Object.assign(base, { iso: randomDay(rng, y, m), shop: s.name, cat: s.cat, issuer: s.issuer, type: TYPE.regular,
        chargeA, dealA, dealCur: eur ? "EUR" : "USD", rate: rate4, note: note && q(note), section: "foreign", kind: "foreign" }));
      counts.foreign++;
    } else if (r < pForeign + pInst) {
      const s = rng.pick(INSTALLMENT_SHOPS);
      const fullA = A(Math.max(300, s.lo) + rng() * (s.hi * 1.2 - Math.max(300, s.lo)));
      // The dearer the purchase, the longer the plan.
      const N = fullA < 100000 ? rng.pick([2, 3, 3, 4, 5, 6]) : fullA < 300000 ? rng.pick([3, 4, 6, 6, 8, 10, 12]) : rng.pick([6, 10, 12, 12, 18, 24, 36]);
      const k = rng.int(1, N);
      // A credit plan ("קרדיט") adds interest to each payment; a plain plan
      // splits the price, the first payment carrying the remainder.
      const credit = !old && N >= 10 && rng.chance(0.35);
      let chargeA;
      if (credit) chargeA = Math.round(fullA * (1 + 0.004 * N + rng() * 0.02) / N);
      else { const per = Math.floor(fullA / N); chargeA = k === 1 ? fullA - per * (N - 1) : per; }
      const [py, pm] = addMonths(y, m, -(k - 1));
      const name = shopName(rng, s, safe);
      if (name !== s.name) counts.suffix++;
      const note = rng.chance(0.85) ? "תשלום " + k + " מתוך " + N : k + " מתוך " + N;
      lines.push(Object.assign(base, { iso: randomDay(rng, py, pm), shop: name, cat: s.cat, issuer: s.issuer, type: credit ? TYPE.credit : TYPE.inst,
        chargeA, dealA: fullA, dealCur: "ILS", note, kind: "inst" }));
      counts.inst++;
      if (credit) counts.credit++;
    } else if (r < pForeign + pInst + pStanding) {
      const s = rng.pick(STANDING_SHOPS);
      const a = A(s.lo + rng() * (s.hi - s.lo));
      const name = shopName(rng, s, safe);
      if (name !== s.name) counts.suffix++;
      // A standing order is charged on a fixed day, often before the 10th.
      lines.push(Object.assign(base, { iso: isoDate(y, m, rng.int(1, Math.min(lastDay(y, m), 12))), shop: name, cat: s.cat, issuer: s.issuer,
        type: TYPE.standing, chargeA: a, dealA: a, dealCur: "ILS", note: old || rng.chance(0.3) ? TYPE.standing : null, kind: "standing" }));
      counts.standing++;
    } else if (r < pForeign + pInst + pStanding + pP2p) {
      const p = rng.pick(P2P);
      const a = A(p.lo + rng() * (p.hi - p.lo));
      lines.push(Object.assign(base, { iso: randomDay(rng, y, m), shop: p.name, cat: null, issuer: p.issuer, type: TYPE.regular,
        chargeA: a, dealA: a, dealCur: "ILS", note: rng.chance(0.4) ? "העברה לאדם פרטי" : null, kind: "p2p" }));
      counts.p2p++;
    } else {
      const s = rng.pick(POOL);
      const a = A(s.lo + rng() * (s.hi - s.lo));
      const name = shopName(rng, s, safe);
      if (name !== s.name) counts.suffix++;
      let dealA = a, note = null;
      const nr = rng();
      if (!old && nr < 0.015 && a > 2000) {
        // A club discount: the deal is the list price, the charge is less,
        // and the note names the difference as a figure.
        const off = A(Math.max(5, Math.round(S(a) * rng.pick([0.05, 0.1, 0.15]))));
        dealA = a + off;
        note = q(rng.pick(["הנחה בסך " + grouped(S(off)) + " ש\"ח", "הנחת מועדון " + grouped(S(off)) + " ₪"]));
        counts.discount++;
      } else if (!old && nr < 0.09) {
        note = rng.pick(["עסקה בכרטיס דיגיטלי", "Apple Pay", "Google Pay", "עסקה טלפונית", "עסקת אינטרנט"]);
      }
      lines.push(Object.assign(base, { iso: randomDay(rng, y, m), shop: name, cat: s.cat, issuer: s.issuer, type: TYPE.regular,
        chargeA: a, dealA, dealCur: "ILS", note, kind: "regular" }));
    }
  }
  // Refunds: a negative line against a regular purchase on the same card,
  // never more than that purchase and never against every purchase there is.
  const regular = lines.filter((l) => l.kind === "regular");
  if (regular.length >= 2 && rng.chance(0.45)) {
    const k = Math.min(rng.int(1, 2), regular.length - 1);
    rng.shuffle(regular).slice(0, k).forEach((src) => {
      const back = Math.min(src.chargeA, A(10 + rng() * S(src.chargeA)));
      const d0 = Number(src.iso.slice(8, 10));
      const iso = isoDate(y, m, rng.int(d0, lastDay(y, m)));
      const note = old ? (rng.chance(0.7) ? TYPE.refund : null) : rng.pick([null, null, TYPE.refund, "החזר כספי"]);
      lines.push({ iso, shop: src.shop, cat: src.cat, issuer: src.issuer, card: src.card, voucher: String(rng.int(1000000, 99999999)),
        type: TYPE.refund, chargeA: -back, dealA: -back, dealCur: "ILS", rate: null, note, refund: true, section: "main", kind: "refund" });
      counts.refund++;
    });
  }

  // ---- where the foreign lines go ---------------------------------------
  const nMain = lines.filter((l) => l.section === "main").length;
  const foreignAt = counts.foreign && nMain && cardMode === "single" && !old && rng.chance(0.35) ? "block" : "inline";
  if (foreignAt === "inline") lines.forEach((l) => { l.section = "main"; });
  const fKeys = foreignAt === "block" ? rng.pick(FOREIGN_KEYS) : null;

  const desc = rng.chance(0.5);                  // the digital site lists newest first
  const order = (a, b) => (desc ? b.iso.localeCompare(a.iso) : a.iso.localeCompare(b.iso));

  // ---- how the file writes things ----------------------------------------
  const dateYY = rng.chance(0.6);                // 03/09/26 - Cal's own habit
  const dateText = (iso) => { const [yy, mm, dd] = iso.split("-"); return dd + "/" + mm + "/" + (dateYY ? yy.slice(2) : yy); };
  const dateLong = (iso) => { const [yy, mm, dd] = iso.split("-"); return dd + "/" + mm + "/" + yy; };
  const moneyStyle = fmt === "csv" ? rng.pick(["general", "fixed", "comma", "comma", "shekel", "shekel"].concat(safe ? [] : ["locale"]))
    : fmt === "html" ? rng.pick(["fixed", "comma", "comma", "shekel", "shekel", "locale"])
      : rng.pick(["shekel", "shekel", "comma", "locale"]);           // xlsx cells written as text
  const xlsxMoneyNumbers = rng.chance(0.55);
  const symFirst = rng.chance(0.6);
  const symSpace = rng.chance(0.75);
  const negBeforeSym = rng.chance(0.5);
  const usdSym = rng.pick(["$", "USD"]);
  const eurSym = safe ? "EUR" : rng.pick(["€", "EUR"]);
  const ilsLabel = q(rng.pick(["₪", "₪", "ש\"ח", "ILS"]));
  const curLabel = (c) => (c === "USD" ? usdSym : c === "EUR" ? eurSym : ilsLabel);

  function moneyText(a, cur, curCol, st) {
    const neg = a < 0, v = Math.abs(a) / 100;
    const sym = cur === "USD" ? usdSym : cur === "EUR" ? eurSym : "₪";
    const num = st === "general" ? String(v) : st === "fixed" ? v.toFixed(2) : grouped(v);
    if (st === "locale") return "\u200f" + (neg ? "-" : "") + num + "\u00a0" + sym;   // what toLocaleString("he-IL") writes
    const withSym = st === "shekel" || (cur !== "ILS" && !curCol);
    if (!withSym) return (neg ? "-" : "") + num;
    const sp = symSpace || /[A-Z]/.test(sym) ? " " : "";
    if (symFirst) return neg ? (negBeforeSym ? "-" + sym + sp + num : sym + sp + "-" + num) : sym + sp + num;
    return (neg ? "-" : "") + num + " " + sym;
  }

  // ---- abstract rows ------------------------------------------------------
  // Built once, written out as CSV, xlsx or HTML below. A cell is null,
  // {k:"text"}, {k:"date"}, {k:"money"} or {k:"num"}.
  const tx = (s) => (s == null || s === "" ? null : { k: "text", s });
  const rows = [];
  const statementTotals = [];
  const fileOrder = [];
  const pushTitle = (s) => rows.push({ kind: "title", cells: [tx(q(s))] });
  const pushBlank = () => rows.push({ kind: "blank", cells: [] });
  const pushHeader = (ks) => rows.push({ kind: "header", cells: ks.map((k) => tx(q(headTitle(k)))), width: ks.length });
  const pushLine = (ks, l) => {
    const curCol = ks.indexOf("dealCur") !== -1;
    const cells = ks.map((k) => {
      switch (k) {
        case "date": return { k: "date", iso: l.iso };
        case "shop": return tx(l.shop);
        case "deal": return { k: "money", a: l.dealA, cur: l.dealCur, curCol };
        case "charge": return { k: "money", a: l.chargeA, cur: "ILS", curCol };
        case "chargeDate": return { k: "date", iso: chargeIso };
        case "type": return tx(l.type);
        case "sector": return tx(q(l.issuer));
        case "notes": return tx(l.note);
        case "card": return { k: "num", n: Number(l.card), s: l.card, numeric: cardNumeric };
        case "dealCur": return tx(curLabel(l.dealCur));
        case "chargeCur": return tx(ilsLabel);
        case "voucher": return { k: "num", n: Number(l.voucher), s: l.voucher, numeric: true };
        case "rate": return l.rate ? { k: "num", n: l.rate, s: l.rate.toFixed(4), numeric: true } : null;
      }
      return null;
    });
    while (cells.length && cells[cells.length - 1] == null) cells.pop();
    rows.push({ kind: "data", cells, width: ks.length });
    fileOrder.push({ l, hasSector: ks.indexOf("sector") !== -1 });
  };
  const sum = (ls) => ls.reduce((n, l) => n + l.chargeA, 0);
  // The label in the first column, the figure under the charge column.
  const pushTotal = (ks, label, a) => {
    if (a <= 0) return false;
    const ci = ks.indexOf("charge");
    const cells = new Array(ci + 1).fill(null);
    cells[0] = tx(lbl(label));
    cells[ci] = { k: "money", a, cur: "ILS", curCol: true };
    rows.push({ kind: "total", cells, width: ks.length });
    statementTotals.push(S(a));
    return true;
  };

  // ---- report lines above the table -------------------------------------
  const mainLines = lines.filter((l) => l.section === "main").sort(order);
  const foreignLines = lines.filter((l) => l.section === "foreign").sort(order);
  const grandA = sum(lines);
  const cardTitle = (i) => rng.pick([
    "לכרטיס " + brands[i] + " המסתיים ב-" + cards[i],
    "כרטיס " + brands[i] + " המסתיים ב-" + cards[i],
    brands[i] + " " + rng.pick(["זהב", "פלטינום", "עסקי", "כאל"]) + " - " + cards[i]
  ]);
  const titleCands = [
    rng.pick(["פירוט עסקאות", "פירוט עסקאות וזיכויים", "פירוט חיובים", "כאל - פירוט עסקאות"]),
    cardMode === "single" ? cardTitle(0) : rng.pick(["כל הכרטיסים", "כרטיסים: " + cards.join(", ")]),
    rng.pick(["לחיוב ב-" + dateLong(chargeIso), "עסקאות לחיוב ב-" + dateText(chargeIso), "מועד חיוב: " + dateLong(chargeIso)]),
    "הופק בתאריך " + dateLong(isoDate(cy, cm, rng.int(1, 28)))
  ];
  const nTitles = rng.int(0, 4);
  const titleIdx = rng.shuffle([0, 1, 2, 3]).slice(0, nTitles).sort((a, b) => a - b);
  const printTotals = rng.chance(0.9);
  const topTotal = printTotals && nTitles >= 2 && grandA > 0 && rng.chance(0.3);
  const topTotalTwoCells = rng.chance(0.5);
  titleIdx.forEach((i) => pushTitle(titleCands[i]));
  if (topTotal) {
    const label = rng.pick(["סה\"כ לחיוב:", "סך חיוב בש\"ח:", "סה\"כ חיוב לתאריך " + dateText(chargeIso) + ":"]);
    const fig = rng.chance(0.5) ? "₪ " + grouped(S(grandA)) : grouped(S(grandA)) + (rng.chance(0.5) ? " ₪" : " " + "ש\"ח");
    if (topTotalTwoCells && fmt !== "html") rows.push({ kind: "title", cells: [tx(lbl(label)), fmt === "xlsx" && xlsxMoneyNumbers ? { k: "money", a: grandA, cur: "ILS", curCol: true } : tx(q(fig))] });
    else rows.push({ kind: "title", cells: [tx(lbl(label) + " " + q(fig))] });
    statementTotals.push(S(grandA));
  }
  if (nTitles > 0 && rng.chance(0.4)) pushBlank();

  // ---- the tables -------------------------------------------------------
  const totalLabel = rng.pick(["סה\"כ", "סה\"כ לחיוב", "סה\"כ לחיוב", "סה\"כ חיוב"]);
  const blankBeforeTotal = rng.chance(0.12);
  const table = (ks, ls, label) => {
    pushHeader(ks);
    ls.forEach((l) => pushLine(ks, l));
    if (!printTotals) return;
    if (blankBeforeTotal) pushBlank();
    pushTotal(ks, label, sum(ls));
  };
  const grandLabel = () => rng.pick(["סה\"כ לחיוב", "סה\"כ לחיוב בש\"ח", "סה\"כ חיוב לתאריך " + dateText(chargeIso)]);
  let grandPrinted = false;
  if (cardMode === "sections") {
    cards.forEach((c, i) => {
      if (i > 0 && rng.chance(0.6)) pushBlank();
      pushTitle(cardTitle(i));
      table(keys, mainLines.filter((l) => l.card === c), rng.pick(["סה\"כ לכרטיס " + c, "סה\"כ", "סה\"כ לכרטיס"]));
    });
    if (printTotals && rng.chance(0.7)) { if (rng.chance(0.5)) pushBlank(); grandPrinted = pushTotal(keys, grandLabel(), grandA); }
  } else {
    table(keys, mainLines, totalLabel);
    if (foreignAt === "block") {
      if (rng.chance(0.6)) pushBlank();
      pushTitle(rng.pick(["עסקאות בחו\"ל", "עסקאות במט\"ח", "עסקאות בחו\"ל ובמט\"ח"]));
      table(fKeys, foreignLines, rng.pick(["סה\"כ עסקאות בחו\"ל", "סה\"כ חו\"ל", "סה\"כ"]));
      if (printTotals && rng.chance(0.6)) { if (rng.chance(0.4)) pushBlank(); grandPrinted = pushTotal(keys, grandLabel(), grandA); }
    }
  }
  const footnote = rng.chance(0.2) ? rng.pick([
    "* עסקאות בחו\"ל מחויבות לפי שער ההמרה ביום החיוב",
    "* הפירוט אינו כולל עסקאות שטרם נקלטו",
    "הנתונים נכונים לתאריך " + dateLong(isoDate(cy, cm, rng.int(1, 28))),
    "לשירות לקוחות כאל: *9111"
  ]) : null;
  if (footnote) { pushBlank(); pushTitle(footnote); rows[rows.length - 1].kind = "foot"; }
  const width = Math.max(keys.length, fKeys ? fKeys.length : 0);

  // ---- traps --------------------------------------------------------------
  const traps = ["deal + charge amount columns"];
  if (keys.indexOf("chargeDate") !== -1) traps.push("charge-date column" + (keys.indexOf("chargeDate") === keys.indexOf("charge") - 1 ? " between the amounts" : ""));
  if (keys.indexOf("card") !== -1) traps.push("card-number column");
  if (keys.indexOf("voucher") !== -1) traps.push("voucher-number column");
  if (keys.indexOf("dealCur") !== -1 || keys.indexOf("chargeCur") !== -1) traps.push("currency column");
  if (keys.indexOf("sector") !== -1) traps.push("issuer sector column (ענף)");
  if (old) traps.push("old 5-column layout (פירוט נוסף, no type column)");
  if (headStyle === "nl") traps.push("line break inside column titles");
  if (nTitles) traps.push("title lines (" + nTitles + ")");
  if (dateYY) traps.push("two-digit years");
  if (counts.inst) traps.push("installment");
  if (counts.credit) traps.push("credit plan (קרדיט)");
  if (counts.foreign) traps.push("foreign currency");
  if (fKeys && fKeys.indexOf("rate") !== -1) traps.push("conversion-rate column");
  if (counts.standing) traps.push("standing order");
  if (counts.refund) traps.push("refund");
  if (counts.suffix) traps.push("quote in shop name");
  if (counts.p2p) traps.push("p2p line (Bit/PayBox)");
  if (counts.discount) traps.push("discount note with a figure");
  if (lines.some((l) => l.issuer && l.issuer.indexOf(",") !== -1) && keys.indexOf("sector") !== -1) traps.push("comma inside a cell");
  if (cardMode === "sections") traps.push("multiple cards", "section header repeated", "subtotal per section");
  if (cardMode === "column") traps.push("multiple cards");
  if (foreignAt === "block") traps.push("second section in a different column order", "section header repeated", "subtotal per section");
  if (printTotals && statementTotals.length) traps.push("total row");
  if (grandPrinted) traps.push("grand total");
  if (topTotal) traps.push("total above the table");
  if (gersh) traps.push("gershayim in total label");
  if (desc) traps.push("newest first");
  if (footnote) traps.push("footnote line");
  if (blankBeforeTotal && printTotals) traps.push("blank line before total");

  // ---- render -------------------------------------------------------------
  let file, nameBits;
  if (fmt === "csv") {
    // What Excel writes when the user saves the sheet as CSV: CRLF (a line
    // break INSIDE a cell stays a bare LF, quoted), rows padded out to the
    // width of the table, numbers as the cell displayed them.
    const eol = rng.chance(0.75) ? "\r\n" : "\n";
    const bom = !safe && rng.chance(0.6);
    const pad = rng.chance(0.5);
    const excelQuotes = rng.chance(0.5);        // Excel quotes a cell with a quote in it; many tools do not
    const cellText = (c) => {
      if (!c) return "";
      if (c.k === "text") return c.s;
      if (c.k === "date") return dateText(c.iso);
      if (c.k === "money") return moneyText(c.a, c.cur, c.curCol, moneyStyle);
      return c.s;
    };
    const esc = (s) => (s.indexOf(",") !== -1 || /[\r\n]/.test(s) || /^"/.test(s) || (excelQuotes && s.indexOf("\"") !== -1)
      ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s);
    const out = rows.map((r) => {
      const cells = r.cells.map(cellText);
      if (pad) while (cells.length < width) cells.push("");
      return cells.map(esc).join(",");
    });
    let text = out.join(eol);
    if (rng.chance(0.5)) text += eol;
    file = { kind: "csv", text, encoding, bom };
    if (pad) traps.push("padded empty cells");
    const big = rows.some((r) => r.cells.some((c) => c && c.k === "money" && Math.abs(c.a) >= 100000));
    if ((moneyStyle === "comma" || moneyStyle === "shekel") && big) traps.push("thousands separator (quoted)");
    if (moneyStyle === "shekel") traps.push("shekel sign in amount");
    if (moneyStyle === "locale") traps.push("bidi mark and no-break space in amount");
    if (moneyStyle === "general") traps.push("amounts without trailing zeros");
    if (excelQuotes && counts.suffix) traps.push("quoted cell with doubled quote");
    nameBits = ["cal csv " + (safe ? "cp1255" : "utf-8" + (bom ? "+bom" : "")), eol === "\r\n" ? "crlf" : "lf", "money " + moneyStyle];
  } else if (fmt === "xlsx") {
    const dateMode = rng.pick(["cell", "custom", "text", "text"]);
    const inline = rng.chance(0.35);
    const T = (s) => (s == null || s === "" ? null : inline ? { inline: s } : s);
    const xCell = (c) => {
      if (!c) return null;
      if (c.k === "text") return T(c.s);
      if (c.k === "date") return dateMode === "text" ? T(dateText(c.iso)) : dateMode === "custom" ? { date: c.iso, custom: true } : { date: c.iso };
      if (c.k === "money") {
        if (xlsxMoneyNumbers && (c.cur === "ILS" || c.curCol)) return { n: S(c.a) };
        return T(moneyText(c.a, c.cur, c.curCol, xlsxMoneyNumbers ? "fixed" : moneyStyle));
      }
      return c.numeric ? { n: c.n } : T(c.s);
    };
    const sheetRows = rows.map((r) => r.cells.map(xCell));
    file = { kind: "xlsx", sheets: [{ name: rng.pick(["פירוט עסקאות", "עסקאות", "Sheet1", "גיליון1"]), rows: sheetRows }] };
    if (dateMode === "text") traps.push("text dates in xlsx");
    if (!xlsxMoneyNumbers) traps.push("amounts as text with currency sign");
    if (!xlsxMoneyNumbers && moneyStyle === "locale") traps.push("bidi mark and no-break space in amount");
    if (xlsxMoneyNumbers && counts.foreign && keys.indexOf("dealCur") === -1) traps.push("foreign deal amount as text in a number column");
    if (cardNumeric && keys.indexOf("card") !== -1) traps.push("card digits as numbers");
    nameBits = ["cal xlsx", "dates " + dateMode, xlsxMoneyNumbers ? "money numbers" : "money text " + moneyStyle];
  } else {
    // The .xls that is an HTML page. Excel's own HTML flavour sometimes (the
    // office namespaces, a <style> block, an XML island in a comment),
    // sometimes a bare table inside a layout table; closing tags missing
    // here and there, entities for the quote, the shekel and the blanks.
    const excelFlavour = rng.chance(0.4);
    const layoutTable = rng.chance(0.5);
    const titlesInside = rng.chance(0.6);
    const thHeader = rng.chance(0.5);
    const quoteEnt = rng.chance(0.5);
    const shekelEnt = rng.chance(0.3);
    const sloppy = rng.chance(0.3);
    const spanMoney = rng.chance(0.2);
    const colspanTotals = rng.chance(0.4);
    const nbspBlank = rng.chance(0.5);
    const br = rng.pick(["<br>", "<br/>", "<br />"]);
    const hEsc = (s) => {
      let t = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (quoteEnt) t = t.replace(/"/g, "&quot;");
      if (shekelEnt) t = t.replace(/₪/g, "&#8362;");
      t = t.replace(/\u00a0/g, "&nbsp;");
      return t.replace(/\n/g, br);
    };
    const cellHtml = (c) => {
      if (!c) return nbspBlank ? "&nbsp;" : "";
      if (c.k === "text") return hEsc(c.s);
      if (c.k === "date") return hEsc(dateText(c.iso));
      if (c.k === "money") { const s = hEsc(moneyText(c.a, c.cur, c.curCol, moneyStyle)); return spanMoney ? "<span dir=\"ltr\">" + s + "</span>" : s; }
      return hEsc(c.s);
    };
    const ind = "    ";
    const html = [];
    if (excelFlavour) {
      html.push("<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\" xmlns=\"http://www.w3.org/TR/REC-html40\">");
      html.push("<head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\">");
      html.push("<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>פירוט עסקאות</x:Name><x:WorksheetOptions><x:DisplayRightToLeft/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->");
      html.push("<style>td{mso-number-format:\"\\@\";font-family:Arial;} .num{mso-number-format:\"#,##0.00\";}</style></head>");
    } else {
      html.push("<html dir=\"rtl\"><head><meta charset=\"utf-8\"><title>" + hEsc(titleCands[0]) + "</title></head>");
    }
    html.push("<body dir=\"rtl\">");
    const titleRows = [], tableRows = [], footRows = [];
    let seenHeader = false;
    rows.forEach((r) => {
      if (!seenHeader && r.kind === "header") seenHeader = true;
      if (!seenHeader && !titlesInside) { if (r.kind === "title") titleRows.push(r); return; }
      if (r.kind === "foot" && layoutTable) { footRows.push(r); return; }
      tableRows.push(r);
    });
    titleRows.forEach((r) => html.push("<div><b>" + hEsc(r.cells[0].s) + "</b></div>"));
    if (layoutTable) html.push("<table width=\"100%\"><tr><td>");
    html.push("  <table border=\"1\" cellpadding=\"2\" dir=\"rtl\">");
    tableRows.forEach((r) => {
      const close = sloppy && r.kind === "data" && rng.chance(0.4) ? "" : "</td>";
      if (r.kind === "title" || r.kind === "foot") {
        html.push(ind + "<tr><td" + (rng.chance(0.6) ? " colspan=\"" + width + "\"" : "") + ">" + hEsc(r.cells[0].s) + "</td></tr>");
      } else if (r.kind === "blank") {
        html.push(ind + (rng.chance(0.5) ? "<tr><td colspan=\"" + width + "\">&nbsp;</td></tr>" : "<tr><td></td></tr>"));
      } else if (r.kind === "header") {
        html.push(ind + "<tr>" + r.cells.map((c) => (thHeader ? "<th>" + hEsc(c.s) + "</th>" : "<td><b>" + hEsc(c.s) + "</b></td>")).join("") + "</tr>");
      } else if (r.kind === "total" && colspanTotals) {
        const ci = r.cells.length - 1;
        html.push(ind + "<tr><td colspan=\"" + ci + "\"><b>" + cellHtml(r.cells[0]) + "</b></td><td class=\"num\"><b>" + cellHtml(r.cells[ci]) + "</b></td></tr>");
      } else {
        const cells = r.cells.slice();
        while (cells.length < r.width) cells.push(null);
        html.push(ind + "<tr>" + cells.map((c) => (c && c.k === "money" ? "<td class=\"num\" nowrap>" : "<td>") + cellHtml(c) + close).join("") + "</tr>");
      }
    });
    html.push("  </table>");
    if (layoutTable) {
      html.push("</td></tr>");
      footRows.forEach((r) => html.push("<tr><td>" + hEsc(r.cells[0].s) + "</td></tr>"));
      html.push("</table>");
    }
    html.push("</body></html>");
    file = { kind: "html", text: html.join("\n") };
    if (excelFlavour) traps.push("Excel HTML flavour (style block, xml island)");
    if (layoutTable) traps.push("nested layout table");
    if (!titlesInside && titleRows.length) traps.push("titles outside the table");
    if (sloppy) traps.push("missing </td>");
    if (colspanTotals && statementTotals.length) traps.push("colspan on total row");
    if (shekelEnt && /shekel|locale/.test(moneyStyle)) traps.push("shekel as numeric entity");
    if (quoteEnt) traps.push("&quot; entities");
    if (spanMoney) traps.push("amounts wrapped in span");
    if (moneyStyle === "locale") traps.push("bidi mark and no-break space in amount");
    nameBits = ["cal html-xls", excelFlavour ? "excel flavour" : "plain", "money " + moneyStyle];
  }

  // ---- truth, in file order ---------------------------------------------
  const truth = fileOrder.map(({ l, hasSector }) => {
    const t = {
      date: l.iso,
      amount: S(Math.abs(l.chargeA)),
      type: l.chargeA < 0 ? "income" : "expense",
      shop: l.shop,
      cat: l.cat,
      transfer: false,
      refund: l.refund
    };
    if (hasSector) t.issuer = q(l.issuer);
    return t;
  });

  nameBits.splice(1, 0, old ? "old layout" : "titles " + headStyle);
  nameBits.push(truth.length + " lines");
  if (cardMode !== "single") nameBits.push(nCards + " cards (" + cardMode + ")");
  if (counts.inst) nameBits.push(counts.inst + " installments");
  if (counts.foreign) nameBits.push(counts.foreign + " foreign" + (foreignAt === "block" ? " (block)" : ""));
  if (counts.refund) nameBits.push(counts.refund + " refund" + (counts.refund > 1 ? "s" : ""));
  if (!printTotals) nameBits.push("no total");
  return { name: nameBits.join(", "), kind: "card", file, truth, statementTotals, traps };
}

export default {
  id: "cal",
  describe: "Cal (Visa Cal) transaction export: CSV / xlsx / HTML .xls, report lines, deal + charge amounts, dd/mm/yy, installments, foreign, refunds, סה\"כ rows",
  make
};
