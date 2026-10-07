import React from "react";
import { Controls, VegaChart, useGiven, useQuery } from "@malloyyo/dashboard";

// Self-contained on purpose: a dashboard component can import only React and @malloyyo/dashboard.

const CSS = `
.od { box-sizing: border-box; max-width: 1120px; margin: 0 auto; padding: 28px 24px 40px;
  font-family: var(--dash-font); color: var(--dash-fg); }
.od *, .od *::before, .od *::after { box-sizing: border-box; }
.od h1 { font-size: 28px; line-height: 1.2; letter-spacing: -0.01em; margin: 0 0 18px; max-width: 40ch; }
.od-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0 24px; }
.od-kpi { border: 1px solid var(--dash-border); border-radius: 12px; padding: 16px 18px; min-width: 0; }
.od-kpi .v { font-size: 34px; font-weight: 700; line-height: 1.05; font-variant-numeric: tabular-nums; }
.od-kpi .l { font-size: 14px; font-weight: 600; margin-top: 8px; }
.od-kpi .s { font-size: 13px; color: var(--dash-muted); margin-top: 4px; line-height: 1.35; }
.od-kpi.hot { border-color: var(--dash-accent); }
.od-kpi.hot .v { color: var(--dash-accent); }
.od-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
.od-grid.one { grid-template-columns: minmax(0, 1fr); }
.od-card { border: 1px solid var(--dash-border); border-radius: 12px; padding: 18px 20px 20px; min-width: 0; }
.od-card h2 { font-size: 17px; margin: 0 0 4px; line-height: 1.3; }
.od-card .sub { font-size: 13px; color: var(--dash-muted); margin: 0 0 14px; line-height: 1.4; }
.od-key { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 13px; color: var(--dash-muted); margin: -4px 0 10px; }
.od-key i { display: inline-block; width: 18px; height: 3px; border-radius: 2px; vertical-align: middle; margin-right: 6px; }
.od-key i.dot { width: 10px; height: 10px; border-radius: 50%; }
.od-vega { width: 100%; min-width: 0; }
.od-vega svg { display: block; max-width: 100%; }
.od-row { margin: 0 0 14px; }
.od-row .top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 14px; }
.od-row .name { min-width: 0; overflow-wrap: anywhere; }
.od-row .val { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.od-row .val small { font-weight: 400; color: var(--dash-muted); font-size: 12px; margin-left: 6px; }
.od-track { height: 16px; margin-top: 5px; border-radius: 4px; background: color-mix(in srgb, var(--dash-border) 55%, transparent); }
.od-bar { height: 100%; border-radius: 4px; background: var(--bar, var(--dash-accent)); min-width: 2px; }
.od-tablewrap { overflow-x: auto; }
.od table { width: 100%; border-collapse: collapse; font-size: 14px; font-variant-numeric: tabular-nums; }
.od th { text-align: right; font-size: 12px; font-weight: 600; color: var(--dash-muted); padding: 8px 10px;
  border-bottom: 1px solid var(--dash-border); white-space: nowrap; }
.od td { text-align: right; padding: 9px 10px; border-bottom: 1px solid var(--dash-border); white-space: nowrap; }
.od th:first-child, .od td:first-child { padding-left: 0; }
.od th.name, .od td.name { text-align: left; white-space: normal; min-width: 0; }
.od td.rank { color: var(--dash-muted); width: 1%; padding-right: 4px; }
.od th.rank { width: 1%; }
.od td.up { color: var(--dash-accent); font-weight: 600; }
.od .vs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
.od .vs .big { font-size: 40px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.od .vs .cap { font-size: 13px; color: var(--dash-muted); margin-top: 6px; line-height: 1.35; }
.od .vs .late .big { color: var(--hot); }
.od .foot { font-size: 12px; color: var(--dash-muted); line-height: 1.5; margin-top: 22px; max-width: 80ch; }
.od .err { color: var(--dash-danger); font-size: 13px; white-space: pre-wrap; }
.od .loading { opacity: .45; transition: opacity .15s; }
@media (max-width: 900px) {
  .od-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .od-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .od { padding: 18px 16px 32px; }
  .od h1 { font-size: 22px; }
  .od-kpi { padding: 12px 14px; }
  .od-kpi .v { font-size: 26px; }
  .od-kpi .l { font-size: 13px; }
  .od-card { padding: 14px 14px 16px; }
  .od .hide-sm { display: none; }
  .od-row .val small { display: block; margin-left: 0; text-align: right; }
  .od td, .od th { padding-left: 6px; padding-right: 6px; }
  .od .vs .big { font-size: 32px; }
}
`;

