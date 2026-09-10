// Extracted verbatim from LiquidButton in budget-app.jsx ("=== LIQUID GLASS
// BUTTON ===") — the app's one glass-button primitive; BigBtn, JrBtn,
// GlassActionBtn and every filled <button> in the real app render through
// this, so it is the canonical glass reference, not a simplified stand-in.
//
// Two things were stubbed rather than reimplemented, both because they have
// no equivalent outside the real app rather than any change in behavior:
//   - `nativeHaptic` calls Capacitor's Haptics plugin (a real device only) —
//     here it's a no-op with the same signature, so the gesture code that
//     calls it is untouched.
//   - The motion custom properties (--m-press, --m-settle, ...) are normally
//     injected by the app's global `ensureMotionCss()`, alongside dozens of
//     unrelated animations. `ensureMotionVars()` below injects only the ones
//     this component actually reads, with the same values (including the
//     prefers-reduced-motion collapse), so the button's timing matches the
//     app without pulling in its whole animation stylesheet.
//
// Everything else — the rim recipe, the palette math, the hold-to-lift-and-
// stretch gesture, the WWDC25-cited lensing/press-glow behavior — is copied
// as-is.

import React, { useEffect, useRef } from "react";
import { T, UI } from "./tokens.js";

// --- color helpers (verbatim from budget-app.jsx) --------------------------

function jrHex(h) {
  h = String(h || "").replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var n = parseInt(h, 16);
  if (isNaN(n) || h.length !== 6) return [0.5, 0.5, 0.5];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function jrRgba(hex, a) {
  var c = jrHex(hex);
  return "rgba(" + Math.round(c[0] * 255) + "," + Math.round(c[1] * 255) + "," + Math.round(c[2] * 255) + "," + a + ")";
}
function jrShade(hex, k) {
  var c = jrHex(hex), m = 1 - k;
  function h2(v) { var t = Math.round(v * 255 * m).toString(16); return t.length < 2 ? "0" + t : t; }
  return "#" + h2(c[0]) + h2(c[1]) + h2(c[2]);
}
function jrShadeRgba(hex, k, a) { return jrRgba(jrShade(hex, k), a); }

// --- stubbed native bridge --------------------------------------------------

function nativeHaptic() { /* no native runtime outside the app; no-op */ }

// --- motion custom properties (values verbatim from ensureMotionCss) -------

function ensureMotionVars() {
  if (typeof document === "undefined") return;
  var id = "richy-ds-motion-vars";
  if (document.getElementById(id)) return;
  var st = document.createElement("style"); st.id = id;
  st.textContent = [
    ":root{--m-scale:1;",
    "--m-press:calc(0.12s * var(--m-scale));",
    "--m-quick:calc(0.22s * var(--m-scale));",
    "--m-enter:calc(0.42s * var(--m-scale));",
    "--m-settle:calc(0.52s * var(--m-scale));",
    "--m-ease:cubic-bezier(0.22,1,0.36,1);",
    "--m-spring:cubic-bezier(0.34,1.32,0.5,1);}",
    "@media (prefers-reduced-motion:reduce){:root{--m-scale:0.0001}}",
  ].join("");
  document.head.appendChild(st);
}
if (typeof document !== "undefined") ensureMotionVars();

// --- busy-state dots (verbatim from ThinkingDots) ---------------------------

function ensureLoadingCss() {
  if (typeof document === "undefined") return;
  var id = "richy-ds-loading-css";
  if (document.getElementById(id)) return;
  var st = document.createElement("style"); st.id = id;
  st.textContent = "@keyframes rclDot{0%,60%,100%{transform:translateY(0);opacity:0.35}30%{transform:translateY(-4px);opacity:1}}";
  document.head.appendChild(st);
}
function ThinkingDots(props) {
  useEffect(function() { ensureLoadingCss(); }, []);
  var s = props.size || 5;
  var c = props.color || T.ink3;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.max(2.5, s * 0.6) }}>
      {[0, 0.16, 0.32].map(function(d) {
        return <span key={d} style={{ width: s, height: s, borderRadius: "50%", background: c, display: "inline-block", animation: "rclDot 1.15s ease-in-out " + d + "s infinite" }} />;
      })}
    </span>
  );
}

