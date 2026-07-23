// Extracted verbatim from CatBadge in budget-app.jsx.
import React from "react";
import { SVGIcon } from "./SVGIcon.jsx";

/** Category color chip. `soft` renders a tinted background instead of a solid fill. */
export function CatBadge(props) {
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
