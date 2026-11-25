/* Sbírka příkladů: shared app for every subject (core/boot.js loads it after data/<subject>/).
   Pochopit (vysvětlení, schéma se zvýrazněním) a Procvičit (kroky k výpočtu) v jedné aplikaci.
   Každá otázka v Procvičit odkazuje na krok vysvětlení (tabulka LINK) a naopak. Postup se ukládá do localStorage. */
(function () {
"use strict";

var SB = window.SBIRKA, SUBJ = window.SUBJECT || {};
var KEY = SB.key;
/* Progress handed over from the old address (machmar-claude.github.io/nai-sbirka redirects here with #mig=…&go=…):
   taken only when this browser has nothing saved here yet. The hash never reaches a server. */
(function () {
  var m = /^#mig=([^&]*)(?:&go=(.*))?$/.exec(location.hash) || /^#go=(.*)$/.exec(location.hash);
  if (!m) return;
  var go = m.length > 2 ? m[2] : m[1], data = m.length > 2 ? m[1] : "";
  try {
    if (data && !localStorage.getItem(KEY)) {
      var json = decodeURIComponent(escape(atob(decodeURIComponent(data))));
      if (JSON.parse(json) && typeof JSON.parse(json) === "object") localStorage.setItem(KEY, json);
    }
  } catch (e) {}
  history.replaceState(null, "", location.pathname + location.search + (go ? "#" + decodeURIComponent(go) : ""));
})();
var NAI_EX = window.NAI_EX || [], PATTERNS = window.PATTERNS || {}, TAHAK = window.TAHAK || [], LINK = window.LINK || {};

var COL = { r: "#e5484d", o: "#ef6c00", b: "#1e88e5", g: "#2e9e5b", p: "#8e44ad", k: "#d6409f", t: "#00979c", y: "#b38600", s: "#546e7a" };
var CHAP = {}, CH_ORDER = [];
(SUBJ.chapters || []).forEach(function (c) { CHAP[c[0]] = c[1]; CH_ORDER.push(c[0]); });
$("#brand").textContent = SUBJ.brand || "";
$("#brandsub").textContent = SUBJ.sub || "";
function chapOf(m) { return m.num.indexOf(".") > 0 ? m.num.split(".")[0] : m.num.replace(/[0-9]+$/, ""); }
function idxOf(m) { return m.num.indexOf(".") > 0 ? Number(m.num.split(".")[1]) : Number(m.num.replace(/^[^0-9]+/, "")); }

var MPC = window.MPC.slice().sort(function (a, b) {
  return CH_ORDER.indexOf(chapOf(a)) - CH_ORDER.indexOf(chapOf(b)) || idxOf(a) - idxOf(b);
});
var PROBS = MPC.map(function (m) {
  var nai = NAI_EX.find(function (e) { return e.id === m.num; }) || null;
  return { id: m.num, m: m, nai: nai, img: m.img ? SB.dir + m.img : null, w: m.w, h: m.h, link: nai ? (LINK[m.num] || null) : null, ch: chapOf(m) };
});

/* ---------- state + persistence ---------- */
var st = { view: "ex", pi: 0, mode: "learn", ns: 0, pf: null, showall: false, allhl: false,
           known: {}, prog: {}, patFocus: null, theme: null, lastId: null, q: "", confirmReset: false };
var DR = { open: false, top: 120, w: 380, h: 420 }; /* formula drawer geometry, px */
var PD = { open: false, top: 560, w: 420, h: 360 }; /* scratchpad drawer, starts below the formulas */

function pg(p) {
  return st.prog[p.id] || (st.prog[p.id] = { ok: [], rev: [], hint: [], val: [], fb: [], plot: false, zk: "" });
}
function snapshot() {
  var prog = {};
  Object.keys(st.prog).forEach(function (k) {
    var s = st.prog[k];
    var any = s.plot || s.zk || s.zkp || [s.ok, s.rev, s.hint, s.val, s.fb].some(function (a) { return a.some(function (x) { return !!x; }); });
    if (any) prog[k] = s;
  });
  var known = {};
  Object.keys(st.known).forEach(function (k) { if (st.known[k]) known[k] = true; });
  return { v: 1, prog: prog, known: known, last: PROBS[st.pi].id, mode: st.mode, ns: st.ns, theme: st.theme, drawer: DR, pad: PD };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(snapshot())); } catch (e) {}
}
/* sanitise one saved/imported progress record against the real number of steps */
function cleanProg(p, src) {
  if (!src || typeof src !== "object") return null;
  var n = p.m.steps.length, o = { ok: [], rev: [], hint: [], val: [], fb: [], plot: !!src.plot, zk: typeof src.zk === "string" ? src.zk.slice(0, 4000) : "", zkp: src.zkp === true };
  function at(a, i) { return Array.isArray(a) ? a[i] : undefined; }
  for (var i = 0; i < n; i++) {
    o.ok[i] = at(src.ok, i) === true; o.rev[i] = at(src.rev, i) === true; o.hint[i] = at(src.hint, i) === true;
    var v = at(src.val, i); o.val[i] = typeof v === "string" ? v.slice(0, 40) : "";
    var f = at(src.fb, i); o.fb[i] = f === "ok" || f === "bad" || f === "warn" ? f : null;
  }
  return o;
}
function mergeProg(dst, c, n) {
  for (var i = 0; i < n; i++) {
    dst.ok[i] = !!dst.ok[i] || c.ok[i]; dst.rev[i] = !!dst.rev[i] || c.rev[i]; dst.hint[i] = !!dst.hint[i] || c.hint[i];
    if (!dst.val[i]) dst.val[i] = c.val[i];
    dst.fb[i] = dst.ok[i] ? "ok" : (dst.fb[i] || c.fb[i]);
  }
  dst.plot = !!dst.plot || c.plot;
  if (!dst.zk) dst.zk = c.zk;
  dst.zkp = !!dst.zkp || c.zkp;
}
function mergeState(src) {
  var changed = 0;
  if (!src || typeof src !== "object" || !src.prog || typeof src.prog !== "object") return -1;
  PROBS.forEach(function (p) {
    var c = cleanProg(p, src.prog[p.id]);
    if (c) { mergeProg(pg(p), c, p.m.steps.length); changed++; }
    if (src.known && src.known[p.id] === true) st.known[p.id] = true;
  });
  return changed;
}
function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (!raw) return;
    var s = JSON.parse(raw);
    if (!s || typeof s !== "object") return;
    mergeState(s);
    /* The page always opens in Pochopit; the saved mode is not restored. */
    if (s.theme === "light" || s.theme === "dark") st.theme = s.theme;
    [["drawer", DR], ["pad", PD]].forEach(function (x) {
      var o = s[x[0]];
      if (!o || typeof o !== "object") return;
      ["top", "w", "h"].forEach(function (k) { if (isFinite(o[k])) x[1][k] = +o[k]; });
      x[1].open = o.open === true;
    });
    var i = PROBS.findIndex(function (p) { return p.id === s.last; });
    if (i >= 0) { st.pi = i; st.lastId = PROBS[i].id; if (typeof s.ns === "number" && s.ns >= 0) st.ns = s.ns | 0; }
  } catch (e) {}
}

/* ---------- helpers ---------- */
function $(s) { return document.querySelector(s); }
function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function fmt(t) { return esc(t).replace(/_\{([^}]+)\}/g, "<sub>$1</sub>").replace(/_([A-Za-z0-9]+)/g, "<sub>$1</sub>"); }
/* Answers: a bare number is in the field's unit; a prefix and/or unit after it is converted, so "125", "125k", "125 kΩ"
   and "0,125M" are all 125 in a kΩ field. "m"/"M" count as both milli and mega: the answer is right if either fits. */
var SIP = { p: [1e-12], n: [1e-9], u: [1e-6], "µ": [1e-6], "μ": [1e-6], m: [1e-3, 1e6], k: [1e3], g: [1e9] };
var SIP_EXACT = { p: 1e-12, n: 1e-9, "µ": 1e-6, "μ": 1e-6, u: 1e-6, m: 1e-3, k: 1e3, M: 1e6, G: 1e9 };
function prefixOf(part, exact) {
  if (!part) return [1];
  if (exact) { var f = SIP_EXACT[part[0]]; return f != null && part.length > 1 ? [f] : [1]; } /* the field's own unit, e.g. "kΩ", "MHz" */
  return SIP[part[0].toLowerCase()] || [1];
}
/* factors of a unit like "kΩ", "µA/V", "V/µs" relative to the base unit (numerator prefix / denominator prefix) */
function unitFactors(u, exact) {
  var parts = String(u).split("/"), num = prefixOf(parts[0], exact), den = prefixOf((parts[1] || "").replace(/^√/, ""), exact), out = [];
  num.forEach(function (a) { den.forEach(function (b) { out.push(a / b); }); });
  return out;
}
/* powers of ten: "×10^-19", "·10⁻¹⁹", "*10(-19)" in what you type mean e-19 */
var SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };
var POW10 = /[·×x*]10(?:\^\(?([-+]?\d+)\)?|([⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+))/i;
/* "1/s" and "s⁻¹" are the same unit; written as a separate word so "0,021/m" stays 0,021 /m */
function perUnit(s) { return s.replace(/(^|\s)1\/([A-Za-zµμΩ]+)\s*$/, "$1$2⁻¹"); }
function powExp(m) { return m[1] || m[2].replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/g, function (c) { return SUP[c]; }); }
function ansValues(raw, unit) {
  /* a field in "×10⁻¹⁹ J": the answer is the number in front of the power (3,14), the whole value is right too */
  var u = perUnit(String(unit || "").trim()).replace(/\s+/g, "").replace(/[−–]/g, "-"), pm = new RegExp("^" + POW10.source, "i").exec(u), pw = 1;
  if (pm) { pw = Math.pow(10, +powExp(pm)); u = u.slice(pm[0].length); }
  var t = perUnit(String(raw).trim()).replace(/\s+/g, "").replace(/[−–]/g, "-").replace(",", ".").replace(new RegExp(POW10.source, "gi"), function () { return "e" + powExp(arguments); });
  var vs, num = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;
  /* the field's own unit written after the number, also one the prefix rules can't read ("1/m", "kg·m/s", "m⁻³");
     checked first so "0,02 1/m" is 0,02 and not 0,021 /m */
  if (u && t.length > u.length && t.slice(-u.length) === u && num.test(t.slice(0, -u.length))) vs = [parseFloat(t.slice(0, -u.length))];
  else {
    var m = /^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)(.*)$/i.exec(t);
    if (!m || (m[2] && !/^[a-zµμΩω√%°\/⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺·]+$/i.test(m[2]))) return null;
    var v = parseFloat(m[1]);
    if (!m[2]) return pm ? [v, v / pw] : [v]; /* bare number: in the field's unit, or the whole value */
    var fu = unitFactors(u, true)[0];
    vs = unitFactors(m[2], false).map(function (f) { return v * f / fu; });
  }
  return pm ? vs.map(function (x) { return x / pw; }) : vs;
}
(function () { /* self-check of the cases above */
  function has(r, x) { return !!r && r.some(function (v) { return Math.abs(v - x) < 1e-9 * Math.max(1, Math.abs(x)); }); }
  console.assert(has(ansValues("125", "kΩ"), 125) && has(ansValues("125k", "kΩ"), 125) && has(ansValues("125 kohm", "kΩ"), 125) && has(ansValues("0,125M", "kΩ"), 125) && has(ansValues("125 kΩ", "kΩ"), 125), "ansValues kΩ");
  console.assert(has(ansValues("2m", "MΩ"), 2) && has(ansValues("2m", "mV"), 2) && has(ansValues("3u", "µA/V"), 3) && has(ansValues("5V/us", "V/µs"), 5) && ansValues("abc", "V") === null, "ansValues prefixes");
  var J = "×10⁻¹⁹ J";
  console.assert(has(ansValues("3,14", J), 3.14) && has(ansValues("3,14e-19", J), 3.14) && has(ansValues("3,14e-19 J", J), 3.14) && has(ansValues("3,14·10^-19 J", J), 3.14) && has(ansValues("3,14 ×10⁻¹⁹ J", J), 3.14) && has(ansValues("3,14*10^(-19)", J), 3.14), "ansValues ×10ⁿ");
  console.assert(has(ansValues("5,19", "×10⁻² s⁻¹"), 5.19) && has(ansValues("0,0519 s⁻¹", "×10⁻² s⁻¹"), 5.19) && has(ansValues("1,02e-27 kg·m/s", "×10⁻²⁷ kg·m/s"), 1.02) && has(ansValues("6,02e5", "×10⁵"), 6.02), "ansValues ×10ⁿ units");
  console.assert(has(ansValues("0,02 1/m", "1/m"), 0.02) && !has(ansValues("0,02 1/m", "1/m"), 0.021) && has(ansValues("333 1/s", "1/s"), 333) && has(ansValues("5 m", "m"), 5) && has(ansValues("32,1°", "°"), 32.1), "ansValues own unit");
  console.assert(has(ansValues("5,19e-2 1/s", "×10⁻² s⁻¹"), 5.19) && has(ansValues("333 s⁻¹", "1/s"), 333) && has(ansValues("0,02 m⁻¹", "1/m"), 0.02) && has(ansValues("1,82e13 m⁻³", "×10¹³ m⁻³"), 1.82) && !!ansValues("1,82e13 m⁻³", ""), "ansValues 1/x = x⁻¹");
})();
function solved(p, i) { var s = pg(p); return !!(s.ok[i] || s.rev[i]); }
function frontier(p) { for (var i = 0; i < p.m.steps.length; i++) if (!solved(p, i)) return i; return p.m.steps.length; }
function doneCount(p) { var c = 0; for (var i = 0; i < p.m.steps.length; i++) if (solved(p, i)) c++; return c; }
function focusIdx(p) { var n = p.m.steps.length; if (st.pf != null && st.pf < n && st.pf <= frontier(p)) return st.pf; return Math.min(frontier(p), n - 1); }
function pinsHtml(p) {
  var h = "", zp = !!pg(p).zkp;
  for (var i = 0; i < p.m.steps.length; i++) h += '<i class="' + (solved(p, i) ? "on" : "") + '"></i>';
  /* the last mark is Zkouška: a diamond (a milestone), filled once every result in it was right */
  h += '<i class="zk' + (zp ? " on" : "") + '"></i>';
  return '<span class="pins" aria-label="' + doneCount(p) + " z " + p.m.steps.length + " kroků, zkouška " + (zp ? "splněna" : "nesplněna") + '">' + h + "</span>";
}
function curMode(p) { return st.mode === "exam" ? "exam" : p.nai ? st.mode : "practice"; }
function nsClamp(p) { if (p.nai) st.ns = Math.max(0, Math.min(st.ns, p.nai.steps.length - 1)); else st.ns = 0; }
function typeset(el) {
  if (window.MathJax && MathJax.typesetPromise) {
    try { MathJax.typesetClear([el]); } catch (e) {}
    MathJax.typesetPromise([el]).catch(function () {});
  }
}
window.__typeset = function () { typeset($("#main")); typeset($("#dbody")); };
function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

/* where the schematic is drawn on: a grid of cells with the share of dark pixels, as a summed-area table, so labels go
   where they cover the least. Built once per picture; until it is ready labels are placed by geometry alone. */
var INKMAP = {};
function inkMap(p) {
  var m = INKMAP[p.img];
  if (m) return typeof m === "object" ? m : null;
  INKMAP[p.img] = 1;
  var im = new Image();
  im.onload = function () {
    try {
      var nw = im.naturalWidth, nh = im.naturalHeight, cv = document.createElement("canvas");
      cv.width = nw; cv.height = nh;
      var cx = cv.getContext("2d"); cx.drawImage(im, 0, 0);
      var px = cx.getImageData(0, 0, nw, nh).data, gw = 200, gh = Math.max(1, Math.round(gw * nh / nw)), cnt = new Float32Array(gw * gh);
      for (var y = 0; y < nh; y++) {
        var row = Math.min(gh - 1, (y * gh / nh) | 0) * gw;
        for (var x = 0; x < nw; x++) { var o = (y * nw + x) * 4; if (px[o + 3] > 128 && Math.min(px[o], px[o + 1], px[o + 2]) < 170) cnt[row + Math.min(gw - 1, (x * gw / nw) | 0)]++; }
      }
      var G = gw + 1, sat = new Float32Array(G * (gh + 1)), cell = (nw / gw) * (nh / gh);
      for (var j = 0; j < gh; j++) for (var i = 0; i < gw; i++) sat[(j + 1) * G + i + 1] = cnt[j * gw + i] / cell + sat[j * G + i + 1] + sat[(j + 1) * G + i] - sat[j * G + i];
      INKMAP[p.img] = { gw: gw, gh: gh, sat: sat };
      ovRefresh(p);
    } catch (e) { INKMAP[p.img] = 2; } /* no pixel access (opened as a file): geometry only */
  };
  im.onerror = function () { INKMAP[p.img] = 2; };
  im.src = p.img;
  return null;
}
/* share of the rectangle (picture units) that is drawn on, 0..1 */
function inkIn(m, W, H, x, y, w, h) {
  var i0 = Math.max(0, Math.floor(x / W * m.gw)), i1 = Math.min(m.gw, Math.ceil((x + w) / W * m.gw));
  var j0 = Math.max(0, Math.floor(y / H * m.gh)), j1 = Math.min(m.gh, Math.ceil((y + h) / H * m.gh));
  if (i1 <= i0 || j1 <= j0) return 0;
  var G = m.gw + 1, s = m.sat;
  return (s[j1 * G + i1] - s[j0 * G + i1] - s[j1 * G + i0] + s[j0 * G + i0]) / ((i1 - i0) * (j1 - j0));
}
function ovRefresh(p) {
  if (st.view !== "ex" || PROBS[st.pi] !== p) return;
  var s = document.querySelector("#main .paper svg.ov");
  if (s) s.outerHTML = overlay(p.w, p.h, overlayItems(p, curMode(p)).items, INKMAP[p.img]).svg;
}
function rectHit(o, x, y, w, h, m) { return x < o[0] + o[2] + m && o[0] < x + w + m && y < o[1] + o[3] + m && o[1] < y + h + m; }