// --- sizes + glass constants (verbatim) -------------------------------------

var LQ_SIZES = {
  sm: { h: 34, fs: 12.5, px: 14, gap: 6 },
  md: { h: 44, fs: 14.5, px: 18, gap: 8 },
  lg: { h: 52, fs: 16, px: 24, gap: 8 },
  xl: { h: 56, fs: 17, px: 28, gap: 9 },
};
var LQ_LILAC = "#B49BF0";
var LQ_LILAC_HI = "#EFE9FF";
function lqRim(d, hue) {
  hue = hue || LQ_LILAC;
  if (d) return [
    "0 0 0 0.5px " + jrRgba(LQ_LILAC_HI, 0.14),
    "0 2px 8px rgba(0,0,0,0.28)",
    "0 0 14px " + jrRgba(hue, 0.24),
    "inset 0 0 0 1px " + jrRgba(LQ_LILAC_HI, 0.20),
    "inset 0 1.5px 1px -0.5px " + jrRgba(LQ_LILAC_HI, 0.58),
    "inset 0 -1.5px 1px -0.5px " + jrRgba(LQ_LILAC_HI, 0.34),
    "inset 0 7px 10px -9px " + jrRgba(LQ_LILAC_HI, 0.80),
    "inset 0 0 6px 6px " + jrRgba(LQ_LILAC_HI, 0.07),
  ].join(",");
  return [
    "0 0 0 0.5px " + jrRgba(hue, 0.22),
    "0 2px 6px rgba(40,28,16,0.07)",
    "0 0 12px " + jrRgba(hue, 0.18),
    "inset 0 0 0 1px rgba(255,255,255,0.60)",
    "inset 0 1.5px 1px -0.5px rgba(255,255,255,0.95)",
    "inset 0 -2px 2px -1.5px " + jrRgba(hue, 0.42),
    "inset 0 9px 12px -11px rgba(255,255,255,0.92)",
    "inset 3px 3px 0.5px -3px " + jrRgba(hue, 0.30),
    "inset -3px -3px 0.5px -3px " + jrRgba(hue, 0.26),
    "inset 0 0 6px 6px " + jrRgba(hue, 0.06),
  ].join(",");
}
var LQ_GLASS_LIGHT = "linear-gradient(180deg,rgba(250,247,255,0.78),rgba(226,217,250,0.60))";
var LQ_GLASS_DARK = "linear-gradient(180deg,rgba(198,180,246,0.20),rgba(150,128,214,0.11))";
var LQ_OWN = { variant: 1, soft: 1, color: 1, ink: 1, dark: 1, size: 1, iconSize: 1, height: 1, fontSize: 1, weight: 1, full: 1, flex: 1, blur: 1, busy: 1, busyLabel: 1, wrap: 1, onPress: 1, onClick: 1, disabled: 1, children: 1, style: 1, className: 1, onPointerDown: 1, onPointerMove: 1, onPointerUp: 1, onPointerCancel: 1, onPointerLeave: 1 };
var LQ_HOLD_MS = 340;
var LQ_SLOP = 28;
var LQ_FREE = 6;
var LQ_PULL = 14;
var LQ_STRETCH = 0.15;
var LQ_STRETCH_AT = 80;
var LQ_GEL_K = 0.16;
var LQ_GEL_D = 0.78;
var LQ_GEL_SPEED = 55;
var LQ_GEL_CAP = 0.28;
var LQ_GEL_LEAD = 0.20;
var LQ_SCROLL = 10;

// --- palette (verbatim) -----------------------------------------------------

