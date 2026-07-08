// Market-data proxy for the Investing feature. One endpoint, six fns:
//   GET /api/stock?fn=quote|series|series2|search|profile|news&symbol=&range=&interval=&q=
// US quotes/search/profile/news come from Finnhub (key server-side); series and
// everything TASE (.TA) / index (^) comes from Yahoo's v8 chart API, which has no
// CORS and blocks default Node user agents - hence this proxy. All provider payloads
// are normalized HERE so the client never sees a raw Finnhub/Yahoo/TwelveData shape
// and the edge cache stores small JSON. GET (not POST like chat.js) because Vercel's
// edge cache only honors s-maxage on GET - that cache is the rate-limit shield.

var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
var SYM_RE = /^[A-Z0-9.\-^]{1,12}$/;
// The only range/interval pairs the client may request (maps UI tabs 1D..All).
var RANGE_PAIRS = { "1d": "5m", "5d": "15m", "1mo": "1d", "3mo": "1d", "1y": "1d", "max": "1wk" };
// Twelve Data fallback (fn=series2): daily bars only, US only.
var TD_MAP = { "5d": ["1day", 7], "1mo": ["1day", 23], "3mo": ["1day", 66], "1y": ["1day", 253], "max": ["1week", 520] };
var YAHOO_EXCH = { TLV: "TASE", NMS: "NASDAQ", NYQ: "NYSE", PCX: "NYSE ARCA", BTS: "BATS", ASE: "AMEX" };

function isYahooSymbol(s) { return /\.TA$/.test(s) || s.charAt(0) === "^"; }

function send(res, status, cache, body) {
  res.setHeader("Cache-Control", cache || "no-store");
  res.status(status).json(body);
}
function sendData(res, fn, cache, data) { send(res, 200, cache, { ok: true, fn: fn, data: data }); }
function sendErr(res, status, code, message, provider, cache) {
  send(res, status, cache || "no-store", { ok: false, error: { code: code, message: message, provider: provider || "", status: status } });
}

// Fetch + parse defensively: upstream HTML/garbage must never leak to the client.
async function getJson(url, headers) {
  var r = await fetch(url, { headers: headers || {} });
  var text = await r.text();
  var data = null;
  try { data = JSON.parse(text); } catch (e) { /* upstream_error below */ }
  return { status: r.status, data: data };
}

function yahooChartUrl(symbol, range, interval) {
  return "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol) +
    "?range=" + range + "&interval=" + interval + "&includePrePost=false";
}

// Unwrap a Yahoo v8 chart payload. Applies the agorot fix EXACTLY ONCE, here:
// TASE equities quote in agorot (currency "ILA") - divide by 100, report "ILS".
// The string "ILA" never leaves this function; the client has no /100 branch.
function unwrapYahoo(json) {
  var r = json && json.chart && json.chart.result && json.chart.result[0];
  if (!r || !r.meta) return null;
  var meta = r.meta;
  var factor = meta.currency === "ILA" ? 0.01 : 1;
  var currency = meta.currency === "ILA" ? "ILS" : (meta.currency || "USD");
  var ts = r.timestamp || [];
  var q = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {};
  var closes = q.close || [];
  var opens = q.open || [];
  var points = [];
  for (var i = 0; i < ts.length; i++) {
    if (closes[i] == null) continue; // Yahoo pads halts/holidays with nulls
    points.push({ t: ts[i] * 1000, c: Math.round(closes[i] * factor * 10000) / 10000 });
  }
  var firstOpen = null, hi = null, lo = null;
  for (var j = 0; j < ts.length; j++) {
    if (firstOpen == null && opens[j] != null) firstOpen = opens[j] * factor;
    if (closes[j] != null) {
      if (hi == null || closes[j] > hi) hi = closes[j];
      if (lo == null || closes[j] < lo) lo = closes[j];
    }
  }
  return {
    meta: meta,
    factor: factor,
    currency: currency,
    points: points,
    firstOpen: firstOpen,
    candleHigh: hi != null ? hi * factor : null,
    candleLow: lo != null ? lo * factor : null,
    price: meta.regularMarketPrice != null ? meta.regularMarketPrice * factor : null,
    prevClose: meta.chartPreviousClose != null ? meta.chartPreviousClose * factor
      : (meta.previousClose != null ? meta.previousClose * factor : null),
    dayHigh: meta.regularMarketDayHigh != null ? meta.regularMarketDayHigh * factor : null,
    dayLow: meta.regularMarketDayLow != null ? meta.regularMarketDayLow * factor : null,
    asOf: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
    name: meta.longName || meta.shortName || "",
    exchange: meta.fullExchangeName || meta.exchangeName || ""
  };
}