/* ---------- schematic overlay (from NAI průvodce) ---------- */
function overlay(W, H, items, ink) {
  var sx = W / 100, sy = H / 100, fs = Math.max(22, Math.round(Math.max(W, H) / 34));
  var defs = "<defs>";
  for (var k in COL) defs += '<marker id="ah-' + k + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + COL[k] + '"/></marker>';
  defs += "</defs>";
  var g = "", lbl = "", used = {}, shapes = [], reqs = [], named = {};
  function req(t, c, A) {
    if (named[c + t]) return; /* the same part in several steps ("zvýraznit vše") gets one label */
    named[c + t] = true; reqs.push({ t: t, c: c, A: A });
  }
  (items || []).forEach(function (it) {
    if (!it) return;
    var ck = it.c || "r", c = COL[ck] || ck;
    used[ck] = used[ck] || [];
    if (it.t) used[ck].push(it.t);
    if (it.b) {
      var X = it.b[0] * sx, Y = it.b[1] * sy, WW = it.b[2] * sx, HH = it.b[3] * sy;
      g += '<rect class="ov-box" x="' + X + '" y="' + Y + '" width="' + WW + '" height="' + HH + '" rx="' + fs * .1 + '" fill="' + c + '" fill-opacity="0.07" stroke="' + c + '" stroke-width="' + fs * .1 + '"/>';
      shapes.push([X, Y, WW, HH]);
      if (it.t) req(it.t, c, [X, Y, WW, HH]);
    }
    if (it.a) {
      var pts = it.a.map(function (q) { return [q[0] * sx, q[1] * sy]; }), bh = fs * .21, best = -1, A = null;
      var d = "M" + pts.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" L");
      g += '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-opacity=".25" stroke-width="' + fs * .42 + '" stroke-linejoin="round" stroke-linecap="round"/>';
      g += '<path class="ov-arrow" d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + fs * .2 + '" stroke-dasharray="' + fs * .75 + " " + fs * .45 + '" style="--dp:' + -fs * 1.2 + '" stroke-linejoin="round" marker-end="url(#ah-' + ck + ')"/>';
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1], r = [Math.min(a[0], b[0]) - bh, Math.min(a[1], b[1]) - bh, Math.abs(b[0] - a[0]) + 2 * bh, Math.abs(b[1] - a[1]) + 2 * bh];
        shapes.push(r);
        var L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L > best) { best = L; A = r; } /* the label goes beside the longest segment */
      }
      if (it.t && A) req(it.t, c, A);
    }
    if (it.n) {
      var NX = it.n[0] * sx, NY = it.n[1] * sy, nr = fs * .45;
      g += '<circle class="ov-box" cx="' + NX + '" cy="' + NY + '" r="' + nr + '" fill="' + c + '" fill-opacity=".2" stroke="' + c + '" stroke-width="' + fs * .1 + '"/>';
      shapes.push([NX - nr, NY - nr, 2 * nr, 2 * nr]);
      if (it.t) req(it.t, c, [NX - nr, NY - nr, 2 * nr, 2 * nr]);
    }
  });
  /* labels float next to what they name, with a coloured bar on their side and a thin leader line to it. Each tries spots
     around its box / segment / node and takes the one that covers the least of the drawing (from inkMap), stays off the
     other highlights and labels, and is near. */
  var f = fs * .72, lh = f * 1.3, bar = f * .2, gap = f * .3, placed = [];
  reqs.forEach(function (q) {
    var w = bar + gap + q.t.length * f * .6, h = lh, A = q.A, pick = null, cost = 1e9;
    [lh * .6, lh * 1.2, lh * 2, lh * 3.5].forEach(function (dd) {
      for (var s = 0; s <= 8; s++) {
        var fx = A[0] - w + (A[2] + w) * s / 8, fy = A[1] - h + (A[3] + h) * s / 8;
        [[fx, A[1] - dd - h], [fx, A[1] + A[3] + dd], [A[0] - dd - w, fy], [A[0] + A[2] + dd, fy]].forEach(function (r) {
          var x = r[0], y = r[1];
          if (x < 0 || y < 0 || x + w > W || y + h > H) return;
          var c = (ink ? inkIn(ink, W, H, x, y, w, h) * 12 : 0) + dd / lh * .35;
          placed.forEach(function (o) { if (rectHit(o, x, y, w, h, f * .25)) c += 100; });
          shapes.forEach(function (o) { if (rectHit(o, x, y, w, h, 0)) c += 6; });
          if (c < cost) { cost = c; pick = [x, y]; }
        });
      }
    });
    if (!pick) pick = [Math.max(0, Math.min(A[0], W - w)), Math.max(0, Math.min(A[1] - h, H - h))];
    var x = pick[0], y = pick[1];
    placed.push([x, y, w, h]);
    /* the bar is on the label's left or right side, whichever is nearer what it names; the leader runs from the bar to
       the nearest point of it */
    var right = x + w / 2 < A[0] + A[2] / 2, lx = right ? x + w : x, ly = y + h / 2;
    var ex = Math.max(A[0], Math.min(lx, A[0] + A[2])), ey = Math.max(A[1], Math.min(ly, A[1] + A[3]));
    lbl += '<path d="M' + lx.toFixed(1) + "," + ly.toFixed(1) + " L" + ex.toFixed(1) + "," + ey.toFixed(1) + '" stroke="' + q.c + '" stroke-width="' + (f * .09).toFixed(1) + '"/><circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="' + (f * .14).toFixed(1) + '" fill="' + q.c + '"/>';
    lbl += '<rect x="' + (right ? x + w - bar : x).toFixed(1) + '" y="' + (y + h * .1).toFixed(1) + '" width="' + bar.toFixed(1) + '" height="' + (h * .8).toFixed(1) + '" fill="' + q.c + '"/>' +
      '<text class="ov-t" x="' + (right ? x + w - bar - gap : x + bar + gap).toFixed(1) + '"' + (right ? ' text-anchor="end"' : "") + ' y="' + (y + h / 2 + f * .36).toFixed(1) + '" font-size="' + f.toFixed(1) + '" fill="' + q.c + '" stroke="#fff" stroke-width="' + (f * .22).toFixed(1) + '" paint-order="stroke">' + esc(q.t) + "</text>";
  });
  return { svg: '<svg class="ov" viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + defs + g + lbl + "</svg>", used: used };
}
function resolve(e, list) { return (list || []).map(function (x) { return typeof x === "string" ? (e.parts && e.parts[x]) : x; }).filter(Boolean); }

/* ---------- search ---------- */
function hay(p) {
  if (p.hay) return p.hay;
  var parts = [p.id, p.m.id, p.m.title, p.m.task, p.m.kind];
  if (p.nai) {
    parts.push(p.nai.title, p.nai.task);
    (p.nai.pat || []).forEach(function (k) { parts.push(PATTERNS[k] ? PATTERNS[k].name : k); });
  }
  p.hay = norm(parts.join(" ").replace(/<[^>]+>/g, " ").replace(/\$/g, "").replace(/\\[a-zA-Z]+/g, " ").replace(/[{}_^\\]/g, ""));
  return p.hay;
}
function matches(p) {
  var q = norm(st.q).trim();
  if (!q) return true;
  var h = hay(p);
  return q.split(/\s+/).every(function (t) { return h.indexOf(t) >= 0; });
}

/* ---------- sidebar ---------- */
function renderSide() {
  /* a subject without Vzory / tahák / Bloky data gets no tab for them */
  var tabs = [["ex", "Příklady"], ["vzory", "Vzory", Object.keys(PATTERNS).length], ["tahak", "Co na tahák", TAHAK.length], ["bloky", "Bloky", BLOKY.length]].filter(function (t) { return t.length < 3 || t[2]; });
  $("#tabs").innerHTML = tabs.map(function (t) { return '<button type="button" data-tab="' + t[0] + '" aria-current="' + (t[0] === st.view) + '">' + t[1] + "</button>"; }).join("");
  var h = "", last = null, shown = 0;
  /* Mobile strip: each chapter is a tile; only the open chapter's problems show (CSS hides .fold). Search shows all matches. */
  if (!st.openCh) st.openCh = PROBS[st.pi].ch;
  var folding = !st.q;
  if (st.view !== "ex") { h = sideCards(); shown = h ? 1 : 0; }
  else PROBS.forEach(function (p, i) {
    if (!matches(p)) return;
    shown++;
    if (p.ch !== last) {
      h += '<li class="group">' + CHAP[p.ch] + "</li>";
      if (folding) {
        var inCh = PROBS.filter(function (x) { return x.ch === p.ch; });
        var knCh = inCh.filter(function (x) { return st.known[x.id]; }).length, open = st.openCh === p.ch;
        h += '<li class="chtile"><button type="button" data-chap="' + p.ch + '" aria-expanded="' + open + '"><span class="n">' + p.ch + '</span><span class="t">' + CHAP[p.ch] + '</span><span class="k"><span>' + inCh.length + " příkladů · umím " + knCh + "</span><span>" + (open ? "▾ otevřeno" : "▸ otevřít") + "</span></span></button></li>";
      }
      last = p.ch;
    }
    var k = pinsHtml(p) + (st.known[p.id] ? '<span class="known">✓ umím</span>' : "") + "<span>" + esc(p.m.kind) + "</span>";
    h += '<li' + (folding && p.ch !== st.openCh ? ' class="fold"' : "") + '><button type="button" data-pi="' + i + '" aria-current="' + (st.view === "ex" && i === st.pi) + '"><span class="n">' + p.id + '</span><span class="t">' + fmt(p.m.title) + '</span><span class="k">' + k + "</span></button></li>";
  });
  if (!shown) h = '<li class="nores">Nic nenalezeno.</li>';
  $("#list").innerHTML = h;
  var kn = PROBS.filter(function (p) { return st.known[p.id]; }).length;
  var tot = 0, dn = 0; PROBS.forEach(function (p) { tot += p.m.steps.length; dn += doneCount(p); });
  $("#prog").textContent = "Umím: " + kn + " / " + PROBS.length + " · kroků: " + dn + " / " + tot;
  var cf = $("#confirm");
  cf.innerHTML = st.confirmReset
    ? '<div class="confirm"><p>Opravdu smazat veškerý postup v tomto prohlížeči? Nejde to vrátit zpět. Předem si ho můžeš exportovat.</p><div><button class="btn danger" type="button" data-sys="reset-yes">Ano, smazat</button><button class="btn" type="button" data-sys="reset-no">Zrušit</button></div></div>'
    : "";
}
/* on Vzory, Co na tahák and Bloky the list is that page's items: patterns grouped by the chapter they first appear in,
   tahák rows by priority, blocks as one list */
function sideCards() {
  var q = norm(st.q).trim(), h = "", last = null, n = 0, items;
  if (st.view === "vzory") {
    items = Object.keys(PATTERNS).map(function (k) {
      var ps = PROBS.filter(function (p) { return p.nai && p.nai.pat.indexOf(k) >= 0; }), ch = ps.length ? ps[0].ch : "";
      return { a: "data-pat", k: k, name: PATTERNS[k].name, cnt: ps.length, ch: ch, g: CHAP[ch], cur: st.patFocus === k };
    });
    items.sort(function (a, b) { return CH_ORDER.indexOf(a.ch) - CH_ORDER.indexOf(b.ch); }); /* stable: keeps the page's order within a chapter */
  } else if (st.view === "tahak") {
    items = TAHAK.map(function (t, i) { return { a: "data-tk", k: i, name: t.n || t.d.replace(/<[^>]+>/g, ""), cnt: t.ex.length, g: "Priorita " + t.p, cur: false }; });
  } else {
    items = BLOKY.map(function (b) { return { a: "data-blk", k: b.k, name: b.name, cnt: Object.keys(blkUse()[b.k].pis).length, g: "", cur: false }; });
  }
  items.forEach(function (it) {
    n++;
    if (q && q.split(/\s+/).some(function (t) { return norm(it.name).indexOf(t) < 0; })) return;
    if (it.g && it.g !== last) { h += '<li class="group">' + it.g + "</li>"; last = it.g; }
    h += '<li><button type="button" ' + it.a + '="' + it.k + '" aria-current="' + it.cur + '"><span class="n">' + n + '</span><span class="t">' + esc(it.name) + '</span><span class="k"><span>' + (it.cnt ? it.cnt + (it.cnt === 1 ? " příklad" : it.cnt < 5 ? " příklady" : " příkladů") :"zatím v žádném příkladu") + "</span></span></button></li>";
  });
  return h;
}
function scrollListToCurrent() {
  var b = document.querySelector('#list [aria-current="true"]');
  if (!b) return;
  if (window.innerWidth <= 760) { var l = $("#list"); l.scrollLeft = Math.max(0, b.parentNode.offsetLeft - 20); }
  else { var a = document.querySelector(".app > aside"); a.scrollTop = Math.max(0, b.offsetTop - a.clientHeight / 3); }
}

/* ---------- problem page ---------- */
function headHtml(p) {
  var m = p.m;
  var src = (m.src ? "podklady " + m.src : "sbírka") + (m.page ? ", str. " + m.page : "");
  return '<header class="head"><div class="bignum">' + p.id + '</div><div class="meta"><span class="chip">' + esc(m.kind) + "</span><span>" + src + '</span></div><div class="tools">' +
    '<button class="btn ' + (st.known[p.id] ? "good" : "") + '" type="button" data-know="1">' + (st.known[p.id] ? "✓ Umím" : "Označit „umím“") + "</button>" +
    "</div><h2>" + fmt(m.title) + "</h2></header>";
}
function taskHtml(p) {
  var nai = p.nai, m = p.m;
  var h = '<section class="task" aria-label="Zadání"><div class="txt">' + (nai && nai.task ? nai.task : fmt(m.task)) + "</div>";
  if (m.given) h += '<ul class="given">' + m.given.map(function (g, i) { return '<li data-hl="g' + i + '">' + fmt(g) + "</li>"; }).join("") + "</ul>";
  var bl = blocksOf(PROBS.indexOf(p));
  if (nai && nai.pat && nai.pat.length) h += '<div class="tags">' + nai.pat.map(function (k) { return '<button class="tag" type="button" data-pat="' + k + '">' + esc(PATTERNS[k] ? PATTERNS[k].name : k) + "</button>"; }).join("") + "</div>";
  if (bl.length) h += '<div class="tags">' + bl.map(function (b) { return '<button class="tag blk" type="button" data-blk="' + b.k + '" title="Otevřít blok na stránce Bloky">▣ ' + esc(b.name) + "</button>"; }).join("") + "</div>";
  return h + "</section>";
}
function learnHtml(p) {
  var e = p.nai, st_ = "", rn = 0;
  e.steps.forEach(function (s, k) {
    var eq = "", j = 0;
    if (s.g && s.g.length) eq += s.g.map(function (x) { return '<div class="row gen" data-hl="e' + k + "." + (j++) + '">$' + x + "$</div>"; }).join("");
    if (s.eq && s.eq.length) eq += s.eq.map(function (x) { return '<div class="row" data-hl="e' + k + "." + (j++) + '">$' + x + "$</div>"; }).join("");
    var x = "";
    if (p.link) {
      var pr = [];
      p.link.forEach(function (nk, i) { if (nk === k) pr.push(i); });
      x = pr.length ? '<div class="xlinks">' + pr.map(function (i) { return '<button class="xlink" type="button" data-prac="' + i + '">Procvič: ' + fmt(p.m.steps[i].q) + " →</button>"; }).join("") + "</div>"
                    : '<p class="xnone">K tomuto kroku nic nepočítáš, jen vysvětluje zapojení.</p>';
    }
    st_ += '<li class="lstep ' + (k === st.ns ? "on" : "") + " " + (k < st.ns ? "done" : "") + '"><button class="lhead" type="button" data-k="' + k + '"><span class="n">' + (k + 1) + '</span><span class="t">' + s.t + "</span></button>" +
      '<div class="lbody">' + (s.x || "") + (eq ? '<div class="eq">' + eq + "</div>" : "") + (s.r ? '<div class="res" data-hl="e' + k + 'r">' + s.r + "</div>" : "") + (s.m ? '<div class="mem">' + s.m + "</div>" : "") + (s.w ? '<div class="warn">' + s.w + "</div>" : "") + x + "</div></li>";
  });
  return '<div class="idea"><b>Myšlenka v jedné větě:</b> ' + e.idea + "</div>" +
    '<ol class="lsteps ' + (st.showall ? "showall" : "") + '">' + st_ + "</ol>" +
    '<div class="navrow"><button class="btn" type="button" data-nav="prev">← Předchozí krok</button><button class="btn" type="button" data-nav="all">' + (st.showall ? "Sbalit kroky" : "Rozbalit všechny kroky") + '</button><button class="btn primary" type="button" data-nav="next">Další krok →</button></div>' +
    '<p class="kbd">Klávesy: → nebo mezerník další krok, ← předchozí krok, J další příklad, K předchozí příklad.</p>' +
    (e.res ? '<div class="box"><h3>Výsledky</h3><div>' + e.res.replace(/\$[^$]+\$/g, function (x) { return '<span data-hl="r' + (rn++) + '">' + x + "</span>"; }) + "</div></div>" : "") +
    tkBox(e.tk);
}
/* "Vzorce v tomto příkladu": [TeX, T = na taháku / + = doplnit / d = odvodit, note] */
function tkBox(list) {
  var tk = (list || []).map(function (t, i) {
    var cls = t[1] === "T" ? "on" : t[1] === "+" ? "add" : "der", lab = t[1] === "T" ? "na taháku" : t[1] === "+" ? "doplnit" : "odvodit";
    return '<div class="tk" data-hl="tk' + i + '"><span class="badge ' + cls + '">' + lab + "</span><div>$" + t[0] + "$" + (t[2] ? ' <span class="kbd">· ' + t[2] + "</span>" : "") + "</div></div>";
  }).join("");
  return tk ? '<div class="box"><h3>Vzorce v tomto příkladu</h3>' + tk + "</div>" : "";
}
function practiceHtml(p) {
  var m = p.m, s = pg(p), f = frontier(p), fi = focusIdx(p), C = !!(p.link && p.nai);
  var h = "";
  if (f >= m.steps.length && !st.known[p.id]) {
    var clean = m.steps.every(function (_, i) { return !s.rev[i]; });
    if (clean) h += '<div class="suggest"><span>Všechny kroky máš bez odkrytí řešení.</span><button class="btn good" type="button" data-know="1">Označit „umím“</button></div>';
  }
  h += '<ol class="psteps">';
  m.steps.forEach(function (stp, i) {
    var done = solved(p, i), locked = i > f;
    var cls = "pstep " + (done ? "done" : locked ? "locked" : "active") + (i === fi && !locked ? " focus" : "");
    var idp = "ans-" + p.id.replace(/\./g, "-") + "-" + i;
    h += '<li class="' + cls + '"><span class="node" aria-hidden="true"></span><div class="pbody">';
    h += '<button class="ptitle" type="button" data-pf="' + i + '"' + (locked ? " disabled" : "") + '><span class="step-no">Krok ' + (i + 1) + "/" + m.steps.length + "</span><h3>" + (locked ? "Odemkne se po vyřešení předchozího kroku" : fmt(stp.q)) + "</h3></button>";
    if (!locked) {
      if (stp.ans != null) {
        var fb = s.fb[i];
        h += '<div class="answer"><input id="' + idp + '" data-inp="' + i + '" inputmode="decimal" autocomplete="off" aria-label="Výsledek v ' + esc(stp.unit) + '" value="' + esc(s.val[i] || "") + '"><span class="unit">' + esc(stp.unit) + '</span><button class="btn primary" type="button" data-act="check" data-i="' + i + '">Zkontrolovat</button>' +
          (fb === "ok" ? '<span class="fb ok">Sedí</span>' : fb === "bad" ? '<span class="fb bad">Nesedí. Zkontroluj jednotku (' + esc(stp.unit) + ") nebo si vezmi nápovědu.</span>" : fb === "warn" ? '<span class="fb warn">Zadej číslo, třeba 12,5 nebo 12,5k</span>' : "") + "</div>";
      } else {
        h += '<p class="noans">Tento krok je odvození. Napiš si ho na papír a porovnej s řešením.</p>';
      }
      h += '<div class="row-actions"><button class="btn" type="button" data-act="hint" data-i="' + i + '">' + (s.hint[i] ? "Skrýt nápovědu" : "Nápověda") + '</button><button class="btn" type="button" data-act="rev" data-i="' + i + '"' + (s.rev[i] ? " disabled" : "") + ">" + (s.rev[i] ? "Řešení odkryto" : "Odkrýt řešení") + "</button>" +
        (C ? '<button class="xlink" type="button" data-nai="' + p.link[i] + '">Vysvětlení · krok ' + (p.link[i] + 1) + ": " + p.nai.steps[p.link[i]].t + "</button>" : "") + "</div>";
      if (s.hint[i]) h += '<p class="hint"><b>Nápověda.</b> ' + fmt(stp.hint) + "</p>";
      if (s.rev[i]) h += '<div class="solution"><div class="tex" data-hl="s' + i + '">\\[' + stp.tex + "\\]</div>" + (stp.why ? '<p class="why">' + fmt(stp.why) + "</p>" : "") + "</div>";
    }
    h += "</div></li>";
  });
  h += "</ol>";
  if (m.plot) {
    h += '<section class="plot"><p class="section-label">Kmitočtová charakteristika ze simulace</p><p>Graf obsahuje výsledky. Otevři ho, až budeš mít spočítané nuly, póly a zisky.</p><button class="btn" type="button" data-plot="1" style="align-self:flex-start">' + (s.plot ? "Skrýt graf" : "Zobrazit graf") + "</button>" +
      (s.plot ? '<div class="pbox"><img alt="Simulovaná kmitočtová charakteristika příkladu ' + p.id + '" src="' + SB.dir + m.plot + '" width="' + m.pw + '" height="' + m.ph + '"></div>' : "") + "</section>";
  }
  if (!p.nai) h += tkBox(m.tk); /* K problems have no Pochopit, so their formulas sit here */
  return h;
}
function overlayItems(p, mode) {
  if (!p.nai || mode === "exam") return { items: [], src: "" };
  if (st.clean) return { items: [], src: "Zobrazeno původní schéma bez zvýraznění." };
  if (mode === "learn") {
    if (st.allhl) { var a = []; p.nai.steps.forEach(function (s) { a = a.concat(resolve(p.nai, s.h)); }); return { items: a, src: "" }; }
    return { items: resolve(p.nai, p.nai.steps[st.ns] ? p.nai.steps[st.ns].h : []), src: "" };
  }
  if (p.link) {
    var k = p.link[focusIdx(p)];
    return { items: resolve(p.nai, p.nai.steps[k].h), src: "Zvýrazněno podle kroku " + (k + 1) + " vysvětlení: <b>" + p.nai.steps[k].t + "</b>" };
  }
  return { items: [], src: "" };
}
function renderExample() {
  var p = PROBS[st.pi], mode = curMode(p);
  nsClamp(p);
  var ov = overlayItems(p, mode);
  var o = p.img ? overlay(p.w, p.h, ov.items, inkMap(p)) : { svg: "", used: {} };
  var lg = "";
  for (var k in o.used) { var ts = Array.from(new Set(o.used[k])); if (ts.length) lg += '<span><i style="background:' + (COL[k] || k) + '"></i>' + esc(ts.join(", ")) + "</span>"; }
  if (ov.src) lg = '<span class="src">' + ov.src + "</span>" + lg;
  if (!lg) lg = mode === "exam" ? "<span>Ve zkoušce se ve schématu nic nezvýrazňuje.</span>" : mode === "practice" ? (p.nai ? "<span>V tomto kroku se ve schématu nic nezvýrazňuje.</span>" : "<span>K tomuto příkladu není zvýraznění, jen schéma.</span>") : "<span>V tomto kroku nic nezvýrazňuji.</span>";
  var ctl = '<div class="seg" role="group" aria-label="Režim">' +
    (p.nai ? '<button type="button" data-mode="learn" aria-pressed="' + (mode === "learn") + '">Pochopit <small>' + p.nai.steps.length + " kroků</small></button>" : "") +
    '<button type="button" data-mode="practice" aria-pressed="' + (mode === "practice") + '">Procvičit <small>' + doneCount(p) + "/" + p.m.steps.length + "</small></button>" +
    '<button type="button" data-mode="exam" aria-pressed="' + (mode === "exam") + '">Zkouška</button></div>';
  var col = '<div class="col">' + ctl + (mode === "learn" ? learnHtml(p) : mode === "exam" ? examHtml(p) : practiceHtml(p)) + "</div>";
  if (!p.img) return '<div class="sheet">' + headHtml(p) + taskHtml(p) + '<div class="grid nopic">' + col + "</div></div>"; /* a problem without a picture: steps only */
  return '<div class="sheet">' + headHtml(p) + taskHtml(p) +
    '<div class="grid"><figure class="schem"><div class="paper' + (st.tool ? " inking " + st.tool : "") + (zcur().z > 1 ? " zoomed" : "") + '" style="--ar:' + p.w + "/" + p.h + '"><div class="zoom" style="' + zStyle(zcur()) + '"><img alt="Schéma příkladu ' + p.id + '" src="' + p.img + '" width="' + p.w + '" height="' + p.h + '" draggable="false">' + o.svg + "</div>" + inkBar() +
      '<button type="button" class="zbadge" data-zreset title="Zpět na celé schéma">' + Math.round(zcur().z * 100) + " %</button>" + fsBtn() + "</div>" +
    '<figcaption class="legend">' + lg + "</figcaption>" +
    (p.nai && mode !== "exam" ? '<div class="opts">' +
      (mode === "learn" ? '<label><input type="checkbox" id="allhl" ' + (st.allhl ? "checked " : "") + (st.clean ? "disabled" : "") + "> zvýraznit vše najednou</label>" : "") +
      '<label><input type="checkbox" id="clean" ' + (st.clean ? "checked" : "") + "> Skrýt anotace</label></div>" : "") + "</figure>" +
    col + "</div></div>";
}

