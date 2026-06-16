import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const T = {
  bg:        "#F7F3EE",
  card:      "#FFFFFF",
  dark:      "#141210",
  darkCard:  "#1E1A16",
  darkCard2: "#252018",
  glass:     "rgba(255,255,255,0.82)",
  ink:       "#1A1410",
  ink2:      "#6B5C4E",
  ink3:      "#B0A396",
  sep:       "rgba(0,0,0,0.06)",
  sepDark:   "rgba(255,255,255,0.08)",
  orange:    "#C8673A",
  orangeHi:  "#E07848",
  orangeDim: "rgba(200,103,58,0.13)",
  orangeGlow:"rgba(200,103,58,0.30)",
  green:     "#27A85F",
  greenDim:  "rgba(39,168,95,0.15)",
  red:       "#E03030",
  gold:      "#C8983A",
  goldDim:   "rgba(200,152,58,0.15)",
};

const CATS = ["Housing","Food","Transport","Health","Entertainment","Shopping","Other"];
const CAT_COLOR = {
  Housing: "#8B6CEF",
  Food: "#34C759",
  Transport: "#D97941",
  Health: "#FF3B30",
  Entertainment: "#2799C8",
  Shopping: "#AF52DE",
  Other: "#888888",
};

const UI = "-apple-system, system-ui, sans-serif";
const DISP = "-apple-system, system-ui, sans-serif";

function dollars(n) {
  var abs = Math.abs(n);
  return "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function hashPass(pw) {
  var h = 5381;
  for (var i = 0; i < pw.length; i++) {
    h = ((h << 5) + h) + pw.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

var DEFAULT_BUDGETS = [
  { category: "Housing", limit: 0 },
  { category: "Food", limit: 0 },
  { category: "Transport", limit: 0 },
  { category: "Health", limit: 0 },
  { category: "Entertainment", limit: 0 },
  { category: "Shopping", limit: 0 },
];

// In-memory store (localStorage is blocked in the artifact sandbox).
// Accounts persist for the current session. window-level so it survives re-renders.
if (typeof window !== "undefined" && !window.__CB_DB) {
  window.__CB_DB = { index: {}, users: {}, session: null };
}
function _db() {
  if (typeof window !== "undefined") return window.__CB_DB;
  return { index: {}, users: {}, session: null };
}

var STORE = {
  getIndex: function() {
    return _db().index || {};
  },
  saveIndex: function(v) {
    _db().index = v;
  },
  getUser: function(u) {
    return _db().users[u] || null;
  },
  saveUser: function(u, d) {
    _db().users[u] = d;
  },
  getSession: function() {
    return _db().session || null;
  },
  saveSession: function(u) {
    _db().session = u;
  },
  clearSession: function() {
    _db().session = null;
  },
};

function Card(props) {
  return (
    <div style={Object.assign({
      background: props.glass ? T.glass : T.card,
      borderRadius: 20,
      boxShadow: props.glass
        ? "0 2px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"
        : "0 1px 1px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.07)",
      backdropFilter: props.glass ? "blur(20px)" : "none",
      WebkitBackdropFilter: props.glass ? "blur(20px)" : "none",
    }, props.style)}>
      {props.children}
    </div>
  );
}

function SVGIcon(props) {
  var size = props.size || 22;
  var color = props.color || T.ink2;
  var icons = {
    overview: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    budgets:  "M2 7h20M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm4 4v10",
    goals:    "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6a4 4 0 100-8 4 4 0 000 8zm0 0v2",
    advisor:  "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8m9-4l-2 2-1-1",
    user:     "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8",
    lock:     "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zm-7 4v3M8 11V7a4 4 0 018 0v4",
    plus:     "M12 5v14M5 12h14",
    trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    up:       "M12 19V5m-7 7l7-7 7 7",
    down:     "M12 5v14m7-7l-7 7-7-7",
    eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
    eyeoff:   "M17.94 17.94A10 10 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9 9 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22",
    logout:   "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
    refresh:  "M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15",
    check:    "M20 6L9 17l-5-5",
    spark:    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    search:   "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    flag:     "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
  };
  var d = icons[props.id] || "";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function ProgressBar(props) {
  var pct = Math.min(100, (props.value / (props.max || 1)) * 100);
  return (
    <div style={{ background: "rgba(0,0,0,0.07)", borderRadius: props.h || 4, height: props.h || 4, overflow: "hidden" }}>
      <div style={{
        width: pct + "%",
        height: "100%",
        borderRadius: props.h || 4,
        background: props.value > props.max ? T.red : (props.color || T.orange),
        transition: "width 0.5s ease",
      }} />
    </div>
  );
}

function RingChart(props) {
  var size = props.size || 60;
  var stroke = props.stroke || 5;
  var r = (size - stroke * 2) / 2;
  var circ = 2 * Math.PI * r;
  var pct = Math.min(1, props.value / (props.max || 1));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={props.color || T.orange} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" />
    </svg>
  );
}

function IconBadge(props) {
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

function Overlay(props) {
  if (!props.open) return null;
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%",
      transform: "translateX(-50%)",
      width: "100%", maxWidth: 430, zIndex: 90,
      background: "#F8F8FC",
      borderRadius: "24px 24px 0 0",
      boxShadow: "0 -4px 40px rgba(0,0,0,0.16)",
      paddingBottom: 44,
    }}>
      <div style={{ width: 36, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.13)", margin: "10px auto 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px 10px" }}>
        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: DISP, color: T.ink }}>{props.title}</span>
        <button onClick={props.onClose} style={{
          background: "rgba(0,0,0,0.07)", border: "none", borderRadius: "50%",
          width: 30, height: 30, cursor: "pointer", fontSize: 18, color: T.ink2,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>x</button>
      </div>
      <div style={{ padding: "2px 20px 0" }}>{props.children}</div>
    </div>
  );
}

function FormRow(props) {
  return (
    <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "12px 15px", marginBottom: props.last ? 0 : 9 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI, marginBottom: 5 }}>
        {props.label}
      </div>
      {props.opts ? (
        <select value={props.value} onChange={props.onChange} style={{ width: "100%", border: "none", background: "none", fontSize: 16, color: T.ink, fontFamily: UI, outline: "none", padding: 0 }}>
          {props.opts.map(function(o) { return <option key={o}>{o}</option>; })}
        </select>
      ) : (
        <input type={props.type || "text"} value={props.value} onChange={props.onChange}
          style={{ width: "100%", border: "none", background: "none", fontSize: 16, color: T.ink, fontFamily: UI, outline: "none", padding: 0, boxSizing: "border-box" }} />
      )}
    </div>
  );
}

function BigBtn(props) {
  return (
    <button onClick={props.disabled ? undefined : props.onPress}
      style={{
        width: "100%",
        background: props.disabled ? "rgba(0,0,0,0.10)" : (props.color || T.orange),
        color: props.disabled ? T.ink3 : "#fff",
        border: "none", borderRadius: 16, padding: "16px 0",
        fontSize: 17, fontFamily: UI, fontWeight: 700,
        cursor: props.disabled ? "default" : "pointer",
        marginTop: 14,
        boxShadow: props.disabled ? "none" : "0 4px 14px rgba(217,121,65,0.4)",
      }}>
      {props.label}
    </button>
  );
}

