// Extracted verbatim from CatBadge in budget-app.jsx.
import React from "react";
import { SVGIcon } from "./SVGIcon.jsx";
import { T } from "./tokens.js";

/** Picks readable icon ink for a solid-fill badge (YIQ perceived-brightness split). */
export function contrastIconColor(hex) {
  var c = (hex || "").replace("#", "");
  if (c.length === 3) c = c.split("").map(function(ch) { return ch + ch; }).join("");
  var r = parseInt(c.substr(0, 2), 16) || 0;
  var g = parseInt(c.substr(2, 2), 16) || 0;
  var b = parseInt(c.substr(4, 2), 16) || 0;
  var yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? T.ink : "#fff";
}

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
      <SVGIcon id={props.icon || "box"} size={Math.round(size * 0.5)} color={soft ? props.color : contrastIconColor(props.color)} />
    </div>
  );
}
