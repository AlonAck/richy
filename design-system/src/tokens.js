// Design tokens extracted from budget-app.jsx (const T, "blue" / Cornflower
// Ocean theme — Richy's flagship as of 10 Sep 2026, replacing the earlier
// "purple" / Mika's Violet snapshot this file used to carry).
// This is a snapshot of the live values for the default theme; the app itself
// mutates T at runtime for dark mode / theme switching, but the static values
// below are what ships in this component bundle. `darkCard2` is included only
// so a component's `dark` prop (a forced-dark render, independent of the
// system theme) has a value to fall back to — it does not make this bundle
// theme-switching-aware.
export const T = {
  bg: "#F7F3EE",
  card: "#FFFFFF",
  darkCard2: "#252018",
  ink: "#1A1410",
  ink2: "#6B5C4E",
  ink3: "#7A6B5C",
  sep: "rgba(0,0,0,0.06)",
  isDark: false,
  orange: "#3C4C82",
  orangeHi: "#5C7AE3",
  orangeDim: "rgba(92,122,227,0.15)",
  orangeGlow: "rgba(92,122,227,0.30)",
  btn: "linear-gradient(135deg,#5C7AE3 0%,#4C5E9C 55%,#3C4C82 100%)",
  green: "#27A85F",
  red: "#E03030",
  gold: "#C8983A",
  sheetGlass: "rgba(255,255,255,0.78)",
  glassBorder: "rgba(0,0,0,0.08)",
  glassSpec: "rgba(0,0,0,0.07)",
};

export const UI = '-apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const DISP = '"New York", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Noto Serif Hebrew", "Noto Naskh Arabic", ui-serif, "Times New Roman", serif';
export const DISP_WEIGHT = 700;
