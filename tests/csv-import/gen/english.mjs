// English-language exports - what an Israeli with an account abroad, a
// returning expat, or anyone on a bank's English interface hands Richy. Four
// families, one per statement, each in the layouts the real banks ship:
//
//   us-bank   a US checking account, month-first dates, one signed amount and a
//             running balance.
//               plain   Date,Description,Amount,Balance (the shape most credit
//                       unions and the smaller banks write), sometimes with
//                       report lines and Beginning/Ending Balance rows
//               bofa    Bank of America: a five-row summary block ABOVE the
//                       table (Beginning balance / Total credits / Total debits
//                       / Ending balance, under "Summary Amt."), a blank row,
//                       then Date,Description,Amount,Running Bal. whose first
//                       row is "Beginning balance as of ..." with no amount.
//                       Every amount quoted with thousands separators, and the
//                       payroll line carries "INDN:SMITH,JOHN" - a comma inside
//               chase   Chase: Details,Posting Date,Description,Amount,Type,
//                       Balance,Check or Slip # - a DEBIT/CREDIT direction
//                       column, an ACH_DEBIT/DEBIT_CARD type code column, a
//                       check-number column, and a trailing comma on every row
//   us-card   a US credit card.
//               chase   Transaction Date,Post Date,Description,Category,Type,
//                       Amount,Memo - purchases negative, "Payment Thank You-
//                       Mobile" positive (the bill being paid: a transfer),
//                       refunds positive with Type "Return". The Type column
//                       (Sale/Payment/Return/Fee) is not the shop
//               capone  Capital One: ISO dates, a Card No. column (4 digits),
//                       Debit and Credit columns
//               amex    American Express: charges POSITIVE, credits negative;
//                       optionally Card Member / Account # ("-41007", which
//                       looks like a negative amount) and the full export with
//                       multi-line quoted cells, a zip-code column and a
//                       Category column
//   uk-bank   a UK current account, day-first dates.
//               spec    Date,Type,Description,Paid out,Paid in,Balance with type
//                       codes (DEB/DD/SO/FPI/FPO/BGC/CPT/TFR/CHG) and
//                       Santander-style descriptions - "CARD PAYMENT TO TESCO
//                       STORES ... ON 03-09-2026" is an ordinary purchase, not
//                       a card bill; a purchase abroad reads "...,65.00 EUR,
//                       RATE 1.1712/EUR ON ..." with a separate fee line
//               lloyds  Transaction Date,Transaction Type,Sort Code,Account
//                       Number,Transaction Description,Debit Amount,Credit
//                       Amount,Balance, (trailing comma on the header), sort
//                       code written '12-34-56, amounts unformatted ("100")
//               natwest a blank first line, "Date, Type, Description, Value,
//                       Balance, Account Name, Account Number" (spaces after the
//                       commas), apostrophe-prefixed text cells, signed Value
//   generic   a generic export whose FIRST column is "Transaction Type", closing
//             with a TOTAL line (label in the first column, figure under the
//             money) - in shekels (an Israeli bank's or card's English UI) or
//             dollars:
//               card    one signed amount (either convention), optionally
//                       Original Amount/Original Currency beside the charge
//                       (installments, foreign purchases), a Reference column,
//                       a Card Number column, a Category column, and per-card
//                       sections that repeat the titles and close with
//                       "Subtotal" before the grand TOTAL
//               bank    Debit/Credit (or Money Out/Money In, Withdrawals/
//                       Deposits) and Balance, opening/closing balance rows, a
//                       TOTAL row carrying both sums
//               flow    unsigned amounts with DEBIT/CREDIT (or DR/CR) in the
//                       Transaction Type column, closed by TOTAL DEBITS /
//                       TOTAL CREDITS
//             as CSV (utf-8 or windows-1255) or .xlsx.
//
// Every family sometimes buys fuel at TotalEnergies ("TOTALENERGIES", "TOTAL
// ENERGIES STATION") and the US ones at "TOTAL WINE & MORE": real purchases
// whose names start with the word a total line uses.
//
// Amounts in the truth are in the account's own currency - dollars on a US
// account, pounds on a UK one, shekels on the Israeli English exports - because
// that is what actually left or entered the account.
//
// Layouts written from knowledge, checked where a public sample exists: the
// BofA summary block (six rows above the titles, the beginning-balance row with
// a blank amount), the Chase card column list, the Lloyds header and row shape
// (quoted sort code, unformatted amounts) and the NatWest column list were
// confirmed against published samples / importer projects; the rest (Capital
// One, Amex, Chase checking, the generic export) are from knowledge.
import { SHOPS } from "./_lib.mjs";