function AuthScreen(props) {
  var _s = useState("login");
  var mode = _s[0]; var setMode = _s[1];
  var _u = useState("");
  var username = _u[0]; var setUN = _u[1];
  var _p = useState("");
  var password = _p[0]; var setPW = _p[1];
  var _e = useState("");
  var error = _e[0]; var setError = _e[1];
  var _b = useState(false);
  var busy = _b[0]; var setBusy = _b[1];
  var _sp = useState(false);
  var showPw = _sp[0]; var setShowPw = _sp[1];
  var _ss = useState(null);
  var ssoProvider = _ss[0]; var setSsoProvider = _ss[1];
  var _sn = useState("");
  var ssoName = _sn[0]; var setSsoName = _sn[1];

  function submit() {
    setError("");
    var u = username.trim().toLowerCase();
    if (!u || !password) { setError("Please fill in all fields."); return; }
    if (u.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setBusy(true);
    setTimeout(function() {
      try {
        var idx = STORE.getIndex();
        if (mode === "register") {
          if (idx[u]) { setError("Username already taken."); setBusy(false); return; }
          idx[u] = hashPass(password);
          STORE.saveIndex(idx);
          STORE.saveUser(u, { tx: [], budgets: DEFAULT_BUDGETS, goals: [] });
          STORE.saveSession(u);
          props.onLogin(u, { tx: [], budgets: DEFAULT_BUDGETS, goals: [] });
        } else {
          if (!idx[u]) { setError("No account found. Sign up first."); setBusy(false); return; }
          if (idx[u] !== hashPass(password)) { setError("Wrong password."); setBusy(false); return; }
          var data = STORE.getUser(u) || { tx: [], budgets: DEFAULT_BUDGETS, goals: [] };
          STORE.saveSession(u);
          props.onLogin(u, data);
        }
      } catch(err) {
        setError("Something went wrong. Try again."); setBusy(false);
      }
    }, 50);
  }

  function confirmSso() {
    var clean = ssoName.trim();
    if (!clean) { return; }
    var handle = clean.toLowerCase().replace(/[^a-z0-9]/g, "") + "." + ssoProvider;
    setBusy(true);
    setTimeout(function() {
      var idx = STORE.getIndex();
      if (!idx[handle]) {
        idx[handle] = "sso";
        STORE.saveIndex(idx);
        STORE.saveUser(handle, { tx: [], budgets: DEFAULT_BUDGETS, goals: [], displayName: clean });
      }
      STORE.saveSession(handle);
      var data = STORE.getUser(handle) || { tx: [], budgets: DEFAULT_BUDGETS, goals: [], displayName: clean };
      props.onLogin(clean, data);
    }, 300);
  }

  var inputStyle = {
    width: "100%", background: "rgba(0,0,0,0.04)",
    border: "1.5px solid rgba(0,0,0,0.08)", borderRadius: 14,
    padding: "14px 14px 14px 44px", fontSize: 16, fontFamily: UI,
    color: T.ink, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FDF5EC 0%,#FAF0E4 40%,#F5E8D8 100%)", display: "flex", flexDirection: "column", fontFamily: UI, position: "relative", overflow: "hidden" }}>

      <div style={{ position: "absolute", top: -80, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(200,103,58,0.15) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 60, left: -80, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(196,154,60,0.12) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px 24px" }}>

        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(145deg," + T.orangeHi + "," + T.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 12px 32px " + T.orangeGlow + ", 0 4px 12px rgba(0,0,0,0.12)" }}>
            <SVGIcon id="spark" size={36} color="#fff" />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.orange, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Claude Budget</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            {mode === "login" ? "Welcome back" : "Get started"}
          </div>
          <div style={{ fontSize: 15, color: T.ink2, marginTop: 6 }}>
            {mode === "login" ? "Sign in to your account" : "Create your free account"}
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
              <SVGIcon id="user" size={17} color={T.ink3} />
            </div>
            <input value={username} onChange={function(e) { setUN(e.target.value); }}
              placeholder="Username" autoComplete="username"
              onKeyDown={function(e) { if (e.key === "Enter") submit(); }}
              style={{ width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 15px 15px 46px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }} />
          </div>

          <div style={{ position: "relative", marginBottom: error ? 12 : 0 }}>
            <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
              <SVGIcon id="lock" size={17} color={T.ink3} />
            </div>
            <input value={password} onChange={function(e) { setPW(e.target.value); }}
              type={showPw ? "text" : "password"} placeholder="Password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              onKeyDown={function(e) { if (e.key === "Enter") submit(); }}
              style={{ width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 46px 15px 46px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }} />
            <button onClick={function() { setShowPw(function(v) { return !v; }); }}
              style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <SVGIcon id={showPw ? "eyeoff" : "eye"} size={17} color={T.ink3} />
            </button>
          </div>

          {error && (
            <div style={{ fontSize: 13, color: T.red, padding: "6px 4px 4px", display: "flex", alignItems: "center", gap: 6 }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={busy}
            style={{ width: "100%", background: busy ? "rgba(0,0,0,0.08)" : "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", color: busy ? T.ink3 : "#fff", border: "none", borderRadius: 16, padding: "17px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: busy ? "default" : "pointer", marginTop: 16, boxShadow: busy ? "none" : "0 6px 20px " + T.orangeGlow + ", 0 2px 6px rgba(0,0,0,0.1)", letterSpacing: "-0.01em" }}>
            {busy ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          {!ssoProvider && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px" }}>
                <div style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.12)" }} />
                <span style={{ fontSize: 12, color: T.ink3, fontWeight: 500 }}>or continue with</span>
                <div style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.12)" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={function() { setSsoProvider("google"); setSsoName(""); setError(""); }} disabled={busy}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#fff", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 14, padding: "13px 0", cursor: busy ? "default" : "pointer", fontSize: 15, fontFamily: UI, fontWeight: 600, color: T.ink, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.5 10.5 0 0012 1a11 11 0 00-9.82 6.06l3.66 2.84C6.71 7.3 9.14 4.75 12 4.75z"/>
                  </svg>
                  Google
                </button>
                <button onClick={function() { setSsoProvider("apple"); setSsoName(""); setError(""); }} disabled={busy}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#000", border: "1.5px solid #000", borderRadius: 14, padding: "13px 0", cursor: busy ? "default" : "pointer", fontSize: 15, fontFamily: UI, fontWeight: 600, color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
                    <path d="M17.05 12.04c-.03-2.85 2.33-4.22 2.44-4.29-1.33-1.95-3.4-2.22-4.14-2.25-1.76-.18-3.44 1.04-4.34 1.04-.89 0-2.27-1.02-3.74-.99-1.92.03-3.7 1.12-4.69 2.84-2 3.47-.51 8.6 1.44 11.42.95 1.38 2.08 2.93 3.56 2.87 1.43-.06 1.97-.92 3.7-.92 1.72 0 2.21.92 3.72.89 1.54-.03 2.51-1.4 3.45-2.79 1.09-1.6 1.54-3.15 1.56-3.23-.03-.02-2.99-1.15-3.02-4.56zM14.2 3.78c.79-.96 1.32-2.29 1.18-3.62-1.14.05-2.52.76-3.34 1.72-.73.85-1.37 2.21-1.2 3.51 1.27.1 2.57-.65 3.36-1.61z"/>
                  </svg>
                  Apple
                </button>
              </div>
            </div>
          )}

          {ssoProvider && (
            <div style={{ marginTop: 18, padding: "16px", background: "rgba(0,0,0,0.03)", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                {ssoProvider === "google" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.5 10.5 0 0012 1a11 11 0 00-9.82 6.06l3.66 2.84C6.71 7.3 9.14 4.75 12 4.75z"/></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#000"><path d="M17.05 12.04c-.03-2.85 2.33-4.22 2.44-4.29-1.33-1.95-3.4-2.22-4.14-2.25-1.76-.18-3.44 1.04-4.34 1.04-.89 0-2.27-1.02-3.74-.99-1.92.03-3.7 1.12-4.69 2.84-2 3.47-.51 8.6 1.44 11.42.95 1.38 2.08 2.93 3.56 2.87 1.43-.06 1.97-.92 3.7-.92 1.72 0 2.21.92 3.72.89 1.54-.03 2.51-1.4 3.45-2.79 1.09-1.6 1.54-3.15 1.56-3.23-.03-.02-2.99-1.15-3.02-4.56zM14.2 3.78c.79-.96 1.32-2.29 1.18-3.62-1.14.05-2.52.76-3.34 1.72-.73.85-1.37 2.21-1.2 3.51 1.27.1 2.57-.65 3.36-1.61z"/></svg>
                )}
                <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Continue with {ssoProvider === "google" ? "Google" : "Apple"}</span>
              </div>
              <input value={ssoName} onChange={function(e) { setSsoName(e.target.value); }}
                placeholder="What's your name?" autoFocus
                onKeyDown={function(e) { if (e.key === "Enter") confirmSso(); }}
                style={{ width: "100%", background: "#fff", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "13px 14px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={function() { setSsoProvider(null); }}
                  style={{ flex: 1, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 15, fontFamily: UI, fontWeight: 600, color: T.ink2, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={confirmSso} disabled={!ssoName.trim() || busy}
                  style={{ flex: 2, background: (!ssoName.trim() || busy) ? "rgba(0,0,0,0.1)" : "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", color: (!ssoName.trim() || busy) ? T.ink3 : "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 15, fontFamily: UI, fontWeight: 700, cursor: (!ssoName.trim() || busy) ? "default" : "pointer" }}>
                  {busy ? "..." : "Continue"}
                </button>
              </div>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: T.ink2 }}>
            {mode === "login" ? "New here? " : "Have an account? "}
            <button onClick={function() { setMode(function(m) { return m === "login" ? "register" : "login"; }); setError(""); }}
              style={{ background: "none", border: "none", color: T.orange, fontWeight: 700, fontSize: 14, fontFamily: UI, cursor: "pointer" }}>
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "0 0 32px", fontSize: 12, color: T.ink3 }}>Saved securely on this device</div>
    </div>
  );
}

function Overview(props) {
  var tx       = props.tx;
  var goals    = props.goals;
  var username = props.username || "";
  var name     = username.charAt(0).toUpperCase() + username.slice(1);

  var h    = new Date().getHours();
  var mins = new Date().getMinutes();
  var period = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";

  var tod = period === "morning" ? "Good morning" : period === "afternoon" ? "Good afternoon" : "Good evening";
  var greetings = [
    tod + ", " + name + ".",
    "How are you saving today, " + name + "?",
    "Getting productive, " + name + "?",
    "Hey, " + name + ".",
    "Coffee and Claude, " + name + ".",
    tod + ", " + name + ".",
    "Hi " + name + ".",
    "How are you saving today, " + name + "?",
    "Getting productive, " + name + "?",
    tod + ", " + name + ".",
  ];
  var subtitles = [
    "Here's where you stand.",
    "Your numbers for today.",
    "Let's see how you're doing.",
    "Quick look at your finances.",
    "Here's your overview.",
    "Everything in one place.",
    "Your financial snapshot.",
    "Here's the latest.",
    "A clear view of your money.",
    "Today at a glance.",
  ];
  var idx      = mins % greetings.length;
  var greeting = greetings[idx];
  var subtitle = subtitles[idx];

  var income  = tx.filter(function(t) { return t.type === "income"; }).reduce(function(s,t) { return s+t.amount; }, 0);
  var expense = tx.filter(function(t) { return t.type === "expense"; }).reduce(function(s,t) { return s+t.amount; }, 0);
  var balance = income - expense;
  var savRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  var topCat  = CATS.map(function(c) {
    return { name: c, color: CAT_COLOR[c], val: tx.filter(function(t) { return t.type==="expense" && t.category===c; }).reduce(function(s,t){return s+t.amount;},0) };
  }).sort(function(a,b){ return b.val-a.val; })[0];
  var pie = CATS.map(function(c) {
    return { name: c, color: CAT_COLOR[c], value: tx.filter(function(t) { return t.type==="expense" && t.category===c; }).reduce(function(s,t){return s+t.amount;},0) };
  }).filter(function(c) { return c.value > 0; });
  var recent = tx.slice().sort(function(a,b){ return b.date.localeCompare(a.date); }).slice(0,4);

  return (
    <div>

      <div style={{ padding: "6px 2px 22px" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, letterSpacing: "-0.03em", lineHeight: 1.18 }}>
          {greeting}
        </div>
        <div style={{ fontSize: 14, color: T.ink3, marginTop: 5, fontStyle: "italic" }}>
          {subtitle}
        </div>
      </div>

      <div style={{ borderRadius: 22, overflow: "hidden", marginBottom: 16, background: "linear-gradient(145deg," + T.dark + " 0%," + T.darkCard + " 50%," + T.darkCard2 + " 100%)", boxShadow: "0 12px 40px rgba(20,18,16,0.28), 0 2px 8px rgba(0,0,0,0.14)", position: "relative" }}>
        <div style={{ position: "absolute", top: -40, right: -30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(200,103,58,0.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle,rgba(200,152,58,0.14) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ padding: "26px 24px 22px", position: "relative" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>
            NET BALANCE
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 4 }}>
            {dollars(balance)}
          </div>
          {income > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: savRate >= 20 ? "rgba(39,168,95,0.2)" : "rgba(200,103,58,0.2)", borderRadius: 30, padding: "3px 10px", marginBottom: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: savRate >= 20 ? T.green : T.orange }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: savRate >= 20 ? "#4ADE80" : T.orangeHi }}>
                {savRate}{"% saved this period"}
              </span>
            </div>
          )}
          <div style={{ height: "0.5px", background: "rgba(255,255,255,0.08)", marginBottom: 18 }} />
          <div style={{ display: "flex", gap: 0 }}>
            <div style={{ flex: 1, paddingRight: 18, borderRight: "0.5px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Income</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#4ADE80", letterSpacing: "-0.02em" }}>{dollars(income)}</div>
            </div>
            <div style={{ flex: 1, paddingLeft: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Spent</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em" }}>{dollars(expense)}</div>
            </div>
          </div>
        </div>
        {topCat && topCat.val > 0 && (
          <div style={{ padding: "12px 24px 16px", borderTop: "0.5px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: topCat.color }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Top spend</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{topCat.name} {" -  "}{dollars(topCat.val)}</span>
          </div>
        )}
      </div>

      {tx.length === 0 && (
        <Card style={{ padding: "36px 24px", textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SVGIcon id="activity" size={24} color={T.orange} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 5 }}>No transactions yet</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>The Richest Man in Babylon started by tracking every coin. Start yours in Activity.</div>
        </Card>
      )}

      {income > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "16px 16px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Savings Rate</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: savRate >= 20 ? T.green : savRate > 0 ? T.orange : T.red, letterSpacing: "-0.02em" }}>{savRate}%</div>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 3 }}>{savRate >= 20 ? "Excellent" : savRate >= 10 ? "On track" : savRate > 0 ? "Build it up" : "Overspending"}</div>
          </div>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "16px 16px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Transactions</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{tx.length}</div>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 3 }}>this period</div>
          </div>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "16px 16px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Goals</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{goals.length}</div>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 3 }}>{goals.length === 1 ? "active goal" : "active goals"}</div>
          </div>
        </div>
      )}

      {pie.length > 0 && (
        <div>
          <div style={{ padding: "0 2px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Where it went</span>
            <span style={{ fontSize: 12, color: T.ink3 }}>{dollars(expense)} total</span>
          </div>
          <Card style={{ padding: "18px 18px 14px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <ResponsiveContainer width={96} height={96}>
                <PieChart>
                  <Pie data={pie} cx="50%" cy="50%" innerRadius={26} outerRadius={46} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {pie.map(function(c, i) { return <Cell key={i} fill={c.color} />; })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {pie.slice(0,5).map(function(c) {
                  var pct = Math.round((c.value / expense) * 100);
                  return (
                    <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: T.ink, fontWeight: 500 }}>{c.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.ink2 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {goals.length > 0 && (
        <div>
          <div style={{ padding: "0 2px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Goals</span>
            <span style={{ fontSize: 12, color: T.ink3 }}>{goals.filter(function(g){return g.saved>=g.target;}).length}/{goals.length} complete</span>
          </div>
          <Card style={{ marginBottom: 20, overflow: "hidden" }}>
            {goals.map(function(g, i) {
              var pct = Math.min(100, Math.round((g.saved / g.target) * 100));
              var done = g.saved >= g.target;
              return (
                <div key={g.id} style={{ padding: "14px 18px", borderBottom: i < goals.length-1 ? "0.5px solid " + T.sep : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 15, color: T.ink, fontWeight: 600 }}>{g.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {done && <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: T.greenDim, borderRadius: 20, padding: "2px 8px" }}>DONE</span>}
                      <span style={{ fontSize: 14, fontWeight: 700, color: done ? T.green : T.orange }}>{pct}%</span>
                    </div>
                  </div>
                  <ProgressBar value={g.saved} max={g.target} color={done ? T.green : T.orange} h={5} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: T.ink3 }}>{dollars(g.saved)} saved</span>
                    <span style={{ fontSize: 11, color: T.ink3, fontWeight: 500 }}>{dollars(g.target - g.saved)} to go</span>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <div style={{ padding: "0 2px 10px" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Recent</span>
          </div>
          <Card style={{ overflow: "hidden", marginBottom: 8 }}>
            {recent.map(function(t, i) {
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < recent.length-1 ? "0.5px solid " + T.sep : "none" }}>
                  <IconBadge bg={t.type === "income" ? T.green : (CAT_COLOR[t.category] || T.ink3)} icon={t.type === "income" ? "up" : "down"} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: T.ink, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: T.ink3, marginTop: 1 }}>{t.category} {"  "}{t.date}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: t.type === "income" ? T.green : T.ink, flexShrink: 0 }}>
                    {t.type === "income" ? "+" : "-"}{dollars(t.amount)}
                  </span>
                </div>
              );
            })}
          </Card>
        </div>
      )}

    </div>
  );
}

function Activity(props) {
  var _f = useState({ type: "expense", amount: "", label: "", category: "Food", date: new Date().toISOString().slice(0, 10) });
  var form = _f[0]; var setForm = _f[1];

  function setField(key, val) {
    setForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }

  function add() {
    if (!form.amount || !form.label) return;
    var newTx = props.tx.concat([{ type: form.type, amount: parseFloat(form.amount), label: form.label, category: form.category, date: form.date, id: Date.now() }]);
    props.onSaveTx(newTx);
    setField("amount", "");
    setField("label", "");
    props.setSheetOpen(false);
  }

  var sorted = props.tx.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
  var groups = {};
  sorted.forEach(function(t) {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });
  var dates = Object.keys(groups).sort(function(a, b) { return b.localeCompare(a); });

  return (
    <div>
      <Overlay open={props.sheetOpen} onClose={function() { props.setSheetOpen(false); }} title="New Transaction">
        <FormRow label="Type" value={form.type} onChange={function(e) { setField("type", e.target.value); }} opts={["expense","income"]} />
        <FormRow label="Amount" value={form.amount} onChange={function(e) { setField("amount", e.target.value); }} type="number" />
        <FormRow label="Label" value={form.label} onChange={function(e) { setField("label", e.target.value); }} />
        <FormRow label="Category" value={form.category} onChange={function(e) { setField("category", e.target.value); }} opts={CATS} />
        <FormRow label="Date" value={form.date} onChange={function(e) { setField("date", e.target.value); }} type="date" last={true} />
        <BigBtn label="Add Transaction" onPress={add} disabled={!form.amount || !form.label} />
      </Overlay>

      {props.tx.length === 0 && (
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12, color: T.ink3 }}>$</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink2, marginBottom: 4 }}>No transactions yet</div>
          <div style={{ fontSize: 13, color: T.ink3 }}>Tap + to add your first one.</div>
        </Card>
      )}

      {dates.map(function(date) {
        return (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink2, padding: "0 4px 8px" }}>{date}</div>
            <Card style={{ overflow: "hidden" }}>
              {groups[date].map(function(t, i) {
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 18px", borderBottom: i < groups[date].length - 1 ? "0.5px solid " + T.sep : "none" }}>
                    <IconBadge bg={t.type === "income" ? T.green : (CAT_COLOR[t.category] || T.ink3)} label={t.type === "income" ? "+" : "-"} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, color: T.ink, fontWeight: 500 }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: T.ink3, marginTop: 1 }}>{t.category}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: t.type === "income" ? T.green : T.ink }}>
                        {t.type === "income" ? "+" : "-"}{dollars(t.amount)}
                      </span>
                      <button onClick={function() { props.onSaveTx(props.tx.filter(function(x) { return x.id !== t.id; })); }}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: T.ink3, fontSize: 12 }}>
                        del
                      </button>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })}
    </div>
  );
}

function Budgets(props) {
  var _s = useState(null);
  var sheet = _s[0]; var setSheet = _s[1];
  var _v = useState("");
  var val = _v[0]; var setVal = _v[1];

  function spent(cat) {
    return props.tx.filter(function(t) { return t.type === "expense" && t.category === cat; }).reduce(function(s, t) { return s + t.amount; }, 0);
  }

  var totalSpent = props.budgets.reduce(function(s, b) { return s + spent(b.category); }, 0);
  var totalLimit = props.budgets.reduce(function(s, b) { return s + b.limit; }, 0);

  return (
    <div>
      <Overlay open={!!sheet} onClose={function() { setSheet(null); }} title={sheet ? "Edit " + sheet : ""}>
        <FormRow label="Monthly limit ($)" value={val} onChange={function(e) { setVal(e.target.value); }} type="number" last={true} />
        <BigBtn label="Save" onPress={function() {
          var n = parseFloat(val);
          if (n) props.onSaveBudgets(props.budgets.map(function(b) { return b.category === sheet ? { category: b.category, limit: n } : b; }));
          setSheet(null);
        }} />
      </Overlay>

      <Card style={{ padding: "20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: T.ink2, fontWeight: 500 }}>Total Spent</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: totalSpent > totalLimit ? T.red : T.ink, lineHeight: 1.1, marginTop: 2 }}>
              {dollars(totalSpent)}
            </div>
            <div style={{ fontSize: 13, color: T.ink3, marginTop: 2 }}>of {dollars(totalLimit)}</div>
          </div>
          <div style={{ position: "relative" }}>
            <RingChart value={totalSpent} max={totalLimit} size={72} color={totalSpent / totalLimit > 0.85 ? T.red : T.orange} stroke={6} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.ink2 }}>
              {totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0}%
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <ProgressBar value={totalSpent} max={totalLimit} h={6} />
        </div>
      </Card>

      <div style={{ padding: "0 4px 10px" }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: T.ink, fontFamily: DISP }}>By Category</span>
      </div>
      <Card style={{ overflow: "hidden" }}>
        {props.budgets.map(function(b, i) {
          var s = spent(b.category);
          var over = s > b.limit;
          return (
            <div key={b.category} style={{ padding: "13px 18px", borderBottom: i < props.budgets.length - 1 ? "0.5px solid " + T.sep : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: CAT_COLOR[b.category], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 15, color: T.ink, fontWeight: 500 }}>{b.category}</span>
                {over && <span style={{ fontSize: 11, fontWeight: 700, color: T.red, background: "rgba(255,59,48,0.1)", borderRadius: 7, padding: "2px 8px" }}>Over</span>}
                <button onClick={function() { setSheet(b.category); setVal(b.limit); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.orange, fontSize: 14, fontWeight: 600 }}>
                  {dollars(b.limit)}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={s} max={b.limit} color={over ? T.red : CAT_COLOR[b.category]} h={5} />
                </div>
                <span style={{ fontSize: 12, minWidth: 40, textAlign: "right", color: over ? T.red : T.ink3 }}>{dollars(s)}</span>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function Goals(props) {
  var _f = useState({ name: "", target: "", saved: "" });
  var form = _f[0]; var setForm = _f[1];
  var _a = useState(null);
  var addSheet = _a[0]; var setAddSheet = _a[1];
  var _am = useState("");
  var addAmt = _am[0]; var setAddAmt = _am[1];

  function setField(key, val) {
    setForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }

  return (
    <div>
      <Overlay open={props.sheetOpen} onClose={function() { props.setSheetOpen(false); }} title="New Goal">
        <FormRow label="Goal name" value={form.name} onChange={function(e) { setField("name", e.target.value); }} />
        <FormRow label="Target ($)" value={form.target} onChange={function(e) { setField("target", e.target.value); }} type="number" />
        <FormRow label="Already saved" value={form.saved} onChange={function(e) { setField("saved", e.target.value); }} type="number" last={true} />
        <BigBtn label="Create Goal" disabled={!form.name || !form.target} onPress={function() {
          props.onSaveGoals(props.goals.concat([{ id: Date.now(), name: form.name, target: parseFloat(form.target), saved: parseFloat(form.saved) || 0 }]));
          setForm({ name: "", target: "", saved: "" });
          props.setSheetOpen(false);
        }} />
      </Overlay>

      <Overlay open={!!addSheet} onClose={function() { setAddSheet(null); }} title={addSheet ? "Add to " + addSheet.name : ""}>
        <FormRow label="Amount ($)" value={addAmt} onChange={function(e) { setAddAmt(e.target.value); }} type="number" last={true} />
        <BigBtn label="Add Savings" disabled={!addAmt} onPress={function() {
          var n = parseFloat(addAmt);
          if (n && addSheet) {
            props.onSaveGoals(props.goals.map(function(g) {
              return g.id === addSheet.id ? { id: g.id, name: g.name, target: g.target, saved: Math.min(g.target, g.saved + n) } : g;
            }));
          }
          setAddSheet(null);
          setAddAmt("");
        }} />
      </Overlay>

      {props.goals.length === 0 && !props.sheetOpen && (
        <Card style={{ padding: "56px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 44, color: T.ink3, marginBottom: 12 }}>*</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink2, marginBottom: 4 }}>No Goals Yet</div>
          <div style={{ fontSize: 13, color: T.ink3 }}>Tap + to add your first goal.</div>
        </Card>
      )}

      {props.goals.map(function(g) {
        var pct = Math.min(100, Math.round((g.saved / g.target) * 100));
        var done = g.saved >= g.target;
        return (
          <Card key={g.id} style={{ marginBottom: 14, overflow: "hidden" }}>
            <div style={{ padding: "18px 18px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{g.name}</div>
                  <div style={{ fontSize: 13, color: T.ink3, marginTop: 2 }}>
                    {done ? "Goal complete!" : dollars(g.target - g.saved) + " remaining"}
                  </div>
                </div>
                <div style={{ position: "relative" }}>
                  <RingChart value={g.saved} max={g.target} size={60} color={done ? T.green : T.orange} stroke={5} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: done ? T.green : T.orange }}>
                    {pct}%
                  </div>
                </div>
              </div>
              <ProgressBar value={g.saved} max={g.target} color={done ? T.green : T.orange} h={6} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: T.ink3 }}>{dollars(g.saved)}</span>
                <span style={{ fontSize: 11, color: T.ink3 }}>{dollars(g.target)}</span>
              </div>
            </div>
            <div style={{ display: "flex", borderTop: "0.5px solid " + T.sep }}>
              {!done && (
                <button onClick={function() { setAddSheet(g); setAddAmt(""); }}
                  style={{ flex: 1, background: "none", border: "none", borderRight: "0.5px solid " + T.sep, padding: "13px 0", color: T.orange, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                  + Add Savings
                </button>
              )}
              <button onClick={function() { props.onSaveGoals(props.goals.filter(function(x) { return x.id !== g.id; })); }}
                style={{ flex: 1, background: "none", border: "none", padding: "13px 0", color: T.red, fontSize: 15, cursor: "pointer" }}>
                Delete
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Advisor(props) {
  var _a = useState(null);
  var advice = _a[0]; var setAdvice = _a[1];
  var _l = useState(false);
  var loading = _l[0]; var setLoading = _l[1];
  var _em = useState("");
  var errMsg = _em[0]; var setErrMsg = _em[1];
  var _c = useState([]);
  var chat = _c[0]; var setChat = _c[1];
  var _in = useState("");
  var input = _in[0]; var setInput = _in[1];
  var _cl = useState(false);
  var chatLoading = _cl[0]; var setChatLoading = _cl[1];
  var _pa = useState(null);
  var pendingAction = _pa[0]; var setPendingAction = _pa[1];

  var income = props.tx.filter(function(t) { return t.type === "income"; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var expense = props.tx.filter(function(t) { return t.type === "expense"; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var savings = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  var ctx = "Income $" + income + ", expenses $" + expense + ", savings rate " + savings + "%, goals: " + (props.goals.map(function(g) { return g.name + " $" + g.saved + "/$" + g.target; }).join(", ") || "none");

  function localAnalysis() {
    var topName = "Other";
    var topVal = 0;
    for (var ci = 0; ci < CATS.length; ci++) {
      var cv = props.tx.filter(function(t) { return t.type === "expense" && t.category === CATS[ci]; }).reduce(function(s, t) { return s + t.amount; }, 0);
      if (cv > topVal) { topVal = cv; topName = CATS[ci]; }
    }
    var score = 50;
    if (savings >= 20) score = 85;
    else if (savings >= 10) score = 70;
    else if (savings >= 0) score = 55;
    else score = 30;
    var label = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : "Needs Work";
    var insights = [];
    if (savings >= 20) {
      insights.push({ type: "strength", title: "Strong Savings Rate", body: "You are saving " + savings + "% of your income, well above the recommended 20%. This builds long-term wealth fast." });
    } else if (savings >= 0) {
      insights.push({ type: "tip", title: "Grow Your Savings Rate", body: "You save " + savings + "% right now. Aim for 20% by trimming one or two recurring expenses." });
    } else {
      insights.push({ type: "warning", title: "Spending Exceeds Income", body: "You are spending more than you earn this period. Review your largest categories and cut back where possible." });
    }
    if (topVal > 0) {
      insights.push({ type: "tip", title: "Watch " + topName + " Spending", body: topName + " is your biggest expense at " + dollars(topVal) + ". Small reductions here have the largest impact on your budget." });
    }
    insights.push({ type: "strength", title: "You Are Tracking", body: "Simply recording your transactions puts you ahead of most people. Consistency is the foundation of financial health." });
    var quotes = [
      { quote: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
      { quote: "It is not about how much money you make, but how much money you keep.", author: "Robert Kiyosaki" },
      { quote: "Wealth is not about having a lot of money. It is about having a lot of options.", author: "Chris Rock" },
      { quote: "The key to financial freedom is learning to do more with less.", author: "Dave Ramsey" },
      { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
      { quote: "Compound interest is the eighth wonder of the world. He who understands it earns it.", author: "Albert Einstein" },
      { quote: "A part of all you earn is yours to keep. Pay yourself first.", author: "George Clason" },
      { quote: "The secret to getting rich is saving before you spend.", author: "Tony Robbins" }
    ];
    var tips = [
      { title: "The 50/30/20 Rule", body: "Put 50% of income toward needs, 30% toward wants, 20% toward savings. Morgan Housel says savings rate matters more than investment returns early on." },
      { title: "Pay Yourself First", body: "The Richest Man in Babylon: keep 10% of everything you earn. Automate this transfer on payday before you can spend it." },
      { title: "The Latte Factor", body: "Small daily purchases of $5-$10 compound to $75,000+ over 30 years. Audit your recurring small expenses quarterly." },
      { title: "Avoid Lifestyle Inflation", body: "The Millionaire Next Door found most millionaires kept lifestyle flat when income rose, investing the difference instead." },
      { title: "Build Your Emergency Fund First", body: "Dave Ramsey and Ramit Sethi both say: 3-6 months expenses in cash before any investing. This prevents derailing long-term plans." }
    ];
    var q = quotes[Math.floor((income + expense) % quotes.length)];
    var tip = tips[Math.floor((income + expense) % tips.length)];
    return {
      score: score,
      scoreLabel: label,
      headline: savings >= 20 ? "Great work, your finances are on a strong footing." : savings >= 0 ? "You are on track, with room to save more." : "Time to rein in spending and rebuild your cushion.",
      insights: insights,
      expertQuote: q,
      webInsight: tip
    };
  }

  function Richard(question) {
    var q = question.toLowerCase().trim();
    var topCat = CATS.map(function(c) {
      return { name: c, val: props.tx.filter(function(t) { return t.type === "expense" && t.category === c; }).reduce(function(s, t) { return s + t.amount; }, 0) };
    }).sort(function(a, b) { return b.val - a.val; })[0];
    var monthlySpend = expense;
    var surplus = income - expense;

    function has() {
      for (var i = 0; i < arguments.length; i++) {
        if (q.indexOf(arguments[i]) !== -1) return true;
      }
      return false;
    }

    // ===== SMALL TALK =====
    if (q === "hi" || q === "hey" || q === "yo" || q === "hello" || has("hello ", "hi ", "hey ", "good morning", "good evening")) {
      return "Hey! I'm your finance advisor. Ask me anything - saving more, whether your budget's healthy, investing, debt, emergency funds, buying a house or car, retirement, taxes, credit, or how the wealthy actually manage money. What's on your mind?";
    }
    if (has("what can you do", "what do you know", "how can you help", "what are you")) {
      return "I analyze your spending and advise on: saving strategies, budgeting, investing, debt payoff, emergency funds, retirement and FIRE, big purchases, taxes, credit scores, raising money-smart kids, and the principles behind real wealth. You're at " + dollars(income) + " income, " + dollars(expense) + " spent, " + savings + "% saved. What should we dig into?";
    }
    if (has("thank", "appreciate", "helpful", "great advice")) {
      return "Anytime. Wealth is built through small consistent decisions - keep checking in and adjusting. What else can I help with?";
    }

    // ===== EMOTIONAL / INTENT (checked early, before keyword topics) =====
    if (has("stressed", "anxious", "worried", "scared", "overwhelmed", "depressed", "feel broke", "feeling broke", "paycheck to paycheck", "drowning")) {
      return "I hear you - money stress is heavy, and you're not alone in it. Let's make it smaller and concrete. First, list your absolute essentials (housing, food, utilities, minimum debt payments). Everything above that is where we find breathing room. Even setting aside $10 builds the habit and the sense of control. What's the one bill or expense weighing on you most right now? We'll start there.";
    }
    if (has("hate budget", "budgeting is hard", "budgeting is confusing", "so confusing", "too confusing", "dont understand", "don't understand", "too complicated", "hate this", "this is hard", "im lost", "i'm lost")) {
      return "Totally fair - most budgeting advice is needlessly complicated. Here's the whole thing in one line: spend less than you earn, and put the difference somewhere it grows. That's it. Start by just tracking what you spend for one week here - no judgment, no rules. Awareness alone changes behavior. Want me to set up a dead-simple plan for you?";
    }
    if (has("just paid off", "paid it off", "reached my goal", "hit my goal", "i did it", "im proud", "i'm proud", "i saved", "finally saved")) {
      return "That's genuinely worth celebrating - well done. Progress like this compounds, both in your balance and your confidence. The key now is to lock in the habit: keep the same routine going so this becomes your normal, not a one-time win. What's the next goal you want to aim at?";
    }
    if (has("loan for a vacation", "loan for vacation", "borrow for a vacation", "finance a vacation", "loan for a trip", "loan for a holiday", "borrow for a trip")) {
      return "I'd be cautious here. Borrowing for a vacation means paying interest on a memory - the trip ends but the debt lingers, often at high rates. A better path: open a separate savings 'sinking fund', decide your budget and date, and divide it into monthly chunks. Want $3,000 in 10 months? That's $300/month, and you arrive debt-free. The trip will feel a lot better when it's already paid for.";
    }

    // ===== COMPOUND INTEREST (must come before 'interest'/'debt') =====
    if (has("compound interest", "compounding", "compound")) {
      return "Compound interest is earning returns on your returns - Einstein supposedly called it the eighth wonder of the world. Example: $10,000 at 8% becomes ~$100,000 in 30 years without adding a cent. The two levers are TIME and RATE, which is why starting early matters more than starting big. Every year you wait costs you the largest, final compounding years.";
    }

    // ===== ROTH IRA / 401k / specific accounts =====
    if (has("roth", "ira", "401k", "403b", "retirement account", "tax advantaged")) {
      return "A Roth IRA lets you invest after-tax money that then grows and is withdrawn completely tax-free in retirement - ideal if you expect to earn more later. A traditional 401k/IRA gives you the tax break now instead. Priority order: (1) 401k up to any employer match (free money), (2) max a Roth IRA, (3) back to maxing the 401k, (4) taxable brokerage. In 2026 the IRA limit is around $7,000/year.";
    }

    // ===== SPECIFIC STOCKS / CRYPTO =====
    if (has("what stock", "which stock", "stock should", "stock to buy", "pick stocks", "individual stock")) {
      return "I can't pick individual stocks for you - and honestly, neither should most people try. Buffett's advice for nearly everyone: a low-cost S&P 500 index fund beats ~90% of professional stock pickers over a decade and you never have to guess. Picking single stocks is closer to gambling unless you're prepared to research deeply and accept big swings.";
    }
    if (has("crypto", "bitcoin", "ethereum", "btc", "nft", "altcoin")) {
      return "Crypto is highly volatile and speculative - it can swing 50%+ in weeks. The common-sense rule from most advisors: never put in more than you can afford to lose entirely, and treat it as a small slice (under 5-10%) of an otherwise diversified portfolio. Build your emergency fund and index-fund base first; crypto is the spice, not the meal.";
    }

    // ===== TAX =====
    if (has("tax", "taxes", "deduction", "irs", "write off", "refund")) {
      return "The biggest legal way to cut taxes is using tax-advantaged accounts: 401k and traditional IRA contributions lower your taxable income today, while a Roth grows tax-free for later. Beyond that: track deductible expenses if you're self-employed, hold investments over a year for lower capital-gains rates, and never turn down a raise over tax fears - you only ever pay the higher rate on the dollars above each bracket, never your whole income.";
    }

    // ===== CREDIT SCORE =====
    if (has("credit score", "credit report", "fico", "improve credit", "build credit", "credit rating")) {
      return "Five things drive your credit score: (1) payment history - never miss a due date, set autopay, (2) utilization - keep balances under 30% of your limit, ideally under 10%, (3) age of accounts - don't close old cards, (4) credit mix, (5) new inquiries - don't open many at once. The fastest wins are always paying on time and paying down card balances.";
    }

    // ===== STUDENT LOANS vs INVEST =====
    if (has("student loan", "loans or invest", "pay off or invest", "payoff or invest")) {
      return "Compare the interest rate to expected investment returns. If your student loan is above ~6-7%, paying it off is a guaranteed return that's hard to beat - prioritize it. If it's low (say under 5%), you can make minimums and invest the rest, since the market has historically returned ~8-10% long term. Either way: grab any 401k employer match first - that's an instant 100% return nothing else matches.";
    }

    // ===== KIDS & MONEY =====
    if (has("kids", "children", "teach my", "child about money", "allowance")) {
      return "Teaching kids money: (1) give them a small allowance they manage themselves - real decisions teach faster than lectures, (2) use three jars: spend, save, give, (3) let them feel the sting of running out, (4) match their savings to demonstrate compound growth, (5) be open about your own money choices. The Richest Man in Babylon and Rich Dad Poor Dad are both about lessons passed down - model the behavior you want.";
    }

    // ===== NET WORTH BY AGE / AM I BEHIND =====
    if (has("net worth", "behind", "my age", "for my age", "should i have saved", "no savings")) {
      return "A common benchmark (from The Millionaire Next Door): expected net worth = age x pretax income / 10. So at 30 earning $50k, roughly $150k. But don't panic if you're behind - the variable that matters most is your savings RATE going forward, not where you are today. Someone starting at 25 with $0 who saves 20% will out-finish someone who started richer but saves nothing. Start now; time is the asset.";
    }

    // ===== IMPULSE BUYING =====
    if (has("impulse", "stop spending", "overspend", "tempt", "shopping habit", "buying things")) {
      return "Beating impulse spending: (1) the 24-hour rule - wait a day on anything non-essential over $50; most urges pass, (2) delete saved cards from shopping apps so buying takes effort, (3) unsubscribe from store emails and unfollow brands, (4) ask 'is this a need or a want?' out loud, (5) give every dollar a job in your budget so there's no 'free' money to splurge. Friction is your friend.";
    }

    // ===== VACATION / SAVING FOR A GOAL =====
    if (has("vacation", "save for", "saving for", "trip", "wedding", "buy a", "big purchase", "sinking fund")) {
      return "Save for a specific goal with a 'sinking fund': decide the total and the deadline, then divide. Want $3,000 for a trip in 10 months? That's $300/month - automate it into a separate savings account so it's untouchable. Seeing a dedicated balance grow is far more motivating than a vague 'general savings,' and it keeps the splurge guilt-free because you planned for it.";
    }

    // ===== RAISE / EXTRA MONEY / SURPLUS / WHAT TO DO WITH MONEY =====
    if (has("got a raise", "just got a raise", "pay raise", "promotion", "more money now")) {
      return "Congrats! The wealth-building move is to avoid lifestyle inflation - the #1 trap from The Millionaire Next Door. Bank at least half of every raise before you adjust your spending. If your raise is $500/month, send $250+ straight to savings or investing automatically. You were living fine before; let the gap become wealth instead of a bigger apartment.";
    }
    if (has("extra money", "extra cash", "surplus", "leftover", "what should i do with", "what to do with", "spare money", "found money", "bonus")) {
      var order = "When you have extra money, follow this proven order:\n\n1. High-interest debt (credit cards above ~15%) - pay it off, it's a guaranteed return.\n2. Emergency fund - 3 to 6 months of expenses in a high-yield savings account.\n3. Employer 401k match - free money, never leave it.\n4. Invest the rest - max a Roth IRA, then low-cost index funds.";
      if (surplus > 0) order += "\n\nYou're running a surplus of about " + dollars(surplus) + " - that's exactly the fuel for these steps.";
      return order;
    }

    // ===== SAVINGS RATE HEALTH =====
    if (has("savings rate", "saving rate", "am i saving enough", "doing well", "doing good", "healthy", "good rate", "on track", "how am i doing")) {
      if (savings >= 30) return "Your savings rate of " + savings + "% is outstanding - elite territory. The FIRE movement targets 40%+, but above 30% you're building wealth fast. The key now: make sure that surplus is invested, not sitting in cash losing value to inflation.";
      if (savings >= 20) return "A " + savings + "% savings rate is excellent - beating the 20% standard from the 50/30/20 rule. Morgan Housel argues your savings rate matters more than your investment returns early on, so you're doing the most important thing right. Next: put that surplus to work in index funds.";
      if (savings >= 10) return "At " + savings + "% you're ahead of most people, but there's room to hit 20%. Look at " + (topCat && topCat.val > 0 ? topCat.name + " (" + dollars(topCat.val) + ", your biggest expense)" : "your largest category") + " and try trimming 10-15%.";
      if (savings > 0) return "You're saving " + savings + "%, which is positive - good start. The target is 20%. Your fastest lever is your biggest expense: " + (topCat && topCat.val > 0 ? topCat.name + " at " + dollars(topCat.val) : "your top category") + ". Cutting it by a fifth would move your rate noticeably.";
      return "Right now you're spending everything you earn or more. The Richest Man in Babylon's first rule: pay yourself first - keep at least 10% before any spending. Automate a small payday transfer to savings, then attack your largest expense.";
    }

    // ===== SAVE MORE =====
    if (has("save more", "how to save", "how do i save", "save money", "spend less", "cut spending", "reduce spending", "cut back", "lower my expenses")) {
      return "Three high-impact moves to save more:\n\n1. Attack your biggest category - " + (topCat && topCat.val > 0 ? topCat.name + " is your largest at " + dollars(topCat.val) + ". A 20% cut saves " + dollars(topCat.val * 0.2) + "/period." : "find your top expense and trim it first.") + "\n\n2. Automate it - auto-transfer to savings on payday so you pay yourself first. You can't spend what you don't see.\n\n3. The 24-hour rule - wait a day before any non-essential buy over $50. Most impulse purchases evaporate.";
    }

    // ===== IRREGULAR INCOME =====
    if (has("irregular income", "freelance", "self employed", "variable income", "commission", "gig", "uneven income", "1099")) {
      return "Budgeting on irregular income: (1) figure out your bare-minimum monthly need - that's your baseline, (2) in good months, don't spend the surplus - park it in a buffer account, (3) pay yourself a steady 'salary' from that buffer so lean months feel normal, (4) save aggressively when work is flush. Set aside ~25-30% of each payment for taxes since they're not withheld. The buffer is everything.";
    }

    // ===== BUDGET / 50-30-20 =====
    if (has("budget", "50/30/20", "50 30 20", "allocate", "how much should i spend", "spending plan")) {
      if (income > 0) return "The 50/30/20 rule on your " + dollars(income) + " income:\n\n- Needs (rent, food, utilities): " + dollars(Math.round(income * 0.5)) + "\n- Wants (dining, fun): " + dollars(Math.round(income * 0.3)) + "\n- Savings and debt: " + dollars(Math.round(income * 0.2)) + "\n\nYou're spending " + dollars(expense) + " total now. Check the Budgets tab to spot categories over their limit - that's where to focus.";
      return "The 50/30/20 framework: 50% of income to needs, 30% to wants, 20% to savings and debt. Ramit Sethi's twist: spend lavishly on the few things you love, cut hard everywhere else. Add income data and I'll give you exact dollar targets.";
    }

    // ===== EMERGENCY FUND =====
    if (has("emergency", "rainy day", "safety net", "cushion", "lose my job", "job loss")) {
      var ef = monthlySpend > 0 ? monthlySpend : 1000;
      return "An emergency fund is your foundation - Dave Ramsey and Ramit Sethi both say build it before investing. Target 3-6 months of expenses. Based on your spending of " + dollars(monthlySpend) + ", aim for " + dollars(ef * 3) + " to " + dollars(ef * 6) + ". Keep it in a high-yield savings account: liquid, separate, earning a little interest.";
    }

    // ===== INVEST (general - after specific account/stock/crypto checks) =====
    if (has("invest", "index fund", "etf", "portfolio", "stock market", "grow my money", "where to put money")) {
      var base = "Investing basics from people who've done it:\n\n1. Buffett's pick for most people: a low-cost S&P 500 index fund - it beats ~90% of active managers over 10 years.\n2. Order of operations: employer 401k match first (free money), then Roth IRA, then taxable brokerage.\n3. Time in the market beats timing the market - start now, stay consistent, don't panic-sell.";
      if (surplus > 0) base += "\n\nYou have ~" + dollars(surplus) + " surplus - that's the fuel, once your emergency fund is set.";
      return base;
    }

    // ===== DEBT =====
    if (has("debt", "loan", "credit card", "owe", "pay off", "in the red", "minimum payment")) {
      return "Two proven debt strategies:\n\n- Avalanche (saves most money): pay minimums on all, attack the highest-interest debt first.\n- Snowball (Dave Ramsey, best for motivation): pay the smallest balance first for quick wins and momentum.\n\nNon-negotiable: clear any credit card debt above ~15% interest before investing - no investment reliably beats that guaranteed return from killing the interest.";
    }

    // ===== HOUSE =====
    if (has("house", "home", "mortgage", "down payment", "property", "real estate")) {
      return "Buying a home: aim for 20% down to avoid PMI, and keep total housing under 28% of gross income (the classic lender rule). Kiyosaki's caution: your primary home is a liability until it earns income - house hacking (renting a room or unit) flips that. Save the down payment in a separate high-yield account so it doesn't mix with daily money.";
    }

    // ===== RENT VS BUY =====
    if (has("rent or buy", "rent vs buy", "renting or buying", "should i rent")) {
      return "Rent vs buy isn't just about 'throwing money away' on rent. Buying makes sense if you'll stay 5+ years (transaction costs are huge), you have 20% down plus an emergency fund, and the mortgage fits under 28% of income. Renting wins if you value flexibility, the local price-to-rent ratio is high, or you'd be stretched thin. Run the numbers for YOUR city - in many markets renting and investing the difference beats owning.";
    }

    // ===== CAR =====
    if (has("car", "vehicle", "auto loan", "lease", "truck")) {
      var carNote = "The Millionaire Next Door found most millionaires drive used cars bought with cash. A new car loses 20%+ of value the moment you drive off the lot. Rule of thumb: buy used, pay cash if you can, keep total car costs (payment, insurance, gas) under 15% of take-home. A lease is usually the most expensive option long-term.";
      var m = q.match(/\$?\s*([0-9][0-9,]{3,})/);
      if (m) {
        var price = parseFloat(m[1].replace(/,/g, ""));
        var maxCar = income * 12 * 0.35;
        carNote += "\n\nOn a $" + price.toLocaleString() + " car: a common ceiling is ~35% of annual income on a vehicle. At your income that's about " + dollars(maxCar) + ", so " + (price <= maxCar ? "it's within a reasonable range - just favor used and avoid a long loan." : "that's on the high side - consider a cheaper or used option to protect your savings rate.");
      }
      return carNote;
    }

    // ===== RETIREMENT / FIRE =====
    if (has("retire", "fire", "financial independence", "pension", "how much to retire", "retirement")) {
      var annual = monthlySpend * 12;
      var fireNum = annual > 0 ? annual * 25 : 0;
      var msg = "Financial independence runs on the 4% rule: you can safely withdraw 4% of your portfolio yearly, so your target number is ~25x annual expenses.";
      if (fireNum > 0) msg += " At your current spending that's roughly " + dollars(fireNum) + ". A common savings guideline is 15% of income for a normal retirement; higher gets you there sooner - save 50% and you could retire in ~17 years regardless of income.";
      return msg;
    }

    // ===== INCOME / SIDE HUSTLE / NEGOTIATE =====
    if (has("make more money", "earn more", "side hustle", "side income", "second job", "increase income", "negotiate", "ask for a raise", "higher salary")) {
      return "Naval Ravikant's core idea: you won't get rich renting out your time - build or earn equity in something that scales. Practical moves: (1) negotiate your salary, the highest-ROI hour you'll ever spend - even a 10% bump compounds for your whole career, (2) build 'specific knowledge' that's hard to train, (3) start a side income that can grow without your hours. Cutting costs has a floor; earning has no ceiling.";
    }

    // ===== INFLATION =====
    if (has("inflation", "cost of living", "prices going up", "money worth less")) {
      return "Inflation quietly erodes cash sitting idle - that's why the wealthy hold appreciating assets, not stacks of cash. Keep only your emergency fund in cash (in a high-yield account that partly keeps pace), and invest the rest so your money grows faster than prices rise. Historically, stocks have been one of the best long-term inflation hedges.";
    }

    // ===== FINANCIAL ADVISOR =====
    if (has("financial advisor", "should i hire", "wealth manager", "planner", "professional help")) {
      return "Most people don't need to pay for one early on - the basics (spend less than you earn, kill high-interest debt, index funds, max tax-advantaged accounts) you can do yourself. If you do hire one, choose a fee-only fiduciary (legally bound to act in your interest) and avoid anyone earning commissions on what they sell you. Fees compound against you: 1% a year can cost six figures over a lifetime.";
    }

    // ===== BUDGETING APP / TOOLS =====
    if (has("budgeting app", "best app", "tool", "track spending", "software")) {
      return "You're using one right now - track every transaction here and check your Budgets tab. The best tool is the one you'll actually use consistently. The principle behind all of them is the same: awareness changes behavior. Just seeing where your money goes each week is often enough to naturally cut waste.";
    }

    // ===== RICH MINDSET =====
    if (has("rich", "wealthy", "wealth", "millionaire", "billionaire", "get rich", "stay rich", "money mindset")) {
      return "The uncomfortable truth from The Millionaire Next Door: most millionaires look ordinary - modest homes, used cars, no flash. Morgan Housel: wealth is what you DON'T see, the purchases never made. The formula isn't complex: earn, keep a wide gap between income and spending, invest that gap consistently, and let compounding work for decades. Get-rich-quick is usually how people get poor quick.";
    }

    // ===== HOW MUCH / AFFORD (generic, after specific car/house) =====
    if (has("how much", "afford", "can i buy", "too expensive")) {
      return "General affordability guardrails: housing under 28% of income, total debt payments under 36%, save 20%+. On your " + dollars(income) + " income, keep essentials around " + dollars(Math.round(income * 0.5)) + " and protect at least " + dollars(Math.round(income * 0.2)) + " for savings. Tell me the specific purchase and I'll think it through with you.";
    }

    // ===== TIP =====
    if (has("tip", "gratuity", "how much to tip")) {
      return "Standard US tipping: 18-20% at sit-down restaurants, 15-20% for rideshares and delivery, $1-2 per drink at a bar, 15-20% for haircuts. Budgeting tip: if you dine out often, factor tips into your Food/Entertainment budget - at 20%, they add up faster than people expect.";
    }

    // ===== MOTIVATION / DISCIPLINE / STICKING TO BUDGET =====
    if (has("stick to", "discipline", "motivat", "give up", "keep failing", "cant stop", "willpower", "hard to", "struggle")) {
      return "Discipline beats willpower - so remove the need for it. Automate savings so it happens before you can spend. Think and Grow Rich stresses a definite goal with a deadline; vague intentions fail. Pick one concrete target - save " + dollars(Math.round((income || 1000) * 0.2)) + " this month - automate it, and let the system carry you instead of relying on motivation.";
    }

    // ===== INTELLIGENT GENERAL ENGINE (handles anything) =====
    // Detect question type and sentiment to compose a real reply.
    var isQuestion = q.indexOf("?") !== -1 || has("what", "how", "why", "when", "where", "who", "which", "should i", "can i", "is it", "are ", "do i", "does ", "will ", "would ", "could ");
    var isYesNo = has("should i", "can i", "is it worth", "is it good", "is it bad", "do you think", "would you", "is this");

    // --- Emotional / venting ---
    if (has("stressed", "anxious", "worried", "scared", "overwhelmed", "depressed", "broke", "poor", "struggling financially", "cant afford", "can't afford", "paycheck to paycheck", "no money")) {
      return "I hear you - money stress is heavy, and you're not alone in it. Let's make it smaller and concrete. First, list your absolute essentials (housing, food, utilities, minimum debt payments). Everything above that is where we find breathing room. Even setting aside $10 builds the habit and the sense of control. What's the one bill or expense weighing on you most right now? We'll start there.";
    }
    if (has("hate budgeting", "boring", "too hard", "confusing", "dont understand", "don't understand", "lost", "complicated")) {
      return "Totally fair - most budgeting advice is needlessly complicated. Here's the whole thing in one line: spend less than you earn, and put the difference somewhere it grows. That's it. Start by just tracking what you spend for one week here - no judgment, no rules. Awareness alone changes behavior. Want me to set up a dead-simple plan for you?";
    }
    if (has("good job", "proud", "i did it", "i saved", "paid off", "reached my goal", "hit my goal")) {
      return "That's genuinely worth celebrating - well done. Progress like this compounds, both in your balance and your confidence. The key now is to lock in the habit: keep the same routine going so this becomes your normal, not a one-time win. What's the next goal you want to aim at?";
    }

    // --- Opinion / yes-no questions get a real stance ---
    if (isYesNo) {
      if (has("worth it", "good idea", "smart")) {
        return "It depends on the trade-off, so here's how I'd decide it: does this purchase or choice move you toward your goals or away from them? A useful test from Ramit Sethi - spend freely on the few things you genuinely love, and cut hard on everything else. If this is one of your few true priorities and it fits your budget without touching savings or debt payments, it's likely worth it. If it's a passing want, sleep on it 24 hours. Tell me the specifics and I'll give you a sharper read.";
      }
    }

    // --- General money/life questions: give a thoughtful, useful answer ---
    if (has("subscription", "subscriptions", "recurring", "cancel")) {
      return "Subscriptions are the silent budget killer - they're designed to be forgotten. Do a quarterly audit: list every recurring charge, then for each ask 'have I used this in the last month?' Cancel anything that's a no. People commonly find $50-100/month of forgotten subscriptions. That's $600-1,200 a year back in your pocket.";
    }
    if (has("grocery", "groceries", "food cost", "eating out", "restaurant", "takeout", "meal")) {
      return "Food is usually the most controllable big expense. Practical wins: plan meals before shopping and stick to a list, cook in batches, and treat eating out as a planned treat rather than a default. Cutting restaurant spending is often the single fastest way to boost your savings rate without feeling deprived - cooking the same meal at home typically costs a quarter of the restaurant price.";
    }
    if (has("salary", "paid", "wage", "income", "make a year", "earn a year")) {
      return "Whatever you earn, the rule that builds wealth is the same: the gap between income and spending is what matters, not the income alone. Plenty of high earners are broke and plenty of modest earners retire rich - it comes down to the savings rate. That said, raising income has no ceiling, so negotiating your pay and building valuable skills is worth real effort. Want tips on negotiating a raise?";
    }
    if (has("bank", "savings account", "checking", "high yield", "hysa", "interest rate")) {
      return "Keep your money in the right buckets: a checking account for monthly spending, and a high-yield savings account (HYSA) for your emergency fund and short-term goals. A HYSA pays meaningfully more interest than a regular savings account for the exact same safety - there's no reason to leave your emergency fund earning nothing. For money you won't need for 5+ years, investing beats any savings account.";
    }
    if (has("insurance", "insure", "premium", "deductible")) {
      return "Insurance is about protecting against catastrophe, not small stuff. Carry what protects you from financial ruin (health, auto liability, renters/home, and term life if people depend on you), and skip the gimmicky add-ons. Raising your deductible lowers your premium - worth it if you have an emergency fund to cover that deductible. Review premiums yearly and get competing quotes; loyalty rarely pays.";
    }
    if (has("loan", "borrow", "finance", "interest")) {
      return "Before borrowing, separate good debt from bad. Debt that buys an appreciating asset or boosts income (a reasonable mortgage, sometimes education) can make sense. Debt for consumption - cars beyond your means, vacations, gadgets on a credit card - quietly drains wealth. If you must borrow, get the lowest rate you can, read the terms, and have a clear payoff plan before you sign.";
    }

    // --- Non-finance / off-topic: stay in character, redirect warmly ---
    if (!isQuestion && q.split(" ").length <= 3) {
      // Short ambiguous input - ask for clarity rather than dumping a summary
      return "Tell me a bit more and I'll help. You can ask me anything about your money - saving, spending, budgeting, investing, debt, big purchases, or just 'where should I start?' What's on your mind, " + (props.username ? props.username : "friend") + "?";
    }
    if (has("weather", "sports", "movie", "music", "game", "joke", "love", "relationship", "cook", "recipe")) {
      return "Ha - I'm Richard, your finance guy, so that's a bit outside my lane. But I'm great with anything money-related: saving, investing, budgets, debt, big purchases, retirement. What can I help you sort out financially?";
    }

    // --- Genuine attempt at any remaining question ---
    if (isQuestion) {
      var lead = "Good question. ";
      var body = "Here's how I'd think about it through a money lens: every financial decision comes down to whether it widens or narrows the gap between what you earn and what you spend. ";
      var personal = "";
      if (income > 0 || expense > 0) {
        personal = "For context, you're at " + dollars(income) + " income and " + dollars(expense) + " spent (" + savings + "% saved). ";
      }
      var close = "If you give me the specifics - the amount, the goal, or the choice you're weighing - I can run the actual numbers with you. What are you trying to decide?";
      return lead + body + personal + close;
    }

    // --- Final catch-all: warm, useful, never robotic ---
    var parts = [];
    parts.push("I want to make sure I help with the right thing.");
    if (income > 0 || expense > 0) parts.push("Right now you're at " + dollars(income) + " in, " + dollars(expense) + " out, saving " + savings + "%.");
    parts.push("Ask me anything - how to save more, build a budget, invest, tackle debt, plan a big purchase, or just 'where do I start?' I've got you.");
    return parts.join(" ");
  }

  function callClaude(messages, system, maxTokens, callback) {
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens || 800,
        system: system,
        messages: messages,
      }),
    }).then(function(res) {
      return res.text().then(function(raw) {
        var data;
        try { data = JSON.parse(raw); } catch(e) {
          callback(new Error("Bad JSON from server: " + raw.slice(0, 100)), null); return;
        }
        if (data.error) {
          callback(new Error(data.error.type + ": " + data.error.message), null); return;
        }
        if (!data.content || !Array.isArray(data.content)) {
          callback(new Error("Unexpected response: " + JSON.stringify(data).slice(0, 100)), null); return;
        }
        var text = "";
        for (var i = 0; i < data.content.length; i++) {
          if (data.content[i].type === "text") text += data.content[i].text;
        }
        callback(null, text.trim());
      });
    }).catch(function(err) { callback(new Error("Fetch failed: " + err.message), null); });
  }

  function getAdvice() {
    setLoading(true); setAdvice(null); setErrMsg("");
    var system = "You are an elite personal finance advisor trained on the wisdom of the world's greatest wealth builders. You have deep knowledge from:\n\nBOOKS & AUTHORS:\n- The Psychology of Money (Morgan Housel): wealth is about behavior not intelligence; saving is about the gap between ego and income; reasonable beats rational\n- Rich Dad Poor Dad (Robert Kiyosaki): assets put money in pocket, liabilities take it out; buy assets first, luxuries last; make money work for you\n- The Millionaire Next Door (Stanley & Danko): most millionaires live below their means, drive used cars, avoid lifestyle inflation\n- I Will Teach You To Be Rich (Ramit Sethi): automate savings, negotiate bills, spend extravagantly on things you love but cut mercilessly elsewhere\n- The Total Money Makeover (Dave Ramsey): debt snowball, emergency fund first, live on less than you earn\n- Think and Grow Rich (Napoleon Hill): definiteness of purpose, the mastermind principle, persistence\n- The Richest Man in Babylon (George Clason): pay yourself first 10%, let savings work, live on 70%, give 20% to debts\n- Money Master the Game (Tony Robbins): asset allocation drives 90% of returns, fees kill wealth, asymmetric risk/reward\n\nINTERVIEWS & QUOTES FROM THE WEALTHY:\n- Warren Buffett: do not save what is left after spending, spend what is left after saving; rule 1 never lose money, rule 2 never forget rule 1; someone is sitting in the shade today because someone planted a tree long ago\n- Charlie Munger: invert always invert; avoid what destroys wealth as much as seeking what builds it; the best thing a human being can do is to help another human being know more\n- Ray Dalio: diversify well and you can reduce risk without reducing returns; pain plus reflection equals progress; he who lives by the crystal ball will eat shattered glass\n- Naval Ravikant: earn with your mind not your time; specific knowledge cannot be taught; build or buy equity in a business\n- Warren Buffett on compounding: the snowball: compound interest is the eighth wonder of the world\n- Mark Cuban: pay off credit cards every month, never carry a balance; savings rates matter more than investment returns early on\n- Grant Cardone: the middle class saves to retire, the wealthy invest to create income now; 40% of income saved minimum\n- Jeff Bezos: focus on what will not change, not what will; think in long time horizons\n- Elon Musk: take as much risk as you can afford, you only live once\n\nPROVEN STRATEGIES:\n- Pay yourself first: automate 10-20% savings before touching income\n- The latte factor: small daily expenses compound into large annual costs\n- 50/30/20 rule: 50% needs, 30% wants, 20% savings and debt\n- Emergency fund: 3-6 months of expenses in liquid savings before investing\n- No lifestyle inflation: when income rises, raise savings rate not spending\n- Avoid car payments: buy used cars with cash or low financing\n- Cook more, eat out less: food is typically the fastest growing expense\n- Cancel subscriptions quarterly: audit recurring charges every 3 months\n- Negotiate everything: bills, salary, rent, insurance premiums\n- Tax efficiency: maximize retirement accounts before taxable investing\n- Index funds beat active management 90% of the time over 10 years\n- The 4% rule: you can withdraw 4% annually from a portfolio indefinitely\n- House hacking: rent part of your home to cover the mortgage\n- The one-day rule: wait 24 hours before any purchase over $50\n\nReturn ONLY valid JSON, no markdown. Use this structure: {\"score\":72,\"scoreLabel\":\"Good\",\"headline\":\"Summary here.\",\"insights\":[{\"type\":\"strength\",\"title\":\"Title\",\"body\":\"Body.\"},{\"type\":\"warning\",\"title\":\"Title\",\"body\":\"Body.\"},{\"type\":\"tip\",\"title\":\"Title\",\"body\":\"Body.\"}],\"expertQuote\":{\"quote\":\"Quote.\",\"author\":\"Author\"},\"webInsight\":{\"title\":\"Title\",\"body\":\"Body.\"}}";
    callClaude([{ role: "user", content: "Analyze these finances and give personalized advice: " + ctx }], system, 900, function(err, text) {
      setLoading(false);
      if (err) {
        // API unreachable in this environment - use built-in analysis
        setAdvice(localAnalysis());
        return;
      }
      try {
        var cleaned = text;
        var start = text.indexOf("{");
        var end = text.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          cleaned = text.slice(start, end + 1);
        }
        setAdvice(JSON.parse(cleaned));
      } catch(e) {
        // Response not parseable - use built-in analysis
        setAdvice(localAnalysis());
      }
    });
  }

  function suggestAction(response) {
    var actionLower = response.toLowerCase();
    // Detect if Richard suggested a specific action and offer to implement it
    if (actionLower.indexOf("automate") !== -1 && actionLower.indexOf("savings") !== -1) {
      return { type: "reminder", label: "Set up automatic savings transfer", icon: "spark" };
    }
    if (actionLower.indexOf("roth ira") !== -1 || actionLower.indexOf("401k") !== -1) {
      return { type: "link", label: "Open a Roth IRA or 401k", icon: "spark" };
    }
    if ((actionLower.indexOf("budget") !== -1 || actionLower.indexOf("allocate") !== -1) && actionLower.indexOf("50/30/20") !== -1) {
      return { type: "action", label: "Apply 50/30/20 to my budgets", icon: "budget", fn: "apply5030 20" };
    }
    if (actionLower.indexOf("emergency fund") !== -1 && actionLower.indexOf("$") !== -1) {
      return { type: "action", label: "Create an emergency fund goal", icon: "flag" };
    }
    if (actionLower.indexOf("cut") !== -1 && actionLower.indexOf("20%") !== -1) {
      return { type: "action", label: "Reduce top category by 20%", icon: "spark" };
    }
    if (actionLower.indexOf("24-hour rule") !== -1 || actionLower.indexOf("impulse") !== -1) {
      return { type: "reminder", label: "Set a reminder for the 24-hour rule", icon: "spark" };
    }
    return null;
  }

  function sendChat() {
    if (!input.trim() || chatLoading) return;
    var msg = input.trim();
    setInput("");
    var nc = chat.concat([{ role: "user", text: msg }]);
    setChat(nc);
    setChatLoading(true);
    callClaude(
      nc.map(function(m) { return { role: m.role === "user" ? "user" : "assistant", content: m.text }; }),
      "You are an elite personal finance advisor with deep knowledge from books like The Psychology of Money, Rich Dad Poor Dad, The Millionaire Next Door, I Will Teach You To Be Rich, The Total Money Makeover, Think and Grow Rich, The Richest Man in Babylon, and interviews with Warren Buffett, Charlie Munger, Ray Dalio, Naval Ravikant, Mark Cuban, Grant Cardone and other wealth builders. User financial snapshot: " + ctx + ". Give personalized, specific, actionable advice grounded in proven wealth-building principles. Reference relevant expert wisdom when helpful. Be concise and direct. Plain text only, no markdown.",
      500,
      function(err, text) {
        setChatLoading(false);
        var response = err || !text ? Richard(msg) : text;
        setChat(function(p) { return p.concat([{ role: "assistant", text: response }]); });
        // Check if Richard's response suggests an action
        var action = suggestAction(response);
        if (action && Math.random() > 0.7) {
          setPendingAction(action);
        }
      }
    );
  }

  var scoreColor = advice && !advice.error ? (advice.score >= 80 ? T.green : advice.score >= 60 ? T.orange : T.red) : T.orange;
  var iStyle = { strength: { bg: "rgba(52,199,89,0.1)", dot: T.green }, warning: { bg: "rgba(255,59,48,0.1)", dot: T.red }, tip: { bg: T.orangeDim, dot: T.orange } };

  return (
    <div>
      {!advice && !loading && (
        <Card style={{ padding: "28px 22px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>$</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 8 }}>AI Financial Advisor</div>
          <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.55, marginBottom: 22 }}>
            Personalized advice from Claude based on your real spending and expert financial wisdom.
          </div>
          {errMsg && (
            <div style={{ fontSize: 12, color: T.red, background: "rgba(255,59,48,0.08)", borderRadius: 10, padding: "8px 12px", marginBottom: 14, textAlign: "left" }}>
              {errMsg}
            </div>
          )}
          <button onClick={getAdvice}
            style={{ background: T.orange, color: "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: "pointer", width: "100%", boxShadow: "0 4px 14px rgba(217,121,65,0.4)" }}>
            Analyze My Finances
          </button>
        </Card>
      )}

      {loading && (
        <Card style={{ padding: "44px 22px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink2 }}>Analyzing your finances...</div>
          <div style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>This takes a few seconds</div>
        </Card>
      )}

      {advice && !advice.error && (
        <div>
          <Card style={{ padding: "20px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <RingChart value={advice.score} max={100} size={68} color={scoreColor} stroke={6} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: scoreColor }}>
                  {advice.score}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor, textTransform: "uppercase", letterSpacing: "0.07em" }}>{advice.scoreLabel}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, lineHeight: 1.35, marginTop: 3 }}>{advice.headline}</div>
              </div>
            </div>
            <button onClick={function() { setAdvice(null); getAdvice(); }}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid " + T.sep, borderRadius: 10, padding: "7px 12px", marginTop: 14, cursor: "pointer", color: T.ink2, fontSize: 13 }}>
              Refresh
            </button>
          </Card>

          <div style={{ padding: "0 4px 10px" }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>Insights</span>
          </div>
          {(advice.insights || []).map(function(ins, i) {
            var st = iStyle[ins.type] || iStyle.tip;
            return (
              <Card key={i} style={{ padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.dot, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ background: st.bg, borderRadius: 10, padding: "10px 14px", flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{ins.title}</div>
                    <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>{ins.body}</div>
                  </div>
                </div>
              </Card>
            );
          })}

          {advice.expertQuote && (
            <Card style={{ padding: "18px 20px", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontStyle: "italic", color: T.ink, lineHeight: 1.6, marginBottom: 8 }}>"{advice.expertQuote.quote}"</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase" }}>- {advice.expertQuote.author}</div>
            </Card>
          )}
        </div>
      )}

      {advice && advice.error && (
        <Card style={{ padding: "24px", textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: T.red, marginBottom: 6 }}>Analysis failed</div>
          {errMsg && <div style={{ fontSize: 12, color: T.ink3, marginBottom: 14, background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: "8px 12px", textAlign: "left" }}>{errMsg}</div>}
          <button onClick={function() { setAdvice(null); setErrMsg(""); }}
            style={{ background: T.orange, color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Try Again
          </button>
        </Card>
      )}

      <div style={{ padding: "0 4px 10px" }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>Ask Your Advisor</span>
      </div>
      <Card style={{ overflow: "hidden", marginBottom: 24 }}>
        {chat.length === 0 && (
          <div style={{ padding: "14px 16px 6px" }}>
            {["How can I save more?", "Is my savings rate healthy?", "What to do with my surplus?"].map(function(q) {
              return (
                <button key={q} onClick={function() { setInput(q); }}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "rgba(0,0,0,0.03)", border: "1px solid " + T.sep, borderRadius: 12, padding: "10px 14px", marginBottom: 8, fontSize: 14, color: T.ink2, fontFamily: UI, cursor: "pointer" }}>
                  {q}
                </button>
              );
            })}
          </div>
        )}
        {chat.length > 0 && (
          <div style={{ maxHeight: 280, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {chat.map(function(m, i) {
              return (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "82%", borderRadius: 16, padding: "10px 14px", background: m.role === "user" ? T.orange : "rgba(0,0,0,0.05)", color: m.role === "user" ? "#fff" : T.ink, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            {chatLoading && (
              <div style={{ padding: "10px 14px", background: "rgba(0,0,0,0.05)", borderRadius: 16, width: "fit-content", fontSize: 14, color: T.ink3 }}>
                Thinking...
              </div>
            )}
          </div>
        )}
        {pendingAction && (
          <div style={{ padding: "12px 12px 4px", borderTop: "0.5px solid " + T.sep, background: T.orangeDim, marginTop: 10, borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.orange, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18 }}>*</span>
              Richard suggests: {pendingAction.label}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={function() {
                if (pendingAction.type === "action") {
                  if (pendingAction.fn === "apply50/30/20") {
                    var need = Math.round((income || 3000) * 0.5);
                    var want = Math.round((income || 3000) * 0.3);
                    var save = Math.round((income || 3000) * 0.2);
                    props.onSaveBudgets([
                      { category: "Housing", limit: need * 0.4 },
                      { category: "Food", limit: need * 0.3 },
                      { category: "Transport", limit: need * 0.15 },
                      { category: "Health", limit: need * 0.08 },
                      { category: "Entertainment", limit: want * 0.6 },
                      { category: "Shopping", limit: want * 0.4 },
                    ]);
                    setChat(function(p) { return p.concat([{ role: "assistant", text: "Done! I've updated your budgets to follow the 50/30/20 rule. Check the Budgets tab to fine-tune." }]); });
                  } else if (pendingAction.label.indexOf("emergency fund") !== -1) {
                    var efTarget = Math.round((expense || 1000) * 3);
                    props.onSaveGoals(props.goals.concat([{ id: Date.now(), name: "Emergency Fund", target: efTarget, saved: 0 }]));
                    setChat(function(p) { return p.concat([{ role: "assistant", text: "Goal created: Emergency Fund of " + dollars(efTarget) + ". Start small and build it up." }]); });
                  } else if (pendingAction.label.indexOf("20%") !== -1) {
                    var topCat = CATS.map(function(c) {
                      return { name: c, val: props.tx.filter(function(t) { return t.type === "expense" && t.category === c; }).reduce(function(s, t) { return s + t.amount; }, 0) };
                    }).sort(function(a, b) { return b.val - a.val; })[0];
                    if (topCat) {
                      var newLimit = Math.round(topCat.val * 0.8);
                      props.onSaveBudgets(props.budgets.map(function(b) { return b.category === topCat.name ? { category: b.category, limit: newLimit } : b; }));
                      setChat(function(p) { return p.concat([{ role: "assistant", text: "Done! I've cut your " + topCat.name + " budget by 20% to " + dollars(newLimit) + ". You've got this." }]); });
                    }
                  }
                }
                setPendingAction(null);
              }}
                style={{ flex: 1, background: T.orange, color: "#fff", border: "none", borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Yes, do it
              </button>
              <button onClick={function() { setPendingAction(null); }}
                style={{ flex: 1, background: "rgba(0,0,0,0.1)", color: T.ink2, border: "none", borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Not now
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: chat.length > 0 ? "0.5px solid " + T.sep : "none" }}>
          <input value={input} onChange={function(e) { setInput(e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter" && !chatLoading) sendChat(); }}
            placeholder="Ask Richard anything..."
            style={{ flex: 1, border: "none", background: "rgba(0,0,0,0.04)", borderRadius: 12, padding: "10px 14px", fontSize: 14, fontFamily: UI, outline: "none", color: T.ink }} />
          <button onClick={sendChat} disabled={!input.trim() || chatLoading}
            style={{ background: input.trim() && !chatLoading ? T.orange : "rgba(0,0,0,0.1)", border: "none", borderRadius: 12, width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 18 }}>
            ^
          </button>
        </div>
      </Card>
    </div>
  );
}

function Profile(props) {
  return (
    <div>
      <Card style={{ padding: "28px 22px", marginBottom: 20, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: T.orange, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 4px 16px rgba(217,121,65,0.4)", fontSize: 32, color: "#fff" }}>
          @
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>{props.user}</div>
        <div style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>Claude Budget member</div>
      </Card>
      <button onClick={props.onLogout}
        style={{ width: "100%", background: "rgba(255,59,48,0.08)", color: T.red, border: "none", borderRadius: 16, padding: "16px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: "pointer" }}>
        Sign Out
      </button>
    </div>
  );
}

var TABS = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "budgets", label: "Budgets" },
  { id: "goals", label: "Goals" },
  { id: "advisor", label: "Advisor" },
];

var HAS_FAB = ["activity", "goals"];

export default function App() {
  var _user = useState(null);
  var user = _user[0]; var setUser = _user[1];
  var _tab = useState("overview");
  var tab = _tab[0]; var setTab = _tab[1];
  var _tx = useState([]);
  var tx = _tx[0]; var setTx = _tx[1];
  var _bud = useState([]);
  var budgets = _bud[0]; var setBudgets = _bud[1];
  var _gls = useState([]);
  var goals = _gls[0]; var setGoals = _gls[1];
  var _sh = useState(false);
  var sheet = _sh[0]; var setSheet = _sh[1];

  useEffect(function() {
    var u = STORE.getSession();
    if (u) {
      var data = STORE.getUser(u);
      if (data) {
        setTx(data.tx || []);
        setBudgets(data.budgets || DEFAULT_BUDGETS);
        setGoals(data.goals || []);
        setUser(data.displayName || u);
      } else {
        STORE.clearSession();
      }
    }
  }, []);

  function handleLogin(u, data) {
    setTx(data.tx || []);
    setBudgets(data.budgets || DEFAULT_BUDGETS);
    setGoals(data.goals || []);
    setUser(u);
  }

  function handleLogout() {
    STORE.clearSession();
    setUser(null); setTab("overview");
    setTx([]); setBudgets([]); setGoals([]);
  }

  function save(newTx, newBudgets, newGoals) {
    if (user) STORE.saveUser(user, { tx: newTx, budgets: newBudgets, goals: newGoals });
  }

  function onSaveTx(next) { setTx(next); save(next, budgets, goals); }
  function onSaveBudgets(next) { setBudgets(next); save(tx, next, goals); }
  function onSaveGoals(next) { setGoals(next); save(tx, budgets, next); }

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  var currentTab = tab;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", maxWidth: 430, margin: "0 auto", fontFamily: UI, paddingBottom: 100 }}>

      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(250,247,242,0.92)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 20px 0", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.orange, letterSpacing: "0.13em", textTransform: "uppercase" }}>Claude Budget</span>
          <button onClick={function() { setTab("profile"); }} style={{ background: "none", border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: tab === "profile" ? T.orange : "rgba(0,0,0,0.06)" }}>
            <SVGIcon id="user" size={16} color={tab === "profile" ? "#fff" : T.ink2} />
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px 14px", gap: 8 }}>
          <div style={{ background: "#fff", borderRadius: 40, padding: "7px 14px", fontSize: 13, fontWeight: 600, color: T.ink2, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "0.5px solid rgba(0,0,0,0.06)" }}>Jun 2026</div>
          <span style={{ fontSize: 20, fontWeight: 700, color: T.ink, flex: 1, textAlign: "center", letterSpacing: "-0.02em" }}>
            {currentTab === "profile" ? "Profile" : (TABS.find(function(t) { return t.id === currentTab; }) || {}).label}
          </span>
          {HAS_FAB.indexOf(currentTab) !== -1 ? (
            <button onClick={function() { setSheet(function(v) { return !v; }); }}
              style={{ background: sheet ? T.ink : "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", border: "none", borderRadius: 40, width: 36, height: 36, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: sheet ? "none" : "0 4px 12px " + T.orangeGlow, transition: "all 0.2s" }}>
              <SVGIcon id={sheet ? "plus" : "plus"} size={16} color="#fff" />
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}
        </div>
      </div>

      <div style={{ padding: "8px 16px 0" }}>
        {currentTab === "overview" && <Overview tx={tx} goals={goals} username={user} />}
        {currentTab === "activity" && <Activity tx={tx} onSaveTx={onSaveTx} sheetOpen={sheet} setSheetOpen={setSheet} />}
        {currentTab === "budgets" && <Budgets tx={tx} budgets={budgets} onSaveBudgets={onSaveBudgets} />}
        {currentTab === "goals" && <Goals goals={goals} onSaveGoals={onSaveGoals} sheetOpen={sheet} setSheetOpen={setSheet} />}
        {currentTab === "advisor" && <Advisor tx={tx} budgets={budgets} goals={goals} />}
        {currentTab === "profile" && <Profile user={user} onLogout={handleLogout} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, zIndex: 30, background: "rgba(250,246,240,0.95)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", borderTop: "0.5px solid rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-around", padding: "8px 0 28px" }}>
          {TABS.map(function(t) {
            var active = currentTab === t.id;
            return (
              <button key={t.id} onClick={function() { setTab(t.id); setSheet(false); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 12px" }}>
                <div style={{ background: active ? T.ink : "none", borderRadius: 16, padding: active ? "7px 12px" : "7px 10px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.18)" : "none" }}>
                  <SVGIcon id={t.id} size={22} color={active ? "#fff" : T.ink3} />
                </div>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? T.orange : T.ink3, letterSpacing: "0.01em" }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