/* ---------- Vzory and Tahák pages ---------- */
function exLinks(ids) {
  return '<span class="exl">' + ids.map(function (id) {
    var i = PROBS.findIndex(function (p) { return p.id === id; });
    return i < 0 ? "<span>" + id + "</span>" : '<button type="button" data-go="' + i + '">' + id + "</button>";
  }).join("") + "</span>";
}
function renderVzory() {
  var h = '<div class="sheet"><header class="head"><div class="bignum">V</div><div class="meta"><span>Vzory z příkladů 2.1 až 4.19</span></div><div class="tools"></div><h2>Vzory, které se ve sbírce opakují</h2></header><div class="cards">';
  Object.keys(PATTERNS).forEach(function (k) {
    var pt = PATTERNS[k];
    var ids = PROBS.filter(function (p) { return p.nai && p.nai.pat.indexOf(k) >= 0; }).map(function (p) { return p.id; });
    h += '<div class="card ' + (st.patFocus === k ? "focus" : "") + '" id="pat-' + k + '"><h3>' + esc(pt.name) + "</h3><div>" + pt.d + "</div>" +
      (pt.f ? '<div class="eq">' + pt.f.map(function (x, i) { return '<div class="row" data-hl="v.' + k + "." + i + '">$' + x + "$</div>"; }).join("") + "</div>" : "") +
      (ids.length ? '<div><b>Příklady:</b> ' + exLinks(ids) + "</div>" : "") + "</div>";
  });
  return h + "</div></div>";
}
function renderTahak() {
  var h = '<div class="sheet"><header class="head"><div class="bignum">T</div><div class="meta"><span>Vzorce seřazené podle důležitosti</span></div><div class="tools"></div><h2>Co dopsat na tahák</h2></header>';
  var K = window.TAHAK_K; /* the subject's constants card (its own data), none when the subject has none */
  if (K && K.c && K.c.length) h += '<div class="card"><p class="section-label">' + (K.t || "Konstanty") + '</p><dl class="consts">' +
    K.c.map(function (c) { return "<div><dt>" + c[0] + "</dt><dd>" + c[1] + "</dd></div>"; }).join("") + "</dl></div>";
  h += '<div class="card"><p class="section-label">Vzorce</p><div class="tbl"><table><tr><th>Priorita</th><th>Vzorec</th><th>K čemu</th><th>Kde se použije</th></tr>';
  TAHAK.forEach(function (t, i) { h += '<tr data-hl="t' + i + '"><td><b>' + t.p + "</b></td><td>" + t.f.map(function (x) { return '<div style="padding:3px 0">$' + x + "$</div>"; }).join("") + "</td><td>" + (t.n ? "<b>" + esc(t.n) + "</b><br>" : "") + t.d + "</td><td>" + exLinks(t.ex) + "</td></tr>"; });
  return h + "</table></div></div></div>";
}

/* ---------- Bloky: circuit blocks with a schematic, formulas, variants, and crops of the problem schematics where
   each block appears (from the explanation's marked parts) ---------- */
var BLOKY = window.BLOKY || [];
/* where a block shows up: parts whose label matches g.re (each its own crop), or, for problems whose main pattern
   is in g.pat, the parts of the first explanation step ("what circuit is this?") as one crop */
function blkCrops(b) {
  var out = [], g = b.g;
  if (!g) return out;
  PROBS.forEach(function (p, pi) {
    var e = p.nai;
    if (!e || !e.parts) return;
    if (g.re) Object.keys(e.parts).forEach(function (k) { var q = e.parts[k]; if (q && q.b && q.t && g.re.test(q.t)) out.push({ pi: pi, b: q.b, t: q.t }); });
    else if (g.pat && e.pat && g.pat.indexOf(e.pat[0]) >= 0 && e.steps && e.steps[0]) {
      var bs = resolve(e, e.steps[0].h).filter(function (q) { return q.b; }).map(function (q) { return q.b; });
      if (!bs.length) return;
      var x0 = Math.min.apply(null, bs.map(function (r) { return r[0]; })), y0 = Math.min.apply(null, bs.map(function (r) { return r[1]; }));
      var x1 = Math.max.apply(null, bs.map(function (r) { return r[0] + r[2]; })), y1 = Math.max.apply(null, bs.map(function (r) { return r[1] + r[3]; }));
      out.push({ pi: pi, b: [x0, y0, x1 - x0, y1 - y0], t: "" });
    }
  });
  return out;
}
/* per block: its crops and every problem that uses it (by pattern or found on the schematic); data is static, so cached */
var BLK_USE = null;
function blkUse() {
  if (BLK_USE) return BLK_USE;
  BLK_USE = {};
  BLOKY.forEach(function (b) {
    var u = BLK_USE[b.k] = { crops: blkCrops(b), pis: {} };
    u.crops.forEach(function (c) { u.pis[c.pi] = true; });
    PROBS.forEach(function (p, pi) { if (p.nai && b.pat.some(function (k) { return p.nai.pat.indexOf(k) >= 0; })) u.pis[pi] = true; });
  });
  return BLK_USE;
}
function blocksOf(pi) { return BLOKY.filter(function (b) { return blkUse()[b.k].pis[pi]; }); }
function cropHtml(c) {
  var p = PROBS[c.pi], W = p.w, H = p.h, x = c.b[0] * W / 100, y = c.b[1] * H / 100, w = c.b[2] * W / 100, h = c.b[3] * H / 100;
  var m = Math.max(40, Math.max(w, h) * 0.35), X = Math.max(0, x - m), Y = Math.max(0, y - m), X2 = Math.min(W, x + w + m), Y2 = Math.min(H, y + h + m);
  return '<button type="button" class="bcrop" data-go="' + c.pi + '" title="Otevřít příklad ' + p.id + '"><svg viewBox="' + [X, Y, X2 - X, Y2 - Y].map(Math.round).join(" ") + '" aria-hidden="true">' +
    '<image href="' + p.img + '" width="' + W + '" height="' + H + '"/><rect x="' + Math.round(x) + '" y="' + Math.round(y) + '" width="' + Math.round(w) + '" height="' + Math.round(h) + '" rx="8" fill="#2148c4" fill-opacity=".1" stroke="#2148c4" stroke-width="' + Math.max(3, (X2 - X) / 90).toFixed(1) + '"/></svg>' +
    "<span>" + p.id + (c.t ? " · " + esc(c.t) : "") + "</span></button>";
}
function renderBloky() {
  var h = '<div class="sheet"><header class="head"><div class="bignum">B</div><div class="meta"><span>Obvodové bloky, ze kterých se skládají příklady</span></div><div class="tools"></div><h2>Bloky</h2></header>' +
    (RT ? '<p class="bhint">Pravým klikem na blok, jeho variantu nebo vzorec ho ukážeš ostatním v místnosti. Dalším pravým klikem zvýraznění zrušíš.</p>' : "") + '<div class="cards">';
  BLOKY.forEach(function (b) {
    var u = blkUse()[b.k], crops = u.crops.slice(0, 10);
    var ids = Object.keys(u.pis).map(Number).sort(function (a, c) { return a - c; }).map(function (pi) { return PROBS[pi].id; });
    h += '<section class="card blok" id="blk-' + b.k + '" data-bk="' + b.k + '"><h3>' + esc(b.name) + "</h3>" +
      '<div class="bsch">' + b.sch.map(function (x) { return "<figure>" + x[0] + (x[1] ? "<figcaption>" + esc(x[1]) + "</figcaption>" : "") + "</figure>"; }).join("") + "</div>" +
      "<p>" + b.d + '</p><div class="eq">' + b.f.map(function (x, i) { return '<div class="row" data-hl="b.' + b.k + "." + i + '">$' + x + "$</div>"; }).join("") + "</div>" +
      (b.v.length ? '<p class="section-label">Varianty</p><ul class="bvar">' + b.v.map(function (v, j) {
        return '<li data-bk="' + b.k + "." + j + '"><b>' + esc(v.n) + "</b>" + (v.d ? ": " + v.d : "") + (v.f ? ' <span class="bf" data-hl="b.' + b.k + ".v" + j + '">$' + v.f + "$</span>" : "") + "</li>";
      }).join("") + "</ul>" : "") +
      (crops.length ? '<p class="section-label">Jak vypadá ve schématech příkladů</p><div class="bcrops">' + crops.map(cropHtml).join("") + "</div>" : "") +
      (b.pat.length ? '<p class="brel"><b>Vzory:</b> ' + b.pat.filter(function (k) { return PATTERNS[k]; }).map(function (k) { return '<button type="button" class="xlink" data-pat="' + k + '">' + esc(PATTERNS[k].name) + "</button>"; }).join("") + "</p>" : "") +
      (ids.length ? '<p class="brel"><b>Příklady:</b> ' + exLinks(ids) + "</p>" : "") + "</section>";
  });
  return h + "</div></div>";
}
/* a block (or one of its variants) shown to the room stays highlighted until another one is shown, the same one is
   right-clicked again, someone leaves the Bloky page, or you leave the room */
var BON = null;
function markBlock() {
  document.querySelectorAll("#main .bon").forEach(function (el) { el.classList.remove("bon"); });
  var el = BON && st.view === "bloky" && document.querySelector('#main [data-bk="' + BON + '"]');
  if (el) el.classList.add("bon");
}
function showBlock(k) {
  BON = k || null;
  if (BON) { HON = null; markHl(); }
  if (BON && st.view !== "bloky") { st.view = "bloky"; st.patFocus = null; history.replaceState(null, "", "#bloky"); render(); }
  else markBlock();
  var el = BON && document.querySelector('#main [data-bk="' + BON + '"]');
  if (el) el.scrollIntoView({ block: "center" });
}
/* ---------- right-click a formula line, a given value or a tahák row (anything with data-hl) to show it to the room.
   One thing is shown at a time: it stays until something else is shown, the same one is right-clicked again, the room
   moves to another problem or page, or you leave the room. ---------- */
var HON = null; /* { pg: "ex:<problem id>" | "vzory" | "bloky" | "tahak", k: data-hl key } */
function hlPage() { return st.view === "ex" ? "ex:" + PROBS[st.pi].id : st.view; }
function markHl() {
  document.querySelectorAll("#main .hon").forEach(function (el) { el.classList.remove("hon"); });
  var el = HON && HON.pg === hlPage() && document.querySelector('#main [data-hl="' + HON.k + '"]');
  if (el) el.classList.add("hon");
  return el;
}
function showHl(d) {
  HON = d && d.k ? { pg: d.pg, k: d.k } : null;
  if (HON) { showFormula(-1); BON = null; markBlock(); }
  if (HON && HON.pg.slice(0, 3) !== "ex:" && st.view !== HON.pg) { /* a line on a page opens that page, like a pattern or block does */
    st.view = HON.pg; st.patFocus = null; history.replaceState(null, "", "#" + HON.pg); window.scrollTo(0, 0); render();
  }
  if (HON && /^zr\d+$/.test(HON.k) && st.view === "ex" && HON.pg === hlPage()) { /* a Zkouška result row opens Ukázat výsledky */
    var zs = pg(PROBS[st.pi]);
    if (curMode(PROBS[st.pi]) !== "exam" || !zs.zks) { st.mode = "exam"; zs.zks = true; render(); }
  }
  if (HON && /^s\d+$/.test(HON.k) && st.view === "ex" && HON.pg === hlPage()) { /* a Procvičit solution opens that step's Odkrýt řešení */
    var sp = PROBS[st.pi], ss = pg(sp), si = +HON.k.slice(1);
    if (sp.m.steps[si] && (curMode(sp) !== "practice" || !ss.rev[si])) {
      for (var k = 0; k <= si; k++) if (!solved(sp, k)) ss.rev[k] = true; /* earlier unsolved steps too, or the step stays locked (as following does) */
      st.mode = "practice"; ss.rev[si] = true; st.pf = si; save(); render();
    }
  }
  var el = markHl();
  if (el) el.scrollIntoView({ block: "nearest" });
}
document.addEventListener("contextmenu", function (e) {
  var t = RT && e.target.closest && e.target.closest("#main [data-hl]");
  if (!t) return;
  e.preventDefault(); e.stopImmediatePropagation(); /* capture phase: before MathJax's menu and the block / pattern handlers */
  var d = { pg: hlPage(), k: t.dataset.hl };
  if (HON && HON.pg === d.pg && HON.k === d.k) d.k = null; /* right-click it again to clear it for everyone */
  rtSend("hl", d);
  showHl(d);
}, true);
document.addEventListener("contextmenu", function (e) {
  if (!RT || !e.target.closest) return;
  var t = e.target.closest("#main [data-blk], #main [data-pat], #main .card[id^='pat-']");
  if (!t) return;
  e.preventDefault(); e.stopPropagation(); /* capture phase, before MathJax's own menu */
  if (t.dataset.blk) { var k = t.dataset.blk === BON ? null : t.dataset.blk; rtSend("bshow", { k: k }); showBlock(k); return; }
  var pk = t.dataset.pat || t.id.slice(4);
  if (!PATTERNS[pk]) return;
  if (pk === st.patFocus && st.view === "vzory") pk = null; /* right-click the shown one again to clear it */
  rtSend("pshow", { k: pk });
  showPat(pk);
}, true);
/* right-click a problem in the list: it opens for everyone in the room, also for those who don't follow or are on a page */
document.addEventListener("contextmenu", function (e) {
  var t = RT && e.target.closest && e.target.closest("#list [data-pi]");
  if (!t) return;
  e.preventDefault();
  rtSend("goto", { id: PROBS[+t.dataset.pi].id });
  go(+t.dataset.pi);
});
function rtGoto(id) {
  var i = PROBS.findIndex(function (p) { return p.id === id; });
  if (i < 0) return;
  RT.applying = true; /* like applyView: don't echo my view back */
  try { history.replaceState(null, "", "#" + PROBS[i].m.id); showProblem(i); } finally { RT.applying = false; }
}
document.addEventListener("contextmenu", function (e) {
  if (!RT || st.view !== "bloky") return;
  var t = e.target.closest && !e.target.closest("[data-pat]") && e.target.closest("#main [data-bk]");
  if (!t) return;
  e.preventDefault(); e.stopPropagation(); /* capture phase, before MathJax's own menu */
  var k = t.dataset.bk === BON ? null : t.dataset.bk;
  rtSend("bshow", { k: k });
  showBlock(k);
}, true);