const compact = (n) => {
  if (n == null || isNaN(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e4) return Math.round(n / 1e3) + "k";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(Math.round(n));
};
const money = (n) => (n == null || isNaN(n) ? "–" : "$" + compact(n));
const share = (p) => (p == null || isNaN(p) ? "–" : Math.round(p * 100) + "%");
const pct1 = (p) => (p == null || isNaN(p) ? "–" : (p * 100).toFixed(1) + "%");
const whole = (n) => (n == null || isNaN(n) ? "–" : Math.round(n).toLocaleString());
const bandName = (b) => (b ? b.replace(/^\d /, "") : "–");

// Hour of day as "5am" / "12pm", in Vega's expression language (for axis labels).
const HOUR_LABEL =
  "datum.value == 0 ? '12am' : datum.value < 12 ? datum.value + 'am' : datum.value == 12 ? '12pm' : (datum.value - 12) + 'pm'";

function Bars({ rows, value, label, right, note }) {
  const shown = rows.filter((r) => r[value] != null);
  const max = Math.max(...shown.map((r) => Math.abs(r[value])), 1e-9);
  return shown.map((r) => (
    <div className="od-row" key={r[label]}>
      <div className="top">
        <span className="name">{r[label]}</span>
        <span className="val">
          {right(r)}
          {note && <small>{note(r)}</small>}
        </span>
      </div>
      <div className="od-track">
        <div className="od-bar" style={{ width: `${(Math.abs(r[value]) / max) * 100}%` }} />
      </div>
    </div>
  ));
}

// Chart colours: the first three categorical slots of a CVD-checked palette (blue, orange, aqua) for series, and one
// blue ramp for the ordered airport-size bands, each stepped for its own surface. Text and axes take --dash-* colours.
const PALETTE = {
  light: {
    blue: "#2a78d6", orange: "#eb6834", aqua: "#1baf7a", yellow: "#eda100",
    bands: ["#104281", "#1c5cab", "#2a78d6", "#5598e7", "#86b6ef"],
    land: "#eceae5", landStroke: "#ffffff",
  },
  dark: {
    blue: "#3987e5", orange: "#d95926", aqua: "#199e70", yellow: "#c98500",
    bands: ["#cde2fb", "#86b6ef", "#5598e7", "#2a78d6", "#1c5cab"],
    land: "#262624", landStroke: "#0a0a0a",
  },
};
const BANDS = ["1 Hub (400+/day)", "2 Large (100-399/day)", "3 Medium (30-99/day)", "4 Small (10-29/day)", "5 Very small (<10/day)"];

function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (cs.getPropertyValue(name) || "").trim() || fallback;
  const dark = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return {
    dark,
    fg: v("--dash-fg", dark ? "#ededed" : "#171717"),
    muted: v("--dash-muted", dark ? "#9ca3af" : "#6b7280"),
    border: v("--dash-border", dark ? "#2a2a2a" : "#e5e7eb"),
    bg: v("--dash-bg", dark ? "#0a0a0a" : "#ffffff"),
    font: v("--dash-font", "system-ui, sans-serif"),
    pal: PALETTE[dark ? "dark" : "light"],
  };
}

// The theme follows the viewer's OS; re-read the CSS variables when it flips.
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
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", update) : mq.removeListener(update));
  }, []);
  return theme;
}

