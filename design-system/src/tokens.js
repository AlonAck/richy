// Design tokens extracted from budget-app.jsx (const T, "purple" theme).
// This is a snapshot of the live values for the default theme; the app itself
// mutates T at runtime for dark mode / theme switching, but the static values
// below are what ships in this component bundle.
export const T = {
  bg: "#F7F3EE",
  card: "#FFFFFF",
  ink: "#1A1410",
  ink2: "#6B5C4E",
  ink3: "#B0A396",
  sep: "rgba(0,0,0,0.06)",
  orange: "#8970C6",
  orangeHi: "#C8B1FF",
  orangeDim: "rgba(137,112,198,0.13)",
  orangeGlow: "rgba(137,112,198,0.30)",
  btn: "linear-gradient(135deg,#9D78E8 0%,#B493F2 55%,#CBB6FA 100%)",
  green: "#27A85F",
  red: "#E03030",
  gold: "#C8983A",
  sheetGlass: "rgba(255,255,255,0.78)",
  glassBorder: "rgba(0,0,0,0.08)",
  glassSpec: "rgba(0,0,0,0.07)",
};

export const UI = '-apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const DISP = '"New York", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Noto Serif Hebrew", "Noto Naskh Arabic", ui-serif, "Times New Roman", serif';
// Every title uses DISP at this weight, upright (never italic). MARK_WEIGHT is
// for the "R" logotype mark only.
export const DISP_WEIGHT = 400;
export const MARK_WEIGHT = 500;

// Badge rarity ramp (light-theme values; see motivation-doc/tokens.css for the
// dark-mode ramp this must stay in sync with). Mythic has no flat color — it's
// a gradient, exposed separately as MYTHIC_GRADIENT.
export const RARITY_COLOR = {
  common: T.ink3,
  uncommon: T.green,
  rare: "#2E7DD6",
  epic: "#8970C6",
  legendary: T.gold,
};
export const RARITY_LABEL = { common: "COMMON", uncommon: "UNCOMMON", rare: "RARE", epic: "EPIC", legendary: "LEGENDARY", mythic: "MYTHIC" };
export const MYTHIC_GRADIENT = "linear-gradient(100deg,#8970C6 0%,#2E7DD6 24%,#27A85F 46%,#C8983A 70%,#B4519B 100%)";