function lqLum(hex) { var c = jrHex(hex); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
function lqMix(a, b, t) {
  var x = jrHex(a), y = jrHex(b);
  function h2(i) { var v = Math.round((x[i] + (y[i] - x[i]) * t) * 255); v = v < 0 ? 0 : v > 255 ? 255 : v; var q = v.toString(16); return q.length < 2 ? "0" + q : q; }
  return "#" + h2(0) + h2(1) + h2(2);
}
function lqPalette(variant, soft, color, forceDark) {
  var d = forceDark == null ? !!T.isDark : !!forceDark;
  var v = variant || "neutral";
  var hue = color || (v === "green" ? T.green : v === "red" ? T.red : v === "gold" ? T.gold : T.orange);
  var gh = hue, gb = hue;
  if (!d && !color && T.orangeHi && lqLum(hue) < 0.32) { gh = T.orangeHi; gb = lqMix(T.orangeHi, hue, 0.45); }
  var lift = d ? "0 16px 34px rgba(0,0,0,0.55)" : "0 14px 30px rgba(40,28,16,0.22),0 2px 6px rgba(40,28,16,0.10)";
  var p = { rim: lqRim(d), tint: "transparent", ink: T.orange, textShadow: "none", shadow: "none", shadowHov: null, shadowLift: lift, solid: d ? T.darkCard2 : T.card, glow: d ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.80)" };
  if (v === "ghost") {
    p.rim = "none"; p.ink = T.ink2; p.solid = "transparent"; p.glow = "transparent";
    return p;
  }
  if (v === "neutral") {
    p.tint = d ? LQ_GLASS_DARK : LQ_GLASS_LIGHT;
    p.shadow = d ? "0 1px 2px rgba(0,0,0,0.34),0 4px 14px rgba(0,0,0,0.28)" : "0 1px 2px rgba(40,28,16,0.10),0 4px 12px rgba(40,28,16,0.07)";
    p.shadowHov = d ? "0 2px 4px rgba(0,0,0,0.38),0 8px 20px rgba(0,0,0,0.34)" : "0 2px 4px rgba(40,28,16,0.12),0 8px 18px rgba(40,28,16,0.10)";
    return p;
  }
  if (soft) {
    p.rim = lqRim(d, gh);
    p.tint = "linear-gradient(180deg," + jrRgba(gh, d ? 0.26 : 0.16) + "," + jrRgba(gb, d ? 0.34 : 0.26) + ")";
    p.ink = d ? hue : jrShade(hue, 0.24);
    p.glow = d ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.66)";
    p.solid = "linear-gradient(" + jrRgba(gb, d ? 0.26 : 0.16) + "," + jrRgba(gb, d ? 0.26 : 0.16) + ")," + (d ? T.darkCard2 : T.card);
    return p;
  }
  p.rim = lqRim(d, gh);
  p.tint = d
    ? "linear-gradient(180deg," + jrShadeRgba(hue, 0.08, 0.92) + "," + jrShadeRgba(hue, 0.22, 0.96) + ")"
    : "linear-gradient(180deg," + jrRgba(gh, 0.70) + "," + jrRgba(gb, 0.90) + ")";
  p.ink = "#FFFFFF";
  p.glow = "rgba(255,255,255,0.34)";
  p.textShadow = "0 1px 1px " + jrShadeRgba(gb, 0.62, 0.35);
  p.shadow = "0 6px 18px " + jrRgba(gb, d ? 0.30 : 0.34) + ",0 1px 2px rgba(0,0,0,0.10)";
  p.shadowHov = "0 9px 24px " + jrRgba(gb, d ? 0.38 : 0.42) + ",0 1px 2px rgba(0,0,0,0.10)";
  p.shadowLift = "0 16px 34px " + jrRgba(gb, d ? 0.46 : 0.50) + ",0 2px 6px rgba(0,0,0,0.12)";
  p.solid = d ? jrShade(hue, 0.3) : gb;
  return p;
}
function lqDisabledPalette(forceDark) {
  var d = forceDark == null ? !!T.isDark : !!forceDark;
  return {
    rim: lqRim(d),
    tint: d ? "linear-gradient(180deg," + jrRgba(LQ_LILAC, 0.10) + "," + jrRgba(LQ_LILAC, 0.06) + ")" : "linear-gradient(180deg," + jrRgba(LQ_LILAC, 0.14) + "," + jrRgba(LQ_LILAC, 0.09) + ")",
    ink: T.ink3, textShadow: "none", shadow: "none", shadowHov: null, shadowLift: "none", glow: "transparent",
    solid: d ? T.darkCard2 : T.card,
  };
}

