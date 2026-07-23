// Extracted verbatim (icon set trimmed to the ones the shipped components use)
// from SVGIcon in budget-app.jsx.
import React from "react";
import { T } from "./tokens.js";

const ICONS = {
  up: "M12 19V5m-7 7l7-7 7 7",
  down: "M12 5v14m7-7l-7 7-7-7",
  box: "M12 4v16M4 12h16M6.34 6.34l11.32 11.32M17.66 6.34L6.34 17.66",
  check: "M20 6L9 17l-5-5",
  home: "M3 10.5L12 3l9 7.5M5 9.2V20h14V9.2",
  food: "M7 3v4m-2-4v4a2 2 0 004 0V3M6 8v13M16 3v18M19 8h-6",
  car: "M5 11l1.6-4.4A2 2 0 018.5 5h7a2 2 0 011.9 1.6L19 11M4.5 11h15v5h-15zM8 16v2M16 16v2",
  heart: "M12 20.5S3.5 15 3.5 9.2A4.2 4.2 0 0112 6a4.2 4.2 0 018.5 3.2C20.5 15 12 20.5 12 20.5z",
  coins: "M4 7c0-1.4 2.7-2.5 6-2.5S16 5.6 16 7s-2.7 2.5-6 2.5S4 8.4 4 7zM4 7v5c0 1.4 2.7 2.5 6 2.5M8 13.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5M8 13.5C8 12.1 10.7 11 14 11s6 1.1 6 2.5v5c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5z",
};

/**
 * Line icon from the Richy icon bank. Renders `null` (empty path) for any id
 * not included in this trimmed set — see budget-app.jsx SVGIcon for the full bank.
 */
export function SVGIcon(props) {
  var size = props.size || 22;
  var color = props.color || T.ink2;
  var d = ICONS[props.id] || "";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