// Width of an element, for charts whose height must follow their width (the map).
function useWidth() {
  const ref = React.useRef(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    if (!ref.current) return undefined;
    const el = ref.current;
    const measure = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

// True when the frame is phone-width (drives chart heights and label density).
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

// Vega-Lite config: transparent background, the dashboard's font, quiet axes in the theme's colours.
const vegaConfig = (t) => ({
  background: "transparent",
  font: t.font,
  padding: { left: 2, right: 8, top: 6, bottom: 2 },
  view: { stroke: null },
  axis: {
    labelColor: t.muted, titleColor: t.muted, labelFontSize: 12, titleFontSize: 12, titleFontWeight: 600,
    gridColor: t.border, domainColor: t.border, tickColor: t.border, labelPadding: 4, titlePadding: 10,
  },
  legend: { labelColor: t.fg, titleColor: t.muted, labelFontSize: 12, titleFontSize: 12, symbolStrokeWidth: 0 },
  text: { color: t.fg, fontSize: 12 },
});

function Card({ title, sub, children, className }) {
  return (
    <section className={"od-card" + (className ? " " + className : "")}>
      <h2>{title}</h2>
      {sub && <p className="sub">{sub}</p>}
      {children}
    </section>
  );
}

function Key({ items }) {
  return (
    <div className="od-key">
      {items.map(([label, color, dot]) => (
        <span key={label}><i className={dot ? "dot" : ""} style={{ background: color }} />{label}</span>
      ))}
    </div>
  );
}

// ---- About this data + caveats ----
// The same block sits in every flights dashboard (a component can import only React and @malloyyo/dashboard, so it
// can't be shared). Facts verified 2026-10-07: outputs/2026-10-07_flights-source-check.md in the LTools unit.

const ABOUT_CSS = `
.od-src { font-size: 13px; color: var(--dash-muted); margin: -8px 0 14px; line-height: 1.5; }
.od-src a, .od-about a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.od-cav { display: flex; flex-wrap: wrap; gap: 6px 8px; margin: -8px 0 22px; font-size: 12px; color: var(--dash-muted); align-items: baseline; }
.od-cav b { font-weight: 600; color: var(--dash-fg); margin-right: 2px; }
.od-cav span { border: 1px solid var(--dash-border); border-radius: 999px; padding: 2px 9px; line-height: 1.4; }
.od-card .cav { font-size: 12px; color: var(--dash-muted); margin: 12px 0 0; line-height: 1.45; }
.od-card .cav b { font-weight: 600; }
.od-about { margin-top: 16px; }
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

const DATA = {
  source: "BTS Reporting Carrier On-Time Performance (1987–present)",
  sourceUrl: "https://www.transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ",
  publisher: "Bureau of Transportation Statistics, US Department of Transportation",
  coverage: "1 May to 31 July 2026 (92 days; three monthly files, the latest BTS had published)",
  rows: "1,851,282 scheduled US domestic flights from 354 departure airports, 13 reporting airlines",
  refreshed: "Downloaded from BTS and loaded on 6 October 2026. Re-checked 7 October 2026: row count, dates and monthly totals match the published model, and cancellation rates match DOT's published May 2026 figures.",
  licence: "US government work: public domain, free to reuse (17 U.S.C. §105). Airport positions: OurAirports, public domain.",
};

// Caveats that apply to every conclusion on every flights dashboard.
const CAVEATS = [
  "One season only: May–July 2026, summer thunderstorm season. Other months may rank airlines, airports and hours differently.",
  "Not adjusted for weather or season. BTS records weather as a delay cause, but these comparisons do not separate stormy days from clear ones.",
  "Correlation, not cause. A pattern here (a late hour, a late airline) can come partly from what flies then and where, not only from the hour or airline itself.",
  "Booking dates are not known. BTS records the scheduled departure time, not when the ticket was bought, so nothing here says when to book.",
  "Late = arrived 15+ minutes after the scheduled arrival (BTS/DOT definition), out of flights that operated. Cancelled and diverted flights are not in the late rate; they are shown as their own rates.",
  "Airline = the airline that operated the flight. Regional airlines (Envoy, Republic, SkyWest, PSA, Endeavor) appear under their own names, not the American Eagle, United Express or Delta Connection brand on the ticket.",
  "Only the airlines BTS requires to report (those with at least 0.5% of US domestic scheduled passenger revenue). Spirit reported just 354 flights in these months.",
];

function scrollToAbout(e) {
  if (e) e.preventDefault();
  const el = typeof document !== "undefined" ? document.getElementById("about-this-data") : null;
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// One line under the title: where the numbers come from, with a jump to the full panel.
function SourceLine() {
  return (
    <p className="od-src">
      Data: <a href={DATA.sourceUrl} target="_blank" rel="noopener noreferrer">BTS Reporting Carrier On-Time Performance</a>
      {" · "}May–July 2026{" · "}1,851,282 flights{" · "}refreshed 6 Oct 2026{" · "}public domain{" · "}
      <a href="#about-this-data" onClick={scrollToAbout}>About this data and its caveats</a>
    </p>
  );
}

// Short caveats shown right next to a conclusion.
function Caveats({ items }) {
  return (
    <div className="od-cav">
      <b>Read with:</b>
      {items.map((c) => <span key={c}>{c}</span>)}
    </div>
  );
}

// The full "About this data" panel. `notes` adds this dashboard's own caveats (sample guards, method limits).
function AboutData({ notes }) {
  return (
    <section className="od-card od-about" id="about-this-data">
      <h2>About this data</h2>
      <p className="sub">Where every number on this page comes from, so you can check it or explore it yourself.</p>
      <dl>
        <dt>Source</dt>
        <dd>
          <a href={DATA.sourceUrl} target="_blank" rel="noopener noreferrer">{DATA.source}</a>, {DATA.publisher}. Every
          scheduled domestic flight the reporting airlines operated or cancelled, one row per flight.
        </dd>
        <dt>Coverage</dt>
        <dd>{DATA.coverage}</dd>
        <dt>Rows</dt>
        <dd>{DATA.rows}</dd>
        <dt>Last refreshed</dt>
        <dd>{DATA.refreshed}</dd>
        <dt>Licence</dt>
        <dd>{DATA.licence}</dd>
        <dt>"Late" means</dt>
        <dd>
          Arrived 15 or more minutes after the scheduled arrival time (the BTS and DOT definition). Late rate = late
          arrivals ÷ flights that operated. On-time rate = 1 − late rate.
        </dd>
        <dt>Caveats</dt>
        <dd>
          <ul>
            {CAVEATS.concat(notes || []).map((c) => <li key={c}>{c}</li>)}
          </ul>
        </dd>
      </dl>
    </section>
  );
}


// ---- Best time to fly ----

const BTF_CSS = `
.od-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 0; font-size: 11.5px; color: var(--dash-muted); }
.od-tags span { border: 1px solid var(--dash-border); border-radius: 999px; padding: 1px 8px; line-height: 1.5; white-space: nowrap; }
.od-grid.hero { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
.od-heat { width: 100%; min-width: 0; }
.od-rank .od-row .name { flex: 1 1 auto; }
.od-rank .od-row .val small { white-space: nowrap; }
.od-scale { display: flex; justify-content: space-between; font-size: 11px; color: var(--dash-muted); margin-top: -4px; font-variant-numeric: tabular-nums; }
@media (max-width: 900px) { .od-grid.hero { grid-template-columns: minmax(0, 1fr); } }
`;

// This dashboard's own caveats, added to the shared list in the About panel.
const ABOUT_NOTES = [
  "Small-sample guard: hours, days and hour-by-airline cells with fewer than 100 operated flights are hidden; the shaded best and worst windows need 200+ flights. Airline rankings need 1,000+ flights nationally, 100+ at one airport.",
  "Each weekday occurs only 13 times in the period (Friday 14), so a few stormy days can move a day's rate by several points.",
  "Holiday weeks (Memorial Day, 4 July) are included as scheduled, not removed.",
  "The departure hour is the scheduled local time at the departure airport; late is measured at arrival.",
  "Best and worst windows: two or three consecutive scheduled hours from 5am, pooled.",
];

const REGIONAL = new Set(["Envoy", "Republic", "SkyWest", "PSA", "Endeavor"]);
const HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const givenText = (g) => (g && g.value ? String(g.value).replace(/\\/g, "") : "");

// Short caveat tags attached to a chart.
function Tags({ items }) {
  return <div className="od-tags">{items.map((c) => <span key={c}>{c}</span>)}</div>;
}

// Best and worst windows of two or three consecutive scheduled hours from 5am, pooling the hours shown (each already
// has 100+ operated flights); a window needs 200+ operated flights.
function hourWindows(rows) {
  const byHour = new Map(rows.map((r) => [Number(r.dep_hour), r]));
  let best = null;
  let worst = null;
  for (let h = 5; h < 24; h++) {
    let op = 0;
    let late = 0;
    const present = [];
    for (let i = 0; i < 3; i++) {
      const r = byHour.get(h + i);
      if (!r) break;
      op += Number(r.operated) || 0; late += Number(r.late_flights) || 0; present.push(h + i);
    }
    if (present.length < 2 || op < 200) continue;
    const w = { start: present[0], end: present[present.length - 1] + 1, rate: late / op, operated: op };
    if (!best || w.rate < best.rate) best = w;
    if (!worst || w.rate > worst.rate) worst = w;
  }
  return { best, worst };
}

// Colours for "where this sits": best window, worst window, the rest; and a one-hue ramp for the heatmap.
const zoneColors = (t) => ({ best: t.pal.aqua, worst: t.pal.orange, rest: t.dark ? "#5c6470" : "#b8c2cf" });
const heatRange = (t) => (t.dark ? ["#3a2016", "#8a3a1a", "#d95926", "#f4a582"] : ["#fdeee6", "#f6b896", "#eb6834", "#8a2e0d"]);

// Hero 1: late rate by scheduled hour (bars), best/worst windows coloured, labels on the best and worst hour,
// all-US rate as a tick on each hour.
function hourBarsSpec(t, narrow, showNational) {
  const z = zoneColors(t);
  const x = {
    field: "dep_hour", type: "ordinal", scale: { domain: HOURS, paddingInner: 0.18 },
    axis: { title: "Scheduled departure (local)", labelExpr: HOUR_LABEL, labelAngle: 0, values: narrow ? [6, 9, 12, 15, 18, 21] : HOURS.filter((h) => h % 2 === 1), grid: false },
  };
  const y = { field: "late_rate", type: "quantitative", axis: { title: "Arrived 15+ min late", format: ".0%", tickCount: 5 }, scale: { zero: true } };
  const layers = [
    {
      mark: { type: "bar", cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
      encoding: {
        x, y,
        color: { field: "zone", type: "nominal", scale: { domain: ["best", "worst", "rest"], range: [z.best, z.worst, z.rest] }, legend: null },
        tooltip: [
          { field: "hour_label", title: "Scheduled departure" },
          { field: "late_rate", type: "quantitative", title: "Arrived late", format: ".1%" },
          { field: "nat_rate", type: "quantitative", title: "All US flights", format: ".1%" },
          { field: "operated", type: "quantitative", title: "Flights operated", format: "," },
        ],
      },
    },
    {
      transform: [{ filter: "datum.label" }],
      mark: { type: "text", dy: -8, fontWeight: 700, fontSize: 13, color: t.fg },
      encoding: { x, y, text: { field: "late_rate", type: "quantitative", format: ".0%" } },
    },
  ];
  if (showNational) {
    layers.push({
      transform: [{ filter: "datum.nat_rate != null" }],
      mark: { type: "tick", color: t.fg, thickness: 2, opacity: 0.7, bandSize: narrow ? 10 : 18 },
      encoding: { x, y: { field: "nat_rate", type: "quantitative" } },
    });
  }
  return { config: vegaConfig(t), height: narrow ? 240 : 300, layer: layers };
}

// Hero 2: airlines ranked by on-time rate, as HTML bars on a fixed 0-100% track (the track is the axis), so the
// value and the small print wrap instead of clipping at any width.
function RankBars({ rows, colors }) {
  return (
    <div className="od-rank">
      {rows.map((r) => (
        <div className="od-row" key={r.label} title={`${r.airline}: ${pct1(r.on_time_rate)} on time, ${pct1(r.late_rate)} late 15+ min, ${pct1(r.cancel_rate)} cancelled, ${whole(r.flight_count)} flights`}>
          <div className="top">
            <span className="name">{r.label}</span>
            <span className="val">{share(r.on_time_rate)}<small>{r.small}</small></span>
          </div>
          <div className="od-track">
            <div className="od-bar" style={{ width: `${Math.max(0, Math.min(1, r.on_time_rate)) * 100}%`, background: colors[r.zone] }} />
          </div>
        </div>
      ))}
      <div className="od-scale"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
    </div>
  );
}

// Hour x airline heatmap at the selected airport: cells = late rate, cells under 100 operated flights left out.
function heatSpec(t, narrow, order) {
  return {
    config: vegaConfig(t),
    height: { step: narrow ? 24 : 28 },
    encoding: {
      x: { field: "dep_hour", type: "ordinal", scale: { domain: HOURS }, axis: { title: "Scheduled departure (local)", labelExpr: HOUR_LABEL, labelAngle: 0, orient: "top", grid: false, ticks: false, domain: false, values: narrow ? [6, 9, 12, 15, 18, 21] : HOURS.filter((h) => h % 2 === 1) } },
      y: { field: "airline", type: "nominal", sort: order, axis: { title: null, labelColor: t.fg, labelFontSize: narrow ? 11 : 12.5, labelLimit: narrow ? 70 : 140, ticks: false, domain: false } },
    },
    layer: [
      {
        mark: { type: "rect", stroke: t.bg, strokeWidth: narrow ? 1 : 2, cornerRadius: narrow ? 2 : 3 },
        encoding: {
          color: { field: "late_rate", type: "quantitative", scale: { domain: [0, 0.5], clamp: true, range: heatRange(t) }, legend: { title: "Late 15+ min", format: ".0%", orient: "bottom", gradientLength: 160 } },
          tooltip: [
            { field: "airline", title: "Airline" },
            { field: "hour_label", title: "Scheduled departure" },
            { field: "late_rate", type: "quantitative", title: "Arrived late", format: ".1%" },
            { field: "operated", type: "quantitative", title: "Flights operated", format: "," },
          ],
        },
      },
      {
        // Cell values only where the cells are wide enough to hold them; on a phone the colour and tooltip carry it.
        transform: [{ filter: narrow ? "false" : "true" }],
        mark: { type: "text", fontSize: 10.5, fontWeight: 600 },
        encoding: {
          text: { field: "late_rate", type: "quantitative", format: ".0%" },
          color: { condition: { test: "datum.late_rate >= 0.3", value: t.dark ? "#171717" : "#ffffff" }, value: t.dark ? "#ededed" : "#171717" },
        },
      },
    ],
  };
}

// Day of week: small bars, best and worst day coloured and every bar labelled, all-US rate as a tick.
function daySpec(t, narrow, showNational) {
  const z = zoneColors(t);
  const x = { field: "weekday", type: "ordinal", scale: { domain: DAYS, paddingInner: 0.25 }, axis: { title: null, labelAngle: 0, grid: false } };
  const y = { field: "late_rate", type: "quantitative", axis: { title: "Arrived 15+ min late", format: ".0%", tickCount: 4 }, scale: { zero: true } };
  const layers = [
    {
      mark: { type: "bar", cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
      encoding: {
        x, y,
        color: { field: "zone", type: "nominal", scale: { domain: ["best", "worst", "rest"], range: [z.best, z.worst, z.rest] }, legend: null },
        tooltip: [
          { field: "weekday", title: "Day" },
          { field: "late_rate", type: "quantitative", title: "Arrived late", format: ".1%" },
          { field: "nat_rate", type: "quantitative", title: "All US flights", format: ".1%" },
          { field: "operated", type: "quantitative", title: "Flights operated", format: "," },
        ],
      },
    },
    { mark: { type: "text", dy: -8, fontSize: 12, fontWeight: 600, color: t.fg }, encoding: { x, y, text: { field: "late_rate", type: "quantitative", format: ".0%" } } },
  ];
  if (showNational) {
    layers.push({
      transform: [{ filter: "datum.nat_rate != null" }],
      mark: { type: "tick", color: t.fg, thickness: 2, opacity: 0.7, bandSize: 22 },
      encoding: { x, y: { field: "nat_rate", type: "quantitative" } },
    });
  }
  return { config: vegaConfig(t), height: narrow ? 180 : 200, layer: layers };
}

const hourLabel = (h) => (h === 0 ? "12am" : h < 12 ? h + "am" : h === 12 ? "12pm" : h - 12 + "pm");

// Rows for the airline bar chart: rank in the label, top 3 / bottom 1 coloured.
function airlineRows(rows) {
  const n = rows.length;
  return rows.map((r, i) => ({
    ...r,
    label: `${r.ranking}. ${r.airline}${REGIONAL.has(r.airline) ? " (regional)" : ""}`,
    zone: i < 3 ? "best" : i === n - 1 && n > 3 ? "worst" : "rest",
    small: `${compact(r.flight_count)} flights · ${pct1(r.cancel_rate)} cancelled`,
  }));
}

export default function Dashboard({ dashboard, givens }) {
  const t = useTheme();
  const narrow = useNarrow();
  const origin = givenText(useGiven("ORIGIN"));
  const airline = givenText(useGiven("AIRLINE"));
  const q = useQuery({ query: "best_time_to_fly", givens });
  const d = useQuery({ query: "best_time_to_fly_days", givens });
  const nat = useQuery({ query: "best_time_to_fly_airlines", givens });
  const here = useQuery({ query: "best_time_to_fly_airport_airlines", givens });
  const heat = useQuery({ query: "best_time_to_fly_heatmap", givens });
  const k = q.rows[0] || {};
  const days = d.rows[0] || {};
  const selected = !!(origin || airline);
  const selName = (origin || "All US airports") + (airline ? " · " + airline : "");

  const hourRows = React.useMemo(() => {
    const sel = k.sel_by_hour || [];
    const natMap = new Map((k.national_by_hour || []).map((r) => [Number(r.dep_hour), r.late_rate]));
    const win = hourWindows(sel);
    const shown = sel.filter((r) => Number(r.dep_hour) >= 5);
    const lo = shown.reduce((m, r) => (!m || r.late_rate < m.late_rate ? r : m), null);
    const hi = shown.reduce((m, r) => (!m || r.late_rate > m.late_rate ? r : m), null);
    const inWin = (w, h) => w && h >= w.start && h < w.end;
    return shown.map((r) => {
      const h = Number(r.dep_hour);
      return {
        ...r, dep_hour: h, hour_label: hourLabel(h), nat_rate: natMap.get(h),
        zone: inWin(win.best, h) ? "best" : inWin(win.worst, h) ? "worst" : "rest",
        label: r === lo || r === hi,
      };
    });
  }, [k.sel_by_hour, k.national_by_hour]);

  const dayRows = React.useMemo(() => {
    const sel = days.sel_by_day || [];
    const natMap = new Map((days.national_by_day || []).map((r) => [r.weekday, r.late_rate]));
    const lo = sel.reduce((m, r) => (!m || r.late_rate < m.late_rate ? r : m), null);
    const hi = sel.reduce((m, r) => (!m || r.late_rate > m.late_rate ? r : m), null);
    return sel.map((r) => ({ ...r, nat_rate: natMap.get(r.weekday), zone: r === lo ? "best" : r === hi ? "worst" : "rest" }));
  }, [days.sel_by_day, days.national_by_day]);

  const natAirlines = React.useMemo(() => airlineRows(nat.rows || []), [nat.rows]);
  const hereAirlines = React.useMemo(() => airlineRows(here.rows || []), [here.rows]);
  const heroAirlines = origin ? hereAirlines : natAirlines;
  const heatRows = React.useMemo(() => (heat.rows || []).filter((r) => Number(r.dep_hour) >= 5).map((r) => ({ ...r, dep_hour: Number(r.dep_hour), hour_label: hourLabel(Number(r.dep_hour)) })), [heat.rows]);
  const heatOrder = (origin ? here.rows || [] : nat.rows || []).map((r) => r.airline).filter((a) => heatRows.some((r) => r.airline === a));

  const specs = React.useMemo(() => ({
    hour: hourBarsSpec(t, narrow, selected),
    day: daySpec(t, narrow, selected),
    heat: heatSpec(t, narrow, heatOrder),
  }), [t, narrow, selected, heatOrder.join("|")]);

  const z = zoneColors(t);
  const hourKey = [["Best 2–3 hour window", z.best, true], ["Worst window", z.worst, true]].concat(selected ? [["All US flights (tick)", t.fg]] : []);
  const loading = q.loading || d.loading || nat.loading || here.loading || heat.loading;

  return (
    <div className="od" style={{ "--hot": t.pal.orange }}>
      <style>{CSS + ABOUT_CSS + BTF_CSS}</style>
      <h1>{dashboard.title}</h1>
      <SourceLine />
      <Controls />
      {[q, d, nat, here, heat].map((x, i) => x.error && <div className="err" key={i}>{String(x.error)}</div>)}
      <div className={loading ? "loading" : ""}>
        <div className="od-grid hero">
          <Card title={`Late arrivals by departure hour — ${selName}`} sub="Share arriving 15+ min late, by scheduled departure hour">
            <Key items={hourKey} />
            <div className="od-vega"><VegaChart spec={specs.hour} data={hourRows} /></div>
            <Tags items={["Departure time, not booking date", "Not adjusted for weather or season", "May–Jul 2026 only", "Correlation, not cause", "Hours under 100 flights hidden"]} />
          </Card>
          <Card title={`On-time rate by airline — ${origin || "all US"}`} sub={origin ? "Departures from this airport; airlines with 100+ flights" : "Airlines with 1,000+ flights"}>
            <RankBars rows={heroAirlines} colors={z} />
            <Tags items={["Cancellations not in on-time rate", "Regional airlines under own name", "Not adjusted for weather or season", "May–Jul 2026 only"]} />
          </Card>
        </div>

        {heatRows.length > 0 && (
          <div className="od-grid one">
            <Card title={`Late arrivals by airline and departure hour — ${origin || "all US"}`} sub="Cells: share arriving 15+ min late; blank = under 100 flights">
              <div className="od-heat"><VegaChart spec={specs.heat} data={heatRows} /></div>
              <Tags items={["Departure time, not booking date", "Cells under 100 flights hidden", "Not adjusted for weather or season", "Correlation, not cause"]} />
            </Card>
          </div>
        )}

        <div className="od-grid">
          <Card title={`Late arrivals by day of week — ${selName}`} sub="Share arriving 15+ min late">
            <Key items={[["Best day", z.best, true], ["Worst day", z.worst, true]].concat(selected ? [["All US flights (tick)", t.fg]] : [])} />
            <div className="od-vega"><VegaChart spec={specs.day} data={dayRows} /></div>
            <Tags items={["13 of each weekday (Fri 14)", "Not adjusted for weather or season", "Days under 100 flights hidden"]} />
          </Card>
          {origin ? (
            <Card title="On-time rate by airline — all US" sub="Airlines with 1,000+ flights">
              <RankBars rows={natAirlines} colors={z} />
              <Tags items={["Cancellations not in on-time rate", "Regional airlines under own name", "Spirit (354 flights) left out"]} />
            </Card>
          ) : (
            <Card title="Flights in the selection" sub="Scheduled, May–Jul 2026">
              <div className="od-kpi" style={{ border: 0, padding: 0 }}>
                <div className="v">{whole(k.sel_flights)}</div>
                <div className="s">Late {share(k.sel_late_rate)} · cancelled {pct1(k.sel_cancel_rate)}</div>
              </div>
            </Card>
          )}
        </div>
      </div>
      <AboutData notes={ABOUT_NOTES} />
    </div>
  );
}