// --- stylesheet (verbatim from ensureLiquidCss) -----------------------------

var _lqShaderCount = 0;
function ensureLiquidCss() {
  if (typeof document === "undefined") return;
  var id = "richy-liquid-css";
  if (document.getElementById(id)) return;
  var st = document.createElement("style"); st.id = id;
  st.textContent = [
    ".rc-lq{position:relative;isolation:isolate;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;margin:0;border:none;border-radius:999px;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;touch-action:manipulation;box-shadow:var(--lq-sh,none);transition:transform var(--m-press) ease,box-shadow var(--m-quick) ease,color var(--m-quick) ease;}",
    ".rc-lq.rc-lq-full{display:flex;width:100%;}",
    ".rc-lq:disabled{cursor:default;}",
    ".rc-lq>span{border-radius:inherit;}",
    ".rc-lq-glass{position:absolute;inset:0;z-index:0;pointer-events:none;-webkit-backdrop-filter:blur(var(--lq-blur,14px)) saturate(var(--lq-sat,160%)) contrast(1.04);backdrop-filter:blur(var(--lq-blur,14px)) saturate(var(--lq-sat,160%)) contrast(1.04);}",
    ".rc-lq-noblur .rc-lq-glass,html.rc-shader-live .rc-lq-glass{display:none;}",
    ".rc-lq-tint{position:absolute;inset:0;z-index:1;pointer-events:none;background:var(--lq-tint,transparent);transition:background var(--m-quick) ease;}",
    ".rc-lq-rim{position:absolute;inset:0;z-index:2;pointer-events:none;box-shadow:var(--lq-rim,none);transition:box-shadow var(--m-quick) ease;}",
    ".rc-lq-tint::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transform:scale(0.35);transform-origin:var(--lq-gx,50%) var(--lq-gy,50%);background:radial-gradient(circle at var(--lq-gx,50%) var(--lq-gy,50%),var(--lq-glow,transparent),transparent 72%);transition:opacity var(--m-quick) ease,transform var(--m-enter) var(--m-ease);}",
    ".rc-lq.rc-lq-down .rc-lq-tint::after,.rc-lq.rc-lq-lift .rc-lq-tint::after{opacity:1;transform:scale(1);}",
    ".rc-lq-label{position:relative;z-index:3;display:inline-flex;align-items:center;justify-content:center;min-width:0;max-width:100%;pointer-events:none;line-height:1.2;}",
    "@media (hover:hover){.rc-lq:hover:not(:disabled){transform:scale(1.03);box-shadow:var(--lq-sh-hov,var(--lq-sh,none));}}",
    ".rc-lq.rc-lq-down:not(:disabled){transform:scale(0.97);}",
    ".rc-lq.rc-lq-lift:not(:disabled){box-shadow:var(--lq-sh-lift,var(--lq-sh,none));z-index:5;}",
    "@media (prefers-reduced-transparency:reduce){.rc-lq-glass{display:none;}.rc-lq-tint{background:var(--lq-solid,var(--lq-tint));}}",
    "@media (prefers-contrast:more){.rc-lq-glass{display:none;}.rc-lq-tint{background:var(--lq-solid,var(--lq-tint));}.rc-lq-tint::after{display:none;}.rc-lq-rim{box-shadow:inset 0 0 0 2px currentColor;}}",
    "@media (prefers-reduced-motion:reduce){.rc-lq{transition:none;}.rc-lq:hover:not(:disabled),.rc-lq.rc-lq-down:not(:disabled){transform:none;}.rc-lq-tint::after{transform:none;transition:opacity var(--m-quick) ease;}}",
  ].join("");
  document.head.appendChild(st);
}
if (typeof document !== "undefined") ensureLiquidCss();

