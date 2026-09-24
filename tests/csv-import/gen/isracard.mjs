// Isracard / American Express (Isracard group) card statement.
//
// What the "export to Excel" on the Isracard site hands out, in the three
// forms it reaches Richy: the .xlsx itself, the CSV a person gets by opening
// that sheet in Excel and saving it (windows-1255 from "CSV (Comma
// delimited)" on a Hebrew Windows, UTF-8 with a BOM from "CSV UTF-8"), and the
// older .xls that is really an HTML page.
//
// Shape of the real file:
//   a few title lines         פירוט עסקאות / <card> - 1234 / עסקאות למועד חיוב 02/10/2026
//   domestic section          תאריך רכישה | שם בית עסק | סכום עסקה | מטבע עסקה | סכום חיוב | מטבע חיוב | מס' שובר | פירוט נוסף
//     rows                    installments carry the FULL price in סכום עסקה and this month's
//                             payment in סכום חיוב, with "תשלום 3 מתוך 10" in פירוט נוסף;
//                             refunds are negative
//     total row               סך חיוב בש"ח: in the date column, the figure under סכום חיוב
//   abroad section            עסקאות בחו"ל, with its OWN title row in ANOTHER column order:
//                             תאריך רכישה | תאריך חיוב | שם בית עסק | מטבע מקור | סכום מקורי | סכום חיוב ...
//     rows                    USD/EUR/GBP original amount, shekel charge
//     (per-date subtotals)    "TOTAL FOR DATE" rows, dated, voucher 000000000
//     total row
//   (grand total)             סה"כ לחיוב
// An "all cards" export repeats the card title and both sections per card.
//
// Every one of those is a way for an importer to count money twice or read
// the wrong column - which is how a 4,900 shekel month turns into 10,000.
import { SHOPS, BANK_OUT, round2, isoDate, randomDay, fmtDate, fmtMoney, csvLine, withSuffix } from "./_lib.mjs";

// ------------------------------------------------------------ small helpers --
const T = (v) => ({ t: "text", v });
const D = (v) => ({ t: "date", v });
const M = (v) => ({ t: "money", v });
const I = (v) => ({ t: "id", v });

const cents = (n) => Math.round(n * 100);
const netOf = (lines) => lines.reduce((s, l) => s + (l.type === "expense" ? cents(l.amount) : -cents(l.amount)), 0) / 100;

function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return isoDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
function addMonths(iso, k) {
  const [y, m, d] = iso.split("-").map(Number);
  const idx = y * 12 + (m - 1) + k;
  const yy = Math.floor(idx / 12), mm = (idx % 12) + 1;
  const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  return isoDate(yy, mm, Math.min(d, last));
}
const monthEnd = (y, m) => isoDate(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate());
const minIso = (a, b) => (a < b ? a : b);
const shop = (name) => SHOPS.find((s) => s.name === name);
function weighted(rng, pairs) {
  let x = rng() * pairs.reduce((s, p) => s + p[1], 0);
  for (const [v, w] of pairs) { if ((x -= w) < 0) return v; }
  return pairs[pairs.length - 1][0];
}

