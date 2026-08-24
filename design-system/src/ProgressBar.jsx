// Extracted verbatim from ProgressBar in budget-app.jsx.
import React from "react";
import { T } from "./tokens.js";
import { useGrowIn } from "./motion.js";

/** Thin capsule progress track. Turns red automatically once value exceeds max. */
export function ProgressBar(props) {
  var grown = useGrowIn();
  var pct = Math.min(100, (props.value / (props.max || 1)) * 100);
  return (
    <div style={{ background: "rgba(0,0,0,0.07)", borderRadius: props.h || 4, height: props.h || 4, overflow: "hidden" }}>
      <div style={{
        width: (grown ? pct : 0) + "%",
        height: "100%",
        borderRadius: props.h || 4,
        background: props.value > props.max ? T.red : (props.color || T.orange),
        transition: "width var(--m-value) var(--m-ease), background var(--m-quick) ease",
      }} />
    </div>
  );
}