// --- gesture math (verbatim) -------------------------------------------------

function lqFollow(v) {
  var s = v < 0 ? -1 : 1, a = Math.abs(v);
  if (a > LQ_FREE) a = LQ_FREE + LQ_PULL * (1 - Math.exp(-(a - LQ_FREE) / (LQ_PULL * 2)));
  return s * a;
}
function lqStretchTarget(dx, dy, speed) {
  var m = Math.sqrt(dx * dx + dy * dy);
  var e = LQ_STRETCH * (1 - Math.exp(-m / LQ_STRETCH_AT)) + (speed || 0) * LQ_GEL_SPEED * 0.01;
  return Math.min(e, LQ_GEL_CAP);
}
function lqStretch(e, dirx, diry) {
  if (e < 0.002) return null;
  return { a: Math.atan2(diry, dirx) * 180 / Math.PI, sx: 1 + e, sy: 1 - e * 0.55 };
}
function lqStretchCss(st, invert) {
  if (!st) return "";
  var x = invert ? 1 / st.sx : st.sx, y = invert ? 1 / st.sy : st.sy;
  return " rotate(" + st.a.toFixed(1) + "deg) scale(" + x.toFixed(3) + "," + y.toFixed(3) + ") rotate(" + (-st.a).toFixed(1) + "deg)";
}
function lqThick(h) { return Math.max(0, Math.min(1, (h - 34) / 22)); }
var _lqStill = null;
function lqStill() {
  if (_lqStill === null && typeof matchMedia === "function") { try { _lqStill = matchMedia("(prefers-reduced-motion: reduce)"); } catch (e) { _lqStill = false; } }
  return !!(_lqStill && _lqStill.matches);
}

// --- the component (verbatim) ------------------------------------------------

/**
 * Richy's one glass-button primitive. variant: "primary" | "neutral" (default)
 * | "green" | "red" | "gold" | "ghost". soft: hue as a light wash instead of a
 * filled capsule. size: "sm" | "md" (default) | "lg" | "xl" | "icon". full:
 * width 100%. busy: shows ThinkingDots and disables the button.
 */
