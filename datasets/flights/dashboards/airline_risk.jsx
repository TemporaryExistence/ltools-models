import React from "react";
import { VegaChart, filters, useGiven, useQuery } from "@malloyyo/dashboard";

// Self-contained on purpose: a dashboard component can import only React and @malloyyo/dashboard.

const CSS = `
.od { box-sizing: border-box; max-width: 1180px; margin: 0 auto; padding: 24px 24px 40px;
  font-family: var(--dash-font); color: var(--dash-fg); }
.od *, .od *::before, .od *::after { box-sizing: border-box; }
.od h1 { font-size: 26px; line-height: 1.2; letter-spacing: -0.01em; margin: 0 0 6px; }
.od-src { font-size: 13px; color: var(--dash-muted); margin: 0 0 12px; line-height: 1.5; }
.od-src a, .od-about a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.od-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.od-card { border: 1px solid var(--dash-border); border-radius: 12px; padding: 14px 16px 16px; min-width: 0; }
.od-card h2 { font-size: 17px; margin: 0 0 2px; line-height: 1.3; }
.od-card .sub { font-size: 12.5px; color: var(--dash-muted); margin: 0 0 8px; }
.od-vega { width: 100%; min-width: 0; }
.od-vega svg { display: block; max-width: 100%; }
.od .err { color: var(--dash-danger); font-size: 13px; white-space: pre-wrap; }
.od .loading { opacity: .45; transition: opacity .15s; }
.od-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0; font-size: 11.5px; color: var(--dash-muted); }
.od-tags span { border: 1px solid var(--dash-border); border-radius: 999px; padding: 1px 8px; line-height: 1.5; }
.od-tags span.warn { border-color: var(--hot); color: var(--dash-fg); }
.od-key { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--dash-muted); margin: 0 0 6px; }
.od-key i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; vertical-align: middle; margin-right: 5px; }
.ans { list-style: none; margin: 0; padding: 0; }
.ans li { display: grid; grid-template-columns: 1.9em minmax(0, 1fr) auto; gap: 0 10px; align-items: center;
  padding: 5px 8px; border-radius: 8px; border: 2px solid transparent; }
.ans li + li { margin-top: 2px; }
.ans .rk { font-size: 13px; font-weight: 700; color: var(--dash-muted); font-variant-numeric: tabular-nums; text-align: right; }
.ans .nm { font-size: 14px; line-height: 1.25; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ans .nm em { font-style: normal; color: var(--dash-muted); font-size: 12px; }
.ans .bar { position: relative; height: 7px; margin-top: 4px; border-radius: 4px; background: color-mix(in srgb, var(--dash-border) 70%, transparent); }
.ans .bar i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; background: var(--grey); }
.ans .bar s { position: absolute; top: 0; bottom: 0; border-radius: 0 4px 4px 0; background: var(--storm); }
.ans .bar b { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--dash-fg); opacity: .55; }
.ans .rt { text-align: right; font-variant-numeric: tabular-nums; font-size: 13.5px; font-weight: 700; white-space: nowrap; }
.ans .rt small { display: block; font-size: 11.5px; font-weight: 400; color: var(--dash-muted); }
.ans .l1 { display: flex; flex-direction: row-reverse; flex-wrap: nowrap; justify-content: flex-start; align-items: center; gap: 2px 7px; }
.ans .tag { display: inline-block; font-size: 11.5px; font-weight: 600; border-radius: 999px; padding: 1px 8px;
  border: 1px solid var(--dash-border); color: var(--dash-fg); white-space: nowrap; }
.ans li.sel { background: color-mix(in srgb, var(--sel) 13%, transparent); }
.ans li.sel .nm { font-weight: 700; }
.ans li.sel .bar i { background: var(--sel); }
.ans li.top { border-color: var(--hot); background: color-mix(in srgb, var(--hot) 10%, transparent); }
.ans li.top .bar i { background: var(--hot); }
.ans li.top .tag { background: var(--hot); border-color: var(--hot); color: #fff; }
.ans li.top.sel { background: color-mix(in srgb, var(--sel) 16%, transparent); }
.ans li.gap { display: block; text-align: center; color: var(--dash-muted); font-size: 12px; padding: 0; }
.ans .chip { display: inline-block; font-size: 10.5px; font-weight: 700; border-radius: 4px; padding: 0 4px; margin-left: 6px;
  vertical-align: 1px; color: var(--dash-bg); background: var(--wx); }
.ans .chip.th { background: var(--dash-muted); }
.ans .chip.ok { background: var(--good); }
.od-pick { display: inline-flex; align-items: center; gap: 10px; margin: 0 0 14px; font-size: 13px; color: var(--dash-muted); font-weight: 600; }
.od-pick select { font: inherit; font-size: 15px; font-weight: 400; padding: 7px 10px; border: 1px solid var(--dash-border); border-radius: 8px;
  background: var(--dash-control-bg, var(--dash-bg)); color: var(--dash-fg); max-width: 220px; }
.od-hero { margin-bottom: 18px; border-width: 2px; }
.od-hero .ans .nm { font-size: 15px; }
.od-ctx { font-size: 16px; margin: 0 0 10px; color: var(--dash-muted); }
.od-proof { margin-top: 26px; }
.od-proof > h2 { font-size: 18px; margin: 0 0 10px; }
.od-proof .od-grid + .od-grid, .od-proof .od-grid + .od-card, .od-proof .od-card + .od-grid { margin-top: 16px; }
.od details { margin-top: 10px; }
.od summary { cursor: pointer; font-size: 13px; color: var(--dash-muted); font-weight: 600; }
@media (max-width: 900px) { .od-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 560px) {
  .od { padding: 14px 12px 32px; }
  .od h1 { font-size: 21px; }
  .od-card { padding: 10px 10px 12px; }
  .ans li { grid-template-columns: 1.5em minmax(0, 1fr) auto; gap: 0 7px; padding: 5px 5px; }
  .ans .nm { font-size: 13px; white-space: normal; }
  .ans .rt { font-size: 12.5px; }
  .ans .l1 { flex-direction: column-reverse; align-items: flex-end; }
  .ans .rt small { white-space: normal; max-width: 9.5em; margin-left: auto; }
}
.od-about { margin-top: 26px; }
.od-about dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 9px 20px; margin: 4px 0 0; font-size: 14px; line-height: 1.45; }
.od-about dt { font-weight: 600; color: var(--dash-muted); font-size: 13px; padding-top: 1px; }
.od-about dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.od-about ul { margin: 0; padding-left: 18px; }
.od-about li { margin-bottom: 4px; }
@media (max-width: 560px) {
  .od-about dl { grid-template-columns: minmax(0, 1fr); gap: 2px 0; }
  .od-about dd { margin-bottom: 10px; }
}
`;

