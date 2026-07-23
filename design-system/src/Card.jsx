// Extracted verbatim from Card in budget-app.jsx.
import React from "react";
import { T } from "./tokens.js";

/**
 * Base surface used throughout Richy for panels, sheets, and grouped content.
 * `glass` swaps the flat white card for the frosted "liquid glass" material.
 */
export function Card(props) {
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
