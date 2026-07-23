// Extracted verbatim from IconBadge in budget-app.jsx.
import React from "react";
import { SVGIcon } from "./SVGIcon.jsx";

/** Rounded-square icon chip, e.g. for transaction direction (income/expense). */
export function IconBadge(props) {
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
