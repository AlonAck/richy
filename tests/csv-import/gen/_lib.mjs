// Shared pieces for the random statement generators. Every generator builds a
// statement in one real export layout, with rows drawn at random, and returns
// the file TOGETHER WITH the truth: which lines are purchases, how much, which
// way, which category a person would put them in. The random suite reads the
// file through the shipping import code and compares what comes out with the
// truth - so a total line counted as a purchase, a currency column read as
// money, or a shop filed under Other shows up as a number that does not match.

// Seeded, so a failure names a seed and the seed replays it exactly.
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  const next = function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));          // inclusive
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.chance = (p) => next() < p;
  next.shuffle = (arr) => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; };
  return next;
}

export const round2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- merchants --
// Real Israeli (and a few international) shops, each with the category a
// person would file it under in Richy's default set. `lo`/`hi` bound a
// plausible single charge. `kw` marks shops the built-in keyword map is
// expected to know on its own (the fallback when Alfred is unreachable).
// `issuer` is how Max / Cal would label the shop's sector in their own
// category column.
export const SHOPS = [
  // Food
  { name: "שופרסל דיל", cat: "Food", lo: 60, hi: 650, kw: true, issuer: "מזון וצריכה" },
  { name: "שופרסל אונליין", cat: "Food", lo: 150, hi: 900, kw: true, issuer: "מזון וצריכה" },
  { name: "רמי לוי שיווק השקמה", cat: "Food", lo: 80, hi: 700, kw: true, issuer: "מזון וצריכה" },
  { name: "יוחננוף", cat: "Food", lo: 50, hi: 600, kw: true, issuer: "מזון וצריכה" },
  { name: "ויקטורי", cat: "Food", lo: 40, hi: 400, kw: true, issuer: "מזון וצריכה" },
  { name: "אושר עד", cat: "Food", lo: 90, hi: 800, kw: true, issuer: "מזון וצריכה" },
  { name: "טיב טעם", cat: "Food", lo: 30, hi: 300, kw: true, issuer: "מזון וצריכה" },
  { name: "AM:PM דיזנגוף", cat: "Food", lo: 12, hi: 120, issuer: "מזון וצריכה" },
  { name: "ארומה תל אביב", cat: "Food", lo: 18, hi: 75, kw: true, issuer: "מסעדות, קפה וברים" },
  { name: "קפה גרג", cat: "Food", lo: 20, hi: 90, kw: true, issuer: "מסעדות, קפה וברים" },
  { name: "COFIX", cat: "Food", lo: 5, hi: 30, issuer: "מסעדות, קפה וברים" },
  { name: "וולט", cat: "Food", lo: 45, hi: 220, kw: true, issuer: "מסעדות, קפה וברים" },
  { name: "WOLT", cat: "Food", lo: 45, hi: 220, kw: true, issuer: "מסעדות, קפה וברים" },
  { name: "תן ביס", cat: "Food", lo: 35, hi: 140, kw: true, issuer: "מסעדות, קפה וברים" },
  { name: "מקדונלדס", cat: "Food", lo: 30, hi: 110, kw: true, issuer: "מסעדות, קפה וברים" },
  { name: "דומינוס פיצה", cat: "Food", lo: 50, hi: 160, kw: true, issuer: "מסעדות, קפה וברים" },
  { name: "מאפיית אנג'ל", cat: "Food", lo: 10, hi: 90, kw: true, issuer: "מזון וצריכה" },
  { name: "ג'פניקה", cat: "Food", lo: 60, hi: 220, issuer: "מסעדות, קפה וברים" },
  { name: "בנדיקט", cat: "Food", lo: 70, hi: 260, issuer: "מסעדות, קפה וברים" },
  // Transport
  { name: "פז יקום", cat: "Transport", lo: 120, hi: 380, kw: true, issuer: "תחבורה ורכבים" },
  { name: "סונול גלילות", cat: "Transport", lo: 100, hi: 350, kw: true, issuer: "תחבורה ורכבים" },
  { name: "דלק מוטורס", cat: "Transport", lo: 120, hi: 350, kw: true, issuer: "תחבורה ורכבים" },
  { name: "דור אלון", cat: "Transport", lo: 110, hi: 330, kw: true, issuer: "תחבורה ורכבים" },
  { name: "פנגו", cat: "Transport", lo: 5, hi: 60, kw: true, issuer: "תחבורה ורכבים" },
  { name: "רב קו", cat: "Transport", lo: 20, hi: 250, kw: true, issuer: "תחבורה ורכבים" },
  { name: "רכבת ישראל", cat: "Transport", lo: 8, hi: 60, kw: true, issuer: "תחבורה ורכבים" },
  { name: "GETT", cat: "Transport", lo: 25, hi: 140, kw: true, issuer: "תחבורה ורכבים" },
  { name: "YANGO", cat: "Transport", lo: 20, hi: 120, kw: true, issuer: "תחבורה ורכבים" },
  { name: "כביש 6", cat: "Transport", lo: 15, hi: 90, kw: true, issuer: "תחבורה ורכבים" },
  // Housing
  { name: "חברת החשמל לישראל", cat: "Housing", lo: 200, hi: 900, kw: true, issuer: "חשמל וגז" },
  { name: "בזק", cat: "Housing", lo: 60, hi: 180, kw: true, issuer: "שירותי תקשורת" },
  { name: "הוט מובייל", cat: "Housing", lo: 30, hi: 200, kw: true, issuer: "שירותי תקשורת" },
  { name: "פרטנר תקשורת", cat: "Housing", lo: 40, hi: 150, kw: true, issuer: "שירותי תקשורת" },
  { name: "סלקום", cat: "Housing", lo: 30, hi: 160, kw: true, issuer: "שירותי תקשורת" },
  { name: "עיריית תל אביב ארנונה", cat: "Housing", lo: 300, hi: 1200, kw: true, issuer: "עירייה וממשלה" },
  { name: "מי אביבים", cat: "Housing", lo: 80, hi: 350, kw: true, issuer: "עירייה וממשלה" },
  // Health
  { name: "סופר פארם", cat: "Health", lo: 20, hi: 400, kw: true, issuer: "רפואה ובתי מרקחת" },
  { name: "SUPER-PHARM", cat: "Health", lo: 20, hi: 400, kw: true, issuer: "רפואה ובתי מרקחת" },
  { name: "מכבי שירותי בריאות", cat: "Health", lo: 30, hi: 300, kw: true, issuer: "רפואה ובתי מרקחת" },
  { name: "הולמס פלייס", cat: "Health", lo: 150, hi: 450, kw: true, issuer: "פנאי, בידור וספורט" },
  { name: "גוד פארם", cat: "Health", lo: 15, hi: 250, kw: true, issuer: "רפואה ובתי מרקחת" },
  // Entertainment
  { name: "NETFLIX.COM", cat: "Entertainment", lo: 32.9, hi: 69.9, kw: true, issuer: "פנאי, בידור וספורט" },
  { name: "SPOTIFY", cat: "Entertainment", lo: 19.9, hi: 39.9, kw: true, issuer: "פנאי, בידור וספורט" },
  { name: "סינמה סיטי גלילות", cat: "Entertainment", lo: 40, hi: 200, kw: true, issuer: "פנאי, בידור וספורט" },
  { name: "יס פלאנט", cat: "Entertainment", lo: 40, hi: 180, kw: true, issuer: "פנאי, בידור וספורט" },
  { name: "STEAM GAMES", cat: "Entertainment", lo: 20, hi: 250, kw: true, issuer: "פנאי, בידור וספורט" },
  // Shopping
  { name: "זארה", cat: "Shopping", lo: 90, hi: 700, kw: true, issuer: "אופנה" },
  { name: "קסטרו", cat: "Shopping", lo: 80, hi: 500, kw: true, issuer: "אופנה" },
  { name: "איקאה נתניה", cat: "Shopping", lo: 100, hi: 2500, kw: true, issuer: "עיצוב הבית" },
  { name: "KSP", cat: "Shopping", lo: 50, hi: 4000, kw: true, issuer: "חשמל ומחשבים" },
  { name: "באג מולטיסיסטם", cat: "Shopping", lo: 80, hi: 3000, kw: true, issuer: "חשמל ומחשבים" },
  { name: "ALIEXPRESS", cat: "Shopping", lo: 15, hi: 300, kw: true, issuer: "שונות" },
  { name: "AMAZON MKTPLACE", cat: "Shopping", lo: 30, hi: 900, kw: true, issuer: "שונות" },
  { name: "מקס סטוק", cat: "Shopping", lo: 20, hi: 350, issuer: "עיצוב הבית" },
  { name: "סטימצקי", cat: "Shopping", lo: 40, hi: 250, kw: true, issuer: "ספרים ודפוס" },
  { name: "SHEIN", cat: "Shopping", lo: 40, hi: 500, kw: true, issuer: "אופנה" },
  // Travel
  { name: "אל על", cat: "Travel", lo: 400, hi: 5000, kw: true, issuer: "טיסות ותיירות" },
  { name: "BOOKING.COM", cat: "Travel", lo: 300, hi: 4000, kw: true, issuer: "טיסות ותיירות" },
  { name: "ישראייר", cat: "Travel", lo: 300, hi: 3000, kw: true, issuer: "טיסות ותיירות" }
];