/* ---------- render ---------- */
function render(focusSel) {
  var ae = document.activeElement, keep = ae && ae.id === "zkin" ? [ae.selectionStart, ae.selectionEnd, ae.scrollTop] : null;
  renderSide();
  var main = $("#main");
  try { if (window.MathJax && MathJax.typesetClear) MathJax.typesetClear([main]); } catch (e) {}
  /* the steps column scrolls on its own on wide screens; keep its position when the same problem and mode is redrawn */
  var oldCol = main.querySelector(".grid > .col"), colKey = st.view === "ex" ? PROBS[st.pi].id + "|" + curMode(PROBS[st.pi]) : "";
  var colTop = oldCol && main.dataset.colKey === colKey ? oldCol.scrollTop : 0;
  main.innerHTML = st.view === "vzory" ? renderVzory() : st.view === "tahak" ? renderTahak() : st.view === "bloky" ? renderBloky() : renderExample();
  var newCol = main.querySelector(".grid > .col");
  if (newCol) newCol.scrollTop = colTop;
  main.dataset.colKey = colKey;
  typeset(main);
  if (focusSel) { var el = document.getElementById(focusSel); if (el) el.focus({ preventScroll: true }); }
  else if (keep && (el = document.getElementById("zkin"))) { el.focus({ preventScroll: true }); el.setSelectionRange(keep[0], keep[1]); el.scrollTop = keep[2]; }
  if (st.view === "vzory" && st.patFocus) { var c = document.getElementById("pat-" + st.patFocus); if (c) c.scrollIntoView({ block: "nearest" }); }
  if (st.view === "tahak" && st.tkFocus != null) { var tr = main.querySelector('[data-hl="t' + st.tkFocus + '"]'); if (tr) { tr.classList.add("focus"); tr.scrollIntoView({ block: "center" }); } st.tkFocus = null; }
  if (st.view === "bloky" && st.blkFocus) { var bc = document.getElementById("blk-" + st.blkFocus); if (bc) { bc.classList.add("focus"); bc.scrollIntoView({ block: "start" }); } st.blkFocus = null; }
  updateReport();
  save();
  if (FON >= 0 && (st.view !== "ex" || PROBS[st.pi].id !== FON_P)) showFormula(-1); /* a new problem makes it stale */
  if (st.view !== "bloky") BON = null; /* leaving Bloky makes a shown block stale */
  markBlock();
  /* another problem, or leaving the page it is on, makes a shown line stale (Vzory / tahák / Bloky open on top of a problem keep it) */
  if (HON && (HON.pg.slice(0, 3) === "ex:" ? st.view === "ex" && HON.pg !== hlPage() : st.view !== HON.pg)) HON = null;
  markHl();
  fsApply();
  rtAfterRender();
  if (!RT) drawShared();
}
/* prefill the GitHub issue with where the reader is */
function updateReport() {
  var a = document.getElementById("report");
  if (!a) return;
  var base = "https://github.com/machmar/sbirka/issues/new", subj = (SUBJ.brand || SB.id).split(" ")[0];
  var where, title;
  if (st.view !== "ex") {
    var pgN = { vzory: ["Vzory", "[Vzory] "], tahak: ["Co na tahák", "[Tahák] "], bloky: ["Bloky", "[Bloky] "] }[st.view];
    where = "Stránka: " + pgN[0];
    title = pgN[1];
  } else {
    var p = PROBS[st.pi], mode = curMode(p);
    var step = mode === "learn" ? "Pochopit, krok " + (st.ns + 1) : mode === "exam" ? "Zkouška" : "Procvičit, krok " + (focusIdx(p) + 1);
    where = "Příklad: " + p.id + " · " + p.m.title + "\nRežim: " + step;
    title = "[" + p.id + "] ";
  }
  title = "[" + subj + "] " + title;
  var body = "Předmět: " + subj + "\n" + where + "\nOdkaz: " + location.href + "\n\nCo je špatně (a jak by to mělo být):\n\n";
  a.href = base + "?title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(body);
}
function applyTheme() {
  var r = document.documentElement;
  if (st.theme) r.setAttribute("data-theme", st.theme); else r.removeAttribute("data-theme");
}

