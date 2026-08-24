// Extracted verbatim from BigBtn in budget-app.jsx.
import React, { useState } from "react";
import { T, UI } from "./tokens.js";
import { PRESS_T } from "./motion.js";

/** Full-width primary action button used on forms/sheets. */
export function BigBtn(props) {
  var _p = useState(false); var pressed = _p[0]; var setPressed = _p[1];
  var live = !props.disabled;
  return (
    <button onClick={props.disabled ? undefined : props.onPress}
      onPointerDown={function() { if (live) setPressed(true); }}
      onPointerUp={function() { setPressed(false); }}
      onPointerLeave={function() { setPressed(false); }}
      onPointerCancel={function() { setPressed(false); }}
      style={{
        width: "100%",
        background: props.disabled ? "rgba(0,0,0,0.10)" : (props.color || T.btn),
        color: props.disabled ? T.ink3 : "#fff",
        textShadow: props.disabled ? "none" : "0 1px 2px rgba(42,31,77,0.35)",
        border: "none", borderRadius: 14, padding: "13px 0",
        fontSize: 16, fontFamily: UI, fontWeight: 700,
        cursor: props.disabled ? "default" : "pointer",
        marginTop: 10,
        boxShadow: props.disabled ? "none" : (pressed ? "0 2px 8px " + T.orangeGlow : "0 4px 14px " + T.orangeGlow),
        transform: pressed ? "scale(0.975)" : "scale(1)",
        transition: PRESS_T,
      }}>
      {props.label}
    </button>
  );
}