// ---- formatting ----
const num = (v) => Number(v) || 0;
const isNum = (v) => v != null && !isNaN(Number(v));
const usd = (v) => {
  if (!isNum(v)) return "–";
  const a = Math.abs(Number(v));
  const s = a >= 1e9 ? (a / 1e9).toFixed(2) + "B" : a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M" : a >= 1e3 ? Math.round(a / 1e3) + "k" : Math.round(a).toString();
  return (Number(v) < 0 ? "−$" : "$") + s;
};
const range = (lo, hi) => `${usd(lo)}–${usd(hi).replace("$", "")}`;
const pct0 = (p) => (isNum(p) ? Math.round(Number(p) * 100) + "%" : "–");
const pct1 = (p) => (isNum(p) ? (Number(p) * 100).toFixed(1) + "%" : "–");
const givenText = (g) => (g && g.value ? String(g.value).replace(/\\/g, "") : "");
const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

// ---- theme ----
const PALETTE = {
  light: { hot: "#d4502a", sel: "#2a78d6", wx: "#8a5cd1", grey: "#b8c2cf", good: "#1baf7a", storm: "#7fb3d5" },
  dark: { hot: "#e0623a", sel: "#3987e5", wx: "#9a70e0", grey: "#5c6470", good: "#199e70", storm: "#4f7f9e" },
};
function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (cs.getPropertyValue(name) || "").trim() || fallback;
  const dark = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return {
    dark, fg: v("--dash-fg", dark ? "#ededed" : "#171717"), muted: v("--dash-muted", dark ? "#9ca3af" : "#6b7280"),
    border: v("--dash-border", dark ? "#2a2a2a" : "#e5e7eb"), bg: v("--dash-bg", dark ? "#0a0a0a" : "#ffffff"),
    font: v("--dash-font", "system-ui, sans-serif"), pal: PALETTE[dark ? "dark" : "light"],
  };
}
function useTheme() {
  const [theme, setTheme] = React.useState(readTheme);
  React.useEffect(() => {
    const update = () => setTheme((old) => {
      const next = readTheme();
      return JSON.stringify(next) === JSON.stringify(old) ? old : next;
    });
    update();
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    if (!mq) return undefined;
    if (mq.addEventListener) mq.addEventListener("change", update); else mq.addListener(update);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", update) : mq.removeListener(update));
  }, []);
  return theme;
}
function useNarrow() {
  const get = () => typeof window !== "undefined" && window.innerWidth < 560;
  const [narrow, setNarrow] = React.useState(get);
  React.useEffect(() => {
    const on = () => setNarrow(get());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return narrow;
}
const vegaConfig = (t) => ({
  background: "transparent", font: t.font, padding: { left: 2, right: 8, top: 6, bottom: 2 }, view: { stroke: null },
  axis: { labelColor: t.muted, titleColor: t.muted, labelFontSize: 12, titleFontSize: 12, titleFontWeight: 600,
    gridColor: t.border, domainColor: t.border, tickColor: t.border, labelPadding: 4, titlePadding: 10 },
  legend: { labelColor: t.fg, titleColor: t.muted, labelFontSize: 12, titleFontSize: 12 },
  text: { color: t.fg, fontSize: 12 },
});

// ---- small components ----
function Card({ title, sub, children }) {
  return <section className="od-card">{title && <h2>{title}</h2>}{sub && <div className="sub">{sub}</div>}{children}</section>;
}
function Tags({ items }) {
  return <div className="od-tags">{items.filter(Boolean).map((c) => <span key={c.text || c} className={c.warn ? "warn" : ""}>{c.text || c}</span>)}</div>;
}
function Key({ items }) {
  return <div className="od-key">{items.map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>;
}
// Ranked answer list: rows = [{ key, rank, name, meta, chips, frac, mark, value, small, tag, top, sel }].
function Ranked({ rows }) {
  return (
    <ol className="ans">
      {rows.map((r) => r.gap ? <li key={r.key} className="gap">⋯</li> : (
        <li key={r.key} className={[r.top ? "top" : "", r.sel ? "sel" : ""].join(" ")}>
          <span className="rk">{r.rank}</span>
          <div style={{ minWidth: 0 }}>
            <div className="nm">{r.name}{(r.chips || []).map((c) => <span key={c.t} className={`chip ${c.k || ""}`}>{c.t}</span>)}{r.meta && <em> · {r.meta}</em>}</div>
            <div className="bar"><i style={{ width: `${Math.max(2, Math.min(1, r.frac) * 100)}%` }} />{r.wx > 0 && <s style={{ left: `${Math.min(1, r.frac) * (1 - r.wx) * 100}%`, width: `${Math.min(1, r.frac) * r.wx * 100}%` }} />}{r.mark != null && <b style={{ left: `${r.mark * 100}%` }} />}</div>
          </div>
          <div className="rt"><div className="l1"><span>{r.value}</span>{r.tag && <span className="tag">{r.tag}</span>}</div>{r.small && <small>{r.small}</small>}</div>
        </li>
      ))}
    </ol>
  );
}
// Show the first n rows; then the selected rows that fall below them, after a gap marker.
function headPlusSel(rows, n) {
  const head = rows.slice(0, n);
  const rest = rows.slice(n).filter((r) => r.sel).slice(0, 3);
  return rest.length ? [...head, { gap: true, key: "gap" }, ...rest] : head;
}

// ---- chart specs ----
const monthAxis = { values: [2, 3, 4, 5, 6, 7, 8], labelExpr: "['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'][datum.value]", grid: false, title: null };
// Chronic flights per month (all airlines), SFO part, with the runway closure marked.
function clockSpec(t, narrow) {
  return {
    config: vegaConfig(t),
    height: narrow ? 190 : 220,
    layer: [
      { data: { values: [{ x0: 3.5, x1: 7.5 }] }, mark: { type: "rect", color: t.pal.wx, opacity: 0.09 }, encoding: { x: { field: "x0", type: "quantitative" }, x2: { field: "x1" } } },
      { data: { values: [{ x: 3.52, l: "SFO runway 1R/19L closed from 30 Mar" }] }, mark: { type: "text", align: "left", baseline: "top", dy: 2, dx: 4, fontSize: 11, color: t.muted }, encoding: { x: { field: "x", type: "quantitative" }, y: { value: 0 }, text: { field: "l" } } },
      {
        mark: { type: "bar", width: narrow ? 18 : 30, cornerRadiusTopLeft: 2, cornerRadiusTopRight: 2 },
        encoding: {
          x: { field: "m", type: "quantitative", scale: { domain: [1.5, 7.5], nice: false }, axis: { ...monthAxis, values: [2, 3, 4, 5, 6, 7] } },
          y: { field: "n", type: "quantitative", stack: "zero", axis: { title: "Flights meeting DOT's monthly test", tickMinStep: 1 } },
          color: { field: "where", type: "nominal", scale: { domain: ["Touches SFO", "Elsewhere"], range: [t.pal.wx, t.pal.grey] }, legend: null },
          order: { field: "ord" },
          tooltip: [{ field: "month" }, { field: "where", title: "Flight" }, { field: "n", title: "Flights" }],
        },
      },
    ],
  };
}
// Monthly late-30 share of each at-risk flight, with DOT's 50% line.
function watchSpec(t, narrow) {
  return {
    config: vegaConfig(t),
    height: narrow ? 300 : 250,
    layer: [
      { mark: { type: "rule", color: t.fg, strokeDash: [4, 3] }, encoding: { y: { datum: 0.5 } } },
      { data: { values: [{}] }, mark: { type: "text", align: "right", baseline: "top", dy: 4, fontSize: 11.5, color: t.fg, text: "DOT line 50%" }, encoding: { y: { datum: 0.5, type: "quantitative" }, x: { datum: 7, type: "quantitative" } } },
      {
        mark: { type: "line", point: { filled: true, size: 36 }, strokeWidth: 2 },
        encoding: {
          x: { field: "m", type: "quantitative", scale: { domain: [2, 7], nice: false }, axis: { ...monthAxis, values: [2, 3, 4, 5, 6, 7] } },
          y: { field: "rate", type: "quantitative", scale: { domain: [0, 1] }, axis: { title: narrow ? null : "Arrived 30+ min late or cancelled", format: "%", tickCount: 5 } },
          color: { field: "flight", type: "nominal", legend: narrow ? { orient: "bottom", title: null, columns: 1, labelLimit: 260 } : { orient: "right", title: null, labelLimit: 220 } },
          tooltip: [{ field: "flight", title: "Flight" }, { field: "month", title: "Month" }, { field: "rate", type: "quantitative", title: "Late 30+ / cancelled", format: ".0%" }],
        },
      },
    ],
  };
}
// Range bars, low to high; selected row highlighted.
function rangeSpec(t, narrow, opts) {
  const y = { field: "label", type: "nominal", sort: null, axis: { title: null, labelLimit: narrow ? 100 : 200 } };
  return {
    config: vegaConfig(t),
    height: { step: narrow ? 22 : 24 },
    layer: [
      {
        mark: { type: "bar", height: { band: 0.62 }, cornerRadius: 2 },
        encoding: {
          y, x: { field: "lo", type: "quantitative", axis: { title: opts.xTitle, format: "$.2s", tickCount: narrow ? 3 : 5 } }, x2: { field: "hi" },
          color: { field: "tone", type: "nominal", scale: { domain: ["sel", "other"], range: [t.pal.sel, t.pal.grey] }, legend: null },
          tooltip: [{ field: "label", title: opts.catTitle }, { field: "lo", type: "quantitative", title: "Low", format: "$,.0f" }, { field: "hi", type: "quantitative", title: "High", format: "$,.0f" }, ...(opts.extra || [])],
        },
      },
      { mark: { type: "text", align: "left", dx: 5, fontSize: 11.5, color: t.muted }, encoding: { y, x: { field: "hi", type: "quantitative" }, text: { field: "note" } } },
    ],
  };
}

// ---- About this data ----
const SOURCES = [
  ["Flights", "BTS Reporting Carrier On-Time Performance", "https://www.transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ",
    "US DOT, public domain. 3,576,340 flights, 1 Feb–31 Jul 2026 (reporting carriers only). Feb–Apr downloaded 7 Oct 2026, May–Jul 6 Oct 2026."],
  ["Chronic-delay rule", "14 CFR 399.81(c)", "https://www.law.cornell.edu/cfr/text/14/399.81",
    "A domestic flight operated 10+ times a month that arrives more than 30 minutes late (cancelled flights count) more than 50% of the time that month is chronically delayed; holding it out for more than four consecutive months is an unfair or deceptive practice."],
  ["SFO runway closure", "CAPA, 31 Dec 2025; FlyMag, 1 Jan 2026; The Traveler, 18 Sep 2026", "https://centreforaviation.com/news/san-francisco-airport-to-close-runway-1-right-from-mar-2026-to-oct-2026-1343627",
    "Runway 1R/19L out of service from 30 March 2026, scheduled through 2 October 2026 (FlyMag: https://flymag.com/sfos-next-big-airfield-overhaul-runway-1r-19l-to-close-for-six-months-in-2026/); reopening then expected 29 September (https://www.thetraveler.org/sfo-runway-1r-set-to-reopen-early-easing-months-of-delays/). Trade press, not SFO's own notice."],
  ["Delay-chain cost", "Disruption ledger (A4A block-minute cost)", "https://www.airlines.org/dataset/u-s-passenger-carrier-delay-costs/",
    "Late-aircraft minutes on the same aircraft's later flights after a late first flight, May–Jul 2026: next flight × $69.07 to every later flight × $100.76. Weather at both ends from the IEM ASOS archive."],
  ["August data timing", "BTS Airline Service Quality Performance, July 2026 (BTS 26-71)", "https://www.bts.gov/newsroom/airline-service-quality-performance-data-july-2026",
    "July 2026 on-time data came out Monday 21 September 2026, about seven weeks after the month. On that pattern August data lands in late October 2026; it was not out when this page's data was pulled (6–7 Oct 2026). Expected date is an inference from the July release, not a BTS schedule."],
  ["Chronic-delay fine", "DOT fines Frontier, sues Southwest (AP, 16 Jan 2025)", "https://news.wttw.com/node/49741",
    "Frontier: $650,000 civil penalty for three chronically delayed flights ($325,000 paid, $325,000 suspended). Used here as the value of one breaching flight: $650k ÷ 3 ≈ $217k."],
  ["Refund rule", "14 CFR 260 (DOT automatic refunds, in force 28 Oct 2024)", "https://www.transportation.gov/airconsumer/latest-news",
    "Cancelled flights and domestic arrivals 3+ hours late entitle passengers who decline the alternative to an automatic cash refund."],
  ["Fares", "DOT Consumer Airfare Report, Table 1a (airport pairs)", "https://data.transportation.gov/resource/tfrh-tu9e",
    "2026 Q1 (2025 Q2 where a pair is missing): the airline's own fare when it is the largest or lowest-fare carrier on the pair, else the pair average, else the national average $259."],
];
const METHOD = [
  "One flight = the airline's flights in an airport pair within 30 minutes of the month's most frequent departure time (399.81(c)(3)), linked month to month within 30 minutes.",
  "On the clock = 3 or 4 chronic months running in July. Breach month = the month a 5th chronic month would land (August for 4 months, September for 3). The data ends in July, so a breach is decided by data not yet published, not by a date still ahead. Rows are ordered by breach month, then by July's late share (the best guide to August).",
  "The selected airline gets two lists that are never mixed: its flights on the clock (August-decided first, then by July's late share; a 5th month risks a fine, precedent Frontier ≈$217k a flight) and its five costliest clear-day slots (by the quarter's cost).",
  "Costly on clear days = the slot's clear-day chain cost per clear-day first departure × all its first departures (what the quarter would cost if every day were clear; 30+ clear-day first departures). Rank 1 = costliest nationally.",
  "Refund exposure = (cancellations + arrivals 3h+ late) × passengers (70 seats regional / 160 mainline × load factor 0.80–0.92) × one-way fare. A ceiling.",
];
const CAVEATS = [
  "BTS covers reporting carriers only; regional flights appear under the operating airline (SkyWest, Republic, PSA…), not the brand that sells them.",
  "Six months only (Feb–Jul 2026): a run starting in February may be longer.",
  "The SFO link is timing, not proof: every flight at 4 months began its run in April, the first month of the closure, and touches SFO. August falls inside the closure, so the runway will not fix them in time.",
  "Under flight-number matching instead of the rule's time grouping, one flight has 5 chronic months: Frontier 3288 ATL–LGA, Mar–Jul.",
  "Delay-chain cost is attribution, not proof; the range spans next-flight-only to every-later-flight pricing.",
];
function AboutData() {
  return (
    <section className="od-card od-about" id="about-this-data">
      <h2>About this data</h2>
      <dl>
        {SOURCES.map(([what, name, url, note]) => (
          <React.Fragment key={what}>
            <dt>{what}</dt>
            <dd><a href={url} target="_blank" rel="noopener noreferrer">{name}</a>. {note}</dd>
          </React.Fragment>
        ))}
        <dt>Method</dt>
        <dd><ul>{METHOD.map((m) => <li key={m}>{m}</li>)}</ul></dd>
        <dt>Caveats</dt>
        <dd><ul>{CAVEATS.map((m) => <li key={m}>{m}</li>)}</ul></dd>
      </dl>
    </section>
  );
}
function scrollToAbout(e) {
  if (e) e.preventDefault();
  const el = typeof document !== "undefined" ? document.getElementById("about-this-data") : null;
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function CarrierPicker({ options }) {
  const g = useGiven("AIRLINE");
  const vals = g.value ? filters.values(String(g.value)) : null;
  const cur = (vals && vals[0]) || givenText(g);
  return (
    <label className="od-pick">Airline
      <select value={cur} onChange={(e) => g.set(filters.oneOf(e.target.value))}>
        {options.indexOf(cur) < 0 && cur && <option value={cur}>{cur}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

// DOT's Frontier fine (16 Jan 2025): $650k for three chronically delayed flights.
const FINE_PER_FLIGHT = 650000 / 3;
// What the clock waits on: data for the breach month (data ends July 2026; July came out 21 Sep 2026).
const breachText = (b) => (b === 8 ? "late again in Aug = DOT breach" : "late in Aug and Sep = DOT breach");
const wxShare = (r) => (num(r.july_late_n) > 0 ? num(r.july_late_weather) / num(r.july_late_n) : 0);
const hourText = (h) => (h === 0 ? "midnight" : h < 12 ? `${h}am` : h === 12 ? "noon" : `${h - 12}pm`);

export default function Dashboard({ dashboard, givens }) {
  const t = useTheme();
  const narrow = useNarrow();
  const ag = useGiven("AIRLINE");
  const av = ag.value ? filters.values(String(ag.value)) : null;
  const airline = (av && av[0]) || givenText(ag) || "selected airline";
  // Five requests: the dev server compiles the model once per request, one at a time.
  const fix = useQuery({ query: "ar_fix", givens });
  const sl = useQuery({ query: "ar_slots", givens });
  const clock = useQuery({ query: "ar_clock", givens });
  const watch = useQuery({ query: "ar_watch", givens });
  const ref = useQuery({ query: "ar_refund", givens });
  const all = [fix, sl, clock, watch, ref];
  const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const f0 = fix.rows[0] || {};
  const s0 = sl.rows[0] || {};
  const P = t.pal;
  const style = { "--hot": P.hot, "--sel": P.sel, "--wx": P.wx, "--grey": P.grey, "--good": P.good, "--storm": P.storm };

  // Picker: every airline with a chronic flight or a ranked slot.
  const opts = Array.from(new Set([...list(f0.airlines), ...list(s0.airlines)].map((r) => r.airline))).filter(Boolean).sort();

  // 1. DOT clock, national, breach month first.
  const clockAll = list(f0.clock).map((r) => ({ ...r, breach: 7 + (5 - num(r.months_running)) }))
    .sort((a, b) => a.breach - b.breach || num(b.july_late30) - num(a.july_late30));
  const aug = clockAll.filter((r) => r.breach === 8);
  const sep = clockAll.filter((r) => r.breach === 9);
  const clockRow = (r, i) => {
    const sfo = r.origin === "SFO" || r.dest === "SFO";
    const when = MONTHS[r.breach];
    return {
      key: `${r.carrier}${r.flight_label}`, rank: i + 1, sel: r.airline === airline,
      name: `${r.airline} ${r.origin} → ${r.dest} ${r.sched_time}`,
      chips: sfo ? [{ t: "SFO" }] : [],
      frac: num(r.july_late30), wx: wxShare(r), mark: 0.5,
      value: `${pct0(r.july_late30)} late in Jul`, small: breachText(r.breach),
      tag: `${num(r.months_running)} months late`,
    };
  };
  const clockRows = clockAll.map(clockRow);
  const clockShown = headPlusSel(clockRows, narrow ? 6 : 9);
  const augSfo = aug.filter((r) => r.origin === "SFO" || r.dest === "SFO").length;
  const augApril = aug.filter((r) => num(r.start_mon) === 4).length;
  const selClock = clockAll.filter((r) => r.airline === airline);

  // 2. Clear-day costly slots, national.
  const slotAll = list(s0.clear);
  const maxSlot = Math.max(1, ...slotAll.map((r) => num(r.clear_rate_cost_hi)));
  const slotRow = (r) => ({
    key: `${r.carrier}${r.origin}${r.dep_hour}`, rank: num(r.rank_clear_rate_hi), sel: r.airline === airline,
    name: `${r.airline} ${r.origin} ${hourText(num(r.dep_hour))}`,
    chips: num(r.rank_all_hi) <= 3 ? [{ t: `#${num(r.rank_all_hi)} all days`, k: "ok" }] : r.thin ? [{ t: "thin", k: "th" }] : [],
    frac: num(r.clear_rate_cost_hi) / maxSlot,
    value: range(r.clear_rate_cost_lo, r.clear_rate_cost_hi), small: "a quarter, clear days",
    tag: "add turn buffer",
  });
  const slotRows = slotAll.map(slotRow);
  const shownKeys = new Set(slotRows.slice(0, narrow ? 6 : 9).map((r) => r.key));
  const selSlots = list(s0.sel).map(slotRow).map((r) => ({ ...r, sel: true })).filter((r) => !shownKeys.has(r.key));
  const slotShown = slotRows.slice(0, narrow ? 6 : 9).concat(selSlots.length ? [{ gap: true, key: "gap" }, ...selSlots.slice(0, 2)] : []);

  // Two separate lists for the selected airline, never mixed: a possible fine is not a running cost.
  // 1. Flights DOT may cite (every late arrival counts, storms included, as the rule counts them).
  const citeRows = selClock.map((fl, i) => ({
    key: `f${fl.carrier}${fl.flight_label}`, rank: i + 1, top: i === 0,
    name: `${fl.origin} → ${fl.dest} ${fl.sched_time}`,
    chips: fl.origin === "SFO" || fl.dest === "SFO" ? [{ t: "SFO" }] : [],
    frac: num(fl.july_late30), wx: wxShare(fl), mark: 0.5,
    value: `${pct0(fl.july_late30)} late in Jul`, small: fl.breach === 8 ? "decided by Aug data" : "decided by Aug + Sep data",
    tag: `${num(fl.months_running)} months late`,
  }));
  // 2. Morning flights whose delays cost the most (storm days removed: what scheduling can fix).
  const selSl = list(s0.sel);
  const slMax = Math.max(1, ...selSl.map((s) => num(s.clear_rate_cost_hi)));
  const costRows = selSl.map((s, i) => ({
    key: `s${s.carrier}${s.origin}${s.dep_hour}`, rank: i + 1, top: i === 0,
    name: `${s.origin} ${hourText(num(s.dep_hour))} first flights`, meta: `#${num(s.rank_clear_rate_hi)} nationally`,
    frac: num(s.clear_rate_cost_hi) / slMax,
    value: range(s.clear_rate_cost_lo, s.clear_rate_cost_hi), small: "a quarter", tag: "add turn buffer",
  }));

  // Proof: clock by month.
  const clockBars = [];
  list(clock.rows).forEach((r) => {
    const sfo = num(r.all_sfo), a = num(r.all_chronic);
    clockBars.push({ m: num(r.month_num), month: r.month_label, where: "Touches SFO", n: sfo, ord: 0 });
    clockBars.push({ m: num(r.month_num), month: r.month_label, where: "Elsewhere", n: a - sfo, ord: 1 });
  });
  // Proof: selected airline's at-risk flights, 4-month ones first (max 8 lines).
  const flightsW = Array.from(new Set(list(watch.rows).slice().sort((a, b) => num(b.months_running) - num(a.months_running)).map((r) => r.flight_label))).slice(0, 8);
  const watchRows = list(watch.rows).filter((r) => flightsW.indexOf(r.flight_label) >= 0)
    .map((r) => ({ flight: `${r.flight_label} (${num(r.months_running)} mo)`, m: num(r.month_num), month: r.month_label, rate: num(r.late30_rate) }));
  // Proof: refund exposure by airline.
  const refRows = list(ref.rows).slice(0, narrow ? 10 : 14).map((r) => ({
    label: r.airline, lo: num(r.refund_exposure_lo), hi: num(r.refund_exposure_hi), tone: r.airline === airline ? "sel" : "other",
    note: pct1(r.affected_rate), rate: pct1(r.affected_rate),
  }));

  const specs = React.useMemo(() => ({
    clock: clockSpec(t, narrow),
    watch: watchSpec(t, narrow),
    refund: rangeSpec(t, narrow, { xTitle: "Refund exposure ceiling, May–Jul", catTitle: "Airline", extra: [{ field: "rate", title: "Flights cancelled or 3h+ late" }] }),
  }), [t, narrow]);

  const loading = all.some((x) => x.loading);
  const ready = !!fix.rows[0] && !!sl.rows[0];

  return (
    <div className="od" style={style}>
      <style>{CSS}</style>
      <h1>{dashboard.title}</h1>
      <p className="od-src">
        National ranking · BTS on-time Feb–Jul 2026 · 14 CFR 399.81 · disruption ledger ·{" "}
        <a href="#about-this-data" onClick={scrollToAbout}>About this data</a>
      </p>
      <CarrierPicker options={opts} />
      {all.map((x, i) => x.error && <div className="err" key={i}>{String(x.error)}</div>)}
      {ready && (
        <div className={loading ? "loading" : ""}>
          <div className="od-grid od-hero-grid">
            <section className="od-card od-hero">
              <h2>{airline}: flights DOT may cite</h2>
              <div className="sub">Late more than half the time, month after month</div>
              <Key items={[["Late, clear weather", P.grey], ["Late, weather day (DOT still counts it)", P.storm]]} />
              {citeRows.length ? <Ranked rows={citeRows} /> : <div className="od-src">No {airline} flight on DOT's watch list.</div>}
              <Tags items={["5th month = possible fine (Frontier: $650k for 3 flights, 2025)", "August data due late Oct"]} />
            </section>
            <section className="od-card od-hero">
              <h2>{airline}: morning flights costing the most</h2>
              <div className="sub">Delays they pass down the day · storm days removed</div>
              {costRows.length ? <Ranked rows={costRows} /> : <div className="od-src">No {airline} slot ranked.</div>}
              <Tags items={["Low = next flight only · high = every later flight"]} />
            </section>
          </div>
          <h2 className="od-ctx">National context</h2>
          <div className="od-grid">
            <Card title="DOT chronic-delay clock" sub={`${aug.length} could breach in Aug, ${sep.length} in Sep · ${airline}: ${selClock.length}`}>
              <Key items={[[airline, P.sel], ["Weather day", P.storm], ["SFO = touches SFO", P.wx]]} />
              <Ranked rows={clockShown} />
              <Tags items={[
                { text: `${augApril === aug.length ? "All" : augApril + " of"} ${aug.length} Aug flights started in April; ${augSfo} touch SFO · SFO runway 1R/19L closed 30 Mar, reopening ~29 Sep`, warn: true },
                "Bar = July share late 30+ / cancelled · line = DOT 50%",
              ]} />
              {sep.length > 0 && (
                <details>
                  <summary>All {clockRows.length} flights on the clock</summary>
                  <Ranked rows={clockRows.slice(narrow ? 6 : 9)} />
                </details>
              )}
            </Card>
            <Card title="Delay chains costly on clear days" sub="First departures of the day, by airline, airport and hour · national rank">
              <Key items={[[airline, P.sel], ["#N all days = also top on all days", P.good]]} />
              <Ranked rows={slotShown} />
              <Tags items={["Weather days removed", "Low = next flight × $69.07 · high = every later flight × $100.76"]} />
            </Card>
          </div>

          <section className="od-proof">
            <h2>Proof</h2>
            <div className="od-grid">
              <Card title="Flights meeting DOT's monthly test" sub="All airlines, by month">
                <Key items={[["Touches SFO", P.wx], ["Elsewhere", P.grey]]} />
                <div className="od-vega"><VegaChart spec={specs.clock} data={clockBars} /></div>
                <Tags items={["10+ operations, >50% arrived 30+ min late or cancelled", "SFO closure: CAPA, FlyMag (About this data)"]} />
              </Card>
              <Card title={`${airline} flights on the clock`} sub="Monthly share late 30+ or cancelled">
                {watchRows.length ? <div className="od-vega"><VegaChart spec={specs.watch} data={watchRows} /></div> : <div className="od-src">No {airline} flights on the clock.</div>}
                <Tags items={["Under 50% in the breach month stops the clock", "Re-check on the August BTS release"]} />
              </Card>
            </div>
            <div className="od-grid">
              <Card title="Refund exposure by airline" sub="DOT automatic-refund rule, May–Jul ceiling">
                <div className="od-vega"><VegaChart spec={specs.refund} data={refRows} /></div>
                <Tags items={["Label = flights cancelled or 3h+ late", "Ceiling: every affected passenger refunded"]} />
              </Card>
              <Card title="Why these slots, not weather" sub="Clear-day rank vs all-days rank">
                <ol className="ans">
                  {slotAll.slice(0, 8).map((r) => (
                    <li key={`${r.carrier}${r.origin}${r.dep_hour}`} className={r.airline === airline ? "sel" : ""}>
                      <span className="rk">{num(r.rank_clear_rate_hi)}</span>
                      <div className="nm">{r.airline} {r.origin} {hourText(num(r.dep_hour))}<em> · all days #{num(r.rank_all_hi)}</em></div>
                      <div className="rt">{pct0(r.clear_share)}<small>of cost on clear days</small></div>
                    </li>
                  ))}
                </ol>
                <Tags items={["Same rank on both = a scheduling problem, not weather"]} />
              </Card>
            </div>
          </section>
        </div>
      )}
      <AboutData />
    </div>
  );
}