/* ---------- routing (hash: #p2-1, #k1, #vzory, #tahak) ---------- */
function showProblem(i) {
  var p = PROBS[i], changed = st.lastId !== p.id;
  if (changed) { st.ns = 0; st.pf = null; st.allhl = false; }
  st.view = "ex"; st.pi = i; st.lastId = p.id; st.patFocus = null; st.openCh = p.ch;
  render();
  if (changed) { window.scrollTo(0, 0); scrollListToCurrent(); }
}
/* open Vzory at one pattern card, outlined until another is shown or the page is left */
function showPat(k) {
  st.patFocus = k || null;
  if (k && st.view !== "vzory") { st.view = "vzory"; history.replaceState(null, "", "#vzory"); window.scrollTo(0, 0); }
  if (st.view === "vzory") render();
}
function showPage(v) { st.view = v; st.patFocus = st.patFocus || null; window.scrollTo(0, 0); render(); }
function routeFromHash() {
  var h = "";
  try { h = decodeURIComponent(location.hash.replace(/^#/, "")); } catch (e) {}
  if (h === "vzory" || h === "tahak" || h === "bloky") { showPage(h); return true; }
  var i = PROBS.findIndex(function (p) { return p.m.id === h; });
  if (i >= 0) { showProblem(i); return true; }
  return false;
}
function go(i) {
  var h = PROBS[i].m.id;
  if (location.hash === "#" + h) showProblem(i); else location.hash = h;
}
function goPage(v) {
  if (location.hash === "#" + v) showPage(v); else location.hash = v;
}

/* ---------- answer check ---------- */
function check(i) {
  var p = PROBS[st.pi], s = pg(p), stp = p.m.steps[i];
  var inp = document.querySelector('[data-inp="' + i + '"]');
  var raw = inp ? inp.value : (s.val[i] || "");
  s.val[i] = raw;
  var vs = ansValues(raw, stp.unit);
  if (!vs) { s.fb[i] = "warn"; render(inp ? inp.id : null); return; }
  var good = [stp.ans].concat(stp.alt || []).some(function (a) { return vs.some(function (v) { return Math.abs(v - a) <= (stp.tolAbs != null ? stp.tolAbs : 0.02 * Math.abs(a) + 1e-12); }); });
  if (good) {
    s.ok[i] = true; s.fb[i] = "ok"; st.pf = null;
    var f = frontier(p);
    render(f < p.m.steps.length && p.m.steps[f].ans != null ? "ans-" + p.id.replace(/\./g, "-") + "-" + f : null);
  } else { s.fb[i] = "bad"; render(inp ? inp.id : null); }
}

/* ---------- Zkouška: one text box, "R2 = 35 kΩ" per line ----------
   A line is "name = value" (also ":" or "≈"); several on a line split by ";" or by "," before the next "name =".
   With working ("R2 = (…)·R1 = 100k") the last value counts. Values use the answer parser above plus 8,1·10^-6,
   11k4 and nV/sqrt(Hz). A name matches a step's sym (or one of its "|" aliases) ignoring _ {} \ and spaces; case is
   ignored as long as that doesn't change which quantity it is. Several steps with one name: the value decides. */
var GREEK = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega".split(" ");
var GLO = "αβγδεζηθικλμνξοπρστυφχψω", GUP = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ";
/* a Greek letter's name becomes the letter only as a word of its own: beta → β, Beta / BETA → Β, but bEta = b + Eta */
function zkKey(s) {
  return String(s).replace(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g, function (t) {
    var lo = t.toLowerCase(), i = GREEK.indexOf(lo);
    if (i < 0 || (t !== lo && t !== lo.toUpperCase() && t !== lo.charAt(0).toUpperCase() + lo.slice(1))) return t;
    return t === lo ? GLO.charAt(i) : GUP.charAt(i);
  }).replace(/[\s_{}\\]/g, "");
}
function zkClean(v) {
  v = v.trim().replace(/^~/, "").replace(/\.$/, "")
    .replace(/\s*[·*×x]\s*10\s*\^\s*\(?\s*([-+−–]?\d+)\s*\)?/, "e$1")
    .replace(/(sqrt|rt)\s*\(?\s*hz\s*\)?/i, "√Hz");
  return v.replace(/^(\d+)([pnuµμmkMG])(\d+)(.*)$/, "$1.$3$2$4"); /* 11k4 = 11,4k */
}
/* a bare number may be in the step's unit or in the base unit: R2 = 100 and R2 = 100000 both mean 100 kΩ */
function zkFits(raw, stp) {
  var vs = ansValues(raw, stp.unit), tol = stp.tolAbs != null ? stp.tolAbs : 0.02 * Math.abs(stp.ans) + 1e-12;
  if (vs && /^[-+]?[\d.,]+(e[-+]?\d+)?$/i.test(raw.replace(/\s/g, ""))) vs.push(vs[0] / unitFactors(stp.unit || "", true)[0]);
  return !!vs && [stp.ans].concat(stp.alt || []).some(function (a) { return vs.some(function (v) { return Math.abs(v - a) <= tol; }); });
}
function zkParse(text) {
  var out = [];
  String(text).split(/\n|;/).forEach(function (l) {
    l.split(/,\s*(?=[A-Za-zͰ-Ͽ\\][\w{}()\\Ͱ-Ͽ]*\s*[=:≈])/).forEach(function (pc) {
      pc = pc.trim();
      if (!pc) return;
      var m = /^([^=≈]+?)\s*[=≈]\s*(.+)$/.exec(pc) || /^([^:]+?)\s*:\s*(.+)$/.exec(pc);
      var name = m && m[1].split(":").pop().trim(), val = m && zkClean(m[2].split(/[=≈]/).pop());
      out.push(name && ansValues(val, "") ? { raw: pc, name: name, val: val } : { raw: pc });
    });
  });
  return out;
}
function zkGrade(p, text) {
  var steps = [], giv = {}, r = { ok: [], bad: [], skip: [], hit: {} };
  p.m.steps.forEach(function (s, i) { if (s.ans != null) steps.push({ i: i, s: s, k: String(s.sym || "").split("|").map(zkKey) }); });
  (p.m.given || []).forEach(function (g) { /* given values you copy down are fine, not "nehodnoceno" */
    String(g).split(/,\s+/).forEach(function (seg) { if (seg.indexOf("=") > 0) giv[zkKey(seg.split("=")[0].trim().split(/[:\s]+/).pop()).toLowerCase()] = 1; });
  });
  zkParse(text).forEach(function (e) {
    if (!e.name) { r.skip.push(e.raw); return; }
    var k = zkKey(e.name), kl = k.toLowerCase();
    var ex = steps.filter(function (x) { return x.k.indexOf(k) >= 0; });
    var ci = steps.filter(function (x) { return x.k.some(function (y) { return y.toLowerCase() === kl; }); });
    var ciFit = ci.filter(function (x) { return zkFits(e.val, x.s); });
    var c = ex.length ? ex : ciFit.length ? ciFit : giv[kl] ? [] : ci;
    if (!c.length) { if (!giv[kl]) r.skip.push(e.raw); return; }
    var fit = c.filter(function (x) { return zkFits(e.val, x.s); });
    var pick = fit.filter(function (x) { return !r.hit[x.i]; })[0] || fit[0] || c.filter(function (x) { return r.hit[x.i] == null; })[0] || c[0];
    var ok = fit.indexOf(pick) >= 0;
    (ok ? r.ok : r.bad).push({ i: pick.i, s: pick.s, v: e.val });
    r.hit[pick.i] = r.hit[pick.i] || ok;
  });
  r.n = steps.length;
  r.good = steps.filter(function (x) { return r.hit[x.i] === true; }).length;
  r.miss = steps.filter(function (x) { return r.hit[x.i] == null; }).length;
  r.bad = r.bad.filter(function (x) { return r.hit[x.i] !== true; }); /* working lines like "R0 = 0,5 V" before the right R0 aren't mistakes */
  return r;
}
(function () { /* self-check on 2.1: R2 100 kΩ, I_R 10 µA, Vref1 0,25 V, Vref2 2,5 V, Vd 4 V, Ii 8,125 µA */
  var p = SB.id === "nai" && PROBS.find(function (x) { return x.id === "2.1"; }); /* the sample answers are NAI's */
  if (!p) return;
  var r = zkGrade(p, "R2 = 0,6 V\nr_2 = (Vbg-Vbe)/(2Vt ln N)·R1 = 100000\nI_R=1e-5 A; vref1: 250mV, Vref2 = 2,5 V\nVd = 400 V\nVref = 1.25V\nR_1 = 18k\nIi = 8,125·10^-6 A\nhello");
  console.assert(r.good === 5 && r.bad.length === 1 && r.miss === 0 && r.skip.length === 2, "zkGrade 2.1", r);
  console.assert(zkKey("SigmaVos") === "ΣVos" && zkKey("sigma_vos") === "σvos" && zkKey("BEta") === "BΗ" && zkKey("Ipi") === "Ipi" && zkClean("11k4") === "11.4k", "zkKey / zkClean");
})();
function examHtml(p) {
  var s = pg(p);
  function name(stp) { return fmt(String(stp.sym || "").split("|")[0]); }
  function pill(cls) { return function (x) { return '<span class="zpill ' + cls + '">' + name(x.s) + " = " + esc(x.v) + "</span>"; }; }
  var h = '<div class="exam"><p class="extask">' + fmt(p.m.task) + "</p>" +
    '<div class="zkwrap"><textarea id="zkin" rows="9" spellcheck="false" autocomplete="off" aria-label="Tvoje výsledky, jeden na řádek" placeholder="R = x Ω">' + esc(zkText(p)) + '</textarea><div id="zkcarets" class="zcarets" aria-hidden="true"></div></div>' +
    (RT ? '<p class="zskip">V místnosti je pole společné. Tvůj vlastní text se vrátí, až místnost opustíš.</p>' : "") +
    '<div class="row-actions"><button class="btn primary" type="button" data-zk="check">Zkontrolovat</button>' +
    '<button class="btn" type="button" data-zk="sol" aria-pressed="' + !!s.zks + '">' + (s.zks ? "Skrýt výsledky" : "Ukázat výsledky") + "</button></div>";
  if (s.zkc != null) {
    var r = zkGrade(p, s.zkc);
    h += '<div class="zres" role="status"><p class="zsum"><b>Správně ' + r.good + "/" + r.n + "</b>" + (r.miss ? "<span>Chybí " + r.miss + "</span>" : "") + "</p>" +
      (r.ok.length ? '<div class="zpills">' + r.ok.map(pill("ok")).join("") + "</div>" : "") +
      (r.bad.length ? '<div class="zpills">' + r.bad.map(pill("bad")).join("") + "</div>" : "") +
      (r.skip.length ? '<p class="zskip">Nehodnoceno: ' + r.skip.map(esc).join(" · ") + "</p>" : "") + "</div>";
  }
  if (s.zks) h += '<table class="ztab"><tbody>' + p.m.steps.map(function (x, i) {
    return x.ans == null ? "" : '<tr data-hl="zr' + i + '"><td>' + name(x) + "</td><td>" + String(x.ans).replace(".", ",") + (x.unit && x.unit !== "–" ? " " + esc(x.unit) : "") + "</td></tr>";
  }).join("") + "</tbody></table>";
  return h + "</div>";
}

/* ---------- Zkouška in a room: one shared box per problem (your own text comes back when you leave). Every keystroke
   goes out as an edit {at, del, ins} plus your caret, so the others see it as you type; their carets are thin lines in
   their colour. Edits made at the same moment can leave the copies slightly different, so 1 s after you stop typing
   the whole text goes out too, and the others take it if they are not typing (two people stopping together: the lower
   id wins). ---------- */
var ZKT = 0, zkQT = null, zkCT = 0, zkLastC = null;
function zkR() { RT.zcur = RT.zcur || {}; return RT.zk || (RT.zk = {}); }
function zkText(p) { return RT ? zkR()[p.id] || "" : pg(p).zk || ""; }
/* a shared-text edit {at, del, ins}: what one keystroke changed (the Zkouška box and the Poznámky pad), and applying
   someone's edit to my copy, with shift() moving any caret past it */
function textOp(old, nv, c) {
  var a = 0;
  while (a < old.length && a < nv.length && old[a] === nv[a]) a++;
  a = Math.min(a, Math.max(0, c - Math.max(0, nv.length - old.length))); /* "aa" → "aaa" with the caret at 1 is an insert at 0 */
  var e1 = old.length, e2 = nv.length;
  while (e1 > a && e2 > a && old[e1 - 1] === nv[e2 - 1]) { e1--; e2--; }
  return { at: a, del: e1 - a, ins: nv.slice(a, e2) };
}
function textApply(cur, d, max) {
  if (!(Number.isInteger(d.at) && Number.isInteger(d.del) && d.at >= 0 && d.del >= 0 && typeof d.ins === "string" && d.ins.length <= max)) return null;
  var at = Math.min(d.at, cur.length), del = Math.min(d.del, cur.length - at), n = d.ins.length;
  return { v: (cur.slice(0, at) + d.ins + cur.slice(at + del)).slice(0, max), shift: function (x) { return x <= at ? x : x >= at + del ? x - del + n : at + n; } };
}
function zkLocal(ta) {
  var id = PROBS[st.pi].id, old = zkR()[id] || "", nv = ta.value.slice(0, 4000), c = ta.selectionStart, o = textOp(old, nv, c);
  zkR()[id] = nv; ZKT = Date.now(); zkLastC = c;
  rtSend("zkop", { id: id, at: o.at, del: o.del, ins: o.ins, c: c });
  clearTimeout(zkQT);
  zkQT = setTimeout(function () { /* with the caret again: one sent while someone else typed can be a few characters off */
    var b = $("#zkin");
    if (RT) rtSend("zkt", { id: id, v: zkR()[id] || "", c: b && document.activeElement === b ? b.selectionStart : -1 });
  }, 1000);
}
function zkCaret(ta, gone) {
  if (!RT) return;
  var c = gone ? -1 : ta.selectionStart;
  if (c === zkLastC) return;
  zkLastC = c;
  rtSend("zkc", { id: PROBS[st.pi].id, c: c });
}
/* put the shared text into the box without moving your own caret off the character it was at */
function zkShow(id, shift) {
  var ta = $("#zkin");
  if (ta && PROBS[st.pi].id === id) {
    var a = ta.selectionStart, b = ta.selectionEnd, top = ta.scrollTop, v = zkR()[id] || "";
    if (ta.value !== v) {
      ta.value = v;
      if (document.activeElement === ta) ta.setSelectionRange(Math.min(shift ? shift(a) : a, v.length), Math.min(shift ? shift(b) : b, v.length));
      ta.scrollTop = top;
    }
  }
  zkCarets();
}
function zkRecv(t, d, f) {
  if (!d || typeof d.id !== "string" || !PROBS.some(function (p) { return p.id === d.id; })) return;
  var R = zkR(), cur = R[d.id] || "";
  if (t === "zkop") {
    var op = textApply(cur, d, 4000), shift = op && op.shift;
    if (!op) return;
    R[d.id] = op.v;
    Object.keys(RT.zcur).forEach(function (k) { var z = RT.zcur[k]; if (z.id === d.id) z.c = shift(z.c); });
    if (Number.isInteger(d.c) && d.c >= 0) RT.zcur[f] = { id: d.id, c: d.c };
    zkShow(d.id, shift);
  }
  if (t === "zkt" && typeof d.v === "string") {
    var idle = Date.now() - ZKT;
    if (d.v !== cur && (idle > 3000 || (idle > 1000 && f < RT.me))) R[d.id] = d.v.slice(0, 4000);
    if (Number.isInteger(d.c)) { if (d.c < 0) delete RT.zcur[f]; else RT.zcur[f] = { id: d.id, c: d.c }; }
    zkShow(d.id, null);
  }
  if (t === "zkc" && Number.isInteger(d.c)) { if (d.c < 0) delete RT.zcur[f]; else RT.zcur[f] = { id: d.id, c: d.c }; zkCarets(); }
  if (t === "zkchk" && typeof d.v === "string") { /* someone pressed Zkontrolovat: grade the text they checked */
    var cp = PROBS.find(function (x) { return x.id === d.id; }), cs = pg(cp), g;
    cs.zkc = d.v.slice(0, 4000); g = zkGrade(cp, cs.zkc);
    if (g.n && g.good === g.n) cs.zkp = true;
    if (st.view === "ex" && PROBS[st.pi].id === d.id) render(); else { renderSide(); save(); }
  }
}
var zkMirror = null;
/* the others' carets: a copy of the box (same font, width and wrapping) tells where character c sits */
function zkCarets() {
  var ta = $("#zkin"), lay = $("#zkcarets");
  if (!ta || !lay) return;
  lay.innerHTML = "";
  if (!RT || !RT.zcur) return;
  var id = PROBS[st.pi].id, cs = getComputedStyle(ta), v = ta.value;
  if (!zkMirror) { zkMirror = document.createElement("div"); zkMirror.setAttribute("aria-hidden", "true"); document.body.appendChild(zkMirror); }
  var m = zkMirror.style;
  m.cssText = "position:absolute;visibility:hidden;left:-9999px;top:0;white-space:pre-wrap;overflow-wrap:break-word;box-sizing:content-box;border:0";
  ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "tabSize", "paddingLeft", "paddingRight", "paddingTop"].forEach(function (k) { m[k] = cs[k]; });
  m.width = (ta.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) + "px";
  var lh = parseFloat(cs.lineHeight) || 20, bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
  Object.keys(RT.zcur).forEach(function (pid) {
    var z = RT.zcur[pid], mem = RT.members[pid];
    if (z.id !== id || !mem || !rtAlive(mem)) return;
    zkMirror.textContent = v.slice(0, Math.min(z.c, v.length));
    var mark = document.createElement("span"); mark.textContent = "​"; zkMirror.appendChild(mark);
    var i = document.createElement("i");
    i.className = "zcaret"; i.style.setProperty("--c", peerCol(pid));
    i.style.left = (bl + mark.offsetLeft - ta.scrollLeft) + "px"; i.style.top = (bt + mark.offsetTop - ta.scrollTop) + "px"; i.style.height = lh + "px";
    lay.appendChild(i);
  });
}
document.addEventListener("scroll", function (e) { if (e.target.id === "zkin") zkCarets(); }, true);
document.addEventListener("keyup", function (e) { if (e.target.id === "zkin") zkCaret(e.target); });
document.addEventListener("mouseup", function (e) { if (e.target.id === "zkin") zkCaret(e.target); });
document.addEventListener("focusin", function (e) { if (e.target.id === "zkin") zkCaret(e.target); });
document.addEventListener("focusout", function (e) { if (e.target.id === "zkin") zkCaret(e.target, true); });
["keyup", "mouseup", "focusin"].forEach(function (ev) { $("#ptext").addEventListener(ev, function () { padCaret(this); }); });
$("#ptext").addEventListener("focusout", function () { padCaret(this, true); });

/* ---------- export / import / reset ---------- */
function msg(t, err) { var m = $("#msg"); m.textContent = t; m.className = "msg" + (err ? " err" : ""); }
function doExport() {
  try {
    var payload = { app: "sbirka-" + SB.id, v: 1, exported: new Date().toISOString(), state: snapshot() };
    var blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = SB.id + "-postup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    msg("Postup exportován.");
  } catch (e) { msg("Export se nepovedl.", true); }
}
function doImport(file) {
  if (!file) return;
  var rd = new FileReader();
  rd.onload = function () {
    var n = -1;
    try {
      var obj = JSON.parse(String(rd.result));
      var src = obj && obj.state && typeof obj.state === "object" ? obj.state : obj;
      n = mergeState(src);
    } catch (e) { n = -1; }
    if (n < 0) { msg("Soubor nevypadá jako export z této sbírky. Nic se nezměnilo.", true); return; }
    render();
    msg("Postup sloučen s tím v prohlížeči (příklady v souboru: " + n + ").");
  };
  rd.onerror = function () { msg("Soubor se nepodařilo přečíst.", true); };
  rd.readAsText(file);
}
function doReset() {
  st.prog = {}; st.known = {}; st.ns = 0; st.pf = null; st.confirmReset = false;
  try { localStorage.removeItem(KEY); } catch (e) {}
  render(); msg("Postup smazán.");
}

/* ---------- events ---------- */
document.addEventListener("click", function (ev) {
  var t = ev.target.closest("button, input");
  if (!t) return;
  var d = t.dataset;
  var p = PROBS[st.pi];
  if (d.rt) {
    if (d.rt === "create") rtJoin(newCode(), true);
    else if (d.rt === "join") rtJoin(($("#rtcode") || {}).value, false);
    else if (d.rt === "leave") rtLeave();
    else if (d.rt === "copy") { var l = $("#rtlink"); (navigator.clipboard ? navigator.clipboard.writeText(l.value) : Promise.reject()).then(function () { rtMsg("Odkaz zkopírován."); }, function () { l.select(); rtMsg("Zkopíruj odkaz ručně (Ctrl+C)."); }); }
    return;
  }
  if (d.pad) {
    if (d.pad === "active") {
      var bd = $("#pbody");
      if (PAD.act) {
        var to = { left: Math.max(0, PAD.act.x - bd.clientWidth / 2), top: Math.max(0, PAD.act.y - bd.clientHeight / 2) };
        bd.scrollTo({ left: to.left, top: to.top, behavior: "smooth" });
        setTimeout(function () { if (Math.abs(bd.scrollLeft - to.left) + Math.abs(bd.scrollTop - to.top) > 40) bd.scrollTo(to.left, to.top); }, 600); /* where smooth scrolling doesn't run */
      }
    } else if (d.pad === "color") { PADC = INKC[(INKC.indexOf(PADC) + 1) % INKC.length]; PADT = "pen"; padTools(); }
    else { PADT = d.pad; padTools(); if (PADT === "text") $("#ptext").focus(); } /* one of text / pen / eraser is always on */
    return;
  }
  if (d.ink) {
    if (d.ink === "color") { st.inkC = INKC[(INKC.indexOf(st.inkC) + 1) % INKC.length]; if (!st.tool) st.tool = "pen"; }
    else st.tool = st.tool === d.ink ? null : d.ink;
    render(); return;
  }
  if (d.pin) {
    var q = RT && RT.pins[d.pin];
    if (q && window.confirm(q.t ? "Smazat poznámku „" + q.t + "“ pro všechny?" : "Smazat tuto značku pro všechny?")) { LASTSURF = "schem"; undoPush(q.id, { pin: "del", q: q }); delete RT.pins[d.pin]; rtSend("unpin", d.pin); drawShared(); }
    return;
  }
  if (d.sys) {
    if (d.sys === "export") doExport();
    else if (d.sys === "import") { var f = $("#file"); f.value = ""; f.click(); }
    else if (d.sys === "reset") { st.confirmReset = true; renderSide(); }
    else if (d.sys === "reset-no") { st.confirmReset = false; renderSide(); }
    else if (d.sys === "reset-yes") doReset();
    return;
  }
  if (t.id === "theme") {
    var dark = st.theme ? st.theme === "dark" : (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    st.theme = dark ? "light" : "dark"; applyTheme(); save(); return;
  }
  if (d.tab) { if (d.tab === "ex") go(st.pi); else goPage(d.tab); return; }
  if (d.pi) { go(+d.pi); return; }
  if (d.chap) {
    st.openCh = d.chap; renderSide();
    var tile = document.querySelector('#list [data-chap="' + d.chap + '"]');
    if (tile) $("#list").scrollLeft = Math.max(0, tile.parentNode.offsetLeft);
    return;
  }
  if (d.go) { go(+d.go); return; }
  if (d.mode) { st.mode = d.mode; render(); return; }
  if (d.k) { st.ns = +d.k; render(); return; }
  if (d.nav) {
    if (d.nav === "all") st.showall = !st.showall;
    else if (d.nav === "next" && st.ns < p.nai.steps.length - 1) st.ns++;
    else if (d.nav === "prev" && st.ns > 0) st.ns--;
    render(); return;
  }
  if (d.zk) {
    var zs = pg(p), box = $("#zkin");
    if (d.zk === "check") {
      if (box && !RT) zs.zk = box.value;
      zs.zkc = box ? box.value : zkText(p);
      var zr = zkGrade(p, zs.zkc);
      if (zr.n && zr.good === zr.n) zs.zkp = true;
      if (RT) rtSend("zkchk", { id: p.id, v: zs.zkc }); /* the box is shared, so the check is too; Ukázat výsledky stays yours */
    } else zs.zks = !zs.zks;
    render(); return;
  }
  if (d.act) {
    var i = +d.i, s = pg(p);
    if (d.act === "check") { check(i); return; }
    if (d.act === "hint") s.hint[i] = !s.hint[i];
    if (d.act === "rev") { s.rev[i] = true; st.pf = i; }
    render(); return;
  }
  if (d.pf) { st.pf = +d.pf; render(); return; }
  if (d.nai) { st.mode = "learn"; st.ns = +d.nai; render(); return; }
  if (d.prac) { st.mode = "practice"; st.pf = +d.prac; render(); return; }
  if (d.tk) { st.tkFocus = +d.tk; if (location.hash === "#tahak") showPage("tahak"); else location.hash = "tahak"; return; }
  if (d.blk) { st.blkFocus = d.blk; if (location.hash === "#bloky") showPage("bloky"); else location.hash = "bloky"; return; }
  if (d.pat) { st.patFocus = d.pat; if (location.hash === "#vzory") showPage("vzory"); else location.hash = "vzory"; return; }
  if (d.know) { st.known[p.id] = !st.known[p.id]; render(); return; }
  if (d.plot) { pg(p).plot = !pg(p).plot; render(); return; }
});
document.addEventListener("change", function (ev) {
  if (ev.target.id === "allhl") { st.allhl = ev.target.checked; render(); }
  if (ev.target.id === "clean") { st.clean = ev.target.checked; render(); }
  if (ev.target.id === "rtfollow" && RT) RT.follow = ev.target.checked;
  if (ev.target.id === "file") doImport(ev.target.files && ev.target.files[0]);
});
document.addEventListener("input", function (ev) {
  var tg = ev.target;
  if (tg.id === "q") { st.q = tg.value; renderSide(); return; }
  if (tg.id === "zkin") { if (RT) zkLocal(tg); else { pg(PROBS[st.pi]).zk = tg.value; save(); } return; }
  var i = tg.dataset && tg.dataset.inp;
  if (i != null) { var s = pg(PROBS[st.pi]); s.val[+i] = tg.value; s.fb[+i] = null; save(); }
});
document.addEventListener("keydown", function (ev) {
  var tg = ev.target, i = tg.dataset && tg.dataset.inp;
  if (i != null) { if (ev.key === "Enter") { ev.preventDefault(); check(+i); } return; }
  if (tg.id === "rtcode" && ev.key === "Enter") { rtJoin(tg.value, false); return; }
  if (tg.id === "zkin" && ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); var zb = document.querySelector('[data-zk="check"]'); if (zb) zb.click(); return; }
  var zk = String(ev.key).toLowerCase();
  if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (zk === "z" || zk === "y")) { /* Ctrl+Z undo, Ctrl+Y or Ctrl+Shift+Z redo */
    if (tg.id === "ptext") LASTSURF = "pad";
    else if (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.isContentEditable) return;
    ev.preventDefault(); undo(zk === "y" || ev.shiftKey); return;
  }
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  var tag = tg.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tg.isContentEditable) return;
  if (st.view !== "ex") return;
  var p = PROBS[st.pi], key = ev.key;
  if (key === "j" || key === "J") { if (st.pi < PROBS.length - 1) { ev.preventDefault(); go(st.pi + 1); } return; }
  if (key === "k" || key === "K") { if (st.pi > 0) { ev.preventDefault(); go(st.pi - 1); } return; }
  if (!p.nai || curMode(p) !== "learn") return;
  var step = 0;
  if (key === "ArrowRight") step = 1;
  else if (key === "ArrowLeft") step = -1;
  else if (key === " " || key === "Spacebar") { if (tag === "BUTTON" || tag === "A" || tag === "SUMMARY") return; step = 1; }
  else return;
  ev.preventDefault();
  var n = Math.max(0, Math.min(p.nai.steps.length - 1, st.ns + step));
  if (n !== st.ns) {
    st.ns = n; render();
    var on = document.querySelector(".lstep.on");
    if (on) on.scrollIntoView({ block: "nearest" });
  }
});
window.addEventListener("hashchange", routeFromHash);
/* ---------- drawing on the schematic: hover the top-right corner for pen / eraser / colour.
   Strokes are in % of the schematic, so they line up on every screen. Kept for this visit only (not saved). ---------- */
var INK = {};
var INKC = ["#e5484d", "#1e88e5", "#2e9e5b", "#8e44ad", "#ef6c00", "#00979c", "#d6409f", "#15191e"]; /* the room colours (PCOL) + black */
st.tool = null; st.inkC = INKC[0];
function inkBar() {
  return '<div class="ink-bar"><button type="button" data-ink="pen" title="Pero" aria-label="Pero" aria-pressed="' + (st.tool === "pen") + '">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>' +
    '<button type="button" data-ink="erase" title="Guma: smaže celou čáru, které se dotkne" aria-label="Guma" aria-pressed="' + (st.tool === "erase") + '">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19l-5-5 9.5-9.5a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 19zM9 19h11M7.5 10.5l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg></button>' +
    '<button type="button" data-ink="color" title="Barva pera" aria-label="Barva pera"><i style="background:' + st.inkC + '"></i></button></div>';
}
function inkPath(pts) { return "M" + pts.map(function (q) { return q[0] + " " + q[1]; }).join(" L"); }
function inkSvg(list) {
  return '<svg class="ink" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + list.map(function (q) {
    return '<path d="' + inkPath(q.p) + '" stroke="' + q.c + '" style="--w:' + (q.z || 1) + '"/>';
  }).join("") + "</svg>";
}
function inkList() { return Object.keys(INK).map(function (k) { return INK[k]; }).slice(-40); }
/* strokes can come from other people's browsers: validate before use */
function mergeInk(list) {
  if (!Array.isArray(list)) return;
  list.slice(0, 200).forEach(function (q) {
    if (!q || typeof q.k !== "string" || q.k.length > 24 || INKC.indexOf(q.c) < 0 || !Array.isArray(q.p) || !q.p.length || q.p.length > 2000) return;
    if (!PROBS.some(function (p) { return p.id === q.id; })) return;
    var pts = q.p.filter(function (a) { return Array.isArray(a) && pct(a[0]) != null && pct(a[1]) != null; }).map(function (a) { return [a[0], a[1]]; });
    if (pts.length === q.p.length) INK[q.k] = { k: q.k, id: q.id, c: q.c, p: pts, z: typeof q.z === "number" && q.z >= 1 && q.z <= ZMAX ? q.z : 1 };
  });
}
function inkPt(pap, e) {
  var r = zEl(pap).getBoundingClientRect();
  return [+Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)).toFixed(2), +Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100)).toFixed(2)];
}
/* eraser: remove every stroke of this problem that passes within 9 px of the pointer */
function inkErase(pap, e) {
  var r = zEl(pap).getBoundingClientRect(), sx = r.width / 100, sy = r.height / 100, x = e.clientX - r.left, y = e.clientY - r.top, id = PROBS[st.pi].id, hit = false;
  Object.keys(INK).forEach(function (k) {
    var q = INK[k];
    if (q.id !== id) return;
    for (var i = 0; i < q.p.length; i++) {
      var ax = q.p[i][0] * sx, ay = q.p[i][1] * sy, b = q.p[Math.min(i + 1, q.p.length - 1)], bx = b[0] * sx, by = b[1] * sy;
      var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
      if (Math.hypot(x - ax - t * dx, y - ay - t * dy) < 9) { undoPush(id, { ink: "del", q: q }); delete INK[k]; hit = true; if (RT) rtSend("erase", k); return; }
    }
  });
  if (hit) drawShared();
}
/* undo: your own actions per surface (a problem's schematic, or "pad"); Ctrl+Z undoes the latest on the surface you
   used last. Each step is replayed to the room with the normal draw / erase / pin messages. */