// Shops whose NAME carries a legal suffix written with a bare quote mark, the
// way Israeli banks write it - the scanner has to read the quote as a letter.
export function withSuffix(rng, name) {
  if (!/[א-ת]/.test(name) || !rng.chance(0.2)) return name;
  return name + " " + rng.pick(["בע\"מ", "בע״מ", "(1990) בע\"מ"]);
}

// Lines a bank account carries that are not shops. `transfer` is what Richy
// should make of them: true = between the user's own accounts (not spending).
export const BANK_OUT = [
  { name: "ישראכרט", transfer: true, lo: 1500, hi: 9000 },
  { name: "מקס איט פיננסים", transfer: true, lo: 1500, hi: 9000 },
  { name: "כאל חיוב חודשי", transfer: true, lo: 1500, hi: 9000 },
  { name: "הפקדה לפיקדון", transfer: true, lo: 500, hi: 5000 },
  { name: "העברה לחיסכון", transfer: true, lo: 200, hi: 3000 },
  { name: "קרן השתלמות", transfer: true, lo: 300, hi: 1500 },
  { name: "משיכת מזומן כספומט", cash: true, lo: 100, hi: 1000 },
  { name: "העברה בביט", p2p: true, lo: 20, hi: 600 },
  { name: "PAYBOX", p2p: true, lo: 20, hi: 400 }
];
export const BANK_IN = [
  { name: "משכורת", cat: "Salary", lo: 7000, hi: 26000 },
  { name: "העברת משכורת חברת היי טק בע\"מ", cat: "Salary", lo: 7000, hi: 26000 },
  { name: "ריבית על פיקדון", cat: "Investments", lo: 5, hi: 300 },
  { name: "ביטוח לאומי קצבת ילדים", cat: "Other", lo: 150, hi: 400 }
];

