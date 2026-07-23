// Extracted verbatim from BigBtn in budget-app.jsx.
import React from "react";
import { T, UI } from "./tokens.js";

/** Full-width primary action button used on forms/sheets. */
export function BigBtn(props) {
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