var UNDO = {}, REDO = {}, LASTSURF = null, padBurst = null;
/* a new action of your own: remember it for undo and drop the redo history of that surface */
function undoPush(key, a) { var u = UNDO[key] = UNDO[key] || []; u.push(a); if (u.length > 200) u.shift(); REDO[key] = []; }
/* a pen's eraser end reports button 5 (buttons bit 32) */
function eraserTip(e) { return e.pointerType === "pen" && (e.button === 5 || (e.buttons & 32) === 32); }
/* apply one history step backwards (undo) or forwards (redo); returns the entry for the opposite history */
function doStep(key, a, back) {
  var present = (a.ink || a.pin || a.pad) === "add" ? !back : back; /* does the item exist after this step */
  if (a.ink) { if (present) { INK[a.q.k] = a.q; if (RT) rtSend("draw", a.q); } else if (INK[a.q.k]) { delete INK[a.q.k]; if (RT) rtSend("erase", a.q.k); } }
  if (a.pin && RT) { if (present) { RT.pins[a.q.k] = a.q; rtSend("pin", a.q); } else if (RT.pins[a.q.k]) { delete RT.pins[a.q.k]; rtSend("unpin", a.q.k); } }
  if (a.pad) { if (present) { PAD.s[a.q.k] = a.q; if (RT) rtSend("padd", a.q); } else if (PAD.s[a.q.k]) { delete PAD.s[a.q.k]; if (RT) rtSend("pade", { k: a.q.k }); } }
  if (a.text != null) { var cur = PAD.t; clearTimeout(padBurst); padBurst = null; padSetText(a.text); if (RT) { var uo = textOp(cur, PAD.t, PAD.t.length); rtSend("padop", { at: uo.at, del: uo.del, ins: uo.ins }); rtSend("padt", { v: PAD.t }); } a = { text: cur }; }
  if (key === "pad") { padDraw(); padGrow(); } else drawShared();
  return a;
}
function undo(redo) {
  var key = LASTSURF === "pad" ? "pad" : PROBS[st.pi].id, from = redo ? REDO : UNDO, to = redo ? UNDO : REDO;
  var a = (from[key] || []).pop();
  if (a) (to[key] = to[key] || []).push(doStep(key, a, !redo));
}
/* ---------- zoom inside the schematic: Ctrl+wheel or touchpad pinch (the browser sends those as Ctrl+wheel), two-finger
   pinch on touch screens. Zoomed in: wheel / drag pans. One zoom per problem, shared with the room. ---------- */
var ZOOM = {}, ZMAX = 8, zPts = {}, zG = null, zT = null;
function zcur() { return ZOOM[PROBS[st.pi].id] || { z: 1, x: 0, y: 0 }; }
function zEl(pap) { return pap.querySelector(".zoom") || pap; }
function zStyle(v) { return "--z:" + v.z + ";--zx:" + v.x + ";--zy:" + v.y; }
function zClamp(v) {
  var z = Math.max(1, Math.min(ZMAX, v.z)), m = 1 - 1 / z;
  if (z < 1.02) return { z: 1, x: 0, y: 0 };
  return { z: z, x: Math.max(0, Math.min(m, v.x)), y: Math.max(0, Math.min(m, v.y)) };
}
/* zoom to nz keeping the picture point under u (fractions of the visible window) in place */
function zAt(v, u, nz) { return { z: nz, x: v.x + u[0] / v.z - u[0] / nz, y: v.y + u[1] / v.z - u[1] / nz }; }
function zApply() {
  var el = document.querySelector("#main .zoom");
  if (!el) return;
  var v = zcur(), pap = el.parentNode;
  el.style.cssText = zStyle(v);
  pap.classList.toggle("zoomed", v.z > 1);
  pap.querySelector(".zbadge").textContent = Math.round(v.z * 100) + " %";
}
function zSet(v) {
  ZOOM[PROBS[st.pi].id] = zClamp(v); zApply();
  if (RT && !zT) zT = setTimeout(function () { /* at most ~25 updates/s, always the latest */
    zT = null;
    var id = PROBS[st.pi].id, w = ZOOM[id];
    if (RT && w) rtSend("zoom", { id: id, z: +w.z.toFixed(3), x: +w.x.toFixed(4), y: +w.y.toFixed(4) });
  }, 40);
}
/* zoom from other people's browsers: validate before use */
function zMerge(d) {
  if (!d || typeof d.id !== "string" || !PROBS.some(function (p) { return p.id === d.id; })) return;
  if (![d.z, d.x, d.y].every(function (n) { return typeof n === "number" && isFinite(n); })) return;
  ZOOM[d.id] = zClamp(d);
  if (d.id === PROBS[st.pi].id && !zG) zApply();
}
function zU(pap, x, y) { var r = pap.getBoundingClientRect(); return [(x - r.left) / r.width, (y - r.top) / r.height]; }
(function () { /* self-check: zooming in and back out at the same point returns to the start */
  var a = zAt({ z: 1, x: 0, y: 0 }, [0.3, 0.6], 2.5), b = zClamp(zAt(a, [0.3, 0.6], 1));
  console.assert(Math.abs(a.x + 0.3 / 2.5 - 0.3) < 1e-9 && b.z === 1 && b.x === 0, "zoom anchor");
})();
document.addEventListener("wheel", function (e) {
  var pap = st.view === "ex" && e.target.closest && e.target.closest("#main .paper");
  if (!pap) return; /* outside the schematic Ctrl+wheel stays the browser's page zoom */
  var v = zcur(), k = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1, dy = e.deltaY * k, dx = e.deltaX * k;
  if (e.ctrlKey) {
    e.preventDefault();
    var f = Math.exp(-Math.sign(dy) * Math.min(Math.abs(dy) * 0.01, 0.2)); /* pinch deltas are small; a mouse notch is capped at ~1.2x */
    zSet(zAt(v, zU(pap, e.clientX, e.clientY), v.z * f));
    return;
  }
  if (v.z <= 1) return;
  var r = pap.getBoundingClientRect();
  if (e.shiftKey && !dx) { dx = dy; dy = 0; }
  var n = zClamp({ z: v.z, x: v.x + dx / r.width / v.z, y: v.y + dy / r.height / v.z });
  if (n.x === v.x && n.y === v.y) return; /* at the edge: let the page scroll */
  e.preventDefault(); zSet(n);
}, { passive: false });
/* a gesture starts from the current pointers: two touches pinch, one pointer drags the zoomed picture */
function zStart(pap) {
  var ids = Object.keys(zPts);
  if (!ids.length) { zG = null; return; }
  var a = zPts[ids[0]], b = zPts[ids[1]] || a;
  zG = { pap: pap, v: zcur(), u: zU(pap, (a.x + b.x) / 2, (a.y + b.y) / 2), d: Math.hypot(a.x - b.x, a.y - b.y) || 1, two: ids.length > 1 };
}
document.addEventListener("pointerdown", function (e) {
  if (st.view !== "ex") return;
  var pap = e.target.closest && e.target.closest("#main .paper");
  if (!pap || e.target.closest(".ink-bar, .pin, .zbadge, .zfs")) return;
  if (e.pointerType === "touch") { /* every finger on the schematic is counted, also one that is drawing */
    zPts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var n = Object.keys(zPts).length;
    if (n > 2 || (n === 1 && (st.tool || zcur().z <= 1))) return; /* one finger draws, or scrolls the page at 100 % */
  } else {
    /* middle button pans always, also with a tool on (drawing uses only the left button); left button only with no tool */
    if (zG || eraserTip(e) || zcur().z <= 1 || !(e.button === 1 || (e.button === 0 && !st.tool))) return;
    zPts[e.pointerId] = { x: e.clientX, y: e.clientY };
  }
  if (inkNow && !inkNow.erase) inkNow.live.remove(); /* a second finger turns a stroke into a pinch */
  inkNow = null;
  e.preventDefault();
  try { pap.setPointerCapture(e.pointerId); } catch (x) {}
  zStart(pap);
});
document.addEventListener("pointermove", function (e) {
  if (!zG || !zPts[e.pointerId]) return;
  zPts[e.pointerId] = { x: e.clientX, y: e.clientY };
  var ids = Object.keys(zPts), a = zPts[ids[0]], b = zPts[ids[1]] || a, g = zG, v = g.v;
  var u = zU(g.pap, (a.x + b.x) / 2, (a.y + b.y) / 2), nz = g.two && b !== a ? v.z * Math.hypot(a.x - b.x, a.y - b.y) / g.d : v.z;
  zSet({ z: nz, x: v.x + g.u[0] / v.z - u[0] / nz, y: v.y + g.u[1] / v.z - u[1] / nz });
});
function zEnd(e) {
  if (!zPts[e.pointerId]) return;
  delete zPts[e.pointerId];
  if (zG) zStart(zG.pap); /* the remaining finger carries on panning */
}
/* no autoscroll circle from the middle button over a zoomed schematic */
document.addEventListener("mousedown", function (e) { if (e.button === 1 && e.target.closest && e.target.closest("#main .paper.zoomed")) e.preventDefault(); });
document.addEventListener("pointerup", zEnd);
document.addEventListener("pointercancel", zEnd);
document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-zreset]")) zSet({ z: 1, x: 0, y: 0 }); });

/* ---------- schematic over the whole window (the browser window itself stays as it is): the paper goes into the
   browser's top layer as a manual popover, which lifts it out of main's container and its stacking. Drawing, notes and
   zoom keep working since they all go by the paper's own box. Shared with the room. ---------- */
var FS = false, FS_OK = !!HTMLElement.prototype.showPopover; /* shortcut: no button in browsers without popover (pre-2024) */
function fsBtn() {
  if (!FS_OK) return "";
  var d = FS ? "M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5" : "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5";
  return '<button type="button" class="zfs" data-zfs aria-pressed="' + FS + '" title="' + (FS ? "Zpět (Esc), pro všechny" : "Schéma přes celé okno, pro všechny") + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg></button>';
}
function fsApply() {
  var pap = document.querySelector("#main .paper"), on = FS && st.view === "ex";
  if (!pap || !FS_OK) return;
  pap.classList.toggle("fs", on);
  var b = pap.querySelector(".zfs");
  if (b) b.outerHTML = fsBtn();
  if (on) { pap.setAttribute("popover", "manual"); if (!pap.matches(":popover-open")) pap.showPopover(); }
  else pap.removeAttribute("popover"); /* removing the attribute also closes it */
}
function fsSet(on, mine) {
  if (on === FS) return;
  FS = on; fsApply();
  if (mine && RT) rtSend("fs", { on: on });
}
document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-zfs]")) fsSet(!FS, true); });
/* the button shows while the pointer moves over the picture (or a finger taps it) and hides 1.5 s after it stops or leaves */
var fsMoveT = null;
function fsMoving(e) {
  var pap = e.target.closest && e.target.closest("#main .paper");
  var old = document.querySelector("#main .paper.moving");
  if (old && old !== pap) old.classList.remove("moving");
  if (!pap) return;
  pap.classList.add("moving");
  clearTimeout(fsMoveT);
  fsMoveT = setTimeout(function () { pap.classList.remove("moving"); }, 1500);
}
document.addEventListener("pointermove", fsMoving);
document.addEventListener("pointerdown", fsMoving);
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && FS && st.view === "ex") fsSet(false, true); });
/* a click on the dimmed part beside the picture closes it. A popover's backdrop lets clicks through to the page under it,
   so those are stopped here before anything else sees them. A pen line ending past the edge is still the paper's
   (pointer capture), so it does not count. */
function fsOut(e) {
  var pap = FS && st.view === "ex" && document.querySelector("#main .paper.fs");
  return !!pap && !pap.contains(e.target);
}
["pointerdown", "mousedown", "pointerup", "mouseup", "click", "dblclick", "auxclick", "contextmenu"].forEach(function (t) {
  window.addEventListener(t, function (e) {
    if (!fsOut(e)) return;
    e.preventDefault(); e.stopPropagation();
    if (t === "click") fsSet(false, true);
  }, true);
});

var inkNow = null;
document.addEventListener("pointerdown", function (e) {
  var tip = eraserTip(e);
  if (zG || st.view !== "ex" || (!st.tool && !tip) || (e.button > 0 && !tip)) return;
  var pap = e.target.closest && e.target.closest("#main .paper");
  if (!pap || e.target.closest(".ink-bar, .pin, .zbadge, .zfs")) return;
  e.preventDefault();
  LASTSURF = "schem";
  try { pap.setPointerCapture(e.pointerId); } catch (x) {} /* keeps the line going when the pointer leaves the schematic */
  if (st.tool === "erase" || tip) { inkNow = { erase: true, pap: pap }; inkErase(pap, e); return; }
  var live = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  live.setAttribute("class", "ink ink-live"); live.setAttribute("viewBox", "0 0 100 100"); live.setAttribute("preserveAspectRatio", "none");
  var zz = +zcur().z.toFixed(3); /* the line looks 3 px wide now, so thinner once you zoom back out */
  live.innerHTML = '<path stroke="' + st.inkC + '" style="--w:' + zz + '"/>';
  zEl(pap).appendChild(live);
  inkNow = { pap: pap, live: live, q: { k: newCode() + newCode(), id: PROBS[st.pi].id, c: st.inkC, p: [inkPt(pap, e)], z: zz } };
  live.firstChild.setAttribute("d", inkPath(inkNow.q.p));
});
document.addEventListener("pointermove", function (e) {
  if (!inkNow) return;
  if (inkNow.erase) { inkErase(inkNow.pap, e); return; }
  var pt = inkPt(inkNow.pap, e), last = inkNow.q.p[inkNow.q.p.length - 1];
  if (Math.abs(pt[0] - last[0]) + Math.abs(pt[1] - last[1]) < 0.3) return; /* skip tiny moves: fewer points to send */
  inkNow.q.p.push(pt);
  inkNow.live.firstChild.setAttribute("d", inkPath(inkNow.q.p));
});
function inkEnd() {
  if (!inkNow) return;
  var n = inkNow; inkNow = null;
  if (n.erase) return;
  n.live.remove();
  INK[n.q.k] = n.q;
  undoPush(n.q.id, { ink: "add", q: n.q });
  if (RT) rtSend("draw", n.q); /* the whole line, once it is finished */
  drawShared();
}
document.addEventListener("pointerup", inkEnd);
document.addEventListener("pointercancel", inkEnd);

/* ---------- Spolu: optional live room. Peers connect directly over WebRTC (Trystero; public Nostr relays carry the
   handshake). When a network blocks direct connections, messages to that person go through the same Nostr relays instead,
   encrypted with a key derived from the room code. The library is loaded only when someone creates or joins a room,
   so solo use never touches the network. ---------- */
var RT = null;
var TRYSTERO = "https://cdn.jsdelivr.net/npm/trystero@0.26.0/+esm";
var PCOL = ["#e5484d", "#1e88e5", "#2e9e5b", "#8e44ad", "#ef6c00", "#00979c", "#d6409f"];
function hashCol(id) { var h = 0; id = String(id); for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return Math.abs(h) % PCOL.length; }
/* colours must differ, so a hash alone isn't enough: in the order people joined (then id), each takes their own hash
   colour unless someone earlier has it, else the first free one. Everyone knows the same join times (sent in "hi"),
   so all agree, and a newcomer never changes anyone else's colour. Past 7 people colours repeat. */
