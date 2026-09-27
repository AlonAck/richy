// The grading code as it stood at 7ca9a31, before the money profile, copied
// verbatim (only wrapped so it can run here). The profile promises that an
// account which never answered the new questions reads exactly as it did;
// these are what "as it did" means, so the tests compare against the real
// old code rather than numbers written down to match a theory.

export function makeLegacyStory() {
function deriveMoneyStory(d) {
  var I = parseFloat(d.income) || 0;
  var O = parseFloat(d.overspend) || 0;
  var derived = false;
  if (O <= 0 && I > 0) { O = Math.round(I * 0.12); derived = true; }
  if (I > 0 && O > 0) O = Math.min(O, Math.round(I * 0.5));
  var leakCount = (d.leaks || []).filter(function(l) { return l !== "noidea"; }).length;
  if (O <= 0) return { mode: "minimal", leakCount: leakCount };
  var Y = O * 12, F5 = Y * 5;
  var R = Math.max(10, Math.round(O * 0.6 / 10) * 10);
  if (I > 0) R = Math.max(10, Math.min(R, Math.round(I * 0.25)));
  var RY = R * 12;
  var G = parseFloat(d.goalAmt) || 0;
  var goalMonths = G > 0 ? Math.ceil(G / R) : null;
  return { mode: "full", derived: derived, monthlyLeak: O, yearlyLeak: Y, fiveYear: F5, recoverMo: R, recoverYr: RY, goalMonths: goalMonths, goalAmt: G, leakCount: leakCount };
}
  return deriveMoneyStory;
}

export function makeLegacyMonthVerdict(tr, T) {
var MONTH_VERDICT_KEYS = { attention: "mvAttention", watch: "mvWatch", good: "mvOnTrack" };
function monthVerdict(input) {
  var v = input || {};
  var watch = v.watch || { risks: [], leaks: [] };
  var risks = watch.risks || [];
  var cliff = null, pace = [], goalRisk = null;
  risks.forEach(function(r) {
    if (r.type === "cliff") cliff = r;
    else if (r.type === "pace") pace.push(r);
    else if (r.type === "goalrisk" && !goalRisk) goalRisk = r;
  });
  var overCaps = typeof v.overCaps === "number" ? v.overCaps : pace.length;
  var savingsRate = typeof v.savingsRate === "number" ? v.savingsRate : 0;
  var hasIncome = !!v.hasIncome;

  var level, score, reason;
  if (cliff) {
    level = "attention"; score = 35;
    reason = cliff.title || "";
  } else if (overCaps > 0) {
    level = "watch"; score = 58;
    reason = pace.length ? pace[0].title : "";
  } else if (goalRisk) {
    level = "watch"; score = 62;
    reason = goalRisk.title || "";
  } else if (hasIncome && savingsRate < 0) {
    level = "attention"; score = 40;
    reason = "";
  } else if (hasIncome && savingsRate < 10) {
    level = "watch"; score = 66;
    reason = "";
  } else {
    level = "good";
    score = savingsRate >= 20 ? 88 : 78;
    reason = "";
  }
  return {
    level: level,
    score: score,
    label: tr(MONTH_VERDICT_KEYS[level]),
    reason: reason,
    signals: (watch.risks || []).length,
    // The one tone every surface uses, so the colour never disagrees with the
    // word next to it either.
    tone: level === "attention" ? T.red : level === "watch" ? T.gold : T.green,
    heroTone: level === "attention" ? T.heroNeg : level === "watch" ? T.gold : T.heroPos
  };
}
  return monthVerdict;
}

export function legacySuggestBudgets(income, essentials, leaks) {
  function leakTrimmed() {
    var hit = { c5: false, c6: false, c2: false };
    (leaks || []).forEach(function(id) {
      if (id === "goingout") hit.c5 = true;
      if (id === "delivery") { hit.c5 = true; hit.c2 = true; }
      if (id === "subs") hit.c5 = true;
      if (id === "impulse" || id === "shopping") hit.c6 = true;
    });
    return hit;
  }
  function suggestBudgets() {
    var inc = parseFloat(income) || 0;
    var ess = parseFloat(essentials) || 0;
    var disc = Math.max(0, inc - ess);
    var trimmed = leakTrimmed();
    var result = [];
    if (ess > 0) {
      result.push({ catId: "c1", category: "Housing",   limit: Math.round(ess * 0.50) });
      result.push({ catId: "c2", category: "Food",      limit: Math.round(ess * 0.25) });
      result.push({ catId: "c3", category: "Transport", limit: Math.round(ess * 0.15) });
      result.push({ catId: "c4", category: "Health",    limit: Math.round(ess * 0.10) });
    }
    if (disc > 0) {
      // A flagged category keeps 60% of what it would otherwise have had - a
      // real cut the user can feel, not a rounding.
      result.push({ catId: "c5", category: "Entertainment", limit: Math.round(disc * 0.35 * (trimmed.c5 ? 0.6 : 1)) });
      result.push({ catId: "c6", category: "Shopping",      limit: Math.round(disc * 0.35 * (trimmed.c6 ? 0.6 : 1)) });
      result.push({ catId: "c11",category: "Other",         limit: Math.round(disc * 0.10) });
    }
    return result.filter(function(b) { return b.limit > 0; });
  }
  return suggestBudgets();
}

// Advisor's localAnalysis (the offline month read), its grading part: the
// score, label, first two insights and the headline, verbatim. `savings`,
// `topName`, `topVal` and `dollars` were closure variables there.
export function legacyLocalRead(savings, topName, topVal, dollars) {
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
    var headline = savings >= 20 ? "Great work, your finances are on a strong footing." : savings >= 0 ? "You are on track, with room to save more." : "Time to rein in spending and rebuild your cushion.";
    return { score: score, label: label, insights: insights, headline: headline };
}