export function LiquidButton(props) {
  useEffect(function() { ensureLiquidCss(); }, []);
  var ref = useRef(null);
  var gRef = useRef(null);
  var swallowRef = useRef(0);
  var variant = props.variant || "neutral";
  var dis = !!props.disabled || !!props.busy;
  var icon = props.size === "icon";
  var sz = LQ_SIZES[props.size] || LQ_SIZES.md;
  var p = dis ? lqDisabledPalette(props.dark) : lqPalette(variant, props.soft, props.color, props.dark);
  if (props.ink && !dis) p.ink = props.ink;
  var h = props.height || (icon ? (props.iconSize || 44) : sz.h);
  var wrap = props.wrap != null ? !!props.wrap : !!props.full;
  var cls = "rc-lq" + (props.full ? " rc-lq-full" : "") + (props.blur === false ? " rc-lq-noblur" : "") + (props.className ? " " + props.className : "");
  var style = {
    height: h, minHeight: h,
    width: icon ? h : (props.full ? "100%" : undefined),
    minWidth: icon ? h : undefined,
    padding: icon ? 0 : "0 " + sz.px + "px",
    fontFamily: UI, fontSize: props.fontSize || (icon ? 15 : sz.fs), fontWeight: props.weight || 700, letterSpacing: "-0.01em",
    color: p.ink, textShadow: p.textShadow,
    flex: props.flex != null ? props.flex : undefined,
    "--lq-rim": p.rim, "--lq-tint": p.tint, "--lq-solid": p.solid, "--lq-glow": p.glow || "transparent",
    "--lq-blur": (12 + 5 * lqThick(h)).toFixed(1) + "px", "--lq-sat": (152 + 22 * lqThick(h)).toFixed(0) + "%",
    "--lq-sh": p.shadow, "--lq-sh-hov": p.shadowHov || p.shadow, "--lq-sh-lift": p.shadowLift,
  };
  if (props.style) Object.assign(style, props.style);
  var action = props.onClick || props.onPress;

  useEffect(function() {
    var node = ref.current;
    if (!node) return;
    function onTouchMove(e) { var G = gRef.current; if (G && G.lifted) e.preventDefault(); }
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    return function() {
      node.removeEventListener("touchmove", onTouchMove);
      var G = gRef.current; if (G) { clearTimeout(G.timer); if (G.raf) cancelAnimationFrame(G.raf); gRef.current = null; }
    };
  }, []);

  function step(G) {
    var node = ref.current;
    if (!node || G.still || gRef.current !== G || !G.lifted) { G.raf = 0; return; }
    var tx = lqFollow(G.dx), ty = lqFollow(G.dy);
    G.vx = (G.vx + (tx - G.tx) * LQ_GEL_K) * LQ_GEL_D; G.tx += G.vx;
    G.vy = (G.vy + (ty - G.ty) * LQ_GEL_K) * LQ_GEL_D; G.ty += G.vy;
    var target = lqStretchTarget(G.dx, G.dy, G.speed);
    G.ve = (G.ve + (target - G.e) * LQ_GEL_K) * LQ_GEL_D; G.e += G.ve;
    if (G.e < 0) G.e = 0;
    var m = Math.sqrt(G.dx * G.dx + G.dy * G.dy);
    if (m > 0.5) { G.dirx += (G.dx / m - G.dirx) * 0.18; G.diry += (G.dy / m - G.diry) * 0.18; }
    G.speed *= 0.88;
    var st = lqStretch(G.e, G.dirx, G.diry);
    var ox = (50 - G.dirx * LQ_GEL_LEAD * 100).toFixed(1) + "%";
    var oy = (50 - G.diry * LQ_GEL_LEAD * 100).toFixed(1) + "%";
    node.style.transformOrigin = ox + " " + oy;
    node.style.transform = "translate(" + G.tx.toFixed(2) + "px," + G.ty.toFixed(2) + "px) scale(1.06)" + lqStretchCss(st, false);
    if (G.lab) { G.lab.style.transformOrigin = ox + " " + oy; G.lab.style.transform = lqStretchCss(st, true).slice(1); }
    G.raf = requestAnimationFrame(function() { step(G); });
  }
  function settle(G, commit, e) {
    gRef.current = null;
    clearTimeout(G.timer);
    if (G.raf) cancelAnimationFrame(G.raf);
    var node = ref.current;
    if (node) {
      node.classList.remove("rc-lq-down");
      if (G.lifted) {
        node.classList.remove("rc-lq-lift");
        node.style.transition = "transform var(--m-settle) var(--m-spring), box-shadow var(--m-quick) ease";
        node.style.transform = "";
        if (G.lab) { G.lab.style.transition = "transform var(--m-settle) var(--m-spring)"; G.lab.style.transform = ""; }
        node.style.transformOrigin = "";
        if (G.lab) G.lab.style.transformOrigin = "";
        try { node.releasePointerCapture(G.id); } catch (x) {}
        setTimeout(function() {
          node.style.transition = ""; node.style.willChange = "";
          if (G.lab) { G.lab.style.transition = ""; G.lab.style.willChange = ""; }
        }, 600);
      }
    }
    if (G.lifted) {
      swallowRef.current = Date.now();
      if (commit && action) action(e);
    }
  }
  function onDown(e) {
    if (props.onPointerDown) props.onPointerDown(e);
    if (dis || (e.pointerType === "mouse" && e.button !== 0)) return;
    var node = ref.current; if (!node) return;
    if (gRef.current) settle(gRef.current, false, e);
    var G = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, lifted: false, still: false, timer: 0, raf: 0, rect: null, lab: null,
              tx: 0, ty: 0, vx: 0, vy: 0, e: 0, ve: 0, dirx: 1, diry: 0, speed: 0, lastX: e.clientX, lastY: e.clientY, lastT: e.timeStamp || Date.now() };
    gRef.current = G;
    node.classList.add("rc-lq-down");
    var r0 = node.getBoundingClientRect();
    if (r0.width && r0.height) {
      node.style.setProperty("--lq-gx", (((e.clientX - r0.left) / r0.width) * 100).toFixed(1) + "%");
      node.style.setProperty("--lq-gy", (((e.clientY - r0.top) / r0.height) * 100).toFixed(1) + "%");
    }
    G.timer = setTimeout(function() {
      if (gRef.current !== G) return;
      G.lifted = true;
      G.still = lqStill();
      G.rect = node.getBoundingClientRect();
      try { node.setPointerCapture(G.id); } catch (x) {}
      node.classList.remove("rc-lq-down");
      node.classList.add("rc-lq-lift");
      G.lab = node.querySelector(".rc-lq-label");
      if (G.lab) G.lab.style.willChange = "transform";
      node.style.willChange = "transform";
      node.style.transition = "transform 0.26s var(--m-spring), box-shadow var(--m-quick) ease";
      nativeHaptic("MEDIUM");
      if (!G.still) G.raf = requestAnimationFrame(function() { step(G); });
    }, LQ_HOLD_MS);
  }
  function onMove(e) {
    if (props.onPointerMove) props.onPointerMove(e);
    var G = gRef.current; if (!G || e.pointerId !== G.id) return;
    G.dx = e.clientX - G.x0; G.dy = e.clientY - G.y0;
    if (!G.lifted) {
      if (Math.abs(G.dx) > LQ_SCROLL || Math.abs(G.dy) > LQ_SCROLL) settle(G, false, e);
      return;
    }
    var now = e.timeStamp || Date.now();
    var dt = Math.max(8, now - G.lastT);
    var sp = Math.sqrt(Math.pow(e.clientX - G.lastX, 2) + Math.pow(e.clientY - G.lastY, 2)) / dt;
    G.speed = G.speed * 0.6 + sp * 0.4;
    G.lastX = e.clientX; G.lastY = e.clientY; G.lastT = now;
  }
  function onUp(e) {
    if (props.onPointerUp) props.onPointerUp(e);
    var G = gRef.current; if (!G || e.pointerId !== G.id) return;
    var r = G.rect || ref.current.getBoundingClientRect();
    var inside = e.clientX >= r.left - LQ_SLOP && e.clientX <= r.right + LQ_SLOP && e.clientY >= r.top - LQ_SLOP && e.clientY <= r.bottom + LQ_SLOP;
    settle(G, inside, e);
  }
  function onCancel(e) {
    if (props.onPointerCancel) props.onPointerCancel(e);
    var G = gRef.current; if (G) settle(G, false, e);
  }
  function onLeave(e) {
    if (props.onPointerLeave) props.onPointerLeave(e);
    var G = gRef.current;
    if (G && !G.lifted) settle(G, false, e);
  }
  function onClick(e) {
    if (dis) return;
    if (Date.now() - swallowRef.current < 500) { e.preventDefault(); e.stopPropagation(); return; }
    if (action) action(e);
  }

  var dom = {};
  for (var k in props) { if (!LQ_OWN[k]) dom[k] = props[k]; }
  dom.ref = ref;
  dom.className = cls;
  dom.style = style;
  dom.disabled = dis;
  dom.onClick = onClick;
  dom.onPointerDown = onDown; dom.onPointerMove = onMove; dom.onPointerUp = onUp; dom.onPointerCancel = onCancel; dom.onPointerLeave = onLeave;
  var label = props.busy
    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{props.busyLabel || props.children}<ThinkingDots size={4.5} color={p.ink === "#FFFFFF" ? "rgba(255,255,255,0.9)" : p.ink} /></span>
    : props.children;
  return (
    <button {...dom}>
      {props.blur === false ? null : <span className="rc-lq-glass" aria-hidden="true" />}
      <span className="rc-lq-tint" aria-hidden="true" />
      <span className="rc-lq-rim" aria-hidden="true" />
      <span className="rc-lq-label" style={{ gap: sz.gap, whiteSpace: wrap ? "normal" : "nowrap" }}>{label}</span>
    </button>
  );
}