function peerCol(id) {
  id = String(id);
  if (!RT) return PCOL[hashCol(id)];
  var ids = Object.keys(RT.members).concat(RT.me), taken = {}, mine = null;
  if (ids.indexOf(id) < 0) return PCOL[hashCol(id)]; /* someone who already left (an old pin) */
  var since = function (k) { return k === RT.me ? RT.since : RT.members[k].since || Infinity; };
  ids.sort(function (a, b) { return since(a) - since(b) || (a < b ? -1 : 1); });
  ids.forEach(function (k) {
    if (Object.keys(taken).length >= PCOL.length) taken = {}; /* all used: start over */
    var c = hashCol(k);
    if (taken[c]) for (var j = 0; j < PCOL.length; j++) if (!taken[j]) { c = j; break; }
    taken[c] = true;
    if (k === id) mine = c;
  });
  return PCOL[mine];
}
/* my colour can change once I learn who was here first: move my pen to it, unless I picked another pen colour */
function rtMyCol() {
  var c = peerCol(RT.me);
  if (c === RT.myCol) return;
  if (st.inkC === RT.myCol) st.inkC = c;
  if (PADC === RT.myCol) PADC = c;
  RT.myCol = c; padTools();
  var sw = document.querySelector('#main [data-ink="color"] i'); if (sw) sw.style.background = st.inkC;
}
function newCode() { var a = "abcdefghjkmnpqrstuvwxyz23456789", r = crypto.getRandomValues(new Uint8Array(6)), s = ""; for (var i = 0; i < 6; i++) s += a[r[i] % a.length]; return s; }
function setUrlRoom(code) { var u = new URL(location.href); if (code) u.searchParams.set("room", code); else u.searchParams.delete("room"); history.replaceState(null, "", u.href); }
function rtMsg(t) { var m = $("#rtmsg"); if (m) m.textContent = t; }
function rtUi() {
  var b = $("#rtbody"), c = RT ? rtCount() : { n: 0, r: 0 }, n = c.n;
  $("#rtbtn").classList.toggle("on", !!RT);
  $("#rtn").textContent = RT ? String(n + 1) : "";
  $("#dhint").textContent = RT ? "pravý klik = ukázat ostatním" : "";
  var chip = $("#rtchip");
  chip.hidden = !RT;
  if (RT) {
    chip.textContent = "Místnost " + RT.code + " · " + (n ? (n + 1) + (n + 1 < 5 ? " lidé" : " lidí") : "jen vy");
  }
  if (!RT) {
    b.innerHTML = "<h2>Spolu</h2><p>Otevřete sbírku na více počítačích a propojte je kódem. Uvidíte, kde je ten druhý, jeho ukazatel ve schématu a společné poznámky. Spojení jde přímo mezi prohlížeči, nic se nikam neukládá.</p>" +
      '<button class="btn primary" type="button" data-rt="create">Vytvořit místnost</button>' +
      '<div class="rtrow"><input id="rtcode" placeholder="nebo zadej kód místnosti" autocomplete="off" aria-label="Kód místnosti"><button class="btn" type="button" data-rt="join">Připojit</button></div><p class="msg" id="rtmsg" role="status"></p>';
    return;
  }
  var url = new URL(location.href); url.hash = "";
  b.innerHTML = "<h2>Místnost <code>" + RT.code + "</code></h2><p>" + (n ? "Připojeno: " + (n + 1) + " (vy + " + n + ")" + (c.r ? ", z toho " + c.r + " přes veřejné relaye, protože síť nepovolila přímé spojení (ukazatel je trhanější)." : ".") : "Čekám na ostatní… pošli jim odkaz nebo kód.") + "</p>" +
    '<div class="rtrow"><input id="rtlink" readonly aria-label="Odkaz do místnosti" value="' + url.href.replace(/"/g, "&quot;") + '"><button class="btn" type="button" data-rt="copy">Kopírovat</button></div>' +
    '<label><input type="checkbox" id="rtfollow"' + (RT.follow ? " checked" : "") + "> sledovat ostatní (přejdu tam, kam oni)</label>" +
    "<ul class=\"rthelp\"><li><b>Ukazatel</b>: najeď myší na schéma</li><li><b>Poznámka</b>: dvojklik na schéma, klik ji smaže</li><li><b>Kreslení</b>: pravý horní roh schématu</li><li><b>Ukázat ostatním</b>: pravý klik na vzorec (v listu, v krocích i na stránkách), zadanou hodnotu, řádek výsledků ve zkoušce, blok, vzor nebo štítek u schématu. Vzory, tahák a Bloky si jinak každý prochází sám.</li><li><b>Otevřít všem</b>: pravý klik na příklad v seznamu (i těm, kdo nesledují)</li><li><b>Poznámky ✎</b> u pravého okraje se otevřou všem</li></ul>" +
    '<button class="btn" type="button" data-rt="leave">Opustit místnost</button><p class="msg" id="rtmsg" role="status"></p>';
}
function viewNow() {
  var p = PROBS[st.pi];
  /* always the problem state, also while you are on a page: Vzory, Co na tahák and Bloky are personal */
  return { v: "ex", id: p.id, mode: curMode(p), ns: st.ns, pf: st.pf, allhl: !!st.allhl, clean: !!st.clean,
           done: p.m.steps.map(function (_, i) { return i; }).filter(function (i) { return solved(p, i); }) };
}
/* called from render(): broadcast my view when it changed, and redraw the shared layer */
function rtAfterRender() {
  if (!RT) return;
  var v = viewNow(), k = JSON.stringify(v);
  if (k !== RT.lastKey) { RT.lastKey = k; if (!RT.applying) rtSend("view", v); }
  drawShared(); zkCarets();
}
function applyView(d) {
  if (!RT || !RT.follow || !d || typeof d !== "object") return;
  RT.need = false;
  RT.applying = true;
  try {
    if (d.v !== "ex") return;
    var i = PROBS.findIndex(function (p) { return p.id === d.id; });
    if (i < 0) return;
    /* someone on a page stays there; their problem follows quietly, so "Příklady" takes them to the room's problem */
    var p = PROBS[i], changed = st.lastId !== p.id, onPage = st.view !== "ex";
    st.pi = i; st.lastId = p.id; st.openCh = p.ch;
    if (!onPage) st.patFocus = null;
    st.mode = d.mode === "practice" || d.mode === "exam" ? d.mode : "learn";
    st.ns = isFinite(d.ns) ? Math.max(0, d.ns | 0) : 0;
    st.pf = d.pf == null || !isFinite(d.pf) ? null : Math.max(0, d.pf | 0);
    st.allhl = d.allhl === true; st.clean = d.clean === true;
    /* steps someone else solved: show them here as revealed, with the correct value filled in */
    if (Array.isArray(d.done)) d.done.slice(0, 50).forEach(function (k) {
      var stp = p.m.steps[k], s = pg(p);
      if (!stp || solved(p, k)) return;
      s.rev[k] = true;
      if (stp.ans != null) { s.val[k] = String(stp.ans).replace(".", ","); s.fb[k] = "ok"; }
    });
    if (!onPage) history.replaceState(null, "", "#" + p.m.id);
    render();
    if (changed && !onPage) { window.scrollTo(0, 0); scrollListToCurrent(); }
  } finally { RT.applying = false; }
}
/* everything below arrives from other people's browsers: validate before use */
function pct(v) { return typeof v === "number" && v >= 0 && v <= 100 ? v : null; }
function mergePins(list) {
  if (!Array.isArray(list)) return;
  list.slice(0, 300).forEach(function (q) {
    if (!q || typeof q.k !== "string" || q.k.length > 24 || typeof q.id !== "string") return;
    if (!PROBS.some(function (p) { return p.id === q.id; })) return;
    var x = pct(q.x), y = pct(q.y);
    if (x == null || y == null) return;
    RT.pins[q.k] = { k: q.k, id: q.id, x: x, y: y, t: typeof q.t === "string" ? q.t.slice(0, 200) : "", by: String(q.by || "").slice(0, 40) };
  });
}
function drawShared() {
  if (RT) rtMyCol();
  padCarets(); /* someone left or I left the room */
  var pap = document.querySelector("#main .zoom"), old = pap && pap.querySelector(".shared");
  if (old) old.remove();
  if (!pap || st.view !== "ex") return;
  var id = PROBS[st.pi].id, lay = document.createElement("div");
  lay.className = "shared";
  lay.innerHTML = inkSvg(Object.keys(INK).map(function (k) { return INK[k]; }).filter(function (q) { return q.id === id; }));
  if (RT) Object.keys(RT.pins).forEach(function (k) {
    var q = RT.pins[k];
    if (q.id !== id) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "pin" + (q.t ? "" : " dot"); b.dataset.pin = k;
    b.style.left = q.x + "%"; b.style.top = q.y + "%"; b.style.setProperty("--c", peerCol(q.by));
    b.textContent = q.t; b.title = "Klikni pro smazání";
    lay.appendChild(b);
  });
  if (RT) Object.keys(RT.cur).forEach(function (pid) {
    var c = RT.cur[pid];
    if (c.id !== id || Date.now() - c.at > 4000) return;
    var i = document.createElement("i");
    i.className = "pcur"; i.style.left = c.x + "%"; i.style.top = c.y + "%"; i.style.setProperty("--c", peerCol(pid));
    lay.appendChild(i);
  });
  pap.appendChild(lay);
}
function rtAlive(m) { return !!m.p2p || Date.now() - m.seen < 30000; }
/* n = other people in the room, r = how many of them are reachable only through the relays */
function rtCount() {
  var n = 0, r = 0;
  Object.keys(RT.members).forEach(function (k) { var m = RT.members[k]; if (rtAlive(m)) { n++; if (!m.p2p) r++; } });
  return { n: n, r: r };
}
function pinList() { return Object.keys(RT.pins).map(function (k) { return RT.pins[k]; }).slice(-60); }
/* one envelope for both paths: {f: sender id, s: sequence no., t: type, d: data, to: recipient (optional)} */
function rtSend(t, d, to) {
  if (!RT) return;
  var msg = { f: RT.me, s: ++RT.seq, t: t, d: d };
  if (to) msg.to = to;
  var tp = to && RT.members[to] && RT.members[to].p2p;
  if (tp) RT.a.m.send(msg, { target: tp }); else if (!to) RT.a.m.send(msg);
  if (t === "here" || t === "bye" || (to ? !tp : rtCount().r)) relayPub(msg);
}
function rtRecv(msg, pid) {
  if (!RT || !msg || typeof msg !== "object" || typeof msg.f !== "string" || msg.f.length > 24 || msg.f === RT.me || typeof msg.t !== "string") return;
  if (msg.to && msg.to !== RT.me) return;
  var key = msg.f + ":" + msg.s;
  if (RT.dup[key]) return; /* the same message can arrive both directly and through a relay */
  RT.dup[key] = 1; RT.dupQ.push(key); if (RT.dupQ.length > 600) delete RT.dup[RT.dupQ.shift()];
  var before = JSON.stringify(rtCount()), m = RT.members[msg.f], isNew = !m || !rtAlive(m);
  if (!m) m = RT.members[msg.f] = { p2p: null, seen: 0 };
  if (pid) m.p2p = pid; else m.seen = Date.now();
  var d = msg.d;
  if (msg.t === "bye") { delete RT.members[msg.f]; delete RT.cur[msg.f]; isNew = false; drawShared(); }
  if (isNew) rtSend("hi", { need: RT.need, since: RT.since, pins: pinList(), ink: inkList(), pad: padState(), zoom: ZOOM, zk: zkR() }, msg.f);
  /* a newcomer asks for the current view once; whoever has been in the room longer answers, never the newcomer */
  if (msg.t === "hi" && d && typeof d === "object") { if (isFinite(d.since) && d.since > 0) m.since = +d.since; /* for peerCol */ if (d.zoom && typeof d.zoom === "object") Object.keys(d.zoom).slice(0, 200).forEach(function (id) { var w = d.zoom[id]; if (w) zMerge({ id: id, z: w.z, x: w.x, y: w.y }); }); mergePins(d.pins); mergeInk(d.ink); if (d.pad) padRecv("padhi", d.pad);
    if (d.zk && typeof d.zk === "object") Object.keys(d.zk).slice(0, 200).forEach(function (id) { var v = d.zk[id]; if (typeof v === "string" && !zkR()[id] && PROBS.some(function (p) { return p.id === id; })) { zkR()[id] = v.slice(0, 4000); zkShow(id, null); } }); if (d.need === true && (!RT.need || RT.since < d.since)) rtSend("view", viewNow(), msg.f); drawShared(); }
  if (msg.t === "view") applyView(d);
  if (msg.t === "goto" && d && typeof d.id === "string") rtGoto(d.id);
  if (msg.t === "ptr" && d && typeof d.id === "string") {
    var x = pct(d.x), y = pct(d.y);
    if (x == null || y == null) delete RT.cur[msg.f]; else RT.cur[msg.f] = { id: d.id, x: x, y: y, at: Date.now() };
    drawShared();
  }
  if (msg.t === "pin" && d && typeof d === "object") { d.by = msg.f; mergePins([d]); drawShared(); }
  if (msg.t === "unpin" && typeof d === "string" && RT.pins[d]) { delete RT.pins[d]; drawShared(); }
  if (msg.t === "draw") { mergeInk([d]); drawShared(); }
  if (msg.t.slice(0, 3) === "pad") padRecv(msg.t, d, msg.f);
  if (msg.t === "pshow" && d && (d.k === null || (typeof d.k === "string" && PATTERNS[d.k]))) showPat(d.k);
  if (msg.t === "bshow" && d && (d.k === null || (typeof d.k === "string" && /^[a-z]{1,10}(\.\d{1,2})?$/.test(d.k)))) showBlock(d.k);
  if (msg.t === "fshow" && d && Number.isInteger(d.i) && d.i >= -1 && d.i < 500) showFormula(d.i);
  if (msg.t === "erase" && typeof d === "string" && INK[d]) { delete INK[d]; drawShared(); }
  if (msg.t === "zoom") zMerge(d);
  if (msg.t === "fs" && d && typeof d.on === "boolean") fsSet(d.on);
  if (msg.t === "zkop" || msg.t === "zkt" || msg.t === "zkc" || msg.t === "zkchk") zkRecv(msg.t, d, msg.f);
  if (msg.t === "hl" && d && typeof d.pg === "string" && /^(ex:[\w.\-]{1,16}|vzory|bloky|tahak)$/.test(d.pg) && (d.k === null || (typeof d.k === "string" && /^[\w.\-]{1,40}$/.test(d.k)))) showHl(d);
  if (JSON.stringify(rtCount()) !== before) rtUi();
}
/* ---- relay path: Trystero's own Nostr relay sockets, ephemeral events, AES-GCM with a key from the room code ---- */
function b64(u) { var t = ""; for (var i = 0; i < u.length; i++) t += String.fromCharCode(u[i]); return btoa(t); }
function unb64(t) { var b = atob(t), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
function relaySetup(T, code) {
  var te = new TextEncoder();
  return Promise.all([crypto.subtle.digest("SHA-256", te.encode("sbirka/" + SB.id + "/topic/" + code)), crypto.subtle.digest("SHA-256", te.encode("sbirka/" + SB.id + "/key/" + code))]).then(function (h) {
    return crypto.subtle.importKey("raw", h[1], "AES-GCM", false, ["encrypt", "decrypt"]).then(function (key) {
      var topic = Array.from(new Uint8Array(h[0])).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
      return { T: T, key: key, topic: topic, sub: SB.id + newCode() + newCode(), socks: new WeakSet(), next: {}, timer: null };
    });
  });
}
function relaySocks(R) {
  var out = [];
  if (!R) return out;
  var all = R.T.getRelaySockets() || {};
  Object.keys(all).forEach(function (u) {
    var so = all[u];
    if (!so || so.readyState !== 1) return;
    if (!R.socks.has(so)) { R.socks.add(so); so.addEventListener("message", relayIn); so.send(R.T.subscribe(R.sub, R.topic)); }
    out.push(so);
  });
  return out;
}
function relayIn(e) {
  var R = RT && RT.relay, a;
  if (!R) return;
  try { a = JSON.parse(e.data); } catch (x) { return; }
  if (!Array.isArray(a) || a[0] !== "EVENT" || a[1] !== R.sub || !a[2] || typeof a[2].content !== "string") return;
  var parts = a[2].content.split(".");
  if (parts.length !== 2) return;
  /* only someone with the room code can produce a message that decrypts */
  try {
    crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(parts[0]) }, R.key, unb64(parts[1])).then(function (pt) {
      var msg; try { msg = JSON.parse(new TextDecoder().decode(pt)); } catch (x) { return; }
      rtRecv(msg, null);
    }, function () {});
  } catch (x) {}
}
function relayPub(msg) {
  var R = RT && RT.relay;
  if (!R) return;
  if (msg.t === "ptr" || msg.t === "zoom") { /* relays rate-limit, so at most 4 pointer / zoom updates per second, always the latest */
    R.next[msg.t] = msg;
    if (!R.timer) R.timer = setTimeout(function () { R.timer = null; var n = R.next; R.next = {}; Object.keys(n).forEach(function (t) { relayRaw(R, n[t]); }); }, 250);
    return;
  }
  relayRaw(R, msg);
}
function relayRaw(R, msg) {
  var iv = crypto.getRandomValues(new Uint8Array(12));
  crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, R.key, new TextEncoder().encode(JSON.stringify(msg))).then(function (ct) {
    return R.T.createEvent(R.topic, b64(iv) + "." + b64(new Uint8Array(ct)));
  }).then(function (ev) { relaySocks(R).forEach(function (so) { try { so.send(ev); } catch (x) {} }); }, function () {});
}
function rtJoin(code, creator) {
  code = String(code || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
  if (code.length < 4) { rtMsg("Kód má aspoň 4 znaky."); return; }
  rtMsg("Připojuji…");
  import(TRYSTERO).then(function (T) {
    if (RT) rtLeave();
    var room = T.joinRoom({ appId: "sbirka-" + SB.id, password: code }, code);
    var me = RT = { room: room, me: newCode() + newCode(), seq: 0, code: code, since: Date.now(), members: {}, pins: {}, cur: {}, dup: {}, dupQ: [], a: {}, relay: null, timers: [],
                    follow: true, need: !creator, lastKey: null, applying: false };
    RT.a.m = room.makeAction("m");
    RT.a.m.onMessage = function (msg, meta) { rtRecv(msg, meta && meta.peerId); };
    room.onPeerJoin = function (pid) { RT.a.m.send({ f: RT.me, s: ++RT.seq, t: "here" }, { target: pid }); };
    room.onPeerLeave = function (pid) {
      Object.keys(RT.members).forEach(function (k) {
        var m = RT.members[k];
        if (m.p2p === pid) { m.p2p = null; if (!rtAlive(m)) { delete RT.members[k]; delete RT.cur[k]; } }
      });
      drawShared(); rtUi();
    };
    relaySetup(T, code).then(function (R) {
      if (RT !== me) return;
      RT.relay = R;
      var beat = function () { if (RT === me) rtSend("here"); }; /* presence over the relays, so blocked peers are found too */
      RT.timers.push(setTimeout(beat, 1500), setTimeout(beat, 4000), setInterval(beat, 10000));
    }, function () {});
    setUrlRoom(code);
    RT.lastKey = JSON.stringify(viewNow());
    /* your pen starts in your room colour (the one others see for your pointer and pins) */
    st.inkC = PADC = RT.myCol = peerCol(RT.me); padTools();
    var sw = document.querySelector('#main [data-ink="color"] i'); if (sw) sw.style.background = st.inkC;
    rtUi(); drawShared();
    if (st.view === "ex" && curMode(PROBS[st.pi]) === "exam") render(); /* the box shows the room's shared text */
  }).catch(function () { rtMsg("Spojení se nepodařilo spustit (jste online?)."); });
}
function rtLeave() {
  if (!RT) return;
  rtSend("bye");
  var R = RT.relay;
  if (R) setTimeout(function () { relaySocks(R).forEach(function (so) { try { so.send(JSON.stringify(["CLOSE", R.sub])); } catch (x) {} }); }, 1000);
  RT.timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
  RT.room.leave(); RT = null; showFormula(-1); BON = null; markBlock(); HON = null; markHl();
  setUrlRoom(null); drawShared(); rtUi();
  if (st.view === "ex" && curMode(PROBS[st.pi]) === "exam") render(); /* your own text back in the box */
}
var ptrAt = 0, ptrIn = false;
document.addEventListener("pointermove", function (e) {
  if (!RT || st.view !== "ex") return;
  var pap = e.target.closest && e.target.closest("#main .paper");
  if (!pap) { if (ptrIn) { ptrIn = false; rtSend("ptr", { id: PROBS[st.pi].id, x: null }); } return; }
  var now = Date.now();
  if (now - ptrAt < 40) return; /* ~25 updates/s is plenty for a pointer */
  ptrAt = now; ptrIn = true;
  var r = zEl(pap).getBoundingClientRect();
  rtSend("ptr", { id: PROBS[st.pi].id, x: +((e.clientX - r.left) / r.width * 100).toFixed(2), y: +((e.clientY - r.top) / r.height * 100).toFixed(2) });
});
document.addEventListener("dblclick", function (e) {
  if (!RT || st.view !== "ex") return;
  var pap = e.target.closest && e.target.closest("#main .paper");
  if (!pap || st.tool || e.target.closest(".pin, .ink-bar, .zbadge, .zfs")) return;
  var r = zEl(pap).getBoundingClientRect();
  var t = window.prompt("Poznámka k tomuto místu (uvidí ji všichni v místnosti, může být prázdná):", "");
  if (t === null) return;
  var q = { k: newCode() + newCode(), id: PROBS[st.pi].id, x: +((e.clientX - r.left) / r.width * 100).toFixed(2), y: +((e.clientY - r.top) / r.height * 100).toFixed(2), t: t.trim().slice(0, 200) };
  q.by = RT.me; mergePins([q]); rtSend("pin", q); drawShared();
  LASTSURF = "schem"; undoPush(q.id, { pin: "add", q: RT.pins[q.k] });
});
setInterval(function () { /* drop idle pointers and people who went quiet */
  if (!RT) return;
  var gone = false;
  Object.keys(RT.members).forEach(function (k) { if (!rtAlive(RT.members[k])) { delete RT.members[k]; delete RT.cur[k]; gone = true; } });
  if (gone) rtUi();
  if (gone || Object.keys(RT.cur).length) drawShared();
}, 1000);

/* ---------- side drawers (formulas, scratchpad): click the handle to slide it, drag the handle to move it
   up/down or (when open) push it back toward the edge, drag the bottom edge to resize ---------- */
/* fit to the window for display only, so a small window never overwrites the remembered size */
function drFit(o) {
  var vw = window.innerWidth, vh = window.innerHeight;
  var w = Math.max(160, Math.min(o.w, vw - 36)), h = Math.max(90, Math.min(o.h, vh - 16));
  return { w: w, h: h, top: Math.max(8, Math.min(o.top, vh - h - 8)) };
}
var DRAWERS = [
  { s: DR, root: "#drawer", panel: "#dpanel", handle: "#dhandle", grip: "#dgrip" },
  { s: PD, root: "#pad", panel: "#ppanel", handle: "#phandle", grip: "#pgrip", onOpen: function () { padGrow(); if (RT) rtSend("pado"); } }
];
function drShow(D, f, hoff) {
  var d = $(D.root), p = $(D.panel);
  d.classList.toggle("open", D.s.open);
  d.style.top = f.top + "px"; d.style.setProperty("--dt", f.top + "px"); d.style.setProperty("--hoff", hoff + "px");
  p.style.width = f.w + "px"; p.style.height = f.h + "px";
  p.inert = !D.s.open;
  $(D.handle).setAttribute("aria-expanded", String(D.s.open));
}
/* always lays out both drawers. The scratchpad is the lower layer, so its handle is kept clear of the formula drawer
   (its handle, or its whole panel while open): slid along the pad's edge if possible, else to any free spot on screen,
   else the pad is lifted above the formulas. Display only: the remembered positions stay as the user set them. */
function drApply() {
  var vh = window.innerHeight, ff = drFit(DR), pf = drFit(PD), off = 0, up = false, HH = 32;
  var z0 = DR.open ? ff.top - 6 : ff.top + ff.h / 2 - HH - 6, z1 = DR.open ? ff.top + ff.h + 6 : ff.top + ff.h / 2 + HH + 6;
  var c = pf.top + pf.h / 2;
  if (c + HH > z0 && c - HH < z1) {
    var want = c >= (z0 + z1) / 2 ? [z1 + HH, z0 - HH] : [z0 - HH, z1 + HH], pick = null;
    want.forEach(function (v) { if (pick === null && v >= pf.top + HH && v <= pf.top + pf.h - HH) pick = v; });
    want.forEach(function (v) { if (pick === null && v >= 8 + HH && v <= vh - 8 - HH) pick = v; });
    if (pick === null) up = true; else off = pick - c;
  }
  $("#pad").classList.toggle("up", up);
  drShow(DRAWERS[0], ff, 0);
  drShow(DRAWERS[1], pf, off);
}
function drDrag(D, el, move) {
  var g = null;
  el.addEventListener("pointerdown", function (e) { g = drFit(D.s); g.x = e.clientX; g.y = e.clientY; g.moved = false; el.setPointerCapture(e.pointerId); el.moved = false; });
  el.addEventListener("pointermove", function (e) {
    if (!g) return;
    var dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.moved && Math.abs(dx) + Math.abs(dy) < 6) return; /* below this it is a click */
    g.moved = el.moved = true;
    move(g, dx, dy); var f = drFit(D.s); D.s.top = f.top; D.s.w = f.w; D.s.h = f.h; drApply(D);
  });
  function end() { if (g && g.moved) { save(); if (D.s === PD) padGrow(); } g = null; }
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
}
DRAWERS.forEach(function (D) {
  drDrag(D, $(D.handle), function (g, dx, dy) { D.s.top = g.top + dy; if (D.s.open) D.s.w = g.w - dx; });
  drDrag(D, $(D.grip), function (g, dx, dy) { D.s.h = g.h + dy; });
  $(D.handle).addEventListener("click", function () {
    if (this.moved) { this.moved = false; return; } /* the click that ends a drag */
    D.s.open = !D.s.open; drApply(D); save();
    if (D.s.open && D.onOpen) D.onOpen();
  });
});
window.addEventListener("resize", function () { drApply(); });
/* the closed handle grows by the scrollbar width. Classic scrollbars can be measured; overlay ones read 0 and are drawn
   over the page, so assume 12px and add that as padding the scrollbar covers, plus 12px visible. Re-measured on page resize. */
