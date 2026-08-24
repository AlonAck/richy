// Trimmed from ensureMotionCss()/PRESS_T/useGrowIn in budget-app.jsx (the
// "Richy Motion" design pass). Only the pieces BigBtn and ProgressBar need —
// the press-feedback transition and the value-grow-in hook — are included
// here, not the full keyframe vocabulary (rcRise, rcPop, rcFlash, ...) those
// power app screens this package doesn't extract.
import { useEffect, useState } from "react";

let injected = false;
export function ensureMotionCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  var id = "richy-ds-motion-css";
  if (document.getElementById(id)) return;
  var st = document.createElement("style"); st.id = id;
  st.textContent = [
    ":root{",
      "--m-scale:1;",
      "--m-press:calc(0.12s * var(--m-scale));",   // tap feedback
      "--m-quick:calc(0.22s * var(--m-scale));",   // colour / background
      "--m-value:calc(0.60s * var(--m-scale));",   // bars, rings, rows
      "--m-ease:cubic-bezier(0.22,1,0.36,1);",     // fast in, slow out
    "}",
    "@media (prefers-reduced-motion:reduce){:root{--m-scale:0.0001}}",
  ].join("");
  document.head.appendChild(st);
}
if (typeof document !== "undefined") ensureMotionCss();

// Press feedback: the same pair of transitions on every tappable surface.
export var PRESS_T = "transform var(--m-press) ease, box-shadow var(--m-quick) ease";

// Fill a bar or ring from zero on first paint. Render at 0, flip on the next
// frame, and the element's own transition does the rest. The timer is a
// backstop for a hidden tab, where rAF is paused.
export function useGrowIn() {
  var _m = useState(false); var on = _m[0]; var setOn = _m[1];
  useEffect(function() {
    var r = requestAnimationFrame(function() { setOn(true); });
    var t = setTimeout(function() { setOn(true); }, 50);
    return function() { cancelAnimationFrame(r); clearTimeout(t); };
  }, []);
  return on;
}