// ------------------------------------------------------------------ util --
const A = (n) => Math.round(n * 100);            // money -> cents
const S = (a) => a / 100;                         // cents -> money (exact to 2dp)
const pad2 = (n) => String(n).padStart(2, "0");
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function addMonths(y, m, k) { const z = y * 12 + (m - 1) + k; return [Math.floor(z / 12), (z % 12) + 1]; }
function lastDay(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function iso(y, m, d) { return y + "-" + pad2(m) + "-" + pad2(d); }
function dayIn(rng, y, m, lo, hi) { const L = lastDay(y, m); return iso(y, m, rng.int(Math.min(lo || 1, L), Math.min(hi || L, L))); }
function shift(s, days) {
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
function cents(rng, lo, hi) { return Math.max(1, A(lo + rng() * (hi - lo))); }
function digits(rng, k) { let s = ""; for (let i = 0; i < k; i++) s += rng.int(0, 9); return s; }
function alnum(rng, k) { const c = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"; let s = ""; for (let i = 0; i < k; i++) s += c[rng.int(0, c.length - 1)]; return s; }
function pickMonth(rng) { return addMonths(2026, 9, -rng.int(1, 20)); }

// A date the way the file writes it.
function fmtD(s, style) {
  const [Y, M, D] = s.split("-");
  switch (style) {
    case "mdy": return M + "/" + D + "/" + Y;
    case "mdyNoPad": return (+M) + "/" + (+D) + "/" + Y;
    case "dmy": return D + "/" + M + "/" + Y;
    case "dmy2": return D + "/" + M + "/" + Y.slice(2);
    case "dmydot": return D + "." + M + "." + Y;
    case "dmydash": return D + "-" + M + "-" + Y;
    case "iso": return s;
    default: return D + "/" + M + "/" + Y;
  }
}
// NatWest / Lloyds card descriptions carry the purchase day as 03SEP26.
function ddmonyy(s) { const [Y, M, D] = s.split("-"); return D + MON[+M - 1] + Y.slice(2); }

// A signed amount in cents, the way the file writes money.
function fmtM(a, style) {
  const neg = a < 0, abs = Math.abs(a);
  const ip = String(Math.floor(abs / 100)), dp = pad2(abs % 100);
  const grouped = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sg = neg ? "-" : "";
  switch (style) {
    case "plain": return sg + ip + "." + dp;
    case "general": return String((neg ? -abs : abs) / 100);          // what Excel's General format writes: 100, 64.4
    case "comma": return sg + grouped + "." + dp;
    case "dollar": return sg + "$" + grouped + "." + dp;
    case "paren": return neg ? "(" + grouped + "." + dp + ")" : grouped + "." + dp;
    case "pound": return sg + "£" + grouped + "." + dp;
    case "shekelPre": return sg + "₪ " + grouped + "." + dp;
    case "shekelPost": return sg + grouped + "." + dp + " ₪";
    case "codeILS": return sg + grouped + "." + dp + " ILS";
    case "codeUSD": return sg + grouped + "." + dp + " USD";
    default: return sg + ip + "." + dp;
  }
}

// CSV text. rows: [{ cells, q, trail }] - q: true quotes every non-empty cell,
// an array quotes those columns, anything else quotes only what must be
// (a comma, a quote or a line break in it). trail adds the trailing comma some
// exporters write. A row with cells === null is an empty line.
function csvText(rows, eol, finalEol) {
  const out = rows.map((r) => {
    if (!r.cells) return "";
    let s = r.cells.map((c, ci) => {
      const v = c == null ? "" : String(c);
      const force = v !== "" && (r.q === true || (Array.isArray(r.q) && r.q.indexOf(ci) !== -1));
      return force || v.indexOf(",") !== -1 || /[\r\n"]/.test(v) ? "\"" + v.replace(/"/g, "\"\"") + "\"" : v;
    }).join(",");
    if (r.trail) s += ",";
    return s;
  });
  return out.join(eol) + (finalEol ? eol : "");
}

// ------------------------------------------------------------- merchants --
// sec is the kind of shop, which each issuer's own Category column names in
// its own words (index: chase, capone, amex, generic).
const LABELS = {
  groceries: ["Groceries", "Grocery", "Merchandise & Supplies-Groceries", "Groceries"],
  dining: ["Food & Drink", "Dining", "Restaurant-Restaurant", "Restaurants"],
  delivery: ["Food & Drink", "Dining", "Restaurant-Restaurant", "Restaurants"],
  gas: ["Gas", "Gas/Automotive", "Transportation-Fuel", "Fuel"],
  rides: ["Travel", "Other Travel", "Transportation-Taxis & Coach", "Transport"],
  transit: ["Travel", "Other Travel", "Transportation-Other Transportation", "Transport"],
  parking: ["Automotive", "Gas/Automotive", "Transportation-Parking Charges", "Parking"],
  utilities: ["Bills & Utilities", "Utilities", "Business Services-Utilities", "Utilities"],
  phone: ["Bills & Utilities", "Phone/Cable", "Communications-Cable & Internet Comm Services", "Telecom"],
  pharmacy: ["Health & Wellness", "Health Care", "Merchandise & Supplies-Pharmacies", "Health"],
  gym: ["Health & Wellness", "Other Services", "Other-Fitness Clubs", "Fitness"],
  streaming: ["Entertainment", "Entertainment", "Entertainment-Other Entertainment", "Entertainment"],
  games: ["Entertainment", "Entertainment", "Merchandise & Supplies-Internet Purchase", "Entertainment"],
  cinema: ["Entertainment", "Entertainment", "Entertainment-Theatrical Events", "Entertainment"],
  online: ["Shopping", "Merchandise", "Merchandise & Supplies-Internet Purchase", "Online Shopping"],
  retail: ["Shopping", "Merchandise", "Merchandise & Supplies-Department Stores", "Shopping"],
  electronics: ["Shopping", "Merchandise", "Merchandise & Supplies-Electronics Stores", "Electronics"],
  home: ["Home", "Merchandise", "Merchandise & Supplies-Hardware Supplies", "Home"],
  clothing: ["Shopping", "Merchandise", "Merchandise & Supplies-Clothing Stores", "Clothing"],
  air: ["Travel", "Airfare", "Travel-Airline", "Travel"],
  lodging: ["Travel", "Lodging", "Travel-Lodging", "Travel"],
  fees: ["Fees & Adjustments", "Fee/Interest Charge", "Fees & Adjustments-Fees & Adjustments", "Fees"]
};
const LBL = { chase: 0, capone: 1, amex: 2, generic: 3 };
const ONLINE = ["online", "games", "lodging", "air", "delivery"];
const label = (sec, who) => (LABELS[sec] ? LABELS[sec][LBL[who]] : "");

// store: a store number / city may ride along; code: a reference is glued on
// (AMAZON.COM*RT4Y12AB3); bill: paid by direct debit / ACH on a bank account;
// total: a name that starts like a total line - kept apart and dealt in on
// purpose, so an instance says whether it has one.
const US_POOL = [
  { name: "WHOLE FOODS MKT", cat: "Food", sec: "groceries", lo: 18, hi: 240, store: true },
  { name: "TRADER JOE'S", cat: "Food", sec: "groceries", lo: 15, hi: 160, store: true },
  { name: "SAFEWAY", cat: "Food", sec: "groceries", lo: 12, hi: 210, store: true },
  { name: "KROGER", cat: "Food", sec: "groceries", lo: 15, hi: 220, store: true },
  { name: "STARBUCKS STORE", cat: "Food", sec: "dining", lo: 4, hi: 19, store: true },
  { name: "CHIPOTLE", cat: "Food", sec: "dining", lo: 9, hi: 38, store: true },
  { name: "MCDONALD'S", cat: "Food", sec: "dining", lo: 6, hi: 26, store: true },
  { name: "UBER *EATS", cat: "Food", sec: "delivery", lo: 14, hi: 75 },
  { name: "DOORDASH*SWEETGREEN", cat: "Food", sec: "delivery", lo: 14, hi: 60 },
  { name: "SHELL OIL", cat: "Transport", sec: "gas", lo: 22, hi: 95, store: true },
  { name: "CHEVRON", cat: "Transport", sec: "gas", lo: 22, hi: 95, store: true },
  { name: "EXXONMOBIL", cat: "Transport", sec: "gas", lo: 22, hi: 95, store: true },
  { name: "UBER *TRIP", cat: "Transport", sec: "rides", lo: 7, hi: 68 },
  { name: "LYFT *RIDE", cat: "Transport", sec: "rides", lo: 7, hi: 55 },
  { name: "MTA*NYCT PAYGO", cat: "Transport", sec: "transit", lo: 2.9, hi: 34 },
  { name: "PARKMOBILE", cat: "Transport", sec: "parking", lo: 3, hi: 28 },
  { name: "COMCAST CABLE COMM", cat: "Housing", sec: "phone", lo: 55, hi: 190, bill: true },
  { name: "VERIZON WIRELESS", cat: "Housing", sec: "phone", lo: 45, hi: 160, bill: true },
  { name: "CON ED OF NY", cat: "Housing", sec: "utilities", lo: 40, hi: 230, bill: true },
  { name: "SPECTRUM", cat: "Housing", sec: "phone", lo: 50, hi: 130, bill: true },
  { name: "CVS/PHARMACY", cat: "Health", sec: "pharmacy", lo: 5, hi: 120, store: true },
  { name: "WALGREENS", cat: "Health", sec: "pharmacy", lo: 5, hi: 95, store: true },
  { name: "PLANET FITNESS", cat: "Health", sec: "gym", lo: 10, hi: 25, bill: true },
  { name: "NETFLIX.COM", cat: "Entertainment", sec: "streaming", lo: 7.99, hi: 24.99 },
  { name: "SPOTIFY USA", cat: "Entertainment", sec: "streaming", lo: 10.99, hi: 16.99 },
  { name: "HULU", cat: "Entertainment", sec: "streaming", lo: 7.99, hi: 17.99 },
  { name: "AMC THEATRES", cat: "Entertainment", sec: "cinema", lo: 12, hi: 64, store: true },
  { name: "STEAMGAMES.COM", cat: "Entertainment", sec: "games", lo: 5, hi: 70 },
  { name: "AMAZON.COM*", cat: "Shopping", sec: "online", lo: 8, hi: 320, code: 9 },
  { name: "TARGET", cat: "Shopping", sec: "retail", lo: 10, hi: 210, store: true },
  { name: "BEST BUY", cat: "Shopping", sec: "electronics", lo: 20, hi: 1200, store: true },
  { name: "THE HOME DEPOT", cat: "Shopping", sec: "home", lo: 15, hi: 420, store: true },
  { name: "OLD NAVY", cat: "Shopping", sec: "clothing", lo: 18, hi: 150, store: true },
  { name: "AIRBNB * HM", cat: "Travel", sec: "lodging", lo: 120, hi: 1400, code: 8 },
  { name: "DELTA AIR LINES", cat: "Travel", sec: "air", lo: 150, hi: 900 },
  { name: "MARRIOTT", cat: "Travel", sec: "lodging", lo: 150, hi: 700 }
];
const US_TOTAL = [
  { name: "TOTALENERGIES", cat: "Transport", sec: "gas", lo: 25, hi: 90, store: true, total: true },
  { name: "TOTAL ENERGIES STATION", cat: "Transport", sec: "gas", lo: 25, hi: 90, total: true },
  { name: "TOTAL WINE & MORE", cat: "Food", sec: "groceries", lo: 18, hi: 160, store: true, total: true }
];
const UK_POOL = [
  { name: "TESCO STORES", cat: "Food", sec: "groceries", lo: 3, hi: 125, store: true },
  { name: "SAINSBURYS S/MKTS", cat: "Food", sec: "groceries", lo: 3, hi: 115 },
  { name: "ASDA STORES", cat: "Food", sec: "groceries", lo: 4, hi: 130, store: true },
  { name: "LIDL GB", cat: "Food", sec: "groceries", lo: 3, hi: 90 },
  { name: "M&S SIMPLY FOOD", cat: "Food", sec: "groceries", lo: 3, hi: 45, store: true },
  { name: "PRET A MANGER", cat: "Food", sec: "dining", lo: 3, hi: 16 },
  { name: "COSTA COFFEE", cat: "Food", sec: "dining", lo: 2.5, hi: 9, store: true },
  { name: "GREGGS", cat: "Food", sec: "dining", lo: 1.5, hi: 10 },
  { name: "DELIVEROO", cat: "Food", sec: "delivery", lo: 12, hi: 48 },
  { name: "UBER *EATS", cat: "Food", sec: "delivery", lo: 11, hi: 45 },
  { name: "SHELL", cat: "Transport", sec: "gas", lo: 25, hi: 95, store: true },
  { name: "ESSO", cat: "Transport", sec: "gas", lo: 25, hi: 95, store: true },
  { name: "TFL TRAVEL CH", cat: "Transport", sec: "transit", lo: 2.8, hi: 16 },
  { name: "TRAINLINE", cat: "Transport", sec: "transit", lo: 9, hi: 130 },
  { name: "UBER *TRIP", cat: "Transport", sec: "rides", lo: 6, hi: 42 },
  { name: "BRITISH GAS", cat: "Housing", sec: "utilities", lo: 40, hi: 180, bill: true },
  { name: "THAMES WATER", cat: "Housing", sec: "utilities", lo: 25, hi: 65, bill: true },
  { name: "OCTOPUS ENERGY", cat: "Housing", sec: "utilities", lo: 60, hi: 210, bill: true },
  { name: "LB CAMDEN COUNCIL TAX", cat: "Housing", sec: "utilities", lo: 110, hi: 230, bill: true },
  { name: "VIRGIN MEDIA", cat: "Housing", sec: "phone", lo: 30, hi: 85, bill: true },
  { name: "BT GROUP PLC", cat: "Housing", sec: "phone", lo: 25, hi: 70, bill: true },
  { name: "EE LIMITED", cat: "Housing", sec: "phone", lo: 12, hi: 55, bill: true },
  { name: "BOOTS", cat: "Health", sec: "pharmacy", lo: 3, hi: 60, store: true },
  { name: "SUPERDRUG", cat: "Health", sec: "pharmacy", lo: 3, hi: 40 },
  { name: "PUREGYM", cat: "Health", sec: "gym", lo: 18, hi: 36, bill: true },
  { name: "NETFLIX.COM", cat: "Entertainment", sec: "streaming", lo: 4.99, hi: 17.99 },
  { name: "ODEON CINEMAS", cat: "Entertainment", sec: "cinema", lo: 8, hi: 42 },
  { name: "AMAZON.CO.UK*", cat: "Shopping", sec: "online", lo: 5, hi: 210, code: 6 },
  { name: "ARGOS", cat: "Shopping", sec: "retail", lo: 5, hi: 260 },
  { name: "PRIMARK", cat: "Shopping", sec: "clothing", lo: 5, hi: 80 },
  { name: "JOHN LEWIS", cat: "Shopping", sec: "retail", lo: 20, hi: 420 },
  { name: "KLARNA*ASOS.COM", cat: "Shopping", sec: "clothing", lo: 10, hi: 65 },
  { name: "IKEA LTD", cat: "Shopping", sec: "home", lo: 15, hi: 420 },
  { name: "EASYJET", cat: "Travel", sec: "air", lo: 40, hi: 320 },
  { name: "RYANAIR", cat: "Travel", sec: "air", lo: 20, hi: 210 },
  { name: "AIRBNB * HM", cat: "Travel", sec: "lodging", lo: 80, hi: 900, code: 8 }
];
const UK_TOTAL = [
  { name: "TOTALENERGIES", cat: "Transport", sec: "gas", lo: 25, hi: 90, store: true, total: true },
  { name: "TOTAL ENERGIES STATION", cat: "Transport", sec: "gas", lo: 25, hi: 90, total: true }
];
// The Latin-script names from the shared pool, in shekels, with the kind of
// shop each is. The global ones also turn up on US and UK statements.
const LATIN_SEC = { "COFIX": "dining", "WOLT": "delivery", "GETT": "rides", "YANGO": "rides", "SUPER-PHARM": "pharmacy",
  "NETFLIX.COM": "streaming", "SPOTIFY": "streaming", "STEAM GAMES": "games", "KSP": "electronics", "ALIEXPRESS": "online",
  "AMAZON MKTPLACE": "online", "SHEIN": "clothing", "BOOKING.COM": "lodging" };
const LATIN = SHOPS.filter((s) => /^[\x20-\x7e]+$/.test(s.name))
  .map((s) => ({ name: s.name, cat: s.cat, sec: LATIN_SEC[s.name] || "retail", lo: s.lo, hi: s.hi }));
const GLOBAL = ["NETFLIX.COM", "SPOTIFY", "STEAM GAMES", "ALIEXPRESS", "AMAZON MKTPLACE", "SHEIN", "BOOKING.COM"];
const scaled = (list, fx) => list.filter((s) => GLOBAL.indexOf(s.name) !== -1).map((s) => Object.assign({}, s, { lo: Math.max(1, s.lo / fx), hi: s.hi / fx }));
// Israeli shops as an English-language export writes them.
const IL_EXTRA = [
  { name: "SHUFERSAL DEAL", cat: "Food", sec: "groceries", lo: 60, hi: 650 },
  { name: "RAMI LEVY", cat: "Food", sec: "groceries", lo: 80, hi: 700 },
  { name: "MCDONALDS", cat: "Food", sec: "dining", lo: 30, hi: 110 },
  { name: "PAZ YAKUM", cat: "Transport", sec: "gas", lo: 120, hi: 380 },
  { name: "SONOL", cat: "Transport", sec: "gas", lo: 100, hi: 350 },
  { name: "PANGO", cat: "Transport", sec: "parking", lo: 5, hi: 60 },
  { name: "RAV KAV", cat: "Transport", sec: "transit", lo: 20, hi: 250 },
  { name: "ISRAEL ELECTRIC CORP", cat: "Housing", sec: "utilities", lo: 200, hi: 900, bill: true },
  { name: "BEZEQ", cat: "Housing", sec: "phone", lo: 60, hi: 180, bill: true },
  { name: "PARTNER COMMUNICATIONS", cat: "Housing", sec: "phone", lo: 40, hi: 150, bill: true },
  { name: "TEL AVIV MUNICIPALITY ARNONA", cat: "Housing", sec: "utilities", lo: 300, hi: 1200, bill: true },
  { name: "GOOGLE *YOUTUBE PREMIUM", cat: "Entertainment", sec: "streaming", lo: 23.9, hi: 44.9 },
  { name: "IKEA NETANYA", cat: "Shopping", sec: "home", lo: 100, hi: 2500 }
];
const IL_TOTAL = [
  { name: "TOTAL ENERGIES STATION", cat: "Transport", sec: "gas", lo: 150, hi: 380, total: true },
  { name: "TOTALENERGIES", cat: "Transport", sec: "gas", lo: 150, hi: 380, total: true }
];
// Purchases abroad on the shekel (or dollar) exports: the shop's own figure in
// its currency, the charge in the account's.
const ABROAD = [
  { name: "TOTALENERGIES PARIS", cat: "Transport", sec: "gas", cur: "EUR", lo: 40, hi: 95, total: true },
  { name: "TOTAL ENERGIES STATION LYON", cat: "Transport", sec: "gas", cur: "EUR", lo: 40, hi: 95, total: true },
  { name: "AMAZON.COM", cat: "Shopping", sec: "online", cur: "USD", lo: 10, hi: 250 },
  { name: "NETFLIX.COM", cat: "Entertainment", sec: "streaming", cur: "USD", lo: 9.99, hi: 22.99 },
  { name: "STEAMGAMES.COM", cat: "Entertainment", sec: "games", cur: "USD", lo: 5, hi: 60 },
  { name: "SPOTIFY AB", cat: "Entertainment", sec: "streaming", cur: "EUR", lo: 9.99, hi: 16.99 },
  { name: "UBER *TRIP", cat: "Transport", sec: "rides", cur: "EUR", lo: 8, hi: 45 },
  { name: "BOOKING.COM", cat: "Travel", sec: "lodging", cur: "EUR", lo: 80, hi: 900 },
  { name: "PRET A MANGER LONDON", cat: "Food", sec: "dining", cur: "GBP", lo: 4, hi: 18 }
];
// What people split into payments.
const INSTALLMENT = [
  { name: "KSP", cat: "Shopping", sec: "electronics" },
  { name: "IKEA NETANYA", cat: "Shopping", sec: "home" },
  { name: "BUG MULTISYSTEM", cat: "Shopping", sec: "electronics" },
  { name: "ACE HARDWARE", cat: "Shopping", sec: "home" }
];

const US_CITIES = ["AUSTIN TX", "NEW YORK NY", "SEATTLE WA", "CHICAGO IL", "DENVER CO", "SAN JOSE CA", "BROOKLYN NY", "BOSTON MA"];
const UK_TOWNS = ["LONDON", "MANCHESTER", "LEEDS", "BRISTOL", "CAMDEN", "CROYDON"];
const PEOPLE_US = ["John Smith", "Maria Garcia", "David Lee", "Emily Chen", "Chris Johnson", "Sarah Brown"];
const PEOPLE_UK = ["J SMITH", "MR A JONES", "K PATEL", "S WILLIAMS", "MISS L TAYLOR", "R KHAN"];
const EMP_US = ["ACME CORP", "GLOBEX INC", "INITECH LLC", "UMBRELLA CO"];
const EMP_UK = ["ACME LTD", "INITECH UK LTD", "GLOBEX PLC", "STARK RETAIL LTD"];
const EMP_IL = ["ACME TECHNOLOGIES LTD", "GLOBEX ISRAEL LTD", "INITECH R&D LTD"];

// A region: its currency, its shops and the money that is not shops.
const REGION = {
  US: { cur: "USD", pool: US_POOL.concat(scaled(LATIN, 3.6)), totals: US_TOTAL,
    salary: [1400, 4800], cardbill: [150, 4500], save: [100, 2500], p2p: [15, 600], cash: [20, 400], fee: [5, 35], interest: [0.05, 18], benefit: null },
  UK: { cur: "GBP", pool: UK_POOL.concat(scaled(LATIN, 4.6)), totals: UK_TOTAL,
    salary: [1600, 4800], cardbill: [80, 2500], save: [50, 1500], p2p: [10, 400], cash: [10, 300], fee: [3, 25], interest: [0.02, 12], benefit: [96, 180] },
  IL: { cur: "ILS", pool: LATIN.concat(IL_EXTRA), totals: IL_TOTAL,
    salary: [7000, 26000], cardbill: [1500, 9000], save: [200, 5000], p2p: [20, 600], cash: [100, 1000], fee: [5, 35], interest: [5, 300], benefit: [150, 400] }
};

// ----------------------------------------------------------- the lines ---
// A line is { iso, a (signed cents: negative = money out), kind, e (the shop,
// for purchases and refunds), cat, transfer, refund, src (a refund's purchase) }.
// The layout turns it into a description and cells afterwards.
function shopLine(rng, e, y, m, kind) {
  return { iso: e.bill ? dayIn(rng, y, m, 1, 14) : dayIn(rng, y, m), a: -cents(rng, e.lo, e.hi), kind: kind || "buy", e, cat: e.cat, transfer: false, refund: false };
}
function refundOf(rng, src, y, m) {
  const back = Math.max(1, Math.min(-src.a, A(5 + rng() * S(-src.a))));
  const d = src.iso > iso(y, m, 1) ? dayIn(rng, y, m, +src.iso.slice(8), lastDay(y, m)) : dayIn(rng, y, m);
  return { iso: d, a: back, kind: "refund", e: src.e, cat: src.cat, transfer: false, refund: true, src };
}

// A month of a bank account: pay, bills, the card bill, savings, people,
// cash, fees and a lot of shops.
function bankPlan(rng, n, y, m, R, opts) {
  opts = opts || {};
  const lines = [];
  const cap = { cardbill: 2, save: 2, unsave: 1, fee: 2, interest: 1, benefit: 1, rent: 1, check: 2, checkDep: 1, p2pIn: 3, p2pOut: 4, cash: 3 };
  const got = {};
  const nRefund = n >= 5 && rng.chance(0.35) ? rng.int(1, 2) : 0;
  const nSal = n >= 4 ? (opts.biweekly && rng.chance(0.6) ? 2 : 1) : rng.int(0, 1);
  for (let i = 0; i < nSal; i++) {
    const d = nSal === 2 ? (i === 0 ? dayIn(rng, y, m, 1, 5) : dayIn(rng, y, m, 14, 19)) : dayIn(rng, y, m, 1, 28);
    lines.push({ iso: d, a: cents(rng, R.salary[0], R.salary[1]), kind: "salary", cat: "Salary", transfer: false, refund: false });
  }
  const table = [["buy", 62], ["bill", 9], ["cardbill", 5], ["save", 4], ["unsave", 1], ["p2pOut", 5], ["p2pIn", 3], ["cash", 4], ["fee", 2], ["interest", 1.5]]
    .concat(R.benefit ? [["benefit", 1]] : [])
    .concat(opts.rent ? [["rent", 2]] : [])
    .concat(opts.checks ? [["check", 3], ["checkDep", 1]] : []);
  const wsum = table.reduce((s, t) => s + t[1], 0);
  const bills = R.pool.filter((e) => e.bill), shops = R.pool.filter((e) => !e.bill);
  // A name that starts like a total line, in about a third of the files.
  const nTotalShop = n >= 3 && rng.chance(0.35) ? (rng.chance(0.2) ? 2 : 1) : 0;
  for (let i = 0; i < nTotalShop; i++) lines.push(shopLine(rng, rng.pick(R.totals), y, m));
  while (lines.length < n - nRefund) {
    let r = rng() * wsum, kind = "buy";
    for (const [k, w] of table) { if ((r -= w) < 0) { kind = k; break; } }
    if (cap[kind] !== undefined) { got[kind] = (got[kind] || 0) + 1; if (got[kind] > cap[kind]) kind = "buy"; }
    const L = { iso: dayIn(rng, y, m), kind, cat: null, transfer: false, refund: false };
    switch (kind) {
      case "buy": lines.push(shopLine(rng, rng.pick(shops), y, m)); continue;
      case "bill": lines.push(shopLine(rng, rng.pick(bills), y, m, "bill")); continue;
      case "rent": L.a = -cents(rng, R.cur === "GBP" ? 650 : 1200, R.cur === "GBP" ? 2200 : 3500); L.cat = "Housing"; L.iso = dayIn(rng, y, m, 1, 5); break;
      case "cardbill": L.a = -cents(rng, R.cardbill[0], R.cardbill[1]); L.transfer = true; break;
      case "save": L.a = -cents(rng, R.save[0], R.save[1]); L.transfer = true; break;
      case "unsave": L.a = cents(rng, R.save[0], R.save[1]); L.transfer = true; break;
      case "p2pOut": L.a = -cents(rng, R.p2p[0], R.p2p[1]); break;
      case "p2pIn": L.a = cents(rng, R.p2p[0], R.p2p[1]); break;
      case "cash": L.a = -A(rng.int(Math.ceil(R.cash[0] / 10), Math.floor(R.cash[1] / 10)) * 10); L.cat = "Other"; break;
      case "fee": L.a = -cents(rng, R.fee[0], R.fee[1]); L.cat = "Other"; break;
      case "interest": L.a = cents(rng, R.interest[0], R.interest[1]); L.cat = "Investments"; L.iso = iso(y, m, lastDay(y, m)); break;
      case "benefit": L.a = cents(rng, R.benefit[0], R.benefit[1]); L.cat = "Other"; break;
      case "check": L.a = -cents(rng, 40, 1800); L.checkNo = String(rng.int(1001, 1399)); break;
      case "checkDep": L.a = cents(rng, 50, 1500); break;
    }
    lines.push(L);
  }
  const buys = lines.filter((l) => l.kind === "buy");
  for (let i = 0; i < nRefund && buys.length; i++) lines.push(refundOf(rng, rng.pick(buys), y, m));
  while (lines.length < n) lines.push(shopLine(rng, rng.pick(shops), y, m));     // a refund with nothing to refund
  return lines;
}

// A month of a card: shops, now and then money back, the bill being paid, a fee.
function cardPlan(rng, n, y, m, R, opts) {
  opts = opts || {};
  const lines = [];
  const nPay = opts.payments ? (n >= 4 ? rng.pick([0, 1, 1, 1, 2]) : rng.int(0, 1)) : 0;
  const nRefund = n >= 4 && rng.chance(0.4) ? rng.int(1, 2) : 0;
  const nFee = opts.fees && n >= 4 && rng.chance(0.25) ? 1 : 0;
  for (let i = 0; i < nPay; i++) lines.push({ iso: dayIn(rng, y, m), a: cents(rng, R.cardbill[0], R.cardbill[1]), kind: "payment", cat: null, transfer: true, refund: false });
  for (let i = 0; i < nFee; i++) lines.push({ iso: dayIn(rng, y, m), a: -cents(rng, R.fee[0], R.fee[1] * 3), kind: "fee", e: { sec: "fees" }, cat: "Other", transfer: false, refund: false });
  const shops = R.pool.filter((e) => opts.bills !== false || !e.bill);
  if (n - nPay - nRefund - nFee >= 2 && rng.chance(0.35)) lines.push(shopLine(rng, rng.pick(R.totals), y, m));
  if (opts.foreign && n - lines.length - nRefund >= 3 && rng.chance(0.35)) {
    // A purchase abroad on a US card: charged in dollars, with the card's 3%
    // foreign transaction fee as a line of its own the same day.
    const e = rng.pick(ABROAD.filter((x) => x.cur !== "USD"));
    const L = { iso: dayIn(rng, y, m), a: -cents(rng, e.lo * 1.1, e.hi * 1.1), kind: "buy", e, cat: e.cat, transfer: false, refund: false, abroad: true };
    lines.push(L);
    lines.push({ iso: L.iso, a: -Math.max(1, Math.round(-L.a * 0.03)), kind: "fxfee", e: { sec: "fees" }, cat: "Other", transfer: false, refund: false });
  }
  while (lines.length < n - nRefund) lines.push(shopLine(rng, rng.pick(shops), y, m));
  const buys = lines.filter((l) => l.kind === "buy" && !l.abroad);
  for (let i = 0; i < nRefund && buys.length >= 2; i++) lines.push(refundOf(rng, rng.pick(buys), y, m));
  while (lines.length < n) lines.push(shopLine(rng, rng.pick(shops), y, m));     // a refund with nothing to refund
  return lines;
}

// A month-first file proves its order only with a day over 12.
function lateDay(rng, lines, y, m) {
  if (lines.some((l) => +l.iso.slice(8) > 12)) return;
  const pool = lines.filter((x) => x.kind !== "refund" && x.iso.slice(0, 7) === iso(y, m, 1).slice(0, 7));
  if (!pool.length) return;
  const l = rng.pick(pool);
  l.iso = dayIn(rng, y, m, 13, 28);
  lines.forEach((x) => { if (x.kind === "refund" && x.src === l && x.iso < l.iso) x.iso = l.iso; });
}
function chrono(lines) {
  // Stable: lines on the same day keep the order they were dealt in.
  return lines.map((l, i) => [l, i]).sort((p, q) => (p[0].iso < q[0].iso ? -1 : p[0].iso > q[0].iso ? 1 : p[1] - q[1])).map((p) => p[0]);
}
function balances(lines, open) { let b = open; lines.forEach((l) => { b += l.a; l.bal = b; }); return b; }

function truthOf(lines, withIssuer) {
  return lines.map((l) => {
    const t = { date: l.iso, amount: S(Math.abs(l.a)), type: l.a < 0 ? "expense" : "income", shop: l.desc, cat: l.cat,
      transfer: !!l.transfer, refund: !!l.refund };
    if (withIssuer) t.issuer = l.issuer || "";
    return t;
  });
}
const sumOut = (ls) => ls.reduce((s, l) => s + (l.a < 0 ? -l.a : 0), 0);
const sumIn = (ls) => ls.reduce((s, l) => s + (l.a > 0 ? l.a : 0), 0);

// ----------------------------------------------------------- US checking --
function usShop(rng, e, style, isoDate) {
  let t = e.name;
  if (e.code) t += alnum(rng, e.code);
  else if (e.store && rng.chance(0.6)) t += rng.chance(0.5) ? " #" + rng.int(100, 99999) : " " + rng.int(1000, 99999);
  const when = shift(isoDate, -rng.int(0, 2));
  const md = when.slice(5, 7) + "/" + when.slice(8, 10);
  if (style === "bofa") {
    return rng.chance(0.5)
      ? "CHECKCARD " + md.replace("/", "") + " " + t + " " + rng.pick(US_CITIES) + " " + digits(rng, 23)
      : t + " " + md + " PURCHASE " + rng.pick(US_CITIES);
  }
  if (rng.chance(style === "chase" ? 0.6 : 0.3)) t += " " + rng.pick(US_CITIES);
  if (style === "chase" && rng.chance(0.4)) t += "   " + md;
  return t;
}
function usDescribe(rng, l, style) {
  const md = l.iso.slice(5, 7) + "/" + l.iso.slice(8, 10);
  const emp = rng.pick(EMP_US);
  switch (l.kind) {
    case "buy": return usShop(rng, l.e, style, l.iso);
    case "bill":
      // Paid by ACH from the account, not by card.
      if (style === "bofa") return l.e.name + " DES:" + rng.pick(["BILL PAY", "WEB PMT", "AUTOPAY"]) + " ID:XXXXX" + digits(rng, 5) + " INDN:JOHN SMITH CO ID:XXXXX" + digits(rng, 5) + " WEB";
      if (style === "chase") return l.e.name + " " + rng.pick(["PAYMENT", "AUTOPAY", "WEB PMT"]) + " PPD ID: " + digits(rng, 10);
      return l.e.name + rng.pick(["", " AUTOPAY", " ONLINE PMT"]);
    case "salary":
      if (style === "bofa") return emp + " DES:PAYROLL ID:XXXXX" + digits(rng, 5) + " INDN:" + rng.pick(["SMITH,JOHN", "GARCIA,MARIA", "LEE,DAVID"]) + " CO ID:XXXXX" + digits(rng, 5) + " PPD";
      return rng.pick(["PAYROLL " + emp, emp + " PAYROLL PPD ID: " + digits(rng, 10), "DIRECT DEPOSIT " + emp, emp + " DIRECT DEP PPD ID: " + digits(rng, 10)]);
    case "cardbill":
      if (style === "bofa") return rng.pick(["CHASE CREDIT CRD DES:AUTOPAY ID:XXXXX" + digits(rng, 5) + " INDN:JOHN SMITH CO ID:XXXXX" + digits(rng, 5) + " PPD",
        "AMERICAN EXPRESS DES:ACH PMT ID:XXXXX" + digits(rng, 5) + " INDN:JOHN SMITH CO ID:XXXXX" + digits(rng, 5) + " WEB",
        "Online payment from CHK 4471 Confirmation# " + digits(rng, 10) + "; BANK OF AMERICA CREDIT CARD"]);
      return rng.pick(["CHASE CREDIT CRD AUTOPAY PPD ID: " + digits(rng, 10), "AMEX EPAYMENT ACH PMT", "CAPITAL ONE MOBILE PMT",
        "DISCOVER E-PAYMENT " + digits(rng, 4), "CITI AUTOPAY PAYMENT " + digits(rng, 6)]
        .concat(style === "chase" ? ["Payment to Chase card ending in " + digits(rng, 4) + " " + md] : []));
    case "save":
      if (style === "bofa") return rng.pick(["Online Banking transfer to SAV 4821 Confirmation# " + digits(rng, 10), "VANGUARD BUY DES:INVESTMENT ID:XXXXX" + digits(rng, 5) + " PPD"]);
      return rng.pick(["Online Transfer to SAV ...4821 transaction#: " + digits(rng, 11), "ONLINE TRANSFER TO SAVINGS XXXXXX4821",
        "VANGUARD BUY INVESTMENT", "ROBINHOOD DEBITS", "FIDELITY INVESTMENTS MONEYLINE"]);
    case "unsave":
      if (style === "bofa") return "Online Banking transfer from SAV 4821 Confirmation# " + digits(rng, 10);
      return rng.pick(["Online Transfer from SAV ...4821 transaction#: " + digits(rng, 11), "ONLINE TRANSFER FROM SAVINGS XXXXXX4821"]);
    case "p2pOut":
      if (style === "bofa") return "Zelle Transfer Conf# " + alnum(rng, 9).toLowerCase() + "; " + rng.pick(PEOPLE_US);
      return rng.pick(["Zelle payment to " + rng.pick(PEOPLE_US) + " JPM99" + alnum(rng, 6).toLowerCase(),
        "VENMO PAYMENT " + digits(rng, 10) + " WEB ID: " + digits(rng, 10), "CASH APP*" + rng.pick(PEOPLE_US).toUpperCase()]);
    case "p2pIn":
      if (style === "bofa") return "Zelle Transfer Conf# " + alnum(rng, 9).toLowerCase() + "; " + rng.pick(PEOPLE_US);
      return "Zelle payment from " + rng.pick(PEOPLE_US) + " " + alnum(rng, 12);
    case "cash":
      if (style === "bofa") return "BKOFAMERICA ATM " + md + " #00000" + digits(rng, 4) + " WITHDRWL " + rng.pick(["MAIN ST", "5TH AVE", "BROADWAY"]);
      if (style === "chase") return rng.pick(["ATM WITHDRAWAL 00" + digits(rng, 4) + " " + md + digits(rng, 2) + " MAIN S", "NON-CHASE ATM WITHDRAW " + digits(rng, 6) + " " + md + " NEW YORK NY"]);
      return rng.pick(["ATM WITHDRAWAL " + rng.pick(["MAIN ST", "5TH AVE"]), "ATM CASH WITHDRAWAL " + md]);
    case "fee": return rng.pick(style === "chase" ? ["MONTHLY SERVICE FEE", "NON-CHASE ATM FEE-WITH", "INSUFFICIENT FUNDS FEE"] : ["Monthly Maintenance Fee", "OVERDRAFT ITEM FEE", "ATM FEE"]);
    case "interest": return rng.pick(style === "bofa" ? ["Interest Earned"] : ["INTEREST PAYMENT", "INTEREST EARNED"]);
    case "check": return "CHECK " + l.checkNo;
    case "checkDep": return rng.pick(["REMOTE ONLINE DEPOSIT #          1", "DEPOSIT  ID NUMBER " + digits(rng, 6)]);
    case "refund": return l.src.desc;
    default: return "MISC";
  }
}
const CHASE_TYPE = { buy: "DEBIT_CARD", bill: "ACH_DEBIT", cardbill: "ACH_DEBIT", save: "ACCT_XFER", unsave: "ACCT_XFER", p2pOut: "QUICKPAY_DEBIT", p2pIn: "QUICKPAY_CREDIT",
  cash: "ATM", fee: "FEE_TRANSACTION", salary: "ACH_CREDIT", interest: "MISC_CREDIT", check: "CHECK_PAID", checkDep: "CHECK_DEPOSIT", refund: "DEBIT_CARD" };

function usBank(rng) {
  const flavor = rng.pick(["plain", "plain", "plain", "bofa", "bofa", "chase", "chase"]);
  const [y, m] = pickMonth(rng);
  const n = rng.int(3, 60);
  let lines = bankPlan(rng, n, y, m, REGION.US, { biweekly: true, checks: flavor === "chase" });
  lateDay(rng, lines, y, m);
  lines = chrono(lines);
  const open = A(rng.chance(0.8) ? 300 + rng() * 14000 : 20 + rng() * 900);
  const close = balances(lines, open);
  lines.filter((l) => l.kind !== "refund").forEach((l) => { l.desc = usDescribe(rng, l, flavor); });
  lines.filter((l) => l.kind === "refund").forEach((l) => { l.desc = usDescribe(rng, l, flavor); });

  const traps = ["month-first dates", "running balance column", "signed single amount"];
  const statementTotals = [];
  const rows = [];
  const first = iso(y, m, 1), last = iso(y, m, lastDay(y, m));
  const eol = rng.chance(0.6) ? "\r\n" : "\n";
  let nameBits = [];
  let shown = lines;

  if (flavor === "bofa") {
    // Summary block, blank row, the titles, the beginning-balance row, the lines.
    const Q = (a) => fmtM(a, "comma");
    const cr = sumIn(lines), dr = sumOut(lines);
    rows.push({ cells: ["Description", "", "Summary Amt."] });
    rows.push({ cells: ["Beginning balance as of " + fmtD(first, "mdy"), "", Q(open)], q: [2] });
    rows.push({ cells: ["Total credits", "", Q(cr)], q: [2] });
    rows.push({ cells: ["Total debits", "", Q(-dr)], q: [2] });
    rows.push({ cells: ["Ending balance as of " + fmtD(last, "mdy"), "", Q(close)], q: [2] });
    rows.push({ cells: null });
    rows.push({ cells: ["Date", "Description", "Amount", "Running Bal."] });
    rows.push({ cells: [fmtD(first, "mdy"), "Beginning balance as of " + fmtD(first, "mdy"), "", Q(open)], q: [1, 3] });
    lines.forEach((l) => rows.push({ cells: [fmtD(l.iso, "mdy"), l.desc, Q(l.a), Q(l.bal)], q: [1, 2, 3] }));
    if (cr > 0) statementTotals.push(S(cr));
    if (dr > 0) statementTotals.push(S(dr));
    traps.push("summary block above the titles (totals + balances)", "beginning-balance row with no amount", "thousands separator (quoted)", "total row");
    if (lines.some((l) => /,/.test(l.desc))) traps.push("quoted comma in description");
    nameBits = ["english us-bank bofa csv"];
  } else if (flavor === "chase") {
    // Newest first; every data row ends with a comma the titles do not have.
    shown = lines.slice().reverse();
    rows.push({ cells: ["Details", "Posting Date", "Description", "Amount", "Type", "Balance", "Check or Slip #"] });
    shown.forEach((l) => {
      const details = l.kind === "check" ? "CHECK" : l.kind === "checkDep" ? "DSLIP" : l.a < 0 ? "DEBIT" : "CREDIT";
      const type = l.kind === "cardbill" && /^Payment to Chase/.test(l.desc) ? "LOAN_PMT" : l.kind === "p2pOut" && /VENMO|CASH APP/.test(l.desc) ? "ACH_DEBIT" : CHASE_TYPE[l.kind] || "MISC_DEBIT";
      rows.push({ cells: [details, fmtD(l.iso, "mdy"), l.desc, fmtM(l.a, "plain"), type, fmtM(l.bal, "plain"), l.checkNo || ""], trail: true });
    });
    traps.push("direction column (Details DEBIT/CREDIT)", "type-code column", "check-number column", "trailing comma on data rows", "newest first");
    nameBits = ["english us-bank chase csv"];
  } else {
    const newest = rng.chance(0.5);
    if (newest) { shown = lines.slice().reverse(); traps.push("newest first"); }
    const dstyle = rng.pick(["mdy", "mdy", "mdy", "mdyNoPad"]);
    const mstyle = rng.pick(["plain", "plain", "comma", "dollar", "paren"]);
    const head = rng.pick([["Date", "Description", "Amount", "Balance"], ["Date", "Description", "Amount", "Balance"],
      ["Posted Date", "Description", "Amount", "Running Balance"], ["Date", "Payee", "Amount", "Balance"], ["Transaction Date", "Description", "Amount", "Balance"]]);
    const titleCands = ["Everyday Checking ...4471", "Account: CHECKING XXXXXX4471", "Transactions from " + fmtD(first, dstyle) + " to " + fmtD(last, dstyle),
      "Downloaded on " + fmtD(shift(last, rng.int(1, 5)), dstyle) + " " + rng.int(1, 12) + ":" + pad2(rng.int(0, 59)) + " PM", "Account History"];
    const nTitles = rng.int(0, 4);
    const titles = rng.shuffle([0, 1, 2, 3, 4]).slice(0, nTitles).sort((a, b) => a - b).map((i) => titleCands[i]);
    titles.forEach((t) => rows.push({ cells: [t] }));
    if (titles.length && rng.chance(0.5)) rows.push({ cells: null });
    rows.push({ cells: head });
    const openRow = rng.chance(0.25), closeRow = rng.chance(0.25);
    const balRow = (lbl, dIso, a) => rows.push({ cells: [rng.chance(0.5) ? fmtD(dIso, dstyle) : "", lbl, "", fmtM(a, mstyle)] });
    const top = newest ? [closeRow, "Ending Balance", last, close] : [openRow, "Beginning Balance", first, open];
    const bot = newest ? [openRow, "Beginning Balance", first, open] : [closeRow, "Ending Balance", last, close];
    if (top[0]) balRow(top[1], top[2], top[3]);
    shown.forEach((l) => rows.push({ cells: [fmtD(l.iso, dstyle), l.desc, fmtM(l.a, mstyle), fmtM(l.bal, mstyle)] }));
    if (bot[0]) balRow(bot[1], bot[2], bot[3]);
    if (titles.length) traps.push("title lines (" + titles.length + ")");
    if (openRow) traps.push("opening balance line");
    if (closeRow) traps.push("closing balance line");
    if (mstyle === "comma") traps.push("thousands separator (quoted)");
    if (mstyle === "dollar") traps.push("dollar sign in amount");
    if (mstyle === "paren") traps.push("parentheses for negatives");
    if (dstyle === "mdyNoPad") traps.push("unpadded dates");
    if (head[1] === "Payee") traps.push("Payee title");
    nameBits = ["english us-bank plain csv", "money " + mstyle];
  }
  const bom = rng.chance(0.15);
  if (bom) traps.push("BOM");
  const text = csvText(rows, eol, rng.chance(0.6));
  countTraps(lines, traps);
  if (lines.some((l) => l.bal < 0)) traps.push("negative (overdraft) balance");
  nameBits.push(eol === "\r\n" ? "crlf" : "lf", lines.length + " lines");
  return { name: nameBits.join(", "), kind: "bank", file: { kind: "csv", text, encoding: "utf-8", bom }, truth: truthOf(shown, false), statementTotals, traps };
}

// Which of the line-level traps an instance ended up with.
function countTraps(lines, traps) {
  const has = (k) => lines.some((l) => l.kind === k);
  if (lines.some((l) => l.e && l.e.total)) traps.push("merchant named TOTAL... (real purchase)");
  if (has("refund")) traps.push("refund");
  if (has("cardbill") || has("payment")) traps.push("card-bill payment (transfer)");
  if (has("save") || has("unsave")) traps.push("savings/investment transfer");
  if (has("p2pOut") || has("p2pIn")) traps.push("person-to-person transfer");
  if (has("cash")) traps.push("ATM cash");
  if (has("fee") || has("fxfee")) traps.push("fee line");
  if (has("interest")) traps.push("interest income");
  if (has("salary")) traps.push("salary");
  if (has("check")) traps.push("paper check");
  if (lines.some((l) => /'/.test(l.desc || ""))) traps.push("apostrophe in text");
}

// ----------------------------------------------------------- US card -----
function usCard(rng) {
  const flavor = rng.pick(["chase", "chase", "chase", "capone", "capone", "amex", "amex"]);
  const [y, m] = pickMonth(rng);
  const n = rng.int(3, 60);
  let lines = cardPlan(rng, n, y, m, REGION.US, { payments: true, fees: true, foreign: flavor === "chase" });
  if (flavor !== "capone") lateDay(rng, lines, y, m);
  lines = chrono(lines);
  const who = flavor;
  const payText = {
    chase: ["Payment Thank You-Mobile", "Payment Thank You - Web", "AUTOMATIC PAYMENT - THANK"],
    capone: ["CAPITAL ONE MOBILE PYMT", "CAPITAL ONE AUTOPAY PYMT", "CAPITAL ONE ONLINE PYMT"],
    amex: ["AUTOPAY PAYMENT RECEIVED - THANK YOU", "ONLINE PAYMENT - THANK YOU", "MOBILE PAYMENT - THANK YOU"]
  }[flavor];
  const feeText = { chase: ["ANNUAL MEMBERSHIP FEE", "LATE FEE"], capone: ["PAST DUE FEE", "INTEREST CHARGE:PURCHASES"], amex: ["LATE PAYMENT FEE", "ANNUAL MEMBERSHIP FEE"] }[flavor];
  lines.forEach((l) => {
    if (l.kind === "buy") {
      let t = l.e.name;
      if (l.e.code) t += alnum(rng, l.e.code);
      else if (l.e.store && rng.chance(0.5)) t += " #" + rng.int(100, 99999);
      if (l.abroad) t += " " + rng.pick(["FR", "PARIS", "LONDON GB", "BERLIN"]);
      l.city = rng.pick(US_CITIES);
      if (flavor === "amex" && !l.abroad && rng.chance(0.4)) t += " " + l.city;
      l.desc = t;
      l.issuer = label(l.e.sec, who);
    } else if (l.kind === "payment") { l.desc = rng.pick(payText); l.issuer = flavor === "capone" ? "Payment/Credit" : ""; }
    else if (l.kind === "fee") { l.desc = rng.pick(feeText); l.issuer = label("fees", who); }
    else if (l.kind === "fxfee") { l.desc = "FOREIGN TRANSACTION FEE"; l.issuer = label("fees", who); }
  });
  lines.filter((l) => l.kind === "refund").forEach((l) => { l.desc = l.src.desc; l.issuer = l.src.issuer; l.city = l.src.city; });
  const shown = lines.slice().reverse();      // every US card export lists newest first
  const post = (l) => shift(l.iso, l.kind === "payment" ? rng.int(0, 1) : rng.int(0, 3));
  const rows = [];
  const traps = ["card statement", "newest first", "post-date column"];
  const eol = rng.chance(0.5) ? "\r\n" : "\n";
  let nameBits, withIssuer = true;
  if (flavor === "chase") {
    const TYPE = { buy: "Sale", payment: "Payment", refund: "Return", fee: "Fee", fxfee: "Fee" };
    rows.push({ cells: ["Transaction Date", "Post Date", "Description", "Category", "Type", "Amount", "Memo"] });
    shown.forEach((l) => rows.push({ cells: [fmtD(l.iso, "mdy"), fmtD(post(l), "mdy"), l.desc, l.issuer, TYPE[l.kind], fmtM(l.a, "plain"), ""] }));
    traps.push("month-first dates", "Type column (Sale/Payment/Return)", "category column", "purchases negative", "empty Memo column");
    if (lines.some((l) => l.abroad)) traps.push("foreign purchase + foreign transaction fee");
    nameBits = ["english us-card chase csv"];
  } else if (flavor === "capone") {
    const cards = [digits(rng, 4)];
    if (rng.chance(0.3)) cards.push(digits(rng, 4));
    lines.forEach((l) => { l.card = l.src ? l.src.card : rng.pick(cards); });
    rows.push({ cells: ["Transaction Date", "Posted Date", "Card No.", "Description", "Category", "Debit", "Credit"] });
    shown.forEach((l) => rows.push({ cells: [fmtD(l.iso, "iso"), fmtD(post(l), "iso"), l.card, l.desc, l.issuer,
      l.a < 0 ? fmtM(-l.a, "plain") : "", l.a > 0 ? fmtM(l.a, "plain") : ""] }));
    traps.push("ISO dates", "card-number column", "split debit/credit columns", "category column");
    if (cards.length > 1) traps.push("multiple cards");
    nameBits = ["english us-card capone csv"];
  } else {
    // Amex: a charge is POSITIVE. Account # is the card's last five digits
    // behind a dash, which reads like a negative number.
    const shape = rng.pick(["basic", "member", "member", "full"]);
    const members = ["JOHN SMITH"].concat(rng.chance(0.3) ? ["JANE SMITH"] : []);
    const acct = {};
    members.forEach((mb) => { acct[mb] = "-" + digits(rng, 5); });
    lines.forEach((l) => { l.member = l.src ? l.src.member : rng.pick(members); });
    const amt = (l) => fmtM(-l.a, "plain");
    if (shape === "basic") {
      rows.push({ cells: ["Date", "Description", "Amount"] });
      shown.forEach((l) => rows.push({ cells: [fmtD(l.iso, "mdy"), l.desc, amt(l)] }));
      withIssuer = false;
    } else if (shape === "member") {
      rows.push({ cells: ["Date", "Description", "Card Member", "Account #", "Amount"] });
      shown.forEach((l) => rows.push({ cells: [fmtD(l.iso, "mdy"), l.desc, l.member, acct[l.member], amt(l)] }));
      withIssuer = false;
      traps.push("account # column that looks negative");
    } else {
      rows.push({ cells: ["Date", "Description", "Card Member", "Account #", "Amount", "Extended Details", "Appears On Your Statement As",
        "Address", "City/State", "Zip Code", "Country", "Reference", "Category"] });
      shown.forEach((l) => {
        const city = l.city || rng.pick(US_CITIES);
        const [c, st] = [city.slice(0, -3), city.slice(-2)];
        const shopish = l.kind === "buy" || l.kind === "refund";
        rows.push({ cells: [fmtD(l.iso, "mdy"), l.desc, l.member, acct[l.member], amt(l),
          shopish ? digits(rng, 11) + "     " + c + "\n" + l.desc + "\n" + c + "\n" + st : l.desc,
          l.desc, shopish ? rng.int(10, 9999) + " " + rng.pick(["MAIN ST", "MARKET ST", "BROADWAY", "5TH AVE"]) : "",
          shopish ? c + "\n" + st : "", shopish ? String(rng.int(10001, 98199)) : "", shopish ? "UNITED STATES" : "",
          "'" + digits(rng, 18) + "'", l.issuer || ""] });
      });
      traps.push("account # column that looks negative", "multi-line quoted cells", "zip-code column", "reference column", "category column");
    }
    traps.push("month-first dates", "charges positive (Amex)");
    if (members.length > 1) traps.push("multiple card members");
    nameBits = ["english us-card amex " + shape + " csv"];
  }
  const text = csvText(rows, eol, rng.chance(0.5));
  countTraps(lines, traps);
  nameBits.push(lines.length + " lines");
  return { name: nameBits.join(", "), kind: "card", file: { kind: "csv", text, encoding: "utf-8", bom: false }, truth: truthOf(shown, withIssuer), statementTotals: [], traps };
}

// ----------------------------------------------------------- UK bank -----
function ukShop(rng, e) {
  let t = e.name;
  if (e.code) t += alnum(rng, e.code);
  else if (e.store && rng.chance(0.6)) t += " " + rng.int(1000, 9999);
  return t;
}
function ukBank(rng) {
  const flavor = rng.pick(["spec", "spec", "spec", "lloyds", "lloyds", "natwest", "natwest"]);
  const R = REGION.UK;
  const [y, m] = pickMonth(rng);
  const n = rng.int(3, 60);
  const abroad = n >= 5 && rng.chance(0.3);
  let lines = bankPlan(rng, abroad ? n - 1 : n, y, m, R, { rent: true });
  // A purchase abroad: charged in pounds, with the bank's non-sterling fee.
  if (abroad) {
    const e = rng.pick(ABROAD.filter((x) => x.cur === "EUR" || x.cur === "USD"));
    const rate = e.cur === "EUR" ? 1.12 + rng() * 0.08 : 1.24 + rng() * 0.1;
    const rate4 = Math.round(rate * 10000) / 10000;
    const origA = cents(rng, e.lo, e.hi);
    const L = { iso: dayIn(rng, y, m), a: -Math.max(1, Math.round(origA / rate4)), kind: "buy", e, cat: e.cat, transfer: false, refund: false, abroad: { origA, cur: e.cur, rate: rate4 } };
    const idx = lines.findIndex((l) => l.kind === "buy" && !lines.some((r) => r.src === l));
    if (idx >= 0) lines.splice(idx, 1, L); else lines.push(L);
    lines.push({ iso: L.iso, a: -Math.max(1, Math.round(-L.a * 0.0275)), kind: "fxfee", cat: "Other", transfer: false, refund: false, of: L });
  }
  lines = chrono(lines);
  const open = A(rng.chance(0.85) ? 200 + rng() * 6000 : 10 + rng() * 400);
  balances(lines, open);
  const last4 = digits(rng, 4);
  const sortCode = pad2(rng.int(10, 99)) + "-" + pad2(rng.int(0, 99)) + "-" + pad2(rng.int(0, 99));
  const acctNo = digits(rng, 8);
  const d10 = (s) => fmtD(s, "dmydash");
  const CARDBILL = ["BARCLAYCARD", "AMERICAN EXPRESS", "MBNA LIMITED", "HSBC CREDIT CARD", "CAPITAL ONE"];
  const describe = (l) => {
    const emp = rng.pick(EMP_UK), who = rng.pick(PEOPLE_UK);
    const shop = l.e ? ukShop(rng, l.e) : "";
    if (flavor === "spec") {
      switch (l.kind) {
        case "buy":
          if (l.abroad) return "CARD PAYMENT TO " + shop + "," + fmtM(l.abroad.origA, "plain") + " " + l.abroad.cur + ", RATE " + l.abroad.rate.toFixed(4) + "/" + l.abroad.cur + " ON " + d10(l.iso);
          return rng.chance(0.5) ? "CARD PAYMENT TO " + shop + " ON " + d10(shift(l.iso, -rng.int(0, 2)))
            : "CARD PAYMENT TO " + shop + "," + fmtM(-l.a, "plain") + " GBP, RATE 1.00/GBP ON " + d10(shift(l.iso, -rng.int(0, 2)));
        case "bill": return "DIRECT DEBIT PAYMENT TO " + shop + " REF " + digits(rng, 10) + ", MANDATE NO " + rng.int(1, 40);
        case "rent": return "STANDING ORDER VIA FASTER PAYMENT TO " + rng.pick(["MR D HUGHES", "HOMELET LETTINGS"]) + " REFERENCE RENT , MANDATE NO " + rng.int(1, 30);
        case "cardbill": return "DIRECT DEBIT PAYMENT TO " + rng.pick(CARDBILL) + " REF " + digits(rng, 16) + ", MANDATE NO " + rng.int(1, 40);
        case "save": return rng.pick(["TRANSFER TO SAVINGS ACCOUNT " + digits(rng, 8), "STANDING ORDER VIA FASTER PAYMENT TO VANGUARD ISA REFERENCE " + alnum(rng, 8)]);
        case "unsave": return "TRANSFER FROM SAVINGS ACCOUNT " + digits(rng, 8);
        case "p2pOut": return "BILL PAYMENT VIA FASTER PAYMENT TO " + who + " REFERENCE " + rng.pick(["DINNER", "FLAT", "TICKETS", "THANKS"]) + " , MANDATE NO 0";
        case "p2pIn": return "FASTER PAYMENTS RECEIPT REF." + rng.pick(["DINNER", "BILLS", "HOLIDAY"]) + " FROM " + who;
        case "salary": return rng.pick(["BANK GIRO CREDIT REF " + emp + ", SALARY", "FASTER PAYMENTS RECEIPT REF.SALARY FROM " + emp]);
        case "cash": return "CASH WITHDRAWAL AT " + rng.pick(["LLOYDS BANK HIGH ST", "TESCO HIGH ST", "SAINSBURYS STRAND", "HSBC ATM KINGS RD"]) + " ON " + d10(l.iso);
        case "interest": return "INTEREST PAID AFTER TAX 0.00 DEDUCTED";
        case "benefit": return "BANK GIRO CREDIT REF HMRC CHILD BENEFIT";
        case "fee": return rng.pick(["MONTHLY ACCOUNT FEE", "ARRANGED OVERDRAFT USAGE FEE"]);
        case "fxfee": return "NON-STERLING TRANSACTION FEE";
        case "refund": return "CARD REFUND FROM " + l.src.shopText + " ON " + d10(l.iso);
      }
    } else if (flavor === "lloyds") {
      const sp = rng.chance(0.25) ? " " : "";       // the trailing space the export leaves on some descriptions
      switch (l.kind) {
        case "buy": return shop + (rng.chance(0.4) ? " CD " + last4 : "") + sp;
        case "bill": return shop + sp;
        case "rent": return rng.pick(["D HUGHES RENT", "HOMELET RENT"]);
        case "cardbill": return rng.pick(CARDBILL) + sp;
        case "save": return rng.pick(["TO SAVINGS " + digits(rng, 8), "VANGUARD ISA", "MONEYBOX SAVINGS"]);
        case "unsave": return "FROM SAVINGS " + digits(rng, 8);
        case "p2pOut": return who + " " + rng.pick(["DINNER", "FLAT", "TICKETS"]);
        case "p2pIn": return who;
        case "salary": return rng.pick([emp, emp + " SALARY", emp + " PAYROLL"]);
        case "cash": return "LNK " + rng.pick(["HIGH ST", "KINGS RD", "STATION RD"]) + " CD " + last4 + " " + ddmonyy(l.iso);
        case "interest": return "INTEREST (NET)";
        case "benefit": return "HMRC CHILD BENEFIT";
        case "fee": return rng.pick(["MONTHLY ACCOUNT FEE", "OVERDRAFT USAGE FEE"]);
        case "fxfee": return "NON-GBP TRANS FEE 2.75% CD " + last4;
        case "refund": return l.src.desc;
      }
    } else {
      switch (l.kind) {
        case "buy": return "'" + last4 + " " + ddmonyy(shift(l.iso, -rng.int(0, 2))) + " C , " + shop + " , " + (l.abroad ? rng.pick(["PARIS FR", "NEW YORK US"]) : rng.pick(UK_TOWNS) + " GB");
        case "bill": return shop;
        case "rent": return "'D HUGHES , RENT";
        case "cardbill": return rng.pick(CARDBILL);
        case "save": return "'TO A/C " + digits(rng, 8) + " SAVINGS , VIA MOBILE - PYMT";
        case "unsave": return "'FROM A/C " + digits(rng, 8) + " SAVINGS , VIA MOBILE - PYMT";
        case "p2pOut": return "'" + who + " , " + rng.pick(["DINNER", "FLAT", "TICKETS"]) + " , VIA MOBILE - PYMT , FP " + fmtD(l.iso, "dmy2") + " " + digits(rng, 4);
        case "p2pIn": return "'" + who + " , " + rng.pick(["DINNER", "BILLS"]) + " , FP " + fmtD(l.iso, "dmy2") + " " + digits(rng, 4);
        case "salary": return "'" + emp + " , SALARY";
        case "cash": return "'" + last4 + " " + ddmonyy(l.iso) + " , " + rng.pick(["HIGH ST", "KINGS RD"]) + " " + rng.pick(UK_TOWNS);
        case "interest": return "INTEREST";
        case "benefit": return "'HMRC CHILD BENEFIT";
        case "fee": return rng.pick(["ACCOUNT FEE", "ARRANGED OVERDRAFT FEE"]);
        case "fxfee": return "NON-STERLING TRANSACTION FEE";
        case "refund": return l.src.desc;
      }
    }
    return "MISC";
  };
  lines.filter((l) => l.kind !== "refund").forEach((l) => { l.desc = describe(l); l.shopText = l.e ? (l.desc.match(/TO (.+?)(?:,| ON )/) || [])[1] || l.e.name : ""; });
  lines.filter((l) => l.kind === "refund").forEach((l) => { l.desc = describe(l); });

  const traps = ["day-first dates", "running balance column"];
  const rows = [];
  const eol = rng.chance(0.65) ? "\r\n" : "\n";
  let shown = lines, nameBits;
  const CODE = flavor === "natwest"
    ? { buy: "POS", bill: "D/D", rent: "S/O", cardbill: "D/D", save: "OTR", unsave: "OTR", p2pOut: "OTR", p2pIn: "BAC", salary: "BAC", cash: "C/L", interest: "INT", benefit: "BAC", fee: "CHG", fxfee: "CHG", refund: "POS" }
    : { buy: "DEB", bill: "DD", rent: "SO", cardbill: "DD", save: "TFR", unsave: "TFR", p2pOut: "FPO", p2pIn: "FPI", salary: "BGC", cash: "CPT", interest: "INT", benefit: "BGC", fee: "CHG", fxfee: "DEB", refund: "DEB" };
  const code = (l) => (flavor !== "natwest" && l.kind === "buy" && rng.chance(0.1) ? "BP" : flavor === "lloyds" && l.kind === "save" && /VANGUARD|MONEYBOX/.test(l.desc) ? "SO" : CODE[l.kind] || "DEB");
  if (flavor === "spec") {
    const newest = rng.chance(0.5);
    if (newest) { shown = lines.slice().reverse(); traps.push("newest first"); }
    const mstyle = rng.pick(["plain", "plain", "pound", "comma"]);
    const bstyle = mstyle === "plain" && rng.chance(0.4) ? "pound" : mstyle;
    const titleCands = ["Account Name: MR J SMITH", "Current Account", "Sort Code: " + sortCode + " Account Number: " + acctNo,
      "Statement period: " + fmtD(iso(y, m, 1), "dmy") + " to " + fmtD(iso(y, m, lastDay(y, m)), "dmy")];
    const nTitles = rng.int(0, 3);
    const titles = rng.shuffle([0, 1, 2, 3]).slice(0, nTitles).sort((a, b) => a - b).map((i) => titleCands[i]);
    titles.forEach((t) => rows.push({ cells: [t] }));
    if (titles.length && rng.chance(0.5)) rows.push({ cells: null });
    rows.push({ cells: ["Date", "Type", "Description", "Paid out", "Paid in", "Balance"] });
    shown.forEach((l) => rows.push({ cells: [fmtD(l.iso, "dmy"), code(l), l.desc, l.a < 0 ? fmtM(-l.a, mstyle) : "", l.a > 0 ? fmtM(l.a, mstyle) : "", fmtM(l.bal, bstyle)] }));
    traps.push("split paid out / paid in", "type-code column (DEB/DD/SO/FPI/BGC)", "CARD PAYMENT TO <shop> is a purchase");
    if (titles.length) traps.push("title lines (" + titles.length + ")");
    if (titles.some((t) => /Sort Code/.test(t))) traps.push("sort code in a title line (looks like a date)");
    if (mstyle === "pound" || bstyle === "pound") traps.push("pound sign in money");
    if (mstyle === "comma") traps.push("thousands separator (quoted)");
    if (lines.some((l) => /,/.test(l.desc))) traps.push("quoted comma in description");
    nameBits = ["english uk-bank spec csv", "money " + mstyle];
  } else if (flavor === "lloyds") {
    shown = lines.slice().reverse();
    const apo = rng.chance(0.8);            // re-saved in Excel, the apostrophe is gone
    rows.push({ cells: ["Transaction Date", "Transaction Type", "Sort Code", "Account Number", "Transaction Description", "Debit Amount", "Credit Amount", "Balance"], trail: true });
    shown.forEach((l) => rows.push({ cells: [fmtD(l.iso, "dmy"), code(l), (apo ? "'" : "") + sortCode, acctNo, l.desc,
      l.a < 0 ? fmtM(-l.a, "general") : "", l.a > 0 ? fmtM(l.a, "general") : "", fmtM(l.bal, "general")] }));
    traps.push("split debit/credit columns", "type-code column", "sort-code column", "account-number column (8 digits)", "unformatted amounts (100, 64.4)", "trailing comma on the titles", "newest first");
    if (!apo) traps.push("sort code without its apostrophe (looks like a date)");
    if (lines.some((l) => / $/.test(l.desc))) traps.push("trailing spaces in descriptions");
    nameBits = ["english uk-bank lloyds csv"];
  } else {
    const newest = rng.chance(0.5);
    if (newest) { shown = lines.slice().reverse(); traps.push("newest first"); }
    const acctName = rng.pick(["'SELECT ACCOUNT", "'REWARD", "'MR J SMITH"]);
    const acct = "'" + sortCode.replace(/-/g, "") + "-" + acctNo;
    rows.push({ cells: null });
    rows.push({ cells: ["Date", " Type", " Description", " Value", " Balance", " Account Name", " Account Number"] });
    shown.forEach((l) => rows.push({ cells: [fmtD(l.iso, "dmy"), code(l), l.desc, fmtM(l.a, "plain"), fmtM(l.bal, "plain"), acctName, acct], q: [2, 5, 6], trail: true }));
    traps.push("blank first line", "titles with spaces after the commas", "signed Value column", "apostrophe-prefixed cells", "account name / number columns", "trailing comma on data rows");
    if (lines.some((l) => /,/.test(l.desc))) traps.push("quoted comma in description");
    nameBits = ["english uk-bank natwest csv"];
  }
  if (lines.some((l) => l.abroad)) traps.push("foreign purchase (currency in the description) + fee line");
  if (lines.some((l) => l.kind === "rent")) traps.push("rent standing order");
  if (lines.some((l) => l.kind === "benefit")) traps.push("child benefit income");
  const bom = rng.chance(0.2);
  if (bom) traps.push("BOM");
  const text = csvText(rows, eol, rng.chance(0.6));
  countTraps(lines, traps);
  if (lines.some((l) => l.bal < 0)) traps.push("negative (overdraft) balance");
  nameBits.push(eol === "\r\n" ? "crlf" : "lf", lines.length + " lines");
  return { name: nameBits.join(", "), kind: "bank", file: { kind: "csv", text, encoding: "utf-8", bom }, truth: truthOf(shown, false), statementTotals: [], traps };
}

// ----------------------------------------------------------- generic -----
function genericExport(rng) {
  const flavor = rng.pick(["card", "card", "card", "bank", "bank", "flow"]);
  const cur = rng.chance(0.65) ? "ILS" : "USD";
  const R = REGION[cur === "ILS" ? "IL" : "US"];
  const isXlsx = rng.chance(0.3);
  const dstyle = cur === "ILS" ? rng.pick(["dmy", "dmy", "dmy", "dmydot", "iso", "dmy2"]) : rng.pick(["mdy", "mdy", "iso"]);
  const [y, m] = pickMonth(rng);
  const n = rng.int(3, 60);
  const traps = ["Transaction Type first column", "total row"];
  const statementTotals = [];
  const out = [];               // { cells: [{ t: "text"|"date"|"money", v }], kind }
  const Tx = (v) => ({ t: "text", v });
  const Dt = (v) => ({ t: "date", v });
  const Mn = (v) => ({ t: "money", v });
  const E = null;
  const totalWord = rng.pick(["TOTAL", "TOTAL", "TOTAL", "Total", "TOTAL:", "Grand Total"]);
  let lines, kind, withIssuer = false, shownAll = [], nameBits;

  const titleCands = ["Transactions Report", "Account: ****" + digits(rng, 4), "Period: " + fmtD(iso(y, m, 1), dstyle) + " - " + fmtD(iso(y, m, lastDay(y, m)), dstyle),
    "Generated on " + fmtD(shift(iso(y, m, lastDay(y, m)), rng.int(1, 9)), dstyle) + " " + pad2(rng.int(7, 22)) + ":" + pad2(rng.int(0, 59)), "Currency: " + cur];
  const nTitles = rng.int(0, 4);
  const titles = rng.shuffle([0, 1, 2, 3, 4]).slice(0, nTitles).sort((a, b) => a - b).map((i) => titleCands[i]);
  titles.forEach((t) => out.push({ cells: [Tx(t)], kind: "title" }));
  if (titles.length && rng.chance(0.4)) out.push({ cells: [], kind: "blank" });
  if (titles.length) traps.push("title lines (" + titles.length + ")");

  if (flavor === "card") {
    kind = "card";
    const HEADS = [
      { keys: ["type", "date", "desc", "amount", "cur"], titles: ["Transaction Type", "Date", "Description", "Amount", "Currency"] },
      { keys: ["type", "desc", "date", "amount"], titles: ["Transaction Type", "Description", "Date", "Amount"] },
      { keys: ["type", "date", "desc", "cat", "amount", "cur"], titles: ["Transaction Type", "Date", "Description", "Category", "Amount", "Currency"] },
      { keys: ["type", "date", "desc", "orig", "origCur", "charge", "chargeCur", "notes"], titles: ["Transaction Type", "Transaction Date", "Description", "Original Amount", "Original Currency", "Charged Amount", "Charge Currency", "Notes"], rich: true },
      { keys: ["type", "ref", "date", "desc", "orig", "origCur", "charge", "card"], titles: ["Transaction Type", "Reference", "Date", "Description", "Original Amount", "Original Currency", "Amount Charged", "Card Number"], rich: true }
    ];
    const H = rng.pick(HEADS);
    const col = {};
    H.keys.forEach((k, i) => { col[k] = i; });
    const moneyKey = col.charge !== undefined ? "charge" : "amount";
    const positiveOut = rng.chance(0.6);
    const sign = (a) => (positiveOut ? -a : a);      // a: negative = out; the file's figure
    lines = cardPlan(rng, n, y, m, R, { payments: false, fees: true, bills: true });
    // Installments and purchases abroad, where the layout has a column for the shop's own figure.
    if (H.rich) {
      const nInst = cur === "ILS" && n >= 4 && rng.chance(0.6) ? rng.int(1, 3) : 0;
      const nAbroad = n >= 4 && rng.chance(0.6) ? rng.int(1, 3) : 0;
      let k = 0;
      for (let i = 0; i < lines.length && k < nInst + nAbroad; i++) {
        if (lines[i].kind !== "buy" || lines.some((r) => r.src === lines[i])) continue;
        if (k < nInst) {
          const e = rng.pick(INSTALLMENT);
          const full = cents(rng, 600, 6000);
          const N = full < 150000 ? rng.pick([2, 3, 3, 4, 6]) : rng.pick([3, 6, 10, 12, 12]);
          const kk = rng.int(1, N);
          const base = Math.floor(full / N), firstPay = full - base * (N - 1);
          const [py, pm] = addMonths(y, m, -(kk - 1));
          lines[i] = { iso: dayIn(rng, py, pm), a: -(kk === 1 ? firstPay : base), kind: "buy", e, cat: e.cat, transfer: false, refund: false, inst: { full, k: kk, N } };
        } else {
          const e = rng.pick(ABROAD.filter((x) => x.cur !== cur));
          const origA = cents(rng, e.lo, e.hi);
          const rate = cur === "ILS" ? { USD: 3.4 + rng() * 0.55, EUR: 3.85 + rng() * 0.45, GBP: 4.4 + rng() * 0.5 }[e.cur] : { EUR: 1.05 + rng() * 0.13, GBP: 1.22 + rng() * 0.13 }[e.cur];
          lines[i] = { iso: lines[i].iso, a: -Math.max(1, Math.round(origA * rate)), kind: "buy", e, cat: e.cat, transfer: false, refund: false, abroad: { origA, cur: e.cur } };
        }
        k++;
      }
    }
    const typeWord = (l) => (l.kind === "refund" ? rng.pick(["Refund", "Credit"]) : l.kind === "fee" ? "Fee" : l.inst ? "Installments"
      : l.e && (l.e.sec === "streaming" || l.e.bill) ? "Recurring"
      : l.abroad || (l.e && ONLINE.indexOf(l.e.sec) !== -1) ? rng.pick(["Online Purchase", "Online Purchase", "Purchase"])
      : rng.pick(["Purchase", "Purchase", "Contactless"]));
    lines.forEach((l) => {
      if (l.kind === "refund") return;
      if (l.kind === "fee") { l.desc = rng.pick(["CARD ANNUAL FEE", "FOREIGN CURRENCY FEE", "LATE PAYMENT FEE"]); l.issuer = label("fees", "generic"); return; }
      let t = l.e.name;
      if (l.e.code) t += alnum(rng, l.e.code);
      l.desc = t;
      l.issuer = label(l.e.sec, "generic");
    });
    lines.filter((l) => l.kind === "refund").forEach((l) => { l.desc = l.src.desc; l.issuer = l.src.issuer; });
    if (dstyle === "mdy") lateDay(rng, lines, y, m);
    lines.forEach((l) => { l.typeWord = typeWord(l); });
    withIssuer = col.cat !== undefined;

    // Sections: one per card, each with its titles and its subtotal.
    const cards = [digits(rng, 4)];
    const sectioned = n >= 6 && rng.chance(0.3);
    if (sectioned || col.card !== undefined) { const k2 = sectioned ? rng.int(2, 3) : rng.int(1, 2); while (cards.length < k2) cards.push(digits(rng, 4)); }
    lines.forEach((l) => { l.card = l.src ? l.src.card : rng.pick(cards); });
    const newest = rng.chance(0.3);
    const order = (ls) => { const c = chrono(ls); return newest ? c.reverse() : c; };
    const groups = sectioned ? cards.map((c) => order(lines.filter((l) => l.card === c))).filter((g) => g.length) : [order(lines)];
    const labelAtDesc = rng.chance(0.2);
    const cardStars = rng.pick(["", "****", "XXXX-XXXX-XXXX-"]);
    const net = (g) => sumOut(g) - sumIn(g);
    const totalRow = (lbl, a) => {
      const cells = new Array(H.keys.length).fill(E);
      cells[labelAtDesc ? col.desc : 0] = Tx(lbl);
      cells[col[moneyKey]] = Mn(sign(-a));
      if (col.chargeCur !== undefined && rng.chance(0.5)) cells[col.chargeCur] = Tx(cur);
      else if (col.cur !== undefined && rng.chance(0.5)) cells[col.cur] = Tx(cur);
      out.push({ cells, kind: "total" });
      if (a > 0) statementTotals.push(S(a));
    };
    let grand = 0;
    groups.forEach((g, gi) => {
      if (sectioned) {
        if (gi > 0 && rng.chance(0.6)) out.push({ cells: [], kind: "blank" });
        out.push({ cells: [Tx(rng.pick(["Card ending ", "Card: **** ", "Card No. "]) + g[0].card)], kind: "title" });
      }
      if (gi === 0 || sectioned) out.push({ cells: H.titles.map(Tx), kind: "head" });
      g.forEach((l) => {
        const cells = new Array(H.keys.length).fill(E);
        const put = (k2, v) => { if (col[k2] !== undefined) cells[col[k2]] = v; };
        put("type", Tx(l.typeWord));
        put("date", Dt(l.iso));
        put("desc", Tx(l.desc));
        put("cat", l.issuer ? Tx(l.issuer) : E);
        put(moneyKey, Mn(sign(l.a)));
        put("cur", Tx(cur));
        put("chargeCur", Tx(cur));
        put("orig", Mn(sign(l.inst ? -l.inst.full : l.abroad ? -l.abroad.origA : l.a)));
        put("origCur", Tx(l.abroad ? l.abroad.cur : cur));
        put("notes", l.inst ? Tx(rng.pick(["Installment " + l.inst.k + " of " + l.inst.N, "Payment " + l.inst.k + "/" + l.inst.N])) : E);
        put("ref", Tx(digits(rng, 9)));
        put("card", Tx(cardStars + l.card));
        out.push({ cells, kind: "line", l });
      });
      shownAll = shownAll.concat(g);
      const a = net(g);
      grand += a;
      if (sectioned) totalRow(rng.pick(["Subtotal", "Sub-total", "Subtotal for card " + g[0].card]), a);
    });
    if (sectioned && rng.chance(0.3)) out.push({ cells: [], kind: "blank" });
    totalRow(totalWord, grand);
    traps.push(positiveOut ? "purchases positive, refunds negative" : "purchases negative, refunds positive");
    if (col.cur !== undefined || col.chargeCur !== undefined) traps.push("currency column");
    if (col.orig !== undefined) traps.push("original-amount column beside the charge");
    if (col.ref !== undefined) traps.push("reference column");
    if (col.card !== undefined) traps.push("card-number column");
    if (col.cat !== undefined) traps.push("category column");
    if (lines.some((l) => l.inst)) traps.push("installment");
    if (lines.some((l) => l.abroad)) traps.push("foreign currency");
    if (sectioned) traps.push("section header repeated", "subtotal per section", "grand total");
    if (labelAtDesc) traps.push("total label in the description column");
    if (newest) traps.push("newest first");
    nameBits = ["english generic card " + (isXlsx ? "xlsx" : "csv") + " " + cur, H.keys.length + " cols" + (sectioned ? ", " + groups.length + " sections" : "")];
  } else {
    kind = "bank";
    lines = bankPlan(rng, n, y, m, R, {});
    if (dstyle === "mdy") lateDay(rng, lines, y, m);
    lines = chrono(lines);
    const open = A(rng.chance(0.85) ? (cur === "ILS" ? 1000 + rng() * 40000 : 300 + rng() * 12000) : 10 + rng() * 800);
    const close = balances(lines, open);
    const IL = {
      salary: () => rng.pick(["SALARY " + rng.pick(EMP_IL), "PAYROLL " + rng.pick(EMP_IL), rng.pick(EMP_IL) + " SALARY"]),
      cardbill: () => rng.pick(["ISRACARD", "MAX IT FINANCE", "VISA CAL", "CAL CREDIT CARD CHARGE", "AMERICAN EXPRESS ISRAEL"]),
      save: () => rng.pick(["TRANSFER TO SAVINGS", "DEPOSIT TO SAVINGS PLAN", "STUDY FUND DEPOSIT", "PENSION FUND DEPOSIT", "TRANSFER TO FIXED DEPOSIT"]),
      unsave: () => rng.pick(["FIXED DEPOSIT RELEASE", "TRANSFER FROM SAVINGS"]),
      p2pOut: () => rng.pick(["BIT TRANSFER", "PAYBOX TRANSFER", "BANK TRANSFER TO D. COHEN", "BIT - PAYMENT TO NOA"]),
      p2pIn: () => rng.pick(["BIT TRANSFER RECEIVED", "BANK TRANSFER FROM Y. LEVI", "PAYBOX RECEIVED"]),
      cash: () => rng.pick(["ATM WITHDRAWAL", "CASH WITHDRAWAL ATM"]),
      fee: () => rng.pick(["ACCOUNT MANAGEMENT FEE", "BANK FEE"]),
      interest: () => rng.pick(["INTEREST ON DEPOSIT", "CREDIT INTEREST"]),
      benefit: () => "NATIONAL INSURANCE CHILD ALLOWANCE"
    };
    lines.filter((l) => l.kind !== "refund").forEach((l) => {
      if (l.e) { l.desc = l.e.name + (l.e.code ? alnum(rng, l.e.code) : ""); return; }
      l.desc = cur === "ILS" && IL[l.kind] ? IL[l.kind]() : usDescribe(rng, l, "plain");
    });
    lines.filter((l) => l.kind === "refund").forEach((l) => { l.desc = l.src.desc; });
    const TYPE = { buy: "Card Purchase", bill: "Direct Debit", cardbill: rng.pick(["Direct Debit", "Credit Card Payment"]), save: "Standing Order", unsave: "Transfer In",
      p2pOut: "Transfer Out", p2pIn: "Transfer In", cash: "ATM Withdrawal", fee: "Bank Fee", salary: rng.pick(["Salary", "Transfer In"]), interest: "Interest", benefit: "Transfer In", refund: "Card Refund" };
    const newest = rng.chance(0.35);
    const shown = newest ? lines.slice().reverse() : lines;
    shownAll = shown;
    if (newest) traps.push("newest first");
    if (flavor === "bank") {
      const HEADS = [
        { keys: ["type", "desc", "date", "debit", "credit", "bal"], titles: ["Transaction Type", "Description", "Date", "Debit", "Credit", "Balance"] },
        { keys: ["type", "date", "desc", "debit", "credit", "bal"], titles: ["Transaction Type", "Date", "Description", "Money Out", "Money In", "Balance"] },
        { keys: ["type", "date", "desc", "ref", "debit", "credit", "bal"], titles: ["Transaction Type", "Date", "Description", "Reference", "Withdrawals", "Deposits", "Balance"] }
      ];
      const H = rng.pick(HEADS);
      const col = {};
      H.keys.forEach((k, i) => { col[k] = i; });
      out.push({ cells: H.titles.map(Tx), kind: "head" });
      const balRow = (lbl, dIso, a) => {
        const cells = new Array(H.keys.length).fill(E);
        cells[col.desc] = Tx(lbl);
        if (rng.chance(0.5)) cells[col.date] = Dt(dIso);
        cells[col.bal] = Mn(a);
        out.push({ cells, kind: "balance" });
      };
      const openRow = rng.chance(0.3), closeRow = rng.chance(0.3);
      const first = iso(y, m, 1), last = iso(y, m, lastDay(y, m));
      const top = newest ? [closeRow, "Closing Balance", last, close] : [openRow, "Opening Balance", first, open];
      const bot = newest ? [openRow, "Opening Balance", first, open] : [closeRow, "Closing Balance", last, close];
      if (top[0]) balRow(top[1], top[2], top[3]);
      shown.forEach((l) => {
        const cells = new Array(H.keys.length).fill(E);
        cells[col.type] = Tx(TYPE[l.kind] || "Other");
        cells[col.date] = Dt(l.iso);
        cells[col.desc] = Tx(l.desc);
        if (col.ref !== undefined) cells[col.ref] = Tx(digits(rng, rng.int(6, 9)));
        if (l.a < 0) cells[col.debit] = Mn(-l.a); else cells[col.credit] = Mn(l.a);
        cells[col.bal] = Mn(l.bal);
        out.push({ cells, kind: "line", l });
      });
      if (bot[0]) balRow(bot[1], bot[2], bot[3]);
      if (rng.chance(0.3)) out.push({ cells: [], kind: "blank" });
      const tOut = sumOut(lines), tIn = sumIn(lines);
      const cells = new Array(H.keys.length).fill(E);
      cells[0] = Tx(totalWord);
      cells[col.debit] = Mn(tOut);
      cells[col.credit] = Mn(tIn);
      if (rng.chance(0.3)) cells[col.bal] = Mn(close);
      out.push({ cells, kind: "total" });
      if (tOut > 0) statementTotals.push(S(tOut));
      if (tIn > 0) statementTotals.push(S(tIn));
      traps.push("split debit/credit columns", "running balance column", "total row with both sums");
      if (col.ref !== undefined) traps.push("reference column");
      if (openRow) traps.push("opening balance line");
      if (closeRow) traps.push("closing balance line");
      nameBits = ["english generic bank " + (isXlsx ? "xlsx" : "csv") + " " + cur];
    } else {
      const [DR, CR] = rng.pick([["Debit", "Credit"], ["DEBIT", "CREDIT"], ["DR", "CR"]]);
      const HEADS = [
        { keys: ["type", "desc", "date", "amount", "bal"], titles: ["Transaction Type", "Description", "Date", "Amount", "Balance"] },
        { keys: ["type", "desc", "date", "amount"], titles: ["Transaction Type", "Description", "Date", "Amount"] },
        { keys: ["type", "date", "desc", "ref", "amount"], titles: ["Transaction Type", "Date", "Description", "Reference", "Amount"] }
      ];
      const H = rng.pick(HEADS);
      const col = {};
      H.keys.forEach((k, i) => { col[k] = i; });
      out.push({ cells: H.titles.map(Tx), kind: "head" });
      shown.forEach((l) => {
        const cells = new Array(H.keys.length).fill(E);
        cells[col.type] = Tx(l.a < 0 ? DR : CR);
        cells[col.date] = Dt(l.iso);
        cells[col.desc] = Tx(l.desc);
        if (col.ref !== undefined) cells[col.ref] = Tx(digits(rng, 8));
        cells[col.amount] = Mn(Math.abs(l.a));
        if (col.bal !== undefined) cells[col.bal] = Mn(l.bal);
        out.push({ cells, kind: "line", l });
      });
      const tOut = sumOut(lines), tIn = sumIn(lines);
      const zeroShown = rng.chance(0.5);
      const tRow = (lbl, a) => {
        if (!a && !zeroShown) return;
        const cells = new Array(H.keys.length).fill(E);
        cells[0] = Tx(lbl);
        cells[col.amount] = Mn(a);
        out.push({ cells, kind: "total" });
        if (a > 0) statementTotals.push(S(a));
      };
      const [lOut, lIn] = DR === "DR" ? ["TOTAL DR", "TOTAL CR"] : totalWord === "Total" ? ["Total Debits", "Total Credits"] : ["TOTAL DEBITS", "TOTAL CREDITS"];
      tRow(lOut, tOut);
      tRow(lIn, tIn);
      traps.push("unsigned amounts, direction in the Transaction Type column (" + DR + "/" + CR + ")", "total debits / total credits rows");
      if (col.bal !== undefined) traps.push("running balance column");
      if (col.ref !== undefined) traps.push("reference column");
      if (!tIn && zeroShown) traps.push("zero total line");
      nameBits = ["english generic flow " + (isXlsx ? "xlsx" : "csv") + " " + cur];
    }
  }

  // ---- render ----------------------------------------------------------
  let file;
  if (isXlsx) {
    const dmode = rng.pick(["cell", "cell", "custom", "text"]);
    const inline = rng.chance(0.2);
    const T = (s) => (inline ? { inline: s } : s);
    const rows = out.map((r) => r.cells.map((c) => {
      if (!c) return null;
      if (c.t === "text") return T(c.v);
      if (c.t === "date") return dmode === "text" ? T(fmtD(c.v, dstyle)) : dmode === "custom" ? { date: c.v, custom: true } : { date: c.v };
      return { n: S(c.v) };
    }));
    file = { kind: "xlsx", sheets: [{ name: rng.pick(["Transactions", "Sheet1", "Export"]), rows }] };
    traps.push("xlsx");
    if (dmode === "text") traps.push("text dates in xlsx");
    nameBits.push("dates " + dmode);
  } else {
    const shekel = cur === "ILS" && rng.chance(0.35);
    const mstyle = shekel ? rng.pick(["shekelPre", "shekelPost"]) : rng.pick(["plain", "plain", "comma", "general", cur === "ILS" ? "codeILS" : "codeUSD"].concat(cur === "USD" ? ["dollar"] : []));
    const encoding = cur === "ILS" && rng.chance(0.3) ? "windows-1255" : "utf-8";
    const bom = encoding === "utf-8" && rng.chance(0.3);
    const eol = rng.chance(0.6) ? "\r\n" : "\n";
    const pad = rng.chance(0.3);
    const width = out.reduce((w, r) => Math.max(w, r.cells.length), 0);
    const rows = out.map((r) => {
      if (r.kind === "blank") return pad ? { cells: new Array(width).fill("") } : { cells: null };
      const cells = r.cells.map((c) => (!c ? "" : c.t === "text" ? c.v : c.t === "date" ? fmtD(c.v, dstyle) : fmtM(c.v, mstyle)));
      if (pad) while (cells.length < width) cells.push("");
      return { cells };
    });
    file = { kind: "csv", text: csvText(rows, eol, rng.chance(0.5)), encoding, bom };
    if (encoding === "windows-1255") traps.push("windows-1255");
    if (bom) traps.push("BOM");
    if (mstyle === "comma" || mstyle === "dollar") traps.push("thousands separator (quoted)");
    if (shekel) traps.push("shekel sign in amount");
    if (/^code/.test(mstyle)) traps.push("currency code in the amount cell");
    if (mstyle === "general") traps.push("unformatted amounts");
    if (pad) traps.push("padded empty cells");
    nameBits.push(encoding === "windows-1255" ? "cp1255" : "utf-8" + (bom ? "+bom" : ""), eol === "\r\n" ? "crlf" : "lf", "money " + mstyle);
  }
  if (dstyle === "mdy") traps.push("month-first dates");
  if (dstyle === "dmy2") traps.push("two-digit years");
  if (dstyle === "dmydot") traps.push("dotted dates");
  countTraps(lines, traps);
  nameBits.push(shownAll.length + " lines");
  return { name: nameBits.join(", "), kind, file, truth: truthOf(shownAll, withIssuer), statementTotals, traps };
}

// --------------------------------------------------------------- make ----
function make(rng) {
  const which = rng.pick(["us-bank", "us-bank", "us-card", "us-card", "uk-bank", "uk-bank", "generic", "generic", "generic"]);
  if (which === "us-bank") return usBank(rng);
  if (which === "us-card") return usCard(rng);
  if (which === "uk-bank") return ukBank(rng);
  return genericExport(rng);
}

export default {
  id: "english",
  describe: "English-language exports: US checking (plain / Bank of America with its summary block / Chase with Details+Type+check columns), US credit cards (Chase Type column, Capital One Debit/Credit + Card No., Amex positive charges with Account # and multi-line cells), UK current accounts (Paid out/Paid in with DEB/DD/SO codes, Lloyds sort-code/account columns, NatWest signed Value), and a generic Transaction-Type-first export with TOTAL/Subtotal lines, installments and foreign currency - CSV and .xlsx",
  make
};