new ResizeObserver(function () {
  var r = document.documentElement, w = window.innerWidth - r.clientWidth;
  r.style.setProperty("--sb", (w > 0 ? w : 24) + "px");
  r.style.setProperty("--sbo", (w > 0 ? 0 : 12) + "px");
}).observe(document.documentElement);
var fN = 0;
$("#dbody").innerHTML = (window.VZORCE || []).map(function (g) {
  return "<h3>" + esc(g.g) + "</h3><dl>" + g.f.map(function (x) { var i = fN++; return '<dt data-f="' + i + '">' + esc(x[0]) + '</dt><dd data-f="' + i + '">$' + x[1] + "$</dd>"; }).join("") + "</dl>";
}).join("");
/* open the formula sheet at formula i and flash it (also when someone in the room points at it) */
/* the shown formula stays highlighted until another one is shown, the same one is right-clicked again,
   the room moves to another problem, or you leave the room. i = -1 clears it. */
var FON = -1, FON_P = null;
function showFormula(i) {
  document.querySelectorAll("#dbody .fon").forEach(function (el) { el.classList.remove("fon"); });
  FON = -1;
  var els = document.querySelectorAll('#dbody [data-f="' + i + '"]');
  if (i < 0 || !els.length) return;
  FON = i; FON_P = PROBS[st.pi].id;
  HON = null; markHl();
  if (!DR.open) { DR.open = true; drApply(); save(); }
  var bd = $("#dbody"), br = bd.getBoundingClientRect(), er = els[0].getBoundingClientRect(), dr = els[1].getBoundingClientRect();
  bd.scrollTo(Math.max(0, er.left - br.left + bd.scrollLeft - 12), Math.max(0, er.top - br.top + bd.scrollTop - bd.clientHeight / 2 + (dr.bottom - er.top) / 2));
  els.forEach(function (el) { el.classList.add("fon"); });
}
/* in a room, right-click (long-press on touch) a formula to show it to everyone; alone, the normal menu stays */
$("#dbody").addEventListener("contextmenu", function (e) {
  var f = e.target.closest && e.target.closest("[data-f]");
  if (!RT || !f) return;
  e.preventDefault(); e.stopPropagation(); /* capture phase: MathJax would otherwise open its own menu on the formula */
  var i = +f.dataset.f === FON ? -1 : +f.dataset.f; /* right-click the highlighted one again to clear it for everyone */
  rtSend("fshow", { i: i });
  showFormula(i);
}, true);

/* ---------- scratchpad: type and draw. Text is monospace so a caret position converts to px for "Na aktivní místo".
   Coordinates are px of the canvas; the canvas grows to the content + 150 px so you can scroll further (never scrolls by
   itself). In a room the pad is shared: opening it opens it for everyone, closing is local. Kept for this visit only. ---------- */
var PAD = { t: "", s: {}, act: null }, PADT = "text", PADC = INKC[1], padTimer = null, padAtT = 0, padNow = null;
var PAD_CW = 8.4, PAD_LH = 20, PAD_X0 = 10, PAD_Y0 = 8; /* 14px monospace: 0.6em per character */
function padTools() {
  $("#ptools").innerHTML =
    '<button type="button" data-pad="text" title="Psaní" aria-label="Psaní" aria-pressed="' + (PADT === "text") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6V4h14v2M12 4v16M9 20h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    '<button type="button" data-pad="pen" title="Pero" aria-label="Pero" aria-pressed="' + (PADT === "pen") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>' +
    '<button type="button" data-pad="erase" title="Guma: smaže celou čáru, které se dotkne" aria-label="Guma" aria-pressed="' + (PADT === "erase") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19l-5-5 9.5-9.5a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 19zM9 19h11M7.5 10.5l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg></button>' +
    '<button type="button" data-pad="color" title="Barva pera" aria-label="Barva pera"><i style="background:' + PADC + '"></i></button>' +
    '<button type="button" class="pact" data-pad="active" title="Posune na místo, kde naposledy psal nebo kreslil někdo jiný"' + (PAD.act ? "" : " disabled") + ">Na aktivní místo</button>";
  $("#pcanvas").classList.toggle("drawing", PADT !== "text");
}
function padDraw() { $("#pdone").innerHTML = Object.keys(PAD.s).map(function (k) { var q = PAD.s[k]; return '<path d="' + inkPath(q.p) + '" stroke="' + q.c + '"/>'; }).join(""); }
/* grow the canvas when content gets within 150 px of its right or bottom edge */
function padGrow(extra) {
  var body = $("#pbody"), cv = $("#pcanvas"), lines = PAD.t.split("\n"), mx = 0, my = 0;
  var cols = lines.reduce(function (a, l) { return Math.max(a, l.length); }, 0);
  mx = PAD_X0 + cols * PAD_CW; my = PAD_Y0 + lines.length * PAD_LH;
  Object.keys(PAD.s).forEach(function (k) { PAD.s[k].p.forEach(function (q) { if (q[0] > mx) mx = q[0]; if (q[1] > my) my = q[1]; }); });
  if (extra) { mx = Math.max(mx, extra[0]); my = Math.max(my, extra[1]); }
  var W = Math.ceil(Math.max(body.clientWidth, mx + 150)), H = Math.ceil(Math.max(body.clientHeight, my + 150));
  cv.style.width = W + "px"; cv.style.height = H + "px";
  var svg = $("#pink"); svg.setAttribute("width", W); svg.setAttribute("height", H);
}
function px(v) { return typeof v === "number" && v >= 0 && v <= 100000 ? v : null; }
function padActive(x, y) {
  if (px(x) == null || px(y) == null) return;
  var first = !PAD.act;
  PAD.act = { x: x, y: y };
  if (first) padTools();
}
function padPt(e) { var r = $("#pcanvas").getBoundingClientRect(); return [Math.max(0, Math.round(e.clientX - r.left)), Math.max(0, Math.round(e.clientY - r.top))]; }
function padState() { return { t: PAD.t, s: Object.keys(PAD.s).map(function (k) { return PAD.s[k]; }).slice(-30) }; }
/* strokes from other people's browsers: validate before use */
function padMerge(list) {
  if (!Array.isArray(list)) return;
  list.slice(0, 300).forEach(function (q) {
    if (!q || typeof q.k !== "string" || q.k.length > 24 || INKC.indexOf(q.c) < 0 || !Array.isArray(q.p) || !q.p.length || q.p.length > 2000) return;
    var ok = q.p.every(function (a) { return Array.isArray(a) && px(a[0]) != null && px(a[1]) != null; });
    if (ok) PAD.s[q.k] = { k: q.k, c: q.c, p: q.p.map(function (a) { return [a[0], a[1]]; }) };
  });
}
function padSetText(v, shift) {
  if (typeof v !== "string") return;
  PAD.t = v.slice(0, 20000);
  var ta = $("#ptext"), focused = document.activeElement === ta, a = ta.selectionStart, b = ta.selectionEnd;
  if (ta.value !== PAD.t) {
    ta.value = PAD.t;
    if (focused) ta.setSelectionRange(Math.min(shift ? shift(a) : a, PAD.t.length), Math.min(shift ? shift(b) : b, PAD.t.length));
  }
  padCarets();
}
/* in a room the text is shared like the Zkouška box: every keystroke goes out as an edit with your caret, the others'
   carets are thin lines in their colour, and the whole text follows once typing pauses (two people stopping together:
   the lower id wins). The pad is a fixed monospace grid without wrapping, so a caret is just line × LH, column × CW. */
var padEditT = 0, padLastC = null;
function padXY(c) { var b = PAD.t.slice(0, c).split("\n"); return [Math.round(PAD_X0 + b[b.length - 1].length * PAD_CW), Math.round(PAD_Y0 + (b.length - 1) * PAD_LH)]; }
function padCaret(ta, gone) {
  if (!RT) return;
  var c = gone ? -1 : ta.selectionStart;
  if (c === padLastC) return;
  padLastC = c;
  rtSend("padc", { c: c });
}
function padCarets() {
  var cv = $("#pcanvas"), lay = $("#pcarets");
  if (!lay) { lay = document.createElement("div"); lay.id = "pcarets"; lay.className = "zcarets"; lay.setAttribute("aria-hidden", "true"); cv.appendChild(lay); }
  lay.innerHTML = "";
  if (!RT || !RT.pcar) return;
  Object.keys(RT.pcar).forEach(function (pid) {
    var mem = RT.members[pid], xy = padXY(Math.min(RT.pcar[pid], PAD.t.length));
    if (!mem || !rtAlive(mem)) return;
    var i = document.createElement("i");
    i.className = "zcaret"; i.style.setProperty("--c", peerCol(pid));
    i.style.left = xy[0] + "px"; i.style.top = xy[1] + "px"; i.style.height = PAD_LH + "px";
    lay.appendChild(i);
  });
}
function padCur(f, c) { RT.pcar = RT.pcar || {}; if (!Number.isInteger(c)) return; if (c < 0) delete RT.pcar[f]; else RT.pcar[f] = c; }
/* called from rtRecv for pad messages */
function padRecv(t, d, f) {
  if (t === "pado") { if (!PD.open) { PD.open = true; drApply(); padGrow(); save(); } return; }
  if (!d || typeof d !== "object") return;
  if (t === "padop") {
    var op = textApply(PAD.t, d, 20000);
    if (!op) return;
    RT.pcar = RT.pcar || {};
    Object.keys(RT.pcar).forEach(function (k) { RT.pcar[k] = op.shift(RT.pcar[k]); });
    padCur(f, d.c);
    padSetText(op.v, op.shift); padGrow();
    if (Number.isInteger(d.c) && d.c >= 0) { var xy = padXY(d.c); padActive(xy[0], xy[1]); }
  }
  if (t === "padc") { padCur(f, d.c); padCarets(); }
  if (t === "padt" && typeof d.v === "string") {
    if (f) padCur(f, d.c);
    if (!padTimer && (!f || Date.now() - padEditT > 3000 || f < RT.me)) padSetText(d.v); else padCarets();
    padGrow(); padActive(d.x, d.y);
  }
  if (t === "padd") { padMerge([d]); padDraw(); padGrow(); var l = PAD.s[d.k] && PAD.s[d.k].p.slice(-1)[0]; if (l) padActive(l[0], l[1]); }
  if (t === "pade" && typeof d.k === "string" && PAD.s[d.k]) { delete PAD.s[d.k]; padDraw(); }
  if (t === "padat") padActive(d.x, d.y);
  if (t === "padhi") { if (!PAD.t && typeof d.t === "string") padSetText(d.t); padMerge(d.s); padDraw(); padGrow(); }
}
$("#ptext").addEventListener("input", function () {
  LASTSURF = "pad";
  if (!padBurst) undoPush("pad", { text: PAD.t });
  clearTimeout(padBurst); padBurst = setTimeout(function () { padBurst = null; }, 1000);
  var old = PAD.t, nv = this.value.slice(0, 20000), c = this.selectionStart;
  PAD.t = nv;
  padGrow();
  if (!RT) return;
  var o = textOp(old, nv, c);
  padEditT = Date.now(); padLastC = c;
  rtSend("padop", { at: o.at, del: o.del, ins: o.ins, c: c });
  clearTimeout(padTimer);
  var ta = this;
  padTimer = setTimeout(function () { /* the whole text once typing pauses, with the caret as the active spot */
    padTimer = null;
    var cc = ta.selectionStart, xy = padXY(cc);
    rtSend("padt", { v: PAD.t, c: document.activeElement === ta ? cc : -1, x: xy[0], y: Math.round(xy[1] + PAD_LH / 2) });
  }, 600);
});
function padErase(e) {
  var pt = padPt(e), hit = false;
  Object.keys(PAD.s).forEach(function (k) {
    var p = PAD.s[k].p;
    for (var i = 0; i < p.length; i++) {
      var a = p[i], b = p[Math.min(i + 1, p.length - 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
      var t = L ? Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / L)) : 0;
      if (Math.hypot(pt[0] - a[0] - t * dx, pt[1] - a[1] - t * dy) < 9) { undoPush("pad", { pad: "del", q: PAD.s[k] }); delete PAD.s[k]; hit = true; if (RT) rtSend("pade", { k: k }); return; }
    }
  });
  if (hit) padDraw();
}
var pink = $("#pink"), pcan = $("#pcanvas");
pcan.addEventListener("pointerdown", function (e) {
  var tip = eraserTip(e);
  if (!tip && (PADT === "text" || e.button > 0)) return;
  e.preventDefault();
  LASTSURF = "pad"; clearTimeout(padBurst); padBurst = null;
  try { pcan.setPointerCapture(e.pointerId); } catch (x) {}
  if (PADT === "erase" || tip) { padNow = { erase: true }; padErase(e); return; }
  var live = document.createElementNS("http://www.w3.org/2000/svg", "path");
  live.setAttribute("stroke", PADC); pink.appendChild(live);
  padNow = { live: live, q: { k: newCode() + newCode(), c: PADC, p: [padPt(e)] } };
  live.setAttribute("d", inkPath(padNow.q.p));
});
pcan.addEventListener("pointermove", function (e) {
  if (!padNow) return;
  if (padNow.erase) { padErase(e); return; }
  var pt = padPt(e), last = padNow.q.p[padNow.q.p.length - 1];
  if (Math.abs(pt[0] - last[0]) + Math.abs(pt[1] - last[1]) < 3) return;
  padNow.q.p.push(pt);
  padNow.live.setAttribute("d", inkPath(padNow.q.p));
  padGrow(pt);
  var now = Date.now();
  if (RT && now - padAtT > 500) { padAtT = now; rtSend("padat", { x: pt[0], y: pt[1] }); } /* where I am drawing, twice a second */
});
function padEnd() {
  if (!padNow) return;
  var n = padNow; padNow = null;
  if (n.erase) return;
  n.live.remove();
  PAD.s[n.q.k] = n.q;
  undoPush("pad", { pad: "add", q: n.q });
  if (RT) rtSend("padd", n.q); /* the whole line, once it is finished */
  padDraw(); padGrow();
}
pcan.addEventListener("pointerup", padEnd);
pcan.addEventListener("pointercancel", padEnd);
/* middle button drags the notes around (scrolls the pad), with any tool on */
var pbody = $("#pbody"), padPan = null;
pbody.addEventListener("mousedown", function (e) { if (e.button === 1) e.preventDefault(); }); /* no autoscroll circle, no paste */
pbody.addEventListener("pointerdown", function (e) {
  if (e.button !== 1) return;
  e.preventDefault();
  padPan = { id: e.pointerId, x: e.clientX, y: e.clientY, l: pbody.scrollLeft, t: pbody.scrollTop };
  try { pbody.setPointerCapture(e.pointerId); } catch (x) {}
  pbody.classList.add("panning");
});
pbody.addEventListener("pointermove", function (e) {
  if (!padPan || e.pointerId !== padPan.id) return;
  pbody.scrollLeft = padPan.l - (e.clientX - padPan.x);
  pbody.scrollTop = padPan.t - (e.clientY - padPan.y);
});
function padPanEnd(e) { if (padPan && e.pointerId === padPan.id) { padPan = null; pbody.classList.remove("panning"); } }
pbody.addEventListener("pointerup", padPanEnd);
pbody.addEventListener("pointercancel", padPanEnd);
padTools();

/* ---------- start ---------- */
load();
applyTheme();
drApply();
rtUi();
var rtq = new URLSearchParams(location.search).get("room");
if (rtq) rtJoin(rtq, false);
if (window.innerWidth > 760) { var ft = $("#foot"); if (ft) ft.open = true; }
if (!routeFromHash()) {
  try { history.replaceState(null, "", "#" + PROBS[st.pi].m.id); } catch (e) {}
  showProblem(st.pi);
  scrollListToCurrent();
} else {
  scrollListToCurrent();
}
})();