function downsample(points, cap) {
  if (points.length <= cap) return points;
  var stride = Math.ceil(points.length / cap);
  var out = [];
  for (var i = 0; i < points.length; i += stride) out.push(points[i]);
  if (out[out.length - 1].t !== points[points.length - 1].t) out.push(points[points.length - 1]);
  return out;
}

function round4(n) { return Math.round(n * 10000) / 10000; }

async function yahooQuote(symbol) {
  var r = await getJson(yahooChartUrl(symbol, "1d", "15m"), { "User-Agent": UA, "Accept": "application/json" });
  if (r.status === 429 || r.status === 999) return { err: "rate_limited", status: 429 };
  if (!r.data) return { err: "upstream_error", status: 502 };
  var u = unwrapYahoo(r.data);
  if (!u || u.price == null) return { err: "not_found", status: 404 };
  var prevClose = u.prevClose;
  var change = prevClose != null ? u.price - prevClose : 0;
  return {
    quote: {
      symbol: symbol,
      price: round4(u.price),
      prevClose: prevClose != null ? round4(prevClose) : null,
      open: u.firstOpen != null ? round4(u.firstOpen) : null,
      high: u.dayHigh != null ? round4(u.dayHigh) : (u.candleHigh != null ? round4(u.candleHigh) : null),
      low: u.dayLow != null ? round4(u.dayLow) : (u.candleLow != null ? round4(u.candleLow) : null),
      change: round4(change),
      changePct: prevClose ? round4((change / prevClose) * 100) : 0,
      currency: u.currency,
      delayed: true,
      asOf: u.asOf,
      source: "yahoo"
    }
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "GET") { sendErr(res, 405, "bad_request", "Method not allowed"); return; }

  var fn = String(req.query.fn || "");
  if (["quote", "series", "series2", "search", "profile", "news"].indexOf(fn) === -1) {
    sendErr(res, 400, "bad_request", "Unknown fn"); return;
  }

  var symbol = String(req.query.symbol || "").trim().toUpperCase();
  if (fn !== "search") {
    if (!SYM_RE.test(symbol)) { sendErr(res, 400, "bad_request", "Bad symbol"); return; }
  }

  var finnhubKey = process.env.FINNHUB_API_KEY;

  try {
    // ---- quote ----------------------------------------------------------
    if (fn === "quote") {
      var qCache = "public, s-maxage=20, stale-while-revalidate=40";
      if (!isYahooSymbol(symbol)) {
        if (!finnhubKey) { sendErr(res, 500, "config_error", "FINNHUB_API_KEY is not set."); return; }
        var fq = await getJson("https://finnhub.io/api/v1/quote?symbol=" + encodeURIComponent(symbol) + "&token=" + finnhubKey);
        var d = fq.data;
        // All-zeros means Finnhub doesn't know it; fall through to Yahoo, which
        // covers more listings, before declaring not_found.
        if (fq.status === 200 && d && d.c && d.t) {
          var change = d.c - d.pc;
          sendData(res, "quote", qCache, {
            symbol: symbol, price: round4(d.c), prevClose: round4(d.pc), open: round4(d.o),
            high: round4(d.h), low: round4(d.l), change: round4(change),
            changePct: d.pc ? round4((change / d.pc) * 100) : 0,
            currency: "USD", delayed: false, asOf: d.t * 1000, source: "finnhub"
          });
          return;
        }
        if (fq.status === 429) { sendErr(res, 429, "rate_limited", "Finnhub rate limit", "finnhub"); return; }
      }
      var yq = await yahooQuote(symbol);
      if (yq.quote) { sendData(res, "quote", qCache, yq.quote); return; }
      if (yq.err === "not_found") { sendErr(res, 404, "not_found", "Unknown symbol", "yahoo", "public, s-maxage=60"); return; }
      sendErr(res, yq.status, yq.err, "Quote unavailable", "yahoo"); return;
    }

    // ---- series (Yahoo, all symbols) ------------------------------------
    if (fn === "series") {
      var range = String(req.query.range || "");
      var interval = String(req.query.interval || "");
      if (RANGE_PAIRS[range] !== interval) { sendErr(res, 400, "bad_request", "Bad range/interval"); return; }
      var sCache = (range === "1d" || range === "5d")
        ? "public, s-maxage=60, stale-while-revalidate=120"
        : "public, s-maxage=3600, stale-while-revalidate=86400";
      var sr = await getJson(yahooChartUrl(symbol, range, interval), { "User-Agent": UA, "Accept": "application/json" });
      if (sr.status === 429 || sr.status === 999) { sendErr(res, 429, "rate_limited", "Yahoo rate limit", "yahoo"); return; }
      if (!sr.data) { sendErr(res, 502, "upstream_error", "Bad upstream payload", "yahoo"); return; }
      var su = unwrapYahoo(sr.data);
      if (!su || !su.points.length) { sendErr(res, 404, "not_found", "No data for symbol/range", "yahoo", "public, s-maxage=60"); return; }
      sendData(res, "series", sCache, {
        symbol: symbol, currency: su.currency, range: range, interval: interval,
        prevClose: su.prevClose != null ? round4(su.prevClose) : null,
        points: downsample(su.points, 600), delayed: true, source: "yahoo"
      });
      return;
    }

    // ---- series2 (Twelve Data fallback, US daily bars only) -------------
    if (fn === "series2") {
      var range2 = String(req.query.range || "");
      if (isYahooSymbol(symbol) || !TD_MAP[range2]) { sendErr(res, 400, "bad_request", "series2 is US daily ranges only"); return; }
      var tdKey = process.env.TWELVEDATA_API_KEY;
      if (!tdKey) { sendErr(res, 500, "config_error", "TWELVEDATA_API_KEY is not set."); return; }
      var td = await getJson("https://api.twelvedata.com/time_series?symbol=" + encodeURIComponent(symbol) +
        "&interval=" + TD_MAP[range2][0] + "&outputsize=" + TD_MAP[range2][1] + "&apikey=" + tdKey);
      var tdd = td.data;
      // Twelve Data reports errors as HTTP 200 + {status:"error"} - check the field.
      if (!tdd || tdd.status === "error" || !tdd.values) {
        var tdCode = tdd && tdd.code;
        if (tdCode === 429) { sendErr(res, 429, "rate_limited", "Twelve Data rate limit", "twelvedata"); return; }
        if (tdCode === 400 || tdCode === 404) { sendErr(res, 404, "not_found", "Unknown symbol", "twelvedata", "public, s-maxage=60"); return; }
        sendErr(res, 502, "upstream_error", (tdd && tdd.message) || "Bad upstream payload", "twelvedata"); return;
      }
      var pts = [];
      for (var i = tdd.values.length - 1; i >= 0; i--) { // TD returns newest-first
        var v = tdd.values[i];
        var t = Date.parse(v.datetime + "T00:00:00Z");
        var c = parseFloat(v.close);
        if (!isNaN(t) && !isNaN(c)) pts.push({ t: t, c: round4(c) });
      }
      sendData(res, "series", "public, s-maxage=3600, stale-while-revalidate=86400", {
        symbol: symbol, currency: (tdd.meta && tdd.meta.currency) || "USD", range: range2,
        interval: TD_MAP[range2][0] === "1week" ? "1wk" : "1d",
        prevClose: null, points: downsample(pts, 600), delayed: true, source: "twelvedata"
      });
      return;
    }

    // ---- search (Finnhub US + Yahoo merged) ------------------------------
    if (fn === "search") {
      var q = String(req.query.q || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
      if (!q || q.length > 32) { sendErr(res, 400, "bad_request", "Bad query"); return; }
      var jobs = [];
      jobs.push(finnhubKey
        ? getJson("https://finnhub.io/api/v1/search?q=" + encodeURIComponent(q) + "&exchange=US&token=" + finnhubKey)
        : Promise.resolve({ status: 0, data: null }));
      jobs.push(getJson("https://query1.finance.yahoo.com/v1/finance/search?q=" + encodeURIComponent(q) +
        "&quotesCount=10&newsCount=0", { "User-Agent": UA, "Accept": "application/json" }));
      var settled = await Promise.allSettled(jobs);
      var fhRes = settled[0].status === "fulfilled" ? settled[0].value : { data: null };
      var yhRes = settled[1].status === "fulfilled" ? settled[1].value : { data: null };

      var bySym = {}; var order = [];
      var fhTypes = { "Common Stock": 1, "ETP": 1, "ETF": 1, "ADR": 1, "REIT": 1 };
      var fhList = (fhRes.data && fhRes.data.result) || [];
      for (var a = 0; a < fhList.length; a++) {
        var fr = fhList[a];
        if (!fr.symbol || !fhTypes[fr.type] || !SYM_RE.test(fr.symbol)) continue;
        var k1 = fr.symbol.toUpperCase();
        if (!bySym[k1]) { bySym[k1] = { symbol: k1, name: fr.description || k1, exchange: "US", currency: "USD", source: "finnhub" }; order.push(k1); }
      }
      var yhTypes = { EQUITY: 1, ETF: 1, MUTUALFUND: 1 };
      var yhList = (yhRes.data && yhRes.data.quotes) || [];
      for (var b = 0; b < yhList.length; b++) {
        var yr = yhList[b];
        var ys = (yr.symbol || "").toUpperCase();
        if (!ys || !yhTypes[yr.quoteType] || !SYM_RE.test(ys)) continue;
        // Keep US listings (no exchange suffix) and TASE; drop other foreign suffixes.
        if (ys.indexOf(".") !== -1 && !/\.TA$/.test(ys)) continue;
        var exch = YAHOO_EXCH[yr.exchange] || yr.exchDisp || yr.exchange || "";
        if (bySym[ys]) { if (bySym[ys].exchange === "US" && exch) bySym[ys].exchange = exch; continue; }
        bySym[ys] = { symbol: ys, name: yr.shortname || yr.longname || ys, exchange: exch, currency: /\.TA$/.test(ys) ? "ILS" : "USD", source: "yahoo" };
        order.push(ys);
      }
      var qUp = q.toUpperCase();
      function rank(row) {
        var tier = row.symbol === qUp ? 0 : row.symbol.indexOf(qUp) === 0 ? 1 : 2;
        return tier * 4 + (/\.TA$/.test(row.symbol) ? 2 : 0) + (row.source === "finnhub" ? 0 : 1);
      }
      var results = order.map(function (k) { return bySym[k]; })
        .sort(function (x, y) { return rank(x) - rank(y); })
        .slice(0, 12);
      sendData(res, "search", "public, s-maxage=86400", { results: results });
      return;
    }

    // ---- profile ---------------------------------------------------------
    if (fn === "profile") {
      var pCache = "public, s-maxage=86400";
      if (!isYahooSymbol(symbol)) {
        if (!finnhubKey) { sendErr(res, 500, "config_error", "FINNHUB_API_KEY is not set."); return; }
        var pf = await getJson("https://finnhub.io/api/v1/stock/profile2?symbol=" + encodeURIComponent(symbol) + "&token=" + finnhubKey);
        var pd = pf.data;
        if (!pd || !pd.name) { sendErr(res, 404, "not_found", "No profile", "finnhub", "public, s-maxage=60"); return; }
        sendData(res, "profile", pCache, {
          symbol: symbol, name: pd.name, logo: pd.logo || "", exchange: pd.exchange || "US",
          currency: pd.currency || "USD",
          marketCap: pd.marketCapitalization ? pd.marketCapitalization * 1e6 : null, // Finnhub reports millions
          industry: pd.finnhubIndustry || "", country: pd.country || "", ipo: pd.ipo || "", weburl: pd.weburl || ""
        });
        return;
      }
      var yp = await getJson(yahooChartUrl(symbol, "1d", "1d"), { "User-Agent": UA, "Accept": "application/json" });
      var pu = yp.data && unwrapYahoo(yp.data);
      if (!pu) { sendErr(res, 404, "not_found", "No profile", "yahoo", "public, s-maxage=60"); return; }
      sendData(res, "profile", pCache, {
        symbol: symbol, name: pu.name || symbol, logo: "", exchange: pu.exchange || "TASE",
        currency: pu.currency, marketCap: null, industry: "", country: symbol.charAt(0) === "^" ? "" : "IL", ipo: "", weburl: ""
      });
      return;
    }

    // ---- news (Finnhub, North-American companies only) -------------------
    if (fn === "news") {
      var nCache = "public, s-maxage=900";
      if (isYahooSymbol(symbol)) { sendData(res, "news", nCache, { items: [] }); return; }
      if (!finnhubKey) { sendErr(res, 500, "config_error", "FINNHUB_API_KEY is not set."); return; }
      var now = new Date();
      var to = now.toISOString().slice(0, 10);
      var from = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);
      var nf = await getJson("https://finnhub.io/api/v1/company-news?symbol=" + encodeURIComponent(symbol) +
        "&from=" + from + "&to=" + to + "&token=" + finnhubKey);
      if (nf.status === 429) { sendErr(res, 429, "rate_limited", "Finnhub rate limit", "finnhub"); return; }
      var list = Array.isArray(nf.data) ? nf.data : [];
      list.sort(function (x, y) { return (y.datetime || 0) - (x.datetime || 0); });
      var items = [];
      for (var n = 0; n < list.length && items.length < 10; n++) {
        var it = list[n];
        if (!it.headline || !it.url) continue;
        items.push({
          id: it.id || it.datetime, headline: it.headline, summary: it.summary || "",
          source: it.source || "", url: it.url, datetime: (it.datetime || 0) * 1000, image: it.image || ""
        });
      }
      sendData(res, "news", nCache, { items: items });
      return;
    }
  } catch (err) {
    sendErr(res, 502, "upstream_error", err.message || "Unknown error");
    return;
  }
};