// ------------------------------------------------------------------- pools --
const HEB_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const CARD_NAMES = [
  "ישראכרט", "ישראכרט זהב", "ישראכרט פלטינום", "מסטרקארד", "מסטרקארד זהב", "מסטרקארד פלטינום",
  "אמריקן אקספרס", "אמריקן אקספרס זהב", "אמריקן אקספרס פלטינום", "אמריקן אקספרס בלו", "FLY CARD מסטרקארד"
];
// Big-ticket shops people split into payments.
const INSTALLMENT_SHOPS = ["איקאה נתניה", "KSP", "באג מולטיסיסטם", "אל על", "ישראייר", "BOOKING.COM", "הולמס פלייס", "זארה", "AMAZON MKTPLACE"];
const NUM_PAYMENTS = [2, 3, 3, 4, 5, 6, 6, 8, 10, 12, 12, 18, 24, 36];
// Shops that bill by standing order ("הוראת קבע" in פירוט נוסף).
const STANDING = new Set(["חברת החשמל לישראל", "בזק", "הוט מובייל", "פרטנר תקשורת", "סלקום", "עיריית תל אביב ארנונה", "מי אביבים", "NETFLIX.COM", "SPOTIFY", "יס פלאנט", "הולמס פלייס", "מכבי שירותי בריאות"]);
// The shops that land in the abroad section, with the currencies and the
// cities the acquirer reports for them.
const ABROAD = [
  { name: "NETFLIX.COM", cur: ["USD", "EUR"], cities: ["LOS GATOS", "AMSTERDAM"] },
  { name: "SPOTIFY", cur: ["EUR", "USD"], cities: ["STOCKHOLM"] },
  { name: "STEAM GAMES", cur: ["USD", "EUR"], cities: ["BELLEVUE", "SEATTLE"] },
  { name: "ALIEXPRESS", cur: ["USD"], cities: ["LUXEMBOURG", "HANGZHOU"] },
  { name: "AMAZON MKTPLACE", cur: ["USD", "EUR", "GBP"], cities: ["SEATTLE", "LUXEMBOURG", "LONDON"] },
  { name: "SHEIN", cur: ["USD", "EUR"], cities: ["SINGAPORE", "DUBLIN"] },
  { name: "BOOKING.COM", cur: ["EUR", "USD", "GBP"], cities: ["AMSTERDAM"] },
  { name: "WOLT", cur: ["EUR"], cities: ["HELSINKI", "BERLIN", "ATHENS"] }
];
const RATES = { USD: [3.52, 3.86], EUR: [3.88, 4.24], GBP: [4.46, 4.96] };
const CUR_SYMBOL = { USD: "$", EUR: "€", GBP: "£" };
const P2P = BANK_OUT.filter((b) => b.p2p);

