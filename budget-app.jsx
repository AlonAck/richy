import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const T = {
  bg:        "#F7F3EE",
  card:      "#FFFFFF",
  dark:      "#141210",
  darkCard:  "#1E1A16",
  darkCard2: "#252018",
  glass:     "rgba(255,255,255,0.82)",
  ink:       "#1A1410",
  ink2:      "#6B5C4E",
  ink3:      "#B0A396",
  sep:       "rgba(0,0,0,0.06)",
  sepDark:   "rgba(255,255,255,0.08)",
  orange:    "#8970C6",
  orangeHi:  "#C8B1FF",
  orangeDim: "rgba(137,112,198,0.13)",
  orangeGlow:"rgba(137,112,198,0.30)",
  btn:       "linear-gradient(135deg,#9D78E8 0%,#B493F2 55%,#CBB6FA 100%)",
  heroInk:   "#2A1F4D",
  green:     "#27A85F",
  greenDim:  "rgba(39,168,95,0.15)",
  greenGlow: "rgba(39,168,95,0.25)",
  red:       "#E03030",
  redDim:    "rgba(224,48,48,0.13)",
  gold:      "#C8983A",
  goldDim:   "rgba(200,152,58,0.15)",
  goldGlow:  "rgba(200,152,58,0.25)",
  blue:      "#2E7DD6",
  blueDim:   "rgba(46,125,214,0.15)",
  blueGlow:  "rgba(46,125,214,0.25)",
  purple:    "#9B6DB5",
  purpleDim: "rgba(155,109,181,0.15)",
};

// Two switchable palettes. "purple" is the lavender-hero design; "classic" is the
// original orange-on-dark-hero look. Each defines the accent tokens plus every
// hero/trend value that differs between the two. applyTheme() copies the chosen
// palette onto the live T object (mutated in place) so all render-time T.* reads
// pick it up; App re-applies on every render from the persisted `theme` setting.
var THEMES = {
  purple: {
    orange: "#8970C6", orangeHi: "#C8B1FF", orangeDim: "rgba(137,112,198,0.13)", orangeGlow: "rgba(137,112,198,0.30)",
    heroBg: "linear-gradient(160deg,#9D78E8 0%,#B493F2 50%,#CBB6FA 100%)",
    heroBg2: "linear-gradient(135deg,#9D78E8 0%,#B493F2 55%,#CBB6FA 100%)",
    btn: "linear-gradient(135deg,#9D78E8 0%,#B493F2 55%,#CBB6FA 100%)",
    heroShadow: "0 12px 40px rgba(137,112,198,0.32), 0 2px 8px rgba(137,112,198,0.16)",
    heroGlow1: "rgba(255,255,255,0.34)", heroGlow2: "rgba(255,255,255,0.16)",
    heroText: "#2A1F4D", heroMut: "rgba(42,31,77,0.6)", heroFaint: "rgba(42,31,77,0.45)",
    heroSep: "rgba(42,31,77,0.12)", heroTrack: "rgba(42,31,77,0.09)",
    heroPos: "#188A4A", heroNeg: "#C73A36",
    heroPillBg: "#FFFFFF", heroPillText: "#1A1410", heroRangeBg: "rgba(42,31,77,0.08)",
    trendLineA: "#5E44A8", trendLineB: "#8E73D6", trendArea: "#6A4FB5",
    trendDot: "#5E44A8", trendDotStroke: "#CFBBFF", trendGlow: "#6A4FB5",
    gridStrong: "rgba(42,31,77,0.12)", gridMid: "rgba(42,31,77,0.08)", gridFaint: "rgba(42,31,77,0.06)",
    ringA: "#5E44A8",
    advGreen: "#188A4A", advRingLow: "#E03030",
    catNameHero: "rgba(42,31,77,0.82)", merchNameHero: "rgba(42,31,77,0.85)", merchBar: "linear-gradient(90deg,#6A4FB5,#9277D6)",
  },
  classic: {
    orange: "#C8673A", orangeHi: "#E07848", orangeDim: "rgba(200,103,58,0.13)", orangeGlow: "rgba(200,103,58,0.30)",
    heroBg: "linear-gradient(155deg,#272118 0%,#1E1A16 52%,#131110 100%)",
    heroBg2: "linear-gradient(135deg,#E07848,#C8673A)",
    btn: "linear-gradient(135deg,#E07848,#C8673A)",
    heroShadow: "0 1px 1px rgba(0,0,0,0.06), 0 14px 34px rgba(40,28,16,0.34)",
    heroGlow1: "rgba(224,120,72,0.30)", heroGlow2: "rgba(200,152,58,0.16)",
    heroText: "#FFFFFF", heroMut: "rgba(255,255,255,0.5)", heroFaint: "rgba(255,255,255,0.4)",
    heroSep: "rgba(255,255,255,0.1)", heroTrack: "rgba(255,255,255,0.08)",
    heroPos: "#4ADE80", heroNeg: "#FF7A6B",
    heroPillBg: "rgba(255,255,255,0.92)", heroPillText: "#141210", heroRangeBg: "rgba(255,255,255,0.08)",
    trendLineA: "#E07848", trendLineB: "#F0AE80", trendArea: "#E07848",
    trendDot: "#F3B488", trendDotStroke: "#1E1A16", trendGlow: "#E07848",
    gridStrong: "rgba(255,255,255,0.07)", gridMid: "rgba(255,255,255,0.05)", gridFaint: "rgba(255,255,255,0.04)",
    ringA: "#E07848",
    advGreen: "#4ADE80", advRingLow: "#E07848",
    catNameHero: "rgba(255,255,255,0.82)", merchNameHero: "rgba(255,255,255,0.9)", merchBar: "linear-gradient(90deg,#C8673A99,#E07848)",
  },
  // "blue" (Cornflower Ocean) — a light periwinkle hero with deep-navy ink, built on
  // the two requested blues: #5C7AE3 (cornflower periwinkle — hero + accent highlight)
  // and #3C4C82 (deep navy — primary accent for on-cream buttons/marks/links, crisp
  // ~8:1 on the cream bg). The hero ink is #242C52, a deepened shade of #3C4C82, so
  // the balance number reads clearly on the periwinkle hero (#3C4C82 alone is only
  // ~2.3:1 there). Light hero => dark text, like the flagship Violet.
  blue: {
    orange: "#3C4C82", orangeHi: "#5C7AE3", orangeDim: "rgba(92,122,227,0.15)", orangeGlow: "rgba(92,122,227,0.30)",
    heroBg: "linear-gradient(160deg,#5C7AE3 0%,#8493E2 50%,#B2BEED 100%)",
    heroBg2: "linear-gradient(135deg,#5C7AE3 0%,#8493E2 55%,#B2BEED 100%)",
    btn: "linear-gradient(135deg,#5C7AE3 0%,#4C5E9C 55%,#3C4C82 100%)",
    heroShadow: "0 12px 40px rgba(60,76,130,0.30), 0 2px 8px rgba(60,76,130,0.16)",
    heroGlow1: "rgba(255,255,255,0.36)", heroGlow2: "rgba(255,255,255,0.16)",
    heroText: "#242C52", heroMut: "rgba(36,44,82,0.62)", heroFaint: "rgba(36,44,82,0.46)",
    heroSep: "rgba(36,44,82,0.13)", heroTrack: "rgba(36,44,82,0.10)",
    heroPos: "#188A4A", heroNeg: "#C73A36",
    heroPillBg: "#FFFFFF", heroPillText: "#1B2140", heroRangeBg: "rgba(36,44,82,0.08)",
    trendLineA: "#2E3A66", trendLineB: "#5C7AE3", trendArea: "#3C4C82",
    trendDot: "#2E3A66", trendDotStroke: "#C3CDF0", trendGlow: "#3C4C82",
    gridStrong: "rgba(36,44,82,0.12)", gridMid: "rgba(36,44,82,0.08)", gridFaint: "rgba(36,44,82,0.06)",
    ringA: "#3C4C82",
    advGreen: "#188A4A", advRingLow: "#E03030",
    catNameHero: "rgba(36,44,82,0.82)", merchNameHero: "rgba(36,44,82,0.85)", merchBar: "linear-gradient(90deg,#3C4C82,#5C7AE3)",
  },
};
var _theme = { name: "purple" };
function applyTheme(name) {
  var p = THEMES[name] || THEMES.purple;
  for (var k in p) { T[k] = p[k]; }
  T.heroInk = p.heroText;
  _theme.name = THEMES[name] ? name : "purple";
}
applyTheme("purple");

// Display names for each theme id, keyed the same as THEMES. Single source of
// truth for the label shown in Profile / Privacy rows and the Appearance picker.
var THEME_LABELS = { purple: "Mika's Violet", classic: "Dark Ember", blue: "Cornflower Ocean" };
function themeLabelOf(name) { return THEME_LABELS[name] || THEME_LABELS.purple; }

var LIGHT_BG = "#F7F3EE";
var LIGHT_CARD = "#FFFFFF";
var DARK_BG = "#131110";
var DARK_CARD = "#1C1915";
function applyDarkMode(dark) {
  T.bg      = dark ? DARK_BG   : LIGHT_BG;
  T.card    = dark ? DARK_CARD : LIGHT_CARD;
  T.sep     = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  T.ink     = dark ? "#EDE8E2" : "#1A1410";
  T.ink2    = dark ? "#A09080" : "#6B5C4E";
  T.ink3    = dark ? "#6B5C4E" : "#B0A396";
  T.navBg   = dark ? "rgba(19,17,16,0.88)"   : "rgba(250,247,242,0.82)";
  T.sheetBg = dark ? "#1C1915" : "#F8F6F1";
  T.inputBg = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  // Liquid Glass tokens — adapt to light/dark so the glass effect is visible in both modes.
  // Light: use dark separators/borders (white-on-white is invisible); dark: use bright highlights.
  T.sheetGlass  = dark ? "rgba(28,25,21,0.75)"  : "rgba(255,255,255,0.78)";
  T.glassSpec   = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.07)";
  T.glassBorder = dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)";
  T.glassLiftUp   = dark ? "0 -16px 48px rgba(0,0,0,0.55)" : "0 -12px 36px rgba(40,28,16,0.20), 0 -2px 8px rgba(40,28,16,0.10)";
  T.glassLiftDown = dark ? "0 16px 48px rgba(0,0,0,0.55)"  : "0 12px 36px rgba(40,28,16,0.18), 0 2px 8px rgba(40,28,16,0.08)";
  T.pillBg      = dark ? "rgba(22,19,17,0.76)" : "rgba(255,255,255,0.78)";
  // iOS 26 Liquid Glass nav bar: a far more transparent bar so content refracts
  // through it, a bright top rim + dark bottom shade for the lens curvature, an
  // overlaid specular sheen, and a clear frosted-glass capsule for the active tab
  // (the "lens" behind the selected icon) instead of a flat color fill.
  T.navGlass     = dark ? "rgba(26,23,20,0.52)"    : "rgba(255,255,255,0.50)";
  T.navRimTop    = dark ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.90)";
  T.navRimBot    = dark ? "rgba(0,0,0,0.35)"       : "rgba(0,0,0,0.05)";
  T.navSheen     = dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.65)";
  T.navPillGlass = dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.62)";
  T.navPillRim   = dark ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.95)";
  T.navPillShade = dark ? "rgba(0,0,0,0.30)"       : "rgba(0,0,0,0.07)";
}

// Remember the last-used look across reloads so the very first paint matches
// the signed-in user's theme + mode, instead of flashing the light/purple
// default while Firestore loads. Synced to the cloud value on every change.
function lastLook() {
  try {
    return { theme: localStorage.getItem("cb_theme") || "purple", dark: localStorage.getItem("cb_dark") === "1" };
  } catch (e) { return { theme: "purple", dark: false }; }
}
function rememberLook(theme, dark) {
  try { localStorage.setItem("cb_theme", theme); localStorage.setItem("cb_dark", dark ? "1" : "0"); } catch (e) {}
}
(function () { var l = lastLook(); applyTheme(l.theme); applyDarkMode(l.dark); })();

// Curated icon set for category "banners" - line icons in the app's style.
// Each id maps to an SVG path in SVGIcon.
var ICON_BANK = [
  "home", "food", "car", "heart", "film", "cart", "plane", "briefcase",
  "chart", "coins", "gift", "box", "coffee", "book", "dumbbell", "phone",
  "music", "leaf", "laptop", "spark",
  "sun", "star", "droplet", "tool", "credit", "building", "bike", "shirt", "wifi", "tv", "umbrella",
];

// Refined, wealth-adjacent palette. Warm tones first, then jewel tones, then pastels/darks.
var COLOR_BANK = [
  "#C8673A", "#C8983A", "#8B6CEF", "#2799C8", "#27A85F", "#00B4A0",
  "#D97941", "#AF52DE", "#E0556E", "#5A7D9A", "#B0894E", "#6B5C4E",
  "#FF6B6B", "#FF9F1C", "#FFCB47", "#06D6A0", "#118AB2", "#9B5DE5",
  "#F72585", "#3A86FF", "#8AC926", "#F4A261", "#E76F51", "#264653",
  "#E91E8C", "#7C3AED", "#0891B2", "#059669", "#DC2626", "#D97706",
  "#7C2D12", "#1E3A5F", "#14532D", "#4A044E", "#134E4A", "#78350F",
  "#FDA4AF", "#FCD34D", "#6EE7B7", "#93C5FD", "#C4B5FD", "#FCA5A5",
  "#86EFAC", "#67E8F9", "#F9A8D4", "#FDE68A", "#A5B4FC", "#BAE6FD",
];

var DEFAULT_FOLDERS = [
  { id: "f1", name: "Essentials" },
  { id: "f2", name: "Lifestyle" },
  { id: "f3", name: "Income & Wealth" },
];

var DEFAULT_CATEGORIES = [
  { id: "c1",  name: "Housing",       color: "#8B6CEF", icon: "home",      folderId: "f1" },
  { id: "c2",  name: "Food",          color: "#27A85F", icon: "food",      folderId: "f1" },
  { id: "c3",  name: "Transport",     color: "#D97941", icon: "car",       folderId: "f1" },
  { id: "c4",  name: "Health",        color: "#E0556E", icon: "heart",     folderId: "f1" },
  { id: "c5",  name: "Entertainment", color: "#2799C8", icon: "film",      folderId: "f2" },
  { id: "c6",  name: "Shopping",      color: "#AF52DE", icon: "cart",      folderId: "f2" },
  { id: "c8",  name: "Salary",        color: "#27A85F", icon: "briefcase", folderId: "f3" },
  { id: "c9",  name: "Investments",   color: "#C8983A", icon: "chart",     folderId: "f3" },
  { id: "c10", name: "Savings",       color: "#C8673A", icon: "coins",     folderId: "f3" },
  { id: "c11", name: "Other",         color: "#6B5C4E", icon: "box",       folderId: "f2" },
];

// Trip budget buckets. Richard splits the total across these; the pct map is the
// local fallback split per travel style when the AI call is unavailable.
var TRIP_CATEGORIES = [
  { key: "flights",    label: "Flights",    icon: "plane",    color: "#8970C6", pct: { budget: 0.30, comfort: 0.25, luxury: 0.22 } },
  { key: "lodging",    label: "Housing",    icon: "building", color: "#2799C8", pct: { budget: 0.25, comfort: 0.32, luxury: 0.38 } },
  { key: "food",       label: "Food",       icon: "food",     color: "#27A85F", pct: { budget: 0.17, comfort: 0.15, luxury: 0.14 } },
  { key: "activities", label: "Activities", icon: "star",     color: "#E0556E", pct: { budget: 0.10, comfort: 0.12, luxury: 0.12 } },
  { key: "shopping",   label: "Shopping",   icon: "cart",     color: "#C8983A", pct: { budget: 0.05, comfort: 0.07, luxury: 0.08 } },
  { key: "transport",  label: "Transport",  icon: "car",      color: "#3B82B8", pct: { budget: 0.05, comfort: 0.05, luxury: 0.04 } },
  { key: "other",      label: "Other",      icon: "box",      color: "#8B8B8B", pct: { budget: 0, comfort: 0, luxury: 0 } },
  { key: "buffer",     label: "Buffer",     icon: "shield",   color: "#6B5C4E", pct: { budget: 0.08, comfort: 0.04, luxury: 0.02 } },
];

var TRIP_ICONS = ["plane", "car", "building", "umbrella", "sun", "star", "heart", "gift", "coffee", "leaf", "music", "briefcase"];

// Palette cycled through for user-added trip budget categories (TRIP_CATEGORIES
// only covers the defaults Richard splits against).
var TRIP_CUSTOM_COLORS = ["#8970C6", "#2799C8", "#27A85F", "#E0556E", "#C8983A", "#3B82B8", "#B8577A", "#4F9D6E"];

// Category lookups. Transactions/budgets reference a catId; fall back to name
// for any legacy data or deleted categories.
function computeAge(dob) {
  if (!dob) return null;
  try {
    var birth = new Date(dob);
    var now = new Date();
    var age = now.getFullYear() - birth.getFullYear();
    var m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  } catch(e) { return null; }
}

function catById(cats, id) {
  for (var i = 0; i < cats.length; i++) {
    if (cats[i].id === id) return cats[i];
  }
  return null;
}
function catByName(cats, name) {
  for (var i = 0; i < cats.length; i++) {
    if (cats[i].name === name) return cats[i];
  }
  return null;
}
function resolveCat(cats, t) {
  return catById(cats, t.catId) || catByName(cats, t.category) || { id: "", name: t.category || "Other", color: "#6B5C4E", icon: "box" };
}

const UI = "-apple-system, system-ui, sans-serif";
const DISP = "-apple-system, system-ui, sans-serif";

var _currency = { sym: "$" };
var _lang = { code: "en" };
// Full currency list. Symbols MUST be unique because the app keys the active
// currency by its symbol (SYM_TO_CODE / _currency.sym), so dollar- and
// yen-family currencies use distinct marks (A$, C$, CN¥, ...). dec = minor-unit
// digits (most are 2; yen/won/dong/etc. are 0; Gulf dinars are 3). label is
// derived as "CODE  sym" for existing call sites.
var CURRENCY_OPTIONS = (function() {
  var raw = [
    // [code, sym, name, dec]
    ["USD", "$",    "US Dollar",          2],
    ["EUR", "€",    "Euro",               2],
    ["GBP", "£",    "British Pound",      2],
    ["JPY", "¥",    "Japanese Yen",       0],
    ["ILS", "₪",    "Israeli Shekel",     2],
    ["INR", "₹",    "Indian Rupee",       2],
    ["BRL", "R$",   "Brazilian Real",     2],
    ["TRY", "₺",    "Turkish Lira",       2],
    ["GHS", "₵",    "Ghanaian Cedi",      2],
    ["COP", "Col$", "Colombian Peso",     0],
    ["VND", "₫",    "Vietnamese Dong",    0],
    ["AUD", "A$",   "Australian Dollar",  2],
    ["CAD", "C$",   "Canadian Dollar",    2],
    ["NZD", "NZ$",  "New Zealand Dollar", 2],
    ["HKD", "HK$",  "Hong Kong Dollar",   2],
    ["SGD", "S$",   "Singapore Dollar",   2],
    ["MXN", "Mex$", "Mexican Peso",       2],
    ["CHF", "Fr",   "Swiss Franc",        2],
    ["CNY", "CN¥",  "Chinese Yuan",       2],
    ["KRW", "₩",    "South Korean Won",   0],
    ["THB", "฿",    "Thai Baht",          2],
    ["PHP", "₱",    "Philippine Peso",    2],
    ["IDR", "Rp",   "Indonesian Rupiah",  0],
    ["MYR", "RM",   "Malaysian Ringgit",  2],
    ["PLN", "zł",   "Polish Zloty",       2],
    ["CZK", "Kč",   "Czech Koruna",       2],
    ["HUF", "Ft",   "Hungarian Forint",   0],
    ["RON", "lei",  "Romanian Leu",       2],
    ["SEK", "kr",   "Swedish Krona",      2],
    ["NOK", "Nkr",  "Norwegian Krone",    2],
    ["DKK", "Dkr",  "Danish Krone",       2],
    ["ISK", "Íkr",  "Icelandic Krona",    0],
    ["RUB", "₽",    "Russian Ruble",      2],
    ["UAH", "₴",    "Ukrainian Hryvnia",  2],
    ["ZAR", "R",    "South African Rand", 2],
    ["NGN", "₦",    "Nigerian Naira",     2],
    ["KES", "KSh",  "Kenyan Shilling",    2],
    ["EGP", "E£",   "Egyptian Pound",     2],
    ["MAD", "DH",   "Moroccan Dirham",    2],
    ["AED", "د.إ",  "UAE Dirham",         2],
    ["SAR", "ر.س",  "Saudi Riyal",        2],
    ["QAR", "QR",   "Qatari Riyal",       2],
    ["KWD", "KD",   "Kuwaiti Dinar",      3],
    ["BHD", "BD",   "Bahraini Dinar",     3],
    ["PKR", "₨",    "Pakistani Rupee",    2],
    ["BDT", "৳",    "Bangladeshi Taka",   2],
    ["LKR", "SLRs", "Sri Lankan Rupee",   2],
    ["NPR", "NRs",  "Nepalese Rupee",     2],
    ["CLP", "CLP$", "Chilean Peso",       0],
    ["ARS", "ARS$", "Argentine Peso",     2]
  ];
  return raw.map(function(r) {
    return { code: r[0], sym: r[1], name: r[2], dec: r[3], label: r[0] + "  " + r[1] };
  });
})();
var SYM_TO_CODE = (function() {
  var m = {};
  CURRENCY_OPTIONS.forEach(function(o) { m[o.sym] = o.code; });
  return m;
})();
var SYM_TO_DEC = (function() {
  var m = {};
  CURRENCY_OPTIONS.forEach(function(o) { m[o.sym] = o.dec; });
  return m;
})();
var LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "he", label: "עברית" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "عربية" },
  { code: "ru", label: "Русский" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
];
var LANGUAGE_NAMES = { en: "English", he: "Hebrew", es: "Spanish", fr: "French", ar: "Arabic", ru: "Russian", de: "German", pt: "Portuguese" };

var TRANSLATIONS = {
  en: { overview:"Overview", activity:"Activity", budgets:"Budgets", goals:"Goals", advisor:"Advisor", profile:"Profile", language:"Language", currency:"Currency", yourPlan:"Your Plan", categories:"Categories", signOut:"Sign Out", richyMember:"Richy member", richyRefersTo:"Richy refers to you as", seeYourPlan:"See your plan by Richard", netBalance:"Net Balance", income:"Income", spent:"Spent", topSpend:"Top spend", morning:"Good morning", afternoon:"Good afternoon", evening:"Good evening", savedThisPeriod:"saved this period", redoQuestionnaire:"Redo Questionnaire", yourPlanByRichard:"Your Plan by Richard", noTransactions:"No transactions yet", noTransactionsSub:"Tap + to log your first one. Awareness is the first step to wealth.", overviewEmptySub:"The Richest Man in Babylon started by tracking every coin. Start yours in Activity.", savingsRate:"Savings Rate", excellent:"Excellent", onTrack:"On track", buildItUp:"Build it up", overspending:"Overspending", noIncomeYet:"No income logged yet", thisPeriod:"this period", transactions:"Transactions", whereItWent:"Where it went", overLimit:"over limit", complete:"complete", savedLabel:"saved", spentLabel:"spent", toGo:"to go", recent:"Recent", activeGoal:"active goal", activeGoals:"active goals", today:"Today", yesterday:"Yesterday", moneyIn:"Money In", moneyOut:"Money Out", newTransaction:"New Transaction", editTransaction:"Edit Transaction", addTransaction:"Add Transaction", saveChanges:"Save Changes", deleteTx:"Delete transaction", amount:"Amount", txLabel:"Label", category:"Category", date:"Date", repeat:"Repeat", once:"Once", weekly:"Weekly", monthly:"Monthly", markPending:"Mark as pending", expense:"Expense", noBudgets:"No budgets yet", noBudgetsSub:"Tap + to set a limit for a category. A budget is just telling your money where to go.", newBudget:"New Budget", editLimit:"Edit Limit", addBudget:"Add Budget", removeBudget:"Remove this budget", totalSpent:"Total Spent", byCategory:"By Category", edit:"Edit", delete:"Delete", save:"Save", budgeted:"budgeted", monthlyLimit:"Monthly limit", allCatsHaveBudget:"Every category already has a budget. Add a new category first.", noGoals:"No budget books yet", noGoalsSub:"Tap + to create your first budget book. A goal with a deadline is a plan, not a wish.", newBudgetBook:"New Budget Book", editBudgetBook:"Edit Budget Book", createBudgetBook:"Create Budget Book", deleteBudgetBook:"Delete budget book", addToBudgetBook:"Add to Budget Book", alreadySaved:"Already saved", target:"Target", name:"Name", goalComplete:"Goal complete!", remaining:"remaining", add:"Add", richySuggests:"Richard suggests", implement:"Implement", dismiss:"Dismiss", aiAdvisor:"AI Financial Advisor", aiAdvisorSub:"Personalized advice based on your real spending and expert financial wisdom.", analyzeMyFinances:"Analyze My Finances", thinkP1:"Reading your numbers",thinkP2:"Thinking it through",thinkP3:"Weighing the options",thinkP4:"Writing back",anStep1:"Reading your month",anStep2:"Scanning {n} transactions",anStep3:"Comparing plan to reality",anStep4:"Finding what matters most",anStep5:"Writing your analysis",analyzingFinances:"Analyzing your finances...", fewSeconds:"This takes a few seconds", refresh:"Refresh", insights:"Insights", analysisFailed:"Analysis failed", tryAgain:"Try Again", askYourAdvisor:"Ask Your Advisor", advisorQ1:"How can I save more?", advisorQ2:"Is my savings rate healthy?", advisorQ3:"What to do with my surplus?", thinking:"Thinking...", yesDo:"Yes, do it", notNow:"Not now", askRichard:"Ask Richard anything...", giveFeedback:"Give Richard feedback...", advisorDisclaimer:"Richard is an AI assistant, not a licensed financial advisor. Always do your own research before making money decisions.", translate:"Translate plan", noPlanYet:"No plan yet. Complete the onboarding questionnaire to get your personalized plan from Richard.", notes:"Notes", notesEmpty:"No notes yet", notesEmptySub:"Track who owes you and who you owe. Tap + to add your first one.", theyOweMe:"They owe me", iOwe:"I owe", newNote:"New Note", addNote:"Add Note", editNote:"Edit Note", saveNote:"Save Note", settle:"Settle", settleTitle:"Settle note", settleAddBalance:"Add to my balance", reminder:"Reminder", reminderTitle:"Set a reminder", setReminder:"Set reminder", clearReminder:"Clear reminder", reminderWhen:"Remind me on", reminderDenied:"Notifications are blocked. The note will still show a due badge.", due:"Due", overdue:"Overdue", deleteNote:"Delete note", trips:"Trips", planATrip:"Plan a Trip", planATripSub:"Budget a getaway without touching your balance.", planNewTrip:"Plan a New Trip", noTrips:"No trips yet", noTripsSub:"Plan a getaway and Richard will split your budget across the essentials.", tripName:"Trip name", destination:"Destination", tripBudget:"Total budget", tripDays:"Days", travelStyle:"Travel style", styleBudget:"Budget", styleComfort:"Comfort", styleLuxury:"Luxury", next:"Next", back:"Back", richardPlanning:"Richard is planning your trip", richardPlanningSub:"Splitting your budget across the essentials.", tripSplit:"Your budget split", allocated:"Allocated", overBy:"over by", saveTrip:"Save Trip", addCategory:"Add category", deductFromBalance:"Deduct from balance", deductExplain:"This tracks what you actually spend on this trip as one live expense, so your balance only drops as you log spending here - not the whole budget up front. You can undo it anytime.", reserved:"Tracking against balance", undoReserve:"Stop tracking", logExpense:"Log expense", logExpenseTitle:"Log a trip expense", tripTips:"Richard's tips", deleteTrip:"Delete trip", deleteTripConfirm:"Delete this trip? This cannot be undone.", spentOf:"spent of", leftToSpend:"left to spend", planning:"Planning", tripSummary:"Trip summary", appearance:"Appearance", leftAfterBudgets:"Left after budgets", tripIcon:"Trip icon", savings:"Savings", netWorth:"Net Worth", balance:"Balance", manage:"Manage", totalSavings:"Total saved", savingsIntro:"Money you keep separate from your spending balance - an emergency fund, a sinking fund, anything you don't want to accidentally spend. It counts toward your net worth, never your balance.", newSavingsAccount:"New savings account", savingsAccountName:"Account name", addMoney:"Add money", withdraw:"Withdraw", fromBalance:"From my balance", externalMoney:"Money I already have", toBalance:"To my balance", removeFromNet:"Spend or remove", startingAmount:"Starting amount (optional)", createAccount:"Create account", closeAccount:"Close account", rename:"Rename", emptySavingsSub:"Keep an emergency fund or a sinking fund separate from your spending balance.", addSavingsAccount:"Add a savings account", history:"History", balanceUntouched:"Your spending balance stays untouched", movesFromBalance:"Moves money out of your spending balance", addsToBalance:"Adds the money back to your spending balance", leavesNetWorth:"Leaves your accounts - lowers your net worth", pickIcon:"Icon", emergencyFund:"Emergency Fund", noMovesYet:"No moves yet", pastChats:"Past chats", newChat:"New chat", conversation:"conversation", conversations:"conversations", noPastChats:"No past chats yet", message:"message", messages:"messages" },
  he: { overview:"סקירה", activity:"פעילות", budgets:"תקציבים", goals:"יעדים", advisor:"יועץ", profile:"פרופיל", language:"שפה", currency:"מטבע", yourPlan:"התוכנית שלך", categories:"קטגוריות", signOut:"התנתק", richyMember:"חבר Richy", richyRefersTo:"ריצ'י מכנה אותך", seeYourPlan:"ראה את התוכנית שלך", netBalance:"יתרה נטו", income:"הכנסות", spent:"הוצאות", topSpend:"הוצאה עיקרית", morning:"בוקר טוב", afternoon:"צהריים טובים", evening:"ערב טוב", savedThisPeriod:"נחסך בתקופה זו", redoQuestionnaire:"מלא שאלון מחדש", yourPlanByRichard:"התוכנית שלך", noTransactions:"אין עסקאות עדיין", noTransactionsSub:"לחץ + כדי לרשום. מודעות היא הצעד הראשון לעושר.", overviewEmptySub:"עשיר בבבל התחיל בלעקוב אחרי כל מטבע. התחל גם אתה בפעילות.", savingsRate:"שיעור חיסכון", excellent:"מצוין", onTrack:"במסלול", buildItUp:"שפר את זה", overspending:"הוצאה יתרה", thisPeriod:"בתקופה זו", transactions:"עסקאות", whereItWent:"לאן הלך", overLimit:"מעל המגבלה", complete:"הושלם", savedLabel:"נחסך", spentLabel:"הוצא", toGo:"לסיום", recent:"אחרון", activeGoal:"יעד פעיל", activeGoals:"יעדים פעילים", today:"היום", yesterday:"אתמול", moneyIn:"כסף נכנס", moneyOut:"כסף יוצא", newTransaction:"עסקה חדשה", editTransaction:"ערוך עסקה", addTransaction:"הוסף עסקה", saveChanges:"שמור שינויים", deleteTx:"מחק עסקה", amount:"סכום", txLabel:"תיאור", category:"קטגוריה", date:"תאריך", repeat:"חזרה", once:"פעם אחת", weekly:"שבועי", monthly:"חודשי", markPending:"סמן כממתין", expense:"הוצאה", noBudgets:"אין תקציבים עדיין", noBudgetsSub:"לחץ + להגדרת מגבלה לקטגוריה. תקציב הוא פשוט להגיד לכסף לאן ללכת.", newBudget:"תקציב חדש", editLimit:"ערוך מגבלה", addBudget:"הוסף תקציב", removeBudget:"הסר תקציב זה", totalSpent:"סך הוצאות", byCategory:"לפי קטגוריה", edit:"ערוך", delete:"מחק", save:"שמור", budgeted:"מתוקצב", monthlyLimit:"מגבלה חודשית", allCatsHaveBudget:"לכל הקטגוריות יש תקציב. הוסף קטגוריה חדשה תחילה.", noGoals:"אין ספרי תקציב עדיין", noGoalsSub:"לחץ + ליצירת ספר תקציב ראשון. יעד עם מועד הוא תוכנית, לא משאלה.", newBudgetBook:"ספר תקציב חדש", editBudgetBook:"ערוך ספר תקציב", createBudgetBook:"צור ספר תקציב", deleteBudgetBook:"מחק ספר תקציב", addToBudgetBook:"הוסף לספר תקציב", alreadySaved:"כבר נחסך", target:"יעד", name:"שם", goalComplete:"היעד הושג!", remaining:"נותר", add:"הוסף", richySuggests:"ריצ'י מציע", implement:"יישם", dismiss:"דחה", aiAdvisor:"יועץ פיננסי AI", aiAdvisorSub:"ייעוץ מותאם אישית בהתבסס על ההוצאות שלך.", analyzeMyFinances:"נתח את הכספים שלי", thinkP1:"קורא את המספרים שלך",thinkP2:"חושב על זה",thinkP3:"שוקל את האפשרויות",thinkP4:"מנסח תשובה",anStep1:"קורא את החודש שלך",anStep2:"סורק {n} תנועות",anStep3:"משווה תוכנית למציאות",anStep4:"מאתר את מה שחשוב באמת",anStep5:"כותב את הניתוח",analyzingFinances:"מנתח את הכספים שלך...", fewSeconds:"זה לוקח כמה שניות", refresh:"רענן", insights:"תובנות", analysisFailed:"הניתוח נכשל", tryAgain:"נסה שוב", askYourAdvisor:"שאל את היועץ שלך", advisorQ1:"איך אוכל לחסוך יותר?", advisorQ2:"האם שיעור החיסכון שלי בריא?", advisorQ3:"מה לעשות עם העודף שלי?", thinking:"חושב...", yesDo:"כן, עשה זאת", notNow:"לא עכשיו", askRichard:"שאל את ריצ'רד כל דבר...", giveFeedback:"תן ל-ריצ'רד משוב...", advisorDisclaimer:"ריצ'רד הוא עוזר AI ולא יועץ פיננסי מורשה. תמיד ערוך מחקר עצמאי לפני קבלת החלטות כלכליות.", translate:"תרגם תוכנית", noPlanYet:"אין תוכנית עדיין. מלא את השאלון כדי לקבל את התוכנית האישית שלך מריצ'רד." },
  es: { overview:"Resumen", activity:"Actividad", budgets:"Presupuestos", goals:"Metas", advisor:"Asesor", profile:"Perfil", language:"Idioma", currency:"Moneda", yourPlan:"Tu Plan", categories:"Categorias", signOut:"Cerrar sesion", richyMember:"Miembro Richy", richyRefersTo:"Richy te llama", seeYourPlan:"Ver tu plan de Richard", netBalance:"Saldo Neto", income:"Ingresos", spent:"Gastado", topSpend:"Mas gastado", morning:"Buenos dias", afternoon:"Buenas tardes", evening:"Buenas noches", savedThisPeriod:"ahorrado este periodo", redoQuestionnaire:"Rehacer cuestionario", yourPlanByRichard:"Tu plan de Richard", noTransactions:"Sin transacciones aun", noTransactionsSub:"Toca + para registrar la primera. La conciencia es el primer paso a la riqueza.", overviewEmptySub:"El hombre mas rico de Babilonia empezo rastreando cada moneda. Empieza en Actividad.", savingsRate:"Tasa de ahorro", excellent:"Excelente", onTrack:"En camino", buildItUp:"Mejoralo", overspending:"Exceso de gasto", thisPeriod:"este periodo", transactions:"Transacciones", whereItWent:"A donde fue", overLimit:"sobre el limite", complete:"completo", savedLabel:"ahorrado", spentLabel:"gastado", toGo:"restante", recent:"Reciente", activeGoal:"meta activa", activeGoals:"metas activas", today:"Hoy", yesterday:"Ayer", moneyIn:"Dinero Entrada", moneyOut:"Dinero Salida", newTransaction:"Nueva Transaccion", editTransaction:"Editar Transaccion", addTransaction:"Agregar Transaccion", saveChanges:"Guardar Cambios", deleteTx:"Eliminar transaccion", amount:"Monto", txLabel:"Etiqueta", category:"Categoria", date:"Fecha", repeat:"Repetir", once:"Una vez", weekly:"Semanal", monthly:"Mensual", markPending:"Marcar como pendiente", expense:"Gasto", noBudgets:"Sin presupuestos aun", noBudgetsSub:"Toca + para establecer un limite. Un presupuesto le dice a tu dinero donde ir.", newBudget:"Nuevo Presupuesto", editLimit:"Editar Limite", addBudget:"Agregar Presupuesto", removeBudget:"Eliminar este presupuesto", totalSpent:"Total Gastado", byCategory:"Por Categoria", edit:"Editar", delete:"Eliminar", save:"Guardar", budgeted:"presupuestado", monthlyLimit:"Limite mensual", allCatsHaveBudget:"Cada categoria ya tiene presupuesto. Agrega una nueva categoria primero.", noGoals:"Sin libros de metas aun", noGoalsSub:"Toca + para crear tu primer libro de metas. Una meta con fecha limite es un plan.", newBudgetBook:"Nuevo Libro de Metas", editBudgetBook:"Editar Libro de Metas", createBudgetBook:"Crear Libro de Metas", deleteBudgetBook:"Eliminar libro de metas", addToBudgetBook:"Agregar al Libro de Metas", alreadySaved:"Ya ahorrado", target:"Objetivo", name:"Nombre", goalComplete:"Meta completada!", remaining:"restante", add:"Agregar", richySuggests:"Richard sugiere", implement:"Implementar", dismiss:"Descartar", aiAdvisor:"Asesor Financiero IA", aiAdvisorSub:"Consejos personalizados basados en tus gastos reales.", analyzeMyFinances:"Analizar Mis Finanzas", thinkP1:"Leyendo tus numeros",thinkP2:"Pensandolo bien",thinkP3:"Sopesando opciones",thinkP4:"Escribiendo la respuesta",anStep1:"Leyendo tu mes",anStep2:"Escaneando {n} transacciones",anStep3:"Comparando plan y realidad",anStep4:"Buscando lo mas importante",anStep5:"Escribiendo tu analisis",analyzingFinances:"Analizando tus finanzas...", fewSeconds:"Esto tarda unos segundos", refresh:"Actualizar", insights:"Perspectivas", analysisFailed:"Analisis fallido", tryAgain:"Intentar de nuevo", askYourAdvisor:"Pregunta a tu Asesor", advisorQ1:"Como puedo ahorrar mas?", advisorQ2:"Es saludable mi tasa de ahorro?", advisorQ3:"Que hacer con mi excedente?", thinking:"Pensando...", yesDo:"Si, hazlo", notNow:"Ahora no", askRichard:"Pregunta a Richard cualquier cosa...", giveFeedback:"Da retroalimentacion a Richard...", advisorDisclaimer:"Richard es un asistente de IA, no un asesor financiero certificado. Investiga siempre antes de tomar decisiones financieras.", translate:"Traducir plan", noPlanYet:"Aun no hay plan. Completa el cuestionario para obtener tu plan personalizado de Richard." },
  fr: { overview:"Apercu", activity:"Activite", budgets:"Budgets", goals:"Objectifs", advisor:"Conseiller", profile:"Profil", language:"Langue", currency:"Devise", yourPlan:"Votre Plan", categories:"Categories", signOut:"Deconnexion", richyMember:"Membre Richy", richyRefersTo:"Richy vous appelle", seeYourPlan:"Voir votre plan de Richard", netBalance:"Solde Net", income:"Revenus", spent:"Depenses", topSpend:"Top depenses", morning:"Bonjour", afternoon:"Bon apres-midi", evening:"Bonsoir", savedThisPeriod:"epargne cette periode", redoQuestionnaire:"Refaire le questionnaire", yourPlanByRichard:"Votre plan de Richard", noTransactions:"Aucune transaction", noTransactionsSub:"Appuyez + pour enregistrer la premiere. La conscience est le premier pas vers la richesse.", overviewEmptySub:"L homme le plus riche de Babylone commencat par suivre chaque piece. Commencez dans Activite.", savingsRate:"Taux d epargne", excellent:"Excellent", onTrack:"En bonne voie", buildItUp:"Ameliorez-le", overspending:"Depassement", thisPeriod:"cette periode", transactions:"Transactions", whereItWent:"Ou est alle", overLimit:"au-dessus de la limite", complete:"complete", savedLabel:"epargne", spentLabel:"depense", toGo:"restant", recent:"Recent", activeGoal:"objectif actif", activeGoals:"objectifs actifs", today:"Aujourd hui", yesterday:"Hier", moneyIn:"Argent entrant", moneyOut:"Argent sortant", newTransaction:"Nouvelle Transaction", editTransaction:"Modifier Transaction", addTransaction:"Ajouter Transaction", saveChanges:"Enregistrer les modifications", deleteTx:"Supprimer la transaction", amount:"Montant", txLabel:"Libelle", category:"Categorie", date:"Date", repeat:"Repetition", once:"Une fois", weekly:"Hebdomadaire", monthly:"Mensuel", markPending:"Marquer comme en attente", expense:"Depense", noBudgets:"Aucun budget", noBudgetsSub:"Appuyez + pour fixer une limite. Un budget dit a votre argent ou aller.", newBudget:"Nouveau Budget", editLimit:"Modifier Limite", addBudget:"Ajouter Budget", removeBudget:"Supprimer ce budget", totalSpent:"Total Depense", byCategory:"Par Categorie", edit:"Modifier", delete:"Supprimer", save:"Enregistrer", budgeted:"budgete", monthlyLimit:"Limite mensuelle", allCatsHaveBudget:"Chaque categorie a deja un budget. Ajoutez d abord une nouvelle categorie.", noGoals:"Aucun livret d epargne", noGoalsSub:"Appuyez + pour creer votre premier livret. Un objectif avec une echeance est un plan.", newBudgetBook:"Nouveau Livret", editBudgetBook:"Modifier Livret", createBudgetBook:"Creer Livret", deleteBudgetBook:"Supprimer le livret", addToBudgetBook:"Ajouter au Livret", alreadySaved:"Deja epargne", target:"Objectif", name:"Nom", goalComplete:"Objectif atteint!", remaining:"restant", add:"Ajouter", richySuggests:"Richard suggere", implement:"Implementer", dismiss:"Ignorer", aiAdvisor:"Conseiller Financier IA", aiAdvisorSub:"Conseils personnalises bases sur vos depenses reelles.", analyzeMyFinances:"Analyser mes Finances", thinkP1:"Je lis vos chiffres",thinkP2:"J'y reflechis",thinkP3:"Je pese les options",thinkP4:"Je redige la reponse",anStep1:"Lecture de votre mois",anStep2:"Analyse de {n} transactions",anStep3:"Comparaison plan et realite",anStep4:"Recherche de l'essentiel",anStep5:"Redaction de votre analyse",analyzingFinances:"Analyse de vos finances...", fewSeconds:"Cela prend quelques secondes", refresh:"Actualiser", insights:"Perspectives", analysisFailed:"Analyse echouee", tryAgain:"Reessayer", askYourAdvisor:"Demandez a votre Conseiller", advisorQ1:"Comment puis-je economiser davantage?", advisorQ2:"Mon taux d epargne est-il sain?", advisorQ3:"Que faire avec mon surplus?", thinking:"Je reflechis...", yesDo:"Oui, fais-le", notNow:"Pas maintenant", askRichard:"Demandez a Richard n importe quoi...", giveFeedback:"Donnez vos retours a Richard...", advisorDisclaimer:"Richard est un assistant IA, pas un conseiller financier agree. Faites toujours vos propres recherches.", translate:"Traduire le plan", noPlanYet:"Pas encore de plan. Completez le questionnaire pour obtenir votre plan personnalise de Richard." },
  ar: { overview:"نظرة عامة", activity:"النشاط", budgets:"الميزانيات", goals:"الاهداف", advisor:"المستشار", profile:"الملف الشخصي", language:"اللغة", currency:"العملة", yourPlan:"خطتك", categories:"الفئات", signOut:"تسجيل الخروج", richyMember:"عضو Richy", richyRefersTo:"ريتشي يناديك", seeYourPlan:"انظر خطتك من ريتشارد", netBalance:"الرصيد الصافي", income:"الدخل", spent:"المنفق", topSpend:"اعلى انفاق", morning:"صباح الخير", afternoon:"مساء الخير", evening:"مساء الخير", savedThisPeriod:"تم توفيره", redoQuestionnaire:"اعادة الاستبيان", yourPlanByRichard:"خطتك من ريتشارد", noTransactions:"لا توجد معاملات بعد", noTransactionsSub:"اضغط + لتسجيل اول معاملة. الوعي هو الخطوة الاولى نحو الثروة.", overviewEmptySub:"اغنى رجل في بابل بدا بتتبع كل عملة. ابدا في النشاط.", savingsRate:"معدل الادخار", excellent:"ممتاز", onTrack:"في المسار", buildItUp:"طوره", overspending:"انفاق زائد", thisPeriod:"هذه الفترة", transactions:"المعاملات", whereItWent:"اين ذهب", overLimit:"فوق الحد", complete:"مكتمل", savedLabel:"مدخر", spentLabel:"انفق", toGo:"متبقي", recent:"الاخير", activeGoal:"هدف نشط", activeGoals:"اهداف نشطة", today:"اليوم", yesterday:"امس", moneyIn:"المال الداخل", moneyOut:"المال الخارج", newTransaction:"معاملة جديدة", editTransaction:"تعديل المعاملة", addTransaction:"اضافة معاملة", saveChanges:"حفظ التغييرات", deleteTx:"حذف المعاملة", amount:"المبلغ", txLabel:"التسمية", category:"الفئة", date:"التاريخ", repeat:"تكرار", once:"مرة واحدة", weekly:"اسبوعي", monthly:"شهري", markPending:"وضع علامة معلقة", expense:"مصروف", noBudgets:"لا توجد ميزانيات بعد", noBudgetsSub:"اضغط + لتعيين حد للفئة. الميزانية هي توجيه المال.", newBudget:"ميزانية جديدة", editLimit:"تعديل الحد", addBudget:"اضافة ميزانية", removeBudget:"حذف هذه الميزانية", totalSpent:"اجمالي الانفاق", byCategory:"حسب الفئة", edit:"تعديل", delete:"حذف", save:"حفظ", budgeted:"مخصص", monthlyLimit:"الحد الشهري", allCatsHaveBudget:"كل الفئات لديها ميزانية. اضف فئة جديدة اولا.", noGoals:"لا توجد دفاتر بعد", noGoalsSub:"اضغط + لانشاء اول دفتر. الهدف بموعد خطة وليس امنية.", newBudgetBook:"دفتر جديد", editBudgetBook:"تعديل الدفتر", createBudgetBook:"انشاء دفتر", deleteBudgetBook:"حذف الدفتر", addToBudgetBook:"اضافة الى الدفتر", alreadySaved:"تم الادخار مسبقا", target:"الهدف", name:"الاسم", goalComplete:"تم تحقيق الهدف!", remaining:"متبقي", add:"اضافة", richySuggests:"اقتراح ريتشارد", implement:"تطبيق", dismiss:"تجاهل", aiAdvisor:"مستشار مالي AI", aiAdvisorSub:"نصائح مخصصة بناء على انفاقك الفعلي.", analyzeMyFinances:"تحليل ماليتي", thinkP1:"أقرأ أرقامك",thinkP2:"أفكر في الأمر",thinkP3:"أوازن الخيارات",thinkP4:"أكتب الرد",anStep1:"أقرأ شهرك",anStep2:"أفحص {n} من المعاملات",anStep3:"أقارن الخطة بالواقع",anStep4:"أبحث عن الأهم",anStep5:"أكتب تحليلك",analyzingFinances:"جاري تحليل ماليتك...", fewSeconds:"هذا يستغرق بضع ثوان", refresh:"تحديث", insights:"رؤى", analysisFailed:"فشل التحليل", tryAgain:"حاول مجددا", askYourAdvisor:"اسال مستشارك", advisorQ1:"كيف يمكنني توفير المزيد؟", advisorQ2:"هل معدل توفيري صحي؟", advisorQ3:"ماذا افعل بالفائض؟", thinking:"افكر...", yesDo:"نعم افعل ذلك", notNow:"ليس الان", askRichard:"اسال ريتشارد اي شيء...", giveFeedback:"اعطِ ريتشارد ملاحظاتك...", advisorDisclaimer:"ريتشارد مساعد ذكاء اصطناعي وليس مستشارا ماليا معتمدا. دائما ابحث قبل اتخاذ قرارات مالية.", translate:"ترجمة الخطة", noPlanYet:"لا توجد خطة بعد. اكمل الاستبيان للحصول على خطتك الشخصية من ريتشارد." },
  ru: { overview:"Обзор", activity:"Активность", budgets:"Бюджеты", goals:"Цели", advisor:"Советник", profile:"Профиль", language:"Язык", currency:"Валюта", yourPlan:"Ваш план", categories:"Категории", signOut:"Выйти", richyMember:"Участник Richy", richyRefersTo:"Richy называет тебя", seeYourPlan:"Посмотреть план от Ричарда", netBalance:"Чистый баланс", income:"Доходы", spent:"Расходы", topSpend:"Главная трата", morning:"Доброе утро", afternoon:"Добрый день", evening:"Добрый вечер", savedThisPeriod:"сохранено за период", redoQuestionnaire:"Пройти снова", yourPlanByRichard:"Ваш план от Ричарда", noTransactions:"Нет транзакций", noTransactionsSub:"Нажмите + чтобы добавить первую. Осознанность - первый шаг к богатству.", overviewEmptySub:"Богатейший человек Вавилона начал с учёта каждой монеты. Начните в Активности.", savingsRate:"Уровень сбережений", excellent:"Отлично", onTrack:"В норме", buildItUp:"Улучшайте", overspending:"Перерасход", thisPeriod:"за период", transactions:"Транзакции", whereItWent:"Куда ушло", overLimit:"сверх лимита", complete:"завершено", savedLabel:"накоплено", spentLabel:"потрачено", toGo:"осталось", recent:"Последние", activeGoal:"активная цель", activeGoals:"активных целей", today:"Сегодня", yesterday:"Вчера", moneyIn:"Доходы", moneyOut:"Расходы", newTransaction:"Новая транзакция", editTransaction:"Редактировать", addTransaction:"Добавить транзакцию", saveChanges:"Сохранить изменения", deleteTx:"Удалить транзакцию", amount:"Сумма", txLabel:"Описание", category:"Категория", date:"Дата", repeat:"Повтор", once:"Однократно", weekly:"Еженедельно", monthly:"Ежемесячно", markPending:"Отметить как ожидающее", expense:"Расход", noBudgets:"Нет бюджетов", noBudgetsSub:"Нажмите + чтобы задать лимит. Бюджет говорит деньгам куда идти.", newBudget:"Новый бюджет", editLimit:"Изменить лимит", addBudget:"Добавить бюджет", removeBudget:"Удалить этот бюджет", totalSpent:"Всего потрачено", byCategory:"По категориям", edit:"Редактировать", delete:"Удалить", save:"Сохранить", budgeted:"запланировано", monthlyLimit:"Месячный лимит", allCatsHaveBudget:"Все категории уже имеют бюджет. Сначала добавьте новую категорию.", noGoals:"Нет книг целей", noGoalsSub:"Нажмите + чтобы создать первую. Цель с датой - это план, а не мечта.", newBudgetBook:"Новая книга целей", editBudgetBook:"Редактировать книгу целей", createBudgetBook:"Создать книгу целей", deleteBudgetBook:"Удалить книгу целей", addToBudgetBook:"Добавить в книгу целей", alreadySaved:"Уже накоплено", target:"Цель", name:"Название", goalComplete:"Цель достигнута!", remaining:"осталось", add:"Добавить", richySuggests:"Ричард предлагает", implement:"Применить", dismiss:"Отклонить", aiAdvisor:"Финансовый советник ИИ", aiAdvisorSub:"Персональные советы на основе ваших расходов.", analyzeMyFinances:"Анализировать мои финансы", thinkP1:"Читаю ваши цифры",thinkP2:"Обдумываю",thinkP3:"Взвешиваю варианты",thinkP4:"Пишу ответ",anStep1:"Читаю ваш месяц",anStep2:"Проверяю {n} операций",anStep3:"Сравниваю план с реальностью",anStep4:"Ищу самое важное",anStep5:"Пишу ваш анализ",analyzingFinances:"Анализируем ваши финансы...", fewSeconds:"Это займет несколько секунд", refresh:"Обновить", insights:"Инсайты", analysisFailed:"Анализ не удался", tryAgain:"Попробовать снова", askYourAdvisor:"Спросите вашего советника", advisorQ1:"Как сэкономить больше?", advisorQ2:"Мой уровень сбережений здоровый?", advisorQ3:"Что делать с излишком?", thinking:"Думаю...", yesDo:"Да, сделай это", notNow:"Не сейчас", askRichard:"Спросите Ричарда что угодно...", giveFeedback:"Дайте обратную связь Ричарду...", advisorDisclaimer:"Ричард является ИИ-помощником, а не лицензированным финансовым советником. Всегда проводите собственное исследование.", translate:"Перевести план", noPlanYet:"Noch kein Plan. Fullen Sie den Fragebogen aus, um Ihren personlichen Plan von Richard zu erhalten." },
  de: { overview:"Ubersicht", activity:"Aktivitat", budgets:"Budgets", goals:"Ziele", advisor:"Berater", profile:"Profil", language:"Sprache", currency:"Wahrung", yourPlan:"Ihr Plan", categories:"Kategorien", signOut:"Abmelden", richyMember:"Richy-Mitglied", richyRefersTo:"Richy nennt dich", seeYourPlan:"Sehen Sie Ihren Plan von Richard", netBalance:"Nettosaldo", income:"Einnahmen", spent:"Ausgaben", topSpend:"Ausgabe", morning:"Guten Morgen", afternoon:"Guten Tag", evening:"Guten Abend", savedThisPeriod:"gespart in dieser Periode", redoQuestionnaire:"Fragebogen wiederholen", yourPlanByRichard:"Ihr Plan von Richard", noTransactions:"Noch keine Transaktionen", noTransactionsSub:"Tippe + um die erste zu erfassen. Bewusstsein ist der erste Schritt zum Reichtum.", overviewEmptySub:"Der reichste Mann Babylons begann damit, jede Muenze zu verfolgen. Starte in Aktivitat.", savingsRate:"Sparrate", excellent:"Ausgezeichnet", onTrack:"Auf Kurs", buildItUp:"Verbessern", overspending:"Mehrausgaben", thisPeriod:"diese Periode", transactions:"Transaktionen", whereItWent:"Wo es hinging", overLimit:"uber dem Limit", complete:"abgeschlossen", savedLabel:"gespart", spentLabel:"ausgegeben", toGo:"verbleibend", recent:"Aktuell", activeGoal:"aktives Ziel", activeGoals:"aktive Ziele", today:"Heute", yesterday:"Gestern", moneyIn:"Einnahmen", moneyOut:"Ausgaben", newTransaction:"Neue Transaktion", editTransaction:"Transaktion bearbeiten", addTransaction:"Transaktion hinzufugen", saveChanges:"Anderungen speichern", deleteTx:"Transaktion loschen", amount:"Betrag", txLabel:"Bezeichnung", category:"Kategorie", date:"Datum", repeat:"Wiederholung", once:"Einmalig", weekly:"Wochentlich", monthly:"Monatlich", markPending:"Als ausstehend markieren", expense:"Ausgabe", noBudgets:"Noch keine Budgets", noBudgetsSub:"Tippe + um ein Limit festzulegen. Ein Budget sagt deinem Geld wo es hingehen soll.", newBudget:"Neues Budget", editLimit:"Limit bearbeiten", addBudget:"Budget hinzufugen", removeBudget:"Dieses Budget entfernen", totalSpent:"Gesamt ausgegeben", byCategory:"Nach Kategorie", edit:"Bearbeiten", delete:"Loschen", save:"Speichern", budgeted:"budgetiert", monthlyLimit:"Monatliches Limit", allCatsHaveBudget:"Alle Kategorien haben bereits ein Budget. Zuerst neue Kategorie hinzufugen.", noGoals:"Noch keine Sparbuecher", noGoalsSub:"Tippe + um dein erstes Sparbuch zu erstellen. Ein Ziel mit Termin ist ein Plan, kein Wunsch.", newBudgetBook:"Neues Sparbuch", editBudgetBook:"Sparbuch bearbeiten", createBudgetBook:"Sparbuch erstellen", deleteBudgetBook:"Sparbuch loschen", addToBudgetBook:"Zum Sparbuch hinzufugen", alreadySaved:"Bereits gespart", target:"Ziel", name:"Name", goalComplete:"Ziel erreicht!", remaining:"verbleibend", add:"Hinzufugen", richySuggests:"Richard schlagt vor", implement:"Umsetzen", dismiss:"Ablehnen", aiAdvisor:"KI-Finanzberater", aiAdvisorSub:"Personalisierte Ratschlage basierend auf Ihren Ausgaben.", analyzeMyFinances:"Meine Finanzen analysieren", thinkP1:"Ich lese Ihre Zahlen",thinkP2:"Ich denke nach",thinkP3:"Ich vergleiche die Optionen",thinkP4:"Ich schreibe die Antwort",anStep1:"Ihr Monat wird gelesen",anStep2:"{n} Transaktionen werden gescannt",anStep3:"Vergleich mit Ihrem Plan",anStep4:"Das Wichtigste wird gefunden",anStep5:"Ihre Analyse wird geschrieben",analyzingFinances:"Ihre Finanzen werden analysiert...", fewSeconds:"Dies dauert einige Sekunden", refresh:"Aktualisieren", insights:"Einblicke", analysisFailed:"Analyse fehlgeschlagen", tryAgain:"Erneut versuchen", askYourAdvisor:"Fragen Sie Ihren Berater", advisorQ1:"Wie kann ich mehr sparen?", advisorQ2:"Ist meine Sparrate gesund?", advisorQ3:"Was tun mit meinem Uberschuss?", thinking:"Denke nach...", yesDo:"Ja, mach es", notNow:"Nicht jetzt", askRichard:"Fragen Sie Richard alles...", giveFeedback:"Geben Sie Richard Feedback...", advisorDisclaimer:"Richard ist ein KI-Assistent, kein lizenzierter Finanzberater. Recherchieren Sie stets selbst vor Finanzentscheidungen.", translate:"Plan ubersetzen", noPlanYet:"Noch kein Plan. Fullen Sie den Fragebogen aus um Ihren personlichen Plan von Richard zu erhalten." },
  pt: { overview:"Visao Geral", activity:"Atividade", budgets:"Orcamentos", goals:"Metas", advisor:"Consultor", profile:"Perfil", language:"Idioma", currency:"Moeda", yourPlan:"Seu Plano", categories:"Categorias", signOut:"Sair", richyMember:"Membro Richy", richyRefersTo:"Richy te chama", seeYourPlan:"Ver seu plano de Richard", netBalance:"Saldo Liquido", income:"Receita", spent:"Gasto", topSpend:"Principal gasto", morning:"Bom dia", afternoon:"Boa tarde", evening:"Boa noite", savedThisPeriod:"economizado neste periodo", redoQuestionnaire:"Refazer questionario", yourPlanByRichard:"Seu plano de Richard", noTransactions:"Nenhuma transacao ainda", noTransactionsSub:"Toque + para registrar a primeira. Consciencia e o primeiro passo para a riqueza.", overviewEmptySub:"O homem mais rico da Babilonia comecou rastreando cada moeda. Comece em Atividade.", savingsRate:"Taxa de Poupanca", excellent:"Excelente", onTrack:"No caminho", buildItUp:"Melhore", overspending:"Excesso de gastos", thisPeriod:"este periodo", transactions:"Transacoes", whereItWent:"Para onde foi", overLimit:"acima do limite", complete:"concluido", savedLabel:"economizado", spentLabel:"gasto", toGo:"restante", recent:"Recente", activeGoal:"meta ativa", activeGoals:"metas ativas", today:"Hoje", yesterday:"Ontem", moneyIn:"Entrada", moneyOut:"Saida", newTransaction:"Nova Transacao", editTransaction:"Editar Transacao", addTransaction:"Adicionar Transacao", saveChanges:"Salvar Alteracoes", deleteTx:"Excluir transacao", amount:"Valor", txLabel:"Rotulo", category:"Categoria", date:"Data", repeat:"Repeticao", once:"Uma vez", weekly:"Semanal", monthly:"Mensal", markPending:"Marcar como pendente", expense:"Despesa", noBudgets:"Nenhum orcamento ainda", noBudgetsSub:"Toque + para definir um limite. Um orcamento e dizer ao seu dinheiro para onde ir.", newBudget:"Novo Orcamento", editLimit:"Editar Limite", addBudget:"Adicionar Orcamento", removeBudget:"Remover este orcamento", totalSpent:"Total Gasto", byCategory:"Por Categoria", edit:"Editar", delete:"Excluir", save:"Salvar", budgeted:"orcado", monthlyLimit:"Limite mensal", allCatsHaveBudget:"Cada categoria ja tem um orcamento. Adicione uma nova categoria primeiro.", noGoals:"Nenhum caderno de metas ainda", noGoalsSub:"Toque + para criar seu primeiro caderno. Uma meta com prazo e um plano.", newBudgetBook:"Novo Caderno de Metas", editBudgetBook:"Editar Caderno de Metas", createBudgetBook:"Criar Caderno de Metas", deleteBudgetBook:"Excluir caderno de metas", addToBudgetBook:"Adicionar ao Caderno de Metas", alreadySaved:"Ja economizado", target:"Meta", name:"Nome", goalComplete:"Meta concluida!", remaining:"restante", add:"Adicionar", richySuggests:"Richard sugere", implement:"Implementar", dismiss:"Dispensar", aiAdvisor:"Consultor Financeiro IA", aiAdvisorSub:"Conselhos personalizados com base nos seus gastos reais.", analyzeMyFinances:"Analisar Minhas Financas", thinkP1:"Lendo seus numeros",thinkP2:"Pensando bem",thinkP3:"Pesando as opcoes",thinkP4:"Escrevendo a resposta",anStep1:"Lendo seu mes",anStep2:"Analisando {n} transacoes",anStep3:"Comparando plano e realidade",anStep4:"Buscando o que mais importa",anStep5:"Escrevendo sua analise",analyzingFinances:"Analisando suas financas...", fewSeconds:"Isso leva alguns segundos", refresh:"Atualizar", insights:"Perspectivas", analysisFailed:"Analise falhou", tryAgain:"Tentar novamente", askYourAdvisor:"Pergunte ao seu Consultor", advisorQ1:"Como posso economizar mais?", advisorQ2:"Minha taxa de poupanca e saudavel?", advisorQ3:"O que fazer com meu excedente?", thinking:"Pensando...", yesDo:"Sim, faca isso", notNow:"Agora nao", askRichard:"Pergunte a Richard qualquer coisa...", giveFeedback:"Dar feedback a Richard...", advisorDisclaimer:"Richard e um assistente de IA, nao um consultor financeiro licenciado. Sempre pesquise antes de tomar decisoes financeiras.", translate:"Traduzir plano", noPlanYet:"Ainda sem plano. Complete o questionario para obter seu plano personalizado de Richard." }
};
function tr(key) {
  var code = _lang.code || "en";
  return (TRANSLATIONS[code] && TRANSLATIONS[code][key]) || (TRANSLATIONS.en[key]) || key;
}

function fmtCur(sym, n) {
  var abs = Math.abs(n || 0);
  var d = SYM_TO_DEC[sym]; if (d == null) d = 2;
  return (sym || "$") + abs.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function dollars(n) {
  return fmtCur(_currency.sym, n);
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Month scoping. Budgets and the dashboard track the CURRENT calendar month so
// they reflect a real month and reset automatically on the 1st (no reset code -
// a new month simply has no matching transactions). Net worth stays all-time.
function curMonth() { return new Date().toISOString().slice(0, 7); }   // "2026-06"
function inMonth(t, ym) { return !!(t && t.date) && t.date.slice(0, 7) === ym; }
// Month-key arithmetic done as pure string math so it can never be skewed by
// the local-time vs toISOString (UTC) mismatch. Dates in the app are stored
// as UTC ISO strings, so month keys derived from curMonth() stay consistent.
function ymShift(baseYm, offset) {                                     // ("2026-07", 1) -> "2026-06"
  var p = baseYm.split("-");
  var idx = parseInt(p[0], 10) * 12 + (parseInt(p[1], 10) - 1) - offset;
  var y = Math.floor(idx / 12), m = (idx % 12 + 12) % 12;
  return y + "-" + (m + 1 < 10 ? "0" : "") + (m + 1);
}
function ymDiff(fromYm, toYm) {                                        // whole months from -> to
  var a = fromYm.split("-"), b = toYm.split("-");
  return (parseInt(b[0], 10) - parseInt(a[0], 10)) * 12 + (parseInt(b[1], 10) - parseInt(a[1], 10));
}
// Day-of-month progress in UTC terms (matches curMonth and stored dates).
function monthDayFrac() {
  var d = new Date();
  var daysIn = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return d.getUTCDate() / daysIn;
}

// The starting/opening balance is NET WORTH the user already had, not money
// earned this month - so it must be excluded from income and savings-rate math
// (otherwise the savings rate reads ~100%). We detect it defensively: the boolean
// flag OR the opening category/id, so legacy rows missing the flag are still caught.
function isOpening(t) {
  return !!(t && (t.opening === true || t.catId === "opening" || t.category === "Opening balance"));
}

// === SAVINGS ACCOUNTS ===
// Savings accounts are separate balances ("pots") that sit OUTSIDE the main
// spending balance, so money the user already had (e.g. an emergency fund) never
// inflates their spendable balance. Each pot keeps its own ledger of moves.
// Adding money is either a TRANSFER from the main balance (logs an offsetting
// main-ledger tx so net worth stays the same) or EXTERNAL money the user already
// holds (no main tx; net worth rises, main balance untouched - this is the
// emergency-fund-on-signup case). Net worth = main balance + every pot.
function savingsBalance(acct) {
  if (!acct || !acct.entries) return 0;
  return round2(acct.entries.reduce(function(s, e) {
    return s + (e.kind === "withdraw" ? -(e.amount || 0) : (e.amount || 0));
  }, 0));
}
function savingsTotal(list) {
  if (!list || !list.length) return 0;
  return round2(list.reduce(function(s, a) { return s + savingsBalance(a); }, 0));
}
// A Business Account is a special kind of savings pot: it keeps its own cash
// balance (capital in, expenses/revenue out, exactly the savings ledger shape),
// but also carries business budget categories and a Richard-built plan. Its cash
// counts toward net worth just like a savings pot, so moving money in from the
// main balance relocates it without changing net worth.
function businessCash(biz) { return savingsBalance(biz); }
function businessTotal(list) { return savingsTotal(list); }
// Spent so far across a business's budget categories (cumulative, like a trip).
function businessSpent(biz) {
  if (!biz || !biz.categories) return 0;
  return round2(biz.categories.reduce(function(s, c) { return s + (c.spent || 0); }, 0));
}
// Internal moves between the main balance and a pot are logged on the main ledger
// (so the balance and its trend move correctly) but are NOT real income/spending,
// so they're excluded from monthly cash-flow, savings-rate and category math -
// exactly like the opening balance.
function isTransfer(t) {
  return !!(t && (t.transfer === true || t.catId === "savings-transfer"));
}
// Trip spend is already tracked and budgeted inside its own trip ledger (see
// "Plan a Trip" below). The single lump-sum tx created when the user hits
// "Deduct from Balance" only exists to move real money out of the main
// balance - counting it again in monthly income/expense would double-count
// the same spending and distort that month's savings rate, exactly like a
// savings transfer. So it's excluded from monthly cash-flow/savings math too.
function isTrip(t) {
  return !!(t && t.trip === true);
}

// Offline fallback rates, expressed as approximate units of each currency per 1 USD.
// Used when the live FX request fails (no network) OR when the currency is outside
// frankfurter's ECB set (COP, GHS, VND, NGN, etc.). rate(from -> to) = USD[to] / USD[from].
var FX_FALLBACK = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150, ILS: 3.70, INR: 83, BRL: 5.0, TRY: 32,
  GHS: 15, COP: 4000, VND: 25000, AUD: 1.52, CAD: 1.36, NZD: 1.64, HKD: 7.8,
  SGD: 1.34, MXN: 17, CHF: 0.88, CNY: 7.2, KRW: 1340, THB: 36, PHP: 57,
  IDR: 15800, MYR: 4.7, PLN: 4.0, CZK: 23, HUF: 360, RON: 4.6, SEK: 10.6,
  NOK: 10.7, DKK: 6.9, ISK: 138, RUB: 92, UAH: 39, ZAR: 18.5, NGN: 1500,
  KES: 130, EGP: 48, MAD: 10, AED: 3.67, SAR: 3.75, QAR: 3.64, KWD: 0.31,
  BHD: 0.38, PKR: 278, BDT: 110, LKR: 300, NPR: 133, CLP: 950, ARS: 950
};
var _fxCache = {};

function fxStaticRate(fromSym, toSym) {
  var f = SYM_TO_CODE[fromSym], t = SYM_TO_CODE[toSym];
  var fu = FX_FALLBACK[f], tu = FX_FALLBACK[t];
  if (!fu || !tu) return 1;
  return tu / fu;
}

// Resolve how many units of toSym equal one fromSym. Calls cb(rate, usedFallback).
// Live rates come from frankfurter (ECB-based, no key, CORS-friendly); cached per session.
function fetchRate(fromSym, toSym, cb) {
  if (fromSym === toSym) { cb(1, false); return; }
  var from = SYM_TO_CODE[fromSym], to = SYM_TO_CODE[toSym];
  if (!from || !to) { cb(fxStaticRate(fromSym, toSym), true); return; }
  var key = from + "_" + to;
  if (_fxCache[key]) { cb(_fxCache[key], false); return; }
  fetch("https://api.frankfurter.dev/v1/latest?base=" + from + "&symbols=" + to)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var rate = d && d.rates && d.rates[to];
      if (typeof rate === "number" && rate > 0) { _fxCache[key] = rate; cb(rate, false); }
      else { cb(fxStaticRate(fromSym, toSym), true); }
    })
    .catch(function() { cb(fxStaticRate(fromSym, toSym), true); });
}

function hashPass(pw) {
  var h = 5381;
  for (var i = 0; i < pw.length; i++) {
    h = ((h << 5) + h) + pw.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

// New accounts start with no budgets - the user adds them with the + button.
var DEFAULT_BUDGETS = [];
function freshCategories() { return DEFAULT_CATEGORIES.map(function(c) { return { id: c.id, name: c.name, color: c.color, icon: c.icon, folderId: c.folderId }; }); }
function freshFolders() { return DEFAULT_FOLDERS.map(function(f) { return { id: f.id, name: f.name }; }); }

// Cloud backend: Firebase Authentication owns identity + sessions, and Cloud
// Firestore stores one document per user (collection "users", keyed by the
// Firebase uid) holding their whole data blob. The web config lives in
// firebase-init.js and is loaded by preview.html before this app runs; security
// is enforced by Firestore rules, not by hiding the config. cloudReady() guards
// every call so the app can still boot and explain itself before setup is done.
function _fb() {
  return (typeof window !== "undefined" && window.firebase) ? window.firebase : null;
}
function cloudReady() {
  var f = _fb();
  return !!(f && f.apps && f.apps.length);
}
function _auth() { return _fb().auth(); }
function _fsdb() { return _fb().firestore(); }

var CLOUD = {
  // Subscribe to sign-in state. cb receives the Firebase user (or null). Returns
  // an unsubscribe function. Fires once immediately with the restored session.
  onAuth: function(cb) {
    if (!cloudReady()) { cb(null); return function () {}; }
    return _auth().onAuthStateChanged(cb);
  },
  signUp: function(email, password) {
    return _auth().createUserWithEmailAndPassword(email, password);
  },
  signIn: function(email, password) {
    return _auth().signInWithEmailAndPassword(email, password);
  },
  signInGoogle: function() {
    var provider = new (_fb().auth.GoogleAuthProvider)();
    return _auth().signInWithPopup(provider);
  },
  signOut: function() {
    return cloudReady() ? _auth().signOut() : Promise.resolve();
  },
  loadUser: function(uid) {
    return _fsdb().collection("users").doc(uid).get().then(function (snap) {
      return snap.exists ? snap.data() : null;
    });
  },
  saveUser: function(uid, data) {
    if (!cloudReady() || !uid) return Promise.resolve();
    return _fsdb().collection("users").doc(uid).set(data);
  },
  hasPasswordProvider: function() {
    var cu = cloudReady() ? _auth().currentUser : null;
    if (!cu) return false;
    var pd = cu.providerData || [];
    for (var i = 0; i < pd.length; i++) {
      if (pd[i].providerId === "password") return true;
    }
    return false;
  },
  reauthenticate: function(email, oldPw) {
    var cu = _auth().currentUser;
    var cred = _fb().auth.EmailAuthProvider.credential(email, oldPw);
    return cu.reauthenticateWithCredential(cred);
  },
  updatePassword: function(newPw) {
    return _auth().currentUser.updatePassword(newPw);
  },
  linkPassword: function(email, pw) {
    var cu = _auth().currentUser;
    var cred = _fb().auth.EmailAuthProvider.credential(email, pw);
    return cu.linkWithCredential(cred);
  },
  sendPasswordReset: function(email) {
    return _auth().sendPasswordResetEmail(email);
  },
  updateEmail: function(newEmail) {
    return _auth().currentUser.updateEmail(newEmail);
  },

  // ---- Households (Collab / couples mode) ------------------------------------
  // A household is a shared document at households/{hid}. SHARED data (budgets,
  // goals, categories, shared transactions) lives here; PRIVATE transactions and
  // personal settings stay in each member's users/{uid} doc and never enter here.
  // Membership is enforced by Firestore rules: only listed memberUids (or an
  // invited email in pendingEmails, who can accept) may touch the doc.
  createHousehold: function(member, name) {
    var ref = _fsdb().collection("households").doc();
    var data = {
      name: name || "Our Household",
      createdBy: member.uid,
      memberUids: [member.uid],
      members: [{ uid: member.uid, name: member.name || "", email: (member.email || "").toLowerCase() }],
      pendingEmails: [],
      createdAt: Date.now()
    };
    return ref.set(data).then(function() { return ref.id; });
  },
  loadHousehold: function(hid) {
    return _fsdb().collection("households").doc(hid).get().then(function(snap) {
      return snap.exists ? Object.assign({ id: snap.id }, snap.data()) : null;
    });
  },
  // Live updates so a partner's membership/invite changes appear without reload.
  subscribeHousehold: function(hid, cb) {
    if (!cloudReady() || !hid) { cb(null); return function() {}; }
    return _fsdb().collection("households").doc(hid).onSnapshot(
      function(snap) { cb(snap.exists ? Object.assign({ id: snap.id }, snap.data()) : null); },
      function() { cb(null); }
    );
  },
  // Find households this email has been invited to but not yet joined. The query
  // is constrained to pendingEmails array-contains email so every match satisfies
  // the read rule.
  findInvites: function(email) {
    if (!cloudReady() || !email) return Promise.resolve([]);
    return _fsdb().collection("households").where("pendingEmails", "array-contains", email.toLowerCase()).get()
      .then(function(qs) {
        var out = [];
        qs.forEach(function(d) { out.push(Object.assign({ id: d.id }, d.data())); });
        return out;
      });
  },
  inviteToHousehold: function(hid, email) {
    var FV = _fb().firestore.FieldValue;
    return _fsdb().collection("households").doc(hid).update({
      pendingEmails: FV.arrayUnion((email || "").toLowerCase())
    });
  },
  cancelInvite: function(hid, email) {
    var FV = _fb().firestore.FieldValue;
    return _fsdb().collection("households").doc(hid).update({
      pendingEmails: FV.arrayRemove((email || "").toLowerCase())
    });
  },
  acceptInvite: function(hid, member) {
    var FV = _fb().firestore.FieldValue;
    return _fsdb().collection("households").doc(hid).update({
      memberUids: FV.arrayUnion(member.uid),
      members: FV.arrayUnion({ uid: member.uid, name: member.name || "", email: (member.email || "").toLowerCase() }),
      pendingEmails: FV.arrayRemove((member.email || "").toLowerCase())
    });
  },
  leaveHousehold: function(hid, member) {
    var FV = _fb().firestore.FieldValue;
    return _fsdb().collection("households").doc(hid).update({
      memberUids: FV.arrayRemove(member.uid),
      members: FV.arrayRemove({ uid: member.uid, name: member.name || "", email: (member.email || "").toLowerCase() })
    });
  },
  saveHousehold: function(hid, data) {
    if (!cloudReady() || !hid) return Promise.resolve();
    return _fsdb().collection("households").doc(hid).set(data, { merge: true });
  }
};

function Card(props) {
  return (
    <div style={Object.assign({
      background: props.glass ? T.sheetGlass : T.card,
      borderRadius: 20,
      border: props.glass ? "1px solid " + T.glassBorder : "none",
      boxShadow: props.glass
        ? "0 4px 24px rgba(0,0,0,0.09), inset 0 1px 0 " + T.glassSpec
        : "0 1px 1px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.07)",
      backdropFilter: props.glass ? "blur(28px) saturate(180%)" : "none",
      WebkitBackdropFilter: props.glass ? "blur(28px) saturate(180%)" : "none",
    }, props.style)}>
      {props.children}
    </div>
  );
}

function RichyLogo(props) {
  var size = props.size || 40;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={props.style || {}}>
      <rect width="100" height="100" rx={22} fill="#0D0C18" />
      <text x="50" y="75" textAnchor="middle" fontFamily={"Georgia, 'Times New Roman', serif"} fontSize="72" fontWeight="700" fill="#C8973A">R</text>
    </svg>
  );
}

// === LOADING & THINKING ANIMATIONS ===
// Perceived-performance toolkit. Every AI wait in the app funnels through these
// pieces so waiting reads as Richard visibly working, not a stalled screen:
// typing dots, a rotating "what I'm doing right now" phrase, and a staged
// checklist with a progress bar that always moves forward, never runs backwards,
// and only finishes when the real work returns.
function ensureLoadingCss() {
  var id = "richy-loading-css";
  if (document.getElementById(id)) return;
  var st = document.createElement("style"); st.id = id;
  st.textContent = [
    "@keyframes rclDot{0%,60%,100%{transform:translateY(0);opacity:0.35}30%{transform:translateY(-4px);opacity:1}}",
    "@keyframes rclPhrase{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
    "@keyframes rclBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.055)}}",
    "@keyframes rclGlow{0%,100%{opacity:0.45;transform:scale(0.92)}50%{opacity:0.95;transform:scale(1.18)}}",
    "@keyframes rclSheen{from{transform:translateX(-130%)}to{transform:translateX(430%)}}",
    "@keyframes rclPing{from{opacity:0.55;transform:scale(0.6)}to{opacity:0;transform:scale(2.1)}}",
    "@keyframes rclPop{0%{transform:scale(0.5)}60%{transform:scale(1.18)}100%{transform:scale(1)}}",
    "@media (prefers-reduced-motion:reduce){*{animation-duration:0.001s!important;animation-iteration-count:1!important;transition-duration:0.001s!important}}",
  ].join("");
  document.head.appendChild(st);
}

// iMessage-style typing dots.
function ThinkingDots(props) {
  useEffect(function() { ensureLoadingCss(); }, []);
  var s = props.size || 5;
  var c = props.color || T.ink3;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.max(2.5, s * 0.6) }}>
      {[0, 0.16, 0.32].map(function(d) {
        return <span key={d} style={{ width: s, height: s, borderRadius: "50%", background: c, display: "inline-block", animation: "rclDot 1.15s ease-in-out " + d + "s infinite" }} />;
      })}
    </span>
  );
}

// Cycles through short status phrases so a wait reads as visible work.
function ThinkingPhrase(props) {
  var phrases = (props.phrases && props.phrases.length) ? props.phrases : [tr("thinkP1"), tr("thinkP2"), tr("thinkP3"), tr("thinkP4")];
  var _i = useState(0); var i = _i[0]; var setI = _i[1];
  useEffect(function() {
    ensureLoadingCss();
    var iv = setInterval(function() { setI(function(n) { return n + 1; }); }, props.interval || 2100);
    return function() { clearInterval(iv); };
  }, [phrases.length]);
  return <span key={i} style={{ display: "inline-block", animation: "rclPhrase 0.4s ease both" }}>{phrases[i % phrases.length]}</span>;
}

// Chat-bubble thinking indicator: typing dots plus a live status phrase.
// Drop-in replacement for the old static "..." bubbles.
function RichardThinking(props) {
  var size = props.size || 13.5;
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(0,0,0,0.05)", borderRadius: props.radius || "4px 16px 16px 16px", padding: "10px 14px", animation: "rclPhrase 0.3s ease both" }}>
        <ThinkingDots size={Math.round(size * 0.36 * 10) / 10} color={T.orange} />
        <span style={{ fontSize: size - 0.5, color: T.ink3, fontWeight: 600, fontFamily: UI }}>
          <ThinkingPhrase phrases={props.phrases} />
        </span>
      </div>
    </div>
  );
}

// Staged "Richard is working" panel: breathing avatar, steps that check off one
// by one on a pace matched to the request, and an asymptotic progress bar that
// eases toward done but never quite arrives until the response does. The steps
// are theater - the request is one round trip - but they mirror what the model
// is actually asked to do, and the wait feels shorter when the work is visible.
function AIWorking(props) {
  useEffect(function() { ensureLoadingCss(); }, []);
  var steps = props.steps || [];
  var expected = props.expectedMs || 9000;
  var _t = useState(0); var t = _t[0]; var setT = _t[1];
  useEffect(function() {
    var start = Date.now();
    var iv = setInterval(function() { setT(Date.now() - start); }, 120);
    return function() { clearInterval(iv); };
  }, []);
  var pct = Math.min(94, 100 * (1 - Math.exp(-t / (expected * 0.55))));
  var doneCount = 0;
  for (var i = 0; i < steps.length - 1; i++) {
    if (t > (expected * (i + 1)) / (steps.length + 0.4)) doneCount = i + 1;
  }
  var compact = !!props.compact;
  var inner = (
    <div style={{ textAlign: "center" }}>
      {!compact && (
        <div style={{ position: "relative", width: 54, height: 54, margin: "0 auto 16px" }}>
          <div style={{ position: "absolute", inset: -8, borderRadius: "50%", background: "radial-gradient(circle," + T.orangeGlow + " 0%, transparent 70%)", filter: "blur(6px)", animation: "rclGlow 2.4s ease-in-out infinite" }} />
          <div style={{ position: "relative", width: 54, height: 54, borderRadius: 18, background: "linear-gradient(145deg," + T.orangeHi + "," + T.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px " + T.orangeGlow, animation: "rclBreathe 2.4s ease-in-out infinite" }}>
            <SVGIcon id="spark" size={26} color="#fff" />
          </div>
        </div>
      )}
      {props.title && <div style={{ fontSize: compact ? 13.5 : 15.5, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>{props.title}</div>}
      {props.sub && <div style={{ fontSize: compact ? 12 : 13, color: T.ink3, marginTop: 4 }}>{props.sub}</div>}
      <div style={{ height: 5, borderRadius: 999, background: "rgba(0,0,0,0.07)", marginTop: compact ? 12 : 18, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", borderRadius: 999, background: "linear-gradient(90deg," + T.orangeHi + "," + T.orange + ")", transition: "width 0.35s ease", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, width: "38%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)", animation: "rclSheen 1.6s ease-in-out infinite" }} />
        </div>
      </div>
      {steps.length > 0 && (
        <div style={{ marginTop: compact ? 12 : 16, display: "flex", flexDirection: "column", gap: compact ? 7 : 9, textAlign: "left" }}>
          {steps.map(function(label, idx) {
            var done = idx < doneCount;
            var active = idx === doneCount;
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, animation: "rclPhrase 0.4s ease " + (idx * 0.07) + "s both", opacity: done || active ? 1 : 0.45 }}>
                <span style={{ position: "relative", width: 17, height: 17, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {done && (
                    <span style={{ width: 17, height: 17, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center", animation: "rclPop 0.35s ease both" }}>
                      <SVGIcon id="check" size={10} color="#fff" />
                    </span>
                  )}
                  {active && (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ position: "absolute", width: 15, height: 15, borderRadius: "50%", background: T.orange, animation: "rclPing 1.5s ease-out infinite" }} />
                      <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: T.orange }} />
                    </span>
                  )}
                  {!done && !active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.ink3 }} />}
                </span>
                <span style={{ fontSize: compact ? 12.5 : 13, fontWeight: active ? 650 : 500, color: done ? T.ink3 : active ? T.ink : T.ink3, letterSpacing: "-0.005em" }}>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
  if (props.bare) return <div style={props.style}>{inner}</div>;
  return <Card style={Object.assign({ padding: compact ? "18px 18px" : "30px 22px 26px" }, props.style)}>{inner}</Card>;
}

// Full-screen boot splash shown while auth resolves: breathing logo, soft halo,
// wordmark, typing dots. Replaces the old static logo square.
function BootSplash() {
  useEffect(function() { ensureLoadingCss(); }, []);
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: UI }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto" }}>
          <div style={{ position: "absolute", inset: -12, borderRadius: "50%", background: "radial-gradient(circle," + T.orangeGlow + " 0%, transparent 70%)", filter: "blur(8px)", animation: "rclGlow 2.2s ease-in-out infinite" }} />
          <div style={{ position: "relative", width: 64, height: 64, borderRadius: 20, background: "linear-gradient(145deg," + T.orangeHi + "," + T.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 32px " + T.orangeGlow, animation: "rclBreathe 2.2s ease-in-out infinite" }}>
            <SVGIcon id="spark" size={30} color="#fff" />
          </div>
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", marginTop: 18, animation: "rclPhrase 0.6s ease 0.15s both" }}>Richy</div>
        <div style={{ marginTop: 14, animation: "rclPhrase 0.6s ease 0.3s both" }}>
          <ThinkingDots size={5} color={T.ink3} />
        </div>
      </div>
    </div>
  );
}

// Streams Richard's reply in word by word - the "live answer" feel of the big
// AI apps - instead of popping the finished text in at once. Only the message
// flagged by props.animate streams; history renders instantly.
function TypeReveal(props) {
  var full = props.text || "";
  var words = full.split(/(\s+)/);
  var _n = useState(props.animate ? 2 : words.length); var n = _n[0]; var setN = _n[1];
  useEffect(function() {
    if (!props.animate) { setN(words.length); return; }
    var step = Math.max(2, Math.round(words.length / 55)); // long answers stream faster; ~3s cap
    var iv = setInterval(function() {
      setN(function(cur) {
        var next = cur + step;
        if (next >= words.length) {
          clearInterval(iv);
          if (props.onDone) props.onDone();
          return words.length;
        }
        if (props.onTick) props.onTick();
        return next;
      });
    }, 60);
    return function() { clearInterval(iv); };
  }, [full]);
  var partial = words.slice(0, n).join("");
  // Keep a bold run open mid-stream so unpaired ** never flashes as raw text.
  if (((partial.match(/\*\*/g) || []).length) % 2 === 1) partial += "**";
  return <RichardText text={partial} size={props.size} color={props.color} />;
}

function SVGIcon(props) {
  var size = props.size || 22;
  var color = props.color || T.ink2;
  var icons = {
    overview: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    budgets:  "M2 7h20M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm4 4v10",
    goals:    "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6a4 4 0 100-8 4 4 0 000 8zm0 0v2",
    advisor:  "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8m9-4l-2 2-1-1",
    user:     "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8",
    lock:     "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zm-7 4v3M8 11V7a4 4 0 018 0v4",
    plus:     "M12 5v14M5 12h14",
    trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    up:       "M12 19V5m-7 7l7-7 7 7",
    down:     "M12 5v14m7-7l-7 7-7-7",
    eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
    eyeoff:   "M17.94 17.94A10 10 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9 9 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22",
    logout:   "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
    refresh:  "M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15",
    check:    "M20 6L9 17l-5-5",
    spark:    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    search:   "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    flag:     "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
    folder:   "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z",
    tag:      "M3 12l9-9 9 9-9 9-9-9zM7.5 7.5h.01",
    categories:"M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2.5 12.5V3.5h9l8.6 8.6a2 2 0 010 2.8zM7 7.5h.01",
    chevron:  "M9 6l6 6-6 6",
    edit:     "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
    mail:     "M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zM3 7l9 6 9-6",
    calendar: "M3 5h18v16H3zM3 9h18M8 3v4M16 3v4",
    note:     "M6 2h9l5 5v15H6zM14 2v5h5M9 13h6M9 17h4",
    shield:   "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z",
    // Category banner icons
    home:     "M3 10.5L12 3l9 7.5M5 9.2V20h14V9.2",
    food:     "M7 3v4m-2-4v4a2 2 0 004 0V3M6 8v13M16 3v18M19 8h-6",
    car:      "M5 11l1.6-4.4A2 2 0 018.5 5h7a2 2 0 011.9 1.6L19 11M4.5 11h15v5h-15zM8 16v2M16 16v2",
    heart:    "M12 20.5S3.5 15 3.5 9.2A4.2 4.2 0 0112 6a4.2 4.2 0 018.5 3.2C20.5 15 12 20.5 12 20.5z",
    film:     "M12 2a10 10 0 100 20A10 10 0 0012 2zM10 8l7 4-7 4V8z",
    cart:     "M16 10V6a4 4 0 00-8 0v4M3 8h18v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8z",
    plane:    "M21 15.5l-8.5-4.5V4.5a1.5 1.5 0 00-3 0V11L1 15.5v2l8.5-2.4V19l-2.2 1.6V22l3.7-1 3.7 1v-1.4L12.5 19v-3.9l8.5 2.4z",
    briefcase:"M3 8h18v12H3zM8 8V6a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18",
    chart:    "M3 3v18h18M7 14l3.5-4.5 3 2.5L21 7",
    coins:    "M4 7c0-1.4 2.7-2.5 6-2.5S16 5.6 16 7s-2.7 2.5-6 2.5S4 8.4 4 7zM4 7v5c0 1.4 2.7 2.5 6 2.5M8 13.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5M8 13.5C8 12.1 10.7 11 14 11s6 1.1 6 2.5v5c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5z",
    gift:     "M20 12v8.5H4V12M2.5 7.5h19V12h-19zM12 21V7.5M12 7.5H7.8a2.4 2.4 0 010-4.7C11 2.8 12 7.5 12 7.5zM12 7.5h4.2a2.4 2.4 0 000-4.7C13 2.8 12 7.5 12 7.5z",
    box:      "M12 4v16M4 12h16M6.34 6.34l11.32 11.32M17.66 6.34L6.34 17.66",
    coffee:   "M3 8h14v4a5 5 0 01-5 5H8a5 5 0 01-5-5zM17 9h2.5a2.5 2.5 0 010 5H17M7 3.5V5M10 3.5V5M13 3.5V5",
    book:     "M4 4.5A1.5 1.5 0 015.5 3H19a1 1 0 011 1v14.5M5.5 18H20a1 1 0 010 2H5.5A1.5 1.5 0 014 18.5v-14",
    dumbbell: "M6.5 6.5v11M4 8.5v7M17.5 6.5v11M20 8.5v7M6.5 12h11",
    phone:    "M7 2.5h10a1 1 0 011 1v17a1 1 0 01-1 1H7a1 1 0 01-1-1v-17a1 1 0 011-1zM10.5 18.5h3",
    music:    "M9 18V5l11-2v12M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 15a3 3 0 11-6 0 3 3 0 016 0z",
    leaf:     "M11 20.5A7.5 7.5 0 013.5 13C3.5 6.5 11.5 3.5 20.5 3.5c0 8.5-3 17-9.5 17zM11 20.5c0-5.5 2.5-9.5 6.5-12.5",
    laptop:   "M4 6h16v10H4zM2 19h20M9.5 19l.7-3h3.6l.7 3",
    sun:      "M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 6a6 6 0 100 12A6 6 0 0012 6z",
    star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    droplet:  "M12 3S6 10.5 6 15a6 6 0 0012 0c0-4.5-6-12-6-12z",
    tool:     "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94z",
    credit:   "M2 5h20v14H2zM2 10h20M6 15h4",
    building: "M3 22h18M3 7l9-5 9 5v15H3V7zM9 22v-8h6v8",
    bike:     "M5.5 17.5a3 3 0 100-6 3 3 0 000 6zM18.5 17.5a3 3 0 100-6 3 3 0 000 6zM9 14.5l3-6 2.5 3.5h4M14.5 11.5l-6.5 3",
    shirt:    "M20 5.6L17 3h-4l-1 1.5L11 3H7L4 5.6 2 9l4 1v10h16V10l4-1-2-3.4z",
    wifi:     "M5.2 13.8a9.5 9.5 0 0113.6 0M1.4 9.4a15 15 0 0121.2 0M8.8 17.2a5 5 0 016.4 0M12 21h.01",
    tv:       "M2 7h20v13H2zM8 3l4 4 4-4",
    umbrella: "M23 12a11 11 0 00-22 0M12 12v8a2 2 0 004 0",
    close:    "M18 6L6 18M6 6l12 12",
    clock:    "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };
  var d = icons[props.id] || "";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function ProgressBar(props) {
  var pct = Math.min(100, (props.value / (props.max || 1)) * 100);
  return (
    <div style={{ background: "rgba(0,0,0,0.07)", borderRadius: props.h || 4, height: props.h || 4, overflow: "hidden" }}>
      <div style={{
        width: pct + "%",
        height: "100%",
        borderRadius: props.h || 4,
        background: props.value > props.max ? T.red : (props.color || T.orange),
        transition: "width 0.5s ease",
      }} />
    </div>
  );
}

function RingChart(props) {
  var size = props.size || 60;
  var stroke = props.stroke || 5;
  var r = (size - stroke * 2) / 2;
  var circ = 2 * Math.PI * r;
  var pct = Math.min(1, props.value / (props.max || 1));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={props.track || "rgba(0,0,0,0.07)"} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={props.color || T.orange} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.9s ease" }} />
    </svg>
  );
}

// A number that eases from the previously shown value to the new one (same
// 850ms ease-out cubic as the hero draw progress). First mount counts up from
// zero so fresh screens feel alive.
function CountUp(props) {
  var _s = useState(0); var shown = _s[0]; var setShown = _s[1];
  var fromRef = useRef(0);
  var rafRef = useRef(null);
  useEffect(function() {
    var from = fromRef.current;
    var to = props.value || 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (from === to) { setShown(to); return; }
    var startT = 0;
    var dur = props.duration || 850;
    function tick(now) {
      if (!startT) startT = now;
      var t = Math.min(1, (now - startT) / dur);
      var v = from + (to - from) * (1 - Math.pow(1 - t, 3));
      setShown(v); fromRef.current = v;
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [props.value]);
  return <span>{(props.format || dollars)(shown)}</span>;
}

// A RingChart that draws itself from zero on first paint (the ring already
// transitions stroke-dashoffset, so mounting at 0 and then setting the real
// value one frame later animates the sweep).
function DrawRing(props) {
  var _m = useState(false); var mounted = _m[0]; var setMounted = _m[1];
  useEffect(function() {
    var t = setTimeout(function() { setMounted(true); }, 40);
    return function() { clearTimeout(t); };
  }, []);
  return <RingChart size={props.size} stroke={props.stroke} value={mounted ? props.value : 0} max={props.max} color={props.color} track={props.track} />;
}

// Animated check circle for task rows: the circle fills and the check stroke
// draws itself when done flips on; `pop` adds the springy scale keyframe.
function TaskCheck(props) {
  var sz = props.size || 22;
  var c = props.color || T.orange;
  return (
    <span style={{ width: sz, height: sz, flexShrink: 0, display: "inline-flex", animation: props.pop ? "rcCheckPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both" : "none" }}>
      <svg width={sz} height={sz} viewBox="0 0 22 22">
        <circle cx="11" cy="11" r="10" fill={props.done ? c : "transparent"} stroke={props.done ? c : T.ink3} strokeWidth="1.5" style={{ transition: "fill 0.25s ease, stroke 0.25s ease" }} />
        <path d="M6.5 11.5 L9.5 14.5 L15.5 7.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="14" strokeDashoffset={props.done ? 0 : 14} style={{ transition: "stroke-dashoffset 0.35s ease 0.08s" }} />
      </svg>
    </span>
  );
}

function IconBadge(props) {
  var size = props.size || 38;
  var r = Math.round(size * 0.27);
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      background: props.bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
    }}>
      <SVGIcon id={props.icon || (props.label === "+" ? "up" : "down")} size={size * 0.48} color="#fff" />
    </div>
  );
}

function Overlay(props) {
  var _vis = useState(false); var vis = _vis[0]; var setVis = _vis[1];
  var _closing = useState(false); var closing = _closing[0]; var setClosing = _closing[1];
  useEffect(function() {
    if (props.open) {
      setVis(true); setClosing(false);
    } else if (vis) {
      setClosing(true);
      var t = setTimeout(function() { setVis(false); setClosing(false); }, 270);
      return function() { clearTimeout(t); };
    }
  }, [props.open]);
  if (!vis) return null;
  // Portal to <body> so the sheet escapes the animated tab-content wrapper. That
  // wrapper runs a transform-based slide animation, which leaves a persistent
  // stacking context even after it finishes - trapping this fixed/z-index:90
  // sheet *below* the root-level floating nav pill (z-index:30) and letting the
  // pill paint over the sheet's Add/Save button. Rendering into <body> keeps the
  // sheet truly viewport-relative and above the nav.
  return ReactDOM.createPortal((
    <div style={{ position: "fixed", inset: 0, zIndex: 90 }}>
      <div onClick={props.onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(20,18,16,0.32)",
        backdropFilter: "blur(4px) saturate(120%)", WebkitBackdropFilter: "blur(4px) saturate(120%)",
        animation: closing ? "overlayFadeOut 0.27s ease both" : "overlayFadeIn 0.22s ease both",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: "50%",
        width: "100%", maxWidth: 430,
        maxHeight: "88vh", overflowY: "auto",
        background: T.sheetGlass,
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        borderRadius: "24px 24px 0 0",
        boxShadow: "0 -4px 40px rgba(20,18,16,0.22), inset 0 1px 0 " + T.glassSpec,
        paddingBottom: "calc(28px + env(safe-area-inset-bottom, 0px))",
        animation: closing ? "sheetSlideDown 0.27s cubic-bezier(0.4,0,1,1) both" : "sheetSlideUp 0.34s cubic-bezier(0.22,1,0.36,1) both",
      }}>
        <div style={{ width: 38, height: 5, borderRadius: 3, background: T.orangeDim, margin: "9px auto 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 8px" }}>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: DISP, color: T.ink, letterSpacing: "-0.02em" }}>{props.title}</span>
          <button onClick={props.onClose} style={{
            background: T.orangeDim, border: "none", borderRadius: "50%",
            width: 30, height: 30, cursor: "pointer", fontSize: 18, color: T.orange,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>x</button>
        </div>
        <div style={{ padding: "2px 20px 0" }}>{props.children}</div>
      </div>
    </div>
  ), document.body);
}

function FormRow(props) {
  return (
    <div style={{ background: T.inputBg, borderRadius: 13, padding: "9px 14px", marginBottom: props.last ? 0 : 7 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI, marginBottom: 3 }}>
        {props.label}
      </div>
      {props.opts ? (
        <select value={props.value} onChange={props.onChange} style={{ width: "100%", border: "none", background: "none", fontSize: 15, color: T.ink, fontFamily: UI, outline: "none", padding: 0 }}>
          {props.opts.map(function(o) { return <option key={o}>{o}</option>; })}
        </select>
      ) : (
        <input type={props.type || "text"} value={props.value} onChange={props.onChange} placeholder={props.placeholder || ""}
          style={{ width: "100%", border: "none", background: "none", fontSize: 15, color: T.ink, fontFamily: UI, outline: "none", padding: 0, boxSizing: "border-box" }} />
      )}
    </div>
  );
}

function BigBtn(props) {
  return (
    <button onClick={props.disabled ? undefined : props.onPress}
      style={{
        width: "100%",
        background: props.disabled ? "rgba(0,0,0,0.10)" : (props.color || T.btn),
        color: props.disabled ? T.ink3 : "#fff",
        textShadow: props.disabled ? "none" : "0 1px 2px rgba(42,31,77,0.35)",
        border: "none", borderRadius: 14, padding: "13px 0",
        fontSize: 16, fontFamily: UI, fontWeight: 700,
        cursor: props.disabled ? "default" : "pointer",
        marginTop: 10,
        boxShadow: props.disabled ? "none" : "0 4px 14px " + T.orangeGlow,
      }}>
      {props.label}
    </button>
  );
}

function CatBadge(props) {
  var size = props.size || 38;
  var r = Math.round(size * 0.28);
  var soft = props.soft;
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      background: soft ? (props.color + "1F") : props.color, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: soft ? "none" : "0 2px 8px " + props.color + "55",
    }}>
      <SVGIcon id={props.icon || "box"} size={Math.round(size * 0.5)} color={soft ? props.color : "#fff"} />
    </div>
  );
}

// Progressive-disclosure category picker. Collapsed by default to a single calm
// row showing the selected category; tap to reveal a calm wrap grid of all of
// them; picking one collapses it back. Lighter and less overwhelming than a strip
// of saturated badges. Shared by the transaction add/edit forms and the budget form.
function CatPicker(props) {
  var _o = useState(false);
  var open = _o[0]; var setOpen = _o[1];
  var cats = props.categories || [];
  var sel = null;
  cats.forEach(function(c) { if (c.id === props.value) sel = c; });
  if (!sel) sel = cats[0] || null;
  return (
    <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 13, padding: "9px 14px", marginBottom: props.last ? 0 : 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI }}>
          {props.label || "Category"}
        </div>
        {props.onManage && (
          <button onClick={props.onManage} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 10.5, fontWeight: 600, color: T.orange, fontFamily: UI }}>
            Manage
          </button>
        )}
      </div>
      {!sel ? (
        <div style={{ fontSize: 13, color: T.ink3, fontFamily: UI, padding: "4px 0" }}>No categories</div>
      ) : !open ? (
        <button onClick={function() { setOpen(true); }}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontFamily: UI }}>
          <CatBadge icon={sel.icon} color={sel.color} size={30} soft={true} />
          <span style={{ flex: 1, minWidth: 0, textAlign: "left", fontSize: 15, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sel.name}</span>
          <span style={{ flexShrink: 0, transform: "rotate(90deg)", display: "flex", color: T.ink3 }}>
            <SVGIcon id="chevron" size={14} color={T.ink3} />
          </span>
        </button>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, paddingTop: 1 }}>
          {cats.map(function(c) {
            var active = c.id === props.value;
            return (
              <button key={c.id} onClick={function() { props.onChange(c.id); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 11px 5px 6px", borderRadius: 11, cursor: "pointer", fontFamily: UI,
                  background: active ? (c.color + "1F") : "rgba(0,0,0,0.04)",
                  border: active ? "1.5px solid " + c.color : "1.5px solid transparent" }}>
                <CatBadge icon={c.icon} color={c.color} size={22} soft={true} />
                <span style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? T.ink : T.ink2, whiteSpace: "nowrap" }}>{c.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Appended to every Richard system prompt so his replies come back lightly
// structured (a short lead line, "- " bullets, **bold** emphasis) instead of a
// wall of text. RichardText below renders that structure. No emojis (house style).
var RICHARD_FORMAT = " Format your answer so it is easy to scan instead of a wall of text: open with one short, warm sentence that gives the main point, then when you have more than a couple of points put each on its own line starting with \"- \" (one idea per line, keep it short). You may bold a key term or a short label with **double asterisks**. For a quick reply a sentence or two is fine. Do not use emojis.";

// Render Richard's lightly-structured text: **bold** inline, "- " bullets, and
// short paragraphs. Deliberately tiny - no markdown engine, just the few marks
// we ask Richard to use.
function renderRichInline(text, keyBase) {
  var out = [];
  var re = /\*\*([^*]+)\*\*/g;
  var last = 0, m, n = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<strong key={keyBase + "b" + (n++)} style={{ fontWeight: 700 }}>{m[1]}</strong>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function RichardText(props) {
  var text = (props.text || "").replace(/\r/g, "");
  var color = props.color || T.ink;
  var size = props.size || 14;
  var lines = text.split("\n");
  var blocks = [];
  var bullets = [];
  function flush() {
    if (!bullets.length) return;
    var items = bullets; bullets = [];
    blocks.push(
      <div key={"ul" + blocks.length} style={{ display: "flex", flexDirection: "column", gap: 5, margin: "7px 0" }}>
        {items.map(function(it, i) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: T.orange, fontWeight: 700, flexShrink: 0 }}>-</span>
              <span style={{ flex: 1 }}>{renderRichInline(it, "li" + i)}</span>
            </div>
          );
        })}
      </div>
    );
  }
  lines.forEach(function(raw, i) {
    var line = raw.trim();
    if (!line) { flush(); return; }
    var b = line.match(/^[-•]\s+(.*)/);
    if (b) { bullets.push(b[1]); return; }
    flush();
    var h = line.match(/^\*\*(.+?)\*\*:?$/);
    if (h) { blocks.push(<div key={"h" + i} style={{ fontWeight: 700, color: color, margin: "9px 0 1px" }}>{h[1]}</div>); return; }
    blocks.push(<div key={"p" + i} style={{ margin: "5px 0" }}>{renderRichInline(line, "p" + i)}</div>);
  });
  flush();
  return <div style={{ fontSize: size, color: color, lineHeight: 1.6, fontFamily: UI, whiteSpace: "normal" }}>{blocks}</div>;
}

// Hero amount entry: the focal point of the transaction form. Combines the amount,
// the currency symbol prefix, the currency picker, and the live-converted total into
// one rich block so the form has hierarchy instead of a stack of equal gray boxes.
function AmountField(props) {
  var foreign = props.cur && props.cur !== props.mainSym;
  var amtNum = parseFloat(props.value) || 0;
  var conv = amtNum * (props.rate || 1);
  return (
    <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "11px 15px 12px", marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3, minHeight: 14 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI }}>{tr("amount")}</span>
        {foreign && (
          <span style={{ fontSize: 12, fontWeight: 700, color: T.ink2, fontFamily: UI, letterSpacing: "-0.01em" }}>
            {props.rateLoading ? <ThinkingDots size={3} color={T.ink3} /> : ("= " + fmtCur(props.mainSym, conv))}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: amtNum > 0 ? T.ink2 : T.ink3, fontFamily: UI, lineHeight: 1 }}>{props.cur}</span>
        <input type="number" value={props.value} onChange={props.onAmount} placeholder="0.00"
          style={{ flex: 1, minWidth: 0, border: "none", background: "none", fontSize: 26, fontWeight: 700, color: T.ink, fontFamily: UI, outline: "none", padding: 0, letterSpacing: "-0.03em" }} />
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 11, overflowX: "auto", paddingBottom: 2 }}>
        {(function() {
          // Curated common set, but always include the user's main currency and the
          // currently-selected one so any choice from the full list stays reachable.
          var common = ["$", "€", "£", "¥", "₹", "A$", "C$", "CN¥", "R$", "₺"];
          var syms = [];
          [props.mainSym, props.cur].concat(common).forEach(function(s) {
            if (s && syms.indexOf(s) === -1) syms.push(s);
          });
          return syms.map(function(sym) {
            var o = CURRENCY_OPTIONS.filter(function(c) { return c.sym === sym; })[0];
            if (!o) return null;
            var on = sym === props.cur;
            return (
              <button key={sym} onClick={function() { props.onCur(sym); }}
                style={{ flex: "0 0 auto", minWidth: 46, padding: "6px 8px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: UI,
                  background: on ? T.orangeDim : "rgba(0,0,0,0.05)", color: on ? T.orange : T.ink3 }}>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{o.sym}</div>
                <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.04em", marginTop: 2 }}>{o.code}</div>
              </button>
            );
          });
        })()}
      </div>
      {foreign && !props.rateLoading && (
        <div style={{ fontSize: 11, color: T.ink3, fontWeight: 500, fontFamily: UI, marginTop: 8 }}>
          {"1 " + props.cur + " = " + props.mainSym + (props.rate || 1).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: (props.rate || 1) < 1 ? 4 : 2 }) + (props.rateFallback ? "   (offline rate)" : "")}
        </div>
      )}
    </div>
  );
}

// EmailJS - sends the real verification code to the user's inbox from the browser.
// Public key only; safe to ship client-side. The 6-digit check happens in-app.
var EMAILJS = { service: "service_rl7nf3i", template: "template_q6oxfcp", publicKey: "uqJTHn1oiuh_eKsEs" };

// Real Google Sign-In via Google Identity Services. The Client ID is public by
// design (safe to ship). Authorized origins are set in Google Cloud Console.
var GOOGLE_CLIENT_ID = "40841723141-jl627i43bq6vts956hd9gntlk6v50i53.apps.googleusercontent.com";

// Decode the payload of a Google ID token (JWT) to read email and name.
// We trust the token because GIS handed it to us directly in-browser.
function decodeJwt(token) {
  try {
    var parts = token.split(".");
    if (parts.length < 2) return null;
    var b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) { b64 += "="; }
    var bin = atob(b64);
    var json = decodeURIComponent(bin.split("").map(function(c) {
      return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(""));
    return JSON.parse(json);
  } catch (e) { return null; }
}

function genCode() {
  var s = "";
  for (var i = 0; i < 6; i++) { s += Math.floor(Math.random() * 10); }
  return s;
}

function sendVerificationEmail(email, code) {
  return fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS.service,
      template_id: EMAILJS.template,
      user_id: EMAILJS.publicKey,
      template_params: {
        code: code,
        email: email,
        to_email: email,
        user_email: email,
        to: email,
        recipient: email,
        reply_to: email,
      },
    }),
  });
}

function isEmail(s) {
  var t = (s || "").trim();
  return t.indexOf("@") > 0 && t.indexOf(".", t.indexOf("@")) > t.indexOf("@") + 1 && t.length >= 6;
}

var CLOUD_SETUP_MSG = "Cloud sign-in is not configured yet. Add your Firebase keys in firebase-init.js.";

// Turn a Firebase auth error into a short, human message.
function authMsg(err) {
  var c = (err && err.code) ? err.code : "";
  if (c === "auth/wrong-password" || c === "auth/invalid-credential") return "Wrong email or password.";
  if (c === "auth/user-not-found") return "No account found with that email. Create one first.";
  if (c === "auth/invalid-email") return "That email doesn't look right.";
  if (c === "auth/email-already-in-use") return "An account already uses this email. Sign in instead.";
  if (c === "auth/weak-password") return "Password must be at least 6 characters.";
  if (c === "auth/too-many-requests") return "Too many attempts. Wait a moment and try again.";
  if (c === "auth/network-request-failed") return "Network error. Check your connection and try again.";
  if (c === "auth/popup-blocked") return "Your browser blocked the Google popup. Allow popups and retry.";
  if (c === "auth/operation-not-allowed") return "This sign-in method isn't enabled in Firebase yet.";
  return (err && err.message) ? err.message : "Something went wrong. Please try again.";
}

function AuthScreen(props) {
  var _s = useState("login");
  var step = _s[0]; var setStep = _s[1];
  var _e = useState("");
  var email = _e[0]; var setEmail = _e[1];
  var _p = useState("");
  var password = _p[0]; var setPW = _p[1];
  var _p2 = useState("");
  var password2 = _p2[0]; var setPW2 = _p2[1];
  var _fn = useState("");
  var fullName = _fn[0]; var setFullName = _fn[1];
  var _dob = useState("");
  var dob = _dob[0]; var setDob = _dob[1];
  var _rn = useState("");
  var richardNotes = _rn[0]; var setRichardNotes = _rn[1];
  var _ci = useState("");
  var codeInput = _ci[0]; var setCodeInput = _ci[1];
  var _sc = useState("");
  var sentCode = _sc[0]; var setSentCode = _sc[1];
  var _er = useState("");
  var error = _er[0]; var setError = _er[1];
  var _nt = useState("");
  var notice = _nt[0]; var setNotice = _nt[1];
  var _b = useState(false);
  var busy = _b[0]; var setBusy = _b[1];
  var _sp = useState(false);
  var showPw = _sp[0]; var setShowPw = _sp[1];
  var _ri = useState(0);
  var resendIn = _ri[0]; var setResendIn = _ri[1];
  var _ss = useState(null);
  var ssoProvider = _ss[0]; var setSsoProvider = _ss[1];
  var _sn = useState("");
  var ssoName = _sn[0]; var setSsoName = _sn[1];
  var _pl = useState(null);
  var pendingLogin = _pl[0]; var setPendingLogin = _pl[1];
  var _sb = useState("");
  var startBal = _sb[0]; var setStartBal = _sb[1];
  var _sl = useState("en");
  var signupLang = _sl[0]; var setSignupLang = _sl[1];
  var _sc2 = useState("$");
  var signupCur = _sc2[0]; var setSignupCur = _sc2[1];
  var googleBtnRef = useRef(null);

  useEffect(function() {
    if (resendIn <= 0) return;
    var t = setTimeout(function() { setResendIn(function(v) { return v - 1; }); }, 1000);
    return function() { clearTimeout(t); };
  }, [resendIn]);

  function login() {
    setError("");
    var em = email.trim().toLowerCase();
    if (!isEmail(em) || !password) { setError("Enter your email and password."); return; }
    if (!cloudReady()) { setError(CLOUD_SETUP_MSG); return; }
    setBusy(true);
    CLOUD.signIn(em, password).then(function() {
      // The App's auth listener detects the new session and loads the account.
      setBusy(false);
    }).catch(function(err) {
      setBusy(false);
      setError(authMsg(err));
    });
  }

  // Signup is two screens: enter email, then the rest of the details. The first
  // screen only validates the address locally; Firebase tells us at create time
  // if the email is already taken.
  function sendCode() {
    setError(""); setNotice("");
    var em = email.trim().toLowerCase();
    if (!isEmail(em)) { setError("Enter a valid email address."); return; }
    setStep("signup_details");
  }

  function goToPrefs() {
    setError("");
    if (!fullName.trim()) { setError("Enter your full name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== password2) { setError("Those passwords don't match."); return; }
    if (!dob) { setError("Enter your date of birth."); return; }
    setStep("signup_prefs");
  }

  function finishSignup() {
    setError("");
    if (!cloudReady()) { setError(CLOUD_SETUP_MSG); return; }
    var em = email.trim().toLowerCase();
    setBusy(true);
    // Tell the App's auth listener to stand down while we create the user's
    // document ourselves, so it doesn't race in a blank default.
    window.__cbSignup = true;
    CLOUD.signUp(em, password).then(function(cred) {
      var uid = cred.user.uid;
      var initTx = [];
      var sb = parseFloat(startBal);
      if (sb > 0) {
        initTx = [{ type: "income", amount: sb, label: "Opening balance", catId: "opening", category: "Opening balance", opening: true, date: new Date().toISOString().slice(0, 10), id: Date.now(), repeat: "none", pending: false }];
      }
      var blob = { tx: initTx, budgets: [], goals: [], notes: [], folders: freshFolders(), categories: freshCategories(), displayName: fullName.trim(), email: em, dob: dob, lang: signupLang, currency: signupCur, richardNotes: richardNotes.trim() };
      return CLOUD.saveUser(uid, blob).then(function() {
        window.__cbSignup = false;
        setBusy(false);
        props.onLogin(fullName.trim(), blob, uid);
      });
    }).catch(function(err) {
      window.__cbSignup = false;
      setBusy(false);
      // This email already has an account. Block the signup (creating one would
      // wipe their saved data) and send them to Sign In with the email kept, so
      // they pick up their existing account instead of making a duplicate.
      if (err && err.code === "auth/email-already-in-use") {
        setPW(""); setPW2("");
        setStep("login");
        setError("You already have an account with this email. Sign in below.");
        return;
      }
      setError(authMsg(err));
    });
  }

  // Google sign-in via Firebase popup. First-time Google users get a default
  // document created by the App's auth listener.
  function googleSignIn() {
    setError("");
    if (!cloudReady()) { setError(CLOUD_SETUP_MSG); return; }
    setBusy(true);
    CLOUD.signInGoogle().then(function() {
      setBusy(false);
    }).catch(function(err) {
      setBusy(false);
      if (err && err.code === "auth/popup-closed-by-user") return;
      setError(authMsg(err));
    });
  }

  function goTo(s) {
    setStep(s); setError(""); setNotice(""); setSsoProvider(null);
  }

  function sendPasswordReset() {
    setError(""); setNotice("");
    var em = email.trim().toLowerCase();
    if (!isEmail(em)) { setError("Enter your email address."); return; }
    if (!cloudReady()) { setError(CLOUD_SETUP_MSG); return; }
    setBusy(true);
    CLOUD.sendPasswordReset(em).then(function() {
      setBusy(false);
      setNotice("Check your email for a reset link.");
    }).catch(function(err) {
      setBusy(false);
      setError(authMsg(err));
    });
  }

  var titles = {
    login:            { t: "Welcome back",    s: "Sign in to your account" },
    login_verify:     { t: "Check your email", s: "We sent a 6-digit code to " + email },
    signup_email:     { t: "Get started",     s: "Enter your email to begin" },
    signup_verify:    { t: "Check your email", s: "We sent a 6-digit code to " + email },
    signup_details:   { t: "Almost there",    s: "A few details to finish your account" },
    signup_prefs:     { t: "One last step",   s: "Set your language and currency" },
    forgot_password:  { t: "Reset password",  s: "Enter your email and we'll send a reset link" },
  };
  var head = titles[step] || titles.login;

  function fieldWrap(iconId, child, mb) {
    return (
      <div style={{ position: "relative", marginBottom: mb }}>
        <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
          <SVGIcon id={iconId} size={17} color={T.ink3} />
        </div>
        {child}
      </div>
    );
  }
  var fieldStyle = { width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 15px 15px 46px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };

  var ssoBlock = (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px" }}>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.12)" }} />
        <span style={{ fontSize: 12, color: T.ink3, fontWeight: 500 }}>or continue with</span>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.12)" }} />
      </div>
      <button onClick={googleSignIn} disabled={busy}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 16, padding: "14px 0", fontSize: 15, fontFamily: UI, fontWeight: 600, color: T.ink, cursor: busy ? "default" : "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
        Continue with Google
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FDF5EC 0%,#FAF0E4 40%,#F5E8D8 100%)", display: "flex", flexDirection: "column", fontFamily: UI, position: "relative", overflow: "hidden" }}>

      <div style={{ position: "absolute", top: -80, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(137,112,198,0.15) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 60, left: -80, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(196,154,60,0.12) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px 24px" }}>

        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <RichyLogo size={80} style={{ display: "block", margin: "0 auto 18px", borderRadius: 22, boxShadow: "0 12px 32px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.14)" }} />
          <div style={{ fontSize: 30, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            {head.t}
          </div>
          <div style={{ fontSize: 15, color: T.ink2, marginTop: 6, wordBreak: "break-word" }}>
            {head.s}
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>
          {step === "login" && (
            <div>
              {fieldWrap("mail",
                <input value={email} onChange={function(e) { setEmail(e.target.value); }}
                  placeholder="Email" type="email" autoComplete="email"
                  onKeyDown={function(e) { if (e.key === "Enter") login(); }}
                  style={fieldStyle} />, 12)}
              <div style={{ position: "relative", marginBottom: 0 }}>
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
                  <SVGIcon id="lock" size={17} color={T.ink3} />
                </div>
                <input value={password} onChange={function(e) { setPW(e.target.value); }}
                  type={showPw ? "text" : "password"} placeholder="Password" autoComplete="current-password"
                  onKeyDown={function(e) { if (e.key === "Enter") login(); }}
                  style={{ width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 46px 15px 46px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }} />
                <button onClick={function() { setShowPw(function(v) { return !v; }); }}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <SVGIcon id={showPw ? "eyeoff" : "eye"} size={17} color={T.ink3} />
                </button>
              </div>
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <button onClick={function() { goTo("forgot_password"); }}
                  style={{ background: "none", border: "none", color: T.orange, fontSize: 13, fontFamily: UI, cursor: "pointer", padding: 0 }}>
                  Forgot password?
                </button>
              </div>
            </div>
          )}

          {step === "forgot_password" && (
            <div>
              {fieldWrap("mail",
                <input value={email} onChange={function(e) { setEmail(e.target.value); }}
                  placeholder="Your email address" type="email" autoComplete="email" autoFocus={true}
                  onKeyDown={function(e) { if (e.key === "Enter") sendPasswordReset(); }}
                  style={fieldStyle} />, 0)}
            </div>
          )}

          {step === "signup_email" && (
            <div>
              {fieldWrap("mail",
                <input value={email} onChange={function(e) { setEmail(e.target.value); }}
                  placeholder="Email" type="email" autoComplete="email" autoFocus
                  onKeyDown={function(e) { if (e.key === "Enter") sendCode(); }}
                  style={fieldStyle} />, 0)}
              <div style={{ fontSize: 12.5, color: T.ink3, padding: "10px 4px 0", lineHeight: 1.5 }}>
                Next you'll set a password and a few details.
              </div>
            </div>
          )}

          {step === "signup_details" && (
            <div>
              {fieldWrap("user",
                <input value={fullName} onChange={function(e) { setFullName(e.target.value); }}
                  placeholder="Full name" autoComplete="name" autoFocus
                  style={fieldStyle} />, 12)}
              <div style={{ position: "relative", marginBottom: 12 }}>
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
                  <SVGIcon id="lock" size={17} color={T.ink3} />
                </div>
                <input value={password} onChange={function(e) { setPW(e.target.value); }}
                  type={showPw ? "text" : "password"} placeholder="Set a password" autoComplete="new-password"
                  style={{ width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 46px 15px 46px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }} />
                <button onClick={function() { setShowPw(function(v) { return !v; }); }}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <SVGIcon id={showPw ? "eyeoff" : "eye"} size={17} color={T.ink3} />
                </button>
              </div>
              {fieldWrap("lock",
                <input value={password2} onChange={function(e) { setPW2(e.target.value); }}
                  type={showPw ? "text" : "password"} placeholder="Repeat password" autoComplete="new-password"
                  style={fieldStyle} />, 12)}
              <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 4px 7px" }}>Date of birth</div>
              {fieldWrap("calendar",
                <input value={dob} onChange={function(e) { setDob(e.target.value); }}
                  type="date"
                  onKeyDown={function(e) { if (e.key === "Enter") finishSignup(); }}
                  style={fieldStyle} />, 12)}
              {fieldWrap("coins",
                <input value={startBal} onChange={function(e) { setStartBal(e.target.value); }}
                  type="number" placeholder="Starting balance (optional)"
                  onKeyDown={function(e) { if (e.key === "Enter") finishSignup(); }}
                  style={fieldStyle} />, 0)}
            </div>
          )}

          {step === "signup_prefs" && (
            <div>
              <div style={{ fontSize: 13, color: T.ink3, marginBottom: 14, lineHeight: 1.5 }}>Almost there — pick your language and currency so the app feels right from day one.</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Language</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {LANGUAGE_OPTIONS.map(function(o) {
                  var sel = signupLang === o.code;
                  return (
                    <button key={o.code} onClick={function() { setSignupLang(o.code); }}
                      style={{ padding: "9px 16px", borderRadius: 12, border: sel ? "2px solid " + T.orange : "1.5px solid rgba(0,0,0,0.1)", background: sel ? T.orangeDim : "rgba(255,255,255,0.8)", color: sel ? T.orange : T.ink2, fontSize: 13, fontWeight: sel ? 700 : 500, fontFamily: UI, cursor: "pointer" }}>
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Currency</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CURRENCY_OPTIONS.slice(0, 16).map(function(c) {
                  var sel = signupCur === c.sym;
                  return (
                    <button key={c.sym} onClick={function() { setSignupCur(c.sym); }}
                      style={{ padding: "9px 14px", borderRadius: 12, border: sel ? "2px solid " + T.orange : "1.5px solid rgba(0,0,0,0.1)", background: sel ? T.orangeDim : "rgba(255,255,255,0.8)", color: sel ? T.orange : T.ink2, fontSize: 13, fontWeight: sel ? 700 : 500, fontFamily: UI, cursor: "pointer" }}>
                      {c.sym} {c.code}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", margin: "20px 0 8px" }}>Notes for Richard</div>
              <textarea value={richardNotes} onChange={function(e) { setRichardNotes(e.target.value); }}
                placeholder="Anything Richard should know about you — your goals, money habits, what you're saving for…"
                rows={3}
                style={{ width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "13px 16px", fontSize: 15, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", resize: "vertical", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }} />
            </div>
          )}

          {notice && !error && (
            <div style={{ fontSize: 13, color: T.green, padding: "10px 4px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <SVGIcon id="check" size={14} color={T.green} />
              {notice}
            </div>
          )}

          {error && (
            <div style={{ fontSize: 13, color: T.red, padding: "10px 4px 4px", lineHeight: 1.45 }}>
              {error}
            </div>
          )}

          {!ssoProvider && (
            <button
              onClick={step === "login" ? login : step === "signup_email" ? sendCode : step === "signup_details" ? goToPrefs : step === "forgot_password" ? sendPasswordReset : finishSignup}
              disabled={busy}
              style={{ width: "100%", background: busy ? "rgba(0,0,0,0.08)" : "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", color: busy ? T.ink3 : "#fff", border: "none", borderRadius: 16, padding: "17px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: busy ? "default" : "pointer", marginTop: 16, boxShadow: busy ? "none" : "0 6px 20px " + T.orangeGlow + ", 0 2px 6px rgba(0,0,0,0.1)", letterSpacing: "-0.01em" }}>
              {busy ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Please wait<ThinkingDots size={4.5} color={T.ink3} /></span>
                : step === "login" ? "Sign In"
                : step === "signup_email" ? "Continue"
                : step === "signup_details" ? "Continue"
                : step === "forgot_password" ? "Send reset link"
                : "Create Account"}
            </button>
          )}

          {(step === "login" || step === "signup_email") && ssoBlock}

          {step !== "signup_prefs" && (
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: T.ink2 }}>
              {step === "forgot_password" ? "Remember it? " : step === "login" ? "New here? " : "Have an account? "}
              <button onClick={function() { goTo(step === "login" ? "signup_email" : "login"); }}
                style={{ background: "none", border: "none", color: T.orange, fontWeight: 700, fontSize: 14, fontFamily: UI, cursor: "pointer" }}>
                {step === "forgot_password" ? "Back to sign in" : step === "login" ? "Create account" : "Sign in"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "0 0 32px", fontSize: 12, color: T.ink3 }}>Synced securely to your account</div>
    </div>
  );
}

// Shown once, right after onboarding, to brand-new accounts. A user who joins
// mid-month has usually already spent for the month; logging it here so budgets
// and the dashboard start real instead of at zero. Creates dated expense (and
// optional income) transactions for the CURRENT month, then hands them up.
function CatchUpScreen(props) {
  var allCats = props.categories || [];
  var cats = allCats.filter(function(c) { return c.folderId !== "f3" && c.id !== "opening"; });
  var _am = useState({}); var amts = _am[0]; var setAmts = _am[1];
  var _in = useState(""); var inc = _in[0]; var setInc = _in[1];

  var localeMap = { en: "en-US", he: "he-IL", es: "es-ES", fr: "fr-FR", ar: "ar-SA", ru: "ru-RU", de: "de-DE", pt: "pt-BR" };
  var locale = localeMap[_lang.code] || "en-US";
  var monthName = new Date().toLocaleString(locale, { month: "long" });
  var sym = _currency.sym;

  function setAmt(id, v) {
    setAmts(function(prev) { var n = {}; for (var k in prev) n[k] = prev[k]; n[id] = v; return n; });
  }

  function buildTxs() {
    var today = new Date().toISOString().slice(0, 10);
    var out = [];
    var base = Date.now();
    var i = 0;
    cats.forEach(function(c) {
      var v = parseFloat(amts[c.id]);
      if (v > 0) {
        out.push({ type: "expense", amount: round2(v), label: c.name, catId: c.id, category: c.name, date: today, id: base + (i++), repeat: "none", pending: false });
      }
    });
    var iv = parseFloat(inc);
    if (iv > 0) {
      out.push({ type: "income", amount: round2(iv), label: monthName + " income", catId: "c8", category: "Salary", date: today, id: base + (i++), repeat: "none", pending: false });
    }
    return out;
  }

  var fieldBox = { display: "flex", alignItems: "center", gap: 3, background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: "7px 10px", minWidth: 96 };
  var amtInput = { width: 58, border: "none", background: "none", outline: "none", fontSize: 15, fontFamily: UI, color: T.ink, fontWeight: 600, textAlign: "right" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FDF5EC 0%,#FAF0E4 40%,#F5E8D8 100%)", fontFamily: UI, display: "flex", flexDirection: "column", maxWidth: 430, margin: "0 auto" }}>

      <div style={{ flex: 1, overflowY: "auto", padding: "56px 22px 16px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 22 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(145deg," + T.orangeHi + "," + T.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 8px 24px " + T.orangeGlow }}>
            <SVGIcon id="activity" size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.2 }}>You're partway through {monthName}.</div>
          </div>
        </div>

        <div style={{ fontSize: 14.5, color: T.ink2, lineHeight: 1.55, marginBottom: 22 }}>
          Log what you've already spent this month so your budgets start real, not at zero. Rough numbers are fine, and you can edit anything later in Activity.
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Income received this {monthName}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 22, color: T.ink3, fontWeight: 600 }}>{sym}</span>
            <input value={inc} onChange={function(e) { setInc(e.target.value); }} type="number" inputMode="decimal" placeholder="0" style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 22, fontFamily: UI, color: T.ink, fontWeight: 700 }} />
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", margin: "4px 2px 8px" }}>Spent so far this {monthName}</div>
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          {cats.map(function(c, i) {
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: i < cats.length - 1 ? "0.5px solid " + T.sep : "none" }}>
                <CatBadge icon={c.icon} color={c.color} size={34} soft={true} />
                <span style={{ flex: 1, fontSize: 15, color: T.ink, fontWeight: 500 }}>{c.name}</span>
                <div style={fieldBox}>
                  <span style={{ fontSize: 14, color: T.ink3, fontWeight: 600 }}>{sym}</span>
                  <input value={amts[c.id] || ""} onChange={function(e) { setAmt(c.id, e.target.value); }} type="number" inputMode="decimal" placeholder="0" style={amtInput} />
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <div style={{ padding: "14px 22px 40px", borderTop: "0.5px solid rgba(0,0,0,0.06)", background: "rgba(253,245,236,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        <button onClick={function() { props.onComplete(buildTxs()); }}
          style={{ width: "100%", background: "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", color: "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontFamily: UI, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px " + T.orangeGlow, letterSpacing: "-0.01em" }}>
          Add to my month
        </button>
        <button onClick={function() { props.onComplete([]); }}
          style={{ width: "100%", background: "none", border: "none", fontSize: 14, color: T.ink3, cursor: "pointer", fontFamily: UI, padding: "12px 0 0", display: "block", textAlign: "center" }}>
          Skip for now
        </button>
      </div>

    </div>
  );
}

var STAGES = [
  { label: "Teenager",  icon: "star" },
  { label: "Student",   icon: "book" },
  { label: "Working",   icon: "briefcase" },
  { label: "Parent",    icon: "home" },
];
var TIMELINES = ["6 months", "1 year", "2 years", "5+ years"];

function OnboardingScreen(props) {
  var _s = useState(1); var step = _s[0]; var setStep = _s[1];
  var _cp = useState(""); var coreProblem = _cp[0]; var setCoreProblem = _cp[1];
  var _ls = useState(""); var lifeStage = _ls[0]; var setLifeStage = _ls[1];
  var _inc = useState(""); var income = _inc[0]; var setIncome = _inc[1];
  var _ess = useState(""); var essentials = _ess[0]; var setEssentials = _ess[1];
  var _sav = useState(""); var savings = _sav[0]; var setSavings = _sav[1];
  var _dbt = useState(""); var debt = _dbt[0]; var setDebt = _dbt[1];
  var _gn = useState(""); var goalName = _gn[0]; var setGoalName = _gn[1];
  var _ga = useState(""); var goalAmt = _ga[0]; var setGoalAmt = _ga[1];
  var _tl = useState(""); var timeline = _tl[0]; var setTimeline = _tl[1];
  var _ld = useState(false); var loading = _ld[0]; var setLoading = _ld[1];
  var _er = useState(""); var err = _er[0]; var setErr = _er[1];
  var _gp = useState(""); var genPlan = _gp[0]; var setGenPlan = _gp[1];
  var _god = useState(null); var genOData = _god[0]; var setGenOData = _god[1];
  var _em = useState("manual"); var entryMethod = _em[0]; var setEntryMethod = _em[1];

  var age = computeAge(props.dob);

  function buildPlan() {
    setLoading(true);
    setErr("");
    var ageStr = age !== null ? String(age) : "not provided";
    var langName = LANGUAGE_NAMES[props.lang] || "English";
    var langInstruction = langName !== "English" ? " Respond entirely in " + langName + "." : "";
    var system = "You are Richard, a warm and knowledgeable personal finance advisor inside the Richy app. A new user has just answered their onboarding questions. Their primary financial challenge is: " + (coreProblem || "general budgeting") + ". Generate a concise, personalized financial plan that directly addresses THEIR SPECIFIC PROBLEM, not generic advice. Base it on proven frameworks but tailor it to their situation. Keep the plan under 230 words." + RICHARD_FORMAT + " IMPORTANT: If their problem involves features Richy doesn't have yet (couples mode, debt payoff tracking, business accounting), be honest about that and suggest practical workarounds." + langInstruction;
    var userMsg = "Name: " + props.username + ". Age: " + ageStr + ". Life stage: " + lifeStage + ". PRIMARY CHALLENGE: " + (coreProblem || "building a financial plan") + ". Monthly income: $" + (income || "0") + ". Monthly essentials: $" + (essentials || "0") + ". Current savings: $" + (savings || "0") + ". Total debt: $" + (debt || "0") + ". Top goal: " + (goalName || "financial freedom") + ", target $" + (goalAmt || "unknown") + ", timeline: " + (timeline || "unspecified") + ". Write a plan that directly addresses my primary challenge.";
    callClaude(
      [{ role: "user", content: userMsg }],
      system,
      400,
      function(planErr, text) {
        setLoading(false);
        var plan = (planErr || !text)
          ? ("Start here, " + props.username + ". For your challenge of " + (coreProblem || "managing your money") + ": Track every dollar you spend this month - awareness is step one. Set aside 10% of whatever you earn before you touch anything else. Build one month of essential expenses as a buffer. Then pour your focus into your goal: " + (goalName || "financial freedom") + ". Small consistent actions, repeated every month, compound into real wealth.")
          : text;
        var oData = { lifeStage: lifeStage, income: income, essentials: essentials, savings: savings, debt: debt, goalName: goalName, goalAmt: goalAmt, timeline: timeline, age: ageStr, coreProblem: coreProblem };
        setGenPlan(plan);
        setGenOData(oData);
        setStep(6);
      }
    );
  }


  var fieldStyle = { width: "100%", background: "rgba(255,255,255,0.88)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 16px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", marginBottom: 12, display: "block" };
  var labelStyle = { fontSize: 12, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "block" };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FDF5EC 0%,#FAF0E4 40%,#F5E8D8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: UI }}>
        <div style={{ width: "100%", maxWidth: 320, padding: "0 32px" }}>
          <AIWorking bare
            title="Richard is building your plan"
            sub="Tailored to your answers - not a template."
            expectedMs={12000}
            steps={["Reading your answers", "Shaping your monthly budgets", "Stress-testing the numbers", "Polishing your plan"]} />
        </div>
      </div>
    );
  }

  function suggestBudgets() {
    var inc = parseFloat(income) || 0;
    var ess = parseFloat(essentials) || 0;
    var disc = Math.max(0, inc - ess);
    var result = [];
    if (ess > 0) {
      result.push({ catId: "c1", category: "Housing",   limit: Math.round(ess * 0.50) });
      result.push({ catId: "c2", category: "Food",      limit: Math.round(ess * 0.25) });
      result.push({ catId: "c3", category: "Transport", limit: Math.round(ess * 0.15) });
      result.push({ catId: "c4", category: "Health",    limit: Math.round(ess * 0.10) });
    }
    if (disc > 0) {
      result.push({ catId: "c5", category: "Entertainment", limit: Math.round(disc * 0.35) });
      result.push({ catId: "c6", category: "Shopping",      limit: Math.round(disc * 0.35) });

      result.push({ catId: "c11",category: "Other",         limit: Math.round(disc * 0.10) });
    }
    return result.filter(function(b) { return b.limit > 0; });
  }

  if (step === 6) {
    var proposed = suggestBudgets();
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FDF5EC 0%,#FAF0E4 40%,#F5E8D8 100%)", fontFamily: UI, overflowY: "auto" }}>
        <div style={{ padding: "56px 24px 52px" }}>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(145deg," + T.orangeHi + "," + T.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 8px 24px " + T.orangeGlow }}>
              <SVGIcon id="spark" size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Your plan is ready.</div>
              <div style={{ fontSize: 13, color: T.ink3, marginTop: 2 }}>Richard built this just for you.</div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 18, padding: "20px 20px", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Your Plan by Richard</div>
            <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.7 }}>{genPlan}</div>
          </div>

          <div style={{ background: "#fff", borderRadius: 18, padding: "20px 20px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>How do you want to add transactions?</div>
            <div style={{ fontSize: 13, color: T.ink3, marginBottom: 16, lineHeight: 1.55 }}>You can change this anytime in Profile.</div>
            {[
              { id: "manual", label: "Enter them manually", sub: "Log each transaction yourself - full control" },
              { id: "import", label: "Import from a CSV file", sub: "Upload a bank or card statement to fill them in" }
            ].map(function(opt) {
              var sel = entryMethod === opt.id;
              return (
                <button key={opt.id} onClick={function() { setEntryMethod(opt.id); }}
                  style={{ width: "100%", textAlign: "left", marginBottom: 10, background: sel ? "rgba(137,112,198,0.07)" : "#fff", border: "1.5px solid " + (sel ? T.orange : "rgba(0,0,0,0.08)"), borderRadius: 14, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, fontFamily: UI }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: sel ? 700 : 600, color: T.ink }}>{opt.label}</div>
                    <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>{opt.sub}</div>
                  </div>
                  {sel && <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SVGIcon id="check" size={12} color="#fff" /></div>}
                </button>
              );
            })}
          </div>

          {proposed.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 18, padding: "20px 20px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Set up your budgets automatically?</div>
              <div style={{ fontSize: 13, color: T.ink3, marginBottom: 18, lineHeight: 1.55 }}>Based on your numbers, Richard suggests these monthly limits:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {proposed.map(function(b) {
                  return (
                    <div key={b.catId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, color: T.ink2 }}>{b.category}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>${b.limit}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={function() { props.onComplete(genPlan, genOData, proposed, entryMethod); }}
                style={{ width: "100%", background: "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 16, fontFamily: UI, fontWeight: 700, cursor: "pointer", marginBottom: 10, boxShadow: "0 4px 16px " + T.orangeGlow }}>
                Yes, set them up
              </button>
              <button onClick={function() { props.onComplete(genPlan, genOData, null, entryMethod); }}
                style={{ width: "100%", background: "none", border: "none", fontSize: 14, color: T.ink3, cursor: "pointer", fontFamily: UI, padding: "8px 0" }}>
                I'll set them up myself
              </button>
            </div>
          )}

          {proposed.length === 0 && (
            <button onClick={function() { props.onComplete(genPlan, genOData, null, entryMethod); }}
              style={{ width: "100%", background: "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", color: "#fff", border: "none", borderRadius: 16, padding: "17px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px " + T.orangeGlow }}>
              Get Started
            </button>
          )}

        </div>
      </div>
    );
  }

  var coreProblemOptions = [
    "Saving for a specific goal",
    "Managing irregular or variable income",
    "Paying off debt",
    "Understanding where my money goes",
    "Planning finances with a partner",
    "Building financial confidence",
    "Just getting started with budgeting",
  ];

  var questions = [
    { q: "What's your biggest financial challenge?",      s: "This helps Richard build a plan that actually addresses what matters to you." },
    { q: "How would you describe yourself?",              s: "This helps Richard tailor your plan to your life." },
    { q: "What is your monthly money situation?",         s: "Approximate numbers are completely fine." },
    { q: "Where do you stand right now?",                 s: "Honest numbers lead to a better plan." },
    { q: "What is your most important goal?",             s: "Something specific you want to reach." },
  ];
  var current = questions[step - 1];

  function nextStep() {
    if (step === 1 && !coreProblem) { setErr("Pick the challenge that resonates most."); return; }
    if (step === 2 && !lifeStage) { setErr("Pick the option that fits you best."); return; }
    setErr("");
    if (step < 5) { setStep(step + 1); return; }
    buildPlan();
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FDF5EC 0%,#FAF0E4 40%,#F5E8D8 100%)", fontFamily: UI, display: "flex", flexDirection: "column" }}>

      <div style={{ padding: "64px 24px 0", flex: 1 }}>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 44 }}>
          {[1, 2, 3, 4, 5].map(function(n) {
            return (
              <div key={n} style={{ width: 8, height: 8, borderRadius: "50%", background: n <= step ? T.orange : "rgba(137,112,198,0.22)", transition: "background 0.25s" }} />
            );
          })}
        </div>

        <div style={{ fontSize: 25, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: 8 }}>
          {current.q}
        </div>
        <div style={{ fontSize: 14, color: T.ink3, marginBottom: 28, lineHeight: 1.55 }}>
          {current.s}
        </div>

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {coreProblemOptions.map(function(opt) {
              var sel = coreProblem === opt;
              return (
                <button key={opt} onClick={function() { setCoreProblem(opt); setErr(""); }}
                  style={{ background: sel ? "rgba(137,112,198,0.07)" : "#fff", border: "1.5px solid " + (sel ? T.orange : "rgba(0,0,0,0.08)"), borderRadius: 15, padding: "16px 20px", textAlign: "left", cursor: "pointer", fontSize: 16, fontWeight: sel ? 600 : 500, color: sel ? T.ink : T.ink2, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", fontFamily: UI }}>
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {STAGES.map(function(st) {
              var sel = lifeStage === st.label;
              return (
                <button key={st.label} onClick={function() { setLifeStage(st.label); setErr(""); }}
                  style={{ background: sel ? "rgba(137,112,198,0.07)" : "#fff", border: "1.5px solid " + (sel ? T.orange : "rgba(0,0,0,0.08)"), borderRadius: 15, padding: "16px 20px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", fontFamily: UI }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: sel ? T.orangeDim : "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <SVGIcon id={st.icon} size={18} color={sel ? T.orange : T.ink3} />
                  </div>
                  <span style={{ fontSize: 17, fontWeight: sel ? 700 : 500, color: sel ? T.ink : T.ink2 }}>{st.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div>
            <span style={labelStyle}>Monthly Income</span>
            <input value={income} onChange={function(e) { setIncome(e.target.value); }} type="number" placeholder="e.g. 3000" style={fieldStyle} />
            <span style={Object.assign({}, labelStyle, { marginTop: 4 })}>Monthly Essentials</span>
            <div style={{ fontSize: 12, color: T.ink3, marginBottom: 8 }}>Rent, food, utilities, transport</div>
            <input value={essentials} onChange={function(e) { setEssentials(e.target.value); }} type="number" placeholder="e.g. 1800" style={fieldStyle} />
          </div>
        )}

        {step === 4 && (
          <div>
            <span style={labelStyle}>Current Savings</span>
            <input value={savings} onChange={function(e) { setSavings(e.target.value); }} type="number" placeholder="e.g. 500" style={fieldStyle} />
            <span style={Object.assign({}, labelStyle, { marginTop: 4 })}>Total Debt</span>
            <div style={{ fontSize: 12, color: T.ink3, marginBottom: 8 }}>Credit cards, loans - enter 0 if none</div>
            <input value={debt} onChange={function(e) { setDebt(e.target.value); }} type="number" placeholder="e.g. 0" style={fieldStyle} />
          </div>
        )}

        {step === 5 && (
          <div>
            <span style={labelStyle}>Goal Name</span>
            <input value={goalName} onChange={function(e) { setGoalName(e.target.value); }} type="text" placeholder="e.g. Emergency fund, New laptop" style={fieldStyle} />
            <span style={Object.assign({}, labelStyle, { marginTop: 4 })}>Target Amount</span>
            <input value={goalAmt} onChange={function(e) { setGoalAmt(e.target.value); }} type="number" placeholder="e.g. 5000" style={fieldStyle} />
            <span style={Object.assign({}, labelStyle, { marginTop: 4 })}>Timeline</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
              {TIMELINES.map(function(t) {
                var sel = timeline === t;
                return (
                  <button key={t} onClick={function() { setTimeline(t); }}
                    style={{ background: sel ? T.orange : "#fff", border: "1.5px solid " + (sel ? T.orange : "rgba(0,0,0,0.09)"), borderRadius: 30, padding: "9px 18px", fontSize: 14, fontWeight: sel ? 700 : 500, color: sel ? "#fff" : T.ink2, cursor: "pointer", fontFamily: UI }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {err && (
          <div style={{ fontSize: 13, color: T.red, marginTop: 14, lineHeight: 1.45 }}>{err}</div>
        )}

      </div>

      <div style={{ padding: "20px 24px 52px" }}>
        {step > 1 && (
          <button onClick={function() { setStep(step - 1); setErr(""); }}
            style={{ background: "none", border: "none", fontSize: 14, color: T.ink3, cursor: "pointer", fontFamily: UI, marginBottom: 10, padding: 0 }}>
            Back
          </button>
        )}
        <button onClick={nextStep}
          style={{ width: "100%", background: "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", color: "#fff", border: "none", borderRadius: 16, padding: "17px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px " + T.orangeGlow + ", 0 2px 6px rgba(0,0,0,0.1)", letterSpacing: "-0.01em" }}>
          {step < 4 ? "Next" : "Build My Plan"}
        </button>
        {step > 1 && step < 4 && (
          <button onClick={function() { setErr(""); setStep(step + 1); }}
            style={{ background: "none", border: "none", fontSize: 13, color: T.ink3, cursor: "pointer", fontFamily: UI, marginTop: 14, padding: 0, display: "block", width: "100%", textAlign: "center" }}>
            Skip this step
          </button>
        )}
      </div>

    </div>
  );
}

// Found Money surface: the Overview entry card (scoreboard + leak count) plus the
// detail overlay where Richard narrates the audit and drafts the message that
// recovers the money. Detection is deterministic (findMoney); Richard only
// phrases and drafts. Self-contained so Overview drops it in with one tag.
function FoundMoney(props) {
  var _open = useState(false);   var open = _open[0];        var setOpen = _open[1];
  var _narr = useState("");      var narr = _narr[0];        var setNarr = _narr[1];
  var _nl = useState(false);     var narrLoading = _nl[0];   var setNarrLoading = _nl[1];
  var _draft = useState(null);   var draft = _draft[0];      var setDraft = _draft[1];   // { id, text, loading }
  var _copied = useState(false); var copied = _copied[0];    var setCopied = _copied[1];

  var tx = props.tx || [];
  var cats = props.categories || [];
  var fm = props.foundMoney || { tally: 0, dismissed: [], acted: [] };
  var dismissed = fm.dismissed || [];
  var tally = fm.tally || 0;

  // Recompute findings from real tx each render, drop ones already resolved.
  var findings = findMoney(tx, cats).filter(function(f) { return dismissed.indexOf(f.id) === -1; });
  var leakCount = findings.length;
  var recoverable = findings.reduce(function(s, f) { return s + (f.annual || 0); }, 0);

  function richardSystem(extra) {
    var custom = (props.richardInstructions && props.richardInstructions.trim()) ? ("CONTEXT FROM THE USER (follow any instructions; treat background as things to keep in mind):\n" + props.richardInstructions + "\n\n") : "";
    var langLine = (props.lang && props.lang !== "en") ? (" Respond entirely in " + (LANGUAGE_NAMES[props.lang] || "English") + ".") : "";
    return custom + extra + langLine;
  }

  // Fetch Richard's warm intro once, the first time the sheet opens. Numbers come
  // from the engine - the model only frames them. Falls back to template copy so
  // the surface never depends on the API being reachable (mirrors localAnalysis).
  useEffect(function() {
    if (!open || narr || narrLoading || findings.length === 0) return;
    setNarrLoading(true);
    var lines = findings.slice(0, 8).map(function(f) { return "- " + f.title + " (" + f.subtitle + ")"; }).join("\n");
    var totalLine = recoverable > 0 ? ("\nTotal recoverable if acted on: " + dollars(recoverable) + " per year.") : "";
    var system = richardSystem("You are Richard, the warm, sharp money guide inside the Richy app. The app has ALREADY audited the user's transactions and found the potential leaks listed below (forgotten subscriptions, price hikes, double charges, category spikes). The figures are exact - never invent or change a number. In 2-3 short sentences speak directly to the user: frame what was found and the single highest-impact move to make first. Do not re-list every item - they see the list below your note." + RICHARD_FORMAT);
    callClaude([{ role: "user", content: "The audit found:\n" + lines + totalLine + "\n\nWrite the short intro." }], system, 220, function(err, text) {
      setNarrLoading(false);
      if (err || !text) {
        setNarr(leakCount === 1
          ? "I went through your spending and found one charge worth a second look."
          : "I went through your spending and found " + leakCount + " things worth a look" + (recoverable > 0 ? " - around " + dollars(recoverable) + " a year if you act on them." : "."));
      } else { setNarr(text); }
    });
  }, [open]);

  // Resolve a finding: append its id to dismissed and, when the user confirms they
  // acted, add the recovered amount to the running tally. Persists immediately.
  function resolve(f, recovered) {
    var credit = recovered || 0;
    if (props.onSaveFoundMoney) {
      props.onSaveFoundMoney({
        tally: round2(tally + credit),
        dismissed: dismissed.concat([f.id]),
        acted: credit > 0 ? (fm.acted || []).concat([{ id: f.id, title: f.title, amount: credit, date: new Date().toISOString().slice(0, 10) }]) : (fm.acted || [])
      });
    }
    if (draft && draft.id === f.id) setDraft(null);
  }
  function creditOf(f) { return f.annual > 0 ? f.annual : f.amount; }

  function makeDraft(f) {
    setCopied(false);
    setDraft({ id: f.id, text: "", loading: true });
    var m = f.meta || {};
    var isHike = f.type === "hike";
    var system = richardSystem("You are Richard helping the user write a short, polite, effective " + (isHike ? "price-match / loyalty-discount" : "cancellation") + " message to a company. Output ONLY the message body - no preamble, no subject line, no bracketed placeholders except a trailing [Your Name]. Three to four firm-but-friendly sentences. No emojis.");
    var ask = isHike
      ? ("Write a message to " + f.merchant + " noting my price rose from " + dollars(m.oldAmt) + " to " + dollars(m.newAmt) + " and asking them to match my old rate or I will cancel.")
      : ("Write a message to cancel my " + f.merchant + " subscription of " + dollars(f.amount) + " per " + ((m.cadence === "weekly") ? "week" : "month") + ", effective immediately, and request written confirmation that no further charges will occur.");
    callClaude([{ role: "user", content: ask }], system, 260, function(err, text) {
      if (err || !text) {
        setDraft({ id: f.id, loading: false, text: isHike
          ? ("Hello, I've been a customer for a while and noticed my price recently rose to " + dollars(m.newAmt) + ". I'd like to keep my previous rate of " + dollars(m.oldAmt) + " - can you match it? If not, please treat this as notice that I'll be cancelling. Thank you, [Your Name]")
          : ("Hello, I'd like to cancel my " + f.merchant + " subscription effective immediately. Please confirm in writing that the cancellation is processed and that no further charges will be made. Thank you, [Your Name]") });
      } else { setDraft({ id: f.id, text: text, loading: false }); }
    });
  }

  function copyDraft() {
    if (!draft || !draft.text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(draft.text);
        setCopied(true);
        setTimeout(function() { setCopied(false); }, 1800);
      }
    } catch (e) {}
  }

  function typeStyle(t) {
    if (t === "recurring") return { icon: "refresh", color: T.orange };
    if (t === "hike") return { icon: "up", color: T.red };
    if (t === "duplicate") return { icon: "credit", color: T.gold };
    return { icon: "chart", color: T.btn };   // jump
  }
  function dismissLabel(t) {
    if (t === "recurring") return "Keep it";
    if (t === "duplicate") return "Looks fine";
    if (t === "jump") return "Got it";
    return "Dismiss";
  }

  // Nothing to show and nothing ever found -> stay out of the way entirely.
  if (leakCount === 0 && tally <= 0) return null;

  var pillBase = { fontFamily: UI, fontSize: 12.5, fontWeight: 700, borderRadius: 9, padding: "7px 12px", cursor: "pointer", border: "none" };
  var primaryBtn = Object.assign({}, pillBase, { background: T.orange, color: "#fff" });
  var ghostBtn = Object.assign({}, pillBase, { background: "rgba(0,0,0,0.05)", color: T.ink2 });
  var cardShadow = "0 1px 1px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05)";

  return (
    <div style={{ animation: "rcFadeUp 0.6s ease 0.12s both", marginBottom: 20 }}>
      <div style={{ padding: "0 2px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: T.orange, flexShrink: 0 }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Found Money</span>
        </div>
        {tally > 0 && (
          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.green }}>{"Recovered " + dollars(tally)}</span>
        )}
      </div>

      {leakCount > 0 ? (
        <button onClick={function() { setOpen(true); }} style={{ width: "100%", textAlign: "left", cursor: "pointer", fontFamily: UI, display: "flex", alignItems: "center", gap: 13, padding: "15px 16px", borderRadius: 18, background: T.card, border: "none", boxShadow: cardShadow }}>
          <CatBadge icon="search" color={T.orange} size={40} soft={true} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>{"Richard spotted " + leakCount + " possible " + (leakCount === 1 ? "leak" : "leaks")}</div>
            <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>{recoverable > 0 ? ("About " + dollars(recoverable) + " a year to recover") : "Tap to review what he found"}</div>
          </div>
          <SVGIcon id="chevron" size={18} color={T.ink3} />
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px 16px", borderRadius: 18, background: T.card, boxShadow: cardShadow }}>
          <CatBadge icon="check" color={T.green} size={40} soft={true} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>All clear for now</div>
            <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>No new leaks. Richard keeps watching.</div>
          </div>
        </div>
      )}

      <Overlay open={open} onClose={function() { setOpen(false); }} title="Found Money">
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, background: T.greenDim, borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.09em" }}>Recoverable / year</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.green, letterSpacing: "-0.02em", marginTop: 3 }}>{dollars(recoverable)}</div>
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.09em" }}>Recovered so far</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", marginTop: 3 }}>{dollars(tally)}</div>
          </div>
        </div>

        {findings.length > 0 && (
          <div style={{ background: "rgba(200,103,58,0.06)", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Richard</div>
            {narrLoading
              ? <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: T.ink3, fontWeight: 600 }}>
                  <ThinkingDots size={4} color={T.orange} />
                  <ThinkingPhrase phrases={["Reviewing your spending", "Cross-checking the charges", "Writing it up"]} />
                </div>
              : <RichardText text={narr} size={13.5} />}
          </div>
        )}

        {findings.map(function(f) {
          var st = typeStyle(f.type);
          var canDraft = f.type === "recurring" || f.type === "hike";
          return (
            <div key={f.id} style={{ background: T.card, borderRadius: 16, padding: "13px 14px", marginBottom: 10, boxShadow: cardShadow }}>
              <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                <IconBadge icon={st.icon} bg={st.color} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{f.title}</span>
                    {f.annual > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: T.green, flexShrink: 0 }}>{dollars(f.annual) + "/yr"}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 3, lineHeight: 1.45 }}>{f.subtitle}</div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
                    {canDraft && <button onClick={function() { makeDraft(f); }} style={primaryBtn}>{f.type === "hike" ? "Draft price-match" : "Draft cancellation"}</button>}
                    {f.type === "duplicate" && <button onClick={function() { resolve(f, f.amount); }} style={primaryBtn}>Count as recovered</button>}
                    <button onClick={function() { resolve(f, 0); }} style={ghostBtn}>{dismissLabel(f.type)}</button>
                  </div>

                  {draft && draft.id === f.id && (
                    <div style={{ marginTop: 11, background: "rgba(0,0,0,0.035)", borderRadius: 12, padding: "11px 13px" }}>
                      {draft.loading
                        ? <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink3, fontWeight: 600 }}>
                            <ThinkingDots size={3.5} color={T.orange} />
                            <ThinkingPhrase phrases={["Drafting your message", "Keeping it polite but firm", "Almost there"]} />
                          </div>
                        : <div>
                            <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{draft.text}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
                              <button onClick={copyDraft} style={primaryBtn}>{copied ? "Copied" : "Copy message"}</button>
                              <button onClick={function() { resolve(f, creditOf(f)); }} style={ghostBtn}>{"I did it (+" + dollars(creditOf(f)) + ")"}</button>
                            </div>
                          </div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {findings.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 10px", color: T.ink3 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 4 }}>You've reviewed everything</div>
            <div style={{ fontSize: 13 }}>Richard keeps watching as new spending comes in.</div>
          </div>
        )}

        <div style={{ fontSize: 11, color: T.ink3, lineHeight: 1.5, margin: "6px 2px 0", textAlign: "center" }}>
          Spotted from your logged spending - always confirm before you cancel. Richard drafts the message; you send it.
        </div>
      </Overlay>
    </div>
  );
}

// Overview pulse card for business accounts: health ring, this-month profit,
// runway, the next roadmap step and a review-ready badge. Renders nothing when
// the user has no businesses, so it costs the Overview nothing.
function BusinessPulse(props) {
  var bizes = props.businesses || [];
  if (!bizes.length || !props.onOpenBusiness) return null;
  var shown = bizes.slice(0, 2);
  return (
    <div style={{ animation: "rcFadeUp 0.6s ease 0.08s both" }}>
      {shown.map(function(b) {
        var health = bizHealth(b);
        var pl = bizMonthProfit(b, curMonth());
        var runway = bizRunway(b);
        var mss = (b.roadmap && b.roadmap.milestones) || [];
        var nextTask = null;
        for (var i = 0; i < mss.length && !nextTask; i++) {
          if (mss[i].done) continue;
          var ts = mss[i].tasks || [];
          for (var j = 0; j < ts.length; j++) { if (!ts[j].done) { nextTask = ts[j].label; break; } }
        }
        var fresh = b.reviews && b.reviews[0] && (Date.now() - new Date((b.reviews[0].date || "") + "T00:00:00").getTime()) < 3 * 86400000;
        var reviewReady = reviewDue(b) || fresh;
        return (
          <Card key={b.id} style={{ marginBottom: 14, overflow: "hidden" }}>
            <div onClick={function() { props.onOpenBusiness(b.id); }} style={{ padding: "13px 16px", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative", width: 42, height: 42, flexShrink: 0 }}>
                  <DrawRing size={42} stroke={4} value={health.score} max={100} color={health.color} />
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: T.ink }}>{health.score}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI }}>Business</div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 1 }}>
                    <span style={{ fontWeight: 700, color: pl.profit < 0 ? T.red : (pl.profit > 0 ? T.green : T.ink2) }}>{(pl.profit < 0 ? "-" : "") + dollars(Math.abs(pl.profit))}</span>
                    {" profit this month - " + (runway === null ? "self-sustaining" : runway + " mo runway")}
                  </div>
                </div>
                <SVGIcon id="chevron" size={16} color={T.ink3} />
              </div>
              {nextTask && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: "8px 11px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>Next</span>
                  <span style={{ flex: 1, fontSize: 12.5, color: T.ink2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextTask}</span>
                </div>
              )}
              {reviewReady && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: nextTask ? 7 : 10 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.orange, animation: "rcBadgePulse 1.6s ease 2", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.orange }}>Weekly review ready</span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
      {bizes.length > 2 && (
        <button onClick={function() { props.onOpenBusiness(null); }}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: T.orange, fontSize: 13, fontWeight: 700, fontFamily: UI, padding: "2px 0 12px", textAlign: "center" }}>
          {"+" + (bizes.length - 2) + " more business" + (bizes.length - 2 > 1 ? "es" : "")}
        </button>
      )}
    </div>
  );
}

function Overview(props) {
  var tx       = props.tx;
  var goals    = props.goals;
  var budgets  = props.budgets || [];
  var cats     = props.categories || [];
  var trips    = props.trips || [];
  // A trip counts as "started" either because its start date puts today inside
  // its date range, or - since most trips never get a start date filled in -
  // because the user has pressed "Deduct from balance", which is the actual
  // signal that real spending against it has begun.
  var liveTrips = trips.filter(function(t) { return !t.ended; }).map(function(t) { return { trip: t, dayInfo: tripDayInfo(t) }; }).filter(function(x) { return (x.dayInfo && x.dayInfo.status === "live") || x.trip.reserved; });
  var username = props.username || "";
  var name     = username.charAt(0).toUpperCase() + username.slice(1);

  var h    = new Date().getHours();
  var mins = new Date().getMinutes();
  var day  = new Date().getDay();
  var period = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  var tod = tr(period);

  var pairs = [
    { g: tod + ", " + name + ".",                      s: "Here's where you stand." },
    { g: "How are you saving today, " + name + "?",    s: "Your numbers for today." },
    { g: "Getting productive, " + name + "?",          s: "Let's see how you're doing." },
    { g: "Hey, " + name + ".",                         s: "Quick look at your finances." },
    { g: "Coffee and wealth, " + name + ".",           s: "Here's your overview." },
    { g: "Hi " + name + ".",                           s: "Everything in one place." },
    { g: "Are we rich yet, " + name + "?",             s: "Let's check the numbers." },
    { g: "Another day, another dollar, " + name + ".", s: "Your financial snapshot." },
    { g: "What are we building today, " + name + "?",  s: "Here's the latest." },
    { g: "Wealth is a habit, " + name + ".",           s: "A clear view of your money." },
    { g: "Still at it, " + name + "?",                 s: "Today at a glance." },
    { g: "The grind continues, " + name + ".",         s: "Here's where things stand." },
    { g: "Money doesn't sleep, " + name + ".",         s: "Neither do your numbers." },
    { g: tod + ", " + name + ".",                      s: "Your financial snapshot." },
    { g: "Sharp eye on the numbers, " + name + ".",    s: "Your overview." },
    { g: "Eyes on the prize, " + name + ".",           s: "Here's the full picture." },
  ];

  if (h < 14) {
    if (day === 5) pairs.push({ g: "Happy Friday, " + name + ".",   s: "End the week strong." });
    if (day === 6) pairs.push({ g: "Happy Saturday, " + name + ".", s: "Your weekend overview." });
    if (day === 0) pairs.push({ g: "Happy Sunday, " + name + ".",   s: "Rest, review, repeat." });
    if (day === 1) pairs.push({ g: "New week, " + name + ".",       s: "Fresh start, clean slate." });
  }
  if (_lang.code !== "en") { pairs = [{ g: tod + ", " + name + ".", s: "" }]; }

  var idx      = mins % pairs.length;
  var greeting = pairs[idx].g;
  var subtitle = pairs[idx].s;

  var ym = curMonth();
  // Net Balance is net worth: ALL income (incl. opening balance) minus ALL
  // expense, all-time. It must carry over month to month, so it is NOT scoped.
  // Transactions with a future date or marked pending haven't happened yet —
  // exclude them from all balance and cash-flow calculations.
  var today = new Date().toISOString().slice(0, 10);
  function isSettled(t) { return !t.pending && t.date <= today; }
  var allIncome  = tx.filter(function(t) { return t.type === "income" && !t.catchUp && isSettled(t); }).reduce(function(s,t) { return s+t.amount; }, 0);
  var allExpense = tx.filter(function(t) { return t.type === "expense" && !t.catchUp && isSettled(t); }).reduce(function(s,t) { return s+t.amount; }, 0);
  var balance = allIncome - allExpense;
  // Savings pots sit outside the main balance. Net worth = main balance + pots +
  // business-account cash (also walled off, but still the user's net worth).
  var savAccts = props.savings || [];
  var savTotal = savingsTotal(savAccts);
  var bizAccts = props.businesses || [];
  var bizTotal = businessTotal(bizAccts);
  var netWorth = balance + savTotal + bizTotal;
  // Cash-flow stats are THIS MONTH only. Opening balance is net worth, not income,
  // so it is excluded here (else the savings rate reads 100%). Internal transfers
  // to/from savings pots are excluded too - moving your own money isn't earning or
  // spending it.
  var income  = tx.filter(function(t) { return t.type === "income" && !isOpening(t) && !isTransfer(t) && isSettled(t) && inMonth(t, ym); }).reduce(function(s,t) { return s+t.amount; }, 0);
  var expense = tx.filter(function(t) { return t.type === "expense" && !isTransfer(t) && !isTrip(t) && isSettled(t) && inMonth(t, ym); }).reduce(function(s,t) { return s+t.amount; }, 0);
  var hasIncome = income > 0;
  var savRate = hasIncome ? Math.round(((income - expense) / income) * 100) : 0;
  function spentInCat(c) {
    return tx.filter(function(t) { return t.type === "expense" && !isTrip(t) && inMonth(t, ym) && (t.catId === c.id || t.category === c.name); }).reduce(function(s,t){return s+t.amount;}, 0);
  }
  var recent = tx.filter(function(t) { return !isTransfer(t); }).sort(function(a,b){ return b.date.localeCompare(a.date); }).slice(0,4);
  var monthTxCount = tx.filter(function(t) { return inMonth(t, ym) && !isTransfer(t); }).length;

  var budgetRows = budgets.map(function(b) {
    var c = catById(cats, b.catId) || catByName(cats, b.category) || { id: b.catId, name: b.category || "Budget", color: T.orange, icon: "box" };
    var s = spentInCat(c);
    var pct = b.limit > 0 ? Math.round((s / b.limit) * 100) : 0;
    return { cat: c, spent: s, limit: b.limit, pct: pct, over: s > b.limit && b.limit > 0 };
  }).sort(function(a,b){ return b.pct - a.pct; });

  // ===== Hero carousel: swipeable state + draw animation =====
  var _pg = useState(0);    var page = _pg[0];     var setPage = _pg[1];
  var _rg = useState("1M"); var range = _rg[0];    var setRange = _rg[1];
  var _dx = useState(0);    var dragX = _dx[0];    var setDragX = _dx[1];
  var _dg = useState(false); var dragging = _dg[0]; var setDragging = _dg[1];
  var _hd = useState(false); var hidden = _hd[0];   var setHidden = _hd[1];
  var _dp = useState(0);    var dp = _dp[0];       var setDp = _dp[1];
  var _nw = useState(false); var showNet = _nw[0];  var setShowNet = _nw[1];
  var rafRef = useRef(null);
  var dragRef = useRef({ active: false, startX: 0, vw: 366 });
  var scrollRef = useRef(null);

  // Inject the entrance keyframe once.
  useEffect(function() {
    if (document.getElementById("rc-ov-anim")) return;
    var st = document.createElement("style");
    st.id = "rc-ov-anim";
    st.textContent = "@keyframes rcFadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}"
      + "@keyframes rcBadgePulse{0%,100%{opacity:1;}50%{opacity:0.35;}}"
      + ".rc-hero-scroll{scrollbar-width:none;-ms-overflow-style:none;}.rc-hero-scroll::-webkit-scrollbar{display:none;width:0;height:0;}";
    document.head.appendChild(st);
  }, []);

  // Re-run the 0->1 draw progress on mount and whenever the panel or range changes.
  useEffect(function() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    var startT = 0;
    function tick(now) {
      if (!startT) startT = now;
      var t = Math.min(1, (now - startT) / 850);
      setDp(1 - Math.pow(1 - t, 3));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    setDp(0);
    rafRef.current = requestAnimationFrame(tick);
    return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [page, range]);

  function goPage(i) {
    setPage(i);
    var el = scrollRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }
  // Native scroll-snap drives the carousel; this keeps the dots + chart animation
  // in sync with whichever panel the browser has snapped to.
  var scrollTimer = useRef(null);
  function onScroll(e) {
    var el = e.currentTarget;
    // Throttle: only commit the new page after scrolling settles (100ms),
    // not on every pixel — avoids hammering setPage during the swipe animation.
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(function() {
      var w = el.clientWidth || 1;
      var i = Math.round(el.scrollLeft / w);
      if (i !== page) setPage(i);
    }, 100);
  }
  function pickRange(r) { if (r !== range) setRange(r); }
  function stopDrag(e) { e.stopPropagation(); }
  function onDown(e) {
    var d = dragRef.current;
    d.active = true;
    d.axis = null;                 // undecided -> 'x' (carousel) or 'y' (ignore)
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.dx = 0;
    d.pid = e.pointerId;
    d.vw = e.currentTarget.offsetWidth || 366;
    // Don't capture the pointer yet: wait until we know it's a horizontal drag,
    // otherwise we'd swallow vertical scrolls.
  }
  function onMove(e) {
    var d = dragRef.current;
    if (!d.active) return;
    var dx = e.clientX - d.startX;
    var dy = e.clientY - d.startY;
    // Decide the axis once, on the first meaningful movement, then commit to it.
    if (d.axis === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;   // wait for clear intent
      if (Math.abs(dy) >= Math.abs(dx)) {
        // Vertical gesture: this is a scroll, never a page change. Give up entirely.
        d.axis = "y";
        d.active = false;
        return;
      }
      // Horizontal gesture: lock to the carousel and capture the pointer.
      d.axis = "x";
      setDragging(true);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    }
    if (d.axis !== "x") return;
    if ((page === 0 && dx > 0) || (page === 4 && dx < 0)) dx = dx * 0.35;
    d.dx = dx;
    setDragX(dx);
  }
  function onUp() {
    var d = dragRef.current;
    // Only a committed horizontal drag can change the page.
    if (!d.active || d.axis !== "x") { d.active = false; d.axis = null; d.dx = 0; setDragX(0); setDragging(false); return; }
    d.active = false;
    var w = d.vw || 366;
    var dx = d.dx || 0;
    var np = page;
    if (dx < -w * 0.2 && page < 4) np = page + 1;
    else if (dx > w * 0.2 && page > 0) np = page - 1;
    d.dx = 0;
    d.axis = null;
    setDragX(0);
    setDragging(false);
    setPage(np);
  }

  // ===== Carousel data, scoped to the selected range =====
  var rangeDays = { "7D": 7, "1M": 30, "3M": 91, "1Y": 365 };
  var rangeLong = { "7D": "past 7 days", "1M": "past 30 days", "3M": "past 3 months", "1Y": "past 12 months" };
  var rangeOpts = ["7D", "1M", "3M", "1Y"];
  function isoAgo(d) { return new Date(Date.now() - d * 86400000).toISOString().slice(0, 10); }
  var todayISO = new Date().toISOString().slice(0, 10);
  var winStart = isoAgo(rangeDays[range]);
  var monthNet = income - expense;

  function winExpenseInCat(c) {
    return tx.filter(function(t) { return t.type === "expense" && !isTrip(t) && t.date >= winStart && (t.catId === c.id || t.category === c.name); }).reduce(function(s, t) { return s + t.amount; }, 0);
  }
  var winExpenseTot = tx.filter(function(t) { return t.type === "expense" && !isTransfer(t) && !isTrip(t) && t.date >= winStart; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var winIncomeTot  = tx.filter(function(t) { return t.type === "income" && !isOpening(t) && !isTransfer(t) && t.date >= winStart; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var winSav = winIncomeTot > 0 ? Math.round(((winIncomeTot - winExpenseTot) / winIncomeTot) * 100) : 0;
  var winKept = Math.max(0, winIncomeTot - winExpenseTot);
  var winCats = cats.map(function(c) { return { name: c.name, color: c.color, val: winExpenseInCat(c) }; })
    .filter(function(c) { return c.val > 0; })
    .sort(function(a, b) { return b.val - a.val; })
    .slice(0, 6);

  var labelTotals = {};
  tx.filter(function(t) { return t.type === "expense" && !isTransfer(t) && !isTrip(t) && t.date >= winStart; }).forEach(function(t) {
    var k = t.label || "Other";
    labelTotals[k] = (labelTotals[k] || 0) + t.amount;
  });
  var merchants = Object.keys(labelTotals).map(function(k) { return { name: k, amt: labelTotals[k] }; })
    .sort(function(a, b) { return b.amt - a.amt; }).slice(0, 4);
  var merchMax = merchants.length ? merchants[0].amt : 1;

  // Daily running-balance series across the window - one true point per day, no
  // sampling gaps and no smoothing overshoot, so the line reflects real balances.
  var winDays = rangeDays[range];
  var startBal = tx.filter(function(t) { return t.date < winStart; }).reduce(function(s, t) { return s + (t.type === "income" ? t.amount : -t.amount); }, 0);
  var dayDelta = {};
  tx.forEach(function(t) {
    if (t.date >= winStart && t.date <= todayISO) {
      dayDelta[t.date] = (dayDelta[t.date] || 0) + (t.type === "income" ? t.amount : -t.amount);
    }
  });
  var series = [];
  var run = startBal;
  for (var di = 0; di <= winDays; di++) {
    run += (dayDelta[isoAgo(winDays - di)] || 0);
    series.push(run);
  }
  var nPts = series.length;
  var trendNet = series[series.length - 1] - startBal;
  var trendUp = trendNet >= 0;

  var MONTHS3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function compactMoney(v) {
    var a = Math.abs(v), sign = v < 0 ? "-" : "";
    if (a >= 1000) { var k = a / 1000; return sign + "$" + (k >= 10 ? Math.round(k) : k.toFixed(1)) + "k"; }
    return sign + "$" + Math.round(a);
  }
  function axisLabel(dISO) {
    var dd = new Date(dISO + "T12:00:00");
    if (range === "3M" || range === "1Y") return MONTHS3[dd.getMonth()];
    return (dd.getMonth() + 1) + "/" + dd.getDate();
  }
  function buildTicks() {
    var n = range === "1Y" ? 5 : 4, out = [];
    for (var k = 0; k < n; k++) {
      var frac = n > 1 ? k / (n - 1) : 0;
      out.push({ frac: frac, label: axisLabel(isoAgo(Math.round(winDays * (1 - frac)))) });
    }
    return out;
  }
  // Light-purple hero palette: dark ink on a soft lavender card (replaces the old
  // dark hero). Every carousel + chart color below is tuned to read on lavender.
  var HINK = T.heroText;                 // primary text / numbers (theme-driven)
  var HMUT = T.heroMut;                  // labels
  var HFNT = T.heroFaint;                // faint captions
  var HSEP = T.heroSep;                  // hairline separators
  var HTRACK = T.heroTrack;              // track / bar backgrounds
  var HPOS = T.heroPos;                  // positive
  var HNEG = T.heroNeg;                  // negative

  // Monotone cubic spline (Fritsch-Carlson): rounds the corners smoothly but
  // never overshoots the real points, so the curve stays truthful to the data.
  function smoothLine(pts) {
    var n = pts.length;
    if (n < 3) { return pts.map(function(p, i) { return (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1); }).join(" "); }
    var dx = [], dy = [], m = [], i;
    for (i = 0; i < n - 1; i++) { dx[i] = pts[i + 1].x - pts[i].x; dy[i] = pts[i + 1].y - pts[i].y; m[i] = dx[i] !== 0 ? dy[i] / dx[i] : 0; }
    var t = [m[0]];
    for (i = 1; i < n - 1; i++) { t[i] = (m[i - 1] * m[i] <= 0) ? 0 : (m[i - 1] + m[i]) / 2; }
    t[n - 1] = m[n - 2];
    for (i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; }
      else {
        var a = t[i] / m[i], b = t[i + 1] / m[i], h = Math.sqrt(a * a + b * b);
        if (h > 3) { var s = 3 / h; t[i] = s * a * m[i]; t[i + 1] = s * b * m[i]; }
      }
    }
    var d = "M" + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
    for (i = 0; i < n - 1; i++) {
      var c1x = pts[i].x + dx[i] / 3, c1y = pts[i].y + t[i] * dx[i] / 3;
      var c2x = pts[i + 1].x - dx[i] / 3, c2y = pts[i + 1].y - t[i + 1] * dx[i] / 3;
      d += " C " + c1x.toFixed(1) + " " + c1y.toFixed(1) + " " + c2x.toFixed(1) + " " + c2y.toFixed(1) + " " + pts[i + 1].x.toFixed(1) + " " + pts[i + 1].y.toFixed(1);
    }
    return d;
  }
  function trendChart() {
    var W = 318, H = 108, topY = 12, botY = 74;
    var mn = Math.min.apply(null, series), mx = Math.max.apply(null, series);
    // Always anchor to zero: negative balances sit below the zero line,
    // positive sit above. Prevents -2000 from visually mapping to the same
    // position as +2000 in a different session.
    mn = Math.min(mn, 0);
    mx = Math.max(mx, 0);
    var span = (mx - mn) || 1;
    var lo = mn - span * 0.12, hi = mx + span * 0.12;
    function yOf(v) { return botY - ((v - lo) / (hi - lo)) * (botY - topY); }
    function xOf(i) { return nPts > 1 ? (i / (nPts - 1)) * W : 0; }
    var pts = series.map(function(v, i) { return { x: xOf(i), y: yOf(v) }; });
    var line = smoothLine(pts);
    var zeroY = yOf(0);
    // Fill from the balance line to the zero baseline so the area honestly
    // reflects the signed balance (positive fills downward, negative fills upward).
    var area = line + " L " + W + " " + zeroY.toFixed(1) + " L 0 " + zeroY.toFixed(1) + " Z";
    var last = pts[pts.length - 1];
    var ticks = buildTicks();
    var yMid = (mx + mn) / 2;
    var hasNeg = series.some(function(v) { return v < 0; });
    var areaColor = hasNeg ? HNEG : T.trendArea;
    var lineA = hasNeg ? HNEG : T.trendLineA;
    var lineB = hasNeg ? HNEG : T.trendLineB;
    // Show $0 label at the zero line only when it's not already shown as min/max
    var zeroIsMin = mn === 0, zeroIsMax = mx === 0;
    return (
      <svg width={W} height={H} viewBox={"0 0 " + W + " " + H} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="rcArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={areaColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={areaColor} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="rcLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={lineA} />
            <stop offset="100%" stopColor={lineB} />
          </linearGradient>
        </defs>
        <line x1={0} y1={yOf(mx)} x2={W} y2={yOf(mx)} stroke={T.gridStrong} strokeWidth={1} />
        <line x1={0} y1={yOf(yMid)} x2={W} y2={yOf(yMid)} stroke={T.gridMid} strokeWidth={1} strokeDasharray="2 4" />
        <line x1={0} y1={yOf(mn)} x2={W} y2={yOf(mn)} stroke={T.gridStrong} strokeWidth={1} />
        {ticks.map(function(tk, i) {
          return <line key={"v" + i} x1={(tk.frac * W).toFixed(1)} y1={topY} x2={(tk.frac * W).toFixed(1)} y2={botY} stroke={T.gridFaint} strokeWidth={1} />;
        })}
        <line x1={0} y1={zeroY.toFixed(1)} x2={W} y2={zeroY.toFixed(1)} stroke={HMUT} strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
        {!zeroIsMin && !zeroIsMax && (
          <text x={3} y={zeroY - 3} fontSize={9} fontFamily={UI} fill={HMUT} opacity={0.7}>$0</text>
        )}
        <path d={area} fill="url(#rcArea)" opacity={dp} />
        <path d={line} fill="none" stroke="url(#rcLine)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - dp} />
        <circle cx={last.x} cy={last.y} r={6} fill={T.trendGlow} opacity={0.20 * dp} />
        <circle cx={last.x} cy={last.y} r={3.4} fill={T.trendDot} stroke={T.trendDotStroke} strokeWidth={2} opacity={dp} />
        <text x={3} y={yOf(mx) - 4} fontSize={9} fontFamily={UI} fill={HMUT}>{compactMoney(mx)}</text>
        <text x={3} y={yOf(mn) - 4} fontSize={9} fontFamily={UI} fill={HMUT}>{compactMoney(mn)}</text>
        {ticks.map(function(tk, i) {
          var anchor = i === 0 ? "start" : (i === ticks.length - 1 ? "end" : "middle");
          var lx = i === 0 ? 0 : (i === ticks.length - 1 ? W : tk.frac * W);
          return <text key={"t" + i} x={lx.toFixed(1)} y={botY + 18} fontSize={9.5} fontFamily={UI} fill={HMUT} textAnchor={anchor}>{tk.label}</text>;
        })}
      </svg>
    );
  }
  function donutChart() {
    var C = 2 * Math.PI * 56;
    var gap = 0.016;
    var s = 0;
    var total = winExpenseTot || 1;
    var segs = winCats.map(function(c, i) {
      var frac = c.val / total;
      var start = s;
      var len = Math.max(frac - gap, 0.004);
      var vis = len * dp;
      s += frac;
      return <circle key={i} cx={66} cy={66} r={56} fill="none" stroke={c.color} strokeWidth={18} strokeLinecap="butt" strokeDasharray={(vis * C).toFixed(2) + " " + (C + 2).toFixed(2)} strokeDashoffset={(-start * C).toFixed(2)} />;
    });
    return (
      <svg width={132} height={132} viewBox="0 0 132 132" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={66} cy={66} r={56} fill="none" stroke={HTRACK} strokeWidth={18} />
        {segs}
      </svg>
    );
  }
  function ringChart() {
    var C = 2 * Math.PI * 54;
    var frac = (Math.max(0, winSav) / 100) * dp;
    return (
      <svg width={120} height={120} viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="rcRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={T.ringA} />
            <stop offset="100%" stopColor={T.gold} />
          </linearGradient>
        </defs>
        <circle cx={60} cy={60} r={54} fill="none" stroke={HTRACK} strokeWidth={12} />
        <circle cx={60} cy={60} r={54} fill="none" stroke="url(#rcRing)" strokeWidth={12} strokeLinecap="round" strokeDasharray={(frac * C).toFixed(2) + " " + C.toFixed(2)} />
      </svg>
    );
  }
  function rangeRow() {
    return (
      <div onPointerDown={stopDrag} style={{ display: "flex", gap: 2, background: T.heroRangeBg, borderRadius: 9, padding: 3 }}>
        {rangeOpts.map(function(r) {
          var on = r === range;
          return (
            <div key={r} onPointerDown={stopDrag} onClick={function() { pickRange(r); }}
              style={{ padding: "4px 9px", borderRadius: 7, fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", cursor: "pointer", transition: "all 0.2s", background: on ? T.heroPillBg : "transparent", color: on ? T.heroPillText : HMUT }}>
              {r}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>

      <div style={{ padding: "6px 2px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, letterSpacing: "-0.03em", lineHeight: 1.18 }}>
            {greeting}
          </div>
          <div style={{ fontSize: 14, color: T.ink3, marginTop: 5, fontStyle: "italic" }}>
            {subtitle}
          </div>
        </div>
        <button onClick={props.onCategories} style={{ flexShrink: 0, marginTop: 4, marginLeft: 18, width: 42, height: 42, borderRadius: 14, background: T.btn, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(137,112,198,0.32)" }}>
          <SVGIcon id="categories" size={20} color="#fff" />
        </button>
      </div>

      <div style={{ marginBottom: 16, animation: "rcFadeUp 0.6s ease both" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 7, padding: "0 0 11px" }}>
          {[0,1,2,3,4].map(function(i) {
            return <div key={i} onClick={function() { goPage(i); }} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, cursor: "pointer", transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)", background: i === page ? T.orange : "rgba(0,0,0,0.16)" }} />;
          })}
        </div>
        <div style={{ position: "relative", height: 242, borderRadius: 24, overflow: "hidden", background: T.heroBg, boxShadow: T.heroShadow }}>
          <div style={{ position: "absolute", top: -70, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle," + T.heroGlow1 + ",transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
          <div style={{ position: "absolute", bottom: -70, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle," + T.heroGlow2 + ",transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
          <div ref={scrollRef} onScroll={onScroll} className="rc-hero-scroll"
            style={{ position: "relative", zIndex: 1, display: "flex", height: "100%", width: "100%", overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>

            {/* Panel 0 - Balance */}
            <div style={{ flex: "0 0 100%", width: "100%", height: "100%", boxSizing: "border-box", scrollSnapAlign: "start", overflow: "hidden",padding: "22px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {savAccts.length > 0 ? (
                  <div onPointerDown={stopDrag} style={{ display: "flex", gap: 2, background: T.heroRangeBg, borderRadius: 9, padding: 3 }}>
                    {[["bal", tr("balance")], ["net", tr("netWorth")]].map(function(opt) {
                      var on = (opt[0] === "net") === showNet;
                      return (
                        <div key={opt[0]} onPointerDown={stopDrag} onClick={function() { setShowNet(opt[0] === "net"); }}
                          style={{ padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, letterSpacing: "0.02em", cursor: "pointer", transition: "all 0.2s", background: on ? T.heroPillBg : "transparent", color: on ? T.heroPillText : HMUT }}>
                          {opt[1]}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: HMUT }}>{tr("netBalance")}</span>
                )}
                <div onPointerDown={stopDrag} onClick={function() { setHidden(function(v) { return !v; }); }} style={{ cursor: "pointer", padding: 4, display: "flex" }}>
                  <SVGIcon id={hidden ? "eyeoff" : "eye"} size={20} color={HMUT} />
                </div>
              </div>
              <div>
                <div style={{ filter: hidden ? "blur(11px)" : "none", userSelect: "none" }}>
                  <span style={{ fontSize: 42, fontWeight: 700, color: HINK, letterSpacing: "-0.03em", lineHeight: 1 }}>{dollars((showNet ? netWorth : balance) * dp)}</span>
                </div>
                {showNet ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9 }}>
                    <span style={{ fontSize: 12, color: HFNT }}>{dollars(balance) + " " + tr("balance").toLowerCase() + " + " + dollars(savTotal) + " " + tr("savings").toLowerCase()}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: monthNet >= 0 ? HPOS : HNEG }}>{(monthNet >= 0 ? "+" : "-") + dollars(Math.abs(monthNet))}</span>
                    <span style={{ fontSize: 12, color: HFNT }}>this month</span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 14, borderTop: "0.5px solid " + HSEP, paddingTop: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: HFNT }}>{tr("income")}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: HPOS, letterSpacing: "-0.02em", marginTop: 3 }}>{"+" + dollars(income)}</div>
                </div>
                <div style={{ width: "0.5px", background: HSEP }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: HFNT }}>{tr("spent")}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: HNEG, letterSpacing: "-0.02em", marginTop: 3 }}>{"-" + dollars(expense)}</div>
                </div>
              </div>
            </div>

            {/* Panel 1 - Trend */}
            <div style={{ flex: "0 0 100%", width: "100%", height: "100%", boxSizing: "border-box", scrollSnapAlign: "start", overflow: "hidden",padding: "20px 22px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: HMUT }}>BALANCE TREND</span>
                {rangeRow()}
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{trendChart()}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: trendUp ? HPOS : HNEG }}>{(trendUp ? "+" : "-") + dollars(Math.abs(trendNet))}</div>
                  <div style={{ fontSize: 11, color: HFNT, marginTop: 2 }}>{"net change - " + rangeLong[range]}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: HINK, letterSpacing: "-0.02em" }}>{dollars(series[series.length - 1])}</div>
                  <div style={{ fontSize: 11, color: HFNT, marginTop: 2 }}>balance now</div>
                </div>
              </div>
            </div>

            {/* Panel 2 - Categories */}
            <div style={{ flex: "0 0 100%", width: "100%", height: "100%", boxSizing: "border-box", scrollSnapAlign: "start", overflow: "hidden",padding: "20px 22px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: HMUT }}>WHERE IT GOES</span>
                {rangeRow()}
              </div>
              {winCats.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: HMUT }}>No spending in this period.</div>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 18, marginTop: 6 }}>
                  <div style={{ position: "relative", width: 132, height: 132, flexShrink: 0 }}>
                    {donutChart()}
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: HFNT }}>SPENT</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: HINK, letterSpacing: "-0.03em" }}>{dollars(winExpenseTot)}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {winCats.map(function(c, i) {
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 12, color: T.catNameHero, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: HINK }}>{Math.round((c.val / winExpenseTot) * 100) + "%"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Panel 3 - Savings rate */}
            <div style={{ flex: "0 0 100%", width: "100%", height: "100%", boxSizing: "border-box", scrollSnapAlign: "start", overflow: "hidden",padding: "22px 24px", display: "flex", alignItems: "center", gap: 22 }}>
              <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
                {ringChart()}
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color: HINK, letterSpacing: "-0.03em", lineHeight: 1 }}>{Math.round(Math.max(0, winSav) * dp)}<span style={{ fontSize: 16 }}>%</span></div>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: HFNT, marginTop: 2 }}>SAVED</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: HMUT }}>SAVINGS RATE</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: HINK, lineHeight: 1.35, marginTop: 8, letterSpacing: "-0.01em" }}>{winIncomeTot > 0 ? "You kept " + dollars(winKept) + " of what you earned." : "No income recorded in this period."}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10 }}>
                  <SVGIcon id={winSav >= 0 ? "up" : "down"} size={14} color={winSav >= 0 ? HPOS : HNEG} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: winSav >= 0 ? HPOS : HNEG }}>{winSav >= 20 ? "Excellent pace" : winSav >= 10 ? "On track" : winSav >= 0 ? "Building up" : "Overspending"}</span>
                </div>
              </div>
            </div>

            {/* Panel 4 - Top merchants */}
            <div style={{ flex: "0 0 100%", width: "100%", height: "100%", boxSizing: "border-box", scrollSnapAlign: "start", overflow: "hidden",padding: "20px 22px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: HMUT }}>TOP MERCHANTS</span>
                {rangeRow()}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 13 }}>
                {merchants.length === 0 ? (
                  <div style={{ textAlign: "center", fontSize: 13, color: HMUT }}>No expenses in this period.</div>
                ) : merchants.map(function(m, i) {
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: T.merchNameHero, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "62%" }}>{m.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: HINK, letterSpacing: "-0.02em" }}>{dollars(m.amt)}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 4, background: HTRACK, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: ((m.amt / merchMax) * 100 * dp).toFixed(1) + "%", background: T.merchBar, borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

      {props.plan && (
        <div style={{ background: "rgba(137,112,198,0.04)", borderRadius: 18, padding: "20px 22px", marginBottom: 16, boxShadow: "0 1px 1px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04)", borderLeft: "3px solid " + T.orange, animation: "rcFadeUp 0.6s ease 0.09s both" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: UI, marginBottom: 10 }}>
            {tr("yourPlanByRichard")}
          </div>
          <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.65, fontFamily: UI }}>
            <RichardText text={props.plan} size={14} />
          </div>
        </div>
      )}

      {tx.length === 0 && (
        <Card style={{ padding: "36px 24px", textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SVGIcon id="activity" size={24} color={T.orange} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 5 }}>{tr("noTransactions")}</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>{tr("overviewEmptySub")}</div>
        </Card>
      )}

      {(income > 0 || expense > 0) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, animation: "rcFadeUp 0.6s ease 0.06s both" }}>
          <div style={{ flex: 1, background: !hasIncome ? T.card : (savRate >= 20 ? T.greenDim : savRate > 0 ? T.orangeDim : "rgba(224,48,48,0.07)"), borderRadius: 16, padding: "16px 16px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{tr("savingsRate")}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: !hasIncome ? T.ink3 : (savRate >= 20 ? T.green : savRate > 0 ? T.orange : T.red), letterSpacing: "-0.02em" }}>{!hasIncome ? "-" : savRate + "%"}</div>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 3 }}>{!hasIncome ? tr("noIncomeYet") : (savRate >= 20 ? tr("excellent") : savRate >= 10 ? tr("onTrack") : savRate > 0 ? tr("buildItUp") : tr("overspending"))}</div>
          </div>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "16px 16px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{tr("transactions")}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{monthTxCount}</div>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 3 }}>{tr("thisPeriod")}</div>
          </div>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "16px 16px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{tr("goals")}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{goals.length}</div>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 3 }}>{goals.length === 1 ? tr("activeGoal") : tr("activeGoals")}</div>
          </div>
        </div>
      )}

      {liveTrips.map(function(lt) {
        var t = lt.trip, di = lt.dayInfo;
        var spent = tripSpent(t);
        var left = t.total - spent;
        return (
          <div key={t.id} onClick={function() { props.onOpenTrip(t.id); }}
            style={{ position: "relative", overflow: "hidden", borderRadius: 20, padding: "18px 20px", marginBottom: 16, background: T.heroBg, boxShadow: T.heroShadow, cursor: "pointer", animation: "rcFadeUp 0.6s ease 0.03s both" }}>
            <div style={{ position: "absolute", top: -60, right: -50, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle," + T.heroGlow1 + ",transparent 65%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <SVGIcon id={t.icon || "plane"} size={20} color={T.heroInk} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.heroMut }}>{(di ? ("Day " + di.dayNum + " of " + t.days) : "Trip in progress") + (t.destination ? (" - " + t.destination) : "")}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.heroInk, marginTop: 2 }}>{t.name}</div>
              </div>
              <SVGIcon id="chevron" size={16} color={T.heroInk} />
            </div>
            <div style={{ position: "relative", display: "flex", gap: 16, marginTop: 14, borderTop: "0.5px solid " + T.heroSep, paddingTop: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.heroMut }}>{tr("spent")}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.heroInk, marginTop: 3 }}>{dollars(spent)}</div>
              </div>
              <div style={{ width: "0.5px", background: T.heroSep }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.heroMut }}>{tr("leftToSpend")}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: left < 0 ? T.heroNeg : T.heroInk, marginTop: 3 }}>{dollars(left)}</div>
              </div>
            </div>
            {!di && (
              <div style={{ position: "relative", fontSize: 11.5, color: T.heroMut, marginTop: 12, lineHeight: 1.4 }}>
                {"No start date set - add one on the trip's page to see day-by-day tracking here."}
              </div>
            )}
          </div>
        );
      })}

      <FoundMoney tx={tx} categories={cats} foundMoney={props.foundMoney} onSaveFoundMoney={props.onSaveFoundMoney} richardInstructions={props.richardInstructions} lang={props.lang} />

      <BusinessPulse businesses={bizAccts} onOpenBusiness={props.onOpenBusiness} />

      <div style={{ animation: "rcFadeUp 0.6s ease 0.09s both" }}>
        <div style={{ padding: "0 2px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: T.orange, flexShrink: 0 }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{tr("savings")}</span>
          </div>
          {(savAccts.length > 0 || bizAccts.length > 0) && (
            <button onClick={props.onOpenSavings} style={{ background: "none", border: "none", cursor: "pointer", color: T.orange, fontSize: 13, fontWeight: 700, fontFamily: UI, display: "flex", alignItems: "center", gap: 2 }}>
              {tr("manage")}<SVGIcon id="chevron" size={15} color={T.orange} />
            </button>
          )}
        </div>
        {(savAccts.length === 0 && bizAccts.length === 0) ? (
          <button onClick={props.onOpenSavings} style={{ width: "100%", textAlign: "left", cursor: "pointer", fontFamily: UI, display: "flex", alignItems: "center", gap: 13, marginBottom: 20, padding: "15px 16px", borderRadius: 18, background: T.card, border: "1px dashed " + T.orange + "66", boxShadow: "0 1px 1px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05)" }}>
            <CatBadge icon="coins" color={T.orange} size={38} soft={true} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>{props.onOpenBusiness ? "Open an account" : tr("addSavingsAccount")}</div>
              <div style={{ fontSize: 12, color: T.ink3, marginTop: 2, lineHeight: 1.4 }}>{props.onOpenBusiness ? "A savings pot, or a business account with Richard." : tr("emptySavingsSub")}</div>
            </div>
            <SVGIcon id="plus" size={20} color={T.orange} />
          </button>
        ) : (
          <Card style={{ overflow: "hidden", marginBottom: 20 }}>
            {savAccts.map(function(a) {
              return (
                <button key={a.id} onClick={props.onOpenSavings} style={{ width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "0.5px solid " + T.sep, cursor: "pointer", fontFamily: UI, display: "flex", alignItems: "center", gap: 12, padding: "13px 16px" }}>
                  <CatBadge icon={a.icon || "coins"} color={a.color || T.orange} size={36} soft={true} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: T.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, flexShrink: 0 }}>{dollars(savingsBalance(a))}</span>
                </button>
              );
            })}
            {bizAccts.map(function(b) {
              return (
                <button key={b.id} onClick={function() { props.onOpenBusiness(b.id); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "0.5px solid " + T.sep, cursor: "pointer", fontFamily: UI, display: "flex", alignItems: "center", gap: 12, padding: "13px 16px" }}>
                  <CatBadge icon={b.icon || "briefcase"} color={b.color || "#8970C6"} size={36} soft={true} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: T.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                    <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 1 }}>Business</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, flexShrink: 0 }}>{dollars(businessCash(b))}</span>
                </button>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: T.orangeDim }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.ink2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{bizAccts.length > 0 ? "Total set aside" : tr("totalSavings")}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: T.orange, letterSpacing: "-0.02em" }}>{dollars(savTotal + bizTotal)}</span>
            </div>
          </Card>
        )}
      </div>

      {budgetRows.length > 0 && (
        <div style={{ animation: "rcFadeUp 0.6s ease 0.12s both" }}>
          <div style={{ padding: "0 2px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: T.orange, flexShrink: 0 }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{tr("budgets")}</span>
            </div>
            <span style={{ fontSize: 12, color: T.ink3 }}>{budgetRows.filter(function(b){return b.over;}).length > 0 ? budgetRows.filter(function(b){return b.over;}).length + " " + tr("overLimit") : tr("onTrack")}</span>
          </div>
          <Card style={{ marginBottom: 20, overflow: "hidden" }}>
            {budgetRows.map(function(b, i) {
              return (
                <div key={b.cat.id || i} style={{ padding: "13px 16px", borderBottom: i < budgetRows.length-1 ? "0.5px solid " + T.sep : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
                    <CatBadge icon={b.cat.icon} color={b.cat.color} size={32} soft={true} />
                    <span style={{ flex: 1, fontSize: 14.5, color: T.ink, fontWeight: 600 }}>{b.cat.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: b.over ? T.red : T.ink2 }}>{b.pct}%</span>
                  </div>
                  <ProgressBar value={b.spent} max={b.limit} color={b.over ? T.red : b.cat.color} h={6} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: b.over ? T.red : T.ink3 }}>{dollars(b.spent) + " " + tr("spentLabel")}</span>
                    <span style={{ fontSize: 11, color: T.ink3 }}>{"of " + dollars(b.limit)}</span>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {goals.length > 0 && (
        <div style={{ animation: "rcFadeUp 0.6s ease 0.15s both" }}>
          <div style={{ padding: "0 2px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: T.orange, flexShrink: 0 }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{tr("goals")}</span>
            </div>
            <span style={{ fontSize: 12, color: T.ink3 }}>{goals.filter(function(g){return g.saved>=g.target;}).length + "/" + goals.length + " " + tr("complete")}</span>
          </div>
          <Card style={{ marginBottom: 20, overflow: "hidden" }}>
            {goals.map(function(g, i) {
              var pct = Math.min(100, Math.round((g.saved / g.target) * 100));
              var done = g.saved >= g.target;
              return (
                <div key={g.id} style={{ padding: "14px 18px", borderBottom: i < goals.length-1 ? "0.5px solid " + T.sep : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 15, color: T.ink, fontWeight: 600 }}>{g.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {done && <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: T.greenDim, borderRadius: 20, padding: "2px 8px" }}>DONE</span>}
                      <span style={{ fontSize: 14, fontWeight: 700, color: done ? T.green : T.orange }}>{pct}%</span>
                    </div>
                  </div>
                  <ProgressBar value={g.saved} max={g.target} color={done ? T.green : T.orange} h={5} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: T.ink3 }}>{dollars(g.saved) + " " + tr("savedLabel")}</span>
                    <span style={{ fontSize: 11, color: T.ink3, fontWeight: 500 }}>{dollars(g.target - g.saved) + " " + tr("toGo")}</span>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {recent.length > 0 && (
        <div style={{ animation: "rcFadeUp 0.6s ease 0.18s both" }}>
          <div style={{ padding: "0 2px 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: T.orange, flexShrink: 0 }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{tr("recent")}</span>
          </div>
          <Card style={{ overflow: "hidden", marginBottom: 8 }}>
            {recent.map(function(t, i) {
              var c = resolveCat(cats, t);
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < recent.length-1 ? "0.5px solid " + T.sep : "none" }}>
                  <CatBadge icon={t.type === "income" ? "up" : c.icon} color={t.type === "income" ? T.green : c.color} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: T.ink, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: T.ink3, marginTop: 1 }}>{t.type === "income" ? tr("income") : c.name} {"  "}{t.date}{t.origCur && t.origCur !== _currency.sym ? "  -  " + fmtCur(t.origCur, t.origAmount) : ""}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: t.type === "income" ? T.green : T.ink, flexShrink: 0 }}>
                    {t.type === "income" ? "+" : "-"}{dollars(t.amount)}
                  </span>
                </div>
              );
            })}
          </Card>
        </div>
      )}

    </div>
  );
}

function dateLabel(date) {
  var today = new Date().toISOString().slice(0, 10);
  var yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (date === today) return tr("today");
  if (date === yest) return tr("yesterday");
  var localeMap = { en: "en-US", he: "he-IL", es: "es-ES", fr: "fr-FR", ar: "ar-SA", ru: "ru-RU", de: "de-DE", pt: "pt-BR" };
  var locale = localeMap[_lang.code] || "en-US";
  var d = new Date(date + "T12:00:00");
  return d.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" });
}

// ===== CSV IMPORT =====
// Stepping stone toward bank sync: let users upload a bank/card statement
// (CSV) instead of hand-logging. No credentials, no third party - the user
// hands us a file they already downloaded. See ROADMAP.md Tier 1 #3.

function pad2(n) { n = String(n); return n.length < 2 ? "0" + n : n; }

// Split CSV text into rows of cells. Auto-detects the delimiter (comma,
// semicolon, or tab) and respects double-quoted fields with escaped quotes.
function parseCSV(text) {
  text = (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  var firstLine = text.split("\n")[0] || "";
  var counts = { ",": (firstLine.match(/,/g) || []).length, ";": (firstLine.match(/;/g) || []).length, "\t": (firstLine.match(/\t/g) || []).length };
  var delim = ","; var best = -1;
  for (var d in counts) { if (counts[d] > best) { best = counts[d]; delim = d; } }
  var rows = [];
  var lines = text.split("\n").filter(function(l) { return l.trim() !== ""; });
  lines.forEach(function(line) {
    var cells = [], cur = "", inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQ) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === delim) { cells.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    cells.push(cur);
    rows.push(cells.map(function(c) { return c.trim(); }));
  });
  return rows;
}

// Guess which columns hold the date, amount, and description.
function sniffMap(rows, hasHeader) {
  var map = { date: -1, amount: -1, desc: -1, debit: -1, credit: -1 };
  if (!rows.length) return map;
  if (hasHeader) {
    rows[0].forEach(function(hRaw, i) {
      var h = (hRaw || "").toLowerCase();
      if (map.date < 0 && /date|time|posted/.test(h)) map.date = i;
      // Separate money-out / money-in columns (common in real bank exports).
      if (map.debit < 0 && /(debit|withdraw|paid out|money out|spent|outflow)/.test(h) && !/credit|deposit/.test(h)) map.debit = i;
      if (map.credit < 0 && /(credit|deposit|paid in|money in|received|inflow)/.test(h) && !/debit|withdraw/.test(h)) map.credit = i;
      // Single signed-amount column - only if it isn't a debit/credit column.
      if (map.amount < 0 && /(amount|value|sum|total|paid)/.test(h) && !/(debit|credit|deposit|withdraw)/.test(h)) map.amount = i;
      if (map.desc < 0 && /desc|payee|name|memo|detail|narration|merchant|reference|transaction/.test(h)) map.desc = i;
    });
  }
  var hasSplit = map.debit >= 0 || map.credit >= 0;
  var sample = rows.slice(hasHeader ? 1 : 0).slice(0, 6);
  var ncol = rows[0].length;
  for (var c = 0; c < ncol; c++) {
    if (c === map.date || c === map.amount || c === map.desc || c === map.debit || c === map.credit) continue;
    var vals = sample.map(function(r) { return r[c] || ""; });
    var nonEmpty = vals.filter(function(v) { return v !== ""; });
    if (!nonEmpty.length) continue;
    var dateHits = nonEmpty.filter(function(v) { return !isNaN(Date.parse(v)) || /\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}/.test(v); }).length;
    var numHits = nonEmpty.filter(function(v) { return !isNaN(parseFloat(v.replace(/[^0-9.\-]/g, ""))) && /\d/.test(v); }).length;
    if (map.date < 0 && dateHits >= Math.ceil(nonEmpty.length / 2)) { map.date = c; continue; }
    if (!hasSplit && map.amount < 0 && numHits >= Math.ceil(nonEmpty.length / 2)) { map.amount = c; continue; }
  }
  if (map.desc < 0) {
    var bestLen = 0, bestCol = -1;
    for (var c2 = 0; c2 < ncol; c2++) {
      if (c2 === map.date || c2 === map.amount) continue;
      var avg = sample.reduce(function(s, r) { return s + ((r[c2] || "").length); }, 0) / (sample.length || 1);
      if (avg > bestLen) { bestLen = avg; bestCol = c2; }
    }
    map.desc = bestCol;
  }
  return map;
}

// Parse a date cell to ISO yyyy-mm-dd. preferDMY decides ambiguous d/m vs m/d.
function parseImportDate(s, preferDMY) {
  s = (s || "").trim();
  if (!s) return "";
  var iso = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (iso) return iso[1] + "-" + pad2(iso[2]) + "-" + pad2(iso[3]);
  var parts = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (parts) {
    var a = parseInt(parts[1], 10), b = parseInt(parts[2], 10), y = parseInt(parts[3], 10);
    if (y < 100) y += 2000;
    var day, mon;
    if (a > 12) { day = a; mon = b; }
    else if (b > 12) { mon = a; day = b; }
    else if (preferDMY) { day = a; mon = b; }
    else { mon = a; day = b; }
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) return y + "-" + pad2(mon) + "-" + pad2(day);
  }
  var t = Date.parse(s);
  if (!isNaN(t)) { var dt = new Date(t); return dt.getFullYear() + "-" + pad2(dt.getMonth() + 1) + "-" + pad2(dt.getDate()); }
  return "";
}

// Parse an amount cell to a signed number. Handles currency symbols, thousands
// separators, decimal commas (European), and parentheses-for-negative.
function parseImportAmount(s) {
  s = (s || "").trim();
  if (!s) return NaN;
  var neg = /^\(.*\)$/.test(s) || s.indexOf("-") !== -1;
  var cleaned = s.replace(/[^0-9.,]/g, "");
  var lastComma = cleaned.lastIndexOf(",");
  var lastDot = cleaned.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    // Both present - the LATER separator is the decimal one.
    if (lastComma > lastDot) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    else cleaned = cleaned.replace(/,/g, "");
  } else if (lastComma !== -1) {
    // Only commas: decimal comma if 1-2 trailing digits, else thousands.
    cleaned = /,(\d{1,2})$/.test(cleaned) ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  }
  var n = parseFloat(cleaned);
  if (isNaN(n)) return NaN;
  return neg ? -Math.abs(n) : Math.abs(n);
}

var IMPORT_CAT_KEYWORDS = {
  Food: ["grocer", "restaurant", "cafe", "coffee", "tea", "lunch", "dinner", "breakfast", "brunch", "snack", "starbuck", "mcdonald", "uber eats", "doordash", "grubhub", "food", "pizza", "burger", "supermarket", "deli", "bakery", "kfc", "subway", "chipotle"],
  Transport: ["uber", "lyft", "bolt", "grab", "ola", "cab", "gas ", "fuel", "shell", "chevron", "exxon", "transit", "metro", "train", "parking", "taxi", " bus", "toll", "petrol", "diesel"],
  Housing: ["rent", "mortgage", "landlord", "hoa", "property", "electric", "water bill", "internet", "comcast", "verizon", "utility", "power co", "heating", "gas bill"],
  Health: ["pharmacy", "cvs", "walgreen", "doctor", "clinic", "hospital", "dental", "gym", "fitness", "medical", "chemist", "drug"],
  Entertainment: ["netflix", "spotify", "hulu", "disney", "cinema", "movie", "steam", "game", "concert", "theater", "hbo", "youtube", "playstation", "xbox", "prime video"],
  Shopping: ["amazon", "walmart", "target", "store", "mall", "clothing", "nike", "apple.com", "ikea", "ebay", "etsy", "best buy", "aliexpress", "shein", "zara", "h&m"],
  Travel: ["airline", "flight", "hotel", "airbnb", "booking", "expedia", "delta", "marriott", "hilton"],
  Investments: ["vanguard", "fidelity", "schwab", "robinhood", "coinbase", "brokerage", "invest"],
  Salary: ["payroll", "salary", "direct deposit", "paycheck", "wages"]
};

// Match a label/description against the built-in keyword map. Returns the
// category NAME (e.g. "Food") or "" when nothing fits - no "Other" fallback,
// so callers can decide whether an empty result is worth showing.
function keywordCatName(desc) {
  var d = (desc || "").toLowerCase();
  for (var name in IMPORT_CAT_KEYWORDS) {
    var kws = IMPORT_CAT_KEYWORDS[name];
    for (var i = 0; i < kws.length; i++) {
      if (d.indexOf(kws[i]) !== -1) return name;
    }
  }
  return "";
}

function guessImportCatId(desc, cats) {
  var name = keywordCatName(desc);
  if (name) { var c = catByName(cats, name); if (c) return c.id; }
  var other = catByName(cats, "Other") || cats[0];
  return other ? other.id : "";
}

// Return the highest-count key from a {key: count} tally, or "".
function topKey(tally) {
  var best = "", bestN = 0;
  for (var k in tally) { if (tally[k] > bestN) { bestN = tally[k]; best = k; } }
  return best;
}

// Suggest the best-fitting category for a freshly typed label. Learns from the
// user's OWN history first (which category they previously used for the same /
// a similar label), then falls back to the popular keyword map. Returns a catId
// or "" when there's nothing confident to suggest.
function suggestCatId(label, txList, cats) {
  var q = (label || "").trim().toLowerCase();
  if (q.length < 2) return "";
  var list = txList || [];
  var exact = {}, partial = {};
  var qWords = q.split(/\s+/).filter(function(w) { return w.length >= 3; });
  for (var i = 0; i < list.length; i++) {
    var t = list[i];
    if (!t || !t.catId || t.opening || t.transfer) continue;
    var tl = (t.label || "").trim().toLowerCase();
    if (!tl) continue;
    if (tl === q) { exact[t.catId] = (exact[t.catId] || 0) + 1; continue; }
    var hit = tl.indexOf(q) !== -1;
    if (!hit) {
      for (var w = 0; w < qWords.length; w++) { if (tl.indexOf(qWords[w]) !== -1) { hit = true; break; } }
    }
    if (hit) partial[t.catId] = (partial[t.catId] || 0) + 1;
  }
  var best = topKey(exact) || topKey(partial);
  if (best && catById(cats, best)) return best;
  var name = keywordCatName(q);
  if (name) { var c = catByName(cats, name); if (c) return c.id; }
  return "";
}

// Identity key for a transaction, used to skip rows already in the app and
// duplicates within the same file. type + date + abs amount + first chars of label.
function dupKey(type, date, amount, label) {
  return (type || "") + "|" + (date || "") + "|" + Number(amount || 0).toFixed(2) + "|" + (label || "").toLowerCase().trim().slice(0, 40);
}

// ===== FOUND MONEY ============================================================
// A deterministic audit of the user's OWN transactions. Every figure here is
// computed from real tx data (never invented by the model), so the numbers can
// be trusted - Richard only narrates and drafts on top of these findings.

// Merchant fragments that are almost always recurring subscriptions/memberships.
// A strong recurring hint even from a single charge. Kept deliberately specific
// to avoid flagging ordinary retail (e.g. "amazon prime" not bare "amazon").
var SUBSCRIPTION_HINTS = ["netflix", "spotify", "hulu", "disney", "hbo", "youtube premium", "playstation plus", "xbox game", "icloud", "dropbox", "adobe", "patreon", "audible", "amazon prime", "prime video", "paramount", "peacock", "crunchyroll", "canva", "chatgpt", "midjourney", "membership", "gym", "fitness", "planet fitness"];

// Collapse a label to a stable merchant key so "NETFLIX #1123", "Netflix.com"
// and "NETFLIX" group together.
function normalizeMerchant(label) {
  var s = (label || "").toLowerCase();
  s = s.replace(/[#*].*$/, " ");                 // drop store/ref after # or *
  s = s.replace(/\d{2,}/g, " ");                 // drop long digit runs (ids/dates)
  s = s.replace(/[^a-z0-9&]+/g, " ");            // punctuation -> space
  s = s.replace(/\b(inc|llc|ltd|co|com|www|the|payment|pmt|recurring|autopay|pos|purchase|debit|card)\b/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

function looksLikeSubscription(label) {
  var s = (label || "").toLowerCase();
  for (var i = 0; i < SUBSCRIPTION_HINTS.length; i++) { if (s.indexOf(SUBSCRIPTION_HINTS[i]) !== -1) return true; }
  return false;
}

// A real outflow worth auditing: not opening balance, internal transfer, future
// dated, or pending.
function isAuditableExpense(t, todayISO) {
  return !!(t && t.type === "expense" && !isOpening(t) && !isTransfer(t) && !t.pending && (!t.date || t.date <= todayISO));
}

function fmDaysBetween(a, b) {
  return Math.abs((new Date(a + "T12:00:00") - new Date(b + "T12:00:00")) / 86400000);
}
function fmMedian(nums) {
  if (!nums.length) return 0;
  var s = nums.slice().sort(function(a, b) { return a - b; });
  var mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Group auditable expenses by normalized merchant, newest charge first.
function groupByMerchant(tx, todayISO) {
  var groups = {};
  (tx || []).forEach(function(t) {
    if (!isAuditableExpense(t, todayISO)) return;
    var key = normalizeMerchant(t.label);
    if (!key) return;
    (groups[key] = groups[key] || []).push(t);
  });
  Object.keys(groups).forEach(function(k) {
    groups[k].sort(function(a, b) { return (b.date || "").localeCompare(a.date || ""); });
  });
  return groups;
}

// A merchant is "recurring" when its charges land on a roughly monthly cadence,
// repeat the same amount across months, are user-flagged repeat, or the name is
// a known subscription brand.
function detectRecurring(tx, cats) {
  var todayISO = new Date().toISOString().slice(0, 10);
  var groups = groupByMerchant(tx, todayISO);
  var out = [];
  Object.keys(groups).forEach(function(key) {
    var items = groups[key];
    var label = items[0].label || key;
    var amounts = items.map(function(t) { return t.amount; });
    var monthlyAmt = fmMedian(amounts);
    if (monthlyAmt <= 0) return;

    var gaps = [];
    for (var i = 0; i < items.length - 1; i++) gaps.push(fmDaysBetween(items[i].date, items[i + 1].date));
    var medGap = fmMedian(gaps);
    var monthlyCadence = items.length >= 3 && medGap >= 24 && medGap <= 35;

    var months = {};
    items.forEach(function(t) { months[(t.date || "").slice(0, 7)] = true; });
    var nearMedian = items.filter(function(t) { return Math.abs(t.amount - monthlyAmt) <= monthlyAmt * 0.05 + 0.01; }).length;
    var sameAmtAcrossMonths = Object.keys(months).length >= 2 && nearMedian >= 2;

    var flaggedMonthly = items.some(function(t) { return t.repeat === "monthly"; });
    var flaggedWeekly = items.some(function(t) { return t.repeat === "weekly"; });
    var brand = looksLikeSubscription(label);
    var consistent = nearMedian === items.length;   // every charge ~the same

    var isRecurring = monthlyCadence || sameAmtAcrossMonths || flaggedMonthly || flaggedWeekly || (brand && consistent);
    if (!isRecurring) return;

    var cadence = flaggedWeekly ? "weekly" : "monthly";
    var perMonth = cadence === "weekly" ? monthlyAmt * 4.33 : monthlyAmt;
    var c = catById(cats, items[0].catId);
    out.push({
      key: key, merchant: label, amount: round2(monthlyAmt), cadence: cadence,
      count: items.length, lastDate: items[0].date, catId: items[0].catId,
      categoryName: (c && c.name) || items[0].category || "", annual: round2(perMonth * 12),
      items: items
    });
  });
  out.sort(function(a, b) { return b.annual - a.annual; });
  return out;
}

// Within a recurring group, a sustained jump in the charge amount.
function detectPriceHikes(recurringGroups) {
  var out = [];
  (recurringGroups || []).forEach(function(g) {
    var items = g.items;
    if (!items || items.length < 3) return;
    var newest = items[0].amount;
    var base = fmMedian(items.slice(1).map(function(t) { return t.amount; }));
    if (base <= 0) return;
    if (newest >= base * 1.1 && (newest - base) >= 0.5) {
      out.push({
        key: "hike-" + g.key, merchant: g.merchant, oldAmt: round2(base), newAmt: round2(newest),
        deltaPct: Math.round(((newest - base) / base) * 100), annualImpact: round2((newest - base) * 12),
        catId: g.catId, categoryName: g.categoryName
      });
    }
  });
  return out;
}

// Same merchant + same amount within 3 days => possible double charge.
function detectDuplicates(tx) {
  var todayISO = new Date().toISOString().slice(0, 10);
  var byKey = {};
  (tx || []).forEach(function(t) {
    if (!isAuditableExpense(t, todayISO)) return;
    var k = normalizeMerchant(t.label) + "|" + Math.round(t.amount * 100);
    (byKey[k] = byKey[k] || []).push(t);
  });
  var out = [];
  Object.keys(byKey).forEach(function(k) {
    var arr = byKey[k].sort(function(a, b) { return (a.date || "").localeCompare(b.date || ""); });
    for (var i = 0; i < arr.length - 1; i++) {
      if (fmDaysBetween(arr[i].date, arr[i + 1].date) <= 3) {
        out.push({
          key: "dup-" + dupKey(arr[i + 1].type, arr[i + 1].date, arr[i + 1].amount, arr[i + 1].label),
          merchant: arr[i].label, amount: round2(arr[i + 1].amount), dates: [arr[i].date, arr[i + 1].date],
          catId: arr[i + 1].catId, categoryName: arr[i + 1].category || ""
        });
      }
    }
  });
  return out;
}

// A category whose spend this month is well above its trailing average.
function detectCategoryJumps(tx, cats) {
  var todayISO = new Date().toISOString().slice(0, 10);
  var ym = todayISO.slice(0, 7);
  function monthKey(offset) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - offset); return d.toISOString().slice(0, 7); }
  var priorMonths = [monthKey(1), monthKey(2), monthKey(3)];
  var out = [];
  (cats || []).forEach(function(c) {
    function catMonth(m) {
      return (tx || []).filter(function(t) { return isAuditableExpense(t, todayISO) && (t.date || "").slice(0, 7) === m && (t.catId === c.id || t.category === c.name); }).reduce(function(s, t) { return s + t.amount; }, 0);
    }
    var thisM = catMonth(ym);
    if (thisM < 1) return;
    var priors = priorMonths.map(catMonth).filter(function(v) { return v > 0; });
    if (priors.length < 2) return;
    var avg = priors.reduce(function(s, v) { return s + v; }, 0) / priors.length;
    if (avg <= 0 || thisM < avg * 1.4 || (thisM - avg) < 1) return;
    out.push({
      key: "jump-" + c.id + "-" + ym, category: c.name, catId: c.id,
      thisMonth: round2(thisM), avg: round2(avg), pct: Math.round(((thisM - avg) / avg) * 100), extra: round2(thisM - avg)
    });
  });
  out.sort(function(a, b) { return b.extra - a.extra; });
  return out;
}

// Unify all detectors into one ranked list. Each finding has a STABLE id (so a
// user's dismiss/keep persists across sessions) and an `annual` figure used for
// ranking and the "found you $X" math.
function findMoney(tx, cats) {
  var findings = [];
  var recurring = detectRecurring(tx, cats);
  recurring.forEach(function(g) {
    findings.push({
      id: "rec:" + g.key, type: "recurring", title: g.merchant,
      subtitle: dollars(g.amount) + "/" + (g.cadence === "weekly" ? "wk" : "mo") + " - " + g.count + " charge" + (g.count === 1 ? "" : "s") + ", last " + g.lastDate,
      amount: g.amount, annual: g.annual, merchant: g.merchant, catId: g.catId, categoryName: g.categoryName, meta: g
    });
  });
  detectPriceHikes(recurring).forEach(function(h) {
    findings.push({
      id: h.key, type: "hike", title: h.merchant + " went up " + h.deltaPct + "%",
      subtitle: dollars(h.oldAmt) + " to " + dollars(h.newAmt) + " - " + dollars(h.annualImpact) + "/yr more",
      amount: round2(h.newAmt - h.oldAmt), annual: h.annualImpact, merchant: h.merchant, catId: h.catId, categoryName: h.categoryName, meta: h
    });
  });
  detectDuplicates(tx).forEach(function(d) {
    findings.push({
      id: d.key, type: "duplicate", title: "Possible double charge - " + d.merchant,
      subtitle: dollars(d.amount) + " twice (" + d.dates[0] + " and " + d.dates[1] + ")",
      amount: d.amount, annual: 0, merchant: d.merchant, catId: d.catId, categoryName: d.categoryName, meta: d
    });
  });
  detectCategoryJumps(tx, cats).forEach(function(j) {
    findings.push({
      id: j.key, type: "jump", title: j.category + " jumped " + j.pct + "% this month",
      subtitle: dollars(j.thisMonth) + " vs " + dollars(j.avg) + " avg - " + dollars(j.extra) + " over",
      amount: j.extra, annual: 0, merchant: "", catId: j.catId, categoryName: j.category, meta: j
    });
  });
  // Annualized recoverable (recurring + hikes) first, then one-off informational.
  findings.sort(function(a, b) {
    if ((b.annual || 0) !== (a.annual || 0)) return (b.annual || 0) - (a.annual || 0);
    return (b.amount || 0) - (a.amount || 0);
  });
  return findings;
}

function ImportSheet(props) {
  var cats = props.categories || [];
  var _raw = useState(""); var raw = _raw[0]; var setRaw = _raw[1];
  var _step = useState("paste"); var step = _step[0]; var setStep = _step[1];
  var _rows = useState([]); var rows = _rows[0]; var setRows = _rows[1];
  var _hdr = useState(true); var hasHeader = _hdr[0]; var setHasHeader = _hdr[1];
  var _map = useState({ date: -1, amount: -1, desc: -1, debit: -1, credit: -1 }); var map = _map[0]; var setMap = _map[1];
  var _split = useState(false); var splitAmt = _split[0]; var setSplitAmt = _split[1];
  var _dmy = useState(true); var preferDMY = _dmy[0]; var setPreferDMY = _dmy[1];
  var _allExp = useState(false); var allExpenses = _allExp[0]; var setAllExpenses = _allExp[1];
  var _built = useState([]); var built = _built[0]; var setBuilt = _built[1];
  var _dup = useState(0); var dupes = _dup[0]; var setDupes = _dup[1];
  var _err = useState(""); var err = _err[0]; var setErr = _err[1];

  function reset() {
    setRaw(""); setStep("paste"); setRows([]); setHasHeader(true);
    setMap({ date: -1, amount: -1, desc: -1, debit: -1, credit: -1 }); setSplitAmt(false); setPreferDMY(true); setAllExpenses(false); setBuilt([]); setDupes(0); setErr("");
  }
  function close() { reset(); props.onClose(); }

  function handleFile(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function(ev) { setRaw((ev.target && ev.target.result) || ""); };
    reader.readAsText(f);
  }

  function goMap() {
    setErr("");
    var parsed = parseCSV(raw);
    if (parsed.length < 1 || parsed[0].length < 2) { setErr("Could not read any rows. Paste CSV text or choose a .csv file."); return; }
    var detected = sniffMap(parsed, true);
    setRows(parsed); setMap(detected); setSplitAmt(detected.debit >= 0 || detected.credit >= 0); setStep("map");
  }

  function buildTxs() {
    var dataRows = hasHeader ? rows.slice(1) : rows;
    var out = []; var skipped = 0;
    var base = Date.now();
    var today = new Date().toISOString().slice(0, 10);
    // Seed the seen-set with what's already in the app so re-importing the same
    // statement doesn't double-count, then keep deduping within the file itself.
    var seen = {};
    (props.tx || []).forEach(function(t) { seen[dupKey(t.type, t.date, t.amount, t.label)] = true; });
    dataRows.forEach(function(r, i) {
      var amt;
      if (splitAmt) {
        var dv = map.debit >= 0 ? parseImportAmount(r[map.debit]) : NaN;
        var cv = map.credit >= 0 ? parseImportAmount(r[map.credit]) : NaN;
        if (!isNaN(dv) && dv !== 0) amt = -Math.abs(dv);
        else if (!isNaN(cv) && cv !== 0) amt = Math.abs(cv);
        else return;
      } else {
        amt = parseImportAmount(map.amount >= 0 ? r[map.amount] : "");
      }
      if (isNaN(amt) || amt === 0) return;
      var desc = (map.desc >= 0 ? r[map.desc] : "") || "Imported";
      var dateStr = parseImportDate(map.date >= 0 ? r[map.date] : "", preferDMY) || today;
      var type = allExpenses ? "expense" : (amt < 0 ? "expense" : "income");
      var label = desc.slice(0, 60);
      var amount = round2(Math.abs(amt));
      var key = dupKey(type, dateStr, amount, label);
      if (seen[key]) { skipped++; return; }
      seen[key] = true;
      // Learn from the user's own history first, then keyword map; income still
      // prefers Salary when present.
      var catId = type === "income"
        ? ((catByName(cats, "Salary") || {}).id || suggestCatId(desc, props.tx, cats) || guessImportCatId(desc, cats))
        : (suggestCatId(desc, props.tx, cats) || guessImportCatId(desc, cats));
      var c = catById(cats, catId) || { id: "", name: "Other" };
      out.push({ type: type, amount: amount, label: label, catId: c.id, category: c.name, date: dateStr, id: base + i, repeat: "none", pending: false });
    });
    return { txs: out, skipped: skipped };
  }

  function goPreview() {
    setErr("");
    if (splitAmt) {
      if (map.debit < 0 && map.credit < 0) { setErr("Pick your money-in and/or money-out column."); return; }
    } else if (map.amount < 0) {
      setErr("Pick which column holds the amount.");
      return;
    }
    var res = buildTxs();
    if (!res.txs.length) {
      setErr(res.skipped ? "Every row is already in your transactions - nothing new to import." : "No valid transactions found. Check your column choices.");
      return;
    }
    setBuilt(res.txs); setDupes(res.skipped); setStep("preview");
  }

  function doImport() {
    props.onImport(built);
    close();
  }

  var selStyle = { width: "100%", padding: "9px 11px", borderRadius: 11, border: "1.5px solid " + T.sep, background: T.card, fontSize: 14, fontFamily: UI, color: T.ink, outline: "none", marginTop: 4 };
  var lblStyle = { fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em" };
  var colOptions = rows.length ? rows[0].map(function(h, i) { return { i: i, name: hasHeader ? (h || ("Column " + (i + 1))) : ("Column " + (i + 1)) }; }) : [];

  function colSelect(field, label) {
    return (
      <div style={{ marginBottom: 9 }}>
        <span style={lblStyle}>{label}</span>
        <select value={map[field]} onChange={function(e) { var v = parseInt(e.target.value, 10); setMap(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[field] = v; return n; }); }} style={selStyle}>
          <option value={-1}>{(field === "desc" || field === "debit" || field === "credit") ? "(none)" : "Choose column..."}</option>
          {colOptions.map(function(o) { return <option key={o.i} value={o.i}>{o.name}</option>; })}
        </select>
      </div>
    );
  }

  var totalIn = built.filter(function(t) { return t.type === "income"; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var totalOut = built.filter(function(t) { return t.type === "expense"; }).reduce(function(s, t) { return s + t.amount; }, 0);

  return (
    <Overlay open={props.open} onClose={close} title="Import from CSV">
      {step === "paste" && (
        <div>
          <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5, marginBottom: 12 }}>
            Export a statement from your bank or card as CSV, then drop it here. Your data stays on your device - nothing is sent to your bank.
          </div>
          <label style={{ display: "block", width: "100%", textAlign: "center", padding: "13px 0", borderRadius: 13, border: "1.5px dashed " + T.orange, background: T.orangeDim, color: T.orange, fontSize: 14, fontWeight: 700, fontFamily: UI, cursor: "pointer", marginBottom: 10 }}>
            Choose a .csv file
            <input type="file" accept=".csv,text/csv,text/plain" onChange={handleFile} style={{ display: "none" }} />
          </label>
          <div style={{ fontSize: 11, color: T.ink3, textAlign: "center", marginBottom: 10 }}>or paste the CSV text below</div>
          <textarea value={raw} onChange={function(e) { setRaw(e.target.value); }} rows={6}
            placeholder={"Date,Description,Amount\n2026-06-01,Grocery Store,-54.20\n2026-06-02,Salary,3000"}
            style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 13, padding: "11px 13px", fontSize: 13, fontFamily: "monospace", color: T.ink, outline: "none", resize: "vertical", marginBottom: 10 }} />
          {err && <div style={{ fontSize: 13, color: T.red, marginBottom: 10 }}>{err}</div>}
          <BigBtn label="Next: map columns" onPress={goMap} disabled={!raw.trim()} />
        </div>
      )}

      {step === "map" && (
        <div>
          <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5, marginBottom: 12 }}>
            We guessed your columns - check them below.
          </div>
          <button onClick={function() { setHasHeader(!hasHeader); setMap(sniffMap(rows, !hasHeader)); }}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 11, border: "none", cursor: "pointer", marginBottom: 10, background: hasHeader ? T.orangeDim : "rgba(0,0,0,0.04)", fontFamily: UI }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: hasHeader ? T.orange : T.ink2 }}>First row is a header</span>
            <div style={{ width: 18, height: 18, borderRadius: 6, border: "2px solid " + (hasHeader ? T.orange : T.ink3), background: hasHeader ? T.orange : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {hasHeader && <SVGIcon id="check" size={10} color="#fff" />}
            </div>
          </button>
          {colSelect("date", "Date column")}
          <button onClick={function() { setSplitAmt(!splitAmt); }}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 11, border: "none", cursor: "pointer", marginBottom: 9, background: splitAmt ? T.orangeDim : "rgba(0,0,0,0.04)", fontFamily: UI }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: splitAmt ? T.orange : T.ink2, textAlign: "left", lineHeight: 1.4 }}>Separate money-in / money-out columns<br /><span style={{ fontSize: 11, color: T.ink3 }}>Turn on if your file has two amount columns</span></span>
            <div style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, border: "2px solid " + (splitAmt ? T.orange : T.ink3), background: splitAmt ? T.orange : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {splitAmt && <SVGIcon id="check" size={10} color="#fff" />}
            </div>
          </button>
          {!splitAmt && colSelect("amount", "Amount column")}
          {splitAmt && colSelect("credit", "Money in column")}
          {splitAmt && colSelect("debit", "Money out column")}
          {colSelect("desc", "Description column")}
          <div style={{ marginBottom: 9 }}>
            <span style={lblStyle}>Date format</span>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {[{ k: true, l: "Day first (DD/MM)" }, { k: false, l: "Month first (MM/DD)" }].map(function(o) {
                var on = preferDMY === o.k;
                return <button key={String(o.k)} onClick={function() { setPreferDMY(o.k); }} style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: UI, background: on ? T.orangeDim : "rgba(0,0,0,0.04)", color: on ? T.orange : T.ink3 }}>{o.l}</button>;
              })}
            </div>
          </div>
          <button onClick={function() { setAllExpenses(!allExpenses); }}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 11, border: "none", cursor: "pointer", marginBottom: 10, background: allExpenses ? T.goldDim : "rgba(0,0,0,0.04)", fontFamily: UI }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: allExpenses ? T.gold : T.ink2, textAlign: "left", lineHeight: 1.4 }}>Treat every row as an expense<br /><span style={{ fontSize: 11, color: T.ink3 }}>Turn on if your file lists only spending</span></span>
            <div style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, border: "2px solid " + (allExpenses ? T.gold : T.ink3), background: allExpenses ? T.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {allExpenses && <SVGIcon id="check" size={10} color="#fff" />}
            </div>
          </button>
          {err && <div style={{ fontSize: 13, color: T.red, marginBottom: 10 }}>{err}</div>}
          <BigBtn label="Preview import" onPress={goPreview} />
          <button onClick={function() { setStep("paste"); }} style={{ width: "100%", background: "none", border: "none", color: T.ink3, fontSize: 13, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 8, padding: "5px 0" }}>Back</button>
        </div>
      )}

      {step === "preview" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, background: T.greenDim, borderRadius: 13, padding: "11px 13px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Money In</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.green }}>{dollars(totalIn)}</div>
            </div>
            <div style={{ flex: 1, background: T.orangeDim, borderRadius: 13, padding: "11px 13px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Money Out</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{dollars(totalOut)}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink2, marginBottom: 8 }}>{built.length} transactions ready - first few shown:</div>
          {dupes > 0 && <div style={{ fontSize: 12, color: T.ink3, marginTop: -4, marginBottom: 8 }}>{dupes} duplicate{dupes > 1 ? "s" : ""} already in your app {dupes > 1 ? "were" : "was"} skipped.</div>}
          <div style={{ background: "#fff", borderRadius: 13, overflow: "hidden", marginBottom: 12, border: "1px solid rgba(0,0,0,0.06)" }}>
            {built.slice(0, 8).map(function(t, i) {
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: i < Math.min(built.length, 8) - 1 ? "0.5px solid " + T.sep : "none" }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</span>
                  <span style={{ fontSize: 11, color: T.ink3, flexShrink: 0 }}>{t.category}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: t.type === "income" ? T.green : T.ink }}>{(t.type === "income" ? "+" : "-") + dollars(t.amount)}</span>
                </div>
              );
            })}
          </div>
          {err && <div style={{ fontSize: 13, color: T.red, marginBottom: 10 }}>{err}</div>}
          <BigBtn label={"Import " + built.length + " transaction" + (built.length > 1 ? "s" : "")} onPress={doImport} />
          <button onClick={function() { setStep("map"); }} style={{ width: "100%", background: "none", border: "none", color: T.ink3, fontSize: 13, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 8, padding: "5px 0" }}>Back</button>
        </div>
      )}
    </Overlay>
  );
}

function Activity(props) {
  var cats = props.categories || [];
  var mainSym = _currency.sym;
  var _imp = useState(false); var importOpen = _imp[0]; var setImportOpen = _imp[1];
  var importPrimary = props.entryMethod === "import";
  var blankForm = { type: "expense", amount: "", label: "", catId: (cats[0] || {}).id || "", date: new Date().toISOString().slice(0, 10), repeat: "none", pending: false, cur: mainSym, rate: 1, rateLoading: false, rateFallback: false, shared: false, owner: props.accountKey, savingsDest: "" };
  // shared=true means this goes to the household doc; shared=false stays in user doc
  // owner is the uid of who paid (only relevant on shared txs)
  var _f = useState(blankForm);
  var form = _f[0]; var setForm = _f[1];
  var _et = useState(null);
  var editTx = _et[0]; var setEditTx = _et[1];
  var _ef = useState(blankForm);
  var editForm = _ef[0]; var setEditForm = _ef[1];

  function setField(key, val) {
    setForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }
  function setEditField(key, val) {
    setEditForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }

  function pickCur(sym) {
    setForm(function(prev) {
      var next = {}; for (var k in prev) next[k] = prev[k];
      next.cur = sym; next.rateLoading = sym !== mainSym; next.rateFallback = false;
      if (sym === mainSym) next.rate = 1;
      return next;
    });
    if (sym === mainSym) return;
    fetchRate(sym, mainSym, function(rate, fb) {
      setForm(function(prev) {
        if (prev.cur !== sym) return prev;
        var next = {}; for (var k in prev) next[k] = prev[k];
        next.rate = rate; next.rateLoading = false; next.rateFallback = fb;
        return next;
      });
    });
  }
  function pickEditCur(sym) {
    setEditForm(function(prev) {
      var next = {}; for (var k in prev) next[k] = prev[k];
      next.cur = sym; next.rateLoading = sym !== mainSym; next.rateFallback = false;
      if (sym === mainSym) next.rate = 1;
      return next;
    });
    if (sym === mainSym) return;
    fetchRate(sym, mainSym, function(rate, fb) {
      setEditForm(function(prev) {
        if (prev.cur !== sym) return prev;
        var next = {}; for (var k in prev) next[k] = prev[k];
        next.rate = rate; next.rateLoading = false; next.rateFallback = fb;
        return next;
      });
    });
  }

  var pressTimer = useRef(null);
  function startLongPress(t) {
    pressTimer.current = setTimeout(function() {
      setEditTx(t);
      var hasForeign = t.origCur && t.origCur !== mainSym;
      setEditForm({ type: t.type, amount: String(hasForeign ? t.origAmount : t.amount), label: t.label, catId: t.catId || "", date: t.date, repeat: t.repeat || "none", pending: t.pending || false,
        cur: hasForeign ? t.origCur : mainSym, rate: hasForeign ? (t.rate || fxStaticRate(t.origCur, mainSym)) : 1, rateLoading: false, rateFallback: false, shared: t.shared || false, owner: t.owner || props.accountKey });
      pressTimer.current = null;
    }, 500);
  }
  function cancelLongPress() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }

  function add() {
    if (!form.amount || !form.label) return;
    var c = catById(cats, form.catId) || cats[0] || { id: "", name: "Other" };
    var entered = parseFloat(form.amount);
    var foreign = form.cur && form.cur !== mainSym;
    var rate = foreign ? (form.rate || fxStaticRate(form.cur, mainSym)) : 1;
    var mainAmount = round2(entered * rate);

    var savAcct = form.savingsDest ? (props.savings || []).filter(function(a) { return a.id === form.savingsDest; })[0] : null;
    if (savAcct) {
      var entryKind = form.type === "income" ? "deposit" : "withdraw";
      var entry = { id: Date.now(), kind: entryKind, amount: mainAmount, date: form.date, fromMain: false, label: form.label };
      var nextSav = (props.savings || []).map(function(a) {
        if (a.id !== savAcct.id) return a;
        var n = {}; for (var k in a) n[k] = a[k];
        n.entries = (a.entries || []).concat([entry]);
        return n;
      });
      var transferType = form.type === "income" ? "income" : "expense";
      var transferLabel = (form.type === "income" ? "← " : "→ ") + savAcct.name;
      var transferTx = { id: Date.now() + 1, type: transferType, amount: mainAmount, label: transferLabel, catId: "savings-transfer", category: "Savings transfer", transfer: true, date: form.date, repeat: "none", pending: false };
      props.onSavingsMove(props.tx.concat([transferTx]), nextSav);
    } else {
      var tx = { type: form.type, amount: mainAmount, label: form.label, catId: c.id, category: c.name, date: form.date, id: Date.now(), repeat: form.repeat, pending: form.pending, shared: form.shared, owner: form.owner };
      if (foreign) { tx.origAmount = entered; tx.origCur = form.cur; tx.rate = rate; }
      props.onSaveTx(props.tx.concat([tx]));
    }
    setForm(blankForm);
    props.setSheetOpen(false);
  }

  function saveEdit() {
    if (!editForm.amount || !editForm.label || !editTx) return;
    var c = catById(cats, editForm.catId) || cats[0] || { id: "", name: "Other" };
    var entered = parseFloat(editForm.amount);
    var foreign = editForm.cur && editForm.cur !== mainSym;
    var rate = foreign ? (editForm.rate || fxStaticRate(editForm.cur, mainSym)) : 1;
    var mainAmount = round2(entered * rate);
    props.onSaveTx(props.tx.map(function(t) {
      if (t.id !== editTx.id) return t;
      var nt = { id: t.id, type: editForm.type, amount: mainAmount, label: editForm.label, catId: c.id, category: c.name, date: editForm.date, repeat: editForm.repeat, pending: editForm.pending, shared: editForm.shared || false, owner: editForm.owner || t.owner || props.accountKey };
      if (foreign) { nt.origAmount = entered; nt.origCur = editForm.cur; nt.rate = rate; }
      return nt;
    }));
    setEditTx(null);
  }

  // Internal savings transfers are managed in the Savings screen, not here - keep
  // them out of the ledger so they can't be edited into a desync with their pot.
  var sorted = props.tx.filter(function(t) { return !isTransfer(t); }).sort(function(a, b) { return b.date.localeCompare(a.date); });
  var groups = {};
  sorted.forEach(function(t) {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });
  var dates = Object.keys(groups).sort(function(a, b) { return b.localeCompare(a); });

  var totalIn  = props.tx.filter(function(t){return t.type==="income" && !isTransfer(t);}).reduce(function(s,t){return s+t.amount;},0);
  var totalOut = props.tx.filter(function(t){return t.type==="expense" && !isTransfer(t);}).reduce(function(s,t){return s+t.amount;},0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        <button onClick={function() { setImportOpen(true); }} title="Import from CSV"
          style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 14, background: importPrimary ? T.btn : T.card, border: importPrimary ? "none" : "1.5px solid " + T.orangeDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: importPrimary ? "0 4px 14px rgba(137,112,198,0.32)" : "0 2px 10px rgba(0,0,0,0.05)" }}>
          <SVGIcon id="down" size={20} color={importPrimary ? "#fff" : T.orange} />
        </button>
        <button onClick={props.onOpenNotes} title={tr("notes")}
          style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 14, background: T.btn, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(137,112,198,0.32)" }}>
          <SVGIcon id="note" size={20} color="#fff" />
        </button>
      </div>
      <ImportSheet open={importOpen} onClose={function() { setImportOpen(false); }} categories={cats} tx={props.tx}
        onImport={function(txs) { props.onSaveTx(props.tx.concat(txs)); }} />
      <Overlay open={props.sheetOpen} onClose={function() { props.setSheetOpen(false); }} title={tr("newTransaction")}>
        <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
          {["expense","income"].map(function(opt) {
            var on = form.type === opt;
            return (
              <button key={opt} onClick={function() { setField("type", opt); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: UI,
                  background: on ? (opt === "income" ? T.greenDim : T.orangeDim) : "rgba(0,0,0,0.04)",
                  color: on ? (opt === "income" ? T.green : T.orange) : T.ink3 }}>
                {opt === "income" ? tr("income") : tr("expense")}
              </button>
            );
          })}
        </div>
        <AmountField value={form.amount} onAmount={function(e) { setField("amount", e.target.value); }} cur={form.cur} onCur={pickCur} mainSym={mainSym} rate={form.rate} rateLoading={form.rateLoading} rateFallback={form.rateFallback} />
        <FormRow label={tr("txLabel")} value={form.label} onChange={function(e) { setField("label", e.target.value); }} placeholder={form.type === "income" ? "Salary, freelance, gift..." : "Groceries, rent, coffee..."} />
        <CatPicker label={tr("category")} categories={cats} value={form.catId} onChange={function(id) { setField("catId", id); }} onManage={props.onManageCategories} />
        {(function() {
          var sid = suggestCatId(form.label, props.tx, cats);
          if (!sid || sid === form.catId) return null;
          var sc = catById(cats, sid);
          if (!sc) return null;
          return (
            <button onClick={function() { setField("catId", sid); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 11, border: "1.5px dashed " + sc.color, background: sc.color + "12", cursor: "pointer", fontFamily: UI, marginTop: -1, marginBottom: 7 }}>
              <CatBadge icon={sc.icon} color={sc.color} size={22} soft={true} />
              <span style={{ flex: 1, minWidth: 0, textAlign: "left", fontSize: 12.5, color: T.ink2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Suggested: <span style={{ fontWeight: 700, color: T.ink }}>{sc.name}</span>
              </span>
              <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: sc.color }}>Use</span>
            </button>
          );
        })()}
        <FormRow label={tr("date")} value={form.date} onChange={function(e) { setField("date", e.target.value); }} type="date" />
        <div style={{ marginBottom: 7 }}>
          <div style={{ fontSize: 10.5, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>{tr("repeat")}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["none","weekly","monthly"].map(function(opt) {
              var on = form.repeat === opt;
              return (
                <button key={opt} onClick={function() { setField("repeat", opt); }}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: UI,
                    background: on ? T.orangeDim : "rgba(0,0,0,0.04)",
                    color: on ? T.orange : T.ink3 }}>
                  {opt === "none" ? tr("once") : opt === "weekly" ? tr("weekly") : tr("monthly")}
                </button>
              );
            })}
          </div>
        </div>
        <button onClick={function() { setField("pending", !form.pending); }}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 11, border: "none", cursor: "pointer", marginBottom: 8,
            background: form.pending ? T.goldDim : "rgba(0,0,0,0.04)", fontFamily: UI }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: form.pending ? T.gold : T.ink2 }}>{tr("markPending")}</span>
          <div style={{ width: 18, height: 18, borderRadius: 6, border: "2px solid " + (form.pending ? T.gold : T.ink3), background: form.pending ? T.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {form.pending && <SVGIcon id="check" size={10} color="#fff" />}
          </div>
        </button>
        {(props.savings || []).length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>Add to</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[{ id: "", name: "Balance" }].concat(props.savings || []).map(function(opt) {
                var sel = form.savingsDest === opt.id;
                var col = opt.color || T.orange;
                return (
                  <button key={opt.id || "bal"} onClick={function() { setField("savingsDest", opt.id); }}
                    style={{ padding: "7px 13px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: sel ? 700 : 500, fontFamily: UI,
                      background: sel ? (opt.id ? col + "22" : T.orangeDim) : "rgba(0,0,0,0.04)",
                      color: sel ? (opt.id ? col : T.orange) : T.ink3 }}>
                    {opt.id ? opt.name : "Balance"}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {props.householdId && (
          <div style={{ marginBottom: 14 }}>
            <button onClick={function() { setField("shared", !form.shared); }}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 11, border: "none", cursor: "pointer", marginBottom: 7,
                background: form.shared ? T.orangeDim : "rgba(0,0,0,0.04)", fontFamily: UI }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: form.shared ? T.orange : T.ink2 }}>Share with partner</span>
              <div style={{ width: 18, height: 18, borderRadius: 6, border: "2px solid " + (form.shared ? T.orange : T.ink3), background: form.shared ? T.orange : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {form.shared && <SVGIcon id="check" size={10} color="#fff" />}
              </div>
            </button>
            {form.shared && props.household && props.household.members && props.household.members.length > 0 && (
              <div style={{ display: "flex", gap: 6, paddingLeft: 0 }}>
                {props.household.members.map(function(m) {
                  var isMe = m.uid === props.accountKey;
                  var sel = form.owner === m.uid;
                  return (
                    <button key={m.uid} onClick={function() { setField("owner", m.uid); }}
                      style={{ flex: 1, padding: "7px 8px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 11, fontWeight: sel ? 700 : 500, fontFamily: UI,
                        background: sel ? T.orangeDim : "rgba(0,0,0,0.04)",
                        color: sel ? T.orange : T.ink3, textAlign: "center" }}>
                      {isMe ? "Me" : (m.name || m.email).split("@")[0]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <BigBtn label={tr("addTransaction")} onPress={add} disabled={!form.amount || !form.label} />
      </Overlay>

      <Overlay open={!!editTx} onClose={function() { setEditTx(null); }} title={tr("editTransaction")}>
        <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
          {["expense","income"].map(function(opt) {
            var on = editForm.type === opt;
            return (
              <button key={opt} onClick={function() { setEditField("type", opt); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: UI,
                  background: on ? (opt === "income" ? T.greenDim : T.orangeDim) : "rgba(0,0,0,0.04)",
                  color: on ? (opt === "income" ? T.green : T.orange) : T.ink3 }}>
                {opt === "income" ? tr("income") : tr("expense")}
              </button>
            );
          })}
        </div>
        <AmountField value={editForm.amount} onAmount={function(e) { setEditField("amount", e.target.value); }} cur={editForm.cur} onCur={pickEditCur} mainSym={mainSym} rate={editForm.rate} rateLoading={editForm.rateLoading} rateFallback={editForm.rateFallback} />
        <FormRow label={tr("txLabel")} value={editForm.label} onChange={function(e) { setEditField("label", e.target.value); }} placeholder={editForm.type === "income" ? "Salary, freelance, gift..." : "Groceries, rent, coffee..."} />
        <CatPicker label={tr("category")} categories={cats} value={editForm.catId} onChange={function(id) { setEditField("catId", id); }} onManage={props.onManageCategories} />
        <FormRow label={tr("date")} value={editForm.date} onChange={function(e) { setEditField("date", e.target.value); }} type="date" />
        <div style={{ marginBottom: 7 }}>
          <div style={{ fontSize: 10.5, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>{tr("repeat")}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["none","weekly","monthly"].map(function(opt) {
              var on = editForm.repeat === opt;
              return (
                <button key={opt} onClick={function() { setEditField("repeat", opt); }}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: UI,
                    background: on ? T.orangeDim : "rgba(0,0,0,0.04)",
                    color: on ? T.orange : T.ink3 }}>
                  {opt === "none" ? tr("once") : opt === "weekly" ? tr("weekly") : tr("monthly")}
                </button>
              );
            })}
          </div>
        </div>
        <button onClick={function() { setEditField("pending", !editForm.pending); }}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 11, border: "none", cursor: "pointer", marginBottom: 8,
            background: editForm.pending ? T.goldDim : "rgba(0,0,0,0.04)", fontFamily: UI }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: editForm.pending ? T.gold : T.ink2 }}>{tr("markPending")}</span>
          <div style={{ width: 18, height: 18, borderRadius: 6, border: "2px solid " + (editForm.pending ? T.gold : T.ink3), background: editForm.pending ? T.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {editForm.pending && <SVGIcon id="check" size={10} color="#fff" />}
          </div>
        </button>
        <BigBtn label={tr("saveChanges")} onPress={saveEdit} disabled={!editForm.amount || !editForm.label} />
        <button onClick={function() { props.onSaveTx(props.tx.filter(function(x) { return x.id !== editTx.id; })); setEditTx(null); }}
          style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 13, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 8, padding: "5px 0" }}>
          {tr("deleteTx")}
        </button>
      </Overlay>

      {props.tx.length === 0 && (
        <Card style={{ padding: "46px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SVGIcon id="activity" size={24} color={T.orange} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{tr("noTransactions")}</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5, marginBottom: 18 }}>{importPrimary ? "Import a CSV statement to fill in your transactions, or add them by hand." : tr("noTransactionsSub")}</div>
          <button onClick={function() { if (importPrimary) setImportOpen(true); else props.setSheetOpen(true); }}
            style={{ background: T.btn, color: "#fff", textShadow: "0 1px 2px rgba(42,31,77,0.35)", border: "none", borderRadius: 13, padding: "12px 22px", fontSize: 14, fontFamily: UI, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px " + T.orangeGlow }}>
            {importPrimary ? "Import from CSV" : "Add your first transaction"}
          </button>
          <button onClick={function() { if (importPrimary) props.setSheetOpen(true); else setImportOpen(true); }}
            style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: T.ink3, fontSize: 12.5, fontWeight: 600, fontFamily: UI, cursor: "pointer" }}>
            {importPrimary ? "or add one manually" : "or import from a CSV file"}
          </button>
        </Card>
      )}

      {props.tx.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{tr("moneyIn")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.green, letterSpacing: "-0.02em" }}>{dollars(totalIn)}</div>
          </div>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{tr("moneyOut")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(totalOut)}</div>
          </div>
        </div>
      )}

      {dates.map(function(date) {
        var dayItems = groups[date];
        var dayNet = dayItems.reduce(function(s,t){ return t.type === "income" ? s + t.amount : s - t.amount; }, 0);
        return (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px 8px" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dateLabel(date)}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: dayNet >= 0 ? T.green : T.ink2 }}>{dayNet >= 0 ? "+" : "-"}{dollars(dayNet)}</span>
            </div>
            <Card style={{ overflow: "hidden" }}>
              {dayItems.map(function(t, i) {
                var c = resolveCat(cats, t);
                return (
                  <div key={t.id}
                    onMouseDown={function() { startLongPress(t); }}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onTouchStart={function() { startLongPress(t); }}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onContextMenu={function(e) { e.preventDefault(); }}
                    style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", borderBottom: i < dayItems.length - 1 ? "0.5px solid " + T.sep : "none", opacity: t.pending ? 0.62 : 1, cursor: "pointer", userSelect: "none", WebkitUserSelect: "none" }}>
                    <CatBadge icon={t.type === "income" ? "up" : c.icon} color={t.type === "income" ? T.green : c.color} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, color: T.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: T.ink3, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.type === "income" ? T.green : c.color, display: "inline-block" }} />
                          {t.type === "income" ? tr("income") : c.name}
                        </span>
                        {t.origCur && t.origCur !== _currency.sym && <span style={{ fontSize: 10, fontWeight: 700, color: T.gold, background: T.goldDim, borderRadius: 5, padding: "1px 6px", letterSpacing: "0.02em" }}>{fmtCur(t.origCur, t.origAmount)}</span>}
                        {t.pending && <span style={{ fontSize: 10, fontWeight: 700, color: T.gold, background: T.goldDim, borderRadius: 5, padding: "1px 6px", letterSpacing: "0.04em" }}>PENDING</span>}
                        {t.repeat && t.repeat !== "none" && <span style={{ fontSize: 10, fontWeight: 600, color: T.ink2, background: T.orangeDim, borderRadius: 5, padding: "1px 6px" }}>{t.repeat === "weekly" ? tr("weekly") : tr("monthly")}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: t.type === "income" ? T.green : T.red, letterSpacing: "-0.02em" }}>
                      {t.type === "income" ? "+" : "-"}{dollars(t.amount)}
                    </span>
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })}
    </div>
  );
}

// Convert an absolute epoch-ms instant to the value a datetime-local input wants
// ("YYYY-MM-DDTHH:MM" in local time).
function toLocalInput(ms) {
  var d = new Date(ms);
  function p(x) { return (x < 10 ? "0" : "") + x; }
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

// Ask for notification permission lazily (only when a reminder is first set).
// Calls cb(granted). Never throws on browsers without the API.
function ensureNotifyPermission(cb) {
  if (typeof window === "undefined" || !("Notification" in window)) { cb(false); return; }
  if (Notification.permission === "granted") { cb(true); return; }
  if (Notification.permission === "denied") { cb(false); return; }
  try {
    Notification.requestPermission().then(function(p) { cb(p === "granted"); });
  } catch (e) { cb(false); }
}

// Fire a reminder notification for a note. Prefers the service worker (so it
// survives the page and supports mobile), falling back to a plain Notification.
function fireReminder(n) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  var body = (n.dir === "owed" ? "They owe you " : "You owe ") + dollars(n.amount) + " - " + n.label;
  function plain() { try { new Notification("Richy", { body: body }); } catch (e) {} }
  if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistration) {
    navigator.serviceWorker.getRegistration().then(function(reg) {
      if (reg && reg.showNotification) { reg.showNotification("Richy", { body: body, tag: "note-" + n.id }); }
      else { plain(); }
    }).catch(plain);
  } else { plain(); }
}

// Business notifications share the reminder plumbing but NEVER prompt for
// permission - they only fire if the user already granted it elsewhere.
function fireBizNotification(title, body, tag) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  function plain() { try { new Notification(title, { body: body }); } catch (e) {} }
  if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistration) {
    navigator.serviceWorker.getRegistration().then(function(reg) {
      if (reg && reg.showNotification) { reg.showNotification(title, { body: body, tag: tag }); }
      else { plain(); }
    }).catch(plain);
  } else { plain(); }
}

// Notes / "who owes whom". A note looks like an Activity row but the amount is
// neutral (it is not real money yet) and carries a direction tag. Settling a note
// optionally converts it into a real transaction and removes it from the list.
function Notes(props) {
  var cats = props.categories || [];
  var mainSym = _currency.sym;
  var blankForm = { dir: "owed", amount: "", label: "", catId: (cats[0] || {}).id || "", date: new Date().toISOString().slice(0, 10), cur: mainSym, rate: 1, rateLoading: false, rateFallback: false };
  var _f = useState(blankForm);
  var form = _f[0]; var setForm = _f[1];
  var _en = useState(null);
  var editNote = _en[0]; var setEditNote = _en[1];
  var _ef = useState(blankForm);
  var editForm = _ef[0]; var setEditForm = _ef[1];
  var _sn = useState(null);
  var settleNote = _sn[0]; var setSettleNote = _sn[1];
  var _ab = useState(true);
  var addToBalance = _ab[0]; var setAddToBalance = _ab[1];
  var _an = useState(null);
  var actNote = _an[0]; var setActNote = _an[1];
  var _rw = useState("");
  var remWhen = _rw[0]; var setRemWhen = _rw[1];
  var _rn = useState("");
  var remNotice = _rn[0]; var setRemNotice = _rn[1];

  function setField(key, val) {
    setForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }
  function setEditField(key, val) {
    setEditForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }

  function pickCur(sym) {
    setForm(function(prev) {
      var next = {}; for (var k in prev) next[k] = prev[k];
      next.cur = sym; next.rateLoading = sym !== mainSym; next.rateFallback = false;
      if (sym === mainSym) next.rate = 1;
      return next;
    });
    if (sym === mainSym) return;
    fetchRate(sym, mainSym, function(rate, fb) {
      setForm(function(prev) {
        if (prev.cur !== sym) return prev;
        var next = {}; for (var k in prev) next[k] = prev[k];
        next.rate = rate; next.rateLoading = false; next.rateFallback = fb;
        return next;
      });
    });
  }
  function pickEditCur(sym) {
    setEditForm(function(prev) {
      var next = {}; for (var k in prev) next[k] = prev[k];
      next.cur = sym; next.rateLoading = sym !== mainSym; next.rateFallback = false;
      if (sym === mainSym) next.rate = 1;
      return next;
    });
    if (sym === mainSym) return;
    fetchRate(sym, mainSym, function(rate, fb) {
      setEditForm(function(prev) {
        if (prev.cur !== sym) return prev;
        var next = {}; for (var k in prev) next[k] = prev[k];
        next.rate = rate; next.rateLoading = false; next.rateFallback = fb;
        return next;
      });
    });
  }

  var pressTimer = useRef(null);
  var longFired = useRef(false);
  function startLongPress(n) {
    longFired.current = false;
    pressTimer.current = setTimeout(function() {
      longFired.current = true;
      setActNote(n);
      setRemWhen(n.reminder ? toLocalInput(n.reminder.due) : "");
      setRemNotice("");
      pressTimer.current = null;
    }, 500);
  }
  function cancelLongPress() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }
  function rowClick(n) {
    if (longFired.current) { longFired.current = false; return; }
    openEdit(n);
  }

  function openEdit(n) {
    setEditNote(n);
    var hasForeign = n.origCur && n.origCur !== mainSym;
    setEditForm({ dir: n.dir, amount: String(hasForeign ? n.origAmount : n.amount), label: n.label, catId: n.catId || "", date: n.date,
      cur: hasForeign ? n.origCur : mainSym, rate: hasForeign ? (n.rate || fxStaticRate(n.origCur, mainSym)) : 1, rateLoading: false, rateFallback: false });
  }

  function add() {
    if (!form.amount || !form.label) return;
    var c = catById(cats, form.catId) || cats[0] || { id: "", name: "Other" };
    var entered = parseFloat(form.amount);
    var foreign = form.cur && form.cur !== mainSym;
    var rate = foreign ? (form.rate || fxStaticRate(form.cur, mainSym)) : 1;
    var mainAmount = round2(entered * rate);
    var note = { id: Date.now(), dir: form.dir, amount: mainAmount, label: form.label, catId: c.id, category: c.name, date: form.date, reminder: null };
    if (foreign) { note.origAmount = entered; note.origCur = form.cur; note.rate = rate; }
    props.onSaveNotes(props.notes.concat([note]));
    setForm(blankForm);
    props.setSheetOpen(false);
  }

  function saveEdit() {
    if (!editForm.amount || !editForm.label || !editNote) return;
    var c = catById(cats, editForm.catId) || cats[0] || { id: "", name: "Other" };
    var entered = parseFloat(editForm.amount);
    var foreign = editForm.cur && editForm.cur !== mainSym;
    var rate = foreign ? (editForm.rate || fxStaticRate(editForm.cur, mainSym)) : 1;
    var mainAmount = round2(entered * rate);
    props.onSaveNotes(props.notes.map(function(n) {
      if (n.id !== editNote.id) return n;
      var nn = { id: n.id, dir: editForm.dir, amount: mainAmount, label: editForm.label, catId: c.id, category: c.name, date: editForm.date, reminder: n.reminder || null };
      if (foreign) { nn.origAmount = entered; nn.origCur = editForm.cur; nn.rate = rate; }
      return nn;
    }));
    setEditNote(null);
  }

  function deleteNote() {
    if (!editNote) return;
    props.onSaveNotes(props.notes.filter(function(x) { return x.id !== editNote.id; }));
    setEditNote(null);
  }

  function doSettle() {
    var n = settleNote;
    if (!n) return;
    setSettleNote(null);
    var nextNotes = props.notes.filter(function(x) { return x.id !== n.id; });
    if (addToBalance) {
      var t = { id: n.id, type: n.dir === "owed" ? "income" : "expense", amount: n.amount, label: n.label, catId: n.catId || "", category: n.category || "", date: new Date().toISOString().slice(0, 10), repeat: "none", pending: false };
      if (n.origCur) { t.origAmount = n.origAmount; t.origCur = n.origCur; t.rate = n.rate; }
      props.onSettleNote(props.tx.concat([t]), nextNotes);
    } else {
      props.onSaveNotes(nextNotes);
    }
  }

  function applyReminder() {
    var n = actNote;
    if (!n || !remWhen) return;
    var due = new Date(remWhen).getTime();
    if (isNaN(due)) return;
    var updated = props.notes.map(function(x) {
      if (x.id !== n.id) return x;
      var nn = {}; for (var k in x) nn[k] = x[k];
      nn.reminder = { due: due, fired: false };
      return nn;
    });
    ensureNotifyPermission(function(granted) {
      props.onSaveNotes(updated);
      if (granted) { setActNote(null); }
      else { setRemNotice(tr("reminderDenied")); }
    });
  }
  function clearReminder() {
    var n = actNote;
    if (!n) return;
    props.onSaveNotes(props.notes.map(function(x) {
      if (x.id !== n.id) return x;
      var nn = {}; for (var k in x) nn[k] = x[k];
      nn.reminder = null;
      return nn;
    }));
    setActNote(null);
  }

  var sorted = props.notes.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
  var groups = {};
  sorted.forEach(function(n) {
    if (!groups[n.date]) groups[n.date] = [];
    groups[n.date].push(n);
  });
  var dates = Object.keys(groups).sort(function(a, b) { return b.localeCompare(a); });
  var owedToMe = props.notes.reduce(function(s, n) { return n.dir === "owed" ? s + n.amount : s; }, 0);
  var iOwe = props.notes.reduce(function(s, n) { return n.dir === "owe" ? s + n.amount : s; }, 0);

  return (
    <div>
      <SubViewBack onBack={props.onBack} label={tr("activity")} />

      <Overlay open={props.sheetOpen} onClose={function() { props.setSheetOpen(false); }} title={tr("newNote")}>
        <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
          {["owed","owe"].map(function(opt) {
            var on = form.dir === opt;
            return (
              <button key={opt} onClick={function() { setField("dir", opt); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: UI,
                  background: on ? (opt === "owed" ? T.greenDim : T.orangeDim) : "rgba(0,0,0,0.04)",
                  color: on ? (opt === "owed" ? T.green : T.orange) : T.ink3 }}>
                {opt === "owed" ? tr("theyOweMe") : tr("iOwe")}
              </button>
            );
          })}
        </div>
        <AmountField value={form.amount} onAmount={function(e) { setField("amount", e.target.value); }} cur={form.cur} onCur={pickCur} mainSym={mainSym} rate={form.rate} rateLoading={form.rateLoading} rateFallback={form.rateFallback} />
        <FormRow label={tr("txLabel")} value={form.label} onChange={function(e) { setField("label", e.target.value); }} placeholder="Dinner, loan, ticket..." />
        <CatPicker label={tr("category")} categories={cats} value={form.catId} onChange={function(id) { setField("catId", id); }} onManage={props.onManageCategories} />
        <FormRow label={tr("date")} value={form.date} onChange={function(e) { setField("date", e.target.value); }} type="date" last={true} />
        <BigBtn label={tr("addNote")} onPress={add} disabled={!form.amount || !form.label} />
      </Overlay>

      <Overlay open={!!editNote} onClose={function() { setEditNote(null); }} title={tr("editNote")}>
        <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
          {["owed","owe"].map(function(opt) {
            var on = editForm.dir === opt;
            return (
              <button key={opt} onClick={function() { setEditField("dir", opt); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: UI,
                  background: on ? (opt === "owed" ? T.greenDim : T.orangeDim) : "rgba(0,0,0,0.04)",
                  color: on ? (opt === "owed" ? T.green : T.orange) : T.ink3 }}>
                {opt === "owed" ? tr("theyOweMe") : tr("iOwe")}
              </button>
            );
          })}
        </div>
        <AmountField value={editForm.amount} onAmount={function(e) { setEditField("amount", e.target.value); }} cur={editForm.cur} onCur={pickEditCur} mainSym={mainSym} rate={editForm.rate} rateLoading={editForm.rateLoading} rateFallback={editForm.rateFallback} />
        <FormRow label={tr("txLabel")} value={editForm.label} onChange={function(e) { setEditField("label", e.target.value); }} placeholder="Dinner, loan, ticket..." />
        <CatPicker label={tr("category")} categories={cats} value={editForm.catId} onChange={function(id) { setEditField("catId", id); }} onManage={props.onManageCategories} />
        <FormRow label={tr("date")} value={editForm.date} onChange={function(e) { setEditField("date", e.target.value); }} type="date" last={true} />
        <BigBtn label={tr("saveNote")} onPress={saveEdit} disabled={!editForm.amount || !editForm.label} />
        <button onClick={deleteNote}
          style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 13, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 8, padding: "5px 0" }}>
          {tr("deleteNote")}
        </button>
      </Overlay>

      <Overlay open={!!settleNote} onClose={function() { setSettleNote(null); }} title={tr("settleTitle")}>
        {settleNote && (
          <div style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(0,0,0,0.04)", borderRadius: 13, padding: "12px 14px", marginBottom: 9 }}>
            <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px", letterSpacing: "0.02em", color: settleNote.dir === "owed" ? T.green : T.orange, background: settleNote.dir === "owed" ? T.greenGlow : T.orangeGlow }}>
              {settleNote.dir === "owed" ? tr("theyOweMe") : tr("iOwe")}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{settleNote.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(settleNote.amount)}</span>
          </div>
        )}
        <button onClick={function() { setAddToBalance(!addToBalance); }}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 11, border: "none", cursor: "pointer", marginBottom: 8,
            background: addToBalance ? T.greenDim : "rgba(0,0,0,0.04)", fontFamily: UI }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: addToBalance ? T.green : T.ink2 }}>{tr("settleAddBalance")}</span>
          <div style={{ width: 18, height: 18, borderRadius: 6, border: "2px solid " + (addToBalance ? T.green : T.ink3), background: addToBalance ? T.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {addToBalance && <SVGIcon id="check" size={10} color="#fff" />}
          </div>
        </button>
        <BigBtn label={tr("settle")} onPress={doSettle} />
      </Overlay>

      <Overlay open={!!actNote} onClose={function() { setActNote(null); }} title={tr("reminderTitle")}>
        {actNote && (
          <div style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(0,0,0,0.04)", borderRadius: 13, padding: "12px 14px", marginBottom: 9 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{actNote.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(actNote.amount)}</span>
          </div>
        )}
        <FormRow label={tr("reminderWhen")} value={remWhen} onChange={function(e) { setRemWhen(e.target.value); }} type="datetime-local" last={true} />
        {remNotice && (
          <div style={{ fontSize: 12, color: T.ink2, background: T.goldDim, borderRadius: 9, padding: "8px 12px", marginTop: 8, lineHeight: 1.4 }}>{remNotice}</div>
        )}
        <BigBtn label={tr("setReminder")} onPress={applyReminder} disabled={!remWhen} />
        {actNote && actNote.reminder && (
          <button onClick={clearReminder}
            style={{ width: "100%", background: "none", border: "none", color: T.ink2, fontSize: 13, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 8, padding: "5px 0" }}>
            {tr("clearReminder")}
          </button>
        )}
      </Overlay>

      {props.notes.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{tr("theyOweMe")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(owedToMe)}</div>
          </div>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{tr("iOwe")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(iOwe)}</div>
          </div>
        </div>
      )}

      {props.notes.length === 0 && (
        <Card style={{ padding: "46px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SVGIcon id="note" size={24} color={T.orange} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{tr("notesEmpty")}</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>{tr("notesEmptySub")}</div>
        </Card>
      )}

      {dates.map(function(date) {
        var dayItems = groups[date];
        return (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ padding: "0 4px 8px" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dateLabel(date)}</span>
            </div>
            <Card style={{ overflow: "hidden" }}>
              {dayItems.map(function(n, i) {
                var c = resolveCat(cats, n);
                var owed = n.dir === "owed";
                var overdue = n.reminder && !n.reminder.fired && n.reminder.due < Date.now();
                return (
                  <div key={n.id}
                    onMouseDown={function() { startLongPress(n); }}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onTouchStart={function() { startLongPress(n); }}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onContextMenu={function(e) { e.preventDefault(); }}
                    onClick={function() { rowClick(n); }}
                    style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", borderBottom: i < dayItems.length - 1 ? "0.5px solid " + T.sep : "none", cursor: "pointer", userSelect: "none", WebkitUserSelect: "none" }}>
                    <button onClick={function(e) { e.stopPropagation(); setSettleNote(n); setAddToBalance(true); }}
                      onMouseDown={function(e) { e.stopPropagation(); }} onTouchStart={function(e) { e.stopPropagation(); }} title={tr("settle")}
                      style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", border: "2px solid " + T.ink3, background: "transparent", cursor: "pointer", padding: 0 }} />
                    <CatBadge icon={c.icon} color={c.color} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, color: T.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</div>
                      <div style={{ fontSize: 12, color: T.ink3, marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, display: "inline-block" }} />
                          {c.name}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "1px 6px", letterSpacing: "0.02em", color: owed ? T.green : T.orange, background: owed ? T.greenGlow : T.orangeGlow }}>
                          {owed ? tr("theyOweMe") : tr("iOwe")}
                        </span>
                        {n.origCur && n.origCur !== _currency.sym && <span style={{ fontSize: 10, fontWeight: 700, color: T.gold, background: T.goldGlow, borderRadius: 5, padding: "1px 6px", letterSpacing: "0.02em" }}>{fmtCur(n.origCur, n.origAmount)}</span>}
                        {n.reminder && <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "1px 6px", color: overdue ? T.red : T.gold, background: overdue ? T.redDim : T.goldGlow }}>{overdue ? tr("overdue") : tr("due")}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(n.amount)}</span>
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })}
    </div>
  );
}

function Budgets(props) {
  var cats = props.categories || [];
  var _s = useState(null);
  var editId = _s[0]; var setEditId = _s[1];
  var _v = useState("");
  var val = _v[0]; var setVal = _v[1];
  var _nb = useState({ catId: "", limit: "" });
  var nb = _nb[0]; var setNb = _nb[1];

  function spentForCat(c) {
    var ym = curMonth();
    return props.tx.filter(function(t) { return t.type === "expense" && !isTrip(t) && inMonth(t, ym) && (t.catId === c.id || t.category === c.name); }).reduce(function(s, t) { return s + t.amount; }, 0);
  }

  var rows = props.budgets.map(function(b) {
    var c = catById(cats, b.catId) || catByName(cats, b.category) || { id: b.catId, name: b.category || "Budget", color: T.orange, icon: "box" };
    var s = spentForCat(c);
    return { catId: b.catId, cat: c, limit: b.limit, spent: s, over: s > b.limit && b.limit > 0 };
  });

  var totalSpent = rows.reduce(function(s, r) { return s + r.spent; }, 0);
  var totalLimit = rows.reduce(function(s, r) { return s + r.limit; }, 0);
  var totalPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  // Storage-style segmented bar: each category's share of total spend.
  var segs = rows.slice().filter(function(r){ return r.spent > 0; }).sort(function(a,b){ return b.spent - a.spent; });
  var segTotal = segs.reduce(function(s, r){ return s + r.spent; }, 0);

  var used = {};
  props.budgets.forEach(function(b) { used[b.catId] = true; });
  var avail = cats.filter(function(c) { return !used[c.id]; });

  return (
    <div>
      <Overlay open={props.sheetOpen} onClose={function() { props.setSheetOpen(false); }} title={tr("newBudget")}>
        {avail.length === 0 ? (
          <div style={{ padding: "20px 4px 8px", textAlign: "center", color: T.ink3, fontSize: 14 }}>{tr("allCatsHaveBudget")}</div>
        ) : (
          <div>
            <CatPicker label={tr("category")} categories={avail} value={nb.catId || (avail[0] || {}).id} onChange={function(id) { setNb(function(p){ return { catId: id, limit: p.limit }; }); }} onManage={props.onManageCategories} />
            <FormRow label={tr("monthlyLimit")} value={nb.limit} onChange={function(e) { setNb(function(p){ return { catId: p.catId || (avail[0]||{}).id, limit: e.target.value }; }); }} type="number" last={true} />
            <BigBtn label={tr("addBudget")} disabled={!nb.limit} onPress={function() {
              var n = parseFloat(nb.limit);
              var cid = nb.catId || (avail[0] || {}).id;
              if (n > 0 && cid) {
                var c = catById(cats, cid);
                props.onSaveBudgets(props.budgets.concat([{ catId: cid, category: c ? c.name : "", limit: n }]));
              }
              setNb({ catId: "", limit: "" });
              props.setSheetOpen(false);
            }} />
          </div>
        )}
      </Overlay>

      <Overlay open={!!editId} onClose={function() { setEditId(null); }} title={tr("editLimit")}>
        <FormRow label={tr("monthlyLimit")} value={val} onChange={function(e) { setVal(e.target.value); }} type="number" last={true} />
        <BigBtn label={tr("save")} onPress={function() {
          var n = parseFloat(val);
          if (n > 0) props.onSaveBudgets(props.budgets.map(function(b) { return b.catId === editId ? { catId: b.catId, category: b.category, limit: n } : b; }));
          setEditId(null);
        }} />
        <button onClick={function() { props.onSaveBudgets(props.budgets.filter(function(b){ return b.catId !== editId; })); setEditId(null); }}
          style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 12, padding: "6px 0" }}>
          {tr("removeBudget")}
        </button>
      </Overlay>

      {props.budgets.length === 0 && (
        <Card style={{ padding: "46px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SVGIcon id="budgets" size={24} color={T.orange} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{tr("noBudgets")}</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>{tr("noBudgetsSub")}</div>
        </Card>
      )}

      {props.budgets.length > 0 && (
        <Card style={{ padding: "20px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{tr("totalSpent")}</div>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: totalSpent > totalLimit ? T.red : T.ink, lineHeight: 1.1, marginTop: 4 }}>
                {dollars(totalSpent)}
              </div>
              <div style={{ fontSize: 13, color: T.ink3, marginTop: 2 }}>{"of " + dollars(totalLimit) + " " + tr("budgeted")}</div>
            </div>
            <div style={{ position: "relative" }}>
              <RingChart value={totalSpent} max={totalLimit} size={72} color={totalPct > 85 ? T.red : T.orange} stroke={6} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: totalPct > 85 ? T.red : T.ink2 }}>
                {totalPct}%
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", height: 12, borderRadius: 8, overflow: "hidden", gap: 2, background: "rgba(0,0,0,0.05)" }}>
              {segTotal > 0 ? segs.map(function(r) {
                return <div key={r.cat.id} title={r.cat.name} style={{ width: (r.spent / segTotal * 100) + "%", background: r.over ? T.red : r.cat.color, height: "100%" }} />;
              }) : <div style={{ width: "100%" }} />}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 12 }}>
              {segs.slice(0, 6).map(function(r) {
                var pct = Math.round(r.spent / segTotal * 100);
                return (
                  <div key={r.cat.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: r.cat.color, display: "inline-block" }} />
                    <span style={{ fontSize: 12, color: T.ink2, fontWeight: 500 }}>{r.cat.name}</span>
                    <span style={{ fontSize: 12, color: T.ink3 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {props.budgets.length > 0 && (
        <div>
          <div style={{ padding: "0 4px 10px" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{tr("byCategory")}</span>
          </div>
          <Card style={{ overflow: "hidden" }}>
            {rows.map(function(r, i) {
              var pct = r.limit > 0 ? Math.round((r.spent / r.limit) * 100) : 0;
              return (
                <div key={r.catId || i} style={{ borderBottom: i < rows.length - 1 ? "0.5px solid " + T.sep : "none" }}>
                  <div style={{ padding: "14px 16px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 9 }}>
                      <CatBadge icon={r.cat.icon} color={r.cat.color} size={34} soft={true} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 15, color: T.ink, fontWeight: 600 }}>{r.cat.name}</span>
                      </div>
                      {r.over && <span style={{ fontSize: 10, fontWeight: 700, color: T.red, background: T.red + "1A", borderRadius: 7, padding: "2px 8px", letterSpacing: "0.02em" }}>OVER</span>}
                      <span style={{ color: T.orange, fontSize: 14, fontWeight: 700 }}>{dollars(r.limit)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={r.spent} max={r.limit} color={r.over ? T.red : r.cat.color} h={6} />
                      </div>
                      <span style={{ fontSize: 12, minWidth: 70, textAlign: "right", color: r.over ? T.red : T.ink3, fontWeight: 500 }}>{dollars(r.spent)} ({pct}%)</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", borderTop: "0.5px solid " + T.sep }}>
                    <button onClick={function() { setEditId(r.catId); setVal(String(r.limit)); }}
                      style={{ flex: 1, background: "none", border: "none", borderRight: "0.5px solid " + T.sep, padding: "11px 0", color: T.orange, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: UI }}>
                      {tr("edit")}
                    </button>
                    <button onClick={function() { props.onSaveBudgets(props.budgets.filter(function(b) { return b.catId !== r.catId; })); }}
                      style={{ flex: 1, background: "none", border: "none", padding: "11px 0", color: T.red, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: UI }}>
                      {tr("delete")}
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}

function Goals(props) {
  var _f = useState({ name: "", target: "", saved: "" });
  var form = _f[0]; var setForm = _f[1];
  var _a = useState(null);
  var addSheet = _a[0]; var setAddSheet = _a[1];
  var _am = useState("");
  var addAmt = _am[0]; var setAddAmt = _am[1];
  var _eg = useState(null);
  var editGoal = _eg[0]; var setEditGoal = _eg[1];
  var _ef = useState({ name: "", target: "" });
  var editForm = _ef[0]; var setEditForm = _ef[1];

  function setField(key, val) {
    setForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }
  function setEditField(key, val) {
    setEditForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }

  return (
    <div>
      <Overlay open={props.sheetOpen} onClose={function() { props.setSheetOpen(false); }} title={tr("newBudgetBook")}>
        {props.onPlanTrip && (
          <button onClick={function() { props.setSheetOpen(false); props.onPlanTrip(); }}
            style={{ width: "100%", border: "none", cursor: "pointer", textAlign: "left", marginBottom: 16, borderRadius: 16, padding: "14px 16px", background: T.heroBg2, boxShadow: "0 6px 18px " + T.orangeGlow, display: "flex", alignItems: "center", gap: 12, fontFamily: UI }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <SVGIcon id="plane" size={20} color={T.heroInk} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.heroInk, letterSpacing: "-0.01em" }}>{tr("planATrip")}</div>
              <div style={{ fontSize: 12, color: T.heroMut, marginTop: 2, lineHeight: 1.35 }}>{tr("planATripSub")}</div>
            </div>
            <SVGIcon id="chevron" size={18} color={T.heroInk} />
          </button>
        )}
        <FormRow label={tr("name")} value={form.name} onChange={function(e) { setField("name", e.target.value); }} />
        <FormRow label={tr("target")} value={form.target} onChange={function(e) { setField("target", e.target.value); }} type="number" />
        <FormRow label={tr("alreadySaved")} value={form.saved} onChange={function(e) { setField("saved", e.target.value); }} type="number" last={true} />
        <BigBtn label={tr("createBudgetBook")} disabled={!form.name || !form.target} onPress={function() {
          props.onSaveGoals(props.goals.concat([{ id: Date.now(), name: form.name, target: parseFloat(form.target), saved: parseFloat(form.saved) || 0 }]));
          setForm({ name: "", target: "", saved: "" });
          props.setSheetOpen(false);
        }} />
      </Overlay>

      <Overlay open={!!editGoal} onClose={function() { setEditGoal(null); }} title={tr("editBudgetBook")}>
        <FormRow label={tr("name")} value={editForm.name} onChange={function(e) { setEditField("name", e.target.value); }} />
        <FormRow label={tr("target")} value={editForm.target} onChange={function(e) { setEditField("target", e.target.value); }} type="number" last={true} />
        <BigBtn label={tr("saveChanges")} disabled={!editForm.name || !editForm.target} onPress={function() {
          var n = parseFloat(editForm.target);
          if (editGoal && editForm.name && n > 0) {
            props.onSaveGoals(props.goals.map(function(g) {
              return g.id === editGoal.id ? { id: g.id, name: editForm.name, target: n, saved: g.saved } : g;
            }));
          }
          setEditGoal(null);
        }} />
        <button onClick={function() { props.onSaveGoals(props.goals.filter(function(x) { return x.id !== editGoal.id; })); setEditGoal(null); }}
          style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 12, padding: "6px 0" }}>
          {tr("deleteBudgetBook")}
        </button>
      </Overlay>

      <Overlay open={!!addSheet} onClose={function() { setAddSheet(null); }} title={addSheet ? addSheet.name : ""}>
        <FormRow label={tr("amount")} value={addAmt} onChange={function(e) { setAddAmt(e.target.value); }} type="number" last={true} />
        <BigBtn label={tr("addToBudgetBook")} disabled={!addAmt} onPress={function() {
          var n = parseFloat(addAmt);
          if (n && addSheet) {
            props.onSaveGoals(props.goals.map(function(g) {
              return g.id === addSheet.id ? { id: g.id, name: g.name, target: g.target, saved: Math.min(g.target, g.saved + n) } : g;
            }));
          }
          setAddSheet(null);
          setAddAmt("");
        }} />
      </Overlay>

      {props.onOpenTrip && (props.trips || []).filter(function(t) { return !t.ended; }).map(function(t) {
        var tSpent = t.allocations.reduce(function(s, a) { return s + (a.spent || 0); }, 0);
        var tPct = t.total > 0 ? Math.min(100, Math.round((tSpent / t.total) * 100)) : 0;
        return (
          <button key={t.id} onClick={function() { props.onOpenTrip(t.id); }}
            style={{ width: "100%", border: "none", cursor: "pointer", textAlign: "left", marginBottom: 16, borderRadius: 20, padding: "16px 18px", background: T.heroBg2, boxShadow: "0 8px 24px " + T.orangeGlow, display: "flex", alignItems: "center", gap: 14, fontFamily: UI }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <SVGIcon id={t.icon || "plane"} size={22} color={T.heroInk} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.heroInk, letterSpacing: "-0.01em" }}>{t.name}</div>
              <div style={{ fontSize: 12, color: T.heroMut, marginTop: 2, lineHeight: 1.35 }}>{(t.destination ? t.destination + " - " : "") + dollars(tSpent) + " " + tr("spentOf") + " " + dollars(t.total) + " (" + tPct + "%)"}</div>
            </div>
            <SVGIcon id="chevron" size={18} color={T.heroInk} />
          </button>
        );
      })}

      {props.goals.length === 0 && (
        <Card style={{ padding: "46px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SVGIcon id="goals" size={24} color={T.orange} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{tr("noGoals")}</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>{tr("noGoalsSub")}</div>
        </Card>
      )}

      {props.goals.map(function(g) {
        var pct = Math.min(100, Math.round((g.saved / g.target) * 100));
        var done = g.saved >= g.target;
        return (
          <Card key={g.id} style={{ marginBottom: 14, overflow: "hidden" }}>
            <div style={{ padding: "18px 18px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{g.name}</div>
                  <div style={{ fontSize: 13, color: T.ink3, marginTop: 2 }}>
                    {done ? tr("goalComplete") : dollars(g.target - g.saved) + " " + tr("remaining")}
                  </div>
                </div>
                <div style={{ position: "relative" }}>
                  <RingChart value={g.saved} max={g.target} size={60} color={done ? T.green : T.orange} stroke={5} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: done ? T.green : T.orange }}>
                    {pct}%
                  </div>
                </div>
              </div>
              <ProgressBar value={g.saved} max={g.target} color={done ? T.green : T.orange} h={6} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: T.ink3 }}>{dollars(g.saved)}</span>
                <span style={{ fontSize: 11, color: T.ink3 }}>{dollars(g.target)}</span>
              </div>
            </div>
            <div style={{ display: "flex", borderTop: "0.5px solid " + T.sep }}>
              {!done && (
                <button onClick={function() { setAddSheet(g); setAddAmt(""); }}
                  style={{ flex: 1, background: "none", border: "none", borderRight: "0.5px solid " + T.sep, padding: "13px 0", color: T.orange, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                  {"+ " + tr("add")}
                </button>
              )}
              <button onClick={function() { setEditGoal(g); setEditForm({ name: g.name, target: String(g.target) }); }}
                style={{ flex: 1, background: "none", border: "none", padding: "13px 0", color: T.ink2, fontSize: 15, cursor: "pointer", borderRight: "0.5px solid " + T.sep }}>
                {tr("edit")}
              </button>
              <button onClick={function() { props.onSaveGoals(props.goals.filter(function(x) { return x.id !== g.id; })); }}
                style={{ flex: 1, background: "none", border: "none", padding: "13px 0", color: T.red, fontSize: 15, cursor: "pointer" }}>
                {tr("delete")}
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// Plan a Trip. A fully isolated trip budget: it never touches the main balance
// until the user explicitly reserves it (a single reversible expense tx). Richard
// splits the budget across TRIP_CATEGORIES; logged expenses live on the trip only.
// Slice out a complete bracketed JSON array starting at `from` (which must point
// at a "["), respecting nesting. Returns "" if unbalanced.
function sliceJsonArray(text, from) {
  var depth = 0;
  for (var i = from; i < text.length; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") { depth--; if (depth === 0) return text.slice(from, i + 1); }
  }
  return "";
}

// Richard can act on the budget, not just talk: when he wants to change the
// split he appends "@@ALLOC[{category,amount},...]" to his reply. This pulls
// that directive out and returns the human-facing text separately.
function extractAllocDirective(text) {
  text = text || "";
  var idx = text.indexOf("@@ALLOC");
  if (idx === -1) return { text: text.trim(), allocations: null };
  var allocations = null;
  var jstart = text.indexOf("[", idx);
  if (jstart !== -1) {
    var jsonStr = sliceJsonArray(text, jstart);
    if (jsonStr) { try { var arr = JSON.parse(jsonStr); if (Array.isArray(arr)) allocations = arr; } catch (e) {} }
  }
  var clean = text.slice(0, idx).trim();
  if (!clean) clean = "Done — I updated the budget split for you.";
  return { text: clean, allocations: allocations };
}

// Extract a @@BIZ[...] ops directive from a business-chat reply. Unlike the
// @@ALLOC extractor this keeps the text AFTER the directive, so an @@ALLOC
// on a later line still survives a second extraction pass.
function extractBizDirective(text) {
  text = text || "";
  var idx = text.indexOf("@@BIZ");
  if (idx === -1) return { text: text.trim(), ops: null };
  var ops = null;
  var jend = -1;
  var jstart = text.indexOf("[", idx);
  if (jstart !== -1) {
    var jsonStr = sliceJsonArray(text, jstart);
    if (jsonStr) {
      jend = jstart + jsonStr.length;
      try { var arr = JSON.parse(jsonStr); if (Array.isArray(arr)) ops = arr; } catch (e) {}
    }
  }
  var clean = (text.slice(0, idx) + (jend !== -1 ? text.slice(jend) : "")).trim();
  if (!clean) clean = "Done.";
  return { text: clean, ops: ops };
}

// Turn Richard's free-form {category, amount} list into a {bucketKey: amount}
// map keyed to our fixed TRIP_CATEGORIES buckets.
function allocDirectiveToMap(arr) {
  var byKey = {};
  (arr || []).forEach(function(a) {
    var nm = String(a.category || "").toLowerCase();
    for (var i = 0; i < TRIP_CATEGORIES.length; i++) {
      var c = TRIP_CATEGORIES[i];
      if (nm.indexOf(c.key) !== -1 || nm.indexOf(c.label.toLowerCase()) !== -1) {
        byKey[c.key] = Math.max(0, Math.round(parseFloat(a.amount) || 0));
        break;
      }
    }
  });
  return byKey;
}

function tripSpent(t) { return t.allocations.reduce(function(s, a) { return s + (a.spent || 0); }, 0); }
// Where the trip stands relative to today: upcoming (not started), live (in
// progress - day N of days), or past (already over). null when no start date
// was set, so the whole live-pace UI just doesn't render.
function tripDayInfo(trip) {
  if (!trip.startDate || !trip.days) return null;
  var start = new Date(trip.startDate + "T00:00:00");
  if (isNaN(start.getTime())) return null;
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  var diffDays = Math.round((today - s) / 86400000);
  if (diffDays < 0) return { status: "upcoming", daysUntil: -diffDays };
  if (diffDays >= trip.days) return { status: "past" };
  return { status: "live", dayNum: diffDays + 1 };
}
// A deterministic (no AI call) pace read Richard can show the instant you
// open a live trip: how today's spend compares to today's fair share of the
// budget, and a same-pace projection for the rest of the trip.
function livePaceInsight(trip, dayInfo) {
  var spentSoFar = tripSpent(trip);
  var perDay = spentSoFar / dayInfo.dayNum;
  var projected = perDay * trip.days;
  var diff = projected - trip.total;
  var overCats = trip.allocations.filter(function(a) { return a.planned > 0 && a.spent > a.planned; });
  var verdict = diff > trip.total * 0.05 ? "over" : (diff < -trip.total * 0.05 ? "under" : "good");
  var msg = "Day " + dayInfo.dayNum + " of " + trip.days + " - " + dollars(spentSoFar) + " spent so far, about " + dollars(perDay) + "/day.";
  if (verdict === "over") {
    msg += " At this pace you'll land around " + dollars(projected) + ", " + dollars(diff) + " over budget.";
  } else if (verdict === "under") {
    msg += " At this pace you'll land around " + dollars(projected) + ", comfortably under budget.";
  } else {
    msg += " That pace keeps you on track to finish around " + dollars(projected) + ".";
  }
  if (overCats.length > 0) {
    msg += " " + overCats.map(function(a) { return a.label; }).join(" and ") + (overCats.length > 1 ? " are" : " is") + " already over budget - pull from Buffer or another bucket if you can.";
  }
  return { verdict: verdict, text: msg };
}

function Trips(props) {
  var _v = useState(props.openTripId ? "detail" : "list"); var view = _v[0]; var setView = _v[1];
  var _aid = useState(props.openTripId || null); var activeId = _aid[0]; var setActiveId = _aid[1];
  var _st = useState(1); var step = _st[0]; var setStep = _st[1];
  var _fm = useState({ name: "", destination: "", total: "", days: "", startDate: "", style: "comfort", icon: "plane", notes: "", wantPlan: true });
  var form = _fm[0]; var setForm = _fm[1];
  var _pl = useState(false); var planning = _pl[0]; var setPlanning = _pl[1];
  var _al = useState([]); var alloc = _al[0]; var setAlloc = _al[1];
  var _tp = useState([]); var tips = _tp[0]; var setTips = _tp[1];
  var _lf = useState(null); var logFor = _lf[0]; var setLogFor = _lf[1];
  var _lfm = useState({ label: "", amount: "" }); var logForm = _lfm[0]; var setLogForm = _lfm[1];
  var _res = useState(null); var reserveFor = _res[0]; var setReserveFor = _res[1];
  var _resL = useState(""); var resLabel = _resL[0]; var setResLabel = _resL[1];
  var _resD = useState(""); var resDate = _resD[0]; var setResDate = _resD[1];
  var _de = useState({}); var detailEdits = _de[0]; var setDetailEdits = _de[1];
  var _tnc = useState({}); var tripNoteChats = _tnc[0]; var setTripNoteChats = _tnc[1];
  var _tni = useState(""); var tripNoteInput = _tni[0]; var setTripNoteInput = _tni[1];
  var _tnl = useState(false); var tripNoteLoading = _tnl[0]; var setTripNoteLoading = _tnl[1];
  var _wnc = useState([]); var wizardNoteChat = _wnc[0]; var setWizardNoteChat = _wnc[1];
  var _wni = useState(""); var wizardNoteInput = _wni[0]; var setWizardNoteInput = _wni[1];
  var _wnl = useState(false); var wizardNoteLoading = _wnl[0]; var setWizardNoteLoading = _wnl[1];
  // Text of the just-arrived Richard reply (wizard or trip chat) - only that message streams in.
  var animTripRef = useRef(null);
  var _ba = useState(null); var budgetAssessment = _ba[0]; var setBudgetAssessment = _ba[1];
  var _acf = useState(null); var addCatFor = _acf[0]; var setAddCatFor = _acf[1];
  var _acfm = useState({ label: "", icon: "box" }); var addCatForm = _acfm[0]; var setAddCatForm = _acfm[1];
  var _dc = useState(null); var delCat = _dc[0]; var setDelCat = _dc[1];
  var _mvt = useState(""); var moveTarget = _mvt[0]; var setMoveTarget = _mvt[1];
  var _dec = useState(null); var delEntryConfirm = _dec[0]; var setDelEntryConfirm = _dec[1];

  function setField(k, val) { setForm(function(p) { var n = {}; for (var key in p) n[key] = p[key]; n[k] = val; return n; }); }
  function setLogField(k, val) { setLogForm(function(p) { var n = {}; for (var key in p) n[key] = p[key]; n[k] = val; return n; }); }
  function setDetailEdit(tripId, field, val) { setDetailEdits(function(prev) { var n = {}; for (var k in prev) n[k] = prev[k]; n[tripId + "_" + field] = val; return n; }); }
  function clearDetailEdit(tripId, field) { setDetailEdits(function(prev) { var n = {}; for (var k in prev) n[k] = prev[k]; delete n[tripId + "_" + field]; return n; }); }
  function getDetailEdit(tripId, field, fallback) { var k = tripId + "_" + field; return detailEdits.hasOwnProperty(k) ? detailEdits[k] : String(fallback); }
  function updateTripAllocPlanned(tripId, key, rawVal) {
    var n = rawVal === "" ? 0 : Math.max(0, parseFloat(rawVal) || 0);
    var nextTrips = props.trips.map(function(t) {
      if (t.id !== tripId) return t;
      var allocs = t.allocations.map(function(a) { return a.key === key ? Object.assign({}, a, { planned: n }) : a; });
      return Object.assign({}, t, { allocations: allocs });
    });
    props.onSaveTrips(nextTrips);
  }
  function updateTripTotal(tripId, rawVal) {
    var n = Math.max(0, parseFloat(rawVal) || 0);
    var nextTrips = props.trips.map(function(t) { return t.id === tripId ? Object.assign({}, t, { total: n }) : t; });
    props.onSaveTrips(nextTrips);
  }
  // Apply a Richard directive to a saved trip, changing only the planned amounts
  // of the buckets he named and preserving everything already spent. Returns
  // true if anything changed.
  function applyAllocToTrip(trip, arr) {
    var byKey = allocDirectiveToMap(arr);
    if (!Object.keys(byKey).length) return false;
    var allocs = trip.allocations.map(function(a) {
      return byKey.hasOwnProperty(a.key) ? Object.assign({}, a, { planned: byKey[a.key] }) : a;
    });
    var nextTrips = props.trips.map(function(t) { return t.id === trip.id ? Object.assign({}, t, { allocations: allocs }) : t; });
    props.onSaveTrips(nextTrips);
    return true;
  }

  function sendWizardNote() {
    if (!wizardNoteInput.trim() || wizardNoteLoading) return;
    var msg = wizardNoteInput.trim();
    setWizardNoteInput("");
    var nc = wizardNoteChat.concat([{ role: "user", text: msg }]);
    setWizardNoteChat(nc);
    setWizardNoteLoading(true);
    var total = parseFloat(form.total) || 0;
    var allocSummary = alloc.map(function(a) { return a.label + ": " + dollars(a.planned || 0); }).join("; ");
    var sys = "You are Richard, a warm and knowledgeable personal finance and travel advisor inside the Richy app. "
      + "The user is setting up a trip budget: " + (form.name || "a trip") + " to " + (form.destination || "an unspecified destination") + ". "
      + "Trip details: " + (form.days || 0) + " days, " + (form.style || "comfort") + " style, total budget " + dollars(total) + ". "
      + "Current budget split: " + (allocSummary || "not yet set") + ". "
      + "The user has comments or suggestions about how this budget is split. Listen to their feedback and adjust the allocation to fit their priorities. "
      + "You can DIRECTLY change the budget, not just describe it. When the user wants a change, give one short plain-text sentence explaining what you did, then on a new line append a directive in EXACTLY this form: @@ALLOC[{\"category\":\"Food\",\"amount\":600},{\"category\":\"Buffer\",\"amount\":150}] "
      + "Only list the buckets you are changing, using whole numbers. Keep the overall total close to " + dollars(total) + " by also adjusting Buffer or Other when needed. Categories must be from: Flights, Housing, Food, Activities, Shopping, Transport, Other, Buffer. "
      + "Only include the @@ALLOC directive when you actually intend to change the split; for general questions just answer normally. "
      + "Be concise, warm, and practical." + RICHARD_FORMAT + " The @@ALLOC directive, when you use it, must be the very last thing in your reply.";
    callClaude(
      nc.map(function(m) { return { role: m.role === "user" ? "user" : "assistant", content: m.text }; }),
      sys, 400,
      function(err, reply) {
        setWizardNoteLoading(false);
        if (err || !reply) {
          setWizardNoteChat(function(p) { return p.concat([{ role: "richard", text: "Sorry, I could not connect. Try again." }]); });
          return;
        }
        var parsed = extractAllocDirective(reply);
        var applied = false;
        if (parsed.allocations) { applied = applyAllocToWizard(parsed.allocations); }
        animTripRef.current = parsed.text;
        setWizardNoteChat(function(p) {
          var next = p.concat([{ role: "richard", text: parsed.text }]);
          if (applied) next = next.concat([{ role: "system", text: "Budget split updated" }]);
          return next;
        });
      }
    );
  }

  function allocSum(list) { return list.reduce(function(s, a) { return s + (a.planned || 0); }, 0); }

  function sendTripNote(trip) {
    if (!tripNoteInput.trim() || tripNoteLoading) return;
    var msg = tripNoteInput.trim();
    setTripNoteInput("");
    var prevMsgs = tripNoteChats[trip.id] || [];
    var nc = prevMsgs.concat([{ role: "user", text: msg }]);
    setTripNoteChats(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[trip.id] = nc; return n; });
    setTripNoteLoading(true);
    var allocSummary = (trip.allocations || []).map(function(a) { return a.label + ": " + dollars(a.planned || 0) + " budgeted, " + dollars(a.spent || 0) + " spent"; }).join("; ");
    var dayInfo = tripDayInfo(trip);
    var liveContext = "";
    if (dayInfo && dayInfo.status === "live") {
      var pace = livePaceInsight(trip, dayInfo);
      liveContext = "This trip is happening RIGHT NOW - it is day " + dayInfo.dayNum + " of " + trip.days + ". " + pace.text + " Ground your answer in these live numbers and give a concrete, specific action (an exact dollar amount to cut, move, or watch), not generic travel advice. ";
    } else if (dayInfo && dayInfo.status === "upcoming") {
      liveContext = "This trip has not started yet - it begins in " + dayInfo.daysUntil + " day(s). ";
    } else if (dayInfo && dayInfo.status === "past") {
      liveContext = "This trip has already ended. ";
    }
    var sys = "You are Richard, a warm and knowledgeable personal finance and travel advisor inside the Richy app. "
      + "The user is planning a trip: " + (trip.name || "a trip") + " to " + (trip.destination || "an unspecified destination") + ". "
      + "Trip details: " + (trip.days || 0) + " days, " + (trip.style || "comfort") + " style, total budget " + dollars(trip.total || 0) + ". "
      + "Budget allocation: " + allocSummary + ". " + liveContext
      + "The user has notes, suggestions, or comments about this trip plan. Listen carefully and adjust the budget to their feedback. "
      + "You can DIRECTLY change the budget, not just describe it. When the user wants a change, give one short plain-text sentence explaining what you did, then on a new line append a directive in EXACTLY this form: @@ALLOC[{\"category\":\"Housing\",\"amount\":400},{\"category\":\"Food\",\"amount\":300}] "
      + "Only list the buckets you are changing, using whole numbers. Do not set any bucket below what is already spent there. Keep the overall total close to " + dollars(trip.total || 0) + " by also adjusting Buffer or Other when needed. Categories must be from: Flights, Housing, Food, Activities, Shopping, Transport, Other, Buffer. "
      + "Only include the @@ALLOC directive when you actually intend to change the split; for general questions just answer normally. "
      + "Be concise, warm, and practical. Always prefer specific numbers and concrete next steps over general reassurance." + RICHARD_FORMAT + " The @@ALLOC directive, when you use it, must be the very last thing in your reply.";
    callClaude(
      nc.map(function(m) { return { role: m.role === "user" ? "user" : "assistant", content: m.text }; }),
      sys, 400,
      function(err, reply) {
        setTripNoteLoading(false);
        if (err || !reply) {
          setTripNoteChats(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[trip.id] = (p[trip.id] || []).concat([{ role: "richard", text: "Sorry, I could not connect. Try again." }]); return n; });
          return;
        }
        var parsed = extractAllocDirective(reply);
        var applied = false;
        if (parsed.allocations) { applied = applyAllocToTrip(trip, parsed.allocations); }
        animTripRef.current = parsed.text;
        setTripNoteChats(function(p) {
          var n = {}; for (var k in p) n[k] = p[k];
          var thread = (p[trip.id] || []).concat([{ role: "richard", text: parsed.text }]);
          if (applied) thread = thread.concat([{ role: "system", text: "Budget split updated" }]);
          n[trip.id] = thread;
          return n;
        });
      }
    );
  }

  function localTripSplit(total, style) {
    return TRIP_CATEGORIES.map(function(c) {
      var n = Math.round(total * (c.pct[style] || 0));
      return { key: c.key, label: c.label, icon: c.icon, color: c.color, planned: n, plannedRaw: String(n), spent: 0, entries: [] };
    });
  }
  function defaultTips() {
    return [
      "Book flights and lodging early - prices climb closer to the date.",
      "Keep the buffer untouched; it is your safety net for the unexpected.",
      "Pay in local currency to dodge dynamic-conversion fees."
    ];
  }
  // Match Richard's free-form category names back onto our fixed buckets.
  function mapAllocations(arr, total) {
    var base = TRIP_CATEGORIES.map(function(c) { return { key: c.key, label: c.label, icon: c.icon, color: c.color, planned: 0, plannedRaw: "0", spent: 0, entries: [] }; });
    if (Array.isArray(arr)) {
      arr.forEach(function(a) {
        var nm = String(a.category || "").toLowerCase();
        for (var i = 0; i < base.length; i++) {
          if (nm.indexOf(base[i].key) !== -1 || nm.indexOf(base[i].label.toLowerCase()) !== -1) {
            var n = Math.max(0, Math.round(parseFloat(a.amount) || 0));
            base[i].planned = n;
            base[i].plannedRaw = String(n);
            break;
          }
        }
      });
    }
    if (allocSum(base) === 0) return localTripSplit(total, form.style || "comfort");
    return base;
  }
  function applyLocalSplit() {
    setAlloc(localTripSplit(parseFloat(form.total) || 0, form.style || "comfort"));
    setTips(defaultTips());
    setPlanning(false);
  }
  // Merge a Richard directive onto the wizard's current split, preserving any
  // buckets he didn't mention. Returns true if anything actually changed.
  function applyAllocToWizard(arr) {
    var byKey = allocDirectiveToMap(arr);
    if (!Object.keys(byKey).length) return false;
    setAlloc(function(list) {
      var base = list && list.length ? list : localTripSplit(parseFloat(form.total) || 0, form.style || "comfort");
      return base.map(function(a) {
        return byKey.hasOwnProperty(a.key) ? Object.assign({}, a, { planned: byKey[a.key], plannedRaw: String(byKey[a.key]) }) : a;
      });
    });
    return true;
  }
  // The Resplit button: re-plan the whole split with Richard, feeding him the
  // conversation so the result reflects what the user actually asked for. Falls
  // back to the local percentage split if the call fails.
  function resplitWithRichard() {
    setPlanning(true);
    setBudgetAssessment(null);
    var total = parseFloat(form.total) || 0;
    var sys = "You are Richard, a warm, expert travel-budget planner inside the Richy app. Re-split a trip budget across exactly these buckets: Flights, Housing, Food, Activities, Shopping, Transport, Other, Buffer. Honor the user's stated priorities from the conversation. Also estimate the realistic total cost for that destination, travel style, and number of days, then compare it to the user's budget. Reply with STRICT JSON only - no markdown, no emojis, no prose outside the JSON. Shape: {\"allocations\":[{\"category\":\"Flights\",\"amount\":0,\"note\":\"\"}],\"tips\":[\"\"],\"budgetAssessment\":{\"estimated\":1200,\"verdict\":\"short\",\"note\":\"One sentence comparing budget to realistic cost.\"}}. verdict must be one of: short, excess, good. The amounts are whole numbers that sum to the total budget. Use Other for any spending that does not fit the main buckets.";
    var currentSplit = alloc.map(function(a) { return a.label + " " + dollars(a.planned || 0); }).join(", ");
    var convo = wizardNoteChat.map(function(m) { return (m.role === "user" ? "User" : m.role === "system" ? "System" : "Richard") + ": " + m.text; }).join("\n");
    var usr = "Re-split a " + (form.style || "comfort") + " trip to " + (form.destination || "somewhere") + " for " + (form.days || "a few") + " days, total budget " + dollars(total) + ". "
      + (currentSplit ? "Current split: " + currentSplit + ". " : "")
      + (convo ? "Take this conversation with the user about their priorities into account:\n" + convo + "\n" : "")
      + "Produce an updated split across the buckets that reflects those priorities, 3 short practical tips, and a budget assessment.";
    callClaude([{ role: "user", content: usr }], sys, 800, function(e, text) {
      if (e || !text) { applyLocalSplit(); return; }
      try {
        var jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
        var parsed = JSON.parse(jsonStr);
        setAlloc(mapAllocations(parsed.allocations, total));
        setTips(Array.isArray(parsed.tips) && parsed.tips.length ? parsed.tips.slice(0, 4) : defaultTips());
        if (parsed.budgetAssessment && parsed.budgetAssessment.note) { setBudgetAssessment(parsed.budgetAssessment); }
        setPlanning(false);
      } catch (err) { applyLocalSplit(); }
    });
  }
  function planWithRichard() {
    setPlanning(true);
    setBudgetAssessment(null);
    var total = parseFloat(form.total) || 0;
    var sys = "You are Richard, a warm, expert travel-budget planner inside the Richy app. Split a trip budget across exactly these buckets: Flights, Housing, Food, Activities, Shopping, Transport, Other, Buffer. Also estimate the realistic total cost for that destination, travel style, and number of days, then compare it to the user's budget. Reply with STRICT JSON only - no markdown, no emojis, no prose outside the JSON. Shape: {\"allocations\":[{\"category\":\"Flights\",\"amount\":0,\"note\":\"\"}],\"tips\":[\"\"],\"budgetAssessment\":{\"estimated\":1200,\"verdict\":\"short\",\"note\":\"One sentence comparing budget to realistic cost.\"}}. verdict must be one of: short (budget is not enough), excess (budget is more than needed), good (budget is reasonable). The amounts are whole numbers that sum to the total budget. Use Other for any spending that does not fit the main buckets.";
    var usr = "Plan a " + (form.style || "comfort") + " trip to " + (form.destination || "somewhere") + " for " + (form.days || "a few") + " days, total budget " + dollars(total) + ". " + (form.notes && form.notes.trim() ? ("Notes from the traveler: " + form.notes.trim() + ". ") : "") + "Split the budget across the buckets, give 3 short practical tips, and assess whether the budget is realistic for this destination.";
    callClaude([{ role: "user", content: usr }], sys, 800, function(e, text) {
      if (e || !text) { applyLocalSplit(); return; }
      try {
        var jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
        var parsed = JSON.parse(jsonStr);
        setAlloc(mapAllocations(parsed.allocations, total));
        setTips(Array.isArray(parsed.tips) && parsed.tips.length ? parsed.tips.slice(0, 4) : defaultTips());
        if (parsed.budgetAssessment && parsed.budgetAssessment.note) {
          setBudgetAssessment(parsed.budgetAssessment);
        }
        setPlanning(false);
      } catch (err) { applyLocalSplit(); }
    });
  }
  function setAllocPlanned(key, val) {
    var n = val === "" ? 0 : Math.max(0, parseFloat(val) || 0);
    setAlloc(function(list) { return list.map(function(a) { return a.key === key ? Object.assign({}, a, { planned: n, plannedRaw: val }) : a; }); });
  }
  function removeWizardCategory(key) {
    setAlloc(function(list) { return list.filter(function(a) { return a.key !== key; }); });
  }
  function addWizardCategory(label, icon) {
    var lbl = (label || "").trim();
    if (!lbl) return;
    setAlloc(function(list) {
      var color = TRIP_CUSTOM_COLORS[list.length % TRIP_CUSTOM_COLORS.length];
      return list.concat([{ key: "custom_" + Date.now(), label: lbl, icon: icon || "box", color: color, planned: 0, plannedRaw: "0", spent: 0, entries: [] }]);
    });
    setAddCatFor(null); setAddCatForm({ label: "", icon: "box" });
  }
  function startWizard() {
    setForm({ name: "", destination: "", total: "", days: "", startDate: "", style: "comfort", icon: "plane", notes: "", wantPlan: true });
    setAlloc([]); setTips([]); setStep(1); setView("wizard");
  }
  function saveTrip() {
    var total = parseFloat(form.total) || 0;
    var trip = {
      id: Date.now(), name: form.name || "My Trip", destination: form.destination || "",
      days: parseInt(form.days, 10) || 0, startDate: form.startDate || "", style: form.style || "comfort", total: total, icon: form.icon || "plane",
      reserved: false, reserveTxId: null, advisorTips: tips, allocations: alloc, notes: form.notes || ""
    };
    props.onSaveTrips(props.trips.concat([trip]));
    setActiveId(trip.id); setView("detail");
  }
  function updateTripStartDate(tripId, val) {
    var nextTrips = props.trips.map(function(t) { return t.id === tripId ? Object.assign({}, t, { startDate: val }) : t; });
    props.onSaveTrips(nextTrips);
  }
  function openReserve(trip) {
    setReserveFor(trip.id);
    setResLabel("Trip: " + trip.name);
    setResDate(new Date().toISOString().slice(0, 10));
  }
  function reserveTrip() {
    var trip = props.trips.filter(function(t) { return t.id === reserveFor; })[0];
    if (!trip) { setReserveFor(null); return; }
    var d = resDate || new Date().toISOString().slice(0, 10);
    var lbl = resLabel.trim() || ("Trip: " + trip.name);
    var t = { id: Date.now(), type: "expense", amount: tripSpent(trip), label: lbl, catId: "c7", category: "Travel", date: d, trip: true };
    var nextTrips = props.trips.map(function(x) { return x.id === trip.id ? Object.assign({}, x, { reserved: true, reserveTxId: t.id }) : x; });
    props.onTripReserve(props.tx.concat([t]), nextTrips);
    setReserveFor(null);
  }
  function undoReserve(trip) {
    var nextTx = props.tx.filter(function(x) { return x.id !== trip.reserveTxId; });
    var nextTrips = props.trips.map(function(x) { return x.id === trip.id ? Object.assign({}, x, { reserved: false, reserveTxId: null }) : x; });
    props.onTripReserve(nextTx, nextTrips);
  }
  // Once a trip is "tracking against balance", the linked tx must always equal
  // what's actually been logged so far (not the whole planned budget) - every
  // mutation that changes total spend routes through here to keep it in sync.
  function syncTripTx(tripId, nextTrips) {
    var trip = nextTrips.filter(function(t) { return t.id === tripId; })[0];
    if (!trip || !trip.reserved || !trip.reserveTxId) { props.onSaveTrips(nextTrips); return; }
    var newSpent = tripSpent(trip);
    var nextTx = props.tx.map(function(x) { return x.id === trip.reserveTxId ? Object.assign({}, x, { amount: newSpent }) : x; });
    props.onTripReserve(nextTx, nextTrips);
  }
  function logExpense(tripId, key) {
    var amt = parseFloat(logForm.amount) || 0;
    if (amt <= 0) { setLogFor(null); return; }
    var entry = { id: Date.now(), label: logForm.label || tr("expense"), amount: amt, date: new Date().toISOString().slice(0, 10) };
    var nextTrips = props.trips.map(function(t) {
      if (t.id !== tripId) return t;
      var allocs = t.allocations.map(function(a) {
        return a.key === key ? Object.assign({}, a, { spent: round2(a.spent + amt), entries: a.entries.concat([entry]) }) : a;
      });
      return Object.assign({}, t, { allocations: allocs });
    });
    syncTripTx(tripId, nextTrips);
    setLogFor(null); setLogForm({ label: "", amount: "" });
  }
  function deleteEntry(tripId, key, entryId) {
    var nextTrips = props.trips.map(function(t) {
      if (t.id !== tripId) return t;
      var allocs = t.allocations.map(function(a) {
        if (a.key !== key) return a;
        var removed = a.entries.filter(function(e) { return e.id === entryId; })[0];
        var dec = removed ? removed.amount : 0;
        return Object.assign({}, a, { spent: Math.max(0, round2(a.spent - dec)), entries: a.entries.filter(function(e) { return e.id !== entryId; }) });
      });
      return Object.assign({}, t, { allocations: allocs });
    });
    syncTripTx(tripId, nextTrips);
  }
  // Add a user-defined budget bucket alongside the fixed TRIP_CATEGORIES ones.
  function addCategoryToTrip(tripId, label, icon) {
    var lbl = (label || "").trim();
    if (!lbl) return;
    var nextTrips = props.trips.map(function(t) {
      if (t.id !== tripId) return t;
      var color = TRIP_CUSTOM_COLORS[t.allocations.length % TRIP_CUSTOM_COLORS.length];
      var newAlloc = { key: "custom_" + Date.now(), label: lbl, icon: icon || "box", color: color, planned: 0, plannedRaw: "0", spent: 0, entries: [] };
      return Object.assign({}, t, { allocations: t.allocations.concat([newAlloc]) });
    });
    props.onSaveTrips(nextTrips);
    setAddCatFor(null); setAddCatForm({ label: "", icon: "box" });
  }
  function requestDeleteCategory(tripId, a) {
    setDelCat({ tripId: tripId, key: a.key, label: a.label, spentAmt: a.spent || 0 });
    setMoveTarget("");
  }
  function deleteCategoryOutright(tripId, key) {
    var nextTrips = props.trips.map(function(t) {
      if (t.id !== tripId) return t;
      return Object.assign({}, t, { allocations: t.allocations.filter(function(a) { return a.key !== key; }) });
    });
    syncTripTx(tripId, nextTrips);
    setDelCat(null); setMoveTarget("");
  }
  // Fold a deleted budget's logged spend/entries into another bucket instead of
  // losing track of the money.
  function moveCategoryInto(tripId, fromKey, toKey) {
    if (!toKey || fromKey === toKey) return;
    var nextTrips = props.trips.map(function(t) {
      if (t.id !== tripId) return t;
      var from = t.allocations.filter(function(a) { return a.key === fromKey; })[0];
      if (!from) return t;
      var allocs = t.allocations.filter(function(a) { return a.key !== fromKey; }).map(function(a) {
        if (a.key !== toKey) return a;
        return Object.assign({}, a, {
          planned: (a.planned || 0) + (from.planned || 0),
          spent: round2((a.spent || 0) + (from.spent || 0)),
          entries: a.entries.concat(from.entries.map(function(e) { return Object.assign({}, e, { label: e.label + " (" + from.label + ")" }); }))
        });
      });
      return Object.assign({}, t, { allocations: allocs });
    });
    syncTripTx(tripId, nextTrips);
    setDelCat(null); setMoveTarget("");
  }
  function removeTrip(trip) {
    if (trip.reserved && trip.reserveTxId) {
      props.onTripReserve(props.tx.filter(function(x) { return x.id !== trip.reserveTxId; }), props.trips.filter(function(x) { return x.id !== trip.id; }));
    } else {
      props.onSaveTrips(props.trips.filter(function(x) { return x.id !== trip.id; }));
    }
    setView("list"); setActiveId(null);
  }
  // Ending a trip just archives it into Trip History (Profile menu) - it stops
  // showing in the active trip list, but any balance already tracked against it
  // (reserved/reserveTxId) is left untouched since that money was really spent.
  function endTrip(trip) {
    var nextTrips = props.trips.map(function(t) { return t.id === trip.id ? Object.assign({}, t, { ended: true, endedAt: new Date().toISOString().slice(0, 10) }) : t; });
    props.onSaveTrips(nextTrips);
    setView("list"); setActiveId(null);
  }
  function reopenTrip(trip) {
    var nextTrips = props.trips.map(function(t) { return t.id === trip.id ? Object.assign({}, t, { ended: false, endedAt: null }) : t; });
    props.onSaveTrips(nextTrips);
  }

  var backBtnStyle = { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: T.ink2, fontSize: 14, fontFamily: UI, padding: "2px 2px 14px" };
  function backRow(label, onPress) {
    return (
      <button onClick={onPress} style={backBtnStyle}>
        <span style={{ transform: "rotate(180deg)", display: "flex" }}><SVGIcon id="chevron" size={18} color={T.ink2} /></span>
        {label}
      </button>
    );
  }

  function listView() {
    var activeTrips = props.trips.filter(function(t) { return !t.ended; });
    return (
      <div>
        {backRow(tr("goals"), props.onBack)}
        <button onClick={startWizard}
          style={{ width: "100%", border: "none", cursor: "pointer", borderRadius: 16, padding: "15px 0", marginBottom: 18, background: T.btn, color: "#fff", textShadow: "0 1px 2px rgba(42,31,77,0.35)", fontSize: 16, fontWeight: 700, fontFamily: UI, boxShadow: "0 6px 18px " + T.orangeGlow }}>
          {"+ " + tr("planNewTrip")}
        </button>
        {activeTrips.length === 0 ? (
          <Card style={{ padding: "46px 24px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <SVGIcon id="plane" size={24} color={T.orange} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{tr("noTrips")}</div>
            <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>{tr("noTripsSub")}</div>
          </Card>
        ) : activeTrips.map(function(t) {
          var spent = tripSpent(t);
          var pct = t.total > 0 ? Math.min(100, Math.round((spent / t.total) * 100)) : 0;
          return (
            <Card key={t.id} style={{ marginBottom: 14, overflow: "hidden" }}>
              <div onClick={function() { setActiveId(t.id); setView("detail"); }} style={{ padding: "18px 18px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <SVGIcon id={t.icon || "plane"} size={20} color={T.orange} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{t.name}</div>
                      <div style={{ fontSize: 13, color: T.ink3, marginTop: 2 }}>{(t.destination || "") + (t.days ? (" - " + t.days + "d") : "")}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(t.total)}</div>
                    {t.reserved && <div style={{ fontSize: 11, fontWeight: 600, color: T.orange, marginTop: 2 }}>{tr("reserved")}</div>}
                  </div>
                </div>
                <ProgressBar value={spent} max={t.total || 1} color={spent > t.total ? T.red : T.orange} h={6} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: T.ink3 }}>{dollars(spent) + " " + tr("spentOf") + " " + dollars(t.total)}</span>
                  <span style={{ fontSize: 11, color: T.ink3 }}>{pct + "%"}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  function wizardView() {
    var total = parseFloat(form.total) || 0;
    var sum = allocSum(alloc);
    var styleOpts = [{ k: "budget", l: tr("styleBudget") }, { k: "comfort", l: tr("styleComfort") }, { k: "luxury", l: tr("styleLuxury") }];
    return (
      <div>
        {backRow(step === 2 ? tr("planning") : tr("trips"), function() { if (step === 2) { setStep(1); } else { setView("list"); } })}
        {step === 1 ? (
          <Card style={{ padding: "18px 18px 20px" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 14, fontFamily: DISP, letterSpacing: "-0.02em" }}>{tr("planNewTrip")}</div>
            <FormRow label={tr("tripName")} value={form.name} onChange={function(e) { setField("name", e.target.value); }} />
            <FormRow label={tr("destination")} value={form.destination} onChange={function(e) { setField("destination", e.target.value); }} />
            <FormRow label={tr("tripBudget")} value={form.total} onChange={function(e) { setField("total", e.target.value); }} type="number" />
            <FormRow label={tr("tripDays")} value={form.days} onChange={function(e) { setField("days", e.target.value); }} type="number" />
            <FormRow label="Start date (optional)" value={form.startDate} onChange={function(e) { setField("startDate", e.target.value); }} type="date" />
            <FormRow label="Notes for Richard (optional)" value={form.notes} onChange={function(e) { setField("notes", e.target.value); }} placeholder="anything he should know - must-dos, style, who's coming" last={true} />
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI, margin: "14px 0 8px" }}>{tr("travelStyle")}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {styleOpts.map(function(s) {
                var on = form.style === s.k;
                return (
                  <button key={s.k} onClick={function() { setField("style", s.k); }}
                    style={{ flex: 1, border: on ? ("2px solid " + T.orange) : "2px solid rgba(0,0,0,0.08)", background: on ? T.orangeDim : "#fff", color: on ? T.orange : T.ink2, borderRadius: 13, padding: "11px 0", fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer" }}>
                    {s.l}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI, margin: "16px 0 8px" }}>{tr("tripIcon")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TRIP_ICONS.map(function(ic) {
                var on = (form.icon || "plane") === ic;
                return (
                  <button key={ic} onClick={function() { setField("icon", ic); }}
                    style={{ width: 44, height: 44, border: on ? ("2px solid " + T.orange) : "2px solid rgba(0,0,0,0.08)", background: on ? T.orangeDim : "#fff", borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                    <SVGIcon id={ic} size={20} color={on ? T.orange : T.ink2} />
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI, margin: "16px 0 8px" }}>Want Richard to plan the budget?</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ v: true, l: "Yes, plan it" }, { v: false, l: "No, I'll do it" }].map(function(o) {
                var on = form.wantPlan === o.v;
                return (
                  <button key={String(o.v)} onClick={function() { setField("wantPlan", o.v); }}
                    style={{ flex: 1, border: on ? ("2px solid " + T.orange) : "2px solid rgba(0,0,0,0.08)", background: on ? T.orangeDim : "#fff", color: on ? T.orange : T.ink2, borderRadius: 13, padding: "11px 0", fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer" }}>
                    {o.l}
                  </button>
                );
              })}
            </div>
            <BigBtn label={tr("next")} disabled={!form.name || total <= 0} onPress={function() { setStep(2); if (form.wantPlan) { planWithRichard(); } else { applyLocalSplit(); } }} />
          </Card>
        ) : (
          <Card style={{ padding: "18px 18px 20px" }}>
            {planning ? (
              <div style={{ padding: "34px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{tr("richardPlanning")}</div>
                <div style={{ fontSize: 13, color: T.ink3, marginTop: 5 }}>{tr("richardPlanningSub")}</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 4, fontFamily: DISP, letterSpacing: "-0.02em" }}>{tr("tripSplit")}</div>
                {budgetAssessment && (function() {
                  var isShort = budgetAssessment.verdict === "short";
                  var isExcess = budgetAssessment.verdict === "excess";
                  var bg = isShort ? "rgba(255,59,48,0.08)" : isExcess ? "rgba(255,149,0,0.10)" : "rgba(52,199,89,0.10)";
                  var color = isShort ? T.red : isExcess ? "#B87400" : "#1A8C3A";
                  var label = isShort ? "Not enough" : isExcess ? "More than needed" : "On target";
                  return (
                    <div style={{ background: bg, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontFamily: UI }}>{label + (budgetAssessment.estimated ? " — Richard estimates " + dollars(budgetAssessment.estimated) : "")}</div>
                      <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5, fontFamily: UI }}>{budgetAssessment.note}</div>
                    </div>
                  );
                })()}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1, fontSize: 13, color: sum > total ? T.red : T.ink3 }}>{tr("allocated") + " " + dollars(sum) + " / " + dollars(total) + (sum > total ? (" (" + tr("overBy") + " " + dollars(sum - total) + ")") : "")}</div>
                  <div style={{ display: "flex", alignItems: "center", background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: "5px 10px", gap: 2 }}>
                    <span style={{ fontSize: 12, color: T.ink3 }}>{_currency.sym}</span>
                    <input type="number" value={form.total} onChange={function(e) { setField("total", e.target.value); }}
                      style={{ width: 72, border: "none", background: "none", outline: "none", fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: UI, textAlign: "right", padding: 0 }} />
                  </div>
                  <button onClick={resplitWithRichard} title="Re-split with Richard, using your conversation below" style={{ background: T.orangeDim, border: "none", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: T.orange, cursor: "pointer", fontFamily: UI, whiteSpace: "nowrap" }}>Resplit</button>
                </div>
                {alloc.map(function(a, idx) {
                  return (
                    <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: idx < alloc.length - 1 ? ("0.5px solid " + T.sep) : "none" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: a.color + "1F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <SVGIcon id={a.icon} size={18} color={a.color} />
                      </div>
                      <span style={{ flex: 1, fontSize: 14, color: T.ink, fontWeight: 500 }}>{a.label}</span>
                      <div style={{ display: "flex", alignItems: "center", background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: "6px 10px" }}>
                        <span style={{ fontSize: 13, color: T.ink3, marginRight: 2 }}>{_currency.sym}</span>
                        <input type="number" value={a.plannedRaw !== undefined ? a.plannedRaw : String(a.planned)} onChange={function(e) { setAllocPlanned(a.key, e.target.value); }}
                          style={{ width: 64, border: "none", background: "none", outline: "none", fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: UI, textAlign: "right", padding: 0 }} />
                      </div>
                      <button onClick={function() { removeWizardCategory(a.key); }} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex", flexShrink: 0 }}>
                        <SVGIcon id="trash" size={14} color={T.ink3} />
                      </button>
                    </div>
                  );
                })}
                <button onClick={function() { setAddCatFor("wizard"); setAddCatForm({ label: "", icon: "box" }); }}
                  style={{ width: "100%", marginTop: 10, background: "none", border: "1px dashed " + T.sep, borderRadius: 12, padding: "10px 0", color: T.orange, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: UI }}>
                  {"+ " + tr("addCategory")}
                </button>
                {tips.length > 0 && (
                  <div style={{ marginTop: 16, background: T.orangeDim, borderRadius: 14, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: UI }}>{tr("tripTips")}</div>
                    {tips.map(function(tp, i) {
                      return (
                        <div key={i} style={{ fontSize: 13, color: T.ink, lineHeight: 1.5, marginBottom: i < tips.length - 1 ? 7 : 0, display: "flex", gap: 8 }}>
                          <span style={{ color: T.orange, fontWeight: 700 }}>-</span><span>{tp}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop: 20, borderTop: "0.5px solid " + T.sep, paddingTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontFamily: UI }}>Notes for Richard</div>
                  <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 10, fontFamily: UI }}>Comments or suggestions about this budget split</div>
                  {wizardNoteChat.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                      {wizardNoteChat.map(function(m, i) {
                        if (m.role === "system") {
                          return (
                            <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, background: T.greenDim, color: T.green, borderRadius: 999, padding: "4px 11px", fontSize: 11.5, fontWeight: 700, fontFamily: UI }}>
                                <SVGIcon id="check" size={11} color={T.green} />{m.text}
                              </div>
                            </div>
                          );
                        }
                        var isUser = m.role === "user";
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                            <div style={{ maxWidth: "82%", background: isUser ? T.orange : "rgba(0,0,0,0.05)", borderRadius: 12, padding: "8px 12px", fontSize: 13, color: isUser ? "#fff" : T.ink, lineHeight: 1.5, fontFamily: UI }}>
                              {isUser ? m.text : <TypeReveal text={m.text} size={13} animate={m.role === "richard" && m.text === animTripRef.current} onDone={function() { animTripRef.current = null; }} />}
                            </div>
                          </div>
                        );
                      })}
                      {wizardNoteLoading && <RichardThinking size={13} radius={12} />}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={wizardNoteInput}
                      onChange={function(e) { setWizardNoteInput(e.target.value); }}
                      onKeyDown={function(e) { if (e.key === "Enter" && !wizardNoteLoading) sendWizardNote(); }}
                      placeholder="e.g., Can we spend more on food?"
                      style={{ flex: 1, border: "none", background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: "9px 12px", fontSize: 13.5, fontFamily: UI, outline: "none", color: T.ink }}
                    />
                    <button onClick={sendWizardNote} disabled={!wizardNoteInput.trim() || wizardNoteLoading}
                      style={{ background: wizardNoteInput.trim() && !wizardNoteLoading ? T.btn : "rgba(0,0,0,0.1)", border: "none", borderRadius: 10, width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 17 }}>
                      ^
                    </button>
                  </div>
                </div>
                <BigBtn label={tr("saveTrip")} disabled={total <= 0} onPress={saveTrip} />
              </div>
            )}
          </Card>
        )}
        {addCategoryOverlay(function(label, icon) { addWizardCategory(label, icon); })}
      </div>
    );
  }
  // Shared "add a budget category" overlay, used by both the wizard split and
  // the live trip detail view - onAdd differs (wizard mutates local alloc state,
  // detail mutates the saved trip).
  function addCategoryOverlay(onAdd) {
    return (
      <Overlay open={!!addCatFor} onClose={function() { setAddCatFor(null); }} title={tr("addCategory")}>
        <FormRow label={tr("name")} value={addCatForm.label} onChange={function(e) { setAddCatForm(function(p) { return Object.assign({}, p, { label: e.target.value }); }); }} last={true} />
        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI, margin: "14px 0 8px" }}>{tr("tripIcon")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {TRIP_ICONS.map(function(ic) {
            var on = addCatForm.icon === ic;
            return (
              <button key={ic} onClick={function() { setAddCatForm(function(p) { return Object.assign({}, p, { icon: ic }); }); }}
                style={{ width: 40, height: 40, border: on ? ("2px solid " + T.orange) : "2px solid rgba(0,0,0,0.08)", background: on ? T.orangeDim : "#fff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                <SVGIcon id={ic} size={18} color={on ? T.orange : T.ink2} />
              </button>
            );
          })}
        </div>
        <BigBtn label={tr("addCategory")} disabled={!addCatForm.label.trim()} onPress={function() { onAdd(addCatForm.label, addCatForm.icon); }} />
      </Overlay>
    );
  }

  function detailView(trip) {
    var spent = tripSpent(trip);
    var left = trip.total - spent;
    var plannedTotal = trip.allocations.reduce(function(s, a) { return s + (a.planned || 0); }, 0);
    var afterBudgets = trip.total - plannedTotal;
    var dayInfo = tripDayInfo(trip);
    var pace = dayInfo && dayInfo.status === "live" ? livePaceInsight(trip, dayInfo) : null;
    return (
      <div>
        {backRow(tr("trips"), function() { setView("list"); setActiveId(null); })}
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 22, padding: "22px 22px", background: T.heroBg, boxShadow: T.heroShadow, marginBottom: 16 }}>
          <div style={{ position: "absolute", top: -70, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle," + T.heroGlow1 + ",transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 48, height: 48, borderRadius: 15, background: "rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SVGIcon id={trip.icon || "plane"} size={24} color={T.heroInk} />
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: T.heroMut }}>{(trip.destination || "Trip") + (trip.days ? (" - " + trip.days + "d") : "")}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.heroInk, letterSpacing: "-0.02em", marginTop: 4 }}>{trip.name}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: T.heroInk }}>{_currency.sym}</span>
              <input type="number" value={getDetailEdit(trip.id, "total", trip.total)}
                onChange={function(e) { setDetailEdit(trip.id, "total", e.target.value); }}
                onBlur={function(e) { updateTripTotal(trip.id, e.target.value); clearDetailEdit(trip.id, "total"); }}
                style={{ fontSize: 34, fontWeight: 700, color: T.heroInk, letterSpacing: "-0.03em", background: "none", border: "none", outline: "none", fontFamily: UI, width: "100%", padding: 0, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 12, borderTop: "0.5px solid " + T.heroSep, paddingTop: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.heroMut }}>{tr("spent")}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.heroInk, marginTop: 3 }}>{dollars(spent)}</div>
              </div>
              <div style={{ width: "0.5px", background: T.heroSep }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.heroMut }}>{tr("leftToSpend")}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: left < 0 ? T.heroNeg : T.heroInk, marginTop: 3 }}>{dollars(left)}</div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <input type="date" value={trip.startDate || ""} onChange={function(e) { updateTripStartDate(trip.id, e.target.value); }}
                style={{ fontSize: 12, color: T.heroMut, background: "none", border: "none", outline: "none", fontFamily: UI, padding: 0 }} />
              {!trip.startDate && <span style={{ fontSize: 11, color: T.heroMut, marginLeft: 6 }}>{"- set a start date for day-by-day pacing"}</span>}
              {dayInfo && dayInfo.status === "upcoming" && <span style={{ fontSize: 11, color: T.heroMut, marginLeft: 6 }}>{"- starts in " + dayInfo.daysUntil + "d"}</span>}
              {dayInfo && dayInfo.status === "past" && <span style={{ fontSize: 11, color: T.heroMut, marginLeft: 6 }}>{"- trip ended"}</span>}
            </div>
          </div>
        </div>

        {pace && (
          <Card style={{ padding: "14px 16px", marginBottom: 16, borderLeft: "3px solid " + (pace.verdict === "over" ? T.red : pace.verdict === "under" ? T.green : T.orange) }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: pace.verdict === "over" ? T.red : pace.verdict === "under" ? T.green : T.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: UI }}>{"Richard's live read"}</div>
            <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5, fontFamily: UI }}>{pace.text}</div>
          </Card>
        )}

        {trip.reserved ? (
          <Card style={{ padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: T.greenDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <SVGIcon id="check" size={18} color={T.green} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{tr("reserved")}</div>
              <button onClick={function() { undoReserve(trip); }} style={{ background: "none", border: "none", padding: 0, marginTop: 2, color: T.orange, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: UI }}>{tr("undoReserve")}</button>
            </div>
          </Card>
        ) : (
          <Card style={{ padding: "16px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5, marginBottom: 12 }}>{tr("deductExplain")}</div>
            <BigBtn label={tr("deductFromBalance")} onPress={function() { openReserve(trip); }} />
          </Card>
        )}

        <Card style={{ overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: "0.5px solid " + T.sep }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: UI }}>Ask Richard</div>
            <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 3, fontFamily: UI }}>{pace ? "He can see today's numbers - ask how you're doing." : "Notes, questions, or changes to this trip plan"}</div>
          </div>
          {(tripNoteChats[trip.id] || []).length === 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 14px 4px" }}>
              {["How am I doing?", "What should I cut?", "Am I over budget?"].map(function(q) {
                return (
                  <button key={q} onClick={function() { setTripNoteInput(q); }}
                    style={{ background: "rgba(0,0,0,0.04)", border: "none", borderRadius: 999, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, color: T.ink2, cursor: "pointer", fontFamily: UI }}>
                    {q}
                  </button>
                );
              })}
            </div>
          )}
          {(tripNoteChats[trip.id] || []).length > 0 && (
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {(tripNoteChats[trip.id] || []).map(function(m, i) {
                if (m.role === "system") {
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, background: T.greenDim, color: T.green, borderRadius: 999, padding: "4px 11px", fontSize: 11.5, fontWeight: 700, fontFamily: UI }}>
                        <SVGIcon id="check" size={11} color={T.green} />{m.text}
                      </div>
                    </div>
                  );
                }
                var isUser = m.role === "user";
                return (
                  <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "82%", background: isUser ? T.orange : "rgba(0,0,0,0.05)", borderRadius: 12, padding: "8px 12px", fontSize: 13.5, color: isUser ? "#fff" : T.ink, lineHeight: 1.5, fontFamily: UI }}>
                      {isUser ? m.text : <TypeReveal text={m.text} size={13.5} animate={m.role === "richard" && m.text === animTripRef.current} onDone={function() { animTripRef.current = null; }} />}
                    </div>
                  </div>
                );
              })}
              {tripNoteLoading && <RichardThinking size={13.5} radius={12} />}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, padding: "10px 12px" }}>
            <input
              value={tripNoteInput}
              onChange={function(e) { setTripNoteInput(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter" && !tripNoteLoading) sendTripNote(trip); }}
              placeholder="e.g., Can we cut the hotel budget?"
              style={{ flex: 1, border: "none", background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: "9px 12px", fontSize: 13.5, fontFamily: UI, outline: "none", color: T.ink }}
            />
            <button onClick={function() { sendTripNote(trip); }} disabled={!tripNoteInput.trim() || tripNoteLoading}
              style={{ background: tripNoteInput.trim() && !tripNoteLoading ? T.btn : "rgba(0,0,0,0.1)", border: "none", borderRadius: 10, width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 17 }}>
              ^
            </button>
          </div>
        </Card>

        {trip.allocations.map(function(a) {
          var over = a.spent > a.planned && a.planned > 0;
          return (
            <Card key={a.key} style={{ marginBottom: 12, overflow: "hidden" }}>
              <div style={{ padding: "15px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: a.color + "1F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <SVGIcon id={a.icon} size={18} color={a.color} />
                  </div>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: T.ink }}>{a.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: over ? T.red : T.ink2 }}>{dollars(a.spent) + " / " + _currency.sym}</span>
                    <input type="number" value={getDetailEdit(trip.id, "alloc_" + a.key, a.planned)}
                      onChange={function(e) { setDetailEdit(trip.id, "alloc_" + a.key, e.target.value); }}
                      onBlur={function(e) { updateTripAllocPlanned(trip.id, a.key, e.target.value); clearDetailEdit(trip.id, "alloc_" + a.key); }}
                      style={{ width: 58, border: "none", background: "rgba(0,0,0,0.05)", borderRadius: 7, outline: "none", fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: UI, textAlign: "right", padding: "3px 6px", boxSizing: "border-box" }} />
                  </div>
                  <button onClick={function() { requestDeleteCategory(trip.id, a); }} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex", flexShrink: 0 }}>
                    <SVGIcon id="trash" size={14} color={T.ink3} />
                  </button>
                </div>
                <ProgressBar value={a.spent} max={a.planned || 1} color={over ? T.red : a.color} h={6} />
                {a.entries.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    {a.entries.map(function(e) {
                      var entryConfirmKey = trip.id + "_" + a.key + "_" + e.id;
                      var confirming = delEntryConfirm === entryConfirmKey;
                      return (
                        <div key={e.id} style={{ padding: "5px 0" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 13, color: T.ink2 }}>{e.label}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{dollars(e.amount)}</span>
                              <button onClick={function() { setDelEntryConfirm(confirming ? null : entryConfirmKey); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}><SVGIcon id="trash" size={14} color={T.ink3} /></button>
                            </div>
                          </div>
                          {confirming && (
                            <div style={{ marginTop: 6, background: "rgba(220,50,50,0.07)", borderRadius: 10, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ flex: 1, fontSize: 12, color: T.ink2 }}>{"Delete this expense?"}</span>
                              <button onClick={function() { deleteEntry(trip.id, a.key, e.id); setDelEntryConfirm(null); }}
                                style={{ border: "none", cursor: "pointer", fontFamily: UI, fontSize: 12.5, fontWeight: 700, padding: "6px 12px", borderRadius: 8, background: T.red, color: "#fff" }}>
                                Delete
                              </button>
                              <button onClick={function() { setDelEntryConfirm(null); }}
                                style={{ border: "none", cursor: "pointer", fontFamily: UI, fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.07)", color: T.ink2 }}>
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={function() { setLogFor({ tripId: trip.id, key: a.key, label: a.label }); setLogForm({ label: "", amount: "" }); }}
                  style={{ width: "100%", marginTop: 10, background: T.orangeDim, border: "none", borderRadius: 10, padding: "9px 0", color: T.orange, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: UI }}>
                  {"+ " + tr("logExpense")}
                </button>
              </div>
            </Card>
          );
        })}

        <button onClick={function() { setAddCatFor(trip.id); setAddCatForm({ label: "", icon: "box" }); }}
          style={{ width: "100%", marginBottom: 16, background: "none", border: "1px dashed " + T.sep, borderRadius: 14, padding: "12px 0", color: T.orange, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: UI }}>
          {"+ " + tr("addCategory")}
        </button>

        <div style={{ position: "relative", overflow: "hidden", borderRadius: 22, padding: "20px 22px", background: T.heroBg, boxShadow: T.heroShadow, marginBottom: 16 }}>
          <div style={{ position: "absolute", bottom: -70, left: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle," + T.heroGlow1 + ",transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: T.heroMut }}>{tr("leftAfterBudgets")}</div>
            <div style={{ fontSize: 34, fontWeight: 700, color: afterBudgets < 0 ? T.heroNeg : T.heroInk, letterSpacing: "-0.03em", marginTop: 8 }}>{(afterBudgets < 0 ? "-" : "") + dollars(afterBudgets)}</div>
            <div style={{ fontSize: 12.5, color: T.heroMut, marginTop: 6, lineHeight: 1.5 }}>{dollars(trip.total) + " " + tr("tripBudget").toLowerCase() + " - " + dollars(plannedTotal) + " " + tr("allocated").toLowerCase()}</div>
          </div>
        </div>

        {trip.advisorTips && trip.advisorTips.length > 0 && (
          <Card style={{ padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: UI }}>{tr("tripTips")}</div>
            {trip.advisorTips.map(function(tp, i) {
              return (
                <div key={i} style={{ fontSize: 13, color: T.ink, lineHeight: 1.55, marginBottom: i < trip.advisorTips.length - 1 ? 8 : 0, display: "flex", gap: 8 }}>
                  <span style={{ color: T.orange, fontWeight: 700 }}>-</span><span>{tp}</span>
                </div>
              );
            })}
          </Card>
        )}

        {trip.ended ? (
          <button onClick={function() { reopenTrip(trip); }}
            style={{ width: "100%", background: "none", border: "1px solid " + T.sep, color: T.ink2, fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer", borderRadius: 14, padding: "12px 0", marginBottom: 10 }}>
            {"Reopen trip"}
          </button>
        ) : (
          <button onClick={function() { endTrip(trip); }}
            style={{ width: "100%", background: "none", border: "1px solid " + T.sep, color: T.ink2, fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer", borderRadius: 14, padding: "12px 0", marginBottom: 10 }}>
            {"End trip"}
          </button>
        )}

        <button onClick={function() { removeTrip(trip); }}
          style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer", padding: "8px 0 4px" }}>
          {tr("deleteTrip")}
        </button>

        <Overlay open={!!logFor} onClose={function() { setLogFor(null); }} title={logFor ? (tr("logExpenseTitle") + " - " + logFor.label) : tr("logExpenseTitle")}>
          <FormRow label={tr("txLabel")} value={logForm.label} onChange={function(e) { setLogField("label", e.target.value); }} />
          <FormRow label={tr("amount")} value={logForm.amount} onChange={function(e) { setLogField("amount", e.target.value); }} type="number" last={true} />
          <BigBtn label={tr("logExpense")} disabled={!logForm.amount} onPress={function() { if (logFor) logExpense(logFor.tripId, logFor.key); }} />
        </Overlay>

        <Overlay open={!!reserveFor} onClose={function() { setReserveFor(null); }} title={tr("deductFromBalance")}>
          <FormRow label={tr("name")} value={resLabel} onChange={function(e) { setResLabel(e.target.value); }} />
          <FormRow label={tr("date")} value={resDate} onChange={function(e) { setResDate(e.target.value); }} type="date" last={true} />
          <BigBtn label={tr("deductFromBalance")} onPress={reserveTrip} />
        </Overlay>

        {addCategoryOverlay(function(label, icon) { addCategoryToTrip(trip.id, label, icon); })}

        <Overlay open={!!delCat} onClose={function() { setDelCat(null); setMoveTarget(""); }} title={delCat ? ("Delete " + delCat.label) : "Delete budget"}>
          {delCat && delCat.spentAmt > 0 ? (
            <div>
              <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5, marginBottom: 14 }}>
                {"This budget already has " + dollars(delCat.spentAmt) + " logged against it. Move it into another budget, or delete it outright."}
              </div>
              {trip.allocations.filter(function(a) { return a.key !== delCat.key; }).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI, marginBottom: 8 }}>Move into</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    {trip.allocations.filter(function(a) { return a.key !== delCat.key; }).map(function(a) {
                      var on = moveTarget === a.key;
                      return (
                        <button key={a.key} onClick={function() { setMoveTarget(a.key); }}
                          style={{ border: on ? ("2px solid " + T.orange) : "2px solid rgba(0,0,0,0.08)", background: on ? T.orangeDim : "#fff", color: on ? T.orange : T.ink2, borderRadius: 12, padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: UI }}>
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                  <BigBtn label="Move" disabled={!moveTarget} onPress={function() { moveCategoryInto(delCat.tripId, delCat.key, moveTarget); }} />
                </div>
              )}
              <button onClick={function() { deleteCategoryOutright(delCat.tripId, delCat.key); }}
                style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer", padding: "8px 0 4px" }}>
                {"Delete outright"}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.5, marginBottom: 16 }}>
                {"Are you sure you want to delete " + (delCat ? delCat.label : "this budget") + "? This cannot be undone."}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={function() { setDelCat(null); }}
                  style={{ flex: 1, border: "none", cursor: "pointer", fontFamily: UI, fontSize: 14, fontWeight: 600, padding: "11px 0", borderRadius: 12, background: "rgba(0,0,0,0.06)", color: T.ink2 }}>
                  Cancel
                </button>
                <button onClick={function() { if (delCat) deleteCategoryOutright(delCat.tripId, delCat.key); }}
                  style={{ flex: 1, border: "none", cursor: "pointer", fontFamily: UI, fontSize: 14, fontWeight: 700, padding: "11px 0", borderRadius: 12, background: T.red, color: "#fff" }}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </Overlay>
      </div>
    );
  }

  var activeTrip = null;
  for (var ti = 0; ti < props.trips.length; ti++) { if (props.trips[ti].id === activeId) { activeTrip = props.trips[ti]; break; } }
  if (view === "detail" && activeTrip) return detailView(activeTrip);
  if (view === "wizard") return wizardView();
  return listView();
}

function callClaude(messages, system, maxTokens, callback) {
  var apiUrl = (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "data:" || location.protocol === "file:") ? "https://richy-mgkl.vercel.app/api/chat" : "/api/chat";
  fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: messages,
      system: system,
      maxTokens: maxTokens || 800,
    }),
  }).then(function(res) {
    return res.text().then(function(raw) {
      var data;
      try { data = JSON.parse(raw); } catch(e) {
        callback(new Error("Bad JSON from server: " + raw.slice(0, 100)), null); return;
      }
      if (data.error) {
        callback(new Error(data.error.type + ": " + data.error.message), null); return;
      }
      if (!data.content || !Array.isArray(data.content)) {
        callback(new Error("Unexpected response: " + JSON.stringify(data).slice(0, 100)), null); return;
      }
      var text = "";
      for (var i = 0; i < data.content.length; i++) {
        if (data.content[i].type === "text") text += data.content[i].text;
      }
      callback(null, text.trim());
    });
  }).catch(function(err) { callback(new Error("Fetch failed: " + err.message), null); });
}

// Big-Decision CFO: the user poses a high-stakes money question ("can I afford
// this?", "debt vs invest?") and Richard returns a structured VERDICT run against
// their REAL numbers (the same ctx the advisor uses) - the call, the key figure,
// the tradeoff, and what would make it a yes. Decisions can be tracked and
// revisited. A parse/API failure shows a graceful retry rather than fake numbers.
function BigDecisions(props) {
  var _open = useState(false);     var open = _open[0];        var setOpen = _open[1];
  var _q = useState("");           var q = _q[0];              var setQ = _q[1];
  var _loading = useState(false);  var loading = _loading[0];  var setLoading = _loading[1];
  var _verdict = useState(null);   var verdict = _verdict[0];  var setVerdict = _verdict[1];
  var _active = useState(null);    var active = _active[0];    var setActive = _active[1];   // tracked decision being viewed
  var _err = useState("");         var err = _err[0];          var setErr = _err[1];
  var inputRef = useRef(null);

  var decisions = props.decisions || [];

  function verdictStyle(v) {
    if (v === "yes") return { color: T.green, bg: T.greenDim, label: "YES" };
    if (v === "no") return { color: T.red, bg: "rgba(224,48,48,0.10)", label: "NO" };
    if (v === "stretch") return { color: T.gold, bg: T.goldGlow, label: "STRETCH" };
    return { color: T.orange, bg: T.orangeDim, label: "WAIT" };
  }

  function reset() { setQ(""); setVerdict(null); setErr(""); setActive(null); }
  function openNew() { reset(); setOpen(true); }
  function openTracked(d) { setErr(""); setActive(d); setVerdict(d.verdict); setQ(d.question); setOpen(true); }

  function ask(question) {
    var text = (question || q || "").trim();
    if (!text || loading) return;
    setQ(text); setErr(""); setLoading(true); setVerdict(null); setActive(null);
    var custom = (props.richardInstructions && props.richardInstructions.trim()) ? ("CONTEXT FROM THE USER (follow any instructions; treat background as things to keep in mind):\n" + props.richardInstructions + "\n\n") : "";
    var langLine = (props.lang && props.lang !== "en") ? (" Every string value must be written entirely in " + (LANGUAGE_NAMES[props.lang] || "English") + ".") : "";
    var system = custom + "You are Richard, a calm, sharp, honest personal finance advisor inside the Richy app. The user faces a real, specific money decision. Using their ACTUAL financial data, give a clear PERSONAL verdict run against their real cash flow, savings, goals and net worth - never generic advice. If it is a no or only a stretch, say so plainly and kindly. Return ONLY valid JSON, no markdown, no emojis, exactly this shape: {\"verdict\":\"yes|no|stretch|wait\",\"verdictLabel\":\"short label e.g. Yes, you can afford it\",\"headline\":\"one warm sentence with the core reason\",\"keyNumber\":\"the single most important figure e.g. $340/mo or 4 months\",\"keyNumberLabel\":\"what that figure means in 2 to 4 words\",\"reasoning\":[\"2 to 4 short bullets, each tied to a real number\"],\"tradeoff\":\"one sentence on what they give up or risk\",\"toMakeYes\":\"the single most impactful change that would make it work; empty string if already a clear yes\",\"confidence\":\"high|medium|low\"}." + langLine;
    var content = "Decision: " + text + "\n\nMy financial data:\n" + (props.ctx || "(no data provided)") + (props.coreProblem ? ("\n\nMy main financial challenge: " + props.coreProblem) : "");
    callClaude([{ role: "user", content: content }], system, 650, function(e, raw) {
      setLoading(false);
      if (e || !raw) { setErr("I couldn't run that just now - check your connection and try again."); return; }
      try {
        var s = raw.indexOf("{"), en = raw.lastIndexOf("}");
        var obj = JSON.parse(s !== -1 && en !== -1 ? raw.slice(s, en + 1) : raw);
        if (!obj.verdict) throw new Error("no verdict");
        setVerdict(obj);
      } catch (e2) { setErr("Richard's answer came back garbled - try rephrasing the decision."); }
    });
  }

  function track() {
    if (!verdict) return;
    var d = { id: Date.now(), question: q, verdict: verdict, createdDate: new Date().toISOString().slice(0, 10), status: "open" };
    if (props.onSaveDecisions) props.onSaveDecisions(decisions.concat([d]));
    setActive(d);
  }
  function untrack(d) {
    if (props.onSaveDecisions) props.onSaveDecisions(decisions.filter(function(x) { return x.id !== d.id; }));
    setOpen(false);
  }
  function setStatus(d, status) {
    if (props.onSaveDecisions) props.onSaveDecisions(decisions.map(function(x) { return x.id === d.id ? Object.assign({}, x, { status: status }) : x; }));
    setActive(Object.assign({}, d, { status: status }));
  }

  var isTracked = !!(active && decisions.some(function(x) { return x.id === active.id; }));
  var pillBase = { fontFamily: UI, fontSize: 12.5, fontWeight: 700, borderRadius: 9, padding: "7px 12px", cursor: "pointer", border: "none" };
  var primaryBtn = Object.assign({}, pillBase, { background: T.orange, color: "#fff" });
  var ghostBtn = Object.assign({}, pillBase, { background: "rgba(0,0,0,0.05)", color: T.ink2 });
  var cardShadow = "0 1px 1px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05)";
  var templates = [
    { label: "Can I afford...?", seed: "Can I afford " },
    { label: "Debt vs invest?", seed: "Should I pay off my debt or invest my extra money?" },
    { label: "Is this a good deal?", seed: "Is this a good deal: " },
    { label: "Worth taking?", seed: "I have an offer on the table - is it worth taking? " }
  ];

  function verdictCard(vd) {
    var vs = verdictStyle(vd.verdict);
    return (
      <div style={{ background: T.card, borderRadius: 16, padding: "16px 16px 18px", boxShadow: cardShadow, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: vs.color, background: vs.bg, padding: "5px 11px", borderRadius: 9 }}>{vs.label}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, flex: 1 }}>{vd.verdictLabel}</span>
        </div>
        <div style={{ fontSize: 14.5, color: T.ink, lineHeight: 1.5, marginTop: 12 }}>{vd.headline}</div>
        {vd.keyNumber && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginTop: 14, padding: "12px 14px", background: vs.bg, borderRadius: 13 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: vs.color, letterSpacing: "-0.02em" }}>{vd.keyNumber}</span>
            <span style={{ fontSize: 12.5, color: T.ink3, fontWeight: 600 }}>{vd.keyNumberLabel || ""}</span>
          </div>
        )}
        {(vd.reasoning || []).length > 0 && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
            {vd.reasoning.map(function(r, i) {
              return (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: vs.color, fontWeight: 700, flexShrink: 0 }}>-</span>
                  <span style={{ flex: 1, fontSize: 13, color: T.ink2, lineHeight: 1.45 }}>{r}</span>
                </div>
              );
            })}
          </div>
        )}
        {vd.tradeoff && (
          <div style={{ marginTop: 13 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>The tradeoff</div>
            <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.45 }}>{vd.tradeoff}</div>
          </div>
        )}
        {vd.toMakeYes && (
          <div style={{ marginTop: 13, padding: "11px 13px", borderRadius: 12, background: "rgba(200,103,58,0.06)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>To make it a yes</div>
            <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.45 }}>{vd.toMakeYes}</div>
          </div>
        )}
        {vd.confidence && (
          <div style={{ fontSize: 11, color: T.ink3, marginTop: 12, textTransform: "capitalize" }}>{"Confidence: " + vd.confidence}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 11px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 3, height: 15, borderRadius: 2, background: T.orange }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>Big Decisions</span>
        </div>
        {decisions.length > 0 && <span style={{ fontSize: 12, color: T.ink3 }}>{decisions.length + " tracked"}</span>}
      </div>

      <button onClick={openNew} style={{ width: "100%", textAlign: "left", cursor: "pointer", fontFamily: UI, display: "flex", alignItems: "center", gap: 13, padding: "15px 16px", borderRadius: 18, background: T.card, border: "none", boxShadow: cardShadow }}>
        <CatBadge icon="goals" color={T.orange} size={40} soft={true} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>Facing a big money call?</div>
          <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>Get Richard's verdict against your real numbers</div>
        </div>
        <SVGIcon id="chevron" size={18} color={T.ink3} />
      </button>

      {decisions.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {decisions.slice().reverse().map(function(d) {
            var vs = verdictStyle(d.verdict && d.verdict.verdict);
            return (
              <button key={d.id} onClick={function() { openTracked(d); }} style={{ width: "100%", textAlign: "left", cursor: "pointer", fontFamily: UI, display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: 14, background: T.card, border: "none", boxShadow: cardShadow, opacity: d.status === "resolved" ? 0.6 : 1 }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.05em", color: vs.color, background: vs.bg, padding: "4px 8px", borderRadius: 7, flexShrink: 0 }}>{vs.label}</span>
                <span style={{ flex: 1, fontSize: 13, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.question}</span>
                {d.status === "resolved" && <span style={{ fontSize: 11, color: T.ink3, flexShrink: 0 }}>done</span>}
              </button>
            );
          })}
        </div>
      )}

      <Overlay open={open} onClose={function() { setOpen(false); }} title="Big Decisions">
        <textarea ref={inputRef} value={q} onChange={function(e) { setQ(e.target.value); }} placeholder="Describe the decision - e.g. Can I afford a $1,500/mo apartment?"
          style={{ width: "100%", boxSizing: "border-box", minHeight: 70, resize: "none", border: "none", borderRadius: 13, padding: "12px 14px", fontSize: 14.5, fontFamily: UI, color: T.ink, background: "rgba(0,0,0,0.04)", outline: "none", lineHeight: 1.45 }} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
          {templates.map(function(t) {
            return <button key={t.label} onClick={function() { setQ(t.seed); if (inputRef.current) inputRef.current.focus(); }} style={Object.assign({}, ghostBtn, { fontSize: 12 })}>{t.label}</button>;
          })}
        </div>

        <button onClick={function() { ask(); }} disabled={loading || !q.trim()} style={{ width: "100%", marginTop: 12, background: (loading || !q.trim()) ? "rgba(0,0,0,0.10)" : T.btn, color: (loading || !q.trim()) ? T.ink3 : "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 15.5, fontFamily: UI, fontWeight: 700, cursor: (loading || !q.trim()) ? "default" : "pointer", boxShadow: (loading || !q.trim()) ? "none" : "0 6px 20px " + T.orangeGlow }}>
          {loading
            ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Richard is weighing it<ThinkingDots size={4} color={T.ink3} /></span>
            : "Get Richard's verdict"}
        </button>

        {loading && (
          <AIWorking compact style={{ marginTop: 12 }} expectedMs={7000}
            steps={["Running your real numbers", "Weighing the trade-off", "Writing the verdict"]} />
        )}

        {err && <div style={{ fontSize: 12.5, color: T.red, background: "rgba(224,48,48,0.08)", borderRadius: 10, padding: "9px 12px", marginTop: 12 }}>{err}</div>}

        {verdict && verdictCard(verdict)}

        {verdict && !loading && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {!isTracked && <button onClick={track} style={primaryBtn}>Track this decision</button>}
            {isTracked && active && active.status !== "resolved" && <button onClick={function() { setStatus(active, "resolved"); }} style={primaryBtn}>Mark resolved</button>}
            {isTracked && active && active.status === "resolved" && <button onClick={function() { setStatus(active, "open"); }} style={ghostBtn}>Reopen</button>}
            {isTracked && active && <button onClick={function() { untrack(active); }} style={ghostBtn}>Remove</button>}
          </div>
        )}

        <div style={{ fontSize: 11, color: T.ink3, lineHeight: 1.5, margin: "14px 2px 0", textAlign: "center" }}>
          Richard weighs this against your real numbers, but it's guidance, not a guarantee - you make the call.
        </div>
      </Overlay>
    </div>
  );
}

function Advisor(props) {
  // Seed from the App-level cache so re-entering the tab restores the last
  // analysis without a fresh (token-burning) API call. useState reads the prop
  // only on mount, which is exactly when the tab opens.
  var _a = useState(props.cachedAnalysis || null);
  var advice = _a[0]; var setAdvice = _a[1];
  var _l = useState(false);
  var loading = _l[0]; var setLoading = _l[1];
  var _em = useState("");
  var errMsg = _em[0]; var setErrMsg = _em[1];
  var _c = useState([]);
  var chat = _c[0]; var setChat = _c[1];
  var _in = useState("");
  var input = _in[0]; var setInput = _in[1];
  var _cl = useState(false);
  var chatLoading = _cl[0]; var setChatLoading = _cl[1];
  // Index of the just-arrived assistant message: only that one streams in via
  // TypeReveal; history and remounts render instantly.
  var animMsgRef = useRef(-1);
  var chatScrollRef = useRef(null);
  function pinChatScroll() {
    var el = chatScrollRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 90) el.scrollTop = el.scrollHeight;
  }
  useEffect(function() {
    var el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length, chatLoading]);
  // Previous-chats history overlay. The live `chat` above is the current session;
  // archived sessions come in via props.chats and persist through props.onSaveChats.
  var _hist = useState(false);
  var historyOpen = _hist[0]; var setHistoryOpen = _hist[1];
  var _pa = useState(null);
  var pendingAction = _pa[0]; var setPendingAction = _pa[1];
  var _pu = useState(null);
  var pendingUpdates = _pu[0]; var setPendingUpdates = _pu[1];
  var inputRef = useRef(null);
  // Swipeable analysis hero: a native scroll-snap carousel that mirrors the
  // Overview hero banner (dots + throttled onScroll page sync).
  var _apg = useState(0); var page = _apg[0]; var setPage = _apg[1];
  var advScrollRef = useRef(null);
  var advScrollTimer = useRef(null);
  var advCountRef = useRef(0); // live panel count, set during render of the hero

  // Grow the ask box to fit wrapped text (capped), and snap it back when cleared.
  function autoGrow(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 132) + "px";
  }
  useEffect(function() { autoGrow(inputRef.current); }, [input]);

  // Keep the latest live chat (and the save handler) in refs so the unmount
  // cleanup below can archive it without re-binding the effect every render.
  var liveChatRef = useRef(chat);
  var chatsRef = useRef(props.chats);
  var saveChatsRef = useRef(props.onSaveChats);
  useEffect(function() { liveChatRef.current = chat; }, [chat]);
  useEffect(function() { chatsRef.current = props.chats; }, [props.chats]);
  useEffect(function() { saveChatsRef.current = props.onSaveChats; }, [props.onSaveChats]);
  // On leaving the Advisor tab, fold the live conversation into the archive so it
  // shows up under Past chats next time (the live chat state itself is transient).
  useEffect(function() {
    return function() {
      var live = liveChatRef.current;
      var saveChats = saveChatsRef.current;
      if (!live || live.length === 0 || !saveChats) return;
      var firstUser = live.filter(function(m) { return m.role === "user"; })[0];
      var title = firstUser ? firstUser.text : live[0].text;
      if (title.length > 60) title = title.slice(0, 57) + "...";
      var session = { id: Date.now(), date: new Date().toISOString(), title: title, messages: live };
      saveChats([session].concat(chatsRef.current || []));
    };
  }, []);

  // Inject the scrollbar-hide + fade-in CSS once (same .rc-hero-scroll the
  // Overview uses, re-declared here so the advisor tab works standalone).
  useEffect(function() {
    if (document.getElementById("rc-adv-anim")) return;
    var st = document.createElement("style");
    st.id = "rc-adv-anim";
    st.textContent = ".rc-hero-scroll{scrollbar-width:none;-ms-overflow-style:none;}.rc-hero-scroll::-webkit-scrollbar{display:none;width:0;height:0;}@keyframes rcFadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}";
    document.head.appendChild(st);
  }, []);
  // Snap back to the first panel whenever a fresh analysis arrives.
  useEffect(function() {
    setPage(0);
    var el = advScrollRef.current;
    if (el) el.scrollLeft = 0;
  }, [advice]);
  // If the live panel count shrinks below the current page (e.g. a household
  // partner edits data while you're on a later panel), pull the page back in
  // range and re-sync the scroll position. Runs every render; only acts when out
  // of range, so it converges without looping.
  useEffect(function() {
    var max = advCountRef.current - 1;
    if (max >= 0 && page > max) {
      setPage(max);
      var el = advScrollRef.current;
      if (el) el.scrollTo({ left: max * el.clientWidth, behavior: "smooth" });
    }
  });
  function advGoPage(i) {
    setPage(i);
    var el = advScrollRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }
  function advOnScroll(e) {
    var el = e.currentTarget;
    if (advScrollTimer.current) clearTimeout(advScrollTimer.current);
    advScrollTimer.current = setTimeout(function() {
      var w = el.clientWidth || 1;
      var i = Math.round(el.scrollLeft / w);
      if (i !== page) setPage(i);
    }, 100);
  }

  var cats = props.categories || [];
  var ymA = curMonth();
  // Cash-flow is this month (matches the dashboard); net worth is all-time.
  var income = props.tx.filter(function(t) { return t.type === "income" && !isOpening(t) && !isTransfer(t) && inMonth(t, ymA); }).reduce(function(s, t) { return s + t.amount; }, 0);
  var expense = props.tx.filter(function(t) { return t.type === "expense" && !isTransfer(t) && !isTrip(t) && inMonth(t, ymA); }).reduce(function(s, t) { return s + t.amount; }, 0);
  // Net worth = main balance (all-time tx) + every savings pot + business cash.
  var netWorth = props.tx.reduce(function(s, t) { return s + (t.type === "income" ? t.amount : -t.amount); }, 0) + savingsTotal(props.savings || []) + businessTotal(props.businesses || []);
  var savings = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  var topCats = cats.map(function(c) { return { name: c.name, spent: catSpend(c) }; }).filter(function(c) { return c.spent > 0; }).sort(function(a, b) { return b.spent - a.spent; }).slice(0, 5);
  var budgetLines = props.budgets.map(function(b) {
    var c = catById(cats, b.catId) || catByName(cats, b.category) || { name: b.category || "?" };
    var sp = catSpend(c);
    return c.name + " $" + sp + "/$" + b.limit;
  });
  var coreProblem = (props.onboardingData && props.onboardingData.coreProblem) || "";

  // Build detailed budget analysis
  var budgetAnalysis = [];
  var totalBudgeted = 0;
  var totalActual = 0;
  var budgetsOnTrack = 0;
  var budgetsOver = 0;
  (props.budgets || []).forEach(function(b) {
    var c = catById(cats, b.catId) || catByName(cats, b.category) || { name: b.category || "?" };
    var spent = catSpend(c);
    var limit = b.limit || 0;
    totalBudgeted += limit;
    totalActual += spent;
    var status = spent > limit ? "OVER by $" + Math.round(spent - limit) : "on track, $" + Math.round(limit - spent) + " left";
    budgetAnalysis.push(c.name + ": $" + Math.round(spent) + "/$" + limit + " (" + status + ")");
    if (spent <= limit) budgetsOnTrack++; else budgetsOver++;
  });

  // All spending categories
  var allCats = cats.map(function(c) {
    return { name: c.name, spent: catSpend(c) };
  }).filter(function(c) { return c.spent > 0; }).sort(function(a, b) { return b.spent - a.spent; });

  // Goal progress
  var goalProgress = (props.goals || []).map(function(g) {
    var pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0;
    return g.name + ": $" + Math.round(g.saved) + "/$" + g.target + " (" + pct + "%)";
  });

  var ctx = "=== USER FINANCIAL DATA ===\n"
    + "Name: " + props.username + "\n"
    + "Primary challenge: " + (coreProblem || "general budgeting") + "\n\n"
    + "=== THIS MONTH'S CASH FLOW ===\n"
    + "Income: $" + Math.round(income) + "\n"
    + "Total Spent: $" + Math.round(expense) + "\n"
    + "Savings Rate: " + savings + "%\n"
    + "Net this month: $" + Math.round(income - expense) + "\n\n"
    + "=== BUDGETS (Total: $" + totalBudgeted + " budgeted, $" + Math.round(totalActual) + " spent) ===\n"
    + (budgetAnalysis.length > 0
      ? budgetAnalysis.join("\n") + "\nBudgets on track: " + budgetsOnTrack + "/" + (props.budgets || []).length + ", over budget: " + budgetsOver
      : "No budgets set") + "\n\n"
    + "=== SPENDING BY CATEGORY (All time this month) ===\n"
    + (allCats.length > 0
      ? allCats.map(function(c) { return c.name + ": $" + Math.round(c.spent); }).join("\n")
      : "No spending yet") + "\n\n"
    + "=== FINANCIAL GOALS ===\n"
    + (goalProgress.length > 0
      ? goalProgress.join("\n")
      : "No goals set") + "\n\n"
    + "=== ALL-TIME STATS ===\n"
    + "Net Worth (all-time): $" + Math.round(netWorth) + "\n"
    + "Personalized Plan: " + (props.plan ? props.plan.slice(0, 200) + "..." : "not yet created")
    + ((props.businesses || []).length
      ? "\n\n=== BUSINESSES (managed in Savings -> Business Account, Richard is their CFO) ===\n"
        + props.businesses.map(bizContextLine).join("\n")
      : "");

  function catSpend(c) {
    return props.tx.filter(function(t) { return t.type === "expense" && !isTrip(t) && inMonth(t, ymA) && (t.catId === c.id || t.category === c.name); }).reduce(function(s, t) { return s + t.amount; }, 0);
  }

  function localAnalysis() {
    var topName = "Other";
    var topVal = 0;
    for (var ci = 0; ci < cats.length; ci++) {
      var cv = catSpend(cats[ci]);
      if (cv > topVal) { topVal = cv; topName = cats[ci].name; }
    }
    var score = 50;
    if (savings >= 20) score = 85;
    else if (savings >= 10) score = 70;
    else if (savings >= 0) score = 55;
    else score = 30;
    var label = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : "Needs Work";
    var insights = [];
    if (savings >= 20) {
      insights.push({ type: "strength", title: "Strong Savings Rate", body: "You are saving " + savings + "% of your income, well above the recommended 20%. This builds long-term wealth fast." });
    } else if (savings >= 0) {
      insights.push({ type: "tip", title: "Grow Your Savings Rate", body: "You save " + savings + "% right now. Aim for 20% by trimming one or two recurring expenses." });
    } else {
      insights.push({ type: "warning", title: "Spending Exceeds Income", body: "You are spending more than you earn this period. Review your largest categories and cut back where possible." });
    }
    if (topVal > 0) {
      insights.push({ type: "tip", title: "Watch " + topName + " Spending", body: topName + " is your biggest expense at " + dollars(topVal) + ". Small reductions here have the largest impact on your budget." });
    }
    insights.push({ type: "strength", title: "You Are Tracking", body: "Simply recording your transactions puts you ahead of most people. Consistency is the foundation of financial health." });
    var quotes = [
      { quote: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
      { quote: "It is not about how much money you make, but how much money you keep.", author: "Robert Kiyosaki" },
      { quote: "Wealth is not about having a lot of money. It is about having a lot of options.", author: "Chris Rock" },
      { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
      { quote: "Compound interest is the eighth wonder of the world. He who understands it earns it.", author: "Albert Einstein" },
      { quote: "A part of all you earn is yours to keep. Pay yourself first.", author: "George Clason" },
      { quote: "Someone is sitting in the shade today because someone planted a tree a long time ago.", author: "Warren Buffett" },
      { quote: "The goal is not to be rich. The goal is to be free.", author: "T. Harv Eker" },
      { quote: "Financial peace is not the acquisition of stuff. It is learning to live on less than you make.", author: "Dave Ramsey" },
      { quote: "You must gain control over your money or the lack of it will forever control you.", author: "Dave Ramsey" },
      { quote: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
      { quote: "Wealth is the ability to fully experience life.", author: "Henry David Thoreau" },
      { quote: "It is not the man who has too little, but the man who craves more, who is poor.", author: "Seneca" },
      { quote: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
      { quote: "Savings without a mission is garbage. Your money must have a purpose.", author: "Clarissa Explains It All" },
      { quote: "A wise man should have money in his head, but not in his heart.", author: "Jonathan Swift" },
      { quote: "The more you learn, the more you earn.", author: "Warren Buffett" },
      { quote: "Never spend your money before you have earned it.", author: "Thomas Jefferson" },
      { quote: "Wealth is not his who has it, but his who enjoys it.", author: "Benjamin Franklin" },
      { quote: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
      { quote: "The habit of saving is itself an education; it fosters every virtue.", author: "T.T. Munger" },
      { quote: "Time is your most valuable asset. Invest it wisely.", author: "Morgan Housel" },
      { quote: "Spend less than you make, save the difference, and be patient.", author: "Morgan Housel" },
      { quote: "Risk is what is left over when you think you have thought of everything.", author: "Carl Richards" },
      { quote: "The best time to invest was yesterday. The second best time is today.", author: "Proverb" }
    ];
    var tips = [
      { title: "The 50/30/20 Rule", body: "Put 50% of income toward needs, 30% toward wants, 20% toward savings. Morgan Housel says savings rate matters more than investment returns early on." },
      { title: "Pay Yourself First", body: "The Richest Man in Babylon: keep 10% of everything you earn. Automate this transfer on payday before you can spend it." },
      { title: "The Latte Factor", body: "Small daily purchases of $5-$10 compound to $75,000+ over 30 years. Audit your recurring small expenses quarterly." },
      { title: "Avoid Lifestyle Inflation", body: "The Millionaire Next Door found most millionaires kept lifestyle flat when income rose, investing the difference instead." },
      { title: "Build Your Emergency Fund First", body: "Dave Ramsey and Ramit Sethi both say: 3-6 months expenses in cash before any investing. This prevents derailing long-term plans." }
    ];
    var q = quotes[Math.floor(Math.random() * quotes.length)];
    var tip = tips[Math.floor(Math.random() * tips.length)];
    return {
      score: score,
      scoreLabel: label,
      headline: savings >= 20 ? "Great work, your finances are on a strong footing." : savings >= 0 ? "You are on track, with room to save more." : "Time to rein in spending and rebuild your cushion.",
      insights: insights,
      expertQuote: q,
      webInsight: tip
    };
  }

  function Richard(question) {
    var q = question.toLowerCase().trim();
    var topCat = cats.map(function(c) {
      return { name: c.name, val: catSpend(c) };
    }).sort(function(a, b) { return b.val - a.val; })[0];
    var monthlySpend = expense;
    var surplus = income - expense;

    function has() {
      for (var i = 0; i < arguments.length; i++) {
        if (q.indexOf(arguments[i]) !== -1) return true;
      }
      return false;
    }

    // ===== SMALL TALK =====
    if (q === "hi" || q === "hey" || q === "yo" || q === "hello" || has("hello ", "hi ", "hey ", "good morning", "good evening")) {
      return "Hey! I'm your finance advisor. Ask me anything - saving more, whether your budget's healthy, investing, debt, emergency funds, buying a house or car, retirement, taxes, credit, or how the wealthy actually manage money. What's on your mind?";
    }
    if (has("what can you do", "what do you know", "how can you help", "what are you")) {
      return "I analyze your spending and advise on: saving strategies, budgeting, investing, debt payoff, emergency funds, retirement and FIRE, big purchases, taxes, credit scores, raising money-smart kids, and the principles behind real wealth. You're at " + dollars(income) + " income, " + dollars(expense) + " spent, " + savings + "% saved. What should we dig into?";
    }
    if (has("thank", "appreciate", "helpful", "great advice")) {
      return "Anytime. Wealth is built through small consistent decisions - keep checking in and adjusting. What else can I help with?";
    }

    // ===== EMOTIONAL / INTENT (checked early, before keyword topics) =====
    if (has("stressed", "anxious", "worried", "scared", "overwhelmed", "depressed", "feel broke", "feeling broke", "paycheck to paycheck", "drowning")) {
      return "I hear you - money stress is heavy, and you're not alone in it. Let's make it smaller and concrete. First, list your absolute essentials (housing, food, utilities, minimum debt payments). Everything above that is where we find breathing room. Even setting aside $10 builds the habit and the sense of control. What's the one bill or expense weighing on you most right now? We'll start there.";
    }
    if (has("hate budget", "budgeting is hard", "budgeting is confusing", "so confusing", "too confusing", "dont understand", "don't understand", "too complicated", "hate this", "this is hard", "im lost", "i'm lost")) {
      return "Totally fair - most budgeting advice is needlessly complicated. Here's the whole thing in one line: spend less than you earn, and put the difference somewhere it grows. That's it. Start by just tracking what you spend for one week here - no judgment, no rules. Awareness alone changes behavior. Want me to set up a dead-simple plan for you?";
    }
    if (has("just paid off", "paid it off", "reached my goal", "hit my goal", "i did it", "im proud", "i'm proud", "i saved", "finally saved")) {
      return "That's genuinely worth celebrating - well done. Progress like this compounds, both in your balance and your confidence. The key now is to lock in the habit: keep the same routine going so this becomes your normal, not a one-time win. What's the next goal you want to aim at?";
    }
    if (has("loan for a vacation", "loan for vacation", "borrow for a vacation", "finance a vacation", "loan for a trip", "loan for a holiday", "borrow for a trip")) {
      return "I'd be cautious here. Borrowing for a vacation means paying interest on a memory - the trip ends but the debt lingers, often at high rates. A better path: open a separate savings 'sinking fund', decide your budget and date, and divide it into monthly chunks. Want $3,000 in 10 months? That's $300/month, and you arrive debt-free. The trip will feel a lot better when it's already paid for.";
    }

    // ===== COMPOUND INTEREST (must come before 'interest'/'debt') =====
    if (has("compound interest", "compounding", "compound")) {
      return "Compound interest is earning returns on your returns - Einstein supposedly called it the eighth wonder of the world. Example: $10,000 at 8% becomes ~$100,000 in 30 years without adding a cent. The two levers are TIME and RATE, which is why starting early matters more than starting big. Every year you wait costs you the largest, final compounding years.";
    }

    // ===== ROTH IRA / 401k / specific accounts =====
    if (has("roth", "ira", "401k", "403b", "retirement account", "tax advantaged")) {
      return "A Roth IRA lets you invest after-tax money that then grows and is withdrawn completely tax-free in retirement - ideal if you expect to earn more later. A traditional 401k/IRA gives you the tax break now instead. Priority order: (1) 401k up to any employer match (free money), (2) max a Roth IRA, (3) back to maxing the 401k, (4) taxable brokerage. In 2026 the IRA limit is around $7,000/year.";
    }

    // ===== SPECIFIC STOCKS / CRYPTO =====
    if (has("what stock", "which stock", "stock should", "stock to buy", "pick stocks", "individual stock")) {
      return "I can't pick individual stocks for you - and honestly, neither should most people try. Buffett's advice for nearly everyone: a low-cost S&P 500 index fund beats ~90% of professional stock pickers over a decade and you never have to guess. Picking single stocks is closer to gambling unless you're prepared to research deeply and accept big swings.";
    }
    if (has("crypto", "bitcoin", "ethereum", "btc", "nft", "altcoin")) {
      return "Crypto is highly volatile and speculative - it can swing 50%+ in weeks. The common-sense rule from most advisors: never put in more than you can afford to lose entirely, and treat it as a small slice (under 5-10%) of an otherwise diversified portfolio. Build your emergency fund and index-fund base first; crypto is the spice, not the meal.";
    }

    // ===== TAX =====
    if (has("tax", "taxes", "deduction", "irs", "write off", "refund")) {
      return "The biggest legal way to cut taxes is using tax-advantaged accounts: 401k and traditional IRA contributions lower your taxable income today, while a Roth grows tax-free for later. Beyond that: track deductible expenses if you're self-employed, hold investments over a year for lower capital-gains rates, and never turn down a raise over tax fears - you only ever pay the higher rate on the dollars above each bracket, never your whole income.";
    }

    // ===== CREDIT SCORE =====
    if (has("credit score", "credit report", "fico", "improve credit", "build credit", "credit rating")) {
      return "Five things drive your credit score: (1) payment history - never miss a due date, set autopay, (2) utilization - keep balances under 30% of your limit, ideally under 10%, (3) age of accounts - don't close old cards, (4) credit mix, (5) new inquiries - don't open many at once. The fastest wins are always paying on time and paying down card balances.";
    }

    // ===== STUDENT LOANS vs INVEST =====
    if (has("student loan", "loans or invest", "pay off or invest", "payoff or invest")) {
      return "Compare the interest rate to expected investment returns. If your student loan is above ~6-7%, paying it off is a guaranteed return that's hard to beat - prioritize it. If it's low (say under 5%), you can make minimums and invest the rest, since the market has historically returned ~8-10% long term. Either way: grab any 401k employer match first - that's an instant 100% return nothing else matches.";
    }

    // ===== KIDS & MONEY =====
    if (has("kids", "children", "teach my", "child about money", "allowance")) {
      return "Teaching kids money: (1) give them a small allowance they manage themselves - real decisions teach faster than lectures, (2) use three jars: spend, save, give, (3) let them feel the sting of running out, (4) match their savings to demonstrate compound growth, (5) be open about your own money choices. The Richest Man in Babylon and Rich Dad Poor Dad are both about lessons passed down - model the behavior you want.";
    }

    // ===== NET WORTH BY AGE / AM I BEHIND =====
    if (has("net worth", "behind", "my age", "for my age", "should i have saved", "no savings")) {
      return "A common benchmark (from The Millionaire Next Door): expected net worth = age x pretax income / 10. So at 30 earning $50k, roughly $150k. But don't panic if you're behind - the variable that matters most is your savings RATE going forward, not where you are today. Someone starting at 25 with $0 who saves 20% will out-finish someone who started richer but saves nothing. Start now; time is the asset.";
    }

    // ===== IMPULSE BUYING =====
    if (has("impulse", "stop spending", "overspend", "tempt", "shopping habit", "buying things")) {
      return "Beating impulse spending: (1) the 24-hour rule - wait a day on anything non-essential over $50; most urges pass, (2) delete saved cards from shopping apps so buying takes effort, (3) unsubscribe from store emails and unfollow brands, (4) ask 'is this a need or a want?' out loud, (5) give every dollar a job in your budget so there's no 'free' money to splurge. Friction is your friend.";
    }

    // ===== VACATION / SAVING FOR A GOAL =====
    if (has("vacation", "save for", "saving for", "trip", "wedding", "buy a", "big purchase", "sinking fund")) {
      return "Save for a specific goal with a 'sinking fund': decide the total and the deadline, then divide. Want $3,000 for a trip in 10 months? That's $300/month - automate it into a separate savings account so it's untouchable. Seeing a dedicated balance grow is far more motivating than a vague 'general savings,' and it keeps the splurge guilt-free because you planned for it.";
    }

    // ===== RAISE / EXTRA MONEY / SURPLUS / WHAT TO DO WITH MONEY =====
    if (has("got a raise", "just got a raise", "pay raise", "promotion", "more money now")) {
      return "Congrats! The wealth-building move is to avoid lifestyle inflation - the #1 trap from The Millionaire Next Door. Bank at least half of every raise before you adjust your spending. If your raise is $500/month, send $250+ straight to savings or investing automatically. You were living fine before; let the gap become wealth instead of a bigger apartment.";
    }
    if (has("extra money", "extra cash", "surplus", "leftover", "what should i do with", "what to do with", "spare money", "found money", "bonus")) {
      var order = "When you have extra money, follow this proven order:\n\n1. High-interest debt (credit cards above ~15%) - pay it off, it's a guaranteed return.\n2. Emergency fund - 3 to 6 months of expenses in a high-yield savings account.\n3. Employer 401k match - free money, never leave it.\n4. Invest the rest - max a Roth IRA, then low-cost index funds.";
      if (surplus > 0) order += "\n\nYou're running a surplus of about " + dollars(surplus) + " - that's exactly the fuel for these steps.";
      return order;
    }

    // ===== SAVINGS RATE HEALTH =====
    if (has("savings rate", "saving rate", "am i saving enough", "doing well", "doing good", "healthy", "good rate", "on track", "how am i doing")) {
      if (savings >= 30) return "Your savings rate of " + savings + "% is outstanding - elite territory. The FIRE movement targets 40%+, but above 30% you're building wealth fast. The key now: make sure that surplus is invested, not sitting in cash losing value to inflation.";
      if (savings >= 20) return "A " + savings + "% savings rate is excellent - beating the 20% standard from the 50/30/20 rule. Morgan Housel argues your savings rate matters more than your investment returns early on, so you're doing the most important thing right. Next: put that surplus to work in index funds.";
      if (savings >= 10) return "At " + savings + "% you're ahead of most people, but there's room to hit 20%. Look at " + (topCat && topCat.val > 0 ? topCat.name + " (" + dollars(topCat.val) + ", your biggest expense)" : "your largest category") + " and try trimming 10-15%.";
      if (savings > 0) return "You're saving " + savings + "%, which is positive - good start. The target is 20%. Your fastest lever is your biggest expense: " + (topCat && topCat.val > 0 ? topCat.name + " at " + dollars(topCat.val) : "your top category") + ". Cutting it by a fifth would move your rate noticeably.";
      return "Right now you're spending everything you earn or more. The Richest Man in Babylon's first rule: pay yourself first - keep at least 10% before any spending. Automate a small payday transfer to savings, then attack your largest expense.";
    }

    // ===== SAVE MORE =====
    if (has("save more", "how to save", "how do i save", "save money", "spend less", "cut spending", "reduce spending", "cut back", "lower my expenses")) {
      return "Three high-impact moves to save more:\n\n1. Attack your biggest category - " + (topCat && topCat.val > 0 ? topCat.name + " is your largest at " + dollars(topCat.val) + ". A 20% cut saves " + dollars(topCat.val * 0.2) + "/period." : "find your top expense and trim it first.") + "\n\n2. Automate it - auto-transfer to savings on payday so you pay yourself first. You can't spend what you don't see.\n\n3. The 24-hour rule - wait a day before any non-essential buy over $50. Most impulse purchases evaporate.";
    }

    // ===== IRREGULAR INCOME =====
    if (has("irregular income", "freelance", "self employed", "variable income", "commission", "gig", "uneven income", "1099")) {
      return "Budgeting on irregular income: (1) figure out your bare-minimum monthly need - that's your baseline, (2) in good months, don't spend the surplus - park it in a buffer account, (3) pay yourself a steady 'salary' from that buffer so lean months feel normal, (4) save aggressively when work is flush. Set aside ~25-30% of each payment for taxes since they're not withheld. The buffer is everything.";
    }

    // ===== BUDGET / 50-30-20 =====
    if (has("budget", "50/30/20", "50 30 20", "allocate", "how much should i spend", "spending plan")) {
      if (income > 0) return "The 50/30/20 rule on your " + dollars(income) + " income:\n\n- Needs (rent, food, utilities): " + dollars(Math.round(income * 0.5)) + "\n- Wants (dining, fun): " + dollars(Math.round(income * 0.3)) + "\n- Savings and debt: " + dollars(Math.round(income * 0.2)) + "\n\nYou're spending " + dollars(expense) + " total now. Check the Budgets tab to spot categories over their limit - that's where to focus.";
      return "The 50/30/20 framework: 50% of income to needs, 30% to wants, 20% to savings and debt. Ramit Sethi's twist: spend lavishly on the few things you love, cut hard everywhere else. Add income data and I'll give you exact dollar targets.";
    }

    // ===== EMERGENCY FUND =====
    if (has("emergency", "rainy day", "safety net", "cushion", "lose my job", "job loss")) {
      var ef = monthlySpend > 0 ? monthlySpend : 1000;
      return "An emergency fund is your foundation - Dave Ramsey and Ramit Sethi both say build it before investing. Target 3-6 months of expenses. Based on your spending of " + dollars(monthlySpend) + ", aim for " + dollars(ef * 3) + " to " + dollars(ef * 6) + ". Keep it in a high-yield savings account: liquid, separate, earning a little interest.";
    }

    // ===== INVEST (general - after specific account/stock/crypto checks) =====
    if (has("invest", "index fund", "etf", "portfolio", "stock market", "grow my money", "where to put money")) {
      var base = "Investing basics from people who've done it:\n\n1. Buffett's pick for most people: a low-cost S&P 500 index fund - it beats ~90% of active managers over 10 years.\n2. Order of operations: employer 401k match first (free money), then Roth IRA, then taxable brokerage.\n3. Time in the market beats timing the market - start now, stay consistent, don't panic-sell.";
      if (surplus > 0) base += "\n\nYou have ~" + dollars(surplus) + " surplus - that's the fuel, once your emergency fund is set.";
      return base;
    }

    // ===== DEBT =====
    if (has("debt", "loan", "credit card", "owe", "pay off", "in the red", "minimum payment")) {
      return "Two proven debt strategies:\n\n- Avalanche (saves most money): pay minimums on all, attack the highest-interest debt first.\n- Snowball (Dave Ramsey, best for motivation): pay the smallest balance first for quick wins and momentum.\n\nNon-negotiable: clear any credit card debt above ~15% interest before investing - no investment reliably beats that guaranteed return from killing the interest.";
    }

    // ===== HOUSE =====
    if (has("house", "home", "mortgage", "down payment", "property", "real estate")) {
      return "Buying a home: aim for 20% down to avoid PMI, and keep total housing under 28% of gross income (the classic lender rule). Kiyosaki's caution: your primary home is a liability until it earns income - house hacking (renting a room or unit) flips that. Save the down payment in a separate high-yield account so it doesn't mix with daily money.";
    }

    // ===== RENT VS BUY =====
    if (has("rent or buy", "rent vs buy", "renting or buying", "should i rent")) {
      return "Rent vs buy isn't just about 'throwing money away' on rent. Buying makes sense if you'll stay 5+ years (transaction costs are huge), you have 20% down plus an emergency fund, and the mortgage fits under 28% of income. Renting wins if you value flexibility, the local price-to-rent ratio is high, or you'd be stretched thin. Run the numbers for YOUR city - in many markets renting and investing the difference beats owning.";
    }

    // ===== CAR =====
    if (has("car", "vehicle", "auto loan", "lease", "truck")) {
      var carNote = "The Millionaire Next Door found most millionaires drive used cars bought with cash. A new car loses 20%+ of value the moment you drive off the lot. Rule of thumb: buy used, pay cash if you can, keep total car costs (payment, insurance, gas) under 15% of take-home. A lease is usually the most expensive option long-term.";
      var m = q.match(/\$?\s*([0-9][0-9,]{3,})/);
      if (m) {
        var price = parseFloat(m[1].replace(/,/g, ""));
        var maxCar = income * 12 * 0.35;
        carNote += "\n\nOn a $" + price.toLocaleString() + " car: a common ceiling is ~35% of annual income on a vehicle. At your income that's about " + dollars(maxCar) + ", so " + (price <= maxCar ? "it's within a reasonable range - just favor used and avoid a long loan." : "that's on the high side - consider a cheaper or used option to protect your savings rate.");
      }
      return carNote;
    }

    // ===== RETIREMENT / FIRE =====
    if (has("retire", "fire", "financial independence", "pension", "how much to retire", "retirement")) {
      var annual = monthlySpend * 12;
      var fireNum = annual > 0 ? annual * 25 : 0;
      var msg = "Financial independence runs on the 4% rule: you can safely withdraw 4% of your portfolio yearly, so your target number is ~25x annual expenses.";
      if (fireNum > 0) msg += " At your current spending that's roughly " + dollars(fireNum) + ". A common savings guideline is 15% of income for a normal retirement; higher gets you there sooner - save 50% and you could retire in ~17 years regardless of income.";
      return msg;
    }

    // ===== INCOME / SIDE HUSTLE / NEGOTIATE =====
    if (has("make more money", "earn more", "side hustle", "side income", "second job", "increase income", "negotiate", "ask for a raise", "higher salary")) {
      return "Naval Ravikant's core idea: you won't get rich renting out your time - build or earn equity in something that scales. Practical moves: (1) negotiate your salary, the highest-ROI hour you'll ever spend - even a 10% bump compounds for your whole career, (2) build 'specific knowledge' that's hard to train, (3) start a side income that can grow without your hours. Cutting costs has a floor; earning has no ceiling.";
    }

    // ===== INFLATION =====
    if (has("inflation", "cost of living", "prices going up", "money worth less")) {
      return "Inflation quietly erodes cash sitting idle - that's why the wealthy hold appreciating assets, not stacks of cash. Keep only your emergency fund in cash (in a high-yield account that partly keeps pace), and invest the rest so your money grows faster than prices rise. Historically, stocks have been one of the best long-term inflation hedges.";
    }

    // ===== FINANCIAL ADVISOR =====
    if (has("financial advisor", "should i hire", "wealth manager", "planner", "professional help")) {
      return "Most people don't need to pay for one early on - the basics (spend less than you earn, kill high-interest debt, index funds, max tax-advantaged accounts) you can do yourself. If you do hire one, choose a fee-only fiduciary (legally bound to act in your interest) and avoid anyone earning commissions on what they sell you. Fees compound against you: 1% a year can cost six figures over a lifetime.";
    }

    // ===== BUDGETING APP / TOOLS =====
    if (has("budgeting app", "best app", "tool", "track spending", "software")) {
      return "You're using one right now - track every transaction here and check your Budgets tab. The best tool is the one you'll actually use consistently. The principle behind all of them is the same: awareness changes behavior. Just seeing where your money goes each week is often enough to naturally cut waste.";
    }

    // ===== RICH MINDSET =====
    if (has("rich", "wealthy", "wealth", "millionaire", "billionaire", "get rich", "stay rich", "money mindset")) {
      return "The uncomfortable truth from The Millionaire Next Door: most millionaires look ordinary - modest homes, used cars, no flash. Morgan Housel: wealth is what you DON'T see, the purchases never made. The formula isn't complex: earn, keep a wide gap between income and spending, invest that gap consistently, and let compounding work for decades. Get-rich-quick is usually how people get poor quick.";
    }

    // ===== HOW MUCH / AFFORD (generic, after specific car/house) =====
    if (has("how much", "afford", "can i buy", "too expensive")) {
      return "General affordability guardrails: housing under 28% of income, total debt payments under 36%, save 20%+. On your " + dollars(income) + " income, keep essentials around " + dollars(Math.round(income * 0.5)) + " and protect at least " + dollars(Math.round(income * 0.2)) + " for savings. Tell me the specific purchase and I'll think it through with you.";
    }

    // ===== TIP =====
    if (has("tip", "gratuity", "how much to tip")) {
      return "Standard US tipping: 18-20% at sit-down restaurants, 15-20% for rideshares and delivery, $1-2 per drink at a bar, 15-20% for haircuts. Budgeting tip: if you dine out often, factor tips into your Food/Entertainment budget - at 20%, they add up faster than people expect.";
    }

    // ===== MOTIVATION / DISCIPLINE / STICKING TO BUDGET =====
    if (has("stick to", "discipline", "motivat", "give up", "keep failing", "cant stop", "willpower", "hard to", "struggle")) {
      return "Discipline beats willpower - so remove the need for it. Automate savings so it happens before you can spend. Think and Grow Rich stresses a definite goal with a deadline; vague intentions fail. Pick one concrete target - save " + dollars(Math.round((income || 1000) * 0.2)) + " this month - automate it, and let the system carry you instead of relying on motivation.";
    }

    // ===== INTELLIGENT GENERAL ENGINE (handles anything) =====
    // Detect question type and sentiment to compose a real reply.
    var isQuestion = q.indexOf("?") !== -1 || has("what", "how", "why", "when", "where", "who", "which", "should i", "can i", "is it", "are ", "do i", "does ", "will ", "would ", "could ");
    var isYesNo = has("should i", "can i", "is it worth", "is it good", "is it bad", "do you think", "would you", "is this");

    // --- Emotional / venting ---
    if (has("stressed", "anxious", "worried", "scared", "overwhelmed", "depressed", "broke", "poor", "struggling financially", "cant afford", "can't afford", "paycheck to paycheck", "no money")) {
      return "I hear you - money stress is heavy, and you're not alone in it. Let's make it smaller and concrete. First, list your absolute essentials (housing, food, utilities, minimum debt payments). Everything above that is where we find breathing room. Even setting aside $10 builds the habit and the sense of control. What's the one bill or expense weighing on you most right now? We'll start there.";
    }
    if (has("hate budgeting", "boring", "too hard", "confusing", "dont understand", "don't understand", "lost", "complicated")) {
      return "Totally fair - most budgeting advice is needlessly complicated. Here's the whole thing in one line: spend less than you earn, and put the difference somewhere it grows. That's it. Start by just tracking what you spend for one week here - no judgment, no rules. Awareness alone changes behavior. Want me to set up a dead-simple plan for you?";
    }
    if (has("good job", "proud", "i did it", "i saved", "paid off", "reached my goal", "hit my goal")) {
      return "That's genuinely worth celebrating - well done. Progress like this compounds, both in your balance and your confidence. The key now is to lock in the habit: keep the same routine going so this becomes your normal, not a one-time win. What's the next goal you want to aim at?";
    }

    // --- Opinion / yes-no questions get a real stance ---
    if (isYesNo) {
      if (has("worth it", "good idea", "smart")) {
        return "It depends on the trade-off, so here's how I'd decide it: does this purchase or choice move you toward your goals or away from them? A useful test from Ramit Sethi - spend freely on the few things you genuinely love, and cut hard on everything else. If this is one of your few true priorities and it fits your budget without touching savings or debt payments, it's likely worth it. If it's a passing want, sleep on it 24 hours. Tell me the specifics and I'll give you a sharper read.";
      }
    }

    // --- General money/life questions: give a thoughtful, useful answer ---
    if (has("subscription", "subscriptions", "recurring", "cancel")) {
      return "Subscriptions are the silent budget killer - they're designed to be forgotten. Do a quarterly audit: list every recurring charge, then for each ask 'have I used this in the last month?' Cancel anything that's a no. People commonly find $50-100/month of forgotten subscriptions. That's $600-1,200 a year back in your pocket.";
    }
    if (has("grocery", "groceries", "food cost", "eating out", "restaurant", "takeout", "meal")) {
      return "Food is usually the most controllable big expense. Practical wins: plan meals before shopping and stick to a list, cook in batches, and treat eating out as a planned treat rather than a default. Cutting restaurant spending is often the single fastest way to boost your savings rate without feeling deprived - cooking the same meal at home typically costs a quarter of the restaurant price.";
    }
    if (has("salary", "paid", "wage", "income", "make a year", "earn a year")) {
      return "Whatever you earn, the rule that builds wealth is the same: the gap between income and spending is what matters, not the income alone. Plenty of high earners are broke and plenty of modest earners retire rich - it comes down to the savings rate. That said, raising income has no ceiling, so negotiating your pay and building valuable skills is worth real effort. Want tips on negotiating a raise?";
    }
    if (has("bank", "savings account", "checking", "high yield", "hysa", "interest rate")) {
      return "Keep your money in the right buckets: a checking account for monthly spending, and a high-yield savings account (HYSA) for your emergency fund and short-term goals. A HYSA pays meaningfully more interest than a regular savings account for the exact same safety - there's no reason to leave your emergency fund earning nothing. For money you won't need for 5+ years, investing beats any savings account.";
    }
    if (has("insurance", "insure", "premium", "deductible")) {
      return "Insurance is about protecting against catastrophe, not small stuff. Carry what protects you from financial ruin (health, auto liability, renters/home, and term life if people depend on you), and skip the gimmicky add-ons. Raising your deductible lowers your premium - worth it if you have an emergency fund to cover that deductible. Review premiums yearly and get competing quotes; loyalty rarely pays.";
    }
    if (has("loan", "borrow", "finance", "interest")) {
      return "Before borrowing, separate good debt from bad. Debt that buys an appreciating asset or boosts income (a reasonable mortgage, sometimes education) can make sense. Debt for consumption - cars beyond your means, vacations, gadgets on a credit card - quietly drains wealth. If you must borrow, get the lowest rate you can, read the terms, and have a clear payoff plan before you sign.";
    }

    // --- Non-finance / off-topic: stay in character, redirect warmly ---
    if (!isQuestion && q.split(" ").length <= 3) {
      // Short ambiguous input - ask for clarity rather than dumping a summary
      return "Tell me a bit more and I'll help. You can ask me anything about your money - saving, spending, budgeting, investing, debt, big purchases, or just 'where should I start?' What's on your mind, " + (props.username ? props.username : "friend") + "?";
    }
    if (has("weather", "sports", "movie", "music", "game", "joke", "love", "relationship", "cook", "recipe")) {
      return "Ha - I'm Richard, your finance guy, so that's a bit outside my lane. But I'm great with anything money-related: saving, investing, budgets, debt, big purchases, retirement. What can I help you sort out financially?";
    }

    // --- Genuine attempt at any remaining question ---
    if (isQuestion) {
      var lead = "Good question. ";
      var body = "Here's how I'd think about it through a money lens: every financial decision comes down to whether it widens or narrows the gap between what you earn and what you spend. ";
      var personal = "";
      if (income > 0 || expense > 0) {
        personal = "For context, you're at " + dollars(income) + " income and " + dollars(expense) + " spent (" + savings + "% saved). ";
      }
      var close = "If you give me the specifics - the amount, the goal, or the choice you're weighing - I can run the actual numbers with you. What are you trying to decide?";
      return lead + body + personal + close;
    }

    // --- Final catch-all: warm, useful, never robotic ---
    var parts = [];
    parts.push("I want to make sure I help with the right thing.");
    if (income > 0 || expense > 0) parts.push("Right now you're at " + dollars(income) + " in, " + dollars(expense) + " out, saving " + savings + "%.");
    parts.push("Ask me anything - how to save more, build a budget, invest, tackle debt, plan a big purchase, or just 'where do I start?' I've got you.");
    return parts.join(" ");
  }

  function getAdvice() {
    setLoading(true); setAdvice(null); setErrMsg("");
    var customInstructionsPrefix = (props.richardInstructions && props.richardInstructions.trim()) ? ("CONTEXT FROM THE USER (follow any instructions; treat background as things to keep in mind):\n" + props.richardInstructions + "\n\n") : "";
    var system = customInstructionsPrefix + "You are an elite personal finance advisor trained on the wisdom of the world's greatest wealth builders. You have deep knowledge from:\n\nBOOKS & AUTHORS:\n- The Psychology of Money (Morgan Housel): wealth is about behavior not intelligence; saving is about the gap between ego and income; reasonable beats rational\n- Rich Dad Poor Dad (Robert Kiyosaki): assets put money in pocket, liabilities take it out; buy assets first, luxuries last; make money work for you\n- The Millionaire Next Door (Stanley & Danko): most millionaires live below their means, drive used cars, avoid lifestyle inflation\n- I Will Teach You To Be Rich (Ramit Sethi): automate savings, negotiate bills, spend extravagantly on things you love but cut mercilessly elsewhere\n- The Total Money Makeover (Dave Ramsey): debt snowball, emergency fund first, live on less than you earn\n- Think and Grow Rich (Napoleon Hill): definiteness of purpose, the mastermind principle, persistence\n- The Richest Man in Babylon (George Clason): pay yourself first 10%, let savings work, live on 70%, give 20% to debts\n- Money Master the Game (Tony Robbins): asset allocation drives 90% of returns, fees kill wealth, asymmetric risk/reward\n\nINTERVIEWS & QUOTES FROM THE WEALTHY:\n- Warren Buffett: do not save what is left after spending, spend what is left after saving; rule 1 never lose money, rule 2 never forget rule 1; someone is sitting in the shade today because someone planted a tree long ago\n- Charlie Munger: invert always invert; avoid what destroys wealth as much as seeking what builds it; the best thing a human being can do is to help another human being know more\n- Ray Dalio: diversify well and you can reduce risk without reducing returns; pain plus reflection equals progress; he who lives by the crystal ball will eat shattered glass\n- Naval Ravikant: earn with your mind not your time; specific knowledge cannot be taught; build or buy equity in a business\n- Warren Buffett on compounding: the snowball: compound interest is the eighth wonder of the world\n- Mark Cuban: pay off credit cards every month, never carry a balance; savings rates matter more than investment returns early on\n- Grant Cardone: the middle class saves to retire, the wealthy invest to create income now; 40% of income saved minimum\n- Jeff Bezos: focus on what will not change, not what will; think in long time horizons\n- Elon Musk: take as much risk as you can afford, you only live once\n\nPROVEN STRATEGIES:\n- Pay yourself first: automate 10-20% savings before touching income\n- The latte factor: small daily expenses compound into large annual costs\n- 50/30/20 rule: 50% needs, 30% wants, 20% savings and debt\n- Emergency fund: 3-6 months of expenses in liquid savings before investing\n- No lifestyle inflation: when income rises, raise savings rate not spending\n- Avoid car payments: buy used cars with cash or low financing\n- Cook more, eat out less: food is typically the fastest growing expense\n- Cancel subscriptions quarterly: audit recurring charges every 3 months\n- Negotiate everything: bills, salary, rent, insurance premiums\n- Tax efficiency: maximize retirement accounts before taxable investing\n- Index funds beat active management 90% of the time over 10 years\n- The 4% rule: you can withdraw 4% annually from a portfolio indefinitely\n- House hacking: rent part of your home to cover the mortgage\n- The one-day rule: wait 24 hours before any purchase over $50\n\nReturn ONLY valid JSON, no markdown. Never use emojis or non-ASCII symbols anywhere in any field. Use this structure: {\"score\":72,\"scoreLabel\":\"Good\",\"headline\":\"Summary here.\",\"insights\":[{\"type\":\"strength\",\"title\":\"Title\",\"body\":\"Body.\"},{\"type\":\"warning\",\"title\":\"Title\",\"body\":\"Body.\"},{\"type\":\"tip\",\"title\":\"Title\",\"body\":\"Body.\"}],\"expertQuote\":{\"quote\":\"Quote.\",\"author\":\"Author\"},\"webInsight\":{\"title\":\"Title\",\"body\":\"Body.\"}}";
    var analysisPrompt = coreProblem
      ? "Analyze these finances. The user's primary challenge is: " + coreProblem + ". Tailor your insights specifically to this challenge — don't give generic advice. Context: " + ctx
      : "Analyze these finances and give personalized advice: " + ctx;
    // Apply a freshly-produced analysis to local state and persist it in the App
    // cache so it survives leaving the tab, until the next transaction.
    function applyAdvice(val) { setAdvice(val); if (props.onSaveAnalysis) props.onSaveAnalysis(val); }
    callClaude([{ role: "user", content: analysisPrompt }], system, 900, function(err, text) {
      setLoading(false);
      if (err) {
        // API unreachable in this environment - use built-in analysis
        applyAdvice(localAnalysis());
        return;
      }
      try {
        var cleaned = text;
        var start = text.indexOf("{");
        var end = text.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          cleaned = text.slice(start, end + 1);
        }
        applyAdvice(JSON.parse(cleaned));
      } catch(e) {
        // Response not parseable - use built-in analysis
        applyAdvice(localAnalysis());
      }
    });
  }

  function suggestAction(response) {
    var actionLower = response.toLowerCase();
    // Detect if Richard suggested a specific action and offer to implement it
    if (actionLower.indexOf("automate") !== -1 && actionLower.indexOf("savings") !== -1) {
      return { type: "reminder", label: "Set up automatic savings transfer", icon: "spark" };
    }
    if (actionLower.indexOf("roth ira") !== -1 || actionLower.indexOf("401k") !== -1) {
      return { type: "link", label: "Open a Roth IRA or 401k", icon: "spark" };
    }
    if ((actionLower.indexOf("budget") !== -1 || actionLower.indexOf("allocate") !== -1) && actionLower.indexOf("50/30/20") !== -1) {
      return { type: "action", label: "Apply 50/30/20 to my budgets", icon: "budget", fn: "apply5030 20" };
    }
    if (actionLower.indexOf("emergency fund") !== -1 && actionLower.indexOf("$") !== -1) {
      return { type: "action", label: "Create an emergency fund goal", icon: "flag" };
    }
    if (actionLower.indexOf("cut") !== -1 && actionLower.indexOf("20%") !== -1) {
      return { type: "action", label: "Reduce top category by 20%", icon: "spark" };
    }
    if (actionLower.indexOf("24-hour rule") !== -1 || actionLower.indexOf("impulse") !== -1) {
      return { type: "reminder", label: "Set a reminder for the 24-hour rule", icon: "spark" };
    }
    return null;
  }

  // Parse [ACTION:{...}] tags Richard emits when the user reports a real money
  // event (spent money, new job, paid a bill, hit a goal). Supports multiple tags.
  function parseUpdates(text) {
    var out = [];
    var re = /\[ACTION:(\{.*?\})\]/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      try { out.push(JSON.parse(m[1])); } catch (e) {}
    }
    return out;
  }
  function stripUpdates(text) {
    return text.replace(/\[ACTION:\{.*?\}\]/g, "").trim();
  }
  function updateLabel(a) {
    if (a.kind === "expense") return "Log expense: " + dollars(parseFloat(a.amount) || 0) + " - " + (a.label || a.category || "expense") + (a.category ? " (" + a.category + ")" : "");
    if (a.kind === "income") return "Log income: " + dollars(parseFloat(a.amount) || 0) + (a.label ? " - " + a.label : "");
    if (a.kind === "budget") return "Set " + (a.category || "?") + " budget to " + dollars(parseFloat(a.limit) || 0);
    if (a.kind === "goal") return "Create goal: " + (a.name || "New Goal") + " (" + dollars(parseFloat(a.target) || 0) + ")";
    if (a.kind === "goalAdd") return "Add " + dollars(parseFloat(a.amount) || 0) + " to " + (a.name || "goal");
    return "Update your data";
  }
  // Apply every confirmed action at once. Batches each data type into a single
  // save so synchronous updates don't overwrite each other with stale state.
  function applyUpdates(actions) {
    var today = new Date().toISOString().slice(0, 10);
    var base = Date.now();
    var newTx = [];
    var nextBudgets = (props.budgets || []).slice();
    var nextGoals = (props.goals || []).slice();
    var txChanged = false, budChanged = false, goalChanged = false;
    actions.forEach(function(a, i) {
      if (a.kind === "expense" || a.kind === "income") {
        var wantName = a.category || (a.kind === "income" ? "Salary" : "Other");
        var c = catByName(cats, wantName) || catById(cats, a.category) || cats.filter(function(x) { return x.name === "Other"; })[0] || cats[0] || { id: "", name: wantName };
        newTx.push({ type: a.kind, amount: round2(parseFloat(a.amount) || 0), label: a.label || c.name, catId: c.id, category: c.name, date: a.date || today, id: base + i, repeat: "none", pending: false });
        txChanged = true;
      } else if (a.kind === "budget") {
        var bc = catByName(cats, a.category) || catById(cats, a.category);
        if (bc) {
          nextBudgets = nextBudgets.filter(function(b) { return b.catId !== bc.id; }).concat([{ catId: bc.id, category: bc.name, limit: parseFloat(a.limit) || 0 }]);
          budChanged = true;
        }
      } else if (a.kind === "goal") {
        nextGoals = nextGoals.concat([{ id: base + 1000 + i, name: a.name || "New Goal", target: parseFloat(a.target) || 1000, saved: 0 }]);
        goalChanged = true;
      } else if (a.kind === "goalAdd") {
        nextGoals = nextGoals.map(function(g) { return g.name.toLowerCase() === (a.name || "").toLowerCase() ? Object.assign({}, g, { saved: round2((g.saved || 0) + (parseFloat(a.amount) || 0)) }) : g; });
        goalChanged = true;
      }
    });
    if (txChanged && props.onSaveTx) props.onSaveTx((props.tx || []).concat(newTx));
    if (budChanged && props.onSaveBudgets) props.onSaveBudgets(nextBudgets);
    if (goalChanged && props.onSaveGoals) props.onSaveGoals(nextGoals);
  }

  // Fold the live chat into the persisted archive (newest first), de-duped by id.
  // Returns true if anything was archived.
  function archiveCurrentChat() {
    if (!chat || chat.length === 0 || !props.onSaveChats) return false;
    var firstUser = chat.filter(function(m) { return m.role === "user"; })[0];
    var title = firstUser ? firstUser.text : (chat[0] ? chat[0].text : "Chat with Richard");
    if (title.length > 60) title = title.slice(0, 57) + "...";
    var session = { id: Date.now(), date: new Date().toISOString(), title: title, messages: chat };
    var prior = (props.chats || []).filter(function(s) { return s.id !== session.id; });
    props.onSaveChats([session].concat(prior));
    return true;
  }

  function startNewChat() {
    archiveCurrentChat();
    setChat([]);
    setInput("");
    setPendingUpdates(null);
    setPendingAction(null);
    setHistoryOpen(false);
  }

  // Open an archived chat back into the live view, archiving the current one first
  // so nothing is lost. Removes the opened session from the archive (it becomes the
  // live chat again, and re-archives on the next New chat).
  function openArchivedChat(session) {
    archiveCurrentChat();
    setChat(session.messages || []);
    setPendingUpdates(null);
    setPendingAction(null);
    if (props.onSaveChats) {
      props.onSaveChats((props.chats || []).filter(function(s) { return s.id !== session.id; }));
    }
    setHistoryOpen(false);
  }

  function deleteArchivedChat(id) {
    if (props.onSaveChats) props.onSaveChats((props.chats || []).filter(function(s) { return s.id !== id; }));
  }

  function sendChat() {
    if (!input.trim() || chatLoading) return;
    var msg = input.trim();
    setInput("");
    var nc = chat.concat([{ role: "user", text: msg }]);
    setChat(nc);
    setChatLoading(true);
    var customInstructionsPrefix = (props.richardInstructions && props.richardInstructions.trim()) ? ("CONTEXT FROM THE USER (follow any instructions; treat background as things to keep in mind):\n" + props.richardInstructions + "\n\n") : "";
    callClaude(
      nc.map(function(m) { return { role: m.role === "user" ? "user" : "assistant", content: m.text }; }),
      customInstructionsPrefix + "You are Richard, a smart assistant inside the Richy personal finance app. You are calm, warm, direct, and knowledgeable - a trusted friend who is an expert in money and can help with anything the user asks. You have deep knowledge from The Psychology of Money, Rich Dad Poor Dad, The Millionaire Next Door, I Will Teach You To Be Rich, The Total Money Makeover, Think and Grow Rich, The Richest Man in Babylon, and wisdom from Warren Buffett, Charlie Munger, Ray Dalio, Naval Ravikant, Mark Cuban, Grant Cardone and other wealth builders. You can answer questions about personal finance, investments, budgeting, debt, taxes, and wealth-building. You can also answer questions about how to use the Richy app (it has tabs: Overview, Activity for transactions, Budgets for spending limits, Goals for savings targets, and Advisor which is where we are now; categories are managed via the tag icon on Overview or the Manage link in pickers). You can answer general knowledge and technical questions too - if someone asks about math, technology, or anything else, answer helpfully. Always refer back to the user's real financial data when relevant. Current user financial data: " + ctx + "." + (coreProblem ? " The user's primary financial challenge is: " + coreProblem + ". Connect your advice to this when relevant." : "")
      + " IMPORTANT - YOU CAN UPDATE THE APP FOR THE USER. When the user tells you about a real money event - they spent money, got paid, started a new job, got a raise, paid a bill, or saved toward a goal - acknowledge it warmly in words AND append one or more action tags at the very END of your reply (after your sentence, on their own). The app will show the user a confirmation card to apply them. Action formats (use valid JSON, no spaces in keys): "
      + "[ACTION:{\"kind\":\"expense\",\"amount\":50,\"category\":\"Food\",\"label\":\"groceries\"}] logs a purchase; "
      + "[ACTION:{\"kind\":\"income\",\"amount\":4000,\"label\":\"new job salary\"}] logs income received; "
      + "[ACTION:{\"kind\":\"budget\",\"category\":\"Food\",\"limit\":500}] sets a monthly budget; "
      + "[ACTION:{\"kind\":\"goal\",\"name\":\"Emergency Fund\",\"target\":3000}] creates a savings goal; "
      + "[ACTION:{\"kind\":\"goalAdd\",\"name\":\"Emergency Fund\",\"amount\":200}] adds money to an existing goal. "
      + "Use the EXACT category name from this list when logging expenses or budgets: " + (cats.map(function(c) { return c.name; }).join(", ") || "Other") + ". "
      + "If the user mentions several things at once, emit several tags. Only emit a tag for a concrete event with a real number that the user actually states - never for hypotheticals, plans, or general advice. Do not mention the word ACTION or the tag syntax in your spoken reply; just speak naturally and let the tags do the work."
      + " Richy CAN import a CSV bank or card statement from the Activity tab (it maps columns, handles separate money-in/money-out columns, auto-categorizes from history, and skips duplicates) - point users tired of manual entry there. Richy ALSO has Business Accounts (Overview -> Savings -> Business Account): each walls off business cash from personal money, tracks revenue and expenses with a monthly profit view, budgets spending across business buckets, and includes Richard as a CFO who builds a business plan - send business owners there. Be honest about what Richy currently does not support: no live bank or card sync, no shared couples mode, no interest-based debt payoff calculator. If the user asks about these, acknowledge the gap honestly and offer the best workaround available inside Richy. Be concise and direct." + RICHARD_FORMAT + " The action tags described above are the only bracketed syntax you may use." + (props.lang && props.lang !== "en" ? " Respond entirely in " + (LANGUAGE_NAMES[props.lang] || "English") + "." : ""),
      500,
      function(err, text) {
        setChatLoading(false);
        var response = err || !text ? Richard(msg) : text;
        var updates = parseUpdates(response);
        var display = stripUpdates(response);
        if (updates.length > 0) {
          // Always tell the user, in the chat, that a change is being proposed -
          // so the confirmation card below never appears out of nowhere.
          var cue = updates.length > 1
            ? "I'd like to make " + updates.length + " changes to your app - review and confirm them below."
            : "I'd like to make a change to your app - review and confirm it below.";
          display = display ? display + "\n\n" + cue : cue;
        }
        if (!display) display = "Got it - I've noted that below. Tap Apply to update your app.";
        setChat(function(p) { animMsgRef.current = p.length; return p.concat([{ role: "assistant", text: display }]); });
        if (updates.length > 0) {
          setPendingUpdates(updates);
          setPendingAction(null);
        } else {
          // Fall back to the legacy advice-based suggestion when no concrete update.
          var action = suggestAction(display);
          if (action && Math.random() > 0.7) {
            setPendingAction(action);
          }
        }
      }
    );
  }

  // Hero cards are now light lavender, so use a deeper green/red that reads on it
  // (the old bright #4ADE80 and light orangeHi washed out on the pale background).
  var GREEN_HERO = T.advGreen;
  var ringColor = advice && advice.score >= 80 ? GREEN_HERO : advice && advice.score >= 60 ? T.gold : T.advRingLow;
  var name = (props.username || "").trim() || "there";

  // Three real signals for the dark card's bottom row.
  var bufferMonths = expense > 0 ? (netWorth / expense) : (netWorth > 0 ? 12 : 0);
  var savingStat = savings >= 20 ? { label: "Strong", dot: GREEN_HERO } : savings >= 10 ? { label: "Building", dot: T.gold } : savings >= 0 ? { label: "Low", dot: T.gold } : { label: "Negative", dot: T.red };
  var totalLimit = (props.budgets || []).reduce(function(s, b) { return s + (b.limit || 0); }, 0);
  var spendStat = totalLimit <= 0 ? { label: "Not set", dot: T.ink3 } : expense <= totalLimit ? { label: "On track", dot: GREEN_HERO } : { label: "Over", dot: T.red };
  var bufferStat = bufferMonths >= 3 ? GREEN_HERO : bufferMonths >= 1 ? T.gold : T.red;
  var bufferTxt = bufferMonths >= 12 ? "12+ mo" : bufferMonths > 0 ? (Math.round(bufferMonths * 10) / 10) + " mo" : "0 mo";

  var greeting = advice ? (advice.score >= 80 ? "You're in good shape, " + name + "." : advice.score >= 60 ? "You're on the right track, " + name + "." : "Let's tighten things up, " + name + ".") : "";
  var subGreeting = "Here's what I'm seeing across your month.";
  // Insight type -> badge icon + accent, matching the synced design's CatBadge rows.
  var insMeta = { strength: { icon: "chart", color: T.green, tag: "Strength" }, warning: { icon: "credit", color: T.red, tag: "Watch" }, tip: { icon: "coins", color: T.gold, tag: "Tip" } };

  // Shared bits used across states.
  var richardHead = (
    <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "6px 2px 0" }}>
      <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: -7, borderRadius: 20, background: "radial-gradient(circle, rgba(200,152,58,0.42), transparent 70%)", filter: "blur(7px)" }} />
        <div style={{ position: "relative", width: 52, height: 52, borderRadius: 16, background: "#0D0C18", boxShadow: "0 7px 18px rgba(13,12,24,0.32)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 27, fontWeight: 700, color: "#C8973A", lineHeight: 1 }}>R</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", color: T.ink }}>Richard</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />
          <span style={{ fontSize: 12, color: T.ink3 }}>{advice ? "Analyzed your month - just now" : "Ready to analyze your month"}</span>
        </div>
      </div>
      {advice && !advice.error && (
        <button onClick={function() { setAdvice(null); getAdvice(); }}
          style={{ width: 40, height: 40, border: "none", borderRadius: 13, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <SVGIcon id="refresh" size={18} color={T.ink2} />
        </button>
      )}
    </div>
  );

  function sectionHead(title, meta) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 11px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 3, height: 15, borderRadius: 2, background: T.orange }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>{title}</span>
        </div>
        {meta && <span style={{ fontSize: 12, color: T.ink3 }}>{meta}</span>}
      </div>
    );
  }

  // ===== Your Next Big Move =====
  // Richard's single highest-impact action, derived from REAL data and quantified
  // in dollars. Priority: cut a real subscription (findMoney recurring) -> review a
  // price hike -> rein in overspending -> lift the savings rate -> finish an
  // emergency-fund goal -> put a surplus to work. Numbers come from the user's own
  // transactions, never the LLM, so they're always accurate.
  function computeNextMove() {
    var finds = findMoney(props.tx, cats) || [];
    var subs = finds.filter(function(f) { return f.type === "recurring"; });
    var hikes = finds.filter(function(f) { return f.type === "hike"; });
    var surplus = Math.max(0, Math.round(income - expense));

    if (subs.length > 0) {
      var top = subs[0];
      // Per-month figures come from annual/12 so weekly subs (whose `amount` is
      // the per-charge value) read correctly rather than ~4.3x too low.
      var topMo = (top.annual || 0) / 12;
      var totalYr = subs.reduce(function(s, f) { return s + (f.annual || 0); }, 0);
      var totalMo = totalYr / 12;
      if (subs.length === 1) {
        return { icon: "refresh", label: "Cancel what you don't use",
          title: "You're paying for " + top.merchant,
          action: "That's " + dollars(topMo) + "/mo on " + top.merchant + ". If you're not getting your money's worth, cancelling puts " + dollars(top.annual) + " back in your pocket this year.",
          impact: dollars(top.annual), impactLabel: "back per year" };
      }
      return { icon: "refresh", label: "Audit your subscriptions",
        title: "You have " + subs.length + " subscriptions",
        action: "Together they run " + dollars(totalMo) + "/mo, led by " + top.merchant + " at " + dollars(topMo) + "/mo. Cancel the ones you've stopped using.",
        impact: dollars(totalYr), impactLabel: "back per year if you cut them" };
    }
    if (hikes.length > 0) {
      var h = hikes[0];
      return { icon: "up", label: "A price quietly went up",
        title: h.merchant + " costs more now",
        action: h.subtitle + ". Worth a look before it becomes the new normal.",
        impact: dollars(h.annual), impactLabel: "a year at stake" };
    }
    if (savings < 0 && allCats.length > 0) {
      var tc = allCats[0];
      return { icon: "chart", label: "Spending beat income",
        title: "Rein in " + tc.name,
        action: "You spent more than you earned this month, and " + tc.name + " led the way at " + dollars(tc.spent) + ". Trimming it is the fastest route back to positive.",
        impact: dollars(Math.abs(Math.round(income - expense))), impactLabel: "in the red this month" };
    }
    if (savings < 20 && allCats.length > 0) {
      var tc2 = allCats[0];
      var cut = Math.round(tc2.spent * 0.15);
      return { icon: "chart", label: "Lift your savings rate",
        title: tc2.name + " is your biggest lever",
        action: tc2.name + " ran " + dollars(tc2.spent) + " this month. Trimming it 15% frees up " + dollars(cut) + " a month to save - without touching the rest of your life.",
        impact: dollars(cut * 12), impactLabel: "a year from one category" };
    }
    var efGoal = (props.goals || []).filter(function(g) { return /emergenc/i.test(g.name || ""); })[0] || (props.goals || [])[0];
    if (efGoal && (efGoal.target || 0) > (efGoal.saved || 0) && surplus > 0) {
      var gap = Math.round(efGoal.target - efGoal.saved);
      var months = Math.max(1, Math.ceil(gap / surplus));
      return { icon: "shield", label: "Finish what you started",
        title: "Fund your " + efGoal.name,
        action: "You're " + dollars(gap) + " from your goal and keeping " + dollars(surplus) + "/mo. Automate that transfer and you're fully funded in about " + months + " month" + (months === 1 ? "" : "s") + ".",
        impact: dollars(gap), impactLabel: "left to go" };
    }
    if (surplus > 0) {
      return { icon: "coins", label: "Put your surplus to work",
        title: "You kept " + dollars(surplus) + " this month",
        action: "Don't let it drift into spending. Automate it into savings or a low-cost index fund on payday - " + dollars(surplus) + "/mo compounds into real wealth.",
        impact: dollars(surplus * 12), impactLabel: "a year, automated" };
    }
    return { icon: "spark", label: "Get the full picture",
      title: "Log a full month first",
      action: "Add your income and a few weeks of expenses, and I'll point you straight at the single highest-impact move for your money.",
      impact: "", impactLabel: "" };
  }

  // Base style for every carousel panel (merged with per-panel extras). Avoids
  // Object.assign/spread so it works under the Babel-standalone react preset.
  function panelStyle(extra) {
    var b = { flex: "0 0 100%", width: "100%", height: "100%", boxSizing: "border-box", scrollSnapAlign: "start", overflow: "hidden", padding: "22px 24px", display: "flex", flexDirection: "column" };
    if (extra) { for (var k in extra) b[k] = extra[k]; }
    return b;
  }

  // Month-key arithmetic for this-vs-last-month comparisons.
  function ymShift(ym, delta) {
    var parts = (ym || "").split("-");
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1 + delta, 1);
    var mm = d.getMonth() + 1;
    return d.getFullYear() + "-" + (mm < 10 ? "0" + mm : "" + mm);
  }
  function catSpendInMonth(c, ym) {
    return props.tx.filter(function(t) { return t.type === "expense" && !isTrip(t) && inMonth(t, ym) && (t.catId === c.id || t.category === c.name); }).reduce(function(s, t) { return s + t.amount; }, 0);
  }

  // Build the swipeable analysis hero (dots + scroll-snap panels). Every panel is
  // a distinct, personalized read on the user's real numbers. Only called when a
  // valid `advice` object exists.
  function renderAnalysisHero() {
    var HINK = T.heroInk, HMUT = T.heroMut, HFNT = T.heroFaint, HSEP = T.heroSep, HPOS = T.heroPos, HNEG = T.heroNeg, HTRACK = T.heroTrack, HPB = T.heroPillBg, HPT = T.heroPillText;
    var HERO_H = 372;
    var move = computeNextMove();

    // --- Derive the real signals each panel needs ---
    var finds = findMoney(props.tx, cats) || [];
    var subs = finds.filter(function(f) { return f.type === "recurring"; });
    var hike = finds.filter(function(f) { return f.type === "hike"; })[0];
    var dup = finds.filter(function(f) { return f.type === "duplicate"; })[0];

    var netKept = Math.round(income - expense);
    var prevYm = ymShift(ymA, -1);
    var prevExpenseTot = props.tx.filter(function(t) { return t.type === "expense" && !isTransfer(t) && !isTrip(t) && inMonth(t, prevYm); }).reduce(function(s, t) { return s + t.amount; }, 0);
    var spendDelta = Math.round(expense - prevExpenseTot);

    var catTotal = allCats.reduce(function(s, c) { return s + c.spent; }, 0) || 1;
    var catRows = allCats.slice(0, 5);
    var catMax = catRows.reduce(function(m, c) { return Math.max(m, c.spent); }, 0) || 1;

    var surplus = Math.max(0, netKept);
    var savTotal = savingsTotal(props.savings || []);
    var goals = props.goals || [];
    var efGoal = goals.filter(function(g) { return /emergenc/i.test(g.name || ""); })[0] || goals[0];
    var goalPct = efGoal && efGoal.target > 0 ? Math.min(100, Math.round((efGoal.saved / efGoal.target) * 100)) : 0;
    var goalGap = efGoal ? Math.max(0, Math.round((efGoal.target || 0) - (efGoal.saved || 0))) : 0;
    var goalMonths = (goalGap > 0 && surplus > 0) ? Math.ceil(goalGap / surplus) : 0;

    var overBudget = (props.budgets || []).map(function(b) {
      var c = catById(cats, b.catId) || catByName(cats, b.category) || { name: b.category || "?" };
      var sp = catSpendInMonth(c, ymA);
      return { name: c.name, spent: sp, limit: b.limit || 0, over: sp - (b.limit || 0) };
    }).filter(function(x) { return x.limit > 0 && x.over > 0; }).sort(function(a, b) { return b.over - a.over; });

    var topMover = cats.map(function(c) {
      var now = catSpendInMonth(c, ymA), prev = catSpendInMonth(c, prevYm);
      return { name: c.name, now: now, prev: prev, delta: now - prev };
    }).filter(function(m) { return m.now > 0 && m.prev > 0 && m.delta > 0; })
      .sort(function(a, b) { return b.delta - a.delta; })[0];

    // "Worth a look" flags, most actionable first.
    var watch = [];
    if (overBudget[0]) watch.push({ icon: "budgets", color: HNEG, title: overBudget[0].name + " is over budget", sub: dollars(overBudget[0].spent) + " of " + dollars(overBudget[0].limit) + " - " + dollars(overBudget[0].over) + " over" });
    if (hike) watch.push({ icon: "up", color: T.gold, title: hike.merchant + " costs more now", sub: hike.subtitle });
    if (topMover && (topMover.delta / Math.max(1, topMover.prev)) >= 0.25) watch.push({ icon: "chart", color: T.gold, title: topMover.name + " is climbing", sub: dollars(topMover.now) + " vs " + dollars(topMover.prev) + " last month - " + dollars(topMover.delta) + " more" });
    if (dup) watch.push({ icon: "credit", color: HNEG, title: "Possible double charge", sub: dup.subtitle });
    watch = watch.slice(0, 3);

    var panels = [];

    // Panel - Financial Health
    panels.push(
      <div key="health" style={panelStyle({ justifyContent: "space-between" })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: HMUT }}>Financial Health</span>
          <span style={{ background: ringColor + "26", color: ringColor, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 8 }}>{advice.scoreLabel}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
          <RingChart value={advice.score} max={100} size={142} stroke={10} color={ringColor} track={HTRACK} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
            <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", color: HINK }}>{advice.score}</span>
            <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: HFNT, marginTop: 4 }}>out of 100</span>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em", color: HINK, lineHeight: 1.35 }}>{advice.headline}</div>
        </div>
        <div style={{ display: "flex", borderTop: "0.5px solid " + HSEP, paddingTop: 14 }}>
          {[{ k: "Saving", v: savingStat.label, d: savingStat.dot }, { k: "Spending", v: spendStat.label, d: spendStat.dot }, { k: "Buffer", v: bufferTxt, d: bufferStat }].map(function(col, ci) {
            return (
              <div key={col.k} style={{ flex: 1, textAlign: "center", borderRight: ci < 2 ? "0.5px solid " + HSEP : "none" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: HMUT, marginBottom: 6 }}>{col.k}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: col.d }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: HINK }}>{col.v}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );

    // Panel - Your Next Big Move
    panels.push(
      <div key="move" style={panelStyle({ justifyContent: "center" })}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: HPB, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <SVGIcon id={move.icon} size={19} color={HPT} />
          </div>
          <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: HMUT }}>Your Next Big Move</span>
        </div>
        {move.impact ? (
          <div style={{ marginTop: 20, display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", color: HPOS, lineHeight: 1 }}>{move.impact}</span>
            <span style={{ fontSize: 13, color: HFNT }}>{move.impactLabel}</span>
          </div>
        ) : null}
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.015em", color: HINK, marginTop: move.impact ? 16 : 18 }}>{move.title}</div>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: HMUT, marginTop: 9 }}>{move.action}</div>
      </div>
    );

    // Panel - Cash Flow (this month vs last)
    if (income > 0 || expense > 0) {
      panels.push(
        <div key="flow" style={panelStyle({ justifyContent: "space-between" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: HMUT }}>Cash Flow</span>
            <span style={{ fontSize: 11, color: HFNT }}>This month</span>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: HFNT, marginBottom: 4 }}>{netKept >= 0 ? "You kept" : "You overspent"}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", color: netKept >= 0 ? HPOS : HNEG, lineHeight: 1 }}>{(netKept < 0 ? "-" : "") + dollars(Math.abs(netKept))}</span>
              <span style={{ fontSize: 13, color: HFNT }}>{income > 0 ? (savings + "% of income") : "no income logged yet"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
              {prevExpenseTot > 0 ? <SVGIcon id={spendDelta <= 0 ? "down" : "up"} size={14} color={spendDelta <= 0 ? HPOS : HNEG} /> : null}
              <span style={{ fontSize: 12.5, color: HMUT }}>{prevExpenseTot > 0 ? ("Spending is " + (spendDelta <= 0 ? "down " : "up ") + dollars(Math.abs(spendDelta)) + " vs last month") : "Your first month of tracking - good start"}</span>
            </div>
          </div>
          <div style={{ display: "flex", borderTop: "0.5px solid " + HSEP, paddingTop: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: HFNT }}>Income</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: HPOS, letterSpacing: "-0.02em", marginTop: 3 }}>{"+" + dollars(income)}</div>
            </div>
            <div style={{ width: "0.5px", background: HSEP }} />
            <div style={{ flex: 1, paddingLeft: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: HFNT }}>Spent</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: HNEG, letterSpacing: "-0.02em", marginTop: 3 }}>{"-" + dollars(expense)}</div>
            </div>
          </div>
        </div>
      );
    }

    // Panel - Where It Goes (real category breakdown)
    if (catRows.length > 0) {
      panels.push(
        <div key="cats" style={panelStyle()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: HMUT }}>Where It Goes</span>
            <span style={{ fontSize: 11, color: HFNT }}>{dollars(expense) + " spent"}</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 11 }}>
            {catRows.map(function(c, i) {
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.catNameHero, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "58%" }}>{c.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: HINK, letterSpacing: "-0.02em" }}>{dollars(c.spent) + "  " + Math.round((c.spent / catTotal) * 100) + "%"}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: HTRACK, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: ((c.spent / catMax) * 100).toFixed(1) + "%", background: T.merchBar, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: HMUT, marginTop: 4 }}>{allCats[0].name + " takes " + Math.round((allCats[0].spent / catTotal) * 100) + "% of your spending."}</div>
        </div>
      );
    }

    // Panel - What You Pay For (subscriptions). Use the annualized cost / 12 for
    // the per-month figure so weekly subs (whose `amount` is the per-charge value)
    // aren't shown ~4.3x too low - this keeps it consistent with findMoney's
    // annual and the Next Big Move panel.
    if (subs.length > 0) {
      var subMonthly = function(s) { return (s.annual || 0) / 12; };
      var subTop = subs.slice(0, 4);
      var subMax = subTop.reduce(function(m, s) { return Math.max(m, subMonthly(s)); }, 0) || 1;
      var subYr = subs.reduce(function(s, f) { return s + (f.annual || 0); }, 0);
      var subMo = subYr / 12;
      panels.push(
        <div key="subs" style={panelStyle()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: HMUT }}>What You Pay For</span>
            <span style={{ fontSize: 11, color: HFNT }}>{subs.length + " subscription" + (subs.length === 1 ? "" : "s")}</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 13 }}>
            {subTop.map(function(s, i) {
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: T.merchNameHero, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{s.merchant}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: HINK, letterSpacing: "-0.02em" }}>{dollars(subMonthly(s)) + "/mo"}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: HTRACK, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: ((subMonthly(s) / subMax) * 100).toFixed(1) + "%", background: T.merchBar, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: HMUT, marginTop: 4 }}>{dollars(subMo) + "/mo on subscriptions - " + dollars(subYr) + " a year."}</div>
        </div>
      );
    }

    // Panel - Looking Ahead (savings trajectory + goal)
    if (income > 0 || surplus > 0 || efGoal || netWorth > 0) {
      panels.push(
        <div key="ahead" style={panelStyle({ justifyContent: "space-between" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: HMUT }}>Looking Ahead</span>
            <span style={{ fontSize: 11, color: HFNT }}>At your pace</span>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
              <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", color: surplus > 0 ? HPOS : HINK, lineHeight: 1 }}>{dollars(surplus * 12)}</span>
              <span style={{ fontSize: 13, color: HFNT }}>saved in a year</span>
            </div>
            <div style={{ fontSize: 13, color: HMUT, marginTop: 9, lineHeight: 1.5 }}>
              {surplus > 0 ? ("You're keeping " + dollars(surplus) + "/mo. Automate it and it compounds.") : "Tighten the gap between income and spending to start building."}
            </div>
          </div>
          {efGoal ? (
            <div style={{ borderTop: "0.5px solid " + HSEP, paddingTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: HINK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "62%" }}>{efGoal.name}</span>
                <span style={{ fontSize: 12, color: HMUT }}>{dollars(efGoal.saved || 0) + " / " + dollars(efGoal.target || 0)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: HTRACK, overflow: "hidden" }}>
                <div style={{ height: "100%", width: goalPct + "%", background: T.merchBar, borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 11.5, color: HFNT, marginTop: 7 }}>{goalGap > 0 ? (goalMonths > 0 ? (dollars(goalGap) + " to go - about " + goalMonths + " month" + (goalMonths === 1 ? "" : "s") + " at this pace.") : (dollars(goalGap) + " to go.")) : "Funded. Time for the next goal."}</div>
            </div>
          ) : (
            <div style={{ borderTop: "0.5px solid " + HSEP, paddingTop: 14, fontSize: 12.5, color: HMUT }}>{"Net worth today: " + dollars(netWorth)}</div>
          )}
        </div>
      );
    }

    // Panel - Worth a Look (real flags only)
    if (watch.length > 0) {
      panels.push(
        <div key="watch" style={panelStyle()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: HMUT }}>Worth a Look</span>
            <span style={{ fontSize: 11, color: HFNT }}>{watch.length + " flag" + (watch.length === 1 ? "" : "s")}</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
            {watch.map(function(w, i) {
              return (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: HPB, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <SVGIcon id={w.icon} size={16} color={HPT} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: HINK, letterSpacing: "-0.01em" }}>{w.title}</div>
                    <div style={{ fontSize: 12, color: HMUT, marginTop: 2, lineHeight: 1.4 }}>{w.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Panel - Richard's word (expert quote)
    if (advice.expertQuote && advice.expertQuote.quote) {
      panels.push(
        <div key="quote" style={panelStyle({ justifyContent: "center", position: "relative" })}>
          <span style={{ position: "absolute", top: 4, left: 14, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 120, lineHeight: 1, color: HINK, opacity: 0.1, pointerEvents: "none" }}>{'”'}</span>
          <p style={{ position: "relative", margin: 0, fontSize: 18, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.01em", color: HINK }}>{advice.expertQuote.quote}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
            <div style={{ width: 18, height: 2, borderRadius: 2, background: T.gold }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "0.02em", color: HMUT }}>{advice.expertQuote.author}</span>
          </div>
        </div>
      );
    }

    // Clamp the active index to the live panel count: panels are built from live
    // props, so a panel can disappear (e.g. household sync resolves a flag) while
    // `page` still points past the end. advCountRef + the effect below re-sync the
    // real page; pageClamped keeps a dot highlighted in the meantime.
    advCountRef.current = panels.length;
    var pageClamped = panels.length ? Math.min(page, panels.length - 1) : 0;
    // Inactive dot must read on the page background in dark mode too (T.bg goes
    // near-black), so don't hardcode black - pick a tone that contrasts either bg.
    var dotOff = (T.bg === DARK_BG) ? "rgba(255,255,255,0.26)" : "rgba(0,0,0,0.16)";

    return (
      <div style={{ marginTop: 16, animation: "rcFadeUp 0.5s ease both" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 7, padding: "0 0 11px" }}>
          {panels.map(function(_p, i) {
            return <div key={i} onClick={function() { advGoPage(i); }} style={{ width: i === pageClamped ? 18 : 6, height: 6, borderRadius: 3, cursor: "pointer", transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)", background: i === pageClamped ? T.orange : dotOff }} />;
          })}
        </div>
        <div style={{ position: "relative", height: HERO_H, borderRadius: 24, overflow: "hidden", background: T.heroBg, boxShadow: T.heroShadow }}>
          <div style={{ position: "absolute", top: -70, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle," + T.heroGlow1 + ",transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
          <div style={{ position: "absolute", bottom: -70, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle," + T.heroGlow2 + ",transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
          <div ref={advScrollRef} onScroll={advOnScroll} className="rc-hero-scroll"
            style={{ position: "relative", zIndex: 1, display: "flex", height: "100%", width: "100%", overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
            {panels}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {richardHead}

      <BigDecisions ctx={ctx} coreProblem={coreProblem} username={props.username} lang={props.lang} richardInstructions={props.richardInstructions} decisions={props.decisions} onSaveDecisions={props.onSaveDecisions} />

      {!advice && !loading && (
        <div>
          <div style={{ padding: "16px 4px 0" }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.12, color: T.ink }}>{"Let's look at your month, " + name + "."}</h1>
            <p style={{ margin: "7px 0 0", fontSize: 14.5, lineHeight: 1.45, color: T.ink2 }}>{tr("aiAdvisorSub")}</p>
          </div>
          {errMsg && (
            <div style={{ fontSize: 12, color: T.red, background: "rgba(255,59,48,0.08)", borderRadius: 10, padding: "8px 12px", margin: "14px 4px 0", textAlign: "left" }}>
              {errMsg}
            </div>
          )}
          <button onClick={getAdvice}
            style={{ width: "100%", background: T.btn, color: "#fff", textShadow: "0 1px 2px rgba(42,31,77,0.35)", border: "none", borderRadius: 16, padding: "17px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: "pointer", marginTop: 18, boxShadow: "0 6px 20px " + T.orangeGlow, letterSpacing: "-0.01em" }}>
            {tr("analyzeMyFinances")}
          </button>
        </div>
      )}

      {loading && (
        <AIWorking
          style={{ margin: "16px 0 20px" }}
          title={tr("analyzingFinances")}
          sub={tr("fewSeconds")}
          expectedMs={10000}
          steps={[
            tr("anStep1"),
            (props.tx || []).length > 0 ? tr("anStep2").replace("{n}", (props.tx || []).length) : tr("anStep2").replace("{n} ", "").replace("{n}", ""),
            tr("anStep3"),
            tr("anStep4"),
            tr("anStep5"),
          ]}
        />
      )}

      {advice && !advice.error && (
        <div>
          <div style={{ padding: "16px 4px 0" }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.12, color: T.ink }}>{greeting}</h1>
            <p style={{ margin: "7px 0 0", fontSize: 14.5, lineHeight: 1.45, color: T.ink2 }}>{subGreeting}</p>
          </div>

          {renderAnalysisHero()}

          <div style={{ marginTop: 26 }}>
            {sectionHead("What Richard sees", (advice.insights || []).length + " notes")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(advice.insights || []).map(function(ins, i) {
              var m = insMeta[ins.type] || insMeta.tip;
              return (
                <Card key={i} style={{ padding: 16 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <CatBadge icon={m.icon} color={m.color} size={44} soft={true} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 5 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: T.ink }}>{ins.title}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.02em", padding: "3px 8px", borderRadius: 7, whiteSpace: "nowrap", color: m.color, background: m.color + "1F" }}>{m.tag}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: T.ink2 }}>{ins.body}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

        </div>
      )}

      {advice && advice.error && (
        <Card style={{ padding: "24px", textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: T.red, marginBottom: 6 }}>{tr("analysisFailed")}</div>
          {errMsg && <div style={{ fontSize: 12, color: T.ink3, marginBottom: 14, background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: "8px 12px", textAlign: "left" }}>{errMsg}</div>}
          <button onClick={function() { setAdvice(null); setErrMsg(""); if (props.onSaveAnalysis) props.onSaveAnalysis(null); }}
            style={{ background: T.btn, color: "#fff", textShadow: "0 1px 2px rgba(42,31,77,0.35)", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            {tr("tryAgain")}
          </button>
        </Card>
      )}

      <div style={{ marginTop: 26, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "0 2px 11px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <span style={{ width: 3, height: 15, borderRadius: 2, background: T.orange, flexShrink: 0 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tr("askYourAdvisor")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          {chat.length > 0 && (
            <button onClick={startNewChat} title={tr("newChat")}
              style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "rgba(0,0,0,0.05)", color: T.ink2, fontSize: 13, fontWeight: 600, fontFamily: UI, padding: "8px 12px", borderRadius: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
              <SVGIcon id="plus" size={15} color={T.ink2} />
              {tr("newChat")}
            </button>
          )}
          <button onClick={function() { setHistoryOpen(true); }} title={tr("pastChats")}
            style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: T.orangeDim, color: T.orange, fontSize: 13, fontWeight: 700, fontFamily: UI, padding: "8px 12px", borderRadius: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
            <SVGIcon id="clock" size={15} color={T.orange} />
            {tr("pastChats")}
            {(props.chats && props.chats.length > 0) && (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 17, height: 17, padding: "0 4px", borderRadius: 9, background: T.orange, color: "#fff", fontSize: 10.5, fontWeight: 700, lineHeight: 1 }}>{props.chats.length}</span>
            )}
          </button>
        </div>
      </div>
      <Card style={{ overflow: "hidden", marginBottom: 24 }}>
        {chat.length > 0 && (
          <div ref={chatScrollRef} style={{ maxHeight: 300, overflowY: "auto", padding: "16px 14px 4px", display: "flex", flexDirection: "column", gap: 10 }}>
            {chat.map(function(m, i) {
              var u = m.role === "user";
              return (
                <div key={i} style={{ display: "flex", justifyContent: u ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "84%", padding: "11px 14px", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", borderRadius: u ? "16px 16px 4px 16px" : "4px 16px 16px 16px", background: u ? "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")" : "rgba(0,0,0,0.045)", color: u ? "#fff" : T.ink, boxShadow: u ? "0 4px 14px rgba(137,112,198,0.22)" : "none" }}>
                    {u ? m.text : <TypeReveal text={m.text} size={13.5} animate={i === animMsgRef.current} onTick={pinChatScroll} onDone={function() { animMsgRef.current = -1; }} />}
                  </div>
                </div>
              );
            })}
            {chatLoading && <RichardThinking size={13.5} />}
          </div>
        )}
        {chat.length === 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "16px 16px 6px" }}>
            {[tr("advisorQ1"), tr("advisorQ2"), tr("advisorQ3")].map(function(q) {
              return (
                <button key={q} onClick={function() { setInput(q); }}
                  style={{ border: "none", background: T.orangeDim, color: T.orange, fontSize: 12.5, fontWeight: 600, fontFamily: UI, padding: "8px 13px", borderRadius: 9, cursor: "pointer" }}>
                  {q}
                </button>
              );
            })}
          </div>
        )}
        {pendingUpdates && pendingUpdates.length > 0 && (
          <div style={{ padding: "13px 13px 11px", borderTop: "0.5px solid " + T.sep, background: T.orangeDim, marginTop: 10, borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.orange, marginBottom: 9, display: "flex", alignItems: "center", gap: 6 }}>
              <SVGIcon id="spark" size={15} color={T.orange} />
              Richard wants to update your app
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 11 }}>
              {pendingUpdates.map(function(a, i) {
                return (
                  <div key={i} style={{ fontSize: 13, color: T.ink, background: "rgba(255,255,255,0.55)", borderRadius: 8, padding: "8px 11px", lineHeight: 1.4 }}>
                    {updateLabel(a)}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={function() {
                applyUpdates(pendingUpdates);
                var n = pendingUpdates.length;
                setChat(function(p) { return p.concat([{ role: "assistant", text: "Done - I've updated your app with " + n + " change" + (n > 1 ? "s" : "") + ". You'll see it reflected across Overview, Activity, Budgets and Goals." }]); });
                setPendingUpdates(null);
              }}
                style={{ flex: 1, background: T.btn, color: "#fff", textShadow: "0 1px 2px rgba(42,31,77,0.35)", border: "none", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Apply {pendingUpdates.length > 1 ? "all" : ""}
              </button>
              <button onClick={function() { setPendingUpdates(null); }}
                style={{ flex: 1, background: "rgba(0,0,0,0.1)", color: T.ink2, border: "none", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Not now
              </button>
            </div>
          </div>
        )}
        {pendingAction && (
          <div style={{ padding: "12px 12px 4px", borderTop: "0.5px solid " + T.sep, background: T.orangeDim, marginTop: 10, borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.orange, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18 }}>*</span>
              {tr("richySuggests")}: {pendingAction.label}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={function() {
                if (pendingAction.type === "action") {
                  if (pendingAction.fn === "apply50/30/20") {
                    var pool = (income || 3000) * 0.8;
                    var weights = { Housing: 0.34, Food: 0.18, Transport: 0.12, Health: 0.06, Entertainment: 0.12, Shopping: 0.10, Travel: 0.04, Other: 0.04 };
                    var newB = cats.map(function(c) {
                      var w = weights[c.name];
                      if (!w) return null;
                      return { catId: c.id, category: c.name, limit: Math.round(pool * w) };
                    }).filter(Boolean);
                    if (newB.length) props.onSaveBudgets(newB);
                    setChat(function(p) { return p.concat([{ role: "assistant", text: "Done. I've set budgets across your categories along the 50/30/20 lines. Open Budgets to fine-tune." }]); });
                  } else if (pendingAction.label.indexOf("emergency fund") !== -1) {
                    var efTarget = Math.round((expense || 1000) * 3);
                    props.onSaveGoals(props.goals.concat([{ id: Date.now(), name: "Emergency Fund", target: efTarget, saved: 0 }]));
                    setChat(function(p) { return p.concat([{ role: "assistant", text: "Goal created: Emergency Fund of " + dollars(efTarget) + ". Start small and build it up." }]); });
                  } else if (pendingAction.label.indexOf("20%") !== -1) {
                    var topC = cats.map(function(c) { return { c: c, val: catSpend(c) }; }).sort(function(a, b) { return b.val - a.val; })[0];
                    if (topC && topC.val > 0) {
                      var newLimit = Math.round(topC.val * 0.8);
                      var exists = false;
                      var updated = props.budgets.map(function(b) { if (b.catId === topC.c.id) { exists = true; return { catId: b.catId, category: b.category, limit: newLimit }; } return b; });
                      if (!exists) updated = updated.concat([{ catId: topC.c.id, category: topC.c.name, limit: newLimit }]);
                      props.onSaveBudgets(updated);
                      setChat(function(p) { return p.concat([{ role: "assistant", text: "Done. I've set your " + topC.c.name + " budget to " + dollars(newLimit) + ", a 20% trim. You've got this." }]); });
                    }
                  }
                }
                setPendingAction(null);
              }}
                style={{ flex: 1, background: T.btn, color: "#fff", textShadow: "0 1px 2px rgba(42,31,77,0.35)", border: "none", borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {tr("yesDo")}
              </button>
              <button onClick={function() { setPendingAction(null); }}
                style={{ flex: 1, background: "rgba(0,0,0,0.1)", color: T.ink2, border: "none", borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {tr("notNow")}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", padding: "12px 12px", borderTop: chat.length > 0 ? "0.5px solid " + T.sep : "none" }}>
          <textarea ref={inputRef} value={input} rows={1}
            onChange={function(e) { setInput(e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!chatLoading) sendChat(); } }}
            placeholder={tr("askRichard")}
            style={{ flex: 1, border: "none", background: "rgba(0,0,0,0.045)", borderRadius: 14, outline: "none", fontSize: 14, fontFamily: UI, color: T.ink, padding: "13px 14px", resize: "none", lineHeight: 1.4, maxHeight: 132, overflowY: "auto", boxSizing: "border-box", display: "block" }} />
          <button onClick={sendChat} disabled={!input.trim() || chatLoading}
            style={{ width: 44, height: 44, border: "none", borderRadius: 14, background: input.trim() && !chatLoading ? T.btn : "rgba(0,0,0,0.1)", boxShadow: input.trim() && !chatLoading ? "0 6px 18px rgba(137,112,198,0.32)" : "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && !chatLoading ? "pointer" : "default", flexShrink: 0 }}>
            <SVGIcon id="up" size={20} color="#fff" />
          </button>
        </div>
      </Card>
      <div style={{ textAlign: "center", fontSize: 11, color: T.ink3, lineHeight: 1.55, padding: "0 10px 6px", letterSpacing: "0.01em" }}>
        {tr("advisorDisclaimer")}
      </div>

      {historyOpen && ReactDOM.createPortal((
        <div onClick={function() { setHistoryOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 95, background: "rgba(12,10,24,0.42)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={function(e) { e.stopPropagation(); }}
            style={{ width: "100%", maxWidth: 440, maxHeight: "82vh", background: T.card, borderRadius: "24px 24px 0 0", boxShadow: "0 -12px 44px rgba(12,10,24,0.34)", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>
            <div style={{ width: 38, height: 5, borderRadius: 3, background: T.orangeDim, margin: "9px auto 2px", flexShrink: 0 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 12px", borderBottom: "0.5px solid " + T.sep }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>{tr("pastChats")}</div>
                <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>{(props.chats || []).length + " " + ((props.chats || []).length === 1 ? tr("conversation") : tr("conversations"))}</div>
              </div>
              <button onClick={function() { setHistoryOpen(false); }}
                style={{ width: 36, height: 36, border: "none", borderRadius: 12, background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <SVGIcon id="close" size={16} color={T.ink2} />
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: "10px 14px", paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 8 }}>
              {(props.chats || []).length === 0 && (
                <div style={{ textAlign: "center", color: T.ink3, fontSize: 13.5, padding: "30px 10px" }}>{tr("noPastChats")}</div>
              )}
              {(props.chats || []).map(function(s) {
                var d = new Date(s.date);
                var when = isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                var count = (s.messages || []).length;
                return (
                  <div key={s.id}
                    style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.035)", borderRadius: 13, padding: "12px 13px" }}>
                    <button onClick={function() { openArchivedChat(s); }}
                      style={{ flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "transparent", cursor: "pointer", padding: 0, fontFamily: UI }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: T.ink3, marginTop: 3 }}>{when + " - " + count + " " + (count === 1 ? tr("message") : tr("messages"))}</div>
                    </button>
                    <button onClick={function() { deleteArchivedChat(s.id); }}
                      style={{ width: 32, height: 32, flexShrink: 0, border: "none", borderRadius: 10, background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <SVGIcon id="trash" size={15} color={T.ink3} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

function IconGrid(props) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 9 }}>
      {ICON_BANK.map(function(ic) {
        var on = ic === props.value;
        return (
          <button key={ic} onClick={function() { props.onChange(ic); }}
            style={{ width: 44, height: 44, borderRadius: 13, cursor: "pointer",
              background: on ? props.color + "22" : "rgba(0,0,0,0.04)",
              border: on ? "2px solid " + props.color : "2px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SVGIcon id={ic} size={22} color={on ? props.color : T.ink2} />
          </button>
        );
      })}
    </div>
  );
}

function ColorGrid(props) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 9 }}>
      {COLOR_BANK.map(function(col) {
        var on = col === props.value;
        return (
          <button key={col} onClick={function() { props.onChange(col); }}
            style={{ width: 30, height: 30, borderRadius: "50%", background: col, cursor: "pointer",
              border: on ? "3px solid rgba(0,0,0,0.28)" : "3px solid transparent",
              boxShadow: on ? "0 2px 8px " + col + "77" : "none" }} />
        );
      })}
    </div>
  );
}

function CategoryForm(props) {
  var init = props.initial;
  var _n = useState(init.name || "");
  var nm = _n[0]; var setNm = _n[1];
  var _i = useState(init.icon || ICON_BANK[0]);
  var ic = _i[0]; var setIc = _i[1];
  var _c = useState(init.color || COLOR_BANK[0]);
  var col = _c[0]; var setCol = _c[1];
  var _fd = useState(init.folderId || (props.folders[0] || {}).id || "");
  var fid = _fd[0]; var setFid = _fd[1];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <CatBadge icon={ic} color={col} size={64} />
      </div>
      <FormRow label="Name" value={nm} onChange={function(e) { setNm(e.target.value); }} />
      <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "12px 15px", marginBottom: 9 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 9 }}>Icon</div>
        <IconGrid value={ic} color={col} onChange={setIc} />
      </div>
      <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "12px 15px", marginBottom: 9 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 9 }}>Color</div>
        <ColorGrid value={col} onChange={setCol} />
      </div>
      {props.folders.length > 0 && (
        <FolderSelectRow value={fid} folders={props.folders} onChange={setFid} />
      )}
      <BigBtn label={props.submitLabel} disabled={!nm.trim()} onPress={function() {
        props.onSubmit({ name: nm.trim(), icon: ic, color: col, folderId: fid });
      }} />
      {props.onDelete && (
        <button onClick={props.onDelete}
          style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 12, padding: "6px 0" }}>
          Delete category
        </button>
      )}
    </div>
  );
}

function FolderSelectRow(props) {
  return (
    <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "12px 15px", marginBottom: 9 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Folder</div>
      <select value={props.value} onChange={function(e) { props.onChange(e.target.value); }}
        style={{ width: "100%", border: "none", background: "none", fontSize: 16, color: T.ink, fontFamily: UI, outline: "none", padding: 0 }}>
        {props.folders.map(function(f) { return <option key={f.id} value={f.id}>{f.name}</option>; })}
      </select>
    </div>
  );
}

function Categories(props) {
  var cats = props.categories || [];
  var folders = props.folders || [];
  var _nf = useState(false);
  var newFolder = _nf[0]; var setNewFolder = _nf[1];
  var _fn = useState("");
  var folderName = _fn[0]; var setFolderName = _fn[1];
  var _ec = useState(null);
  var editCat = _ec[0]; var setEditCat = _ec[1];

  function txCount(c) {
    return props.tx.filter(function(t) { return t.catId === c.id || t.category === c.name; }).length;
  }

  // Group categories by folder, preserving folder order, with a trailing "Unfiled".
  var groups = folders.map(function(f) {
    return { folder: f, items: cats.filter(function(c) { return c.folderId === f.id; }) };
  });
  var unfiled = cats.filter(function(c) { return !folders.some(function(f) { return f.id === c.folderId; }); });
  if (unfiled.length) groups.push({ folder: { id: "_unfiled", name: "Unfiled" }, items: unfiled });

  return (
    <div>
      <Overlay open={props.sheetOpen} onClose={function() { props.setSheetOpen(false); }} title="New Category">
        <CategoryForm initial={{}} folders={folders} submitLabel="Create Category"
          onSubmit={function(data) {
            props.onSaveCategories(cats.concat([{ id: "c" + Date.now(), name: data.name, icon: data.icon, color: data.color, folderId: data.folderId }]));
            props.setSheetOpen(false);
          }} />
      </Overlay>

      <Overlay open={!!editCat} onClose={function() { setEditCat(null); }} title="Edit Category">
        {editCat && (
          <CategoryForm initial={editCat} folders={folders} submitLabel="Save Changes"
            onSubmit={function(data) {
              props.onSaveCategories(cats.map(function(c) { return c.id === editCat.id ? { id: c.id, name: data.name, icon: data.icon, color: data.color, folderId: data.folderId } : c; }));
              setEditCat(null);
            }}
            onDelete={function() {
              props.onSaveCategories(cats.filter(function(c) { return c.id !== editCat.id; }));
              setEditCat(null);
            }} />
        )}
      </Overlay>

      <Overlay open={newFolder} onClose={function() { setNewFolder(false); setFolderName(""); }} title="New Folder">
        <FormRow label="Folder name" value={folderName} onChange={function(e) { setFolderName(e.target.value); }} last={true} />
        <BigBtn label="Create Folder" disabled={!folderName.trim()} onPress={function() {
          props.onSaveFolders(folders.concat([{ id: "f" + Date.now(), name: folderName.trim() }]));
          setFolderName("");
          setNewFolder(false);
        }} />
      </Overlay>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 12px" }}>
        <span style={{ fontSize: 14, color: T.ink3 }}>{cats.length} categories in {folders.length} folders</span>
        <button onClick={function() { setNewFolder(true); }}
          style={{ display: "flex", alignItems: "center", gap: 5, background: T.orangeDim, border: "none", borderRadius: 20, padding: "7px 13px", cursor: "pointer", color: T.orange, fontSize: 13, fontWeight: 700, fontFamily: UI }}>
          <SVGIcon id="folder" size={14} color={T.orange} /> New Folder
        </button>
      </div>

      {groups.map(function(grp) {
        return (
          <div key={grp.folder.id} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 8px" }}>
              <SVGIcon id="folder" size={15} color={T.ink3} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{grp.folder.name}</span>
              <span style={{ fontSize: 12, color: T.ink3 }}>{grp.items.length}</span>
            </div>
            {grp.items.length === 0 ? (
              <Card style={{ padding: "16px 18px" }}>
                <span style={{ fontSize: 13, color: T.ink3 }}>No categories here yet.</span>
              </Card>
            ) : (
              <Card style={{ overflow: "hidden" }}>
                {grp.items.map(function(c, i) {
                  return (
                    <button key={c.id} onClick={function() { setEditCat(c); }}
                      style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 16px", width: "100%", background: "none", border: "none", borderBottom: i < grp.items.length - 1 ? "0.5px solid " + T.sep : "none", cursor: "pointer", textAlign: "left", fontFamily: UI }}>
                      <CatBadge icon={c.icon} color={c.color} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, color: T.ink, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: T.ink3, marginTop: 1 }}>{txCount(c)} {txCount(c) === 1 ? "transaction" : "transactions"}</div>
                      </div>
                      <SVGIcon id="chevron" size={16} color={T.ink3} />
                    </button>
                  );
                })}
              </Card>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SubViewBack(props) {
  return (
    <button onClick={props.onBack}
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.orange, fontSize: 14, fontWeight: 600, fontFamily: UI, marginBottom: 20 }}>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      {props.label || "Profile"}
    </button>
  );
}

function CollabView(props) {
  var hh = props.household;
  var invites = props.invites || [];
  var _name = useState(""); var name = _name[0]; var setName = _name[1];
  var _email = useState(""); var email = _email[0]; var setEmail = _email[1];
  var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
  var _err = useState(""); var err = _err[0]; var setErr = _err[1];

  function run(p) {
    setErr(""); setBusy(true);
    Promise.resolve(p).then(function() { setBusy(false); })
      .catch(function(e) { setBusy(false); setErr((e && e.message) || "Something went wrong. Check the security rules are published."); });
  }
  function validEmail(s) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((s || "").trim()); }

  var inHousehold = !!(props.householdId && hh);

  return (
    <div>
      <SubViewBack onBack={props.onBack} />

      {/* Pending invitations addressed to me (only when not already in one) */}
      {!inHousehold && invites.length > 0 && invites.map(function(inv) {
        return (
          <Card key={inv.id} style={{ padding: "18px 20px", marginBottom: 14, border: "1.5px solid " + T.orangeDim }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <SVGIcon id="mail" size={20} color={T.orange} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>You're invited to join</div>
                <div style={{ fontSize: 13, color: T.ink3, marginTop: 1 }}>"{inv.name}"</div>
              </div>
            </div>
            <BigBtn label={busy ? "Joining..." : "Accept & join"} disabled={busy} onPress={function() { run(props.onAccept(inv.id)); }} />
          </Card>
        );
      })}

      {!inHousehold && (
        <div>
          <Card style={{ padding: "24px 22px", marginBottom: 16, textAlign: "center" }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <SVGIcon id="home" size={26} color={T.orange} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Share a budget together</div>
            <div style={{ fontSize: 13.5, color: T.ink3, lineHeight: 1.55 }}>
              Create a household and invite your partner. You'll share budgets, goals, and a combined balance - while each of you can still keep individual transactions private.
            </div>
          </Card>
          <Card style={{ padding: "20px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Household name</div>
            <input value={name} onChange={function(e) { setName(e.target.value); }} placeholder="Our Home"
              style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid " + T.sep, background: T.card, borderRadius: 12, padding: "12px 14px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none" }} />
            <BigBtn label={busy ? "Creating..." : "Create household"} disabled={busy || !name.trim()} onPress={function() { run(props.onCreate(name.trim())); }} />
          </Card>
          {err && <div style={{ fontSize: 13, color: T.red, fontFamily: UI, padding: "0 6px" }}>{err}</div>}
        </div>
      )}

      {inHousehold && (
        <div>
          <Card style={{ padding: "22px", marginBottom: 16, textAlign: "center" }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <SVGIcon id="home" size={26} color={T.orange} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>{hh.name}</div>
            <div style={{ fontSize: 13, color: T.ink3, marginTop: 3 }}>{(hh.members || []).length} member{(hh.members || []).length === 1 ? "" : "s"}</div>
          </Card>

          <div style={{ fontSize: 11, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 6px 8px" }}>Members</div>
          <Card style={{ overflow: "hidden", marginBottom: 16 }}>
            {(hh.members || []).map(function(m, i) {
              var isMe = m.uid === props.myUid;
              return (
                <div key={m.uid} style={{ padding: "14px 18px", borderBottom: i < (hh.members.length - 1) ? "0.5px solid " + T.sep : "none", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <SVGIcon id="user" size={18} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{m.name || m.email}{isMe ? "  (you)" : ""}</div>
                    <div style={{ fontSize: 12, color: T.ink3, marginTop: 1 }}>{m.email}</div>
                  </div>
                  {m.uid === hh.createdBy && <span style={{ fontSize: 10, fontWeight: 700, color: T.orange, background: T.orangeDim, borderRadius: 6, padding: "3px 8px", letterSpacing: "0.03em" }}>OWNER</span>}
                </div>
              );
            })}
          </Card>

          {(hh.pendingEmails || []).length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 6px 8px" }}>Invited</div>
              <Card style={{ overflow: "hidden", marginBottom: 16 }}>
                {hh.pendingEmails.map(function(pe, i) {
                  return (
                    <div key={pe} style={{ padding: "13px 18px", borderBottom: i < (hh.pendingEmails.length - 1) ? "0.5px solid " + T.sep : "none", display: "flex", alignItems: "center", gap: 12 }}>
                      <SVGIcon id="mail" size={17} color={T.ink3} />
                      <div style={{ flex: 1, fontSize: 14, color: T.ink2 }}>{pe}</div>
                      <span style={{ fontSize: 11, color: T.ink3, marginRight: 4 }}>pending</span>
                      <button onClick={function() { run(props.onCancelInvite(pe)); }} disabled={busy}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
                        <SVGIcon id="trash" size={16} color={T.red} />
                      </button>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}

          <Card style={{ padding: "20px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Invite by email</div>
            <input value={email} onChange={function(e) { setEmail(e.target.value); }} placeholder="partner@email.com" type="email"
              style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid " + T.sep, background: T.card, borderRadius: 12, padding: "12px 14px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none" }} />
            <BigBtn label={busy ? "Sending..." : "Send invite"} disabled={busy || !validEmail(email)} onPress={function() {
              run(Promise.resolve(props.onInvite(email.trim())).then(function() { setEmail(""); }));
            }} />
            <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5, marginTop: 10 }}>
              They'll see the invite here next time they open Richy and signed in with this exact email address.
            </div>
          </Card>

          {err && <div style={{ fontSize: 13, color: T.red, fontFamily: UI, padding: "0 6px 12px" }}>{err}</div>}

          <button onClick={function() { run(props.onLeave()); }} disabled={busy}
            style={{ width: "100%", background: "rgba(255,59,48,0.08)", color: T.red, border: "none", borderRadius: 16, padding: "15px 0", fontSize: 15, fontFamily: UI, fontWeight: 700, cursor: "pointer" }}>
            Leave household
          </button>
        </div>
      )}
    </div>
  );
}

// Edit the opening balance (starting money). It's stored as an income tx
// with opening=true and is excluded from monthly income/savings-rate calcs.
function EditOpeningBalanceView(props) {
  var allTx = props.tx || [];
  var openingTx = allTx.filter(function(t) { return isOpening(t); })[0];
  var current = openingTx ? openingTx.amount : 0;
  var _v = useState(String(current));
  var val = _v[0]; var setVal = _v[1];
  var sym = _currency.sym;

  function save() {
    var newAmount = parseFloat(val);
    if (isNaN(newAmount) || newAmount < 0) return;
    var updated = allTx.map(function(t) {
      if (!isOpening(t)) return t;
      return { id: t.id, type: "income", amount: round2(newAmount), label: "Opening balance", catId: "opening", category: "Opening balance", date: t.date, opening: true, repeat: "none", pending: false };
    });
    // If no opening tx exists, create one
    if (!openingTx && newAmount > 0) {
      var today = new Date().toISOString().slice(0, 10);
      updated = [{ type: "income", amount: round2(newAmount), label: "Opening balance", catId: "opening", category: "Opening balance", date: today, id: Date.now(), opening: true, repeat: "none", pending: false }].concat(updated);
    }
    props.onComplete(updated);
    props.onBack();
  }

  return (
    <div>
      <SubViewBack onBack={props.onBack} />
      <div style={{ fontSize: 14, color: T.ink3, lineHeight: 1.55, marginBottom: 16, padding: "0 2px" }}>
        Your opening balance is the money you already had when you started using Richy. It's not counted as income earned this month.
      </div>

      <Card style={{ padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Opening balance</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 22, color: T.ink3, fontWeight: 600 }}>{sym}</span>
          <input value={val} onChange={function(e) { setVal(e.target.value); }} type="number" inputMode="decimal" placeholder="0"
            style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 28, fontFamily: UI, color: T.ink, fontWeight: 700 }} />
        </div>
        {openingTx && <div style={{ fontSize: 12, color: T.ink3, marginTop: 8 }}>Current: {fmtCur(sym, current)}</div>}
      </Card>

      <BigBtn label="Save" onPress={save} />
    </div>
  );
}

// === SAVINGS ACCOUNTS SCREEN ===
// Manage separate savings pots. Adding money is either a TRANSFER from the main
// balance (logs an offsetting expense so net worth is unchanged) or EXTERNAL money
// the user already has (no main tx; balance untouched). Withdrawals either return
// to the balance (income tx) or leave entirely (lowering net worth). Closing an
// account returns any remaining balance to the main balance so no money vanishes.
var SAVINGS_ICONS = ["coins", "shield", "home", "car", "plane", "heart", "gift", "umbrella", "star", "leaf"];
var SAVINGS_COLORS = ["#8970C6", "#C8673A", "#27A85F", "#C8983A", "#4A90D9", "#D9546B", "#5BB8A8", "#9B6DB5"];

// Business Account look-and-feel banks.
var BIZ_ICONS = ["briefcase", "chart", "building", "cart", "laptop", "tool", "coins", "coffee", "leaf", "star"];
var BIZ_COLORS = ["#8970C6", "#2799C8", "#27A85F", "#C8983A", "#3B82B8", "#D9546B", "#5BB8A8", "#C8673A"];

// Default business budget buckets. Richard re-splits a monthly budget across
// these; the pct map is the local fallback when the AI call is unavailable.
var BIZ_CATEGORIES = [
  { key: "marketing",   label: "Marketing",     icon: "chart",     color: "#8970C6", pct: 0.22 },
  { key: "software",    label: "Software",      icon: "laptop",    color: "#2799C8", pct: 0.12 },
  { key: "equipment",   label: "Equipment",     icon: "tool",      color: "#27A85F", pct: 0.10 },
  { key: "inventory",   label: "Inventory",     icon: "cart",      color: "#C8983A", pct: 0.14 },
  { key: "office",      label: "Office & Rent", icon: "building",  color: "#3B82B8", pct: 0.16 },
  { key: "people",      label: "People",        icon: "user",      color: "#E0556E", pct: 0.10 },
  { key: "fees",        label: "Fees & Legal",  icon: "shield",    color: "#D9546B", pct: 0.06 },
  { key: "other",       label: "Other",         icon: "box",       color: "#8B8B8B", pct: 0.04 },
  { key: "buffer",      label: "Buffer",        icon: "coins",     color: "#6B5C4E", pct: 0.06 },
];

// Build a fresh set of business budget categories, optionally split across a
// monthly budget by the default percentages (used as the offline fallback).
function localBizSplit(monthly) {
  var m = parseFloat(monthly) || 0;
  return BIZ_CATEGORIES.map(function(c) {
    var n = Math.round(m * (c.pct || 0));
    return { key: c.key, label: c.label, icon: c.icon, color: c.color, planned: n, plannedRaw: String(n), spent: 0, entries: [] };
  });
}
// Match Richard's free-form {category, amount} list back onto our fixed business
// buckets and return a {key: amount} map.
function bizAllocToMap(arr) {
  var byKey = {};
  (arr || []).forEach(function(a) {
    var nm = String(a.category || "").toLowerCase();
    for (var i = 0; i < BIZ_CATEGORIES.length; i++) {
      var c = BIZ_CATEGORIES[i];
      if (nm.indexOf(c.key) !== -1 || nm.indexOf(c.label.toLowerCase()) !== -1) {
        byKey[c.key] = Math.max(0, Math.round(parseFloat(a.amount) || 0));
        break;
      }
    }
  });
  return byKey;
}
// Turn Richard's plan categories into our fixed business buckets with planned
// amounts. Falls back to the local percentage split if nothing matched.
function mapBizCategories(arr, monthly) {
  var base = BIZ_CATEGORIES.map(function(c) { return { key: c.key, label: c.label, icon: c.icon, color: c.color, planned: 0, plannedRaw: "0", spent: 0, entries: [] }; });
  if (Array.isArray(arr)) {
    arr.forEach(function(a) {
      var nm = String(a.category || a.label || "").toLowerCase();
      for (var i = 0; i < base.length; i++) {
        if (nm.indexOf(base[i].key) !== -1 || nm.indexOf(base[i].label.toLowerCase()) !== -1) {
          var n = Math.max(0, Math.round(parseFloat(a.amount) || 0));
          base[i].planned = n; base[i].plannedRaw = String(n);
          break;
        }
      }
    });
  }
  var sum = base.reduce(function(s, c) { return s + (c.planned || 0); }, 0);
  if (sum === 0) return localBizSplit(monthly);
  return base;
}

// ---- Business P&L math ------------------------------------------------------
// All deterministic, derived from the business's dated entry ledger. Expenses
// carry bizExpense:true + catKey; revenue deposits carry revenue:true. The
// cumulative c.spent on each category stays the all-time source of truth;
// these give the month-scoped view that keeps a "monthly budget" honest.
function bizMonthSpend(biz, ym) {
  return round2(((biz && biz.entries) || []).reduce(function(s, e) {
    return s + ((e.bizExpense && (e.date || "").slice(0, 7) === ym) ? (e.amount || 0) : 0);
  }, 0));
}
function bizMonthRevenue(biz, ym) {
  return round2(((biz && biz.entries) || []).reduce(function(s, e) {
    return s + ((e.kind === "deposit" && e.revenue && (e.date || "").slice(0, 7) === ym) ? (e.amount || 0) : 0);
  }, 0));
}
function bizMonthProfit(biz, ym) {
  var rev = bizMonthRevenue(biz, ym);
  var spend = bizMonthSpend(biz, ym);
  var profit = round2(rev - spend);
  return { revenue: rev, spend: spend, profit: profit, margin: rev > 0 ? profit / rev : null };
}
function bizCatMonthSpent(biz, key, ym) {
  return round2(((biz && biz.entries) || []).reduce(function(s, e) {
    return s + ((e.bizExpense && e.catKey === key && (e.date || "").slice(0, 7) === ym) ? (e.amount || 0) : 0);
  }, 0));
}
// Average monthly net burn (spend minus revenue, floored at zero) over up to
// the three most recent FULL months after the business was created. Without a
// full month of history, extrapolate month-to-date (with an early-month floor
// so day 1 doesn't produce silly projections); with no activity at all, fall
// back to the planned monthly budget.
function bizBurn(biz) {
  var createdYm = (((biz && biz.createdAt) || "")).slice(0, 7);
  var months = [];
  for (var i = 1; i <= 3; i++) {
    var ym = ymShift(curMonth(), i);
    if (createdYm && ym > createdYm) months.push(ym);
  }
  if (months.length) {
    var tot = 0;
    months.forEach(function(m) { tot += Math.max(0, bizMonthSpend(biz, m) - bizMonthRevenue(biz, m)); });
    return round2(tot / months.length);
  }
  var dayFrac = Math.max(0.15, monthDayFrac());
  var mtd = Math.max(0, bizMonthSpend(biz, curMonth()) - bizMonthRevenue(biz, curMonth()));
  if (mtd > 0) return round2(mtd / dayFrac);
  return ((biz && biz.profile && biz.profile.monthly) || 0);
}
// Months of cash left at the current net burn. null = self-sustaining
// (revenue covers spending, or nothing is being spent).
function bizRunway(biz) {
  var burn = bizBurn(biz);
  if (burn <= 0) return null;
  return Math.round((businessCash(biz) / burn) * 10) / 10;
}
// Month-to-date spend vs today's fair share of the monthly budget - the
// business twin of the trip livePaceInsight. null when no budget is set.
function bizPace(biz) {
  var monthly = (biz && biz.profile && biz.profile.monthly) || 0;
  if (monthly <= 0) return null;
  var dayFrac = monthDayFrac();
  var mtd = bizMonthSpend(biz, curMonth());
  var expected = monthly * dayFrac;
  var projected = round2(mtd / Math.max(0.1, dayFrac));
  var verdict = mtd > expected * 1.10 ? "over" : (mtd < expected * 0.90 ? "under" : "good");
  var msg = dollars(mtd) + " spent so far this month.";
  if (verdict === "over") msg += " At this pace the month lands around " + dollars(projected) + ", " + dollars(Math.max(0, projected - monthly)) + " over the " + dollars(monthly) + " budget.";
  else if (verdict === "under") msg += " Comfortably under the " + dollars(monthly) + " budget at this pace.";
  else msg += " Right on pace for the " + dollars(monthly) + " monthly budget.";
  return { verdict: verdict, mtd: mtd, expected: round2(expected), projected: projected, text: msg };
}
// A 5-100 health read from runway, pace, revenue vs goal and bucket overspend.
// Idea-stage businesses with no cash yet aren't punished for runway or revenue.
function bizHealth(biz) {
  var pf = (biz && biz.profile) || {};
  var stage = pf.stage || "idea";
  var score = 70;
  var runway = bizRunway(biz);
  if (!(stage === "idea" && businessCash(biz) <= 0)) {
    if (runway === null) score += 15;
    else if (runway >= 6) score += 10;
    else if (runway < 2) score -= 25;
    else if (runway < 4) score -= 10;
  }
  var pace = bizPace(biz);
  if (pace) { score += pace.verdict === "over" ? -10 : 5; }
  if (stage !== "idea" && (pf.revenueGoal || 0) > 0) {
    var target = pf.revenueGoal * monthDayFrac();
    var rev = bizMonthRevenue(biz, curMonth());
    if (rev >= target) score += 10;
    else if (rev < target * 0.5) score -= 10;
  }
  var overPenalty = 0;
  ((biz && biz.categories) || []).forEach(function(c) {
    if ((c.planned || 0) > 0 && bizCatMonthSpent(biz, c.key, curMonth()) > c.planned * 1.2) overPenalty += 5;
  });
  score -= Math.min(10, overPenalty);
  score = Math.max(5, Math.min(100, Math.round(score)));
  var label = score >= 80 ? "Strong" : score >= 60 ? "Steady" : score >= 40 ? "Watch" : "At risk";
  var color = score >= 80 ? T.green : score >= 60 ? T.orange : score >= 40 ? "#C8983A" : T.red;
  return { score: score, label: label, color: color };
}
// Trailing 14 days of revenue vs the 14 days before that.
function bizRevenueTrend(biz) {
  var now = Date.now();
  var d14 = new Date(now - 14 * 86400000).toISOString().slice(0, 10);
  var d28 = new Date(now - 28 * 86400000).toISOString().slice(0, 10);
  var recent = 0, prior = 0;
  ((biz && biz.entries) || []).forEach(function(e) {
    if (!(e.kind === "deposit" && e.revenue)) return;
    var dt = e.date || "";
    if (dt > d14) recent += e.amount || 0;
    else if (dt > d28) prior += e.amount || 0;
  });
  var verdict = recent > prior * 1.1 ? "up" : (recent < prior * 0.9 ? "down" : "flat");
  if (recent === 0 && prior === 0) verdict = "flat";
  return { recent: round2(recent), prior: round2(prior), verdict: verdict };
}

// ---- Business roadmap -------------------------------------------------------
// A stage-tuned milestone checklist Richard drafts for every business. The
// offline templates below double as the fallback when the AI is unreachable.
var LOCAL_ROADMAPS = {
  idea: [
    { title: "Prove someone wants it", tasks: ["Describe your offer in one sentence a stranger would understand", "Talk to 5 people who could be customers and write down what they say", "Find 3 competitors and note what they charge"] },
    { title: "Shape the offer", tasks: ["Pick one product or service to lead with", "Set a starting price using what competitors charge", "Decide what makes yours the obvious pick"] },
    { title: "First real sale", tasks: ["Offer it to 10 people directly", "Land one paying customer", "Write down what convinced them to buy"] }
  ],
  launching: [
    { title: "Make it official", tasks: ["Sort the legal basics - registration and any required fees", "Set your prices and write them down", "Run every business expense through this account from now on"] },
    { title: "Launch on one channel", tasks: ["Pick the one channel your customers actually use", "Show up there 3 times this week", "Ask every buyer how they found you"] },
    { title: "First 10 customers", tasks: ["Reach 10 paying customers", "Record every sale in this account", "Ask 3 customers what almost stopped them from buying"] }
  ],
  running: [
    { title: "Know your numbers", tasks: ["Log every expense and sale here for one full month", "Work out your margin on the main product", "Cut or renegotiate the biggest cost that isn't earning"] },
    { title: "Double down on what works", tasks: ["Find which channel brings the most customers", "Move budget from the weakest channel to the strongest", "Raise prices on the bestseller if margin is under 50%"] },
    { title: "Build it to last", tasks: ["Set up one repeatable way customers come back", "Write down the weekly routine the business needs", "Set next quarter's revenue target"] }
  ]
};
var MILESTONE_PRAISE = [
  "That milestone is done - real progress. The next one is already lined up for you.",
  "Another milestone down. This is exactly how businesses get built - one finished step at a time.",
  "Milestone cleared. Momentum like this is worth more than any plan on paper - keep it rolling.",
  "That's a big one done. Take a breath, then look at the next step - you're ahead of everyone who's still just talking about it."
];
function localRoadmap(biz) {
  var stage = (biz.profile && biz.profile.stage) || "idea";
  var tpl = LOCAL_ROADMAPS[stage] || LOCAL_ROADMAPS.idea;
  return {
    generatedAt: new Date().toISOString().slice(0, 10), stage: stage, source: "local",
    milestones: tpl.map(function(m, i) {
      return { id: "m" + i, title: m.title, done: false, doneAt: null, tasks: m.tasks.map(function(lbl, j) { return { id: "t" + i + "_" + j, label: lbl, done: false, doneAt: null }; }) };
    })
  };
}
function roadmapProgress(roadmap) {
  var done = 0, total = 0;
  ((roadmap && roadmap.milestones) || []).forEach(function(m) { (m.tasks || []).forEach(function(t) { total++; if (t.done) done++; }); });
  return { done: done, total: total };
}
// Ask Richard for a stage-tuned roadmap; always calls back with a valid
// roadmap object (falls back to the local template on any failure).
function buildRoadmap(biz, richardInstructions, lang, cb) {
  var pf = biz.profile || {};
  var stage = pf.stage || "idea";
  var custom = (richardInstructions && richardInstructions.trim()) ? ("CONTEXT FROM THE USER (follow any instructions; treat background as things to keep in mind):\n" + richardInstructions + "\n\n") : "";
  var langSuffix = (lang && lang !== "en") ? (" Every string value must be written entirely in " + (LANGUAGE_NAMES[lang] || "English") + ".") : "";
  var sys = custom + "You are Richard, a sharp, warm, honest business CFO inside the Richy app. Build a step-by-step roadmap that takes this owner from where they are today to a working, growing business. Reply with STRICT JSON only - no markdown, no emojis, no prose outside the JSON. Shape: {\"milestones\":[{\"title\":\"short milestone name\",\"tasks\":[{\"label\":\"one concrete action\"}]}]}. Exactly 3 or 4 milestones, 2 or 3 tasks each, ordered as a path from today to the 12-month goal. Every task must be a single concrete action the owner can physically do, MAXIMUM 16 words - include a number or deliverable where possible (like: talk to 5 potential customers, list 3 competitors and their prices). Keep the whole reply compact enough to never get cut off. Tune it to the stage: idea = validate demand before spending money (talk to real customers, define the offer, land the first paying customer); launching = make it real (legal and fees, set prices, pick one launch channel, first 10 customers, track every sale); running = sharpen the machine (review margins, double down on the best channel, keep customers coming back, systemize the busywork)." + langSuffix;
  var pl = bizMonthProfit(biz, curMonth());
  var usr = "Business: " + (biz.name || "my business") + " - " + (biz.what || "unspecified") + ". Stage: " + stage + ". Scale: " + (pf.size || "side") + ". "
    + "Monthly budget " + dollars(pf.monthly || 0) + ", revenue goal " + dollars(pf.revenueGoal || 0) + ", cash on hand " + dollars(businessCash(biz)) + ". "
    + "This month so far: " + dollars(pl.revenue) + " revenue, " + dollars(pl.spend) + " spent. "
    + "12-month goal: " + (pf.goal || "unspecified") + ". "
    + (biz.plan && biz.plan.summary ? ("Current plan summary: " + biz.plan.summary + " ") : "")
    + "Build the roadmap.";
  callClaude([{ role: "user", content: usr }], sys, 1100, function(e, text) {
    if (e || !text) { cb(localRoadmap(biz)); return; }
    try {
      var jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      var parsed = JSON.parse(jsonStr);
      var ms = (parsed.milestones || []).slice(0, 5).map(function(m, i) {
        return {
          id: "m" + i, title: String(m.title || ("Milestone " + (i + 1))).slice(0, 70), done: false, doneAt: null,
          tasks: (m.tasks || []).slice(0, 4).map(function(t, j) { return { id: "t" + i + "_" + j, label: String((t && t.label) || t || "").slice(0, 160), done: false, doneAt: null }; }).filter(function(t) { return t.label; })
        };
      }).filter(function(m) { return m.tasks.length; });
      if (!ms.length) { cb(localRoadmap(biz)); return; }
      cb({ generatedAt: new Date().toISOString().slice(0, 10), stage: stage, source: "ai", milestones: ms });
    } catch (e2) { cb(localRoadmap(biz)); }
  });
}
// Deterministic stage-graduation check: idea -> launching once real money
// moves (or a milestone lands); launching -> running once revenue is repeating.
function detectGraduation(biz) {
  var stage = (biz.profile && biz.profile.stage) || "idea";
  var entries = biz.entries || [];
  if (stage === "idea") {
    var hasExpense = false;
    for (var i = 0; i < entries.length; i++) { if (entries[i].bizExpense) { hasExpense = true; break; } }
    var msDone = false;
    var mss = (biz.roadmap && biz.roadmap.milestones) || [];
    for (var j = 0; j < mss.length; j++) { if (mss[j].done) { msDone = true; break; } }
    if (hasExpense || msDone) return "launching";
  }
  if (stage === "launching") {
    var revCount = 0;
    for (var k = 0; k < entries.length; k++) { if (entries[k].kind === "deposit" && entries[k].revenue) revCount++; }
    var goal = (biz.profile && biz.profile.revenueGoal) || 0;
    if (revCount >= 3 || (goal > 0 && bizMonthRevenue(biz, curMonth()) >= goal * 0.5)) return "running";
  }
  return null;
}

// ---- Business idea engine ---------------------------------------------------
// Deterministic growth/savings ideas from the real ledger, each with dollar
// figures. First hit feeds the weekly review; the full list backs the
// on-demand "growth ideas" panel when the AI is unreachable.
function bizIdeas(biz) {
  var out = [];
  var pf = biz.profile || {};
  var stage = pf.stage || "idea";
  var ym = curMonth();
  var monthly = pf.monthly || 0;
  var pl = bizMonthProfit(biz, ym);
  var trend = bizRevenueTrend(biz);
  var cash = businessCash(biz);
  var pace = bizPace(biz);
  var mktSpend = bizCatMonthSpent(biz, "marketing", ym);
  var mktPlanned = 0;
  var bufSpend = bizCatMonthSpent(biz, "buffer", ym);
  var big = null;
  (biz.categories || []).forEach(function(c) {
    if (c.key === "marketing") mktPlanned = c.planned || 0;
    var sp = bizCatMonthSpent(biz, c.key, ym);
    if (!big || sp > big.spend) big = { label: c.label, spend: sp };
  });
  if (stage !== "idea" && pl.revenue === 0) out.push({ title: "Get your first sale", body: "Nothing teaches faster than one real customer. Offer " + (biz.what || "your product") + " directly to 10 people this week - even at a discount - and record the sale here." });
  if (trend.verdict !== "up" && monthly > 0 && mktSpend < monthly * 0.15) out.push({ title: "Revenue has gone quiet", body: "You've spent " + dollars(mktSpend) + " on marketing this month" + (mktPlanned > mktSpend ? " of " + dollars(mktPlanned) + " budgeted" : "") + ". Put the unspent marketing money into the one channel that brought your last customers." });
  if (pl.margin !== null && pl.margin >= 0.6 && trend.verdict === "up") out.push({ title: "Room to raise prices", body: "Your margin is " + Math.round(pl.margin * 100) + "% and revenue is climbing. Test a 10% price rise on the bestseller - on " + dollars(pl.revenue) + " of monthly sales that's about " + dollars(pl.revenue * 0.1) + " extra profit for zero extra work." });
  if (pl.spend > 0 && big && big.spend > pl.spend * 0.3) out.push({ title: "One cost is eating the budget", body: big.label + " took " + dollars(big.spend) + " this month - over 30% of everything you spent. Get one competing quote or renegotiate before next month's bill." });
  if (stage === "running" && monthly > 0 && cash > monthly * 3) out.push({ title: "Idle cash could be working", body: "You're sitting on " + dollars(cash) + " - more than 3 months of budget. Reinvest a slice into whatever wins customers, or raise the Buffer deliberately instead of by default." });
  if (pace && pace.verdict === "over" && bufSpend === 0) out.push({ title: "Use the buffer on purpose", body: "Spending is running ahead of plan but the Buffer bucket is untouched. Reallocate it toward the overspending category so the plan matches reality." });
  var pads = {
    idea: [{ title: "Talk to 5 real customers", body: "Before spending more, get five honest conversations with people who might pay. Write down their exact words - that's your marketing copy later." }],
    launching: [{ title: "Pick one channel and go deep", body: "Spreading thin kills launches. Choose the single channel your buyers actually use and show up there three times this week." }],
    running: [{ title: "Systemize one chore", body: "Write down the one task that eats your week and turn it into a checklist or template. An hour saved weekly is a full week back every year." }]
  };
  (pads[stage] || pads.idea).forEach(function(p) { out.push(p); });
  return out;
}

// ---- Weekly CFO review ------------------------------------------------------
// Due once the business has any life in it and the last review is 7+ days old.
function reviewDue(biz) {
  if (!biz) return false;
  if (!((biz.entries || []).length > 0 || biz.roadmap)) return false;
  var last = (biz.reviews || [])[0];
  if (!last) return true;
  var t = new Date((last.date || "") + "T00:00:00").getTime();
  if (isNaN(t)) return true;
  return (Date.now() - t) >= 7 * 86400000;
}
// The deterministic weekly digest every review call is grounded in - Richard
// never gets to invent a number.
function bizWeeklyDigest(biz) {
  var pf = biz.profile || {};
  var ym = curMonth();
  var pl = bizMonthProfit(biz, ym);
  var health = bizHealth(biz);
  var pace = bizPace(biz);
  var runway = bizRunway(biz);
  var prog = roadmapProgress(biz.roadmap);
  var mss = (biz.roadmap && biz.roadmap.milestones) || [];
  var cur = null;
  for (var i = 0; i < mss.length; i++) { if (!mss[i].done) { cur = mss[i]; break; } }
  var nextTask = null;
  if (cur) { for (var j = 0; j < (cur.tasks || []).length; j++) { if (!cur.tasks[j].done) { nextTask = cur.tasks[j].label; break; } } }
  var catLine = (biz.categories || []).filter(function(c) { return (c.planned || 0) > 0 || bizCatMonthSpent(biz, c.key, ym) > 0; }).map(function(c) { return c.label + " " + dollars(bizCatMonthSpent(biz, c.key, ym)) + " of " + dollars(c.planned || 0); }).join("; ");
  var dayFrac = monthDayFrac();
  return "Business: " + (biz.name || "my business") + " - " + (biz.what || "unspecified") + ". Stage: " + (pf.stage || "idea") + ". "
    + "This month: revenue " + dollars(pl.revenue) + " (monthly goal " + dollars(pf.revenueGoal || 0) + ", month is " + Math.round(dayFrac * 100) + "% done), spent " + dollars(pl.spend) + " of " + dollars(pf.monthly || 0) + " budget, profit " + dollars(pl.profit) + ". "
    + "Cash " + dollars(businessCash(biz)) + ", runway " + (runway === null ? "self-sustaining" : runway + " months") + ", health " + health.score + " of 100 (" + health.label + "). "
    + (pace ? ("Pace: " + pace.text + " ") : "")
    + "Budget buckets (spent of planned): " + (catLine || "none") + ". "
    + (biz.roadmap ? ("Roadmap: " + prog.done + " of " + prog.total + " tasks done" + (cur ? (", current milestone: " + cur.title + (nextTask ? (", next task: " + nextTask) : "")) : ", all milestones complete") + ". ") : "No roadmap yet. ")
    + ((biz.reviews && biz.reviews[0]) ? ("Last week you told them: " + biz.reviews[0].headline + " ") : "This is their first weekly review. ")
    + "12-month goal: " + (pf.goal || "unspecified") + ".";
}
// Offline/parse-failure fallback so a review still lands every week.
function localWeeklyReview(biz) {
  var pf = biz.profile || {};
  var ym = curMonth();
  var health = bizHealth(biz);
  var pace = bizPace(biz);
  var runway = bizRunway(biz);
  var status = health.score >= 70 ? "on-track" : (health.score >= 45 ? "watch" : "off-track");
  var headline = status === "on-track"
    ? "Steady week for " + (biz.name || "the business") + " - the numbers are holding up."
    : status === "watch"
      ? "Worth a look this week - a couple of numbers are drifting."
      : "This week needs attention - the numbers are moving the wrong way.";
  var worst = null;
  (biz.categories || []).forEach(function(c) {
    if ((c.planned || 0) <= 0) return;
    var sp = bizCatMonthSpent(biz, c.key, ym);
    if (sp - c.planned > 0 && (!worst || sp - c.planned > worst.overBy)) worst = { label: c.label, overBy: round2(sp - c.planned), planned: c.planned };
  });
  var tip = worst
    ? { title: "Rein in " + worst.label, body: worst.label + " is " + dollars(worst.overBy) + " over its " + dollars(worst.planned) + " budget this month. Pause spending there or move budget from Buffer so the plan matches reality." }
    : { title: "Keep the ledger honest", body: "Log every business expense and sale the day it happens - the advice here is only as sharp as the numbers you feed it." };
  var warning = (runway !== null && runway < 3)
    ? { title: "Runway is short", body: "About " + runway + " months of cash left at the current burn. Cut the biggest non-earning cost or push revenue now - don't let it get to one." }
    : (pace && pace.verdict === "over")
      ? { title: "Pace is hot", body: pace.text }
      : { title: "Nothing burning", body: "No urgent risk this week. Use the calm to work the roadmap." };
  var idea = bizIdeas(biz)[0];
  return { status: status, headline: headline, tip: tip, warning: warning, idea: { title: idea.title, body: idea.body }, taskSuggestion: null, graduate: "", source: "local" };
}
// Run the weekly review. Always calls back with a stored-shape review whose
// numbers are computed locally - the model's text is advice, never data.
function runWeeklyReview(biz, richardInstructions, lang, cb) {
  var custom = (richardInstructions && richardInstructions.trim()) ? ("CONTEXT FROM THE USER (follow any instructions; treat background as things to keep in mind):\n" + richardInstructions + "\n\n") : "";
  var langSuffix = (lang && lang !== "en") ? (" Every string value must be written entirely in " + (LANGUAGE_NAMES[lang] || "English") + ".") : "";
  var sys = custom + "You are Richard, a sharp, warm, honest business CFO inside the Richy app, delivering the owner's weekly business review. Reply with STRICT JSON only - no markdown, no emojis, no prose outside the JSON. Shape: {\"status\":\"on-track\" or \"watch\" or \"off-track\",\"headline\":\"one honest sentence, max 18 words, on exactly where the business stands this week\",\"tip\":{\"title\":\"2 to 5 words\",\"body\":\"1 to 2 sentences of concrete advice tied to their real numbers\"},\"warning\":{\"title\":\"2 to 5 words\",\"body\":\"the one risk to watch, tied to a real number\"},\"idea\":{\"title\":\"2 to 5 words\",\"body\":\"one growth or savings idea, with a dollar figure where possible\"},\"taskSuggestion\":{\"label\":\"one concrete task under 14 words, or empty string\",\"milestone\":\"the milestone title to file it under, or empty string\"},\"graduate\":\"\"}. Never repeat last week's headline. Base every claim only on the numbers given - never invent figures. If the business has clearly outgrown its stage (idea stage but real money is moving; launching stage but revenue keeps arriving) set graduate to the next stage, launching or running - otherwise leave it an empty string." + langSuffix;
  callClaude([{ role: "user", content: bizWeeklyDigest(biz) }], sys, 600, function(e, text) {
    var ym = curMonth();
    var pl = bizMonthProfit(biz, ym);
    var frozen = { revenue: pl.revenue, spend: pl.spend, profit: pl.profit, runwayMonths: bizRunway(biz), healthScore: bizHealth(biz).score };
    function finish(r) {
      cb({
        id: "rev_" + Date.now(), date: new Date().toISOString().slice(0, 10),
        status: r.status, headline: r.headline, tip: r.tip, warning: r.warning, idea: r.idea,
        taskSuggestion: (r.taskSuggestion && r.taskSuggestion.label) ? r.taskSuggestion : null,
        graduate: r.graduate || "", source: r.source || "ai",
        revenue: frozen.revenue, spend: frozen.spend, profit: frozen.profit, runwayMonths: frozen.runwayMonths, healthScore: frozen.healthScore
      });
    }
    if (e || !text) { finish(localWeeklyReview(biz)); return; }
    try {
      var jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      var p = JSON.parse(jsonStr);
      var lr = localWeeklyReview(biz);
      var okStatus = { "on-track": 1, "watch": 1, "off-track": 1 };
      var okGrad = { launching: 1, running: 1 };
      if (!p.headline || !okStatus[p.status]) { finish(lr); return; }
      finish({
        status: p.status,
        headline: String(p.headline).slice(0, 170),
        tip: (p.tip && p.tip.body) ? { title: String(p.tip.title || "Tip").slice(0, 40), body: String(p.tip.body).slice(0, 300) } : lr.tip,
        warning: (p.warning && p.warning.body) ? { title: String(p.warning.title || "Watch").slice(0, 40), body: String(p.warning.body).slice(0, 300) } : lr.warning,
        idea: (p.idea && p.idea.body) ? { title: String(p.idea.title || "Idea").slice(0, 40), body: String(p.idea.body).slice(0, 300) } : lr.idea,
        taskSuggestion: (p.taskSuggestion && p.taskSuggestion.label) ? { label: String(p.taskSuggestion.label).slice(0, 120), milestone: String(p.taskSuggestion.milestone || "").slice(0, 70) } : null,
        graduate: okGrad[p.graduate] ? p.graduate : "",
        source: "ai"
      });
    } catch (e2) { finish(localWeeklyReview(biz)); }
  });
}
// One-line business summary for Richard's other surfaces (main Advisor chat,
// CFO chat live context) so he is never blind to the business.
function bizContextLine(biz) {
  var pf = biz.profile || {};
  var ym = curMonth();
  var pl = bizMonthProfit(biz, ym);
  var runway = bizRunway(biz);
  var health = bizHealth(biz);
  var prog = roadmapProgress(biz.roadmap);
  var mss = (biz.roadmap && biz.roadmap.milestones) || [];
  var cur = null;
  for (var i = 0; i < mss.length; i++) { if (!mss[i].done) { cur = mss[i]; break; } }
  var nextTask = null;
  if (cur) { for (var j = 0; j < (cur.tasks || []).length; j++) { if (!cur.tasks[j].done) { nextTask = cur.tasks[j].label; break; } } }
  return (biz.name || "Business") + " (" + (pf.stage || "idea") + " stage): cash " + dollars(businessCash(biz))
    + ", this month " + dollars(pl.revenue) + " revenue / " + dollars(pl.spend) + " spent / " + dollars(pl.profit) + " profit"
    + ", runway " + (runway === null ? "self-sustaining" : runway + " months")
    + ", health " + health.label
    + (biz.roadmap ? (", roadmap " + prog.done + " of " + prog.total + " tasks done" + (nextTask ? (", next task: " + nextTask) : "")) : "")
    + ((biz.reviews && biz.reviews[0]) ? (". Last weekly review said: " + biz.reviews[0].headline) : "") + ".";
}

function SavingsView(props) {
  var accts = props.savings || [];
  var tx = props.tx || [];
  var sym = _currency.sym;
  var today = new Date().toISOString().slice(0, 10);

  var _cr = useState(false); var creating = _cr[0]; var setCreating = _cr[1];
  var _pk = useState(false); var picking = _pk[0]; var setPicking = _pk[1];
  var _cn = useState(""); var cName = _cn[0]; var setCName = _cn[1];
  var _cic = useState("coins"); var cIcon = _cic[0]; var setCIcon = _cic[1];
  var _ccl = useState(SAVINGS_COLORS[0]); var cColor = _ccl[0]; var setCColor = _ccl[1];
  var _cam = useState(""); var cAmt = _cam[0]; var setCAmt = _cam[1];
  var _csr = useState("external"); var cSrc = _csr[0]; var setCSrc = _csr[1];

  var _act = useState(null); var act = _act[0]; var setAct = _act[1];
  var _amt = useState(""); var amt = _amt[0]; var setAmt = _amt[1];
  var _src = useState(""); var src = _src[0]; var setSrc = _src[1];
  var _wLabel = useState(""); var wLabel = _wLabel[0]; var setWLabel = _wLabel[1];
  var _wDate = useState(""); var wDate = _wDate[0]; var setWDate = _wDate[1];
  var _exp = useState(null); var expanded = _exp[0]; var setExpanded = _exp[1];
  var _ren = useState(""); var renameVal = _ren[0]; var setRenameVal = _ren[1];
  var _del = useState(null); var deleteConfirm = _del[0]; var setDeleteConfirm = _del[1];

  var total = savingsTotal(accts);
  var actAcct = act ? accts.filter(function(a) { return a.id === act.id; })[0] : null;

  function withEntry(id, entry) {
    return accts.map(function(a) {
      if (a.id !== id) return a;
      var n = {}; for (var k in a) n[k] = a[k];
      n.entries = (a.entries || []).concat([entry]);
      return n;
    });
  }
  function transferTx(type, amount, accName, suffix, dateOverride) {
    return { id: Date.now() + 1, type: type, amount: round2(amount), label: (type === "expense" ? "→ " : "← ") + accName + (suffix || ""), catId: "savings-transfer", category: "Savings transfer", transfer: true, date: dateOverride || today, repeat: "none", pending: false };
  }

  function openAction(id, kind) {
    setAct({ id: id, kind: kind });
    setAmt("");
    setSrc(kind === "add" ? "external" : "balance");
    setWLabel(""); setWDate(today);
  }
  function submitAction() {
    if (!actAcct) { setAct(null); return; }
    var v = parseFloat(amt);
    if (isNaN(v) || v <= 0) return;
    if (act.kind === "add") {
      var fromMain = src === "balance";
      var entry = { id: Date.now(), kind: "deposit", amount: round2(v), date: today, fromMain: fromMain, label: fromMain ? tr("fromBalance") : tr("externalMoney") };
      var nextSav = withEntry(actAcct.id, entry);
      if (fromMain) props.onMove(tx.concat([transferTx("expense", v, actAcct.name)]), nextSav);
      else props.onSaveSavings(nextSav);
    } else {
      var bal = savingsBalance(actAcct);
      var w = Math.min(round2(v), bal);
      if (w <= 0) { setAct(null); return; }
      var toMain = src === "balance";
      var wd = wDate || today;
      var custom = wLabel.trim();
      var entry2 = { id: Date.now(), kind: "withdraw", amount: w, date: wd, fromMain: toMain, label: custom || (toMain ? tr("toBalance") : tr("removeFromNet")) };
      var nextSav2 = withEntry(actAcct.id, entry2);
      if (toMain) props.onMove(tx.concat([transferTx("income", w, actAcct.name, custom ? (" · " + custom) : "", wd)]), nextSav2);
      else props.onSaveSavings(nextSav2);
    }
    setAct(null);
  }

  function doCreate() {
    var name = cName.trim(); if (!name) return;
    var acct = { id: "sav_" + Date.now(), name: name, color: cColor, icon: cIcon, createdAt: today, entries: [] };
    var startAmt = parseFloat(cAmt);
    var fromMain = cSrc === "balance";
    if (startAmt > 0) {
      acct.entries = [{ id: Date.now(), kind: "deposit", amount: round2(startAmt), date: today, fromMain: fromMain, label: fromMain ? tr("fromBalance") : tr("externalMoney") }];
    }
    var nextSav = accts.concat([acct]);
    if (startAmt > 0 && fromMain) props.onMove(tx.concat([transferTx("expense", startAmt, name)]), nextSav);
    else props.onSaveSavings(nextSav);
    setCreating(false); setCName(""); setCAmt(""); setCSrc("external"); setCIcon("coins"); setCColor(SAVINGS_COLORS[0]);
  }
  function doRename(acct) {
    var name = renameVal.trim(); if (!name) return;
    props.onSaveSavings(accts.map(function(a) { if (a.id !== acct.id) return a; var n = {}; for (var k in a) n[k] = a[k]; n.name = name; return n; }));
  }
  function doClose(acct) {
    var bal = savingsBalance(acct);
    var nextSav = accts.filter(function(a) { return a.id !== acct.id; });
    if (bal > 0) props.onMove(tx.concat([transferTx("income", bal, acct.name, " (" + tr("closeAccount").toLowerCase() + ")")]), nextSav);
    else props.onSaveSavings(nextSav);
    setExpanded(null);
  }
  function doDelete(acct) {
    props.onSaveSavings(accts.filter(function(a) { return a.id !== acct.id; }));
    setExpanded(null);
    setDeleteConfirm(null);
  }

  function seg(value, setter, options) {
    return (
      <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.05)", borderRadius: 11, padding: 3 }}>
        {options.map(function(o) {
          var on = value === o.v;
          return (
            <button key={o.v} onClick={function() { setter(o.v); }}
              style={{ flex: 1, border: "none", cursor: "pointer", fontFamily: UI, fontSize: 12.5, fontWeight: 700, padding: "9px 6px", borderRadius: 8, background: on ? T.btn : "transparent", color: on ? "#fff" : T.ink2, textShadow: on ? "0 1px 2px rgba(42,31,77,0.35)" : "none" }}>
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }
  var fieldCard = { padding: "16px 18px", marginBottom: 12 };
  var amtRow = { display: "flex", alignItems: "center", gap: 4 };
  var amtSym = { fontSize: 22, color: T.ink3, fontWeight: 600 };
  var amtInput = { flex: 1, border: "none", background: "none", outline: "none", fontSize: 28, fontFamily: UI, color: T.ink, fontWeight: 700, padding: 0, boxSizing: "border-box", width: "100%" };

  return (
    <div>
      <SubViewBack onBack={props.onBack} label={tr("overview")} />

      <div style={{ fontSize: 13.5, color: T.ink3, lineHeight: 1.55, marginBottom: 18, padding: "0 2px" }}>{props.onOpenBusiness ? "Money set aside outside your spendable balance. Open a savings pot, or a business account with its own budget and a plan from Richard." : tr("savingsIntro")}</div>

      {accts.length > 0 && (
        <Card style={{ padding: "18px 20px", marginBottom: 16, background: T.heroBg, boxShadow: T.heroShadow }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.heroMut, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{tr("totalSavings")}</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: T.heroText, letterSpacing: "-0.03em", lineHeight: 1 }}>{dollars(total)}</div>
          <div style={{ fontSize: 12.5, color: T.heroFaint, marginTop: 7 }}>{accts.length + " " + (accts.length === 1 ? "account" : "accounts") + " · " + tr("balanceUntouched").toLowerCase()}</div>
        </Card>
      )}

      {accts.map(function(a) {
        var bal = savingsBalance(a);
        var entries = (a.entries || []).slice().sort(function(x, y) { return (y.id || 0) - (x.id || 0); }).slice(0, 6);
        var open = expanded === a.id;
        return (
          <Card key={a.id} style={{ marginBottom: 12, overflow: "hidden" }}>
            <div style={{ padding: "15px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <CatBadge icon={a.icon || "coins"} color={a.color || T.orange} size={42} soft={true} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{(a.entries || []).length + " " + tr("history").toLowerCase()}</div>
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(bal)}</div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "0 16px 14px", alignItems: "center" }}>
              <button onClick={function() { openAction(a.id, "add"); }}
                style={{ flex: 1, border: "none", cursor: "pointer", fontFamily: UI, fontSize: 13.5, fontWeight: 700, padding: "10px 0", borderRadius: 11, background: T.btn, color: "#fff", textShadow: "0 1px 2px rgba(42,31,77,0.35)", boxShadow: "0 3px 10px " + T.orangeGlow }}>{tr("addMoney")}</button>
              <button onClick={function() { openAction(a.id, "withdraw"); }} disabled={bal <= 0}
                style={{ flex: 1, border: "1.5px solid " + (bal <= 0 ? "rgba(0,0,0,0.08)" : T.orange), cursor: bal <= 0 ? "default" : "pointer", fontFamily: UI, fontSize: 13.5, fontWeight: 700, padding: "10px 0", borderRadius: 11, background: "none", color: bal <= 0 ? T.ink3 : T.orange }}>{tr("withdraw")}</button>
              <button onClick={function() { if (open) { setExpanded(null); } else { setExpanded(a.id); setRenameVal(a.name); } }}
                style={{ width: 42, flexShrink: 0, border: "none", cursor: "pointer", background: "rgba(0,0,0,0.04)", borderRadius: 11, padding: "10px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "flex" }}><SVGIcon id="chevron" size={16} color={T.ink2} /></div>
              </button>
            </div>
            {open && (
              <div style={{ borderTop: "0.5px solid " + T.sep, padding: "14px 16px", background: "rgba(0,0,0,0.015)" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{tr("history")}</div>
                {entries.length === 0 ? (
                  <div style={{ fontSize: 13, color: T.ink3, marginBottom: 12 }}>{tr("noMovesYet")}</div>
                ) : (
                  <div style={{ marginBottom: 12 }}>
                    {entries.map(function(e) {
                      var dep = e.kind !== "withdraw";
                      return (
                        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "0.5px solid " + T.sep }}>
                          <div style={{ width: 26, height: 26, borderRadius: 8, background: (dep ? T.green : T.ink3) + "1F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <SVGIcon id={dep ? "down" : "up"} size={13} color={dep ? T.green : T.ink2} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{e.label || (dep ? tr("addMoney") : tr("withdraw"))}</div>
                            <div style={{ fontSize: 11, color: T.ink3, marginTop: 1 }}>{e.date}</div>
                          </div>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: dep ? T.green : T.ink2, flexShrink: 0 }}>{(dep ? "+" : "-") + dollars(e.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{tr("rename")}</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <input value={renameVal} onChange={function(ev) { setRenameVal(ev.target.value); }}
                    style={{ flex: 1, background: T.card, border: "1px solid " + T.sep, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box" }} />
                  <button onClick={function() { doRename(a); }} disabled={!renameVal.trim() || renameVal.trim() === a.name}
                    style={{ border: "none", cursor: "pointer", fontFamily: UI, fontSize: 13, fontWeight: 700, padding: "0 16px", borderRadius: 10, background: (!renameVal.trim() || renameVal.trim() === a.name) ? "rgba(0,0,0,0.08)" : T.orange, color: (!renameVal.trim() || renameVal.trim() === a.name) ? T.ink3 : "#fff" }}>{tr("save")}</button>
                </div>
                <button onClick={function() { doClose(a); }}
                  style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 13, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 10, padding: "6px 0", textAlign: "left" }}>
                  {tr("closeAccount")}{bal > 0 ? " · " + dollars(bal) + " → " + tr("balance").toLowerCase() : ""}
                </button>
                {deleteConfirm === a.id ? (
                  <div style={{ marginTop: 8, background: "rgba(220,50,50,0.07)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 12.5, color: T.ink2, marginBottom: 8, lineHeight: 1.45 }}>
                      {bal > 0 ? dollars(bal) + " will be permanently lost. " : ""}Delete this account?
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={function() { doDelete(a); }}
                        style={{ flex: 1, border: "none", cursor: "pointer", fontFamily: UI, fontSize: 13, fontWeight: 700, padding: "8px 0", borderRadius: 9, background: T.red, color: "#fff" }}>Delete</button>
                      <button onClick={function() { setDeleteConfirm(null); }}
                        style={{ flex: 1, border: "none", cursor: "pointer", fontFamily: UI, fontSize: 13, fontWeight: 600, padding: "8px 0", borderRadius: 9, background: "rgba(0,0,0,0.07)", color: T.ink2 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={function() { setDeleteConfirm(a.id); }}
                    style={{ width: "100%", background: "none", border: "none", color: T.ink3, fontSize: 12.5, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 2, padding: "4px 0", textAlign: "left" }}>
                    Delete account
                  </button>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {props.onOpenBusiness && (props.businesses || []).map(function(b) {
        return (
          <Card key={b.id} style={{ marginBottom: 12 }}>
            <button onClick={function() { props.onOpenBusiness(b.id); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: UI, display: "flex", alignItems: "center", gap: 12, padding: "15px 16px" }}>
              <CatBadge icon={b.icon || "briefcase"} color={b.color || T.orange} size={42} soft={true} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{b.what ? (b.what + " - Business") : "Business"}</div>
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", flexShrink: 0 }}>{dollars(businessCash(b))}</div>
            </button>
          </Card>
        );
      })}

      {creating ? (
        <Card style={{ padding: "18px 18px", marginTop: 4, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{tr("newSavingsAccount")}</div>
          <input value={cName} onChange={function(e) { setCName(e.target.value); }} placeholder={tr("savingsAccountName")} autoFocus={true}
            style={{ width: "100%", background: "rgba(0,0,0,0.04)", border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 16, fontFamily: UI, color: T.ink, fontWeight: 600, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>{tr("pickIcon")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {SAVINGS_ICONS.map(function(ic) {
              var on = ic === cIcon;
              return (
                <button key={ic} onClick={function() { setCIcon(ic); }}
                  style={{ width: 40, height: 40, borderRadius: 12, border: on ? "2px solid " + cColor : "1px solid " + T.sep, background: on ? cColor + "1F" : T.card, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SVGIcon id={ic} size={19} color={on ? cColor : T.ink3} />
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 14 }}>
            {SAVINGS_COLORS.map(function(col) {
              var on = col === cColor;
              return (
                <button key={col} onClick={function() { setCColor(col); }}
                  style={{ width: 28, height: 28, borderRadius: "50%", border: on ? "3px solid " + T.ink : "1px solid rgba(0,0,0,0.1)", background: col, cursor: "pointer", padding: 0 }} />
              );
            })}
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{tr("startingAmount")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.04)", borderRadius: 12, padding: "10px 14px", marginBottom: 10 }}>
            <span style={{ fontSize: 18, color: T.ink3, fontWeight: 600 }}>{sym}</span>
            <input value={cAmt} onChange={function(e) { setCAmt(e.target.value); }} type="number" inputMode="decimal" placeholder="0"
              style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 18, fontFamily: UI, color: T.ink, fontWeight: 700, padding: 0, boxSizing: "border-box", width: "100%" }} />
          </div>
          {parseFloat(cAmt) > 0 && (
            <div style={{ marginBottom: 6 }}>
              {seg(cSrc, setCSrc, [{ v: "external", label: tr("externalMoney") }, { v: "balance", label: tr("fromBalance") }])}
              <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 7, lineHeight: 1.45 }}>{cSrc === "external" ? tr("balanceUntouched") : tr("movesFromBalance")}</div>
            </div>
          )}
          <BigBtn label={tr("createAccount")} onPress={doCreate} disabled={!cName.trim()} />
          <button onClick={function() { setCreating(false); }}
            style={{ width: "100%", background: "none", border: "none", color: T.ink3, fontSize: 13, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 8, padding: "5px 0" }}>{tr("dismiss")}</button>
        </Card>
      ) : (
        <button onClick={function() { if (props.onOpenBusiness) { setPicking(true); } else { setCreating(true); } }}
          style={{ width: "100%", marginTop: 4, cursor: "pointer", fontFamily: UI, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 0", borderRadius: 14, background: "none", border: "1.5px dashed " + T.orange + "88", color: T.orange, fontSize: 14.5, fontWeight: 700 }}>
          <SVGIcon id="plus" size={18} color={T.orange} />{props.onOpenBusiness ? "New account" : tr("newSavingsAccount")}
        </button>
      )}

      <Overlay open={picking} onClose={function() { setPicking(false); }} title="New account">
        <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5, marginBottom: 14 }}>What kind of account do you want to open?</div>
        <button onClick={function() { setPicking(false); setCreating(true); }} style={{ width: "100%", textAlign: "left", cursor: "pointer", fontFamily: UI, display: "flex", alignItems: "center", gap: 13, padding: "15px 16px", borderRadius: 16, background: T.card, border: "1px solid " + T.sep, boxShadow: "0 1px 1px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05)", marginBottom: 10 }}>
          <CatBadge icon="coins" color={T.orange} size={42} soft={true} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Savings account</div>
            <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2, lineHeight: 1.4 }}>A simple pot for money you don't want to spend.</div>
          </div>
          <SVGIcon id="chevron" size={18} color={T.ink3} />
        </button>
        <button onClick={function() { setPicking(false); props.onOpenBusiness(null); }} style={{ width: "100%", textAlign: "left", cursor: "pointer", fontFamily: UI, display: "flex", alignItems: "center", gap: 13, padding: "15px 16px", borderRadius: 16, background: T.card, border: "1px solid " + T.sep, boxShadow: "0 1px 1px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05)" }}>
          <CatBadge icon="briefcase" color="#8970C6" size={42} soft={true} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Business account</div>
            <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2, lineHeight: 1.4 }}>Business budget categories and a plan from Richard.</div>
          </div>
          <SVGIcon id="chevron" size={18} color={T.ink3} />
        </button>
      </Overlay>

      <Overlay open={!!act} onClose={function() { setAct(null); }} title={(act && act.kind === "add" ? tr("addMoney") : tr("withdraw")) + (actAcct ? " · " + actAcct.name : "")}>
        {actAcct && (
          <div>
            {act.kind === "withdraw" && (
              <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 10 }}>{tr("balance") + ": " + dollars(savingsBalance(actAcct))}</div>
            )}
            <div style={Object.assign({}, fieldCard, { background: "rgba(0,0,0,0.04)", borderRadius: 14 })}>
              <div style={amtRow}>
                <span style={amtSym}>{sym}</span>
                <input value={amt} onChange={function(e) { setAmt(e.target.value); }} type="number" inputMode="decimal" placeholder="0" autoFocus={true} style={amtInput} />
              </div>
            </div>
            {act.kind === "add"
              ? seg(src, setSrc, [{ v: "external", label: tr("externalMoney") }, { v: "balance", label: tr("fromBalance") }])
              : seg(src, setSrc, [{ v: "balance", label: tr("toBalance") }, { v: "remove", label: tr("removeFromNet") }])}
            {act.kind === "withdraw" && (
              <div style={{ marginTop: 9 }}>
                <FormRow label={tr("name")} value={wLabel} onChange={function(e) { setWLabel(e.target.value); }} placeholder={src === "balance" ? tr("toBalance") : tr("removeFromNet")} />
                <FormRow label={tr("date")} value={wDate} onChange={function(e) { setWDate(e.target.value); }} type="date" last={true} />
              </div>
            )}
            <div style={{ fontSize: 12, color: T.ink3, marginTop: 9, lineHeight: 1.45, padding: "0 2px" }}>
              {act.kind === "add"
                ? (src === "external" ? tr("balanceUntouched") : tr("movesFromBalance"))
                : (src === "balance" ? tr("addsToBalance") : tr("leavesNetWorth"))}
            </div>
            <BigBtn label={act.kind === "add" ? tr("addMoney") : tr("withdraw")} onPress={submitAction} disabled={!(parseFloat(amt) > 0)} />
          </div>
        )}
      </Overlay>
    </div>
  );
}

// A Business Account: part savings pot (a walled-off cash balance separate from
// personal spending money), part Plan-a-Trip (business budget categories), with
// Richard acting as a CFO who interviews the owner, drafts a business plan and a
// monthly operating budget, and keeps tuning it. Capital that moves in from the
// personal balance is logged as a transfer (so net worth is unchanged); expenses
// and revenue are pot-only moves that change the business cash and net worth.
function BusinessView(props) {
  var bizes = props.businesses || [];
  var tx = props.tx || [];
  var sym = _currency.sym;
  var today = new Date().toISOString().slice(0, 10);

  var _v = useState(props.openBizId ? "detail" : "list"); var view = _v[0]; var setView = _v[1];
  var _aid = useState(props.openBizId || null); var activeId = _aid[0]; var setActiveId = _aid[1];
  var _st = useState(1); var step = _st[0]; var setStep = _st[1];
  var _fm = useState({ name: "", what: "", notes: "", wantPlan: true, structure: "individual", stage: "idea", size: "side", monthly: "", revenueGoal: "", runway: "", goal: "", startCap: "", capSrc: "external", icon: "briefcase", color: BIZ_COLORS[0] });
  var form = _fm[0]; var setForm = _fm[1];
  var _pl = useState(false); var planning = _pl[0]; var setPlanning = _pl[1];
  var _pr = useState(null); var planResult = _pr[0]; var setPlanResult = _pr[1];
  var _err = useState(""); var err = _err[0]; var setErr = _err[1];
  // Richard chat inside the budget-planning step (ask questions, retune the split
  // before the account is created).
  var _wc = useState([]); var wizChat = _wc[0]; var setWizChat = _wc[1];
  var _wci = useState(""); var wizInput = _wci[0]; var setWizInput = _wci[1];
  var _wcl = useState(false); var wizLoading = _wcl[0]; var setWizLoading = _wcl[1];

  var _act = useState(null); var act = _act[0]; var setAct = _act[1];
  var _amt = useState(""); var amt = _amt[0]; var setAmt = _amt[1];
  var _src = useState("external"); var srcc = _src[0]; var setSrc = _src[1];
  var _wLabel = useState(""); var wLabel = _wLabel[0]; var setWLabel = _wLabel[1];
  var _wDate = useState(""); var wDate = _wDate[0]; var setWDate = _wDate[1];
  var _lf = useState(null); var logFor = _lf[0]; var setLogFor = _lf[1];
  var _lfm = useState({ label: "", amount: "" }); var logForm = _lfm[0]; var setLogForm = _lfm[1];
  var _rv = useState(null); var revFor = _rv[0]; var setRevFor = _rv[1];
  var _rvm = useState({ label: "", amount: "" }); var revForm = _rvm[0]; var setRevForm = _rvm[1];
  var _de = useState({}); var detailEdits = _de[0]; var setDetailEdits = _de[1];
  var _bi = useState(""); var chatInput = _bi[0]; var setChatInput = _bi[1];
  var _bl = useState(false); var chatLoading = _bl[0]; var setChatLoading = _bl[1];
  // Text of the just-arrived CFO reply - only that message streams in.
  var animBizRef = useRef(null);
  var _rp2 = useState(false); var replanning = _rp2[0]; var setReplanning = _rp2[1];
  var _del = useState(null); var deleteConfirm = _del[0]; var setDeleteConfirm = _del[1];
  var _delOut = useState(null); var deleteOutrightConfirm = _delOut[0]; var setDeleteOutrightConfirm = _delOut[1];

  // Fresh-props ref so async AI callbacks never patch from a stale snapshot
  // (a reply can land after another save has already advanced the array).
  var bizesRef = useRef(bizes); bizesRef.current = bizes;

  // Inject the business-tab animation kit once (own id so the tab also works
  // standalone in the dev harness, without the Overview having mounted first).
  useEffect(function() {
    if (document.getElementById("richy-biz-css")) return;
    var st = document.createElement("style");
    st.id = "richy-biz-css";
    st.textContent = "@keyframes rcFadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}"
      + "@keyframes rcCheckPop{0%{transform:scale(0.6);}55%{transform:scale(1.12);}100%{transform:scale(1);}}"
      + "@keyframes rcShimmer{from{transform:translateX(-110%) skewX(-12deg);}to{transform:translateX(240%) skewX(-12deg);}}"
      + "@keyframes rcPillIn{from{opacity:0;transform:translateY(8px) scale(0.96);}to{opacity:1;transform:none;}}"
      + "@keyframes rcBadgePulse{0%,100%{opacity:1;}50%{opacity:0.35;}}"
      + ".rc-hero-scroll{scrollbar-width:none;-ms-overflow-style:none;}.rc-hero-scroll::-webkit-scrollbar{display:none;width:0;height:0;}";
    document.head.appendChild(st);
  }, []);

  // Detail hero carousel (3 panels) + P&L month picker.
  var _hp = useState(0); var heroPage = _hp[0]; var setHeroPage = _hp[1];
  var heroScrollRef = useRef(null);
  var heroScrollTimer = useRef(null);
  var _pmo = useState(0); var plMonthOff = _pmo[0]; var setPlMonthOff = _pmo[1];
  useEffect(function() {
    setHeroPage(0); setPlMonthOff(0);
    var el = heroScrollRef.current; if (el) el.scrollLeft = 0;
  }, [activeId]);
  function heroGoPage(i) { setHeroPage(i); var el = heroScrollRef.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" }); }
  function heroOnScroll(e) {
    var el = e.currentTarget;
    if (heroScrollTimer.current) clearTimeout(heroScrollTimer.current);
    heroScrollTimer.current = setTimeout(function() { var w = el.clientWidth || 1; setHeroPage(Math.round(el.scrollLeft / w)); }, 100);
  }
  function ymOffset(off) { return ymShift(curMonth(), off); }
  function ymLabel(ymStr) { var p = ymStr.split("-"); var MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return MO[(parseInt(p[1], 10) || 1) - 1] + " " + p[0]; }

  // Roadmap: generation, task toggling, milestone celebration, graduation.
  var _rb = useState(false); var roadmapBuilding = _rb[0]; var setRoadmapBuilding = _rb[1];
  var _cel = useState(null); var celebrate = _cel[0]; var setCelebrate = _cel[1];
  var _lc = useState(null); var lastChecked = _lc[0]; var setLastChecked = _lc[1];
  var _xm = useState(null); var expandedMs = _xm[0]; var setExpandedMs = _xm[1];
  var celTimer = useRef(null);
  useEffect(function() { return function() { if (celTimer.current) clearTimeout(celTimer.current); }; }, []);
  // Draft a roadmap the first time a planned business is opened - this is also
  // the retrofit path for accounts created before roadmaps existed.
  useEffect(function() {
    if (view !== "detail" || !activeId || roadmapBuilding) return;
    var b = null;
    for (var i = 0; i < bizes.length; i++) { if (bizes[i].id === activeId) { b = bizes[i]; break; } }
    if (!b || b.roadmap || !b.plan) return;
    regenRoadmap(b);
  }, [activeId, view, bizes]);
  function regenRoadmap(b) {
    setRoadmapBuilding(true);
    buildRoadmap(b, props.richardInstructions, props.lang, function(rm) {
      setRoadmapBuilding(false);
      props.onSaveBusinesses(patchBiz(b.id, { roadmap: rm }));
    });
  }
  function toggleTask(biz, mid, tid) {
    var rm = biz.roadmap; if (!rm) return;
    var completedTitle = null; var completedIdx = 0;
    var wasDone = false;
    var mss = rm.milestones || [];
    for (var i = 0; i < mss.length; i++) {
      if (mss[i].id !== mid) continue;
      var ts = mss[i].tasks || [];
      for (var j = 0; j < ts.length; j++) { if (ts[j].id === tid) { wasDone = !!ts[j].done; break; } }
      break;
    }
    var ms = mss.map(function(m, mi) {
      if (m.id !== mid) return m;
      var tasks = (m.tasks || []).map(function(t) { return t.id === tid ? Object.assign({}, t, { done: !wasDone, doneAt: !wasDone ? today : null }) : t; });
      var allDone = tasks.length > 0 && tasks.reduce(function(s, t) { return s && !!t.done; }, true);
      if (allDone && !m.done) { completedTitle = m.title; completedIdx = mi; }
      return Object.assign({}, m, { tasks: tasks, done: allDone, doneAt: allDone ? (m.doneAt || today) : null });
    });
    var patch = { roadmap: Object.assign({}, rm, { milestones: ms }) };
    if (completedTitle) {
      // A deterministic Richard reaction lands in the thread instantly; the
      // next weekly review references the progress with real context.
      patch.chat = ((biz.chat || []).concat([{ role: "richard", text: MILESTONE_PRAISE[completedIdx % MILESTONE_PRAISE.length] }])).slice(-30);
      setCelebrate({ id: mid, title: completedTitle });
      if (celTimer.current) clearTimeout(celTimer.current);
      celTimer.current = setTimeout(function() { setCelebrate(null); }, 2600);
    }
    setLastChecked(!wasDone ? tid : null);
    props.onSaveBusinesses(patchBiz(biz.id, patch));
  }
  // Weekly review + growth ideas.
  var _rvl = useState(false); var reviewLoading = _rvl[0]; var setReviewLoading = _rvl[1];
  var _pro = useState(false); var pastOpen = _pro[0]; var setPastOpen = _pro[1];
  var _gi = useState(null); var ideas = _gi[0]; var setIdeas = _gi[1];
  var _gil = useState(false); var ideasLoading = _gil[0]; var setIdeasLoading = _gil[1];
  // A due review runs when the detail opens (covers businesses beyond the
  // 2-per-session cap of the app-open sweep, and manual Refresh stays rare).
  useEffect(function() {
    if (view !== "detail" || !activeId || reviewLoading) return;
    var b = null;
    for (var i = 0; i < bizes.length; i++) { if (bizes[i].id === activeId) { b = bizes[i]; break; } }
    if (!b || !reviewDue(b)) return;
    runDetailReview(b);
  }, [activeId, view, bizes]);
  useEffect(function() { setPastOpen(false); setIdeas(null); }, [activeId]);
  function runDetailReview(b) {
    if (reviewLoading) return;
    setReviewLoading(true);
    runWeeklyReview(b, props.richardInstructions, props.lang, function(review) {
      setReviewLoading(false);
      var cur = null;
      for (var i = 0; i < bizesRef.current.length; i++) { if (bizesRef.current[i].id === b.id) { cur = bizesRef.current[i]; break; } }
      props.onSaveBusinesses(patchBiz(b.id, { reviews: [review].concat((cur || b).reviews || []).slice(0, 8) }));
    });
  }
  function addSuggestedTask(biz, review) {
    var rm = biz.roadmap;
    if (!rm || !review.taskSuggestion || review.taskSuggestion.added) return;
    var mss = rm.milestones || [];
    if (!mss.length) return;
    var targetIdx = -1;
    if (review.taskSuggestion.milestone) {
      for (var i = 0; i < mss.length; i++) { if (mss[i].title.toLowerCase().indexOf(review.taskSuggestion.milestone.toLowerCase()) !== -1) { targetIdx = i; break; } }
    }
    if (targetIdx === -1) { for (var j = 0; j < mss.length; j++) { if (!mss[j].done) { targetIdx = j; break; } } }
    if (targetIdx === -1) targetIdx = mss.length - 1;
    var ms = mss.map(function(m, mi) {
      if (mi !== targetIdx) return m;
      return Object.assign({}, m, { done: false, doneAt: null, tasks: (m.tasks || []).concat([{ id: "ts_" + Date.now(), label: review.taskSuggestion.label, done: false, doneAt: null }]) });
    });
    var reviews = (biz.reviews || []).map(function(r) { return r.id === review.id ? Object.assign({}, r, { taskSuggestion: Object.assign({}, r.taskSuggestion, { added: true }) }) : r; });
    props.onSaveBusinesses(patchBiz(biz.id, { roadmap: Object.assign({}, rm, { milestones: ms }), reviews: reviews }));
  }
  function fetchIdeas(biz) {
    if (ideasLoading) return;
    setIdeasLoading(true); setIdeas(null);
    var custom = (props.richardInstructions && props.richardInstructions.trim()) ? ("CONTEXT FROM THE USER (follow any instructions; treat background as things to keep in mind):\n" + props.richardInstructions + "\n\n") : "";
    var sys = custom + "You are Richard, a sharp, warm, honest business CFO inside the Richy app. Give the owner growth ideas grounded ONLY in the numbers provided - never invent figures. Reply with STRICT JSON only - no markdown, no emojis, no prose outside the JSON. Shape: {\"ideas\":[{\"title\":\"2 to 6 words\",\"body\":\"2 to 3 concrete sentences tied to their numbers\",\"impact\":\"one short line like: about $120 more per month, or empty string\"}]} with EXACTLY 3 ideas." + langLine();
    callClaude([{ role: "user", content: bizWeeklyDigest(biz) + " Give me 3 growth ideas." }], sys, 500, function(e, text) {
      setIdeasLoading(false);
      if (!e && text) {
        try {
          var p = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
          if (Array.isArray(p.ideas) && p.ideas.length) {
            setIdeas(p.ideas.slice(0, 3).map(function(x) { return { title: String(x.title || "Idea").slice(0, 50), body: String(x.body || "").slice(0, 340), impact: String(x.impact || "").slice(0, 60) }; }));
            return;
          }
        } catch (e2) {}
      }
      setIdeas(bizIdeas(biz).slice(0, 3).map(function(x) { return { title: x.title, body: x.body, impact: "" }; }));
    });
  }
  function graduateBiz(biz, newStage) {
    var pf = {}; for (var k in (biz.profile || {})) pf[k] = biz.profile[k];
    var from = pf.stage || "idea";
    if (from === newStage) return;
    pf.stage = newStage;
    var line = newStage === "launching"
      ? "Big moment - " + (biz.name || "the business") + " just moved from idea to launch. I've rebuilt the roadmap for a business that's really out there now."
      : "Big moment - " + (biz.name || "the business") + " is officially a running business. New roadmap: sharper margins, repeat customers, systems.";
    props.onSaveBusinesses(patchBiz(biz.id, {
      profile: pf,
      graduations: (biz.graduations || []).concat([{ from: from, to: newStage, date: today }]),
      chat: ((biz.chat || []).concat([{ role: "richard", text: line }])).slice(-30),
      roadmap: null
    }));
    setCelebrate({ id: "grad", title: newStage === "launching" ? "Launched" : "Up and running" });
    if (celTimer.current) clearTimeout(celTimer.current);
    celTimer.current = setTimeout(function() { setCelebrate(null); }, 2600);
    regenRoadmap(Object.assign({}, biz, { profile: pf }));
  }

  var STRUCTURES = [{ v: "company", l: "Company" }, { v: "individual", l: "Individual" }, { v: "freelancer", l: "Freelancer" }];
  var STAGES = [{ v: "idea", l: "Just an idea" }, { v: "launching", l: "Launching soon" }, { v: "running", l: "Already running" }];
  var SIZES = [{ v: "side", l: "Side project" }, { v: "growing", l: "Growing venture" }, { v: "full", l: "Full company" }];
  function labelOf(list, v) { for (var i = 0; i < list.length; i++) { if (list[i].v === v) return list[i].l; } return v; }
  function langLine() { return (props.lang && props.lang !== "en") ? (" Every string value must be written entirely in " + (LANGUAGE_NAMES[props.lang] || "English") + ".") : ""; }

  function setField(k, val) { setForm(function(p) { var n = {}; for (var key in p) n[key] = p[key]; n[k] = val; return n; }); }
  function setLogField(k, val) { setLogForm(function(p) { var n = {}; for (var key in p) n[key] = p[key]; n[k] = val; return n; }); }
  function setRevField(k, val) { setRevForm(function(p) { var n = {}; for (var key in p) n[key] = p[key]; n[k] = val; return n; }); }
  function setDetailEdit(id, field, val) { setDetailEdits(function(prev) { var n = {}; for (var k in prev) n[k] = prev[k]; n[id + "_" + field] = val; return n; }); }
  function clearDetailEdit(id, field) { setDetailEdits(function(prev) { var n = {}; for (var k in prev) n[k] = prev[k]; delete n[id + "_" + field]; return n; }); }
  function getDetailEdit(id, field, fallback) { var k = id + "_" + field; return detailEdits.hasOwnProperty(k) ? detailEdits[k] : String(fallback); }

  var activeBiz = null;
  for (var bi = 0; bi < bizes.length; bi++) { if (bizes[bi].id === activeId) { activeBiz = bizes[bi]; break; } }

  function transferTx(type, amount, bizName, suffix, dateOverride) {
    return { id: Date.now() + 1, type: type, amount: round2(amount), label: (type === "expense" ? "-> " : "<- ") + bizName + (suffix || ""), catId: "savings-transfer", category: "Business transfer", transfer: true, date: dateOverride || today, repeat: "none", pending: false };
  }
  function patchBiz(id, patch) {
    return bizesRef.current.map(function(b) { if (b.id !== id) return b; var n = {}; for (var k in b) n[k] = b[k]; for (var k2 in patch) n[k2] = patch[k2]; return n; });
  }

  // ---- Intake / plan generation -------------------------------------------
  function defaultBizTips() {
    return [
      "Keep business and personal money separate from day one - it makes taxes and decisions far cleaner.",
      "Watch your runway: know how many months you can operate before revenue has to cover costs.",
      "Reinvest early profit into whatever directly wins you more customers."
    ];
  }
  function localPlan() {
    var monthly = parseFloat(form.monthly) || 0;
    return {
      summary: "A " + labelOf(SIZES, form.size).toLowerCase() + " " + (form.what || "business") + " run as " + (form.structure === "company" ? "a company" : "an " + labelOf(STRUCTURES, form.structure).toLowerCase()) + ". Start lean, prove people will pay, then scale the spending that works.",
      sections: [
        { title: "Positioning", body: "Be clear on who you serve and the one problem you solve better than anyone. A sharp niche beats a broad, generic offer when you are starting out." },
        { title: "First 90 days", body: "Get to your first paying customers fast. Spend on the one or two channels that reach them directly and ignore everything else for now." },
        { title: "Money discipline", body: "Fund the account with what you can afford to lose, track every expense against a category, and keep a buffer so a slow month never sinks you." },
        { title: "Biggest risk", body: "Spending on things that feel productive but do not bring customers. Tie every dollar to growth or survival." }
      ],
      categories: localBizSplit(monthly),
      tips: defaultBizTips(),
      verdict: { assessment: monthly > 0 ? "A " + dollars(monthly) + "/mo budget is a reasonable starting point - keep it lean until revenue proves the model." : "Set a monthly budget so we can pace your spending and runway.", keyNumber: (parseFloat(form.runway) || 0) > 0 ? (form.runway + " months") : dollars(monthly) + "/mo", keyNumberLabel: (parseFloat(form.runway) || 0) > 0 ? "of runway" : "operating budget" }
    };
  }
  function applyLocalPlan() { setPlanResult(localPlan()); setPlanning(false); }
  function buildPlan() {
    setPlanning(true); setErr("");
    var monthly = parseFloat(form.monthly) || 0;
    var custom = (props.richardInstructions && props.richardInstructions.trim()) ? ("CONTEXT FROM THE USER (follow any instructions; treat background as things to keep in mind):\n" + props.richardInstructions + "\n\n") : "";
    var sys = custom + "You are Richard, a sharp, warm, honest business CFO and startup advisor inside the Richy app. Build a practical, realistic, encouraging business plan and a monthly operating budget for the user's business, run against the real numbers they give you. Reply with STRICT JSON only - no markdown, no emojis, no prose outside the JSON. Shape: {\"summary\":\"2 to 3 sentence plain-English summary of the business and the path to making it work\",\"sections\":[{\"title\":\"short section title\",\"body\":\"2 to 4 sentences of concrete, specific advice\"}],\"categories\":[{\"category\":\"Marketing\",\"amount\":0,\"note\":\"\"}],\"tips\":[\"short actionable tip\"],\"verdict\":{\"assessment\":\"one honest sentence on whether this budget and runway are realistic\",\"keyNumber\":\"the single most important figure e.g. 7 months runway or break-even at $4k/mo\",\"keyNumberLabel\":\"what that figure means in 2 to 4 words\"}}. Provide 4 to 6 sections covering positioning, the first 90 days, pricing and revenue, costs to watch, and the biggest risk. The categories must be chosen only from: Marketing, Software, Equipment, Inventory, Office & Rent, People, Fees & Legal, Other, Buffer, and the amounts are whole numbers that sum to about the monthly budget. Be honest if the budget or runway looks too thin." + langLine();
    var usr = "Business name: " + (form.name || "my business") + ". What it does: " + (form.what || "unspecified") + ". "
      + "Legal structure: " + labelOf(STRUCTURES, form.structure) + ". Stage: " + labelOf(STAGES, form.stage) + ". Scale: " + labelOf(SIZES, form.size) + ". "
      + "Planned monthly spend: " + dollars(monthly) + ". Monthly revenue goal: " + dollars(parseFloat(form.revenueGoal) || 0) + ". "
      + "Runway / savings set aside: " + ((parseFloat(form.runway) || 0) > 0 ? (form.runway + " months") : "not specified") + ". "
      + "What success looks like in 12 months: " + (form.goal || "not specified") + ". "
      + (form.notes && form.notes.trim() ? ("Notes for Richard from the owner: " + form.notes.trim() + ". ") : "")
      + "Build the plan, split the monthly budget across the buckets, give 4 short practical tips, and give an honest verdict on whether this is realistic.";
    callClaude([{ role: "user", content: usr }], sys, 1200, function(e, text) {
      if (e || !text) { applyLocalPlan(); return; }
      try {
        var jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
        var parsed = JSON.parse(jsonStr);
        setPlanResult({
          summary: parsed.summary || localPlan().summary,
          sections: (Array.isArray(parsed.sections) && parsed.sections.length) ? parsed.sections.slice(0, 6) : localPlan().sections,
          categories: mapBizCategories(parsed.categories, monthly),
          tips: (Array.isArray(parsed.tips) && parsed.tips.length) ? parsed.tips.slice(0, 5) : defaultBizTips(),
          verdict: (parsed.verdict && parsed.verdict.assessment) ? parsed.verdict : null
        });
        setPlanning(false);
      } catch (e2) { applyLocalPlan(); }
    });
  }
  function startWizard() {
    setForm({ name: "", what: "", notes: "", wantPlan: true, structure: "individual", stage: "idea", size: "side", monthly: "", revenueGoal: "", runway: "", goal: "", startCap: "", capSrc: "external", icon: "briefcase", color: BIZ_COLORS[0] });
    setPlanResult(null); setErr(""); setStep(1); setWizChat([]); setWizInput(""); setView("wizard");
  }
  // Create the account from whatever we have. With a plan the categories come from
  // planResult; without one (the owner skipped Richard) we seed a blank budget they
  // can fill in themselves later.
  function commitBusiness(plan, categories, profileExtra) {
    var startCap = parseFloat(form.startCap) || 0;
    var fromMain = form.capSrc === "balance";
    var entries = [];
    if (startCap > 0) {
      entries = [{ id: Date.now(), kind: "deposit", amount: round2(startCap), date: today, fromMain: fromMain, label: fromMain ? "From balance" : "Starting capital" }];
    }
    var profile = { structure: form.structure, stage: form.stage, size: form.size, monthly: parseFloat(form.monthly) || 0, revenueGoal: parseFloat(form.revenueGoal) || 0, runway: parseFloat(form.runway) || 0, goal: form.goal || "", notes: form.notes || "" };
    for (var k in (profileExtra || {})) profile[k] = profileExtra[k];
    var biz = {
      id: "biz_" + Date.now(), name: form.name || "My Business", what: form.what || "",
      icon: form.icon || "briefcase", color: form.color || BIZ_COLORS[0], createdAt: today,
      profile: profile, plan: plan, categories: categories, entries: entries,
      // Carry the wizard conversation into the account's CFO thread so the
      // owner's setup questions and Richard's answers aren't lost.
      chat: wizChat.slice(-30)
    };
    var next = bizes.concat([biz]);
    if (startCap > 0 && fromMain) props.onBusinessMove(tx.concat([transferTx("expense", startCap, biz.name)]), next);
    else props.onSaveBusinesses(next);
    setActiveId(biz.id); setView("detail");
  }
  function saveBusiness() {
    if (!planResult) return;
    commitBusiness({ summary: planResult.summary, sections: planResult.sections, tips: planResult.tips, verdict: planResult.verdict, generatedAt: today }, planResult.categories, null);
  }
  // Owner declined a plan: skip the questionnaire entirely and create a bare
  // account with an empty budget they can shape later (or ask Richard from inside).
  function createBlank() {
    commitBusiness(null, localBizSplit(0), { structure: "individual", stage: "idea", size: "side", monthly: 0 });
  }
  // Richard chat that lives in the plan-review step: ask questions and let him
  // retune the proposed split via the @@ALLOC directive before saving.
  function applyAllocToWizard(arr) {
    var byKey = bizAllocToMap(arr);
    if (!Object.keys(byKey).length) return false;
    setPlanResult(function(pr) {
      if (!pr) return pr;
      return Object.assign({}, pr, { categories: pr.categories.map(function(c) { return byKey.hasOwnProperty(c.key) ? Object.assign({}, c, { planned: byKey[c.key], plannedRaw: String(byKey[c.key]) }) : c; }) });
    });
    return true;
  }
  function sendWizNote() {
    if (!wizInput.trim() || wizLoading || !planResult) return;
    var msg = wizInput.trim();
    setWizInput("");
    var nc = wizChat.concat([{ role: "user", text: msg }]);
    setWizChat(nc); setWizLoading(true);
    var monthly = parseFloat(form.monthly) || 0;
    var split = planResult.categories.map(function(c) { return c.label + ": " + dollars(c.planned || 0); }).join("; ");
    var custom = (props.richardInstructions && props.richardInstructions.trim()) ? ("CONTEXT FROM THE USER (follow any instructions; treat background as things to keep in mind):\n" + props.richardInstructions + "\n\n") : "";
    var sys = custom + "You are Richard, a warm, sharp business CFO inside the Richy app, helping set up a new business budget. "
      + "Business: " + (form.name || "the business") + " - " + (form.what || "unspecified") + ". Structure: " + labelOf(STRUCTURES, form.structure) + ". Stage: " + labelOf(STAGES, form.stage) + ". Scale: " + labelOf(SIZES, form.size) + ". Monthly budget " + dollars(monthly) + ", revenue goal " + dollars(parseFloat(form.revenueGoal) || 0) + ". "
      + (form.notes && form.notes.trim() ? ("Owner's notes: " + form.notes.trim() + ". ") : "")
      + "Current proposed budget split: " + (split || "not set") + ". "
      + "Answer the owner's question with concrete, practical advice. You can DIRECTLY change the split, not just describe it. When the owner wants a change, give one short plain-text sentence explaining what you did, then on a new line append a directive in EXACTLY this form: @@ALLOC[{\"category\":\"Marketing\",\"amount\":600},{\"category\":\"Software\",\"amount\":150}] "
      + "Only list the buckets you are changing, using whole numbers, and keep the overall total close to " + dollars(monthly) + " by also adjusting Buffer or Other when needed. Categories must be from: Marketing, Software, Equipment, Inventory, Office & Rent, People, Fees & Legal, Other, Buffer. "
      + "Only include the @@ALLOC directive when you actually intend to change the split; for general questions just answer normally." + RICHARD_FORMAT + " The @@ALLOC directive, when you use it, must be the very last thing in your reply.";
    callClaude(nc.map(function(m) { return { role: m.role === "user" ? "user" : "assistant", content: m.text }; }), sys, 450, function(e, reply) {
      setWizLoading(false);
      if (e || !reply) { setWizChat(function(p) { return p.concat([{ role: "richard", text: "Sorry, I could not connect. Try again." }]); }); return; }
      var parsed = extractAllocDirective(reply);
      var applied = false;
      if (parsed.allocations) { applied = applyAllocToWizard(parsed.allocations); }
      animBizRef.current = parsed.text;
      setWizChat(function(p) { var next = p.concat([{ role: "richard", text: parsed.text }]); if (applied) next = next.concat([{ role: "system", text: "Budget updated" }]); return next; });
    });
  }

  // ---- Capital, expenses, revenue -----------------------------------------
  function openAction(id, kind) { setAct({ id: id, kind: kind }); setAmt(""); setSrc(kind === "add" ? "external" : "balance"); setWLabel(""); setWDate(today); }
  function submitAction() {
    if (!activeBiz) { setAct(null); return; }
    var v = parseFloat(amt);
    if (isNaN(v) || v <= 0) { setAct(null); return; }
    if (act.kind === "add") {
      var fromMain = srcc === "balance";
      var entry = { id: Date.now(), kind: "deposit", amount: round2(v), date: today, fromMain: fromMain, label: fromMain ? "From balance" : "Capital added" };
      var next = patchBiz(activeBiz.id, { entries: (activeBiz.entries || []).concat([entry]) });
      if (fromMain) props.onBusinessMove(tx.concat([transferTx("expense", v, activeBiz.name)]), next);
      else props.onSaveBusinesses(next);
    } else {
      var bal = businessCash(activeBiz);
      var w = Math.min(round2(v), bal);
      if (w <= 0) { setAct(null); return; }
      var toMain = srcc === "balance";
      var wd = wDate || today;
      var custom = wLabel.trim();
      var entry2 = { id: Date.now(), kind: "withdraw", amount: w, date: wd, fromMain: toMain, label: custom || (toMain ? "To balance" : "Taken out") };
      var next2 = patchBiz(activeBiz.id, { entries: (activeBiz.entries || []).concat([entry2]) });
      if (toMain) props.onBusinessMove(tx.concat([transferTx("income", w, activeBiz.name, custom ? (" · " + custom) : "", wd)]), next2);
      else props.onSaveBusinesses(next2);
    }
    setAct(null);
  }
  // Pure patch builders shared by the buttons and the @@BIZ chat directive,
  // so both paths write identical shapes.
  function buildExpensePatch(biz, key, label, amount, eid) {
    var cat = null; for (var j = 0; j < biz.categories.length; j++) { if (biz.categories[j].key === key) { cat = biz.categories[j]; break; } }
    var lbl = label || ((cat && cat.label) || "Expense");
    var cats = biz.categories.map(function(c) {
      return c.key === key ? Object.assign({}, c, { spent: round2((c.spent || 0) + amount), entries: (c.entries || []).concat([{ id: eid, label: lbl, amount: round2(amount), date: today }]) }) : c;
    });
    return { categories: cats, entries: (biz.entries || []).concat([{ id: eid, kind: "withdraw", amount: round2(amount), date: today, fromMain: false, label: lbl, bizExpense: true, catKey: key }]) };
  }
  function buildRevenuePatch(biz, label, amount, eid) {
    return { entries: (biz.entries || []).concat([{ id: eid, kind: "deposit", amount: round2(amount), date: today, fromMain: false, label: label ? ("Revenue: " + label) : "Revenue", revenue: true }]) };
  }
  function logExpense(bizId, key) {
    var biz = null; for (var i = 0; i < bizes.length; i++) { if (bizes[i].id === bizId) { biz = bizes[i]; break; } }
    var v = parseFloat(logForm.amount) || 0;
    if (!biz || v <= 0) { setLogFor(null); return; }
    props.onSaveBusinesses(patchBiz(bizId, buildExpensePatch(biz, key, logForm.label, v, Date.now())));
    setLogFor(null); setLogForm({ label: "", amount: "" });
  }
  function deleteExpense(bizId, key, eid) {
    var biz = null; for (var i = 0; i < bizes.length; i++) { if (bizes[i].id === bizId) { biz = bizes[i]; break; } }
    if (!biz) return;
    var removed = 0;
    var cats = biz.categories.map(function(c) {
      if (c.key !== key) return c;
      var kept = (c.entries || []).filter(function(e) { if (e.id === eid) { removed = e.amount || 0; return false; } return true; });
      return Object.assign({}, c, { spent: round2(Math.max(0, (c.spent || 0) - removed)), entries: kept });
    });
    var ents = (biz.entries || []).filter(function(e) { return e.id !== eid; });
    props.onSaveBusinesses(patchBiz(bizId, { categories: cats, entries: ents }));
  }
  function logRevenue(bizId) {
    var biz = null; for (var i = 0; i < bizes.length; i++) { if (bizes[i].id === bizId) { biz = bizes[i]; break; } }
    var v = parseFloat(revForm.amount) || 0;
    if (!biz || v <= 0) { setRevFor(null); return; }
    props.onSaveBusinesses(patchBiz(bizId, buildRevenuePatch(biz, revForm.label, v, Date.now())));
    setRevFor(null); setRevForm({ label: "", amount: "" });
  }
  function updatePlanned(bizId, key, rawVal) {
    var n = rawVal === "" ? 0 : Math.max(0, parseFloat(rawVal) || 0);
    var biz = null; for (var i = 0; i < bizes.length; i++) { if (bizes[i].id === bizId) { biz = bizes[i]; break; } }
    if (!biz) return;
    var cats = biz.categories.map(function(c) { return c.key === key ? Object.assign({}, c, { planned: n }) : c; });
    props.onSaveBusinesses(patchBiz(bizId, { categories: cats }));
  }
  function closeBusiness(biz) {
    var bal = businessCash(biz);
    var next = bizes.filter(function(b) { return b.id !== biz.id; });
    if (bal > 0) props.onBusinessMove(tx.concat([transferTx("income", bal, biz.name, " (closed)")]), next);
    else props.onSaveBusinesses(next);
    setView("list"); setActiveId(null); setDeleteConfirm(null);
  }
  function deleteBusinessOutright(biz) {
    props.onSaveBusinesses(bizes.filter(function(b) { return b.id !== biz.id; }));
    setView("list"); setActiveId(null); setDeleteConfirm(null); setDeleteOutrightConfirm(null);
  }

  // ---- Richard CFO chat + replan ------------------------------------------
  // Apply a @@BIZ ops list onto a working copy of the business. Returns the
  // combined field patch, one system chip per applied op, and any stage move
  // (which the caller turns into a graduation) - or null if nothing applied.
  function applyBizOps(biz, ops) {
    var work = biz; var chips = []; var stageTo = null;
    var eid = Date.now();
    (ops || []).forEach(function(op) {
      if (!op || !op.op) return;
      if (op.op === "expense") {
        var amt = parseFloat(op.amount) || 0; if (amt <= 0) return;
        var byKey = bizAllocToMap([{ category: op.category, amount: 1 }]);
        var key = null; for (var kk in byKey) { key = kk; break; }
        if (!key) key = "other";
        work = Object.assign({}, work, buildExpensePatch(work, key, op.label, amt, eid++));
        var catLabel = "Other";
        for (var i = 0; i < BIZ_CATEGORIES.length; i++) { if (BIZ_CATEGORIES[i].key === key) { catLabel = BIZ_CATEGORIES[i].label; break; } }
        chips.push("Logged " + dollars(amt) + " to " + catLabel);
      } else if (op.op === "revenue") {
        var amt2 = parseFloat(op.amount) || 0; if (amt2 <= 0) return;
        work = Object.assign({}, work, buildRevenuePatch(work, op.label, amt2, eid++));
        chips.push("Recorded " + dollars(amt2) + " revenue");
      } else if (op.op === "taskDone") {
        var rm = work.roadmap; if (!rm || !op.task) return;
        var needle = String(op.task).toLowerCase();
        var mss = rm.milestones || [];
        var foundM = null, foundT = null;
        for (var mi = 0; mi < mss.length && !foundT; mi++) {
          var ts = mss[mi].tasks || [];
          for (var ti = 0; ti < ts.length; ti++) {
            var lbl = (ts[ti].label || "").toLowerCase();
            if (!ts[ti].done && (lbl.indexOf(needle) !== -1 || needle.indexOf(lbl) !== -1)) { foundM = mss[mi]; foundT = ts[ti]; break; }
          }
        }
        if (!foundT) return;
        var ms2 = mss.map(function(m) {
          if (m.id !== foundM.id) return m;
          var tasks = (m.tasks || []).map(function(t) { return t.id === foundT.id ? Object.assign({}, t, { done: true, doneAt: today }) : t; });
          var allDone = tasks.length > 0 && tasks.reduce(function(s, t) { return s && !!t.done; }, true);
          return Object.assign({}, m, { tasks: tasks, done: allDone, doneAt: allDone ? (m.doneAt || today) : m.doneAt });
        });
        work = Object.assign({}, work, { roadmap: Object.assign({}, rm, { milestones: ms2 }) });
        chips.push("Task completed: " + foundT.label);
      } else if (op.op === "taskAdd") {
        var rm3 = work.roadmap; if (!rm3 || !op.task) return;
        var mss3 = rm3.milestones || []; if (!mss3.length) return;
        var idx = -1;
        if (op.milestone) { for (var a = 0; a < mss3.length; a++) { if (mss3[a].title.toLowerCase().indexOf(String(op.milestone).toLowerCase()) !== -1) { idx = a; break; } } }
        if (idx === -1) { for (var b2 = 0; b2 < mss3.length; b2++) { if (!mss3[b2].done) { idx = b2; break; } } }
        if (idx === -1) idx = mss3.length - 1;
        var ms3 = mss3.map(function(m, mj) { return mj === idx ? Object.assign({}, m, { done: false, doneAt: null, tasks: (m.tasks || []).concat([{ id: "tc_" + (eid++), label: String(op.task).slice(0, 160), done: false, doneAt: null }]) }) : m; });
        work = Object.assign({}, work, { roadmap: Object.assign({}, rm3, { milestones: ms3 }) });
        chips.push("Added to roadmap: " + String(op.task).slice(0, 60));
      } else if (op.op === "stage") {
        var curStage = (work.profile && work.profile.stage) || "idea";
        var fwd = { idea: { launching: 1, running: 1 }, launching: { running: 1 }, running: {} };
        if (!fwd[curStage] || !fwd[curStage][op.value]) return;
        var pf = {}; for (var pk in (work.profile || {})) pf[pk] = work.profile[pk];
        pf.stage = op.value;
        work = Object.assign({}, work, { profile: pf, graduations: (work.graduations || []).concat([{ from: curStage, to: op.value, date: today }]), roadmap: null });
        stageTo = op.value;
        chips.push("Graduated to " + (op.value === "running" ? "running" : "launching"));
      }
    });
    if (work === biz) return null;
    var patch = {};
    ["categories", "entries", "roadmap", "profile", "graduations"].forEach(function(f) { if (work[f] !== biz[f]) patch[f] = work[f]; });
    return { patch: patch, chips: chips, stageTo: stageTo, work: work };
  }
  // The thread lives on the business object itself (biz.chat, capped at 30
  // messages) so the conversation survives reloads and syncs across devices.
  function sendChat(biz) {
    if (!chatInput.trim() || chatLoading) return;
    var msg = chatInput.trim();
    setChatInput("");
    var nc = (biz.chat || []).concat([{ role: "user", text: msg }]);
    props.onSaveBusinesses(patchBiz(biz.id, { chat: nc.slice(-30) }));
    setChatLoading(true);
    var pf = biz.profile || {};
    var ymNow = curMonth();
    var split = (biz.categories || []).map(function(c) { return c.label + ": " + dollars(c.planned || 0) + " budgeted, " + dollars(bizCatMonthSpent(biz, c.key, ymNow)) + " spent this month"; }).join("; ");
    var paceNow = bizPace(biz);
    var openTasks = [];
    var mssC = (biz.roadmap && biz.roadmap.milestones) || [];
    for (var oi = 0; oi < mssC.length && openTasks.length < 6; oi++) {
      if (mssC[oi].done) continue;
      var tsC = mssC[oi].tasks || [];
      for (var oj = 0; oj < tsC.length && openTasks.length < 6; oj++) { if (!tsC[oj].done) openTasks.push(tsC[oj].label); }
    }
    var custom = (props.richardInstructions && props.richardInstructions.trim()) ? ("CONTEXT FROM THE USER (follow any instructions; treat background as things to keep in mind):\n" + props.richardInstructions + "\n\n") : "";
    var sys = custom + "You are Richard, a warm, sharp, honest business CFO inside the Richy app. You are helping the owner run and budget their business and make it succeed. "
      + "Business: " + (biz.name || "the business") + " - " + (biz.what || "unspecified") + ". Structure: " + labelOf(STRUCTURES, pf.structure) + ". Stage: " + labelOf(STAGES, pf.stage) + ". Scale: " + labelOf(SIZES, pf.size) + ". Revenue goal " + dollars(pf.revenueGoal || 0) + "/month. "
      + "LIVE NUMBERS - " + bizContextLine(biz) + (paceNow ? (" " + paceNow.text) : "") + " "
      + "Monthly budget split: " + (split || "not set") + ". "
      + (openTasks.length ? ("Open roadmap tasks: " + openTasks.join(" | ") + ". ") : "")
      + "Ground every answer in these numbers, and when you give advice end with one concrete action. "
      + "You can DIRECTLY change the monthly budget split. When the owner wants that, give one short sentence explaining what you did, then on a new line append: @@ALLOC[{\"category\":\"Marketing\",\"amount\":600}] - only the buckets you are changing, whole numbers, keep the total close to " + dollars(pf.monthly || 0) + " by also adjusting Buffer or Other. Categories only from: Marketing, Software, Equipment, Inventory, Office & Rent, People, Fees & Legal, Other, Buffer. "
      + "You can also ACT on the business. When the owner reports a real money event or a finished step, or asks you to record one, acknowledge it in words and append ONE directive line at the very end: @@BIZ[{\"op\":\"expense\",\"category\":\"Marketing\",\"amount\":120,\"label\":\"Facebook ads\"},{\"op\":\"revenue\",\"amount\":300,\"label\":\"First sale\"},{\"op\":\"taskDone\",\"task\":\"words quoted from an open roadmap task\"},{\"op\":\"taskAdd\",\"milestone\":\"milestone title\",\"task\":\"new concrete task\"},{\"op\":\"stage\",\"value\":\"launching\"}] - include ONLY the ops that apply (usually one or two). Use taskDone only when the owner says they finished something matching an open roadmap task, quoting its words. Only emit ops for concrete events with real numbers the owner actually states - never for hypotheticals or plans. "
      + "Use each directive at most once, each on its own line at the very end of the reply, @@ALLOC before @@BIZ. Do not mention the directive syntax in your spoken reply." + RICHARD_FORMAT;
    callClaude(nc.filter(function(m) { return m.role !== "system"; }).map(function(m) { return { role: m.role === "user" ? "user" : "assistant", content: m.text }; }), sys, 600, function(e, reply) {
      setChatLoading(false);
      if (e || !reply) {
        props.onSaveBusinesses(patchBiz(biz.id, { chat: nc.concat([{ role: "richard", text: "Sorry, I could not connect. Try again." }]).slice(-30) }));
        return;
      }
      // Strip @@BIZ first (it preserves trailing text), then @@ALLOC, and land
      // everything - ops, retune, reply, chips - in ONE combined save so no
      // write can race another.
      var bizParsed = extractBizDirective(reply);
      var parsed = extractAllocDirective(bizParsed.text);
      var cur = null;
      for (var ci = 0; ci < bizesRef.current.length; ci++) { if (bizesRef.current[ci].id === biz.id) { cur = bizesRef.current[ci]; break; } }
      cur = cur || biz;
      var patch = {};
      var chips = [];
      var stageTo = null;
      if (bizParsed.ops) {
        var appliedOps = applyBizOps(cur, bizParsed.ops);
        if (appliedOps) {
          for (var f in appliedOps.patch) patch[f] = appliedOps.patch[f];
          chips = appliedOps.chips.slice();
          stageTo = appliedOps.stageTo;
          cur = appliedOps.work;
        }
      }
      if (parsed.allocations) {
        var byKey = bizAllocToMap(parsed.allocations);
        if (Object.keys(byKey).length) {
          patch.categories = (patch.categories || cur.categories).map(function(c) { return byKey.hasOwnProperty(c.key) ? Object.assign({}, c, { planned: byKey[c.key] }) : c; });
          chips.push("Budget updated");
        }
      }
      var thread = nc.concat([{ role: "richard", text: parsed.text }]);
      chips.forEach(function(cp) { thread = thread.concat([{ role: "system", text: cp }]); });
      animBizRef.current = parsed.text;
      patch.chat = thread.slice(-30);
      props.onSaveBusinesses(patchBiz(biz.id, patch));
      if (stageTo) {
        setCelebrate({ id: "grad", title: stageTo === "launching" ? "Launched" : "Up and running" });
        if (celTimer.current) clearTimeout(celTimer.current);
        celTimer.current = setTimeout(function() { setCelebrate(null); }, 2600);
        regenRoadmap(cur);
      }
    });
  }
  function replanWithRichard(biz) {
    setReplanning(true);
    var pf = biz.profile || {};
    var custom = (props.richardInstructions && props.richardInstructions.trim()) ? ("CONTEXT FROM THE USER (follow any instructions; treat background as things to keep in mind):\n" + props.richardInstructions + "\n\n") : "";
    var sys = custom + "You are Richard, a sharp, warm, honest business CFO inside the Richy app. Refresh the business plan and monthly operating budget using the latest numbers. Reply with STRICT JSON only - no markdown, no emojis, no prose outside the JSON. Shape: {\"summary\":\"2 to 3 sentences\",\"sections\":[{\"title\":\"\",\"body\":\"\"}],\"categories\":[{\"category\":\"Marketing\",\"amount\":0,\"note\":\"\"}],\"tips\":[\"\"],\"verdict\":{\"assessment\":\"\",\"keyNumber\":\"\",\"keyNumberLabel\":\"\"}}. Categories only from: Marketing, Software, Equipment, Inventory, Office & Rent, People, Fees & Legal, Other, Buffer, whole numbers summing to about the monthly budget. 4 to 6 sections." + langLine();
    var usr = "Business: " + (biz.name || "my business") + " - " + (biz.what || "unspecified") + ". Structure: " + labelOf(STRUCTURES, pf.structure) + ". Stage: " + labelOf(STAGES, pf.stage) + ". Scale: " + labelOf(SIZES, pf.size) + ". "
      + "Monthly budget " + dollars(pf.monthly || 0) + ", revenue goal " + dollars(pf.revenueGoal || 0) + ", cash on hand " + dollars(businessCash(biz)) + ", spent so far " + dollars(businessSpent(biz)) + ", runway " + ((pf.runway || 0) > 0 ? (pf.runway + " months") : "unspecified") + ". 12-month goal: " + (pf.goal || "unspecified") + ". Refresh the plan and budget.";
    callClaude([{ role: "user", content: usr }], sys, 1200, function(e, text) {
      setReplanning(false);
      if (e || !text) return;
      try {
        var jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
        var parsed = JSON.parse(jsonStr);
        var newCats = mapBizCategories(parsed.categories, pf.monthly || 0);
        // Preserve what's already been spent per bucket.
        var merged = newCats.map(function(nc) {
          var old = null; for (var i = 0; i < biz.categories.length; i++) { if (biz.categories[i].key === nc.key) { old = biz.categories[i]; break; } }
          return old ? Object.assign({}, nc, { spent: old.spent || 0, entries: old.entries || [] }) : nc;
        });
        var oldPlan = biz.plan || {};
        var newPlan = {
          summary: parsed.summary || oldPlan.summary || "",
          sections: (Array.isArray(parsed.sections) && parsed.sections.length) ? parsed.sections.slice(0, 6) : (oldPlan.sections || []),
          tips: (Array.isArray(parsed.tips) && parsed.tips.length) ? parsed.tips.slice(0, 5) : (oldPlan.tips || []),
          verdict: (parsed.verdict && parsed.verdict.assessment) ? parsed.verdict : oldPlan.verdict,
          generatedAt: today
        };
        props.onSaveBusinesses(patchBiz(biz.id, { plan: newPlan, categories: merged }));
      } catch (e2) {}
    });
  }

  // ---- Shared bits ---------------------------------------------------------
  function seg(value, setter, options) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, background: "rgba(0,0,0,0.05)", borderRadius: 11, padding: 3 }}>
        {options.map(function(o) {
          var on = value === o.v;
          return (
            <button key={o.v} onClick={function() { setter(o.v); }}
              style={{ flex: "1 1 0", minWidth: 84, border: "none", cursor: "pointer", fontFamily: UI, fontSize: 12.5, fontWeight: 700, padding: "9px 6px", borderRadius: 8, background: on ? T.btn : "transparent", color: on ? "#fff" : T.ink2, textShadow: on ? "0 1px 2px rgba(42,31,77,0.35)" : "none" }}>
              {o.l}
            </button>
          );
        })}
      </div>
    );
  }
  function backRow(label, onPress) {
    return (
      <button onClick={onPress} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.orange, fontSize: 14, fontWeight: 600, fontFamily: UI, marginBottom: 18 }}>
        <span style={{ transform: "rotate(180deg)", display: "flex" }}><SVGIcon id="chevron" size={18} color={T.orange} /></span>
        {label}
      </button>
    );
  }
  function fieldLabel(t) {
    return <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI, margin: "16px 0 8px" }}>{t}</div>;
  }
  function amtField(label, val, onChange) {
    return (
      <div>
        {fieldLabel(label)}
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.04)", borderRadius: 12, padding: "10px 14px" }}>
          <span style={{ fontSize: 18, color: T.ink3, fontWeight: 600 }}>{sym}</span>
          <input value={val} onChange={onChange} type="number" inputMode="decimal" placeholder="0"
            style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 18, fontFamily: UI, color: T.ink, fontWeight: 700, padding: 0, boxSizing: "border-box", width: "100%" }} />
        </div>
      </div>
    );
  }

  // ---- List view -----------------------------------------------------------
  function listView() {
    return (
      <div>
        {backRow(props.backLabel || "Savings", props.onBack)}
        <div style={{ fontSize: 13.5, color: T.ink3, lineHeight: 1.55, marginBottom: 16, padding: "0 2px" }}>
          A Business Account walls off money for your venture, gives it its own budget categories, and puts Richard to work as your CFO - building a plan and keeping your spending on track.
        </div>
        <button onClick={startWizard}
          style={{ width: "100%", border: "none", cursor: "pointer", borderRadius: 16, padding: "15px 0", marginBottom: 18, background: T.btn, color: "#fff", textShadow: "0 1px 2px rgba(42,31,77,0.35)", fontSize: 16, fontWeight: 700, fontFamily: UI, boxShadow: "0 6px 18px " + T.orangeGlow }}>
          + New Business Account
        </button>
        {bizes.length === 0 ? (
          <Card style={{ padding: "46px 24px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <SVGIcon id="briefcase" size={24} color={T.orange} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>No business accounts yet</div>
            <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>Every great company started with a first plan. Richard will help you build yours.</div>
          </Card>
        ) : bizes.map(function(b) {
          var bal = businessCash(b);
          var spent = businessSpent(b);
          var monthly = (b.profile && b.profile.monthly) || 0;
          var pct = monthly > 0 ? Math.min(100, Math.round((spent / monthly) * 100)) : 0;
          return (
            <Card key={b.id} style={{ marginBottom: 14, overflow: "hidden" }}>
              <div onClick={function() { setActiveId(b.id); setView("detail"); }} style={{ padding: "18px 18px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: (b.color || T.orange) + "1F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <SVGIcon id={b.icon || "briefcase"} size={20} color={b.color || T.orange} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                      <div style={{ fontSize: 13, color: T.ink3, marginTop: 2 }}>{b.what || labelOf(STRUCTURES, b.profile && b.profile.structure)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(bal)}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.ink3, marginTop: 2 }}>cash on hand</div>
                  </div>
                </div>
                {monthly > 0 && (
                  <div>
                    <ProgressBar value={spent} max={monthly || 1} color={spent > monthly ? T.red : (b.color || T.orange)} h={6} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: T.ink3 }}>{dollars(spent) + " of " + dollars(monthly) + " budget"}</span>
                      <span style={{ fontSize: 11, color: T.ink3 }}>{pct + "%"}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  // ---- Wizard / intake -----------------------------------------------------
  function wizardView() {
    var monthly = parseFloat(form.monthly) || 0;

    // Helpers used by the full-screen interview (steps 1-3).
    var iStyle = { width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 15px 15px 46px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
    function iwrap(iconId, child, mb) {
      return (
        <div style={{ position: "relative", marginBottom: mb !== undefined ? mb : 12 }}>
          <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
            <SVGIcon id={iconId} size={17} color={T.ink3} />
          </div>
          {child}
        </div>
      );
    }
    function ipills(value, setter, options) {
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {options.map(function(o) {
            var sel = value === o.v;
            return (
              <button key={o.v} onClick={function() { setter(o.v); }}
                style={{ padding: "10px 18px", borderRadius: 12, border: sel ? ("2px solid " + T.orange) : "1.5px solid rgba(0,0,0,0.1)", background: sel ? T.orangeDim : "rgba(255,255,255,0.8)", color: sel ? T.orange : T.ink2, fontSize: 14, fontWeight: sel ? 700 : 500, fontFamily: UI, cursor: "pointer" }}>
                {o.l}
              </button>
            );
          })}
        </div>
      );
    }
    function icta(label, onPress, disabled) {
      return (
        <button onClick={onPress} disabled={!!disabled}
          style={{ width: "100%", background: disabled ? "rgba(0,0,0,0.08)" : ("linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")"), color: disabled ? T.ink3 : "#fff", border: "none", borderRadius: 16, padding: "17px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: disabled ? "default" : "pointer", marginTop: 16, boxShadow: disabled ? "none" : ("0 6px 20px " + T.orangeGlow + ", 0 2px 6px rgba(0,0,0,0.1)"), letterSpacing: "-0.01em" }}>
          {label}
        </button>
      );
    }
    var amtStyleI = { width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 15px 15px 40px", fontSize: 18, fontFamily: UI, color: T.ink, fontWeight: 700, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
    var secLabel = { fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 };

    // Step 4 (plan review) stays in the normal card layout.
    if (step === 4) {
      return (
        <div>
          {backRow("Back", function() { setStep(3); })}
          <Card style={{ padding: "18px 18px 20px" }}>
            {planning ? (
              <div style={{ padding: "24px 10px 16px" }}>
                <AIWorking bare
                  title="Richard is building your plan"
                  sub="Strategy first, then your operating budget."
                  expectedMs={12000}
                  steps={["Reading your setup", "Sizing the operating budget", "Drafting the strategy", "Writing the verdict"]} />
              </div>
            ) : planResult ? (
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 8, fontFamily: DISP, letterSpacing: "-0.02em" }}>Your business plan</div>
                <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.55, marginBottom: 14 }}>{planResult.summary}</div>
                {planResult.verdict && planResult.verdict.keyNumber && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 14, padding: "12px 14px", background: T.orangeDim, borderRadius: 13 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: T.orange, letterSpacing: "-0.02em" }}>{planResult.verdict.keyNumber}</span>
                    <span style={{ fontSize: 12.5, color: T.ink3, fontWeight: 600 }}>{planResult.verdict.keyNumberLabel || ""}</span>
                  </div>
                )}
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Monthly budget</div>
                {planResult.categories.map(function(a, idx) {
                  return (
                    <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: idx < planResult.categories.length - 1 ? ("0.5px solid " + T.sep) : "none" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: a.color + "1F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <SVGIcon id={a.icon} size={18} color={a.color} />
                      </div>
                      <span style={{ flex: 1, fontSize: 14, color: T.ink, fontWeight: 500 }}>{a.label}</span>
                      <div style={{ display: "flex", alignItems: "center", background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: "6px 10px" }}>
                        <span style={{ fontSize: 13, color: T.ink3, marginRight: 2 }}>{sym}</span>
                        <input type="number" value={a.plannedRaw !== undefined ? a.plannedRaw : String(a.planned)}
                          onChange={function(e) {
                            var raw = e.target.value; var n = raw === "" ? 0 : Math.max(0, parseFloat(raw) || 0);
                            setPlanResult(function(pr) { return Object.assign({}, pr, { categories: pr.categories.map(function(c) { return c.key === a.key ? Object.assign({}, c, { planned: n, plannedRaw: raw }) : c; }) }); });
                          }}
                          style={{ width: 64, border: "none", background: "none", outline: "none", fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: UI, textAlign: "right", padding: 0 }} />
                      </div>
                    </div>
                  );
                })}
                {planResult.tips.length > 0 && (
                  <div style={{ marginTop: 16, background: T.orangeDim, borderRadius: 14, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: UI }}>Richard's tips</div>
                    {planResult.tips.map(function(tp, i) {
                      return (
                        <div key={i} style={{ fontSize: 13, color: T.ink, lineHeight: 1.5, marginBottom: i < planResult.tips.length - 1 ? 7 : 0, display: "flex", gap: 8 }}>
                          <span style={{ color: T.orange, fontWeight: 700 }}>-</span><span>{tp}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop: 20, borderTop: "0.5px solid " + T.sep, paddingTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontFamily: UI }}>Ask Richard</div>
                  <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 10, fontFamily: UI }}>Ask about the plan or tell him to change the budget split</div>
                  {wizChat.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                      {wizChat.map(function(m, i) {
                        if (m.role === "system") {
                          return (
                            <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, background: T.greenDim, color: T.green, borderRadius: 999, padding: "4px 11px", fontSize: 11.5, fontWeight: 700, fontFamily: UI }}>
                                <SVGIcon id="check" size={11} color={T.green} />{m.text}
                              </div>
                            </div>
                          );
                        }
                        var isUser = m.role === "user";
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                            <div style={{ maxWidth: "82%", background: isUser ? T.orange : "rgba(0,0,0,0.05)", borderRadius: 12, padding: "8px 12px", fontSize: 13, color: isUser ? "#fff" : T.ink, lineHeight: 1.5, fontFamily: UI }}>
                              {isUser ? m.text : <TypeReveal text={m.text} size={13} animate={m.role === "richard" && m.text === animBizRef.current} onDone={function() { animBizRef.current = null; }} />}
                            </div>
                          </div>
                        );
                      })}
                      {wizLoading && <RichardThinking size={13} radius={12} />}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={wizInput} onChange={function(e) { setWizInput(e.target.value); }}
                      onKeyDown={function(e) { if (e.key === "Enter" && !wizLoading) sendWizNote(); }}
                      placeholder="e.g. Spend more on marketing"
                      style={{ flex: 1, border: "none", background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: "9px 12px", fontSize: 13.5, fontFamily: UI, outline: "none", color: T.ink }} />
                    <button onClick={sendWizNote} disabled={!wizInput.trim() || wizLoading}
                      style={{ background: wizInput.trim() && !wizLoading ? T.btn : "rgba(0,0,0,0.1)", border: "none", borderRadius: 10, width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 17 }}>^</button>
                  </div>
                </div>
                <BigBtn label="Create business account" onPress={saveBusiness} />
                <button onClick={buildPlan} style={{ width: "100%", background: "none", border: "none", color: T.ink3, fontSize: 13, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 8, padding: "5px 0" }}>Redo plan</button>
              </div>
            ) : (
              <div style={{ padding: "20px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 14, color: T.ink2, marginBottom: 12 }}>Something went wrong building the plan.</div>
                <BigBtn label="Try again" onPress={buildPlan} />
              </div>
            )}
          </Card>
        </div>
      );
    }

    // Steps 1-3: full-screen immersive interview, styled like the signup AuthScreen.
    var stepTitles = [
      null,
      { t: "Set up your business", s: form.wantPlan ? "Richard will plan your strategy and budget." : "Create a blank account you can shape yourself." },
      { t: "Tell Richard about it", s: "A few details about your venture." },
      { t: "The numbers", s: "So Richard can build a realistic plan." }
    ];
    var shead = stepTitles[step] || stepTitles[1];

    var dots = (
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3].map(function(n) {
          return <div key={n} style={{ height: 6, borderRadius: 3, width: n === step ? 20 : 6, background: n <= step ? T.orange : "rgba(0,0,0,0.13)" }} />;
        })}
      </div>
    );

    var screenContent = (
      <div style={{ position: "fixed", inset: 0, zIndex: 91, background: "linear-gradient(160deg,#FDF5EC 0%,#FAF0E4 40%,#F5E8D8 100%)", display: "flex", flexDirection: "column", fontFamily: UI }}>
        <div style={{ position: "absolute", top: -80, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(137,112,198,0.15) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 60, left: -80, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(196,154,60,0.12) 0%,transparent 70%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", padding: "20px 20px 0", position: "relative", zIndex: 1 }}>
          <button onClick={function() { if (step > 1) { setStep(step - 1); } else { setView("list"); } }}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.orange, fontSize: 14, fontWeight: 600, fontFamily: UI, padding: 0 }}>
            <span style={{ transform: "rotate(180deg)", display: "flex" }}><SVGIcon id="chevron" size={18} color={T.orange} /></span>
            {step > 1 ? "Back" : "Business"}
          </button>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>{dots}</div>
          <div style={{ width: 70 }} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 48px", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 380, margin: "0 auto" }}>

            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 8px 24px rgba(196,154,60,0.18)" }}>
                <SVGIcon id={form.icon || "briefcase"} size={30} color={T.orange} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{shead.t}</div>
              <div style={{ fontSize: 14, color: T.ink2, marginTop: 6 }}>{shead.s}</div>
            </div>

            {step === 1 && (
              <div>
                {iwrap("briefcase",
                  <input value={form.name} onChange={function(e) { setField("name", e.target.value); }}
                    placeholder="Business name"
                    style={iStyle} />, 12)}
                {iwrap("chat",
                  <input value={form.what} onChange={function(e) { setField("what", e.target.value); }}
                    placeholder="What does it do? e.g. handmade candles, web design"
                    style={iStyle} />, 12)}
                <textarea value={form.notes} onChange={function(e) { setField("notes", e.target.value); }}
                  placeholder="Notes for Richard (optional) - goals, constraints, ideas..."
                  rows={3}
                  style={{ width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "13px 16px", fontSize: 15, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", resize: "vertical", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", marginBottom: 20 }} />
                <div style={secLabel}>Icon</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                  {BIZ_ICONS.map(function(ic) {
                    var on = (form.icon || "briefcase") === ic;
                    return (
                      <button key={ic} onClick={function() { setField("icon", ic); }}
                        style={{ width: 48, height: 48, border: on ? ("2px solid " + form.color) : "1.5px solid rgba(0,0,0,0.09)", background: on ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                        <SVGIcon id={ic} size={22} color={on ? form.color : T.ink2} />
                      </button>
                    );
                  })}
                </div>
                <div style={secLabel}>Color</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
                  {BIZ_COLORS.map(function(col) {
                    var on = col === form.color;
                    return <button key={col} onClick={function() { setField("color", col); }} style={{ width: 32, height: 32, borderRadius: "50%", border: on ? "3px solid rgba(0,0,0,0.25)" : "2px solid rgba(0,0,0,0.08)", background: col, cursor: "pointer", padding: 0 }} />;
                  })}
                </div>
                <div style={secLabel}>Want Richard to build your plan?</div>
                {ipills(form.wantPlan ? "yes" : "no", function(v) { setField("wantPlan", v === "yes"); }, [{ v: "yes", l: "Yes, plan it" }, { v: "no", l: "No, just create" }])}
                <div style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.5 }}>{form.wantPlan ? "Richard interviews you, then drafts a plan and a monthly budget." : "Skip the questions - open a blank account you can budget yourself."}</div>
                {icta(form.wantPlan ? "Next" : "Create account", function() { if (form.wantPlan) { setStep(2); } else { createBlank(); } }, !form.name.trim())}
              </div>
            )}

            {step === 2 && (
              <div>
                <div style={secLabel}>Are you a company or an individual?</div>
                {ipills(form.structure, function(v) { setField("structure", v); }, STRUCTURES)}
                <div style={secLabel}>What stage are you at?</div>
                {ipills(form.stage, function(v) { setField("stage", v); }, STAGES)}
                <div style={secLabel}>How big is this project?</div>
                {ipills(form.size, function(v) { setField("size", v); }, SIZES)}
                {icta("Next", function() { setStep(3); }, false)}
              </div>
            )}

            {step === 3 && (
              <div>
                <div style={secLabel}>How much will you spend per month?</div>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, fontWeight: 600, color: T.ink3, fontFamily: UI }}>{sym}</div>
                  <input value={form.monthly} onChange={function(e) { setField("monthly", e.target.value); }} type="number" inputMode="decimal" placeholder="0"
                    style={amtStyleI} />
                </div>
                <div style={secLabel}>Monthly revenue goal</div>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, fontWeight: 600, color: T.ink3, fontFamily: UI }}>{sym}</div>
                  <input value={form.revenueGoal} onChange={function(e) { setField("revenueGoal", e.target.value); }} type="number" inputMode="decimal" placeholder="0"
                    style={amtStyleI} />
                </div>
                <div style={secLabel}>Months of runway / savings set aside</div>
                <input value={form.runway} onChange={function(e) { setField("runway", e.target.value); }} type="number" inputMode="decimal" placeholder="e.g. 6"
                  style={{ width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 16px", fontSize: 16, fontFamily: UI, color: T.ink, fontWeight: 600, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", marginBottom: 12 }} />
                {iwrap("star",
                  <input value={form.goal} onChange={function(e) { setField("goal", e.target.value); }}
                    placeholder="What does success look like in 12 months?"
                    style={iStyle} />, 12)}
                <div style={secLabel}>Money to set aside now (optional)</div>
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, fontWeight: 600, color: T.ink3, fontFamily: UI }}>{sym}</div>
                  <input value={form.startCap} onChange={function(e) { setField("startCap", e.target.value); }} type="number" inputMode="decimal" placeholder="0"
                    style={amtStyleI} />
                </div>
                {parseFloat(form.startCap) > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {ipills(form.capSrc, function(v) { setField("capSrc", v); }, [{ v: "external", l: "New money" }, { v: "balance", l: "From balance" }])}
                    <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.45 }}>{form.capSrc === "external" ? "Outside money you are putting in - your spendable balance is untouched." : "Moves from your spendable balance into the business. Net worth is unchanged."}</div>
                  </div>
                )}
                {icta("Build my plan with Richard", function() { setStep(4); buildPlan(); }, monthly <= 0)}
              </div>
            )}

          </div>
        </div>
      </div>
    );

    return ReactDOM.createPortal(screenContent, document.body);
  }

  // ---- Detail view ---------------------------------------------------------
  function detailView(biz) {
    var bal = businessCash(biz);
    var ym = curMonth();
    var monthSpent = bizMonthSpend(biz, ym);
    var monthly = (biz.profile && biz.profile.monthly) || 0;
    var plannedTotal = biz.categories.reduce(function(s, c) { return s + (c.planned || 0); }, 0);
    var thread = biz.chat || [];
    var capHistory = (biz.entries || []).filter(function(e) { return !e.bizExpense; }).slice().sort(function(x, y) { return (y.id || 0) - (x.id || 0); }).slice(0, 6);
    var plan = biz.plan || {};
    var health = bizHealth(biz);
    var pl = bizMonthProfit(biz, ym);
    var pace = bizPace(biz);
    var runway = bizRunway(biz);
    var stage = (biz.profile && biz.profile.stage) || "idea";
    var heroKick = { fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: T.heroMut };
    var heroCellLbl = { fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.heroMut };
    var heroPanelSt = { flex: "0 0 100%", scrollSnapAlign: "start", padding: "18px 22px", boxSizing: "border-box", position: "relative", display: "flex", flexDirection: "column" };
    var heroDotOff = (T.bg === DARK_BG) ? "rgba(255,255,255,0.26)" : "rgba(0,0,0,0.16)";
    return (
      <div>
        {backRow("Business", function() { setView("list"); setActiveId(null); })}
        <div style={{ marginBottom: 4, animation: "rcFadeUp 0.55s ease both" }}>
          <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", background: T.heroBg, boxShadow: T.heroShadow, height: 206 }}>
            <div style={{ position: "absolute", top: -70, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle," + T.heroGlow1 + ",transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "absolute", bottom: -70, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle," + T.heroGlow2 + ",transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
            <div ref={heroScrollRef} onScroll={heroOnScroll} className="rc-hero-scroll"
              style={{ position: "relative", zIndex: 1, display: "flex", height: "100%", width: "100%", overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>

              <div style={heroPanelSt}>
                <div style={{ position: "absolute", top: 16, right: 18, width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SVGIcon id={biz.icon || "briefcase"} size={22} color={T.heroInk} />
                </div>
                <div style={heroKick}>{labelOf(STRUCTURES, biz.profile && biz.profile.structure) + " - " + labelOf(STAGES, stage)}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: T.heroInk, letterSpacing: "-0.02em", marginTop: 4, paddingRight: 52, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{biz.name}</div>
                <div style={{ fontSize: 12.5, color: T.heroMut, marginTop: 2, paddingRight: 52, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{biz.what || ""}</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "auto" }}>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: bal < 0 ? T.heroNeg : T.heroInk, letterSpacing: "-0.03em" }}><CountUp value={bal} /></div>
                    <div style={{ fontSize: 12, color: T.heroMut, marginTop: 2 }}>cash on hand</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ position: "relative", width: 54, height: 54, margin: "0 auto" }}>
                      <DrawRing size={54} stroke={5} value={health.score} max={100} color={health.color} track="rgba(255,255,255,0.25)" />
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: T.heroInk }}>{health.score}</div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.heroMut, marginTop: 4 }}>{health.label}</div>
                  </div>
                </div>
              </div>

              <div style={heroPanelSt}>
                <div style={heroKick}>{"This month - " + ymLabel(ym)}</div>
                {stage === "idea" ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 30, fontWeight: 700, color: T.heroInk, letterSpacing: "-0.03em" }}><CountUp value={pl.spend} /></div>
                    <div style={{ fontSize: 12, color: T.heroMut, marginTop: 2 }}>{"spent of " + dollars(monthly) + " planned - keep the idea stage lean"}</div>
                  </div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 30, fontWeight: 700, color: pl.profit < 0 ? T.heroNeg : T.heroPos, letterSpacing: "-0.03em" }}><CountUp value={pl.profit} /></div>
                    <div style={{ fontSize: 12, color: T.heroMut, marginTop: 2 }}>{"profit this month" + (pl.margin !== null ? " - " + Math.round(pl.margin * 100) + "% margin" : (stage === "launching" && pl.revenue === 0 ? " - your first sale changes everything" : ""))}</div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 14, marginTop: "auto", borderTop: "0.5px solid " + T.heroSep, paddingTop: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={heroCellLbl}>Revenue</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: pl.revenue > 0 ? T.heroPos : T.heroInk, marginTop: 3 }}>{dollars(pl.revenue)}</div>
                  </div>
                  <div style={{ width: "0.5px", background: T.heroSep }} />
                  <div style={{ flex: 1 }}>
                    <div style={heroCellLbl}>Spent</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.heroInk, marginTop: 3 }}>{dollars(pl.spend)}</div>
                  </div>
                  <div style={{ width: "0.5px", background: T.heroSep }} />
                  <div style={{ flex: 1 }}>
                    <div style={heroCellLbl}>Budget</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.heroInk, marginTop: 3 }}>{dollars(monthly)}</div>
                  </div>
                </div>
              </div>

              <div style={heroPanelSt}>
                <div style={heroKick}>Runway & pace</div>
                <div style={{ marginTop: 10 }}>
                  {runway === null ? (
                    <div style={{ fontSize: 25, fontWeight: 700, color: T.heroPos, letterSpacing: "-0.02em" }}>Self-sustaining</div>
                  ) : (
                    <div style={{ fontSize: 30, fontWeight: 700, color: runway < 2 ? T.heroNeg : T.heroInk, letterSpacing: "-0.03em" }}>
                      <CountUp value={runway} format={function(v) { return (Math.round(v * 10) / 10).toFixed(1); }} />
                      <span style={{ fontSize: 16, fontWeight: 600 }}> months</span>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: T.heroMut, marginTop: 2 }}>{runway === null ? "revenue is covering your spending" : "of runway at your current burn"}</div>
                </div>
                <div style={{ marginTop: "auto", borderTop: "0.5px solid " + T.heroSep, paddingTop: 10 }}>
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: pace ? (pace.verdict === "over" ? T.heroNeg : pace.verdict === "under" ? T.heroPos : T.heroInk) : T.heroMut }}>
                    {pace ? pace.text : "Set a monthly budget to track your spending pace."}
                  </div>
                </div>
              </div>

            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 7, padding: "10px 0 8px" }}>
            {[0, 1, 2].map(function(i) {
              return <div key={i} onClick={function() { heroGoPage(i); }} style={{ width: i === heroPage ? 18 : 6, height: 6, borderRadius: 3, cursor: "pointer", transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)", background: i === heroPage ? T.orange : heroDotOff }} />;
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, animation: "rcFadeUp 0.55s ease 0.05s both" }}>
          <button onClick={function() { openAction(biz.id, "add"); }}
            style={{ flex: 1, border: "none", cursor: "pointer", fontFamily: UI, fontSize: 13.5, fontWeight: 700, padding: "12px 0", borderRadius: 12, background: T.btn, color: "#fff", textShadow: "0 1px 2px rgba(42,31,77,0.35)", boxShadow: "0 3px 10px " + T.orangeGlow }}>Add capital</button>
          <button onClick={function() { setRevFor(biz.id); setRevForm({ label: "", amount: "" }); }}
            style={{ flex: 1, border: "1.5px solid " + T.green, cursor: "pointer", fontFamily: UI, fontSize: 13.5, fontWeight: 700, padding: "12px 0", borderRadius: 12, background: "none", color: T.green }}>Record revenue</button>
          <button onClick={function() { openAction(biz.id, "withdraw"); }} disabled={bal <= 0}
            style={{ flex: 1, border: "1.5px solid " + (bal <= 0 ? "rgba(0,0,0,0.08)" : T.orange), cursor: bal <= 0 ? "default" : "pointer", fontFamily: UI, fontSize: 13.5, fontWeight: 700, padding: "12px 0", borderRadius: 12, background: "none", color: bal <= 0 ? T.ink3 : T.orange }}>Withdraw</button>
        </div>

        {(function() {
          var reviews = biz.reviews || [];
          var latest = reviews[0];
          if (!latest && !reviewLoading) return null;
          var stColor = latest ? (latest.status === "on-track" ? T.green : latest.status === "watch" ? "#C8983A" : T.red) : T.ink3;
          var stBg = latest ? (latest.status === "on-track" ? "rgba(39,168,95,0.12)" : latest.status === "watch" ? "rgba(200,152,58,0.15)" : "rgba(217,84,107,0.12)") : "transparent";
          var stLabel = latest ? (latest.status === "on-track" ? "On track" : latest.status === "watch" ? "Worth a look" : "Needs attention") : "";
          var rows = latest ? [
            { icon: "star", tint: T.green, v: latest.tip },
            { icon: "shield", tint: "#C8983A", v: latest.warning },
            { icon: "up", tint: T.orange, v: latest.idea }
          ].filter(function(r) { return r.v && r.v.body; }) : [];
          var fwd = { idea: { launching: 1, running: 1 }, launching: { running: 1 }, running: {} };
          var showGrad = !!(latest && latest.graduate && fwd[stage] && fwd[stage][latest.graduate] && !detectGraduation(biz));
          return (
            <Card style={{ padding: "16px 18px", marginBottom: 16, animation: "rcFadeUp 0.55s ease 0.03s both", position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: UI }}>This week with Richard</div>
                {latest && <span style={{ fontSize: 11, color: T.ink3 }}>{latest.date}</span>}
              </div>
              {reviewLoading && !latest && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: T.ink2 }}>
                    Richard is running your weekly review
                    <ThinkingDots size={3.5} color={T.orange} />
                  </div>
                  <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 3 }}>
                    <ThinkingPhrase phrases={["Pulling this month's numbers", "Comparing to last week", "Writing the honest read"]} />
                  </div>
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "45%", background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.5), transparent)", animation: "rcShimmer 1.4s ease infinite", pointerEvents: "none" }} />
                </div>
              )}
              {latest && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: stColor, background: stBg, borderRadius: 999, padding: "4px 11px", letterSpacing: "0.03em" }}>{stLabel}</span>
                    {reviewLoading && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: T.ink3 }}>updating<ThinkingDots size={2.5} color={T.ink3} /></span>}
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink, lineHeight: 1.4, marginBottom: 6 }}>{latest.headline}</div>
                  {rows.map(function(r, i) {
                    return (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: i > 0 ? "0.5px solid " + T.sep : "none" }}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: r.tint + "1F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          <SVGIcon id={r.icon} size={15} color={r.tint} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{r.v.title}</div>
                          <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5, marginTop: 1 }}>{r.v.body}</div>
                        </div>
                      </div>
                    );
                  })}
                  {latest.taskSuggestion && !latest.taskSuggestion.added && biz.roadmap && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.orangeDim, borderRadius: 12, padding: "10px 12px", marginTop: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.06em" }}>Suggested step</div>
                        <div style={{ fontSize: 12.5, color: T.ink, marginTop: 2, lineHeight: 1.4 }}>{latest.taskSuggestion.label}</div>
                      </div>
                      <button onClick={function() { addSuggestedTask(biz, latest); }}
                        style={{ background: T.btn, border: "none", borderRadius: 9, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: UI, flexShrink: 0 }}>Add to roadmap</button>
                    </div>
                  )}
                  {showGrad && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.orangeDim, borderRadius: 12, padding: "10px 12px", marginTop: 8 }}>
                      <div style={{ flex: 1, fontSize: 12.5, color: T.ink, lineHeight: 1.4 }}>{"Richard thinks it's time to graduate to the " + (latest.graduate === "running" ? "running" : "launch") + " stage."}</div>
                      <button onClick={function() { graduateBiz(biz, latest.graduate); }}
                        style={{ background: T.btn, border: "none", borderRadius: 9, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: UI, flexShrink: 0 }}>Graduate</button>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={function() { fetchIdeas(biz); }} disabled={ideasLoading}
                      style={{ flex: 1, background: T.orangeDim, border: "none", borderRadius: 10, padding: "10px 0", fontSize: 12.5, fontWeight: 700, color: T.orange, cursor: ideasLoading ? "default" : "pointer", fontFamily: UI }}>{ideasLoading ? <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>Thinking<ThinkingDots size={3.5} color={T.orange} /></span> : "Get growth ideas"}</button>
                    {reviews.length > 1 && (
                      <button onClick={function() { setPastOpen(!pastOpen); }}
                        style={{ flex: 1, background: "none", border: "1.5px solid " + T.sep, borderRadius: 10, padding: "10px 0", fontSize: 12.5, fontWeight: 600, color: T.ink2, cursor: "pointer", fontFamily: UI }}>{pastOpen ? "Hide past reviews" : "Past reviews (" + (reviews.length - 1) + ")"}</button>
                    )}
                  </div>
                  {ideas && (
                    <div style={{ marginTop: 10 }}>
                      {ideas.map(function(gi, i) {
                        return (
                          <div key={i} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 12, padding: "11px 13px", marginBottom: i < ideas.length - 1 ? 8 : 0, animation: "rcFadeUp 0.45s ease " + (i * 0.08) + "s both" }}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{gi.title}</div>
                              {gi.impact ? <div style={{ fontSize: 11.5, fontWeight: 700, color: T.green, flexShrink: 0 }}>{gi.impact}</div> : null}
                            </div>
                            <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5, marginTop: 3 }}>{gi.body}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {pastOpen && reviews.length > 1 && (
                    <div style={{ marginTop: 10, borderTop: "0.5px solid " + T.sep, paddingTop: 4 }}>
                      {reviews.slice(1).map(function(r) {
                        var c = r.status === "on-track" ? T.green : r.status === "watch" ? "#C8983A" : T.red;
                        return (
                          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0" }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0 }} />
                            <span style={{ fontSize: 11.5, color: T.ink3, flexShrink: 0 }}>{r.date}</span>
                            <span style={{ flex: 1, fontSize: 12, color: T.ink2, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.headline}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })()}

        {(function() {
          var rm = biz.roadmap;
          if (!rm && roadmapBuilding) {
            return (
              <Card style={{ padding: "18px", marginBottom: 16, position: "relative", overflow: "hidden", animation: "rcFadeUp 0.55s ease 0.06s both" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: UI }}>Roadmap</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700, color: T.ink, marginTop: 8 }}>
                  Richard is drafting your roadmap
                  <ThinkingDots size={3.5} color={T.orange} />
                </div>
                <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 3, lineHeight: 1.45 }}>
                  <ThinkingPhrase phrases={["Reading where the business stands", "Laying out the milestones", "Breaking them into concrete steps"]} />
                </div>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "45%", background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.5), transparent)", animation: "rcShimmer 1.4s ease infinite", pointerEvents: "none" }} />
              </Card>
            );
          }
          if (!rm) {
            return (
              <Card style={{ padding: "16px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, animation: "rcFadeUp 0.55s ease 0.06s both" }}>
                <CatBadge icon="chart" color={T.orange} size={40} soft={true} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>No roadmap yet</div>
                  <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2, lineHeight: 1.4 }}>Richard can lay out the concrete steps from here to a working business.</div>
                </div>
                <button onClick={function() { regenRoadmap(biz); }}
                  style={{ background: T.btn, border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: UI, flexShrink: 0 }}>Build it</button>
              </Card>
            );
          }
          var prog = roadmapProgress(rm);
          var gradTarget = detectGraduation(biz);
          var curId = null;
          for (var ci = 0; ci < rm.milestones.length; ci++) { if (!rm.milestones[ci].done) { curId = rm.milestones[ci].id; break; } }
          function taskRow(m, t) {
            return (
              <div key={t.id} onClick={function() { toggleTask(biz, m.id, t.id); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", cursor: "pointer" }}>
                <TaskCheck done={!!t.done} pop={lastChecked === t.id && !!t.done} color={T.orange} />
                <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.45, color: t.done ? T.ink3 : T.ink, textDecoration: t.done ? "line-through" : "none", transition: "color 0.3s ease" }}>{t.label}</span>
              </div>
            );
          }
          return (
            <Card style={{ padding: "16px 18px", marginBottom: 16, position: "relative", overflow: "hidden", animation: "rcFadeUp 0.55s ease 0.06s both" }}>
              {celebrate && (
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "45%", background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.55), transparent)", animation: "rcShimmer 1.1s ease both", pointerEvents: "none", zIndex: 2 }} />
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: UI }}>Roadmap</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <DrawRing size={26} stroke={3.5} value={prog.done} max={prog.total || 1} color={T.orange} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.ink2 }}>{prog.done + " of " + prog.total}</span>
                  {rm.source === "local" && (
                    <button onClick={function() { regenRoadmap(biz); }} disabled={roadmapBuilding}
                      style={{ background: T.orangeDim, border: "none", borderRadius: 9, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: T.orange, cursor: roadmapBuilding ? "default" : "pointer", fontFamily: UI }}>{roadmapBuilding ? <ThinkingDots size={3.5} color={T.orange} /> : "Ask Richard"}</button>
                  )}
                </div>
              </div>
              {celebrate && (
                <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 10px" }}>
                  <div style={{ background: T.orangeDim, color: T.orange, borderRadius: 999, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, animation: "rcPillIn 0.45s ease both" }}>
                    {"Milestone complete - " + celebrate.title}
                  </div>
                </div>
              )}
              {gradTarget && (
                <div style={{ background: T.heroBg, borderRadius: 14, padding: "13px 14px", margin: "8px 0 10px", boxShadow: T.heroShadow }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.heroInk, lineHeight: 1.4 }}>
                    {gradTarget === "launching" ? ("Richard thinks " + biz.name + " is moving from idea to launch.") : ("Richard thinks " + biz.name + " is now a running business.")}
                  </div>
                  <div style={{ fontSize: 12.5, color: T.heroMut, marginTop: 3, lineHeight: 1.45 }}>
                    {gradTarget === "launching" ? "Real money is moving - that's a launch. Graduating rebuilds the roadmap for this new stage." : "Revenue is coming in again and again. Graduating rebuilds the roadmap around margins, repeat customers and systems."}
                  </div>
                  <button onClick={function() { graduateBiz(biz, gradTarget); }}
                    style={{ marginTop: 10, background: "rgba(255,255,255,0.92)", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, color: T.orange, cursor: "pointer", fontFamily: UI }}>Graduate</button>
                </div>
              )}
              {rm.milestones.map(function(m, mi) {
                var borderSt = mi > 0 ? "0.5px solid " + T.sep : "none";
                if (m.done) {
                  return (
                    <div key={m.id} style={{ borderTop: borderSt }}>
                      <div onClick={function() { setExpandedMs(expandedMs === m.id ? null : m.id); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", cursor: "pointer" }}>
                        <TaskCheck done={true} size={20} color={T.green} />
                        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: T.ink3, textDecoration: "line-through" }}>{m.title}</span>
                        <span style={{ transform: expandedMs === m.id ? "rotate(-90deg)" : "rotate(90deg)", display: "flex", transition: "transform 0.25s ease" }}><SVGIcon id="chevron" size={13} color={T.ink3} /></span>
                      </div>
                      {expandedMs === m.id && <div style={{ paddingLeft: 4, paddingBottom: 6 }}>{(m.tasks || []).map(function(t) { return taskRow(m, t); })}</div>}
                    </div>
                  );
                }
                if (m.id !== curId) {
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: borderSt, opacity: 0.55 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px dashed " + T.ink3, flexShrink: 0, boxSizing: "border-box" }} />
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: T.ink2 }}>{m.title}</span>
                      <span style={{ fontSize: 11.5, color: T.ink3 }}>{((m.tasks || []).length) + " steps"}</span>
                    </div>
                  );
                }
                return (
                  <div key={m.id} style={{ padding: "9px 0 4px", borderTop: borderSt }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, flex: 1 }}>{m.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.orange, background: T.orangeDim, borderRadius: 999, padding: "3px 9px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Now</span>
                    </div>
                    {(m.tasks || []).map(function(t) { return taskRow(m, t); })}
                  </div>
                );
              })}
            </Card>
          );
        })()}

        {(function() {
          var created = (biz.createdAt || "").slice(0, 7);
          var maxBack = created ? Math.max(0, ymDiff(created, curMonth())) : 0;
          var off = Math.min(plMonthOff, maxBack);
          var ymSel = ymOffset(off);
          var mpl = bizMonthProfit(biz, ymSel);
          var revGoal = (biz.profile && biz.profile.revenueGoal) || 0;
          var catRows = biz.categories.filter(function(c) { return (c.planned || 0) > 0 || bizCatMonthSpent(biz, c.key, ymSel) > 0; });
          var stepSt = function(disabled) { return { width: 26, height: 26, borderRadius: 8, border: "none", background: "rgba(0,0,0,0.05)", cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: disabled ? 0.35 : 1, padding: 0 }; };
          var rowSt = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" };
          return (
            <Card style={{ padding: "16px 18px", marginBottom: 16, animation: "rcFadeUp 0.55s ease 0.08s both" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: UI }}>Profit & loss</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button disabled={off >= maxBack} onClick={function() { setPlMonthOff(Math.min(off + 1, maxBack)); }} style={stepSt(off >= maxBack)}>
                    <span style={{ transform: "rotate(180deg)", display: "flex" }}><SVGIcon id="chevron" size={14} color={T.ink2} /></span>
                  </button>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, minWidth: 62, textAlign: "center", fontFamily: UI }}>{ymLabel(ymSel)}</span>
                  <button disabled={off <= 0} onClick={function() { setPlMonthOff(Math.max(off - 1, 0)); }} style={stepSt(off <= 0)}>
                    <SVGIcon id="chevron" size={14} color={T.ink2} />
                  </button>
                </div>
              </div>
              <div style={rowSt}>
                <span style={{ fontSize: 13.5, color: T.ink2 }}>Revenue</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: mpl.revenue > 0 ? T.green : T.ink }}>{dollars(mpl.revenue)}</span>
              </div>
              <div style={rowSt}>
                <span style={{ fontSize: 13.5, color: T.ink2 }}>Expenses</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{dollars(mpl.spend)}</span>
              </div>
              <div style={{ borderTop: "0.5px solid " + T.sep, marginTop: 4, paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Profit</span>
                <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em", color: mpl.profit < 0 ? T.red : T.green }}>{(mpl.profit < 0 ? "-" : "") + dollars(Math.abs(mpl.profit))}</span>
              </div>
              {mpl.margin !== null && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 5 }}>
                  <span style={{ fontSize: 12.5, color: T.ink3 }}>Margin</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: mpl.margin < 0 ? T.red : T.ink2 }}>{Math.round(mpl.margin * 100) + "%"}</span>
                </div>
              )}
              {stage === "running" && revGoal > 0 && off === 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, color: T.ink2, fontWeight: 600 }}>Revenue vs goal</span>
                    <span style={{ fontSize: 12, color: T.ink3 }}>{dollars(mpl.revenue) + " of " + dollars(revGoal)}</span>
                  </div>
                  <ProgressBar value={mpl.revenue} max={revGoal} color={T.green} h={5} />
                </div>
              )}
              {stage === "launching" && mpl.revenue === 0 && off === 0 && (
                <div style={{ marginTop: 12, background: T.orangeDim, borderRadius: 10, padding: "9px 12px", fontSize: 12.5, color: T.ink, lineHeight: 1.5 }}>
                  No revenue logged yet. Your first sale is the one number that changes everything - when it lands, record it here.
                </div>
              )}
              {catRows.length > 0 && (
                <div style={{ marginTop: 14, borderTop: "0.5px solid " + T.sep, paddingTop: 12 }}>
                  {catRows.map(function(c, i) {
                    var sp = bizCatMonthSpent(biz, c.key, ymSel);
                    var ov = sp > (c.planned || 0) && (c.planned || 0) > 0;
                    return (
                      <div key={c.key} style={{ marginBottom: i < catRows.length - 1 ? 9 : 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12.5, color: T.ink2, fontWeight: 600 }}>{c.label}</span>
                          <span style={{ fontSize: 12, color: ov ? T.red : T.ink3 }}>{dollars(sp) + ((c.planned || 0) > 0 ? " / " + dollars(c.planned) : "")}</span>
                        </div>
                        <ProgressBar value={sp} max={c.planned || 1} color={ov ? T.red : c.color} h={4} />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })()}

        {(plan.summary || (plan.sections && plan.sections.length)) && (
          <Card style={{ padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: UI }}>Business plan</div>
              <button onClick={function() { replanWithRichard(biz); }} disabled={replanning}
                style={{ background: T.orangeDim, border: "none", borderRadius: 9, padding: "5px 11px", fontSize: 11.5, fontWeight: 700, color: T.orange, cursor: replanning ? "default" : "pointer", fontFamily: UI }}>{replanning ? "Updating..." : "Replan"}</button>
            </div>
            {plan.summary && <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.55, marginBottom: plan.sections && plan.sections.length ? 14 : 0 }}>{plan.summary}</div>}
            {plan.verdict && plan.verdict.assessment && (
              <div style={{ background: T.orangeDim, borderRadius: 12, padding: "11px 13px", marginBottom: 14 }}>
                {plan.verdict.keyNumber && <div style={{ fontSize: 17, fontWeight: 800, color: T.orange, letterSpacing: "-0.02em" }}>{plan.verdict.keyNumber + (plan.verdict.keyNumberLabel ? (" " + plan.verdict.keyNumberLabel) : "")}</div>}
                <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5, marginTop: plan.verdict.keyNumber ? 4 : 0 }}>{plan.verdict.assessment}</div>
              </div>
            )}
            {(plan.sections || []).map(function(s, i) {
              return (
                <div key={i} style={{ marginBottom: i < plan.sections.length - 1 ? 12 : 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>{s.body}</div>
                </div>
              );
            })}
            {(plan.tips || []).length > 0 && (
              <div style={{ marginTop: 14, borderTop: "0.5px solid " + T.sep, paddingTop: 12 }}>
                {plan.tips.map(function(tp, i) {
                  return <div key={i} style={{ fontSize: 13, color: T.ink, lineHeight: 1.5, marginBottom: i < plan.tips.length - 1 ? 7 : 0, display: "flex", gap: 8 }}><span style={{ color: T.orange, fontWeight: 700 }}>-</span><span>{tp}</span></div>;
                })}
              </div>
            )}
          </Card>
        )}

        {!(plan.summary || (plan.sections && plan.sections.length)) && (
          <Card style={{ padding: "16px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <CatBadge icon="briefcase" color={T.orange} size={40} soft={true} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>No plan yet</div>
              <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2, lineHeight: 1.4 }}>Have Richard draft a business plan and budget for you.</div>
            </div>
            <button onClick={function() { replanWithRichard(biz); }} disabled={replanning}
              style={{ background: T.btn, border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: replanning ? "default" : "pointer", fontFamily: UI, flexShrink: 0 }}>{replanning ? <ThinkingDots size={3.5} color="#fff" /> : "Ask Richard"}</button>
          </Card>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 2px 10px" }}>Budget categories</div>
        {biz.categories.map(function(a) {
          var catMonth = bizCatMonthSpent(biz, a.key, ym);
          var over = catMonth > a.planned && a.planned > 0;
          return (
            <Card key={a.key} style={{ marginBottom: 12, overflow: "hidden" }}>
              <div style={{ padding: "15px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: a.color + "1F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <SVGIcon id={a.icon} size={18} color={a.color} />
                  </div>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: T.ink }}>{a.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: over ? T.red : T.ink2 }}>{dollars(catMonth) + " / " + sym}</span>
                    <input type="number" value={getDetailEdit(biz.id, "alloc_" + a.key, a.planned)}
                      onChange={function(e) { setDetailEdit(biz.id, "alloc_" + a.key, e.target.value); }}
                      onBlur={function(e) { updatePlanned(biz.id, a.key, e.target.value); clearDetailEdit(biz.id, "alloc_" + a.key); }}
                      style={{ width: 58, border: "none", background: "rgba(0,0,0,0.05)", borderRadius: 7, outline: "none", fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: UI, textAlign: "right", padding: "3px 6px", boxSizing: "border-box" }} />
                  </div>
                </div>
                <ProgressBar value={catMonth} max={a.planned || 1} color={over ? T.red : a.color} h={6} />
                {a.spent > catMonth && <div style={{ fontSize: 11, color: T.ink3, marginTop: 5 }}>{"All time: " + dollars(a.spent)}</div>}
                {(a.entries || []).length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    {a.entries.map(function(e) {
                      return (
                        <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
                          <span style={{ fontSize: 13, color: T.ink2 }}>{e.label}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{dollars(e.amount)}</span>
                            <button onClick={function() { deleteExpense(biz.id, a.key, e.id); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}><SVGIcon id="trash" size={14} color={T.ink3} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={function() { setLogFor({ bizId: biz.id, key: a.key, label: a.label }); setLogForm({ label: "", amount: "" }); }}
                  style={{ width: "100%", marginTop: 10, background: T.orangeDim, border: "none", borderRadius: 10, padding: "9px 0", color: T.orange, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: UI }}>+ Log expense</button>
              </div>
            </Card>
          );
        })}

        <div style={{ position: "relative", overflow: "hidden", borderRadius: 22, padding: "20px 22px", background: T.heroBg, boxShadow: T.heroShadow, marginBottom: 16, marginTop: 4 }}>
          <div style={{ position: "absolute", bottom: -70, left: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle," + T.heroGlow1 + ",transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: T.heroMut }}>Unallocated budget</div>
            <div style={{ fontSize: 34, fontWeight: 700, color: (monthly - plannedTotal) < 0 ? T.heroNeg : T.heroInk, letterSpacing: "-0.03em", marginTop: 8 }}>{((monthly - plannedTotal) < 0 ? "-" : "") + dollars(Math.abs(monthly - plannedTotal))}</div>
            <div style={{ fontSize: 12.5, color: T.heroMut, marginTop: 6, lineHeight: 1.5 }}>{dollars(monthly) + " monthly budget - " + dollars(plannedTotal) + " allocated"}</div>
          </div>
        </div>

        {capHistory.length > 0 && (
          <Card style={{ padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Capital history</div>
            {capHistory.map(function(e) {
              var dep = e.kind !== "withdraw";
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "0.5px solid " + T.sep }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: (dep ? T.green : T.ink3) + "1F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <SVGIcon id={dep ? "down" : "up"} size={13} color={dep ? T.green : T.ink2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{e.label || (dep ? "Capital" : "Withdraw")}</div>
                    <div style={{ fontSize: 11, color: T.ink3, marginTop: 1 }}>{e.date}</div>
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: dep ? T.green : T.ink2, flexShrink: 0 }}>{(dep ? "+" : "-") + dollars(e.amount)}</span>
                </div>
              );
            })}
          </Card>
        )}

        <Card style={{ overflow: "hidden", marginBottom: 12 }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: "0.5px solid " + T.sep }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: UI }}>Ask your CFO</div>
            <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 3, fontFamily: UI }}>Richard can answer questions and retune your budget</div>
          </div>
          {thread.length > 0 && (
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {thread.map(function(m, i) {
                if (m.role === "system") {
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, background: T.greenDim, color: T.green, borderRadius: 999, padding: "4px 11px", fontSize: 11.5, fontWeight: 700, fontFamily: UI }}>
                        <SVGIcon id="check" size={11} color={T.green} />{m.text}
                      </div>
                    </div>
                  );
                }
                var isUser = m.role === "user";
                return (
                  <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "82%", background: isUser ? T.orange : "rgba(0,0,0,0.05)", borderRadius: 12, padding: "8px 12px", fontSize: 13.5, color: isUser ? "#fff" : T.ink, lineHeight: 1.5, fontFamily: UI }}>
                      {isUser ? m.text : <TypeReveal text={m.text} size={13.5} animate={m.role === "richard" && m.text === animBizRef.current} onDone={function() { animBizRef.current = null; }} />}
                    </div>
                  </div>
                );
              })}
              {chatLoading && <RichardThinking size={13.5} radius={12} />}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, padding: "10px 12px" }}>
            <input value={chatInput} onChange={function(e) { setChatInput(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter" && !chatLoading) sendChat(biz); }}
              placeholder="e.g. Should I spend more on marketing?"
              style={{ flex: 1, border: "none", background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: "9px 12px", fontSize: 13.5, fontFamily: UI, outline: "none", color: T.ink }} />
            <button onClick={function() { sendChat(biz); }} disabled={!chatInput.trim() || chatLoading}
              style={{ background: chatInput.trim() && !chatLoading ? T.btn : "rgba(0,0,0,0.1)", border: "none", borderRadius: 10, width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 17 }}>^</button>
          </div>
        </Card>

        {deleteConfirm === biz.id ? (
          <div style={{ background: "rgba(220,50,50,0.07)", borderRadius: 12, padding: "12px 14px", marginTop: 6 }}>
            <div style={{ fontSize: 13, color: T.ink2, marginBottom: 10, lineHeight: 1.45 }}>{bal > 0 ? dollars(bal) + " of cash will return to your balance. " : ""}Close this business account?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={function() { closeBusiness(biz); }} style={{ flex: 1, border: "none", cursor: "pointer", fontFamily: UI, fontSize: 13.5, fontWeight: 700, padding: "10px 0", borderRadius: 10, background: T.red, color: "#fff" }}>Close account</button>
              <button onClick={function() { setDeleteConfirm(null); }} style={{ flex: 1, border: "none", cursor: "pointer", fontFamily: UI, fontSize: 13.5, fontWeight: 600, padding: "10px 0", borderRadius: 10, background: "rgba(0,0,0,0.07)", color: T.ink2 }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={function() { setDeleteConfirm(biz.id); }}
            style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer", padding: "8px 0 4px" }}>Close business account</button>
        )}

        {deleteOutrightConfirm === biz.id ? (
          <div style={{ background: "rgba(220,50,50,0.07)", borderRadius: 12, padding: "12px 14px", marginTop: 8 }}>
            <div style={{ fontSize: 13, color: T.ink2, marginBottom: 10, lineHeight: 1.45 }}>{bal > 0 ? dollars(bal) + " will be permanently lost. " : ""}Delete this account and its plan? This cannot be undone.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={function() { deleteBusinessOutright(biz); }} style={{ flex: 1, border: "none", cursor: "pointer", fontFamily: UI, fontSize: 13.5, fontWeight: 700, padding: "10px 0", borderRadius: 10, background: T.red, color: "#fff" }}>Delete</button>
              <button onClick={function() { setDeleteOutrightConfirm(null); }} style={{ flex: 1, border: "none", cursor: "pointer", fontFamily: UI, fontSize: 13.5, fontWeight: 600, padding: "10px 0", borderRadius: 10, background: "rgba(0,0,0,0.07)", color: T.ink2 }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={function() { setDeleteOutrightConfirm(biz.id); }}
            style={{ width: "100%", background: "none", border: "none", color: T.ink3, fontSize: 12.5, fontWeight: 600, fontFamily: UI, cursor: "pointer", padding: "4px 0 2px", textAlign: "left" }}>Delete account</button>
        )}

        <Overlay open={!!act} onClose={function() { setAct(null); }} title={(act && act.kind === "add" ? "Add capital" : "Withdraw") + (biz ? " - " + biz.name : "")}>
          <div>
            {act && act.kind === "withdraw" && <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 10 }}>{"Cash on hand: " + dollars(bal)}</div>}
            <div style={{ padding: "16px 18px", background: "rgba(0,0,0,0.04)", borderRadius: 14, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 22, color: T.ink3, fontWeight: 600 }}>{sym}</span>
                <input value={amt} onChange={function(e) { setAmt(e.target.value); }} type="number" inputMode="decimal" placeholder="0" autoFocus={true}
                  style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 28, fontFamily: UI, color: T.ink, fontWeight: 700, padding: 0, boxSizing: "border-box", width: "100%" }} />
              </div>
            </div>
            {act && act.kind === "add"
              ? seg(srcc, setSrc, [{ v: "external", l: "New money" }, { v: "balance", l: "From balance" }])
              : seg(srcc, setSrc, [{ v: "balance", l: "To balance" }, { v: "remove", l: "Take out" }])}
            {act && act.kind === "withdraw" && (
              <div style={{ marginTop: 9 }}>
                <FormRow label="Name" value={wLabel} onChange={function(e) { setWLabel(e.target.value); }} placeholder={srcc === "balance" ? "To balance" : "Taken out"} />
                <FormRow label="Date" value={wDate} onChange={function(e) { setWDate(e.target.value); }} type="date" last={true} />
              </div>
            )}
            <div style={{ fontSize: 12, color: T.ink3, marginTop: 9, lineHeight: 1.45, padding: "0 2px" }}>
              {act && act.kind === "add"
                ? (srcc === "external" ? "Outside money - your spendable balance is untouched, net worth rises." : "Moves from your spendable balance. Net worth is unchanged.")
                : (srcc === "balance" ? "Returns to your spendable balance. Net worth is unchanged." : "Leaves the business for good - net worth falls.")}
            </div>
            <BigBtn label={act && act.kind === "add" ? "Add capital" : "Withdraw"} onPress={submitAction} disabled={!(parseFloat(amt) > 0)} />
          </div>
        </Overlay>

        <Overlay open={!!logFor} onClose={function() { setLogFor(null); }} title={logFor ? ("Log expense - " + logFor.label) : "Log expense"}>
          <FormRow label="What was it?" value={logForm.label} onChange={function(e) { setLogField("label", e.target.value); }} />
          <FormRow label="Amount" value={logForm.amount} onChange={function(e) { setLogField("amount", e.target.value); }} type="number" last={true} />
          <BigBtn label="Log expense" disabled={!(parseFloat(logForm.amount) > 0)} onPress={function() { if (logFor) logExpense(logFor.bizId, logFor.key); }} />
        </Overlay>

        <Overlay open={!!revFor} onClose={function() { setRevFor(null); }} title="Record revenue">
          <FormRow label="Source (optional)" value={revForm.label} onChange={function(e) { setRevField("label", e.target.value); }} />
          <FormRow label="Amount" value={revForm.amount} onChange={function(e) { setRevField("amount", e.target.value); }} type="number" last={true} />
          <BigBtn label="Record revenue" disabled={!(parseFloat(revForm.amount) > 0)} onPress={function() { if (revFor) logRevenue(revFor); }} />
        </Overlay>
      </div>
    );
  }

  if (view === "detail" && activeBiz) return detailView(activeBiz);
  if (view === "wizard") return wizardView();
  return listView();
}

// Profile-accessible version of the mid-month CatchUpScreen: log income earned
// and spending per category for the current month. Appends them as real
// transactions dated today.
function LogMonthView(props) {
  var allCats = props.categories || [];
  var cats = allCats.filter(function(c) { return c.folderId !== "f3" && c.id !== "opening"; });
  var allTx = props.tx || [];
  var allBudgets = props.budgets || [];
  var _am = useState({}); var amts = _am[0]; var setAmts = _am[1];
  var _in = useState(""); var inc = _in[0]; var setInc = _in[1];

  var localeMap = { en: "en-US", he: "he-IL", es: "es-ES", fr: "fr-FR", ar: "ar-SA", ru: "ru-RU", de: "de-DE", pt: "pt-BR" };
  var locale = localeMap[_lang.code] || "en-US";
  var monthName = new Date().toLocaleString(locale, { month: "long" });
  var sym = _currency.sym;
  var ym = curMonth();

  // What's already logged this month per category, and the budget limit if set.
  function spentThisMonth(c) {
    return allTx.filter(function(t) { return t.type === "expense" && !isTrip(t) && inMonth(t, ym) && (t.catId === c.id || t.category === c.name); }).reduce(function(s, t) { return s + t.amount; }, 0);
  }
  function limitFor(c) {
    var b = allBudgets.filter(function(x) { return x.catId === c.id || x.category === c.name; })[0];
    return b ? b.limit : 0;
  }

  function setAmt(id, v) {
    setAmts(function(prev) { var n = {}; for (var k in prev) n[k] = prev[k]; n[id] = v; return n; });
  }
  function buildTxs() {
    var today = new Date().toISOString().slice(0, 10);
    var out = [];
    var base = Date.now();
    var i = 0;
    cats.forEach(function(c) {
      var v = parseFloat(amts[c.id]);
      if (v > 0) out.push({ type: "expense", amount: round2(v), label: c.name, catId: c.id, category: c.name, date: today, id: base + (i++), repeat: "none", pending: false, catchUp: true });
    });
    var iv = parseFloat(inc);
    if (iv > 0) out.push({ type: "income", amount: round2(iv), label: monthName + " income", catId: "c8", category: "Salary", date: today, id: base + (i++), repeat: "none", pending: false, catchUp: true });
    return out;
  }
  var anything = parseFloat(inc) > 0 || cats.some(function(c) { return parseFloat(amts[c.id]) > 0; });
  var fieldBox = { display: "flex", alignItems: "center", gap: 3, background: "rgba(0,0,0,0.05)", borderRadius: 10, padding: "7px 10px", minWidth: 96 };
  var amtInput = { width: 58, border: "none", background: "none", outline: "none", fontSize: 15, fontFamily: UI, color: T.ink, fontWeight: 600, textAlign: "right" };

  return (
    <div>
      <SubViewBack onBack={props.onBack} />
      <div style={{ fontSize: 14, color: T.ink3, lineHeight: 1.55, marginBottom: 16, padding: "0 2px" }}>
        Log what you earned and spent so far this {monthName}. These add as transactions dated today - edit or delete any of them later in Activity.
      </div>

      <Card style={{ padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Income received this {monthName}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 22, color: T.ink3, fontWeight: 600 }}>{sym}</span>
          <input value={inc} onChange={function(e) { setInc(e.target.value); }} type="number" inputMode="decimal" placeholder="0"
            style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 22, fontFamily: UI, color: T.ink, fontWeight: 700 }} />
        </div>
      </Card>

      <div style={{ fontSize: 12, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", margin: "4px 4px 8px" }}>Spent so far this {monthName}</div>
      <Card style={{ overflow: "hidden", marginBottom: 16 }}>
        {cats.map(function(c, i) {
          var already = spentThisMonth(c);
          var lim = limitFor(c);
          var sub = "";
          if (lim > 0) sub = fmtCur(sym, already) + " of " + fmtCur(sym, lim) + " budget";
          else if (already > 0) sub = fmtCur(sym, already) + " logged so far";
          var over = lim > 0 && already > lim;
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: i < cats.length - 1 ? "0.5px solid " + T.sep : "none" }}>
              <CatBadge icon={c.icon} color={c.color} size={34} soft={true} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: T.ink, fontWeight: 500 }}>{c.name}</div>
                {sub && <div style={{ fontSize: 11.5, color: over ? T.red : T.ink3, marginTop: 1 }}>{sub}</div>}
              </div>
              <div style={fieldBox}>
                <span style={{ fontSize: 14, color: T.ink3, fontWeight: 600 }}>{sym}</span>
                <input value={amts[c.id] || ""} onChange={function(e) { setAmt(c.id, e.target.value); }} type="number" inputMode="decimal" placeholder="0" style={amtInput} />
              </div>
            </div>
          );
        })}
      </Card>

      <BigBtn label="Add to my month" disabled={!anything} onPress={function() { props.onComplete(buildTxs()); props.onBack(); }} />
    </div>
  );
}

function NicknameView(props) {
  var _v = useState(props.value || "");
  var val = _v[0]; var setVal = _v[1];
  return (
    <div>
      <SubViewBack onBack={props.onBack} />
      <Card style={{ padding: "22px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>{tr("richyRefersTo")}</div>
        <input
          value={val}
          onChange={function(e) { setVal(e.target.value); }}
          style={{ width: "100%", fontSize: 24, fontWeight: 700, color: T.ink, background: "none", border: "none", outline: "none", fontFamily: UI, padding: 0, boxSizing: "border-box" }}
          autoFocus={true}
        />
      </Card>
      <BigBtn label={tr("save")} onPress={function() { if (val.trim()) { props.onSave(val.trim()); } }} disabled={!val.trim()} />
    </div>
  );
}

function RichardInstructionsView(props) {
  var _v = useState(props.value || "");
  var val = _v[0]; var setVal = _v[1];
  return (
    <div>
      <SubViewBack onBack={props.onBack} label="Richard's Instructions" />
      <Card style={{ padding: "22px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: T.ink2, fontWeight: 500, marginBottom: 12, lineHeight: 1.5 }}>Write custom instructions for Richard. He'll follow these in all conversations within the profile menu.</div>
        <textarea
          value={val}
          onChange={function(e) { setVal(e.target.value); }}
          placeholder="e.g., Be very concise. Always focus on emergency fund first. I prefer conservative investments."
          style={{ width: "100%", fontSize: 14, color: T.ink, background: "rgba(0,0,0,0.03)", border: "0.5px solid " + T.sep, borderRadius: 10, outline: "none", fontFamily: UI, padding: "14px 14px", boxSizing: "border-box", minHeight: 120, resize: "vertical", lineHeight: 1.5 }}
          autoFocus={true}
        />
      </Card>
      <BigBtn label={tr("save")} onPress={function() { props.onSave(val.trim()); }} disabled={false} />
    </div>
  );
}

function LanguageView(props) {
  var _sel = useState(props.lang || "en");
  var selected = _sel[0]; var setSelected = _sel[1];
  function pick(code) { setSelected(code); props.onLangChange(code); }
  return (
    <div>
      <SubViewBack onBack={props.onBack} />
      <Card style={{ overflow: "hidden", marginBottom: 16 }}>
        {LANGUAGE_OPTIONS.map(function(opt, i) {
          var sel = selected === opt.code;
          return (
            <button key={opt.code} onClick={function() { pick(opt.code); }}
              style={{ width: "100%", background: sel ? "rgba(137,112,198,0.05)" : "none", border: "none", borderBottom: i < LANGUAGE_OPTIONS.length - 1 ? "0.5px solid " + T.sep : "none", padding: "17px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: UI }}>
              <span style={{ fontSize: 16, fontWeight: sel ? 700 : 500, color: sel ? T.ink : T.ink2 }}>{opt.label}</span>
              {sel && (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SVGIcon id="check" size={12} color="#fff" />
                </div>
              )}
            </button>
          );
        })}
      </Card>
    </div>
  );
}

function CurrencyView(props) {
  var cur = props.currency || "$";
  var _q = useState(""); var q = _q[0]; var setQ = _q[1];
  var needle = q.trim().toLowerCase();
  var list = CURRENCY_OPTIONS.filter(function(o) {
    if (!needle) return true;
    return o.code.toLowerCase().indexOf(needle) !== -1 || o.name.toLowerCase().indexOf(needle) !== -1 || o.sym.toLowerCase().indexOf(needle) !== -1;
  });
  return (
    <div>
      <SubViewBack onBack={props.onBack} />
      <div style={{ position: "relative", marginBottom: 12 }}>
        <input value={q} onChange={function(e) { setQ(e.target.value); }} placeholder="Search currency or country..."
          style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid " + T.sep, background: T.card, borderRadius: 13, padding: "13px 16px", fontSize: 15, fontFamily: UI, color: T.ink, outline: "none" }} />
      </div>
      <Card style={{ overflow: "hidden", marginBottom: 16 }}>
        {list.length === 0 && (
          <div style={{ padding: "28px 20px", textAlign: "center", fontSize: 14, color: T.ink3, fontFamily: UI }}>No match for "{q}"</div>
        )}
        {list.map(function(opt, i) {
          var sel = cur === opt.sym;
          return (
            <button key={opt.code} onClick={function() { props.onCurrencyChange(opt.sym); }}
              style={{ width: "100%", background: sel ? "rgba(137,112,198,0.05)" : "none", border: "none", borderBottom: i < list.length - 1 ? "0.5px solid " + T.sep : "none", padding: "15px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", fontFamily: UI }}>
              <div style={{ width: 44, textAlign: "center", fontSize: 17, fontWeight: 700, color: sel ? T.orange : T.ink2, flexShrink: 0 }}>{opt.sym}</div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 15.5, fontWeight: sel ? 700 : 600, color: sel ? T.ink : T.ink2 }}>{opt.code}</div>
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 1 }}>{opt.name}</div>
              </div>
              {sel && (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SVGIcon id="check" size={12} color="#fff" />
                </div>
              )}
            </button>
          );
        })}
      </Card>
    </div>
  );
}

function AppearanceView(props) {
  var opts = [
    { id: "purple",  label: "Mika's Violet",    sub: "Lavender hero, violet accents",  a: "#9D78E8", b: "#C8B1FF" },
    { id: "blue",    label: "Cornflower Ocean", sub: "Periwinkle hero, navy accents",  a: "#5C7AE3", b: "#3C4C82" },
    { id: "classic", label: "Dark Ember",       sub: "Dark hero, warm amber accents",  a: "#1E1A16", b: "#C8673A" }
  ];
  var modeOpts = [
    { id: false, label: "Light", sub: "Warm off-white background", a: "#F7F3EE", b: "#FFFFFF" },
    { id: true,  label: "Dark",  sub: "Deep dark background",      a: "#131110", b: "#1C1915" },
  ];
  var secLabel = { fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.09em", padding: "18px 4px 8px", fontFamily: UI };
  return (
    <div>
      <SubViewBack onBack={props.onBack} />
      <div style={secLabel}>Theme</div>
      <Card style={{ overflow: "hidden", marginBottom: 16 }}>
        {opts.map(function(opt, i) {
          var sel = props.theme === opt.id;
          return (
            <button key={opt.id} onClick={function() { props.onThemeChange(opt.id); }}
              style={{ width: "100%", background: sel ? T.orangeDim : "none", border: "none", borderBottom: i < opts.length - 1 ? "0.5px solid " + T.sep : "none", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", fontFamily: UI }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: "linear-gradient(135deg," + opt.a + "," + opt.b + ")", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.14)" }} />
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 16, fontWeight: sel ? 700 : 600, color: T.ink }}>{opt.label}</div>
                <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>{opt.sub}</div>
              </div>
              {sel && (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SVGIcon id="check" size={12} color="#fff" />
                </div>
              )}
            </button>
          );
        })}
      </Card>
      <div style={secLabel}>Mode</div>
      <Card style={{ overflow: "hidden", marginBottom: 16 }}>
        {modeOpts.map(function(opt, i) {
          var sel = !!props.darkMode === !!opt.id;
          return (
            <button key={String(opt.id)} onClick={function() { props.onDarkModeChange(opt.id); }}
              style={{ width: "100%", background: sel ? T.orangeDim : "none", border: "none", borderBottom: i < modeOpts.length - 1 ? "0.5px solid " + T.sep : "none", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", fontFamily: UI }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: "linear-gradient(135deg," + opt.a + "," + opt.b + ")", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.14)", border: "1px solid rgba(0,0,0,0.08)" }} />
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 16, fontWeight: sel ? 700 : 600, color: T.ink }}>{opt.label}</div>
                <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>{opt.sub}</div>
              </div>
              {sel && (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SVGIcon id="check" size={12} color="#fff" />
                </div>
              )}
            </button>
          );
        })}
      </Card>
    </div>
  );
}

function EntryMethodView(props) {
  var opts = [
    { id: "manual", label: "Enter manually", sub: "Log each transaction yourself - full control", icon: "edit" },
    { id: "import", label: "Import from CSV", sub: "Upload a bank or card statement to fill them in", icon: "down" }
  ];
  return (
    <div>
      <SubViewBack onBack={props.onBack} />
      <Card style={{ overflow: "hidden", marginBottom: 16 }}>
        {opts.map(function(opt, i) {
          var sel = props.entryMethod === opt.id;
          return (
            <button key={opt.id} onClick={function() { props.onEntryMethodChange(opt.id); }}
              style={{ width: "100%", background: sel ? T.orangeDim : "none", border: "none", borderBottom: i < opts.length - 1 ? "0.5px solid " + T.sep : "none", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", fontFamily: UI }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: sel ? T.orange : "rgba(0,0,0,0.05)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SVGIcon id={opt.icon} size={20} color={sel ? "#fff" : T.ink3} />
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 16, fontWeight: sel ? 700 : 600, color: T.ink }}>{opt.label}</div>
                <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>{opt.sub}</div>
              </div>
              {sel && (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SVGIcon id="check" size={12} color="#fff" />
                </div>
              )}
            </button>
          );
        })}
      </Card>
      <div style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.55, padding: "0 6px" }}>
        This sets your default. Both options stay available anytime in the Activity tab - the + button adds one by hand, the import button brings in a CSV.
      </div>
    </div>
  );
}

function InfoRow(props) {
  var rowStyle = { width: "100%", padding: "13px 20px", borderBottom: props.last ? "none" : "0.5px solid " + T.sep, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 };
  var label = <span style={{ fontSize: 14, color: T.ink3, fontFamily: UI, flexShrink: 0 }}>{props.label}</span>;
  var valText = (props.value !== undefined && props.value !== null && props.value !== "") ? props.value : "--";
  var right = (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: UI, textAlign: "right" }}>{valText}</span>
      {props.onClick ? <SVGIcon id="chevron" size={14} color={T.ink3} /> : null}
    </div>
  );
  if (props.onClick) {
    return (
      <button onClick={props.onClick} style={Object.assign({}, rowStyle, { background: "none", border: "none", cursor: "pointer", fontFamily: UI })}>
        {label}{right}
      </button>
    );
  }
  return <div style={rowStyle}>{label}{right}</div>;
}

function PrivacyView(props) {
  var blob = props.blob || {};
  var oData = blob.onboardingData || {};
  var email = blob.email || "";
  var langLabel = (LANGUAGE_OPTIONS.filter(function(o) { return o.code === (blob.lang || "en"); })[0] || {}).label || "English";
  var curLabel = (CURRENCY_OPTIONS.filter(function(o) { return o.sym === (blob.currency || "$"); })[0] || {}).label || (blob.currency || "$");
  var themeLabel = themeLabelOf(blob.theme);
  var secLabel = { fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.09em", padding: "18px 4px 8px", fontFamily: UI };

  var rows = [];
  rows.push({ label: "Name",              value: blob.displayName || "",   onClick: props.onEditName });
  rows.push({ label: "Date of birth",     value: blob.dob || "",           onClick: props.onEditDob });
  rows.push({ label: "Language",          value: langLabel,                onClick: props.onEditLanguage });
  rows.push({ label: "Currency",          value: curLabel,                 onClick: props.onEditCurrency });
  rows.push({ label: "Theme",             value: themeLabel,               onClick: props.onEditTheme });
  rows.push({ label: "Life stage",        value: oData.lifeStage || "",    onClick: props.onEditFinancial });
  rows.push({ label: "Monthly income",    value: oData.income ? "$" + oData.income : "",    onClick: props.onEditFinancial });
  rows.push({ label: "Monthly essentials",value: oData.essentials ? "$" + oData.essentials : "", onClick: props.onEditFinancial });
  rows.push({ label: "Savings",           value: oData.savings ? "$" + oData.savings : "",  onClick: props.onEditFinancial });
  rows.push({ label: "Total debt",        value: oData.debt ? "$" + oData.debt : "",        onClick: props.onEditFinancial });
  rows.push({ label: "Top goal",          value: oData.goalName || "",     onClick: props.onEditFinancial });

  return (
    <div>
      <SubViewBack onBack={props.onBack} label="Profile" />

      <div style={secLabel}>Account</div>
      <Card style={{ overflow: "hidden", marginBottom: 4 }}>
        <InfoRow label="Email" value={email} onClick={props.onEditEmail} last={true} />
      </Card>

      <div style={secLabel}>What Richy knows</div>
      <Card style={{ overflow: "hidden", marginBottom: 4 }}>
        {rows.map(function(row, i) {
          return <InfoRow key={i} label={row.label} value={row.value} onClick={row.onClick} last={i === rows.length - 1} />;
        })}
      </Card>

      <div style={secLabel}>Password</div>
      <Card style={{ overflow: "hidden", marginBottom: 16 }}>
        <ProfileRow icon="lock" label={props.hasPw ? "Change password" : "Add password"} onClick={props.onViewPassword} last={true} />
      </Card>
    </div>
  );
}

function EditEmailView(props) {
  var _em = useState(props.currentEmail || ""); var newEmail = _em[0]; var setNewEmail = _em[1];
  var _op = useState(""); var oldPw = _op[0]; var setOldPw = _op[1];
  var _err = useState(""); var err = _err[0]; var setErr = _err[1];
  var _ld = useState(false); var loading = _ld[0]; var setLoading = _ld[1];
  var _sh = useState(false); var showPw = _sh[0]; var setShowPw = _sh[1];
  var hasPw = props.hasPw;

  function doUpdate(em) {
    CLOUD.updateEmail(em).then(function() {
      setLoading(false);
      props.onSave(em);
    }).catch(function(e) {
      setLoading(false);
      var code = e && e.code;
      if (code === "auth/requires-recent-login") {
        setErr("Please sign out and sign back in, then try again.");
      } else if (code === "auth/email-already-in-use") {
        setErr("That email is already in use.");
      } else if (code === "auth/invalid-email") {
        setErr("That doesn't look like a valid email.");
      } else {
        setErr("Something went wrong. Please try again.");
      }
    });
  }

  function handleSubmit() {
    setErr("");
    var em = newEmail.trim().toLowerCase();
    if (!isEmail(em)) { setErr("Enter a valid email address."); return; }
    if (em === (props.currentEmail || "").toLowerCase()) { props.onBack(); return; }
    if (hasPw && !oldPw) { setErr("Enter your current password to confirm."); return; }
    setLoading(true);
    if (hasPw) {
      CLOUD.reauthenticate(props.currentEmail, oldPw).then(function() {
        doUpdate(em);
      }).catch(function(e) {
        setLoading(false);
        var code = e && e.code;
        if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
          setErr("Current password is incorrect.");
        } else {
          setErr("Something went wrong. Please try again.");
        }
      });
    } else {
      doUpdate(em);
    }
  }

  var inputStyle = { width: "100%", fontSize: 16, color: T.ink, background: "none", border: "none", outline: "none", fontFamily: UI, padding: 0, boxSizing: "border-box" };
  var fieldLabelStyle = { fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8 };

  return (
    <div>
      <SubViewBack onBack={props.onBack} label="Privacy & Data" />
      <Card style={{ padding: "22px 20px", marginBottom: 12 }}>
        <div style={{ borderBottom: hasPw ? "0.5px solid " + T.sep : "none", paddingBottom: hasPw ? 14 : 0, marginBottom: hasPw ? 14 : 0 }}>
          <div style={fieldLabelStyle}>New email</div>
          <input value={newEmail} onChange={function(e) { setNewEmail(e.target.value); }}
            type="email" placeholder="Enter new email"
            style={inputStyle} autoFocus={true} autoComplete="email" />
        </div>
        {hasPw ? (
          <div>
            <div style={fieldLabelStyle}>Current password</div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input value={oldPw} onChange={function(e) { setOldPw(e.target.value); }}
                type={showPw ? "text" : "password"} placeholder="Confirm your password"
                style={Object.assign({}, inputStyle, { flex: 1 })} autoComplete="current-password" />
              <button onClick={function() { setShowPw(function(v) { return !v; }); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 8px" }}>
                <SVGIcon id={showPw ? "eyeoff" : "eye"} size={16} color={T.ink3} />
              </button>
            </div>
          </div>
        ) : null}
        {err ? <div style={{ color: T.red, fontSize: 13, marginTop: 14 }}>{err}</div> : null}
      </Card>
      <BigBtn label={loading ? "Saving..." : "Save email"} onPress={handleSubmit} disabled={loading || !newEmail.trim()} />
    </div>
  );
}

function EditDobView(props) {
  var _dob = useState(props.currentDob || ""); var dob = _dob[0]; var setDob = _dob[1];
  var flStyle = { fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 };
  return (
    <div>
      <SubViewBack onBack={props.onBack} label="Privacy & Data" />
      <Card style={{ padding: "22px 20px", marginBottom: 16 }}>
        <div style={flStyle}>Date of birth</div>
        <input value={dob} onChange={function(e) { setDob(e.target.value); }}
          type="date"
          style={{ width: "100%", fontSize: 16, color: T.ink, background: "none", border: "none", outline: "none", fontFamily: UI, padding: 0, boxSizing: "border-box" }}
          autoFocus={true} />
      </Card>
      <BigBtn label="Save" onPress={function() { if (dob) props.onSave(dob); }} disabled={!dob} />
    </div>
  );
}

function EditFinancialView(props) {
  var oData = props.oData || {};
  var _ls = useState(oData.lifeStage || ""); var lifeStage = _ls[0]; var setLifeStage = _ls[1];
  var _inc = useState(oData.income || ""); var income = _inc[0]; var setIncome = _inc[1];
  var _ess = useState(oData.essentials || ""); var essentials = _ess[0]; var setEssentials = _ess[1];
  var _sav = useState(oData.savings || ""); var savings = _sav[0]; var setSavings = _sav[1];
  var _dbt = useState(oData.debt || ""); var debt = _dbt[0]; var setDebt = _dbt[1];
  var _gn = useState(oData.goalName || ""); var goalName = _gn[0]; var setGoalName = _gn[1];
  var _ga = useState(oData.goalAmt || ""); var goalAmt = _ga[0]; var setGoalAmt = _ga[1];
  var _tl = useState(oData.timeline || ""); var timeline = _tl[0]; var setTimeline = _tl[1];

  function handleSave() {
    props.onSave({ lifeStage: lifeStage, income: income, essentials: essentials, savings: savings, debt: debt, goalName: goalName, goalAmt: goalAmt, timeline: timeline, age: oData.age || "" });
  }

  var flStyle = { fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8, display: "block" };
  var numInput = { width: "100%", fontSize: 15, color: T.ink, background: "none", border: "none", outline: "none", fontFamily: UI, padding: "11px 0", borderBottom: "0.5px solid " + T.sep, boxSizing: "border-box", display: "block" };

  return (
    <div>
      <SubViewBack onBack={props.onBack} label="Privacy & Data" />
      <Card style={{ padding: "22px 20px", marginBottom: 12 }}>
        <span style={flStyle}>Life stage</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18, paddingBottom: 18, borderBottom: "0.5px solid " + T.sep }}>
          {STAGES.map(function(st) {
            var sel = lifeStage === st.label;
            return (
              <button key={st.label} onClick={function() { setLifeStage(st.label); }}
                style={{ background: sel ? T.orange : "rgba(0,0,0,0.06)", border: "none", borderRadius: 30, padding: "9px 16px", fontSize: 14, fontWeight: sel ? 700 : 500, color: sel ? "#fff" : T.ink2, cursor: "pointer", fontFamily: UI }}>
                {st.label}
              </button>
            );
          })}
        </div>
        <span style={flStyle}>Monthly income</span>
        <input value={income} onChange={function(e) { setIncome(e.target.value); }} type="number" placeholder="0" style={numInput} />
        <span style={Object.assign({}, flStyle, { marginTop: 14 })}>Monthly essentials</span>
        <input value={essentials} onChange={function(e) { setEssentials(e.target.value); }} type="number" placeholder="0" style={numInput} />
        <span style={Object.assign({}, flStyle, { marginTop: 14 })}>Current savings</span>
        <input value={savings} onChange={function(e) { setSavings(e.target.value); }} type="number" placeholder="0" style={numInput} />
        <span style={Object.assign({}, flStyle, { marginTop: 14 })}>Total debt</span>
        <input value={debt} onChange={function(e) { setDebt(e.target.value); }} type="number" placeholder="0" style={Object.assign({}, numInput, { borderBottom: "none" })} />
      </Card>
      <Card style={{ padding: "22px 20px", marginBottom: 12 }}>
        <span style={flStyle}>Top goal</span>
        <input value={goalName} onChange={function(e) { setGoalName(e.target.value); }} placeholder="e.g. Emergency fund" style={numInput} />
        <span style={Object.assign({}, flStyle, { marginTop: 14 })}>Target amount</span>
        <input value={goalAmt} onChange={function(e) { setGoalAmt(e.target.value); }} type="number" placeholder="0" style={numInput} />
        <span style={Object.assign({}, flStyle, { marginTop: 14 })}>Timeline</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 8 }}>
          {TIMELINES.map(function(t) {
            var sel = timeline === t;
            return (
              <button key={t} onClick={function() { setTimeline(t); }}
                style={{ background: sel ? T.orange : "rgba(0,0,0,0.06)", border: "none", borderRadius: 30, padding: "9px 16px", fontSize: 14, fontWeight: sel ? 700 : 500, color: sel ? "#fff" : T.ink2, cursor: "pointer", fontFamily: UI }}>
                {t}
              </button>
            );
          })}
        </div>
      </Card>
      <BigBtn label="Save" onPress={handleSave} disabled={false} />
    </div>
  );
}

function PasswordView(props) {
  var _op = useState(""); var oldPw = _op[0]; var setOldPw = _op[1];
  var _np = useState(""); var newPw = _np[0]; var setNewPw = _np[1];
  var _cp = useState(""); var confirmPw = _cp[0]; var setConfirmPw = _cp[1];
  var _err = useState(""); var err = _err[0]; var setErr = _err[1];
  var _ld = useState(false); var loading = _ld[0]; var setLoading = _ld[1];
  var _sh = useState(false); var showPw = _sh[0]; var setShowPw = _sh[1];
  var hasPw = props.hasPw;

  function handleSubmit() {
    setErr("");
    if (!newPw || newPw.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setErr("Passwords don't match."); return; }
    if (hasPw && !oldPw) { setErr("Enter your current password."); return; }
    setLoading(true);
    if (hasPw) {
      CLOUD.reauthenticate(props.email, oldPw).then(function() {
        return CLOUD.updatePassword(newPw);
      }).then(function() {
        setLoading(false);
        props.onDone(false);
      }).catch(function(e) {
        setLoading(false);
        var code = e && e.code;
        if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
          setErr("Current password is incorrect.");
        } else {
          setErr("Something went wrong. Please try again.");
        }
      });
    } else {
      CLOUD.linkPassword(props.email, newPw).then(function() {
        setLoading(false);
        props.onDone(true);
      }).catch(function(e) {
        setLoading(false);
        var code = e && e.code;
        if (code === "auth/requires-recent-login") {
          setErr("Please sign out and sign back in first.");
        } else {
          setErr("Something went wrong. Please try again.");
        }
      });
    }
  }

  var inputStyle = { width: "100%", fontSize: 16, color: T.ink, background: "none", border: "none", outline: "none", fontFamily: UI, padding: 0, boxSizing: "border-box" };
  var fieldStyle = { borderBottom: "0.5px solid " + T.sep, paddingBottom: 14, marginBottom: 14 };
  var fieldLabelStyle = { fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8 };
  var canSubmit = !loading && newPw.length >= 6 && confirmPw.length > 0 && (!hasPw || oldPw.length > 0);

  return (
    <div>
      <SubViewBack onBack={props.onBack} label="Privacy & Data" />
      <Card style={{ padding: "22px 20px", marginBottom: 12 }}>
        {hasPw ? (
          <div style={fieldStyle}>
            <div style={fieldLabelStyle}>Current password</div>
            <input
              value={oldPw}
              onChange={function(e) { setOldPw(e.target.value); }}
              type={showPw ? "text" : "password"}
              placeholder="Enter current password"
              style={inputStyle}
              autoFocus={true}
              autoComplete="current-password"
            />
          </div>
        ) : null}
        <div style={fieldStyle}>
          <div style={fieldLabelStyle}>New password</div>
          <input
            value={newPw}
            onChange={function(e) { setNewPw(e.target.value); }}
            type={showPw ? "text" : "password"}
            placeholder="At least 6 characters"
            style={inputStyle}
            autoFocus={!hasPw}
            autoComplete="new-password"
          />
        </div>
        <div>
          <div style={fieldLabelStyle}>Confirm new password</div>
          <input
            value={confirmPw}
            onChange={function(e) { setConfirmPw(e.target.value); }}
            type={showPw ? "text" : "password"}
            placeholder="Repeat new password"
            style={inputStyle}
            autoComplete="new-password"
          />
        </div>
        {err ? <div style={{ color: T.red, fontSize: 13, marginTop: 14 }}>{err}</div> : null}
      </Card>
      <button
        onClick={function() { setShowPw(function(v) { return !v; }); }}
        style={{ background: "none", border: "none", color: T.ink3, fontSize: 13, fontFamily: UI, padding: "4px 2px", marginBottom: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        <SVGIcon id={showPw ? "eyeoff" : "eye"} size={14} color={T.ink3} />
        {showPw ? "Hide passwords" : "Show passwords"}
      </button>
      <BigBtn label={loading ? "Saving..." : (hasPw ? "Change password" : "Set password")} onPress={handleSubmit} disabled={!canSubmit} />
    </div>
  );
}

function PlanView(props) {
  var _msgs = useState([]); var msgs = _msgs[0]; var setMsgs = _msgs[1];
  var _inp = useState(""); var input = _inp[0]; var setInput = _inp[1];
  var _load = useState(false); var loading = _load[0]; var setLoading = _load[1];
  // Text of the just-arrived Richard reply - only that message streams in.
  var animPlanRef = useRef(null);
  var _pa = useState(null); var pendingAction = _pa[0]; var setPendingAction = _pa[1];
  var _tp = useState(false); var translatingPlan = _tp[0]; var setTranslatingPlan = _tp[1];

  function planNeedsTranslation() {
    if (!props.plan || !props.lang || props.lang === "en") return false;
    for (var i = 0; i < props.plan.length; i++) {
      if (props.plan.charCodeAt(i) > 127) return false;
    }
    return true;
  }

  function translatePlan() {
    if (translatingPlan || !props.plan || !props.lang || props.lang === "en") return;
    var langName = LANGUAGE_NAMES[props.lang] || props.lang;
    setTranslatingPlan(true);
    callClaude(
      [{ role: "user", content: "Translate this financial plan to " + langName + ". Keep the same warm tone, structure, and personal advice. Output only the translated plan, nothing else:\n\n" + props.plan }],
      "You are Richard, a personal finance advisor. Translate the given financial plan faithfully to the requested language. Preserve the warm, direct, personal tone.",
      400,
      function(err, translated) { setTranslatingPlan(false); if (!err && translated && props.onUpdatePlan) props.onUpdatePlan(translated); }
    );
  }

  useEffect(function() {
    if (planNeedsTranslation()) translatePlan();
  }, []);

  function parseAction(text) {
    var m = text.match(/\[ACTION:\{([^}]*)\}\]/);
    if (!m) return null;
    try { return JSON.parse("{" + m[1] + "}"); } catch(e) { return null; }
  }

  function cleanText(text) {
    return text.replace(/\[ACTION:\{[^}]*\}\]/g, "").trim();
  }

  function sendMessage() {
    if (!input.trim() || loading) return;
    var userMsg = input.trim();
    setInput("");
    var newMsgs = msgs.concat([{ role: "user", text: userMsg }]);
    setMsgs(newMsgs);
    setLoading(true);
    var apiMsgs = newMsgs.map(function(m) {
      return { role: m.role === "user" ? "user" : "assistant", content: m.text };
    });
    var planChallenge = (props.onboardingData && props.onboardingData.coreProblem) || "";
    var langName = props.lang && props.lang !== "en" ? (LANGUAGE_NAMES[props.lang] || "English") : "";
    var customInstructionsPrefix = (props.richardInstructions && props.richardInstructions.trim()) ? ("CONTEXT FROM THE USER (follow any instructions; treat background as things to keep in mind):\n" + props.richardInstructions + "\n\n") : "";
    var sys = customInstructionsPrefix + "You are Richard, a calm, warm, and deeply knowledgeable personal finance advisor inside the Richy app. You are a trusted friend who combines world-class financial expertise with genuine care for the user's situation. "
      + "The user's name is " + (props.username || "there") + ". "
      + (planChallenge ? "Their primary financial challenge is: " + planChallenge + ". Address this challenge directly and specifically — no generic advice. " : "")
      + "Their current financial plan is: " + (props.plan || "not yet created") + ". Use this plan as context for every answer. "
      + "You have deep knowledge from the world's best financial books and thinkers: The Psychology of Money (Morgan Housel — wealth is about behavior, not intelligence; saving is the gap between ego and income); Rich Dad Poor Dad (Kiyosaki — assets put money in your pocket, liabilities take it out; buy assets first); The Millionaire Next Door (Stanley and Danko — most millionaires live below their means, drive used cars, avoid lifestyle inflation); I Will Teach You To Be Rich (Ramit Sethi — automate savings, spend extravagantly on what you love, cut mercilessly elsewhere); The Total Money Makeover (Dave Ramsey — debt snowball, emergency fund first, live on less than you earn); The Richest Man in Babylon (Clason — pay yourself first 10%, live on 70%, give 20% to debts); Money Master the Game (Robbins — asset allocation drives 90% of returns, fees kill wealth). "
      + "You carry the wisdom of Warren Buffett (do not save what is left after spending — spend what is left after saving; rule one: never lose money), Charlie Munger (invert, always invert; avoid what destroys wealth as much as seeking what builds it), Ray Dalio (diversify well and you can reduce risk without reducing returns; pain plus reflection equals progress), Naval Ravikant (earn with your mind not your time; build or buy equity), and Mark Cuban (pay off credit cards every month; savings rates matter more than investment returns early on). "
      + "You know the Richy app deeply: it has tabs for Overview (balance, cash flow, net worth), Activity (all transactions), Budgets (monthly spending limits by category), Goals (savings targets), and Advisor (full AI analysis). Categories are managed via the tag icon on Overview or the Manage link in transaction pickers. "
      + "Richy CAN import a CSV statement: the Activity tab has an import button that reads a bank or card CSV export entirely on-device (it maps columns, handles separate money-in/money-out columns, auto-categorizes from the user's history, and skips duplicates). If someone is tired of manual entry, point them there. "
      + "Be honest about what Richy currently does not support: no live bank or card sync (CSV import is the workaround), no shared couples mode, no interest-based debt payoff calculator, no business accounting. If asked about these, acknowledge the gap and offer the best workaround available inside Richy. "
      + "Be concise and direct — keep it short unless the user asks for more depth." + RICHARD_FORMAT + " The only bracketed syntax you may use is the action tag described next. "
      + "If you want to suggest a specific concrete change to the user's app, append exactly one action tag at the very end of your reply: "
      + "[ACTION:{\"type\":\"budget\",\"category\":\"Food\",\"limit\":500}] to set a monthly budget limit, or "
      + "[ACTION:{\"type\":\"goal\",\"name\":\"Emergency Fund\",\"target\":3000}] to create a savings goal. "
      + "Only include an action tag when making a specific recommendation with a real number the user has agreed to — never for hypotheticals or plans. "
      + (langName ? "Respond entirely in " + langName + "." : "");
    callClaude(apiMsgs, sys, 250, function(err, reply) {
      var text = err || !reply ? "Sorry, I could not connect. Try again." : reply;
      var action = parseAction(text);
      var clean = cleanText(text);
      animPlanRef.current = clean;
      setMsgs(function(prev) { return prev.concat([{ role: "richard", text: clean }]); });
      if (action) setPendingAction(action);
      setLoading(false);
    });
  }

  function implementAction() {
    if (!pendingAction) return;
    if (pendingAction.type === "budget") {
      var catName = (pendingAction.category || "").toLowerCase();
      var cat = (props.categories || []).filter(function(c) { return c.name.toLowerCase() === catName; })[0];
      if (cat && props.onSaveBudgets) {
        var rest = (props.budgets || []).filter(function(b) { return b.catId !== cat.id; });
        props.onSaveBudgets(rest.concat([{ catId: cat.id, limit: pendingAction.limit || 0 }]));
      }
    } else if (pendingAction.type === "goal") {
      if (props.onSaveGoals) {
        var ng = { id: Date.now(), name: pendingAction.name || "New Goal", target: pendingAction.target || 1000, saved: 0 };
        props.onSaveGoals((props.goals || []).concat([ng]));
      }
    }
    setPendingAction(null);
  }

  return (
    <div>
      <SubViewBack onBack={props.onBack} />

      {props.plan ? (
        <Card style={{ padding: "22px 22px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: UI }}>
              {tr("yourPlanByRichard")}
            </div>
            {props.lang && props.lang !== "en" && (
              <button onClick={translatePlan}
                style={{ fontSize: 11, color: T.orange, background: "none", border: "none", cursor: "pointer", fontFamily: UI, fontWeight: 600, padding: 0, opacity: translatingPlan ? 0.5 : 1 }}>
                {translatingPlan ? <ThinkingDots size={3} color={T.orange} /> : tr("translate")}
              </button>
            )}
          </div>
          <div style={{ fontSize: 15, color: T.ink, lineHeight: 1.7, fontFamily: UI }}>
            <RichardText text={props.plan} size={15} />
          </div>
        </Card>
      ) : (
        <Card style={{ padding: "36px 22px", textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 15, color: T.ink3, lineHeight: 1.6 }}>{tr("noPlanYet")}</div>
        </Card>
      )}

      {msgs.length > 0 && (
        <Card style={{ padding: "16px 18px", marginBottom: 16 }}>
          {msgs.map(function(m, i) {
            var isUser = m.role === "user";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: i < msgs.length - 1 ? 10 : 0 }}>
                <div style={{ maxWidth: "82%", background: isUser ? T.orange : "rgba(0,0,0,0.05)", borderRadius: 14, padding: "9px 13px", fontSize: 14, color: isUser ? "#fff" : T.ink, lineHeight: 1.5, fontFamily: UI }}>
                  {isUser ? m.text : <TypeReveal text={m.text} size={14} animate={m.role === "richard" && m.text === animPlanRef.current} onDone={function() { animPlanRef.current = null; }} />}
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ marginTop: 10 }}>
              <RichardThinking size={14} radius={14} />
            </div>
          )}
        </Card>
      )}

      {pendingAction && (
        <Card style={{ padding: "18px 18px", marginBottom: 16, border: "1.5px solid " + T.orange }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: UI }}>
            {tr("richySuggests")}
          </div>
          <div style={{ fontSize: 14, color: T.ink, marginBottom: 14, fontFamily: UI, lineHeight: 1.5 }}>
            {pendingAction.type === "budget"
              ? "Set a " + dollars(pendingAction.limit || 0) + " budget for " + (pendingAction.category || "")
              : "Create goal: " + (pendingAction.name || "") + " (" + dollars(pendingAction.target || 0) + ")"}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={implementAction}
              style={{ flex: 1, background: T.btn, color: "#fff", textShadow: "0 1px 2px rgba(42,31,77,0.35)", border: "none", borderRadius: 10, padding: "9px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: UI }}>
              {tr("implement")}
            </button>
            <button onClick={function() { setPendingAction(null); }}
              style={{ flex: 1, background: "rgba(0,0,0,0.08)", color: T.ink2, border: "none", borderRadius: 10, padding: "9px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: UI }}>
              {tr("dismiss")}
            </button>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, padding: "10px 12px" }}>
          <input value={input} onChange={function(e) { setInput(e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter" && !loading) sendMessage(); }}
            placeholder={tr("giveFeedback")}
            style={{ flex: 1, border: "none", background: "rgba(0,0,0,0.04)", borderRadius: 12, padding: "10px 14px", fontSize: 14, fontFamily: UI, outline: "none", color: T.ink }} />
          <button onClick={sendMessage} disabled={!input.trim() || loading}
            style={{ background: input.trim() && !loading ? T.btn : "rgba(0,0,0,0.1)", border: "none", borderRadius: 12, width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 18 }}>
            ^
          </button>
        </div>
      </Card>

      <button onClick={props.onRetake}
        style={{ width: "100%", background: T.orangeDim, color: T.orange, border: "1.5px solid rgba(137,112,198,0.2)", borderRadius: 16, padding: "16px 0", fontSize: 16, fontFamily: UI, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
        {tr("redoQuestionnaire")}
      </button>
    </div>
  );
}

function ProfileRow(props) {
  return (
    <button onClick={props.onClick}
      style={{ width: "100%", background: "none", border: "none", borderBottom: props.last ? "none" : "0.5px solid " + T.sep, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: UI, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: props.iconBg || T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <SVGIcon id={props.icon} size={16} color={props.iconColor || T.orange} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 500, color: T.ink }}>{props.label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {props.value && <span style={{ fontSize: 13, color: T.ink3, fontFamily: UI }}>{props.value}</span>}
        <SVGIcon id="chevron" size={15} color={T.ink3} />
      </div>
    </button>
  );
}

function ProfileSection(props) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 2, marginBottom: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: props.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 6px " + props.glow }}>
          <SVGIcon id={props.icon} size={13} color={props.color} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.ink2, letterSpacing: "0.01em", fontFamily: UI }}>{props.title}</span>
      </div>
      <Card style={{ overflow: "hidden" }}>
        {props.children}
      </Card>
    </div>
  );
}

// Read-oriented list of ended trips, reached from Profile > Travel > Trip
// History. Tapping one opens its normal detail view (still has Reopen/Delete).
function TripHistoryView(props) {
  var ended = (props.trips || []).filter(function(t) { return t.ended; })
    .sort(function(a, b) { return (b.endedAt || "").localeCompare(a.endedAt || ""); });
  return (
    <div>
      <SubViewBack onBack={props.onBack} />
      {ended.length === 0 ? (
        <Card style={{ padding: "46px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SVGIcon id="plane" size={24} color={T.orange} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>No trips yet</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>{"Trips you end will show up here."}</div>
        </Card>
      ) : ended.map(function(t) {
        var spent = tripSpent(t);
        return (
          <Card key={t.id} style={{ marginBottom: 14, overflow: "hidden" }}>
            <div onClick={function() { props.onOpenTrip(t.id); }} style={{ padding: "18px 18px", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <SVGIcon id={t.icon || "plane"} size={20} color={T.orange} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: T.ink3, marginTop: 2 }}>{(t.destination || "") + (t.days ? (" - " + t.days + "d") : "")}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(spent)}</div>
                  <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>{"of " + dollars(t.total)}</div>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: T.ink3 }}>{"Ended " + (t.endedAt || "")}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Profile(props) {
  var cur = props.currency || "$";
  var lang = props.lang || "en";
  var langLabel = (LANGUAGE_OPTIONS.filter(function(o) { return o.code === lang; })[0] || {}).label || "English";
  var curLabel = (CURRENCY_OPTIONS.filter(function(o) { return o.sym === cur; })[0] || {}).label || cur;
  var themeLabel = themeLabelOf(props.theme);
  var initial = (props.user || "?")[0].toUpperCase();
  return (
    <div>

      {/* ── Header ── */}
      <div style={{ textAlign: "center", padding: "12px 0 30px" }}>
        <div style={{ width: 82, height: 82, borderRadius: 28, background: T.btn, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 6px 28px " + T.orangeGlow, fontSize: 38, fontWeight: 800, color: "#fff", fontFamily: DISP, letterSpacing: "-0.02em", flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: T.ink, letterSpacing: "-0.025em", fontFamily: DISP }}>{props.user}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 9, background: T.orangeDim, borderRadius: 20, padding: "5px 13px" }}>
          <SVGIcon id="spark" size={11} color={T.orange} />
          <span style={{ fontSize: 12, fontWeight: 600, color: T.orange, fontFamily: UI }}>Richy Member</span>
        </div>
      </div>

      {/* ── AI & Richard ── */}
      <ProfileSection icon="spark" title="AI & Richard" bg={T.goldDim} color={T.gold} glow={T.goldGlow}>
        <ProfileRow icon="spark" iconBg={T.goldDim} iconColor={T.gold} label="Your Plan" onClick={props.onViewPlan} />
        <ProfileRow icon="note" iconBg={T.goldDim} iconColor={T.gold} label="Richard's Instructions" value={props.richardInstructions ? "Custom" : "Default"} onClick={props.onViewInstructions} last />
      </ProfileSection>

      {/* ── Money ── */}
      <ProfileSection icon="coins" title="Money" bg={T.greenDim} color={T.green} glow={T.greenGlow}>
        <ProfileRow icon="credit" iconBg={T.greenDim} iconColor={T.green} label="Currency" value={curLabel} onClick={props.onViewCurrency} />
        <ProfileRow icon="briefcase" iconBg={T.greenDim} iconColor={T.green} label="Opening Balance" onClick={props.onViewEditOpeningBalance} />
        <ProfileRow icon="activity" iconBg={T.greenDim} iconColor={T.green} label="Log This Month" onClick={props.onViewLogMonth} />
        <ProfileRow icon="edit" iconBg={T.greenDim} iconColor={T.green} label="Adding Transactions" value={props.entryMethod === "import" ? "CSV import" : "Manual"} onClick={props.onViewEntryMethod} last />
      </ProfileSection>

      {/* ── Visual ── */}
      <ProfileSection icon="sun" title="Visual" bg={T.orangeDim} color={T.orange} glow={T.orangeGlow}>
        <ProfileRow icon="star" iconBg={T.orangeDim} iconColor={T.orange} label="Appearance" value={themeLabel} onClick={props.onViewAppearance} />
        <ProfileRow icon="book" iconBg={T.orangeDim} iconColor={T.orange} label="Language" value={langLabel} onClick={props.onViewLanguage} last />
      </ProfileSection>

      {/* ── Travel ── */}
      <ProfileSection icon="plane" title="Travel" bg={T.orangeDim} color={T.orange} glow={T.orangeGlow}>
        <ProfileRow icon="plane" iconBg={T.orangeDim} iconColor={T.orange} label="Trip History" value={(props.trips || []).filter(function(t) { return t.ended; }).length + " ended"} onClick={props.onViewTripHistory} last />
      </ProfileSection>

      {/* ── Account ── */}
      <ProfileSection icon="user" title="Account" bg={T.blueDim} color={T.blue} glow={T.blueGlow}>
        <ProfileRow icon="edit" iconBg={T.blueDim} iconColor={T.blue} label="Your Name" value={props.user} onClick={props.onViewNickname} />
        <ProfileRow icon="home" iconBg={T.blueDim} iconColor={T.blue} label="Collab" value={props.householdName || (props.inviteCount ? props.inviteCount + " invite" + (props.inviteCount === 1 ? "" : "s") : "Off")} onClick={props.onViewCollab} />
        <ProfileRow icon="shield" iconBg={T.blueDim} iconColor={T.blue} label="Privacy & Data" onClick={props.onViewPrivacy} last />
      </ProfileSection>

      <button onClick={props.onLogout}
        style={{ width: "100%", background: "rgba(224,48,48,0.08)", color: T.red, border: "1px solid rgba(224,48,48,0.14)", borderRadius: 16, padding: "15px 0", fontSize: 16, fontFamily: UI, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
        Sign out
      </button>
    </div>
  );
}

var TABS = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "budgets", label: "Budgets" },
  { id: "goals", label: "Goals" },
  { id: "advisor", label: "Advisor" },
];

var HAS_FAB = ["activity", "goals", "budgets", "categories", "notes"];

export default function App() {
  var _user = useState(null);
  var user = _user[0]; var setUser = _user[1];
  var _tab = useState("overview");
  var tab = _tab[0]; var setTab = _tab[1];
  var _tx = useState([]);
  var tx = _tx[0]; var setTx = _tx[1];
  var _bud = useState([]);
  var budgets = _bud[0]; var setBudgets = _bud[1];
  var _gls = useState([]);
  var goals = _gls[0]; var setGoals = _gls[1];
  var _trp = useState([]);
  var trips = _trp[0]; var setTrips = _trp[1];
  var _sav = useState([]);
  var savings = _sav[0]; var setSavings = _sav[1];
  var _biz = useState([]);
  var businesses = _biz[0]; var setBusinesses = _biz[1];
  var _otr = useState(null);
  var openTrip = _otr[0]; var setOpenTrip = _otr[1];
  var _obz = useState(null);
  var openBiz = _obz[0]; var setOpenBiz = _obz[1];
  var _nts = useState([]);
  var notes = _nts[0]; var setNotes = _nts[1];
  var _fld = useState([]);
  var folders = _fld[0]; var setFolders = _fld[1];
  var _cat = useState([]);
  var categories = _cat[0]; var setCategories = _cat[1];
  var _sh = useState(false);
  var sheet = _sh[0]; var setSheet = _sh[1];
  var _cur = useState("$");
  var currency = _cur[0]; var setCurrency = _cur[1];
  var _ak = useState(null);
  var accountKey = _ak[0]; var setAccountKey = _ak[1];
  var _od = useState(false);
  var onboardingDone = _od[0]; var setOnboardingDone = _od[1];
  var _cud = useState(false);
  var catchUpDone = _cud[0]; var setCatchUpDone = _cud[1];
  var _rp = useState("");
  var richPlan = _rp[0]; var setRichPlan = _rp[1];
  var _ri = useState("");
  var richardInstructions = _ri[0]; var setRichardInstructions = _ri[1];
  var _rn2 = useState("");
  var richardNotes = _rn2[0]; var setRichardNotes = _rn2[1];
  var _ud = useState("");
  var userDob = _ud[0]; var setUserDob = _ud[1];
  var _pjc = useState(false);
  var planJustCreated = _pjc[0]; var setPlanJustCreated = _pjc[1];
  var _lg = useState("en");
  var lang = _lg[0]; var setLang = _lg[1];
  var _th = useState(function() { return lastLook().theme; });
  var theme = _th[0]; var setTheme = _th[1];
  var _dm = useState(function() { return lastLook().dark; });
  var darkMode = _dm[0]; var setDarkMode = _dm[1];
  var _ack = useState(false);
  var authChecked = _ack[0]; var setAuthChecked = _ack[1];
  // Cached "Analyze your month" result: { data, sig }. Persisted in the user blob
  // and tagged with a transaction signature so it survives leaving the advisor
  // tab (and reloads), but is discarded once the user logs a new transaction.
  var _ma = useState(null);
  var monthAnalysis = _ma[0]; var setMonthAnalysis = _ma[1];
  var _oda = useState({});
  var onboardingData = _oda[0]; var setOnboardingData = _oda[1];
  var _em = useState("manual");
  var entryMethod = _em[0]; var setEntryMethod = _em[1];
  // Found Money: only the user's DECISIONS persist (the running tally, dismissed
  // finding ids, and a log of acted items). Findings themselves are recomputed
  // from tx each session by findMoney().
  var _fm = useState({ tally: 0, dismissed: [], acted: [] });
  var foundMoney = _fm[0]; var setFoundMoney = _fm[1];
  // Big-Decision CFO: tracked decisions [{id, question, verdict, createdDate, status}].
  var _dec = useState([]);
  var decisions = _dec[0]; var setDecisions = _dec[1];
  // Archived Richard chats: [{id, date, title, messages:[{role,text}]}]. The live
  // chat lives inside Advisor; it's archived here when the user starts a new one.
  var _rc = useState([]);
  var richardChats = _rc[0]; var setRichardChats = _rc[1];
  // Collab / couples mode. householdId points at the shared households/{hid} doc;
  // household is the live mirror of it (members + invites); sharedData is the
  // live mirror of shared budgets/goals/categories/tx for efficient delta-sync.
  var _hid = useState(null); var householdId = _hid[0]; var setHouseholdId = _hid[1];
  var _hh = useState(null); var household = _hh[0]; var setHousehold = _hh[1];
  var _shd = useState(null); var sharedData = _shd[0]; var setSharedData = _shd[1];
  var _inv = useState([]); var invites = _inv[0]; var setInvites = _inv[1];
  // In-memory mirror of the signed-in user's full Firestore document, so writes
  // can merge against it without an async read-before-write each time.
  var blobRef = useRef({});
  var saveTimerRef = useRef(null);
  var prevTabRef = useRef("profile");
  var _hp = useState(false); var hasPw = _hp[0]; var setHasPw = _hp[1];

  // When in a household, merge shared data (budgets, goals, categories, shared txs)
  // with personal data (all txs, notes, trips, folders). Personal txs tagged
  // private=true stay only in the user doc.
  function loadData(data, sharedData) {
    var allBudgets = (sharedData && sharedData.budgets) || [];
    var allGoals = (sharedData && sharedData.goals) || [];
    var allCategories = (sharedData && sharedData.categories) || [];
    var allTx = (sharedData && sharedData.tx) || [];
    // Merge personal txs (including private ones) on top of shared txs.
    allTx = allTx.concat((data.tx || []).filter(function(t) { return !t.shared; }));
    setTx(allTx);
    setBudgets(allBudgets.length ? allBudgets : (data.budgets || []));
    setGoals(allGoals.length ? allGoals : (data.goals || []));
    setTrips(data.trips || []);
    // Savings pots are always personal - they live in the user doc, never the
    // shared household doc (an emergency fund isn't joint money).
    setSavings(data.savings || []);
    // Business accounts are personal too (separated business money + plan).
    setBusinesses(data.businesses || []);
    setNotes(data.notes || []);
    setFoundMoney(data.foundMoney || { tally: 0, dismissed: [], acted: [] });
    setDecisions(data.decisions || []);
    setRichardChats(data.richardChats || []);
    setFolders((data.folders && data.folders.length) ? data.folders : freshFolders());
    setCategories(allCategories.length ? allCategories : ((data.categories && data.categories.length) ? data.categories : freshCategories()));
    var sym = data.currency || "$";
    setCurrency(sym);
    _currency.sym = sym;
    setOnboardingDone(data.onboardingDone === true);
    // Show the mid-month catch-up once, to brand-new accounts only. Treat it as
    // done if flagged, or if the account already has real activity (any tx that
    // isn't the opening balance) - so existing users never see it.
    var hasRealActivity = (data.tx || []).some(function(t) { return !t.opening; });
    setCatchUpDone(data.catchUpDone === true || hasRealActivity);
    setRichPlan(data.plan || "");
    setRichardInstructions(data.richardInstructions || "");
    setRichardNotes(data.richardNotes || "");
    setOnboardingData(data.onboardingData || {});
    setMonthAnalysis(data.monthAnalysis || null);
    setEntryMethod(data.entryMethod === "import" ? "import" : "manual");
    setHouseholdId(data.householdId || null);
    setUserDob(data.dob || "");
    _lang.code = data.lang || "en"; setLang(data.lang || "en");
    var th = data.theme || "purple"; applyTheme(th); setTheme(th);
    var dm = !!data.darkMode; applyDarkMode(dm); setDarkMode(dm);
    rememberLook(th, dm);
  }

  useEffect(function() {
    if (tab !== "overview") setPlanJustCreated(false);
  }, [tab]);

  // Build the starting document for a brand-new account (e.g. first Google sign-in).
  function defaultBlob(name, email) {
    return { tx: [], budgets: [], goals: [], trips: [], savings: [], businesses: [], notes: [], folders: freshFolders(), categories: freshCategories(), displayName: name, email: email, theme: "purple" };
  }

  // Firebase Auth is the single source of truth for the session. It restores the
  // signed-in user on reload and fires whenever they sign in or out.
  useEffect(function() {
    if (!cloudReady()) { setAuthChecked(true); return function () {}; }
    var unsub = CLOUD.onAuth(function(fbUser) {
      // Signed out, or email signup (which builds its own doc): reveal the UI now.
      if (!fbUser) { setAuthChecked(true); return; }       // -> AuthScreen shows
      if (window.__cbSignup) { setAuthChecked(true); return; }
      // A session exists. Keep showing the loading screen (NOT the AuthScreen)
      // until the user's data + theme are loaded, so we never flash "sign in"
      // or the default light theme to an already-signed-in user.
      CLOUD.loadUser(fbUser.uid).then(function(data) {
        if (!data) {
          var nm = fbUser.displayName || (fbUser.email ? fbUser.email.split("@")[0] : "there");
          data = defaultBlob(nm, fbUser.email || "");
          CLOUD.saveUser(fbUser.uid, data);
        }
        blobRef.current = data;
        // If user is in a household, load and merge shared data.
        if (data.householdId) {
          CLOUD.loadHousehold(data.householdId).then(function(hh) {
            loadData(data, hh);
          }).catch(function() { loadData(data); });
        } else {
          loadData(data);
        }
        setUser(data.displayName || fbUser.email || "there");
        setAccountKey(fbUser.uid);
        var _pd = fbUser.providerData || [];
        var _hasPwProv = false;
        for (var _pi = 0; _pi < _pd.length; _pi++) {
          if (_pd[_pi].providerId === "password") { _hasPwProv = true; break; }
        }
        setHasPw(_hasPwProv);
        setAuthChecked(true);
      }).catch(function() { setAuthChecked(true); });
    });
    return function() { if (typeof unsub === "function") unsub(); };
  }, []);

  // Single subscription for all household live updates: members, invites, and
  // shared data (budgets, goals, categories, tx). Two separate subscriptions
  // were causing double Firestore reads and double re-renders on every snapshot.
  useEffect(function() {
    if (!cloudReady() || !householdId) { setHousehold(null); setSharedData(null); return function() {}; }
    var unsub = CLOUD.subscribeHousehold(householdId, function(hh) {
      setHousehold(hh);
      if (!hh) { setSharedData(null); return; }
      // Membership check: if we were removed, drop the link.
      if (accountKey && hh.memberUids && hh.memberUids.indexOf(accountKey) === -1) {
        setHouseholdId(null);
        save({ householdId: null });
        return;
      }
      // Live-sync shared data.
      setSharedData({ budgets: hh.budgets || [], goals: hh.goals || [], categories: hh.categories || [], tx: hh.tx || [] });
      setBudgets(hh.budgets || []);
      setGoals(hh.goals || []);
      setCategories(hh.categories || []);
      var personalTx = tx.filter(function(t) { return !t.shared; });
      setTx((hh.tx || []).concat(personalTx));
    });
    return function() { if (typeof unsub === "function") unsub(); };
  }, [householdId, accountKey]);

  // Look for pending invitations addressed to this user's email once signed in.
  useEffect(function() {
    if (!cloudReady() || !accountKey || householdId) { setInvites([]); return; }
    var email = myEmail();
    if (!email) { setInvites([]); return; }
    CLOUD.findInvites(email).then(function(list) { setInvites(list || []); }).catch(function() {});
  }, [accountKey, householdId]);

  function myEmail() {
    var cu = cloudReady() ? _auth().currentUser : null;
    return ((cu && cu.email) || (blobRef.current && blobRef.current.email) || "").toLowerCase();
  }
  function meAsMember() {
    return { uid: accountKey, name: user || "", email: myEmail() };
  }

  function onCreateHousehold(name) {
    if (!accountKey) return Promise.resolve();
    return CLOUD.createHousehold(meAsMember(), name).then(function(hid) {
      setHouseholdId(hid);
      save({ householdId: hid });
      return hid;
    });
  }
  function onInviteMember(email) {
    if (!householdId || !email) return Promise.resolve();
    return CLOUD.inviteToHousehold(householdId, email);
  }
  function onCancelInvite(email) {
    if (!householdId) return Promise.resolve();
    return CLOUD.cancelInvite(householdId, email);
  }
  function onAcceptInvite(hid) {
    if (!hid) return Promise.resolve();
    return CLOUD.acceptInvite(hid, meAsMember()).then(function() {
      setHouseholdId(hid);
      setInvites([]);
      save({ householdId: hid });
    });
  }
  function onLeaveHousehold() {
    if (!householdId) return Promise.resolve();
    // Pass the exact member object from the loaded doc so arrayRemove matches.
    var mine = null;
    if (household && household.members) {
      mine = household.members.filter(function(m) { return m.uid === accountKey; })[0];
    }
    var leaving = householdId;
    setHouseholdId(null); setHousehold(null);
    save({ householdId: null });
    return CLOUD.leaveHousehold(leaving, mine || meAsMember());
  }

  function handleLogin(displayName, data, key) {
    blobRef.current = data || {};
    loadData(data || {});
    setUser(displayName);
    setAccountKey(key || displayName);
    setHasPw(true);
  }

  function handleLogout() {
    CLOUD.signOut();
    blobRef.current = {};
    setUser(null); setAccountKey(null); setTab("overview");
    setHouseholdId(null); setHousehold(null); setInvites([]);
    setTx([]); setBudgets([]); setGoals([]); setTrips([]); setSavings([]); setBusinesses([]); setNotes([]); setFolders([]); setCategories([]); setFoundMoney({ tally: 0, dismissed: [], acted: [] }); setDecisions([]);
    _lang.code = "en"; setOnboardingDone(false); setCatchUpDone(false); setRichPlan(""); setUserDob(""); setPlanJustCreated(false); setLang("en"); applyTheme("purple"); setTheme("purple");
  }

  function save(next) {
    if (!accountKey) return;
    var existing = blobRef.current || {};
    var blob = {};
    for (var ek in existing) blob[ek] = existing[ek];
    blob.tx = tx; blob.budgets = budgets; blob.goals = goals; blob.trips = trips; blob.savings = savings; blob.businesses = businesses; blob.notes = notes; blob.folders = folders; blob.categories = categories; blob.currency = currency; blob.lang = lang; blob.theme = theme; blob.foundMoney = foundMoney; blob.decisions = decisions; blob.monthAnalysis = monthAnalysis;
    for (var k in next) blob[k] = next[k];
    blobRef.current = blob;
    // Debounce Firestore writes: coalesce rapid successive saves (e.g. typing)
    // into a single write 800ms after the last call. The blob is captured by
    // reference (blobRef) so the final write always has the latest data.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(function() {
      saveTimerRef.current = null;
      CLOUD.saveUser(accountKey, blobRef.current);
      if (householdId && household) {
        var sharedTx = blobRef.current.tx ? blobRef.current.tx.filter(function(t) { return t.shared; }) : [];
        CLOUD.saveHousehold(householdId, { budgets: blobRef.current.budgets, goals: blobRef.current.goals, categories: blobRef.current.categories, tx: sharedTx });
      }
    }, 800);
  }

  // Signature of the current transactions; any add/remove changes it, which is
  // how the cached month analysis knows to invalidate itself (see render below).
  function txSignature() { return tx.length + ":" + ((tx[tx.length - 1] || {}).id || ""); }
  function onSaveAnalysis(next) {
    var rec = next ? { data: next, sig: txSignature() } : null;
    setMonthAnalysis(rec); save({ monthAnalysis: rec });
  }

  function onSaveTx(next) { setTx(next); save({ tx: next }); }
  function onSaveBudgets(next) { setBudgets(next); save({ budgets: next }); }
  function onSaveGoals(next) { setGoals(next); save({ goals: next }); }
  function onSaveFoundMoney(next) { setFoundMoney(next); save({ foundMoney: next }); }
  function onSaveDecisions(next) { setDecisions(next); save({ decisions: next }); }
  function onSaveChats(next) { setRichardChats(next); save({ richardChats: next }); }
  function onSaveNotes(next) { setNotes(next); save({ notes: next }); }
  function onSettleNote(nextTx, nextNotes) { setTx(nextTx); setNotes(nextNotes); save({ tx: nextTx, notes: nextNotes }); }
  function onSaveTrips(next) { setTrips(next); save({ trips: next }); }
  // Atomic two-array write (mirrors onSettleNote) so reserving a trip can't clobber tx.
  function onTripReserve(nextTx, nextTrips) { setTx(nextTx); setTrips(nextTrips); save({ tx: nextTx, trips: nextTrips }); }
  // Savings: pot-only moves (external deposits, withdrawals out, rename, close with
  // zero balance) write savings alone. Transfers that touch the main balance write
  // both arrays atomically so the offsetting tx and the pot entry can't desync.
  function onSaveSavings(next) { setSavings(next); save({ savings: next }); }
  function onSavingsMove(nextTx, nextSavings) { setTx(nextTx); setSavings(nextSavings); save({ tx: nextTx, savings: nextSavings }); }
  // Business accounts mirror savings: pot-only writes (plan edits, expenses,
  // revenue, budget tweaks) go through onSaveBusinesses; capital that moves
  // to/from the main balance writes both arrays atomically via onBusinessMove.
  function onSaveBusinesses(next) { setBusinesses(next); save({ businesses: next }); }
  function onBusinessMove(nextTx, nextBusinesses) { setTx(nextTx); setBusinesses(nextBusinesses); save({ tx: nextTx, businesses: nextBusinesses }); }

  // Reminder scheduling. Timers don't survive reload, so we re-derive them from
  // each note's durable `reminder.due` whenever notes change, firing any that are
  // already overdue (a catch-up when the app reopens). Marking a reminder fired
  // persists notes only (reading the freshest blob) so it can't clobber other
  // arrays that may have changed since this render.
  var notesRef = useRef(notes);
  notesRef.current = notes;
  function persistNotesOnly(nextNotes) {
    setNotes(nextNotes);
    if (!accountKey) return;
    var existing = blobRef.current || {};
    var blob = {};
    for (var k in existing) blob[k] = existing[k];
    blob.notes = nextNotes;
    blobRef.current = blob;
    CLOUD.saveUser(accountKey, blob);
  }
  // Fire one or more due reminders and mark them all fired in a SINGLE state
  // update, computed from the freshest notes. Doing all due notes in one pass
  // avoids the stale-ref clobber (and duplicate fire) that per-note updates cause
  // when several reminders come due at once (e.g. a catch-up after the app reopens).
  function fireDue(ids) {
    var want = {};
    for (var a = 0; a < ids.length; a++) { want[ids[a]] = true; }
    var cur = notesRef.current;
    var fired = false;
    var next = cur.map(function(n) {
      if (want[n.id] && n.reminder && !n.reminder.fired) {
        fireReminder(n);
        fired = true;
        var nn = {}; for (var k in n) nn[k] = n[k];
        nn.reminder = { due: n.reminder.due, fired: true };
        return nn;
      }
      return n;
    });
    if (fired) { persistNotesOnly(next); }
  }
  // Screen-transition animation state
  var _animKey = useState(0); var animKey = _animKey[0]; var setAnimKey = _animKey[1];
  var _animDir = useState("fade"); var animDir = _animDir[0]; var setAnimDir = _animDir[1];
  var prevAnimTabRef = useRef("overview");

  // Inject nav-transition keyframes once on mount
  useEffect(function() {
    var id = "richy-nav-css";
    if (document.getElementById(id)) return;
    var st = document.createElement("style"); st.id = id;
    st.textContent = [
      "button,a,[role=button]{-webkit-tap-highlight-color:transparent;outline:none;}",
      "@keyframes navFade{from{opacity:0}to{opacity:1}}",
      "@keyframes navSlideRight{from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:none}}",
      "@keyframes navSlideLeft{from{opacity:0;transform:translateX(-22px)}to{opacity:1;transform:none}}",
      "@keyframes sheetSlideUp{from{opacity:0;transform:translateX(-50%) translateY(56px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}",
      "@keyframes sheetSlideDown{from{opacity:1;transform:translateX(-50%) translateY(0)}to{opacity:0;transform:translateX(-50%) translateY(56px)}}",
      "@keyframes overlayFadeIn{from{opacity:0}to{opacity:1}}",
      "@keyframes overlayFadeOut{from{opacity:1}to{opacity:0}}",
    ].join("");
    document.head.appendChild(st);
  }, []);

  // Compute slide direction whenever the active tab changes
  var MAIN_TABS_SET = { overview: 1, activity: 1, budgets: 1, goals: 1, advisor: 1 };
  useEffect(function() {
    var prev = prevAnimTabRef.current;
    var curr = tab;
    var dir = MAIN_TABS_SET[curr]
      ? (MAIN_TABS_SET[prev] ? "fade" : "left")
      : "right";
    setAnimDir(dir);
    setAnimKey(function(k) { return k + 1; });
    prevAnimTabRef.current = curr;
  }, [tab]);

  var remTimers = useRef({});
  useEffect(function() {
    for (var old in remTimers.current) { clearTimeout(remTimers.current[old]); }
    remTimers.current = {};
    var now = Date.now();
    var dueNow = [];
    notes.forEach(function(n) {
      if (!n.reminder || n.reminder.fired) return;
      var delay = n.reminder.due - now;
      if (delay <= 0) { dueNow.push(n.id); return; }
      if (delay < 2147483647) {
        (function(id) {
          remTimers.current[id] = setTimeout(function() { fireDue([id]); }, delay);
        })(n.id);
      }
    });
    if (dueNow.length) { fireDue(dueNow); }
    return function() { for (var k in remTimers.current) { clearTimeout(remTimers.current[k]); } };
  }, [notes]);

  // Weekly CFO reviews: on app open, run Richard's review for up to two due
  // businesses (the client-side stand-in for a weekly cron). Results apply
  // through a fresh-state ref so a slow reply can't clobber newer edits, and
  // a notification fires only if permission was already granted elsewhere.
  var businessesRef = useRef(businesses);
  businessesRef.current = businesses;
  var bizReviewRan = useRef(false);
  useEffect(function() {
    if (bizReviewRan.current || !accountKey || !businesses.length) return;
    bizReviewRan.current = true;
    var due = businesses.filter(reviewDue).slice(0, 2);
    if (!due.length) return;
    function runNext(idx) {
      if (idx >= due.length) return;
      var target = due[idx];
      runWeeklyReview(target, richardCtx, lang, function(review) {
        var next = businessesRef.current.map(function(b) {
          if (b.id !== target.id) return b;
          var n = {}; for (var k in b) n[k] = b[k];
          n.reviews = [review].concat(b.reviews || []).slice(0, 8);
          return n;
        });
        onSaveBusinesses(next);
        fireBizNotification("Richy - " + (target.name || "Business"), review.headline, "biz-review-" + target.id);
        runNext(idx + 1);
      });
    }
    runNext(0);
  }, [businesses, accountKey]);

  function onSaveFolders(next) { setFolders(next); save({ folders: next }); }
  function onSaveCategories(next) { setCategories(next); save({ categories: next }); }
  function onSaveCurrency(sym) { _currency.sym = sym; setCurrency(sym); save({ currency: sym }); }
  function onSaveLang(code) {
    _lang.code = code;
    setLang(code);
    save({ lang: code });
    if (richPlan) {
      var langName = (LANGUAGE_OPTIONS.filter(function(o) { return o.code === code; })[0] || {}).label || code;
      callClaude(
        [{ role: "user", content: "Translate this financial plan to " + langName + ". Keep the same warm tone, structure, and personal advice. Output only the translated plan, nothing else:\n\n" + richPlan }],
        "You are Richard, a personal finance advisor. Translate the given financial plan faithfully to the requested language. Preserve the warm, direct, personal tone.",
        400,
        function(err, translated) { if (!err && translated) { setRichPlan(translated); save({ plan: translated }); } }
      );
    }
  }
  function onSaveTheme(name) { applyTheme(name); applyDarkMode(darkMode); setTheme(name); rememberLook(name, darkMode); save({ theme: name }); }
  function onSaveDarkMode(dm) { applyDarkMode(dm); setDarkMode(dm); rememberLook(theme, dm); save({ darkMode: dm }); }
  function onSaveNickname(name) { setUser(name); save({ displayName: name }); }
  function onSaveDob(dob) { setUserDob(dob); save({ dob: dob }); }
  function onSaveEmail(email) { save({ email: email }); }
  function onSaveFinancial(oData) { save({ onboardingData: oData }); }
  function onSaveEntryMethod(m) { var v = m === "import" ? "import" : "manual"; setEntryMethod(v); save({ entryMethod: v }); }
  function onSaveInstructions(text) { setRichardInstructions(text); save({ richardInstructions: text }); }

  // What Richard sees as user-provided context: the editable custom instructions
  // plus the free-form "Notes for Richard" the user wrote at signup. Both flow
  // into every Richard prompt via the richardInstructions prop; the instructions
  // editor stays bound to the raw instructions only.
  var richardCtx = [
    (richardInstructions && richardInstructions.trim()) ? richardInstructions.trim() : "",
    (richardNotes && richardNotes.trim()) ? ("ABOUT THE USER (background they shared when signing up):\n" + richardNotes.trim()) : ""
  ].filter(Boolean).join("\n\n");

  function handleOnboardingComplete(plan, oData, suggestedBudgets, chosenEntryMethod) {
    setRichPlan(plan);
    setOnboardingDone(true);
    setPlanJustCreated(true);
    var current = blobRef.current || {};
    var merged = {};
    for (var k in current) merged[k] = current[k];
    merged.onboardingDone = true;
    var em = chosenEntryMethod === "import" ? "import" : "manual";
    merged.entryMethod = em;
    setEntryMethod(em);
    merged.plan = plan;
    merged.onboardingData = oData;
    setOnboardingData(oData);
    if (suggestedBudgets && suggestedBudgets.length) {
      setBudgets(suggestedBudgets);
      merged.budgets = suggestedBudgets;
    }
    // Money the user already had (the "current savings" they entered) goes into a
    // separate Emergency Fund pot, NOT their spending balance - so an existing
    // emergency fund is never forced onto the main balance. It counts toward net
    // worth from day one but leaves the balance clean.
    var savAmt = parseFloat(oData && oData.savings);
    if (savAmt > 0 && !(savings && savings.length)) {
      var sToday = new Date().toISOString().slice(0, 10);
      var ef = { id: "sav_" + Date.now(), name: tr("emergencyFund"), color: "#27A85F", icon: "shield", createdAt: sToday, entries: [{ id: Date.now() + 1, kind: "deposit", amount: round2(savAmt), date: sToday, fromMain: false, label: tr("externalMoney") }] };
      setSavings([ef]);
      merged.savings = [ef];
    }
    blobRef.current = merged;
    CLOUD.saveUser(accountKey, merged);
  }

  // The mid-month catch-up step. Appends the user's already-spent transactions
  // (dated this month) so budgets start real, then marks the step done.
  function handleCatchUpComplete(newTxs) {
    var merged = (newTxs && newTxs.length) ? tx.concat(newTxs) : tx;
    setTx(merged);
    setCatchUpDone(true);
    save({ tx: merged, catchUpDone: true });
  }

  // Re-run the "log this month" flow on demand from Profile.
  function handleLogMonth(newTxs) {
    if (!newTxs || !newTxs.length) return;
    var merged = tx.concat(newTxs);
    setTx(merged);
    save({ tx: merged });
  }

  // Update the opening balance from Profile.
  function handleEditOpeningBalance(updatedTx) {
    setTx(updatedTx);
    save({ tx: updatedTx });
  }

  if (cloudReady() && !authChecked) {
    return <BootSplash />;
  }

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  if (!onboardingDone) {
    return <OnboardingScreen username={user} dob={userDob} lang={lang} onComplete={handleOnboardingComplete} />;
  }

  if (!catchUpDone) {
    return <CatchUpScreen username={user} categories={categories} onComplete={handleCatchUpComplete} />;
  }

  function handleRetakePlan() {
    setOnboardingDone(false);
    setPlanJustCreated(false);
    var current = blobRef.current || {};
    var merged = {};
    for (var k in current) merged[k] = current[k];
    merged.onboardingDone = false;
    blobRef.current = merged;
    CLOUD.saveUser(accountKey, merged);
  }

  var currentTab = tab;
  applyTheme(theme);      // keep the live T palette in sync with the chosen design every render
  applyDarkMode(darkMode); // re-apply dark/light mode tokens on every render so T stays consistent
  var _localeMap = { en: "en-US", he: "he-IL", es: "es-ES", fr: "fr-FR", ar: "ar-SA", ru: "ru-RU", de: "de-DE", pt: "pt-BR" };
  var _locale = _localeMap[lang] || "en-US";
  var monthLabel = new Date().toLocaleString(_locale, { month: "short" }) + " " + new Date().getFullYear();

  return (
    <div style={{ background: T.bg, minHeight: "100vh", maxWidth: 430, margin: "0 auto", fontFamily: UI, paddingBottom: "calc(110px + env(safe-area-inset-bottom, 0px))" }}>

      <div style={{ position: "sticky", top: 0, zIndex: 40, background: T.navBg, backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderBottom: "0.5px solid " + T.sep, boxShadow: "inset 0 1px 0 " + T.glassSpec + ", " + T.glassLiftDown }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 20px 14px" }}>
          <div style={{ width: 86, display: "flex", alignItems: "center" }}>
            <div style={{ background: T.orangeDim, borderRadius: 40, padding: "7px 14px", fontSize: 13, fontWeight: 600, color: T.orange, letterSpacing: "0.01em" }}>{monthLabel}</div>
          </div>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 700, color: T.ink, textAlign: "center", letterSpacing: "-0.02em" }}>
            {currentTab === "privacy" ? "Privacy & Data" : currentTab === "password" ? "Password" : currentTab === "editEmail" ? "Email" : currentTab === "editDob" ? "Date of Birth" : currentTab === "editFinancial" ? "Financial Profile" : currentTab === "business" ? "Business" : currentTab === "collab" ? "Collab" : currentTab === "entryMethod" ? "Adding transactions" : currentTab === "editOpeningBalance" ? "Opening balance" : currentTab === "logMonth" ? "Log this month" : currentTab === "tripHistory" ? "Trip History" : tr(currentTab === "plan" ? "yourPlan" : currentTab === "nickname" ? "name" : currentTab === "notes" ? "notes" : currentTab)}
          </span>
          <div style={{ width: 86, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            {HAS_FAB.indexOf(currentTab) !== -1 && (
              <button onClick={function() { setSheet(function(v) { return !v; }); }}
                style={{ background: sheet ? T.ink : "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", border: "none", borderRadius: 40, width: 36, height: 36, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: sheet ? "none" : "0 4px 12px " + T.orangeGlow, transition: "all 0.2s" }}>
                <SVGIcon id="plus" size={16} color="#fff" />
              </button>
            )}
            <button onClick={function() { setTab("profile"); }}
              style={{ border: "none", cursor: "pointer", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: tab === "profile" ? T.orange : "rgba(0,0,0,0.06)" }}>
              <SVGIcon id="user" size={16} color={tab === "profile" ? "#fff" : T.ink2} />
            </button>
          </div>
        </div>
      </div>

      <div key={animKey} style={{ padding: "8px 16px 16px", animation: animDir === "right" ? "navSlideRight 0.28s cubic-bezier(0.22,1,0.36,1) both" : animDir === "left" ? "navSlideLeft 0.28s cubic-bezier(0.22,1,0.36,1) both" : "navFade 0.20s ease both" }}>
        {currentTab === "overview" && <Overview tx={tx} goals={goals} budgets={budgets} categories={categories} savings={savings} businesses={businesses} trips={trips} username={user} plan={planJustCreated ? richPlan : ""} foundMoney={foundMoney} onSaveFoundMoney={onSaveFoundMoney} richardInstructions={richardCtx} lang={lang} onCategories={function() { setTab("categories"); setSheet(false); }} onOpenSavings={function() { prevTabRef.current = "overview"; setTab("savings"); setSheet(false); }} onOpenBusiness={function(id) { prevTabRef.current = "overview"; setOpenBiz(id || null); setTab("business"); setSheet(false); }} onOpenTrip={function(id) { prevTabRef.current = "overview"; setOpenTrip(id); setTab("trips"); setSheet(false); }} />}
        {currentTab === "activity" && <Activity tx={tx} categories={categories} onSaveTx={onSaveTx} entryMethod={entryMethod} sheetOpen={sheet} setSheetOpen={setSheet} accountKey={accountKey} householdId={householdId} household={household} onManageCategories={function() { setTab("categories"); setSheet(false); }} onOpenNotes={function() { setTab("notes"); setSheet(false); }} savings={savings} onSavingsMove={onSavingsMove} />}
        {currentTab === "notes" && <Notes notes={notes} tx={tx} categories={categories} onSaveNotes={onSaveNotes} onSaveTx={onSaveTx} onSettleNote={onSettleNote} sheetOpen={sheet} setSheetOpen={setSheet} onBack={function() { setTab("activity"); setSheet(false); }} onManageCategories={function() { setTab("categories"); setSheet(false); }} />}
        {currentTab === "budgets" && <Budgets tx={tx} budgets={budgets} categories={categories} onSaveBudgets={onSaveBudgets} sheetOpen={sheet} setSheetOpen={setSheet} onManageCategories={function() { setTab("categories"); setSheet(false); }} />}
        {currentTab === "goals" && <Goals goals={goals} trips={trips} onSaveGoals={onSaveGoals} sheetOpen={sheet} setSheetOpen={setSheet} onPlanTrip={function() { prevTabRef.current = "goals"; setOpenTrip(null); setTab("trips"); setSheet(false); }} onOpenTrip={function(id) { prevTabRef.current = "goals"; setOpenTrip(id); setTab("trips"); setSheet(false); }} />}
        {currentTab === "trips" && <Trips trips={trips} tx={tx} categories={categories} openTripId={openTrip} onSaveTrips={onSaveTrips} onTripReserve={onTripReserve} onBack={function() { setTab(prevTabRef.current === "tripHistory" || prevTabRef.current === "overview" ? prevTabRef.current : "goals"); }} sheetOpen={sheet} setSheetOpen={setSheet} />}
        {currentTab === "tripHistory" && <TripHistoryView trips={trips} onOpenTrip={function(id) { prevTabRef.current = "tripHistory"; setOpenTrip(id); setTab("trips"); }} onBack={function() { setTab("profile"); }} />}
        {currentTab === "categories" && <Categories tx={tx} categories={categories} folders={folders} onSaveCategories={onSaveCategories} onSaveFolders={onSaveFolders} sheetOpen={sheet} setSheetOpen={setSheet} />}
        {currentTab === "advisor" && <Advisor tx={tx} budgets={budgets} goals={goals} categories={categories} savings={savings} businesses={businesses} username={user} plan={richPlan} lang={lang} richardInstructions={richardCtx} onboardingData={onboardingData} onSaveBudgets={onSaveBudgets} onSaveGoals={onSaveGoals} onSaveTx={onSaveTx} decisions={decisions} onSaveDecisions={onSaveDecisions} chats={richardChats} onSaveChats={onSaveChats} cachedAnalysis={(monthAnalysis && monthAnalysis.sig === txSignature()) ? monthAnalysis.data : null} onSaveAnalysis={onSaveAnalysis} />}
        {currentTab === "profile" && <Profile user={user} onLogout={handleLogout} currency={currency} lang={lang} theme={theme} entryMethod={entryMethod} richardInstructions={richardInstructions} onViewPlan={function() { setTab("plan"); }} onViewInstructions={function() { prevTabRef.current = "profile"; setTab("instructions"); }} onViewCurrency={function() { prevTabRef.current = "profile"; setTab("currency"); }} onViewLanguage={function() { prevTabRef.current = "profile"; setTab("language"); }} onViewNickname={function() { prevTabRef.current = "profile"; setTab("nickname"); }} onViewAppearance={function() { prevTabRef.current = "profile"; setTab("appearance"); }} onViewEntryMethod={function() { prevTabRef.current = "profile"; setTab("entryMethod"); }} onViewLogMonth={function() { prevTabRef.current = "profile"; setTab("logMonth"); }} onViewEditOpeningBalance={function() { prevTabRef.current = "profile"; setTab("editOpeningBalance"); }} householdName={household ? household.name : null} inviteCount={invites.length} onViewCollab={function() { prevTabRef.current = "profile"; setTab("collab"); }} onViewPrivacy={function() { setTab("privacy"); }} trips={trips} onViewTripHistory={function() { setTab("tripHistory"); }} />}
        {currentTab === "privacy" && <PrivacyView blob={blobRef.current} hasPw={hasPw} onBack={function() { setTab("profile"); }} onViewPassword={function() { setTab("password"); }} onEditEmail={function() { setTab("editEmail"); }} onEditName={function() { prevTabRef.current = "privacy"; setTab("nickname"); }} onEditDob={function() { setTab("editDob"); }} onEditLanguage={function() { prevTabRef.current = "privacy"; setTab("language"); }} onEditCurrency={function() { prevTabRef.current = "privacy"; setTab("currency"); }} onEditTheme={function() { prevTabRef.current = "privacy"; setTab("appearance"); }} onEditFinancial={function() { setTab("editFinancial"); }} />}
        {currentTab === "password" && <PasswordView email={blobRef.current.email || ""} hasPw={hasPw} onBack={function() { setTab("privacy"); }} onDone={function(wasAdded) { if (wasAdded) setHasPw(true); setTab("privacy"); }} />}
        {currentTab === "editEmail" && <EditEmailView currentEmail={blobRef.current.email || ""} hasPw={hasPw} onBack={function() { setTab("privacy"); }} onSave={function(email) { onSaveEmail(email); setTab("privacy"); }} />}
        {currentTab === "editDob" && <EditDobView currentDob={userDob} onBack={function() { setTab("privacy"); }} onSave={function(dob) { onSaveDob(dob); setTab("privacy"); }} />}
        {currentTab === "editFinancial" && <EditFinancialView oData={blobRef.current.onboardingData || {}} onBack={function() { setTab("privacy"); }} onSave={function(oData) { onSaveFinancial(oData); setTab("privacy"); }} />}
        {currentTab === "plan" && <PlanView plan={richPlan} onBack={function() { setTab("profile"); }} onRetake={handleRetakePlan} username={user} lang={lang} richardInstructions={richardCtx} categories={categories} budgets={budgets} goals={goals} onSaveBudgets={onSaveBudgets} onSaveGoals={onSaveGoals} onUpdatePlan={function(t) { setRichPlan(t); save({ plan: t }); }} onboardingData={onboardingData} />}
        {currentTab === "language" && <LanguageView lang={lang} onLangChange={onSaveLang} onBack={function() { setTab(prevTabRef.current || "profile"); }} />}
        {currentTab === "appearance" && <AppearanceView theme={theme} onThemeChange={onSaveTheme} darkMode={darkMode} onDarkModeChange={onSaveDarkMode} onBack={function() { setTab(prevTabRef.current || "profile"); }} />}
        {currentTab === "entryMethod" && <EntryMethodView entryMethod={entryMethod} onEntryMethodChange={onSaveEntryMethod} onBack={function() { setTab(prevTabRef.current || "profile"); }} />}
        {currentTab === "savings" && <SavingsView savings={savings} tx={tx} businesses={businesses} onSaveSavings={onSaveSavings} onMove={onSavingsMove} onBack={function() { setTab(prevTabRef.current || "overview"); }} onOpenBusiness={function(id) { prevTabRef.current = "savings"; setOpenBiz(id || null); setTab("business"); setSheet(false); }} />}
        {currentTab === "business" && <BusinessView businesses={businesses} tx={tx} openBizId={openBiz} username={user} lang={lang} richardInstructions={richardCtx} onSaveBusinesses={onSaveBusinesses} onBusinessMove={onBusinessMove} backLabel={prevTabRef.current === "overview" ? "Overview" : "Savings"} onBack={function() { setTab(prevTabRef.current || "overview"); }} />}
        {currentTab === "editOpeningBalance" && <EditOpeningBalanceView tx={tx} onComplete={handleEditOpeningBalance} onBack={function() { setTab(prevTabRef.current || "profile"); }} />}
        {currentTab === "logMonth" && <LogMonthView categories={categories} tx={tx} budgets={budgets} onComplete={handleLogMonth} onBack={function() { setTab(prevTabRef.current || "profile"); }} />}
        {currentTab === "collab" && <CollabView household={household} householdId={householdId} invites={invites} myUid={accountKey} onCreate={onCreateHousehold} onInvite={onInviteMember} onCancelInvite={onCancelInvite} onAccept={onAcceptInvite} onLeave={onLeaveHousehold} onBack={function() { setTab(prevTabRef.current || "profile"); }} />}
        {currentTab === "currency" && <CurrencyView currency={currency} onCurrencyChange={onSaveCurrency} onBack={function() { setTab(prevTabRef.current || "profile"); }} />}
        {currentTab === "nickname" && <NicknameView value={user} onSave={function(name) { onSaveNickname(name); setTab(prevTabRef.current || "profile"); }} onBack={function() { setTab(prevTabRef.current || "profile"); }} />}
        {currentTab === "instructions" && <RichardInstructionsView value={richardInstructions} onSave={function(text) { onSaveInstructions(text); setTab(prevTabRef.current || "profile"); }} onBack={function() { setTab(prevTabRef.current || "profile"); }} />}
      </div>

      {/* Outer wrapper only does fixed positioning — no backdrop-filter here.
          iOS/WebKit will detach a position:fixed element from the viewport
          during scroll if backdrop-filter lives on that same element, so the
          glass blur is applied to an inner div instead. */}
      <div style={{ position: "fixed", bottom: "calc(20px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 398, zIndex: 30 }}>
        <div style={{ position: "relative", background: T.navGlass, backdropFilter: "blur(28px) saturate(190%) brightness(1.08)", WebkitBackdropFilter: "blur(28px) saturate(190%) brightness(1.08)", borderRadius: 34, border: "1px solid " + T.glassBorder, boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.08), inset 0 1px 0.5px " + T.navRimTop + ", inset 0 -1px 0.5px " + T.navRimBot }}>
          {/* Specular sheen — the curved-glass glare across the top of the bar. Self-clips
              via its own border radius (no overflow:hidden, so the active lens shadow
              isn't cropped). Sits below the buttons in paint order. */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 34, pointerEvents: "none", background: "linear-gradient(180deg, " + T.navSheen + " 0%, rgba(255,255,255,0) 42%, rgba(255,255,255,0) 100%)" }} />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-around", padding: "10px 4px 12px" }}>
            {TABS.map(function(tab) {
              var active = currentTab === tab.id;
              return (
                <button key={tab.id} onClick={function() { setTab(tab.id); setSheet(false); }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 4px", flex: 1, minWidth: 0 }}>
                  <div style={{ background: active ? T.navPillGlass : "none", borderRadius: 22, padding: active ? "6px 12px" : "6px 9px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.22s cubic-bezier(0.22,1,0.36,1)", backdropFilter: active ? "blur(8px) saturate(200%) brightness(1.18)" : "none", WebkitBackdropFilter: active ? "blur(8px) saturate(200%) brightness(1.18)" : "none", boxShadow: active ? ("inset 0 1px 0.5px " + T.navPillRim + ", inset 0 -1px 1px " + T.navPillShade + ", 0 2px 7px rgba(0,0,0,0.12)") : "none" }}>
                    <SVGIcon id={tab.id} size={21} color={active ? T.orange : T.ink3} />
                  </div>
                  <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 400, color: active ? T.orange : T.ink3, letterSpacing: "0.005em", whiteSpace: "nowrap" }}>
                    {tr(tab.id)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