// -------------------------------------------------------------- formatting --
export function isoDate(y, m, d) { return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }
// A random day in the statement month (always a real day).
export function randomDay(rng, y, m) {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return isoDate(y, m, rng.int(1, last));
}
// "2026-09-03" in one of the ways exports write it. Two-digit years and
// dotted dates are both real (Cal writes 03/09/26, some banks 03.09.2026).
export function fmtDate(iso, style) {
  const [y, m, d] = iso.split("-");
  switch (style) {
    case "dmy": return d + "/" + m + "/" + y;
    case "dmy2": return d + "/" + m + "/" + y.slice(2);
    case "dmydot": return d + "." + m + "." + y;
    case "dmydash": return d + "-" + m + "-" + y;
    case "mdy": return m + "/" + d + "/" + y;
    case "iso": return iso;
    default: return d + "/" + m + "/" + y;
  }
}
// A money figure in one of the ways exports write it.
//   plain     1234.50
//   comma     1,234.50
//   shekel    ₪ 1,234.50  (or 1,234.50 ₪)
//   euro      1.234,50    (only with a ; or tab separator - a comma file
//                          would split it)
//   trailing  1,234.50-   (Israeli banks put the minus at the end)
export function fmtMoney(n, style, rng) {
  const neg = n < 0;
  const a = Math.abs(n);
  const fixed = a.toFixed(2);
  const [ip, dp] = fixed.split(".");
  const grouped = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  let s;
  switch (style) {
    case "comma": s = grouped + "." + dp; break;
    case "shekel": s = (rng && rng.chance(0.5)) ? "₪ " + grouped + "." + dp : grouped + "." + dp + " ₪"; break;
    case "euro": s = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + dp; break;
    case "trailing": return neg ? grouped + "." + dp + "-" : grouped + "." + dp;
    default: s = fixed;
  }
  return neg ? "-" + s : s;
}

// One CSV line. Quotes a cell only when it has to (the separator, a quote or
// a line break in it), and doubles its quotes - what Excel writes. A cell
// with a quote in the MIDDLE and nothing else to escape is written bare, the
// way Israeli banks write בע"מ.
export function csvLine(cells, sep) {
  return cells.map((c) => {
    const s = c == null ? "" : String(c);
    if (s.indexOf(sep) !== -1 || /[\r\n]/.test(s) || /^"/.test(s)) return "\"" + s.replace(/"/g, "\"\"") + "\"";
    return s;
  }).join(sep);
}

// Build `n` purchase lines from SHOPS, with an optional refund now and then.
// Returns truth lines: { date, amount, type, shop, cat, issuer, refund? }.
export function randomPurchases(rng, n, y, m, opts) {
  opts = opts || {};
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = rng.pick(SHOPS);
    const amount = round2(s.lo + rng() * (s.hi - s.lo));
    out.push({ date: randomDay(rng, y, m), amount, type: "expense", shop: withSuffix(rng, s.name), cat: s.cat, issuer: s.issuer, kw: !!s.kw });
  }
  if (opts.refunds && rng.chance(0.5)) {
    const k = rng.int(1, 2);
    for (let j = 0; j < k && out.length; j++) {
      const src = rng.pick(out.filter((t) => t.type === "expense"));
      if (!src) break;
      out.push({ date: randomDay(rng, y, m), amount: round2(Math.min(src.amount, 10 + rng() * src.amount)), type: "income", refund: true, shop: src.shop, cat: src.cat, issuer: src.issuer, kw: src.kw });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// Net of what a card charged: purchases minus refunds, to the agora.
export function netOut(lines) {
  let s = 0;
  lines.forEach((t) => { if (!t.transfer) s += t.type === "expense" ? t.amount : -t.amount; });
  return round2(s);
}