// ------------------------------------------------------------------- lines --
function domesticLines(rng, nD, y, m, clean) {
  let left = nD;
  const nInst = left >= 2 && rng.chance(0.35) ? rng.int(1, Math.min(3, left - 1)) : 0; left -= nInst;
  const nP2p = left >= 3 && rng.chance(0.15) ? rng.int(1, Math.min(2, left - 2)) : 0; left -= nP2p;
  const nFee = left >= 3 && rng.chance(0.1) ? 1 : 0; left -= nFee;
  // Each refund takes back (part of) a DIFFERENT purchase, and at least one
  // purchase stays whole - so the section's net is always above zero.
  const nRef = left >= 3 && rng.chance(0.35) ? rng.int(1, Math.min(2, Math.floor((left - 1) / 2))) : 0; left -= nRef;
  const voucher = () => String(rng.int(1000000, 999999999));

  const regular = [];
  for (let i = 0; i < left; i++) {
    const s = rng.pick(SHOPS);
    const amount = round2(s.lo + rng() * (s.hi - s.lo));
    regular.push({
      date: randomDay(rng, y, m), amount, amt: amount, charge: amount, type: "expense",
      shop: clean(withSuffix(rng, s.name)), cat: s.cat, kw: !!s.kw, voucher: voucher(),
      more: STANDING.has(s.name) && rng.chance(0.5) ? "הוראת קבע" : ""
    });
  }
  const out = regular.slice();
  for (let i = 0; i < nInst; i++) {
    const s = shop(rng.pick(INSTALLMENT_SHOPS));
    const n = rng.pick(NUM_PAYMENTS);
    const k = rng.int(1, n);
    const full = rng.int(600, 6000) * 100 + rng.pick([0, 0, 90, 50, rng.int(1, 99)]);
    const base = Math.floor(full / n);
    const first = full - base * (n - 1);                // the rounding agorot ride on the first payment
    const charge = (k === 1 ? first : base) / 100;
    out.push({
      date: addMonths(randomDay(rng, y, m), -(k - 1)), amount: charge, amt: full / 100, charge, type: "expense",
      shop: clean(withSuffix(rng, s.name)), cat: s.cat, kw: !!s.kw, voucher: voucher(),
      more: "תשלום " + k + " מתוך " + n, inst: { k, n }
    });
  }
  for (let i = 0; i < nP2p; i++) {
    const p = rng.pick(P2P);
    const amount = round2(p.lo + rng() * (p.hi - p.lo));
    out.push({ date: randomDay(rng, y, m), amount, amt: amount, charge: amount, type: "expense", shop: p.name, cat: null, voucher: voucher(), more: "", p2p: true });
  }
  for (let i = 0; i < nFee; i++) {
    const amount = rng.pick([9.9, 12.9, 14.9, 19.9, 24.9]);
    out.push({ date: isoDate(y, m, rng.pick([1, 2, 10, 15])), amount, amt: amount, charge: amount, type: "expense", shop: "דמי כרטיס", cat: "Other", voucher: voucher(), more: "", fee: true });
  }
  rng.shuffle(regular).slice(0, nRef).forEach((src) => {
    const amount = rng.chance(0.5) ? src.amount : Math.min(src.amount, round2(Math.max(1, src.amount * (0.2 + 0.7 * rng()))));
    out.push({
      date: minIso(addDays(src.date, rng.int(0, 12)), monthEnd(y, m)), amount, amt: -amount, charge: -amount,
      type: "income", refund: true, shop: src.shop, cat: src.cat, kw: src.kw, voucher: voucher(),
      more: rng.chance(0.5) ? "זיכוי" : ""
    });
  });
  const desc = rng.chance(0.15);
  return out.sort((a, b) => (desc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
}

function abroadLines(rng, nA, y, m, clean) {
  const withRefund = nA >= 3 && rng.chance(0.12);
  const out = [];
  const voucher = () => String(rng.int(1000000, 999999999));
  for (let i = 0; i < nA - (withRefund ? 1 : 0); i++) {
    const a = rng.pick(ABROAD);
    const s = shop(a.name);
    const cur = rng.pick(a.cur);
    const [rlo, rhi] = RATES[cur];
    const rate = rlo + rng() * (rhi - rlo);
    const target = s.lo + rng() * (s.hi - s.lo);           // what it should cost in shekels
    const orig = Math.max(0.99, round2(target / rate));
    const charge = round2(orig * rate);
    const city = rng.pick(a.cities);
    const date = randomDay(rng, y, m);
    out.push({
      date, post: addDays(date, rng.int(1, 4)), amount: charge, charge, orig, cur, city, type: "expense",
      shop: clean(rng.chance(0.2) ? a.name + " " + city : a.name), cat: s.cat, kw: !!s.kw, voucher: voucher(), more: ""
    });
  }
  if (withRefund) {
    const src = rng.pick(out);
    const date = minIso(addDays(src.date, rng.int(1, 10)), monthEnd(y, m));
    out.push({ ...src, date, post: addDays(date, rng.int(1, 3)), charge: -src.charge, orig: -src.orig, type: "income", refund: true, voucher: voucher(), more: rng.chance(0.5) ? "זיכוי" : "" });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------- renderers --
function textOf(c, o, rng) {
  if (!c) return "";
  switch (c.t) {
    case "date": return fmtDate(c.v, o.dateStyle);
    case "money": return fmtMoney(c.v, o.moneyStyle, rng);
    default: return String(c.v);
  }
}

function renderCsv(rows, o, rng) {
  const width = Math.max(...rows.map((r) => r.length));
  const eol = o.crlf ? "\r\n" : "\n";
  const lines = rows.map((r) => {
    const cells = r.map((c) => textOf(c, o, rng));
    if (o.pad) while (cells.length < width) cells.push("");          // what Excel writes: every row as wide as the sheet
    return csvLine(cells, ",");
  });
  return lines.join(eol) + (o.trailingEol ? eol : "");
}

function renderXlsx(rows, o, rng) {
  const str = (s) => (o.inline ? { inline: s } : s);
  return rows.map((r) => r.map((c) => {
    if (!c) return null;
    switch (c.t) {
      case "text": return str(c.v);
      case "date":
        if (o.dateCells === "text") return str(fmtDate(c.v, o.dateStyle));
        return o.dateCells === "custom" ? { date: c.v, custom: true } : { date: c.v };
      case "money": return o.numbers ? { n: c.v } : str(fmtMoney(c.v, o.moneyStyle, rng));
      case "id": return o.numbers ? { n: Number(c.v) } : str(String(c.v));
      default: return null;
    }
  }));
}

function renderHtml(rows, o, rng) {
  const width = Math.max(...rows.map((r) => r.length));
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, o.quoteEntity ? "&quot;" : "\"");
  const out = [
    "<html dir=\"rtl\"><head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"><title>" + esc(o.htmlTitle) + "</title></head><body>",
    "<table width=\"100%\" border=\"0\"><tr><td>",
    "  <table border=\"1\" cellspacing=\"0\" cellpadding=\"2\">"
  ];
  rows.forEach((r) => {
    if (r.length === 0) { out.push("    <tr><td colspan=\"" + width + "\">&nbsp;</td></tr>"); return; }
    if (r.length === 1 && r[0].t === "text") { out.push("    <tr><td colspan=\"" + width + "\"><b>" + esc(r[0].v) + "</b></td></tr>"); return; }
    if (r.header) { out.push("    <tr>" + r.map((c) => "<th>" + esc(textOf(c, o, rng)) + "</th>").join("") + "</tr>"); return; }
    const cells = r.map((c) => {
      const s = textOf(c, o, rng);
      return "<td>" + (s ? esc(s) : "&nbsp;") + (o.dropCloseTd && rng.chance(0.3) ? "" : "</td>");
    });
    out.push("    <tr>" + cells.join("") + "</tr>");
  });
  out.push("  </table>");
  out.push(o.htmlFooter ? "</td></tr><tr><td>הודפס מאתר ישראכרט</td></tr></table>" : "</td></tr></table>");
  out.push("</body></html>");
  return out.join(o.crlf ? "\r\n" : "\n");
}

// --------------------------------------------------------------- generator --
export default {
  id: "isracard",
  describe: "Isracard / Amex card statement: title lines, domestic section, abroad section with its own header in another column order, section/grand totals, installments, foreign currency, refunds - as CSV (cp1255/utf-8), .xlsx and the HTML .xls",
  make(rng) {
    const format = weighted(rng, [["csv", 50], ["xlsx", 35], ["html", 15]]);
    const cp = format === "csv" && rng.chance(0.6);
    const encoding = cp ? "windows-1255" : "utf-8";
    const bom = format === "csv" && !cp && rng.chance(0.7);
    // cp1255 has no gershayim and no double-acute: those files write a plain ".
    const clean = (s) => (cp ? s.replace(/[״˝]/g, "\"") : s);
    const traps = [];
    const trap = (t) => { if (!traps.includes(t)) traps.push(t); };

    // The statement: purchases in month m, charged in month m+1.
    const mi = rng.int(0, 19);                              // 2025-01 .. 2026-08
    const y = 2025 + Math.floor(mi / 12), m = (mi % 12) + 1;
    const chargeIso = addMonths(isoDate(y, m, rng.pick([2, 10, 15])), 1);
    const producedIso = addDays(chargeIso, -rng.int(1, 20));

    const o = {
      dateStyle: rng.chance(0.8) ? "dmy" : "dmy2",
      moneyStyle: weighted(rng, [["plain", 50], ["comma", 40], ["shekel", 10]]),
      shekel: rng.chance(0.55) ? "₪" : "ש\"ח",
      curSymbols: !cp && rng.chance(0.35),
      crlf: rng.chance(0.75),
      pad: rng.chance(0.6),
      trailingEol: rng.chance(0.7),
      dateCells: weighted(rng, [["text", 50], ["builtin", 25], ["custom", 25]]),
      numbers: rng.chance(0.8),
      inline: rng.chance(0.3),
      quoteEntity: rng.chance(0.5),
      dropCloseTd: rng.chance(0.4),
      htmlFooter: rng.chance(0.5),
      htmlTitle: "פירוט עסקאות"
    };
    if (format === "xlsx") { o.moneyStyle = o.numbers ? "plain" : o.moneyStyle; if (o.dateCells !== "text") o.dateStyle = "dmy"; }
    const curText = (cur) => (o.curSymbols && (cur === "USD" || rng.chance(0.7)) ? CUR_SYMBOL[cur] : cur);

    // ------------------------------------------------------- the lines --
    const nCards = rng.chance(0.15) ? 2 : 1;
    let N = rng.int(3, 60);
    if (nCards === 2) N = Math.max(N, 4);
    const sizes = nCards === 1 ? [N] : (() => { const a = rng.int(2, N - 2); return [a, N - a]; })();
    const last4s = [];
    const cards = sizes.map((n) => {
      const hasAbroad = n >= 2 && rng.chance(0.55);
      // Abroad is the smaller part of a real month: at most about half the lines, never more than 10.
      const nA = hasAbroad ? rng.int(1, Math.min(10, Math.max(1, Math.ceil((n - 1) / 2)))) : 0;
      let last4 = String(rng.int(1000, 9999));
      while (last4s.includes(last4)) last4 = String(Number(last4) % 9999 + 1).padStart(4, "1");
      last4s.push(last4);
      return {
        name: rng.pick(CARD_NAMES), last4,
        dom: domesticLines(rng, n - nA, y, m, clean),
        abroad: nA ? abroadLines(rng, nA, y, m, clean) : []
      };
    });
    const cardTitle = (c) => clean(rng.pick([c.name + " - " + c.last4, c.name + " המסתיים בספרות " + c.last4, "כרטיס " + c.name + " " + c.last4, c.name + " " + c.last4]));

    // ------------------------------------------------------- the layout --
    const DT = {
      date: rng.chance(0.85) ? "תאריך רכישה" : "תאריך עסקה",
      name: rng.chance(0.8) ? "שם בית עסק" : "שם בית העסק",
      amt: "סכום עסקה", amtCur: "מטבע עסקה", charge: "סכום חיוב", chargeCur: "מטבע חיוב",
      voucher: rng.chance(0.8) ? "מס' שובר" : "מספר שובר", more: "פירוט נוסף"
    };
    const domCols = ["date", "name", "amt"];
    const domCur = rng.chance(0.85);
    if (domCur) domCols.push("amtCur");
    domCols.push("charge");
    if (domCur) domCols.push("chargeCur");
    if (rng.chance(0.85)) domCols.push("voucher");
    const anyInst = cards.some((c) => c.dom.some((l) => l.inst));
    if (anyInst || rng.chance(0.9)) domCols.push("more");

    const AT = {
      date: "תאריך רכישה", postDate: "תאריך חיוב", name: "שם בית עסק", city: "עיר",
      origCur: "מטבע מקור", origAmt: "סכום מקורי", chargeCur: "מטבע לחיוב", charge: "סכום חיוב",
      voucher: DT.voucher, more: "פירוט נוסף"
    };
    const abCols = ["date", "postDate", "name"];
    if (rng.chance(0.4)) abCols.push("city");
    if (rng.chance(0.5)) abCols.push("origCur", "origAmt"); else abCols.push("origAmt", "origCur");
    const abChargeCur = rng.chance(0.7);
    if (abChargeCur && rng.chance(0.5)) abCols.push("chargeCur", "charge");
    else { abCols.push("charge"); if (abChargeCur) abCols.push("chargeCur"); }
    if (rng.chance(0.7)) abCols.push("voucher");
    if (rng.chance(0.6)) abCols.push("more");

    const header = (cols, titles) => { const r = cols.map((c) => T(titles[c])); r.header = true; return r; };
    const domRow = (l) => domCols.map((c) => {
      switch (c) {
        case "date": return D(l.date);
        case "name": return T(l.shop);
        case "amt": return M(l.amt);
        case "amtCur": case "chargeCur": return T(o.shekel);
        case "charge": return M(l.charge);
        case "voucher": return I(l.voucher);
        case "more": return l.more ? T(l.more) : null;
        default: return null;
      }
    });
    const abRow = (l) => abCols.map((c) => {
      switch (c) {
        case "date": return D(l.date);
        case "postDate": return D(l.post);
        case "name": return T(l.shop);
        case "city": return T(l.city);
        case "origCur": return T(curText(l.cur));
        case "origAmt": return M(l.orig);
        case "chargeCur": return T(o.shekel);
        case "charge": return M(l.charge);
        case "voucher": return I(l.voucher);
        case "more": return l.more ? T(l.more) : null;
        default: return null;
      }
    });
    // A total: the label where the date goes, the figure under סכום חיוב.
    const totalRow = (cols, label, figure) => {
      const ci = cols.indexOf("charge");
      const row = new Array(ci + 1).fill(null);
      row[0] = T(clean(label));
      row[ci] = M(figure);
      if (cols[ci + 1] === "chargeCur" && rng.chance(0.5)) row.push(T(o.shekel));
      return row;
    };

    const rows = [];
    const truth = [];
    const statementTotals = [];
    const printTotal = (row, figure) => { rows.push(row); statementTotals.push(figure); };
    const addTruth = (l) => {
      const t = { date: l.date, amount: l.amount, type: l.type, shop: l.shop, cat: l.cat, transfer: false, refund: !!l.refund };
      if (l.kw !== undefined) t.kw = l.kw;
      truth.push(t);
    };
    const empties = (lo, hi) => { const k = rng.int(lo, hi); for (let i = 0; i < k; i++) rows.push([]); if (k) trap("empty rows"); };

    // Title lines above everything.
    const chargeLine = rng.pick(["עסקאות למועד חיוב ", "מועד חיוב: ", "לחיוב בתאריך "]) + fmtDate(chargeIso, o.dateStyle);
    const pool = [
      rng.pick(["פירוט עסקאות", "פירוט חיובים", "פירוט עסקאות וחיובים", "פירוט עסקאות לכרטיס"]),
      nCards === 1 ? cardTitle(cards[0]) : null,
      chargeLine,
      rng.pick(["הופק בתאריך ", "תאריך הפקה: "]) + fmtDate(producedIso, o.dateStyle),
      HEB_MONTHS[Number(chargeIso.slice(5, 7)) - 1] + " " + chargeIso.slice(0, 4)
    ].map((s, i) => [s, i]).filter((p) => p[0] !== null);
    const k = rng.int(0, Math.min(4, pool.length));
    const titles = rng.shuffle(pool).slice(0, k).sort((a, b) => a[1] - b[1]).map((p) => p[0]);
    titles.forEach((s) => rows.push([T(s)]));
    if (k) {
      trap("title lines above the header");
      if (titles.includes(chargeLine)) trap("charge date inside a title line");
      if (titles.some((s) => / - \d{4}$/.test(s))) trap("card number after a dash in a title");
      if (rng.chance(0.5)) empties(1, 1);
    }

    const domSectionTitle = rng.chance(0.35);
    const abroadTitle = cp ? "עסקאות בחו\"ל" : rng.pick(["עסקאות בחו\"ל", "עסקאות בחו˝ל", "עסקאות בחו״ל"]);
    let lastCols = domCols;
    let nInst = 0, nRef = 0, nAbroad = 0;

    cards.forEach((card, ci) => {
      if (ci > 0) empties(1, 2);
      if (nCards > 1) { rows.push([T(cardTitle(card))]); trap("two cards in one file, header repeated per card"); }

      // Domestic.
      if (domSectionTitle) { rows.push([T("עסקאות בארץ")]); trap("section title rows"); }
      rows.push(header(domCols, DT));
      card.dom.forEach((l) => {
        rows.push(domRow(l));
        addTruth(l);
        if (l.inst) nInst++;
        if (l.refund) nRef++;
        if (l.p2p) trap("p2p line on the card (category unknown)");
        if (l.fee) trap("card fee line");
        if (l.more === "הוראת קבע") trap("standing order note in פירוט נוסף");
        if (/"/.test(l.shop)) trap(format === "csv" ? "unescaped quote in a shop name (בע\"מ)" : "quote mark inside a shop name (בע\"מ)");
        if (/[״]/.test(l.shop)) trap("gershayim in a shop name");
      });
      lastCols = domCols;
      const domNet = netOf(card.dom);
      // Isracard always prints the domestic total; what varies is its wording.
      printTotal(totalRow(domCols, rng.pick(["סך חיוב בש\"ח:", "סך חיוב בש\"ח:", "סה\"כ חיוב בש\"ח", "סה\"כ", "סך הכל"]), domNet), domNet);
      trap("total row (label in the date column, figure under סכום חיוב)");

      // Abroad: its own title row, in another column order.
      if (card.abroad.length) {
        nAbroad += card.abroad.length;
        trap("abroad section with its own header in a different column order");
        trap("foreign currency (original amount next to the shekel charge)");
        empties(0, 2);
        if (rng.chance(0.9)) { rows.push([T(abroadTitle)]); trap("section title rows"); }
        rows.push(header(abCols, AT));
        const hasRefund = card.abroad.some((l) => l.refund);
        const perDate = !hasRefund && rng.chance(0.15);
        let lines = card.abroad;
        if (perDate) lines = lines.slice().sort((a, b) => a.post.localeCompare(b.post) || a.date.localeCompare(b.date));
        let group = [];
        const flushGroup = () => {
          if (!group.length) return;
          const post = group[0].post, sum = netOf(group);
          const row = abCols.map((c) => (c === "date" || c === "postDate") ? D(post)
            : c === "name" ? T("TOTAL FOR DATE")
            : c === "charge" ? M(sum)
            : c === "voucher" ? T("000000000")
            : c === "chargeCur" ? T(o.shekel) : null);
          printTotal(row, sum);
          trap("per-date 'TOTAL FOR DATE' subtotal rows (dated, voucher 000000000)");
          group = [];
        };
        lines.forEach((l) => {
          if (perDate && group.length && group[0].post !== l.post) flushGroup();
          rows.push(abRow(l));
          addTruth(l);
          if (l.refund) { nRef++; trap("refund in the abroad section"); }
          if (perDate) group.push(l);
        });
        if (perDate) flushGroup();
        lastCols = abCols;
        const abNet = netOf(card.abroad);
        if (rng.chance(perDate ? 0.7 : 0.9)) {
          printTotal(totalRow(abCols, rng.pick(["סך חיוב בש\"ח:", "סך חיוב בש\"ח:", "סה\"כ חיוב חו\"ל", "סך הכל עסקאות בחו\"ל", "TOTAL"]), abNet), abNet);
          trap("abroad total row under a different column than the domestic one");
        }
        if (nCards > 1 && rng.chance(0.5)) {
          const cardNet = netOf(card.dom.concat(card.abroad));
          printTotal(totalRow(abCols, "סה\"כ לכרטיס " + card.last4, cardNet), cardNet);
          trap("per-card total with the card number in its label");
        }
      }
    });

    // Grand total at the very end.
    const allNet = netOf(cards.flatMap((c) => c.dom.concat(c.abroad)));
    if (rng.chance(nCards > 1 || nAbroad ? 0.45 : 0.15)) {
      const label = clean(rng.pick(["סה\"כ לחיוב", "סך הכל לחיוב בש\"ח", "סה\"כ חיוב לתאריך " + fmtDate(chargeIso, o.dateStyle), "TOTAL"]));
      const row = rng.chance(0.3) ? [T(label), M(allNet)] : totalRow(lastCols, label, allNet);
      printTotal(row, allNet);
      trap("grand total at the end");
    }
    if (rng.chance(0.15)) {
      empties(0, 1);
      rows.push([T(clean(rng.pick(["המידע המוצג אינו מהווה אסמכתא לחיוב", "לבירורים פנו למוקד שירות הלקוחות", "* עסקאות בחו\"ל מחויבות לפי שער ההמרה ביום החיוב"])))]);
      trap("footer text line");
    }

    if (nInst) trap("installment (full price in סכום עסקה, this month's payment in סכום חיוב)");
    if (nRef) trap("refund as a negative charge");
    if (domCur || abChargeCur) trap("currency column next to the amount");
    if (domCols.includes("voucher") || abCols.includes("voucher")) trap("voucher-number column");

    // ------------------------------------------------------- the file --
    let file;
    const bits = [];
    if (format === "csv") {
      const text = renderCsv(rows, o, rng);
      file = { kind: "csv", text, encoding, bom };
      bits.push("csv " + (cp ? "cp1255" : "utf-8") + (bom ? " bom" : "") + (o.crlf ? " crlf" : " lf") + (o.pad ? " padded" : ""));
      if (o.pad) trap("rows padded with empty cells (Excel CSV)");
      if (cp) trap("windows-1255 encoding");
      if (bom) trap("UTF-8 BOM");
      if (o.moneyStyle === "comma" && rows.some((r) => r.some((c) => c && c.t === "money" && Math.abs(c.v) >= 1000))) trap("thousands separator (quoted cell)");
      if (o.moneyStyle === "shekel") trap("₪ sign inside the amount");
      if (o.dateStyle === "dmy2") trap("two-digit years");
    } else if (format === "xlsx") {
      file = { kind: "xlsx", sheets: [{ name: rng.pick(["פירוט עסקאות", "Sheet1", "עסקאות"]), rows: renderXlsx(rows, o, rng) }] };
      bits.push("xlsx dates:" + o.dateCells + (o.numbers ? " numbers" : " text-amounts") + (o.inline ? " inline" : ""));
      if (!o.numbers) trap("amounts stored as text");
      if (o.dateCells === "text") trap("dates stored as text");
      if (o.dateCells === "text" && o.dateStyle === "dmy2") trap("two-digit years");
    } else {
      file = { kind: "html", text: renderHtml(rows, o, rng) };
      bits.push("html .xls");
      trap("HTML table saved as .xls (layout tables, &nbsp; cells)");
      if (o.dropCloseTd) trap("missing </td> tags");
      if (o.dateStyle === "dmy2") trap("two-digit years");
    }
    bits.push(nCards + (nCards > 1 ? " cards" : " card"));
    bits.push(truth.length + " lines");
    if (nAbroad) bits.push(nAbroad + " abroad");
    if (nInst) bits.push(nInst + " installments");
    if (nRef) bits.push(nRef + " refunds");
    bits.push(statementTotals.length + " totals");

    return {
      name: "isracard " + bits.join(", "),
      kind: "card",
      file,
      truth,
      statementTotals,
      traps
    };
  }
};
