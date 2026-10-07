import React from "react";
import { Controls, VegaChart, useQuery } from "@malloyyo/dashboard";

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
// A cost range, conservative to upper bound: "$101M–$370M" (whole millions above $10M so the tile fits).
const range = (lo, hi) => {
  if (lo == null || hi == null || isNaN(lo) || isNaN(hi)) return "–";
  const f = (n) => (Math.abs(n) >= 1e7 ? "$" + Math.round(n / 1e6) + "M" : money(n));
  return f(lo) + "–" + f(hi);
};
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

// ---- Delay-chain cost charts ----

// Airports as dots on a US map, sized by the delay-chain cost they start. Positions: OurAirports (public domain).
function mapSpec(t, w, narrow) {
  const pos = { longitude: { field: "longitude", type: "quantitative" }, latitude: { field: "latitude", type: "quantitative" } };
  return {
    config: vegaConfig(t),
    width: w,
    height: Math.round(w * (narrow ? 0.66 : 0.6)),
    projection: { type: "albersUsa" },
    layer: [
      { data: { values: US_STATES }, mark: { type: "geoshape", fill: t.pal.land, stroke: t.pal.landStroke, strokeWidth: 0.8 } },
      {
        transform: [{ filter: "isValid(datum.latitude) && datum.longitude < -60 && (datum.latitude >= 24 || datum.longitude < -150)" }],
        mark: { type: "circle", opacity: 0.8, stroke: t.bg, strokeWidth: 1 },
        encoding: {
          ...pos,
          size: {
            field: "downstream_cost_usd", type: "quantitative",
            scale: { range: [narrow ? 3 : 6, narrow ? 260 : 1600], zero: true },
            legend: narrow ? null : { title: "Delay-chain cost", format: "$.2~s", orient: "bottom-right", direction: "vertical", symbolFillColor: t.pal.orange, symbolStrokeWidth: 0, values: [1e6, 5e6, 2e7] },
          },
          color: { value: t.pal.orange },
          order: { field: "downstream_cost_usd", sort: "descending" },
          tooltip: [
            { field: "label", title: "Airport" },
            { field: "downstream_cost_usd", type: "quantitative", title: "Delay-chain cost", format: "$,.0f" },
            { field: "late_first_legs", type: "quantitative", title: "Late first flights", format: "," },
          ],
        },
      },
      {
        transform: [{ filter: "datum.labelled && isValid(datum.latitude) && datum.longitude < -60 && (datum.latitude >= 24 || datum.longitude < -150)" }],
        mark: { type: "text", fontSize: narrow ? 11 : 12, fontWeight: 700, stroke: t.bg, strokeWidth: 3, strokeJoin: "round", opacity: 0.85, dy: -2, baseline: "middle", align: "center" },
        encoding: { ...pos, text: { field: "origin" } },
      },
      {
        transform: [{ filter: "datum.labelled && isValid(datum.latitude) && datum.longitude < -60 && (datum.latitude >= 24 || datum.longitude < -150)" }],
        mark: { type: "text", fontSize: narrow ? 11 : 12, fontWeight: 700, color: t.fg, dy: -2, baseline: "middle", align: "center" },
        encoding: { ...pos, text: { field: "origin" } },
      },
    ],
  };
}

function hourCostSpec(t, narrow) {
  return {
    config: vegaConfig(t),
    height: narrow ? 220 : 400,
    mark: { type: "bar", color: t.pal.orange, cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3, width: { band: 0.78 } },
    encoding: {
      x: {
        field: "dep_hour", type: "ordinal", scale: { domain: Array.from({ length: 24 }, (_, i) => i) },
        axis: { title: "Scheduled departure of the late first flight", labelExpr: HOUR_LABEL, labelAngle: 0, values: narrow ? [0, 6, 12, 18] : [0, 3, 5, 7, 9, 12, 15, 18, 21], grid: false },
      },
      y: { field: "downstream_cost_usd", type: "quantitative", axis: { title: "Delay-chain cost", format: "$.2~s", tickCount: 5 } },
      tooltip: [
        { field: "hour_label", title: "Departs" },
        { field: "downstream_cost_usd", type: "quantitative", title: "Delay-chain cost", format: "$,.0f" },
        { field: "late_first_legs", type: "quantitative", title: "Late first flights", format: "," },
      ],
    },
  };
}

function ChainMap({ t, rows, narrow }) {
  const [ref, width] = useWidth();
  const spec = React.useMemo(() => (width ? mapSpec(t, Math.max(240, width), narrow) : null), [t, width, narrow]);
  return (
    <div ref={ref} className="od-vega">
      {spec && <VegaChart spec={spec} data={rows} />}
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
.od-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 0; font-size: 11.5px; color: var(--dash-muted); }
.od-tags span { border: 1px solid var(--dash-border); border-radius: 999px; padding: 1px 8px; line-height: 1.5; white-space: nowrap; }
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

// Short caveat tags attached to a chart.
function Tags({ items }) {
  return <div className="od-tags">{items.map((c) => <span key={c}>{c}</span>)}</div>;
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

// This dashboard's own caveats, added to the shared list in the About panel.
const ABOUT_NOTES = [
  "Cost is always a range. Conservative: only the next flight's late-aircraft minutes, at $69.07 a minute (Airlines for America 2025 block-minute cost less fuel). Upper bound: every later flight's minutes that day, at $100.76 a minute (A4A 2024). Both rates are industry averages, not any one airline's costs.",
  "Attribution, not proof: storms delay an aircraft's first and later flights together, so not every minute counted was avoidable. Late-aircraft minutes are as reported by the airlines to BTS.",
  "Slot ranks and the top-50 share are national (upper-bound ranking), so they hold when filtered.",
];

export default function Dashboard({ dashboard, givens }) {
  const t = useTheme();
  const narrow = useNarrow();
  const q = useQuery({ query: "delay_chain_cost", givens });
  const m = useQuery({ query: "chain_cost_map", givens });
  const h = useQuery({ query: "chain_cost_by_hour", givens });
  const k = q.rows[0] || {};
  const slots = k.most_costly_slots || [];
  const slotName = (r) => `${r.airline} · ${r.origin} · ${r.hour_label}`;
  const mapRows = React.useMemo(() => {
    const rows = m.rows || [];
    return rows.map((r, i) => ({ ...r, label: `${r.origin} · ${r.origin_city}`, labelled: i < (narrow ? 4 : 12) }));
  }, [m.rows, narrow]);
  const hourSpec = React.useMemo(() => hourCostSpec(t, narrow), [t, narrow]);

  return (
    <div className="od" style={{ "--bar": t.pal.orange }}>
      <style>{CSS + ABOUT_CSS}</style>
      <h1>{dashboard.title}</h1>
      <SourceLine />
      <Controls />
      {q.error && <div className="err">{String(q.error)}</div>}
      <div className={q.loading ? "loading" : ""}>
        <div className="od-kpis">
          <div className="od-kpi">
            <div className="v">{range(k.total_conservative_cost, k.total_downstream_cost)}</div>
            <div className="l">Cost of delay chains, May–July 2026</div>
            <div className="s">Conservative (next flight only, $69.07/min) to upper bound (every later flight, $100.76/min)</div>
          </div>
          <div className="od-kpi hot">
            <div className="v">{share(k.share_in_top_50_slots)}</div>
            <div className="l">Share from the 50 costliest slots</div>
            <div className="s">
              {range(k.conservative_cost_in_top_50_slots, k.cost_in_top_50_slots)} from 50 of {k.slots != null ? k.slots.toLocaleString() : "–"} slots
            </div>
          </div>
          <div className="od-kpi">
            <div className="v">{share(k.share_started_5_to_8am)}</div>
            <div className="l">Started by 5–8am departures</div>
            <div className="s">First flights scheduled 5:00 to 8:59am</div>
          </div>
          <div className="od-kpi">
            <div className="v">{slots[0] ? range(slots[0].conservative_cost_usd, slots[0].downstream_cost_usd) : "–"}</div>
            <div className="l">Costliest single slot</div>
            <div className="s">{slots[0] ? slotName(slots[0]) : "–"}</div>
          </div>
        </div>
        <Caveats items={["May–Jul 2026 only", "Cost is a range, not a point", "Attribution, not proof", "Not adjusted for weather or season", "Late = arrived 15+ min after schedule"]} />

        <div className="od-grid one">
          <Card title="Delay-chain cost by starting airport" sub="Each dot is an airport, sized by the delay-chain cost its late first flights of the day set off">
            <ChainMap t={t} rows={mapRows} narrow={narrow} />
            <Tags items={["Dot size = upper-bound cost", "Attribution, not proof", "Not adjusted for weather or season"]} />
          </Card>
        </div>

        <div className="od-grid">
          <Card title="Delay-chain cost by departure hour" sub="Delay-chain cost by the scheduled hour of the late first flight">
            <div className="od-vega"><VegaChart spec={hourSpec} data={h.rows || []} /></div>
            <Tags items={["Scheduled hour of the first flight", "Not adjusted for weather or season", "Correlation, not cause"]} />
          </Card>
          <Card title="Delay-chain cost by departure slot (top 10)" sub="Airline · first-flight airport · scheduled hour, ranked nationally; bar = upper bound, label = conservative–upper">
            <Bars
              rows={slots.slice(0, narrow ? 8 : 10).map((r) => ({ ...r, name: `${r.slot_rank}. ${slotName(r)}` }))}
              value="downstream_cost_usd"
              label="name"
              right={(r) => range(r.conservative_cost_usd, r.downstream_cost_usd)}
              note={(r) => `${r.late_first_legs} late starts`}
            />
          </Card>
        </div>

        <Card title="Departure slots ranked by delay-chain cost" sub="Airline · first-flight airport · scheduled hour; conservative to upper bound">
          <div className="od-tablewrap">
            <table>
              <thead>
                <tr>
                  <th className="rank">#</th>
                  <th className="name">Slot</th>
                  <th className="hide-sm">Late first flights</th>
                  <th className="hide-sm">Later-flight delay min</th>
                  <th>Cost, conservative</th>
                  <th>Upper bound</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((r) => (
                  <tr key={r.slot_rank}>
                    <td className="rank">{r.slot_rank}</td>
                    <td className="name">{slotName(r)}</td>
                    <td className="hide-sm">{r.late_first_legs.toLocaleString()}</td>
                    <td className="hide-sm">{Math.round(r.downstream_late_aircraft_minutes).toLocaleString()}</td>
                    <td>{money(r.conservative_cost_usd)}</td>
                    <td className="up">{money(r.downstream_cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Tags items={["Cost is a range", "Attribution, not proof", "Not adjusted for weather or season", "May–Jul 2026 only"]} />
        </Card>
      </div>
      <AboutData notes={ABOUT_NOTES} />
      <p className="foot">
        Source: BTS on-time performance, May–July 2026. When an aircraft's first flight of the day arrived 15+ minutes
        late, the late-aircraft delay minutes on its later flights that day are attributed to that first flight's
        airline, airport and scheduled hour. Costs are a range. Conservative: only the next flight's late-aircraft
        minutes, at $69.07 a minute (Airlines for America 2025 block-minute cost, $98.41, less fuel, $29.34, since a
        plane held at the gate burns little fuel). Upper bound: every later flight's minutes, at $100.76 a minute
        (A4A 2024 block-minute cost). Charts and ranks use the upper bound. Attribution, not proof every minute was
        avoidable: storms delay first and later flights together. Slot ranks and the top-50 share are national, so
        they hold when filtered. Map: airport positions from OurAirports
        (public domain); state outlines from us-atlas (US Census Bureau cartographic boundaries, simplified).
      </p>
    </div>
  );
}

// US state outlines for the map: us-atlas 3.0.1 states-10m (ISC licence; US Census Bureau cartographic boundaries),
// decoded to lon/lat GeoJSON and simplified (Douglas-Peucker, 0.1 degree); territories and DC left out.
const US_STATES = {"type":"FeatureCollection","features":[{"type":"Feature","id":"01","geometry":{"type":"MultiPolygon","coordinates":[[[[-88.2,35.0],[-85.61,34.98],[-85.19,32.87],[-84.89,32.26],[-85.14,31.84],[-85.0,31.0],[-87.59,30.96],[-87.39,30.62],[-87.47,30.3],[-88.0,30.23],[-87.76,30.29],[-88.01,30.68],[-88.14,30.32],[-88.4,30.37],[-88.47,31.89],[-88.1,34.89],[-88.2,35.0]]]]}},{"type":"Feature","id":"02","geometry":{"type":"MultiPolygon","coordinates":[[[[-153.42,58.06],[-153.17,58.09],[-153.2,58.21],[-152.89,58.28],[-152.57,58.62],[-152.33,58.63],[-152.49,58.35],[-152.13,58.4],[-152.12,58.25],[-151.99,58.35],[-152.08,58.15],[-152.6,58.18],[-152.98,57.98],[-153.42,58.06]]],[[[-154.78,57.37],[-154.23,57.66],[-153.89,57.5],[-153.86,57.65],[-153.67,57.64],[-153.94,57.81],[-153.65,57.88],[-153.49,57.73],[-153.33,57.85],[-153.51,57.97],[-153.09,57.87],[-153.3,58.0],[-152.72,57.99],[-152.85,57.74],[-152.64,57.92],[-152.32,57.92],[-152.42,57.82],[-152.21,57.79],[-152.44,57.78],[-152.47,57.6],[-152.16,57.58],[-152.48,57.43],[-152.88,57.51],[-152.63,57.32],[-153.21,57.2],[-152.87,57.15],[-153.3,56.99],[-153.31,57.19],[-153.66,57.08],[-153.54,57.0],[-153.97,56.75],[-154.15,56.75],[-153.85,56.94],[-153.98,56.95],[-153.81,57.16],[-154.3,56.85],[-154.78,57.37]]],[[[-167.44,60.21],[-166.84,60.21],[-166.15,60.44],[-165.68,60.29],[-165.66,60.1],[-165.58,59.91],[-166.19,59.75],[-167.44,60.21]]],[[[-167.85,53.32],[-167.2,53.46],[-167.06,53.7],[-166.81,53.67],[-167.14,53.83],[-167.03,53.95],[-166.65,54.01],[-166.56,53.88],[-166.37,54.01],[-166.21,53.93],[-166.54,53.72],[-166.11,53.78],[-166.66,53.48],[-167.62,53.25],[-167.85,53.32]]],[[[-168.13,65.66],[-164.4,66.58],[-163.61,66.56],[-164.09,66.18],[-163.77,66.06],[-161.84,66.02],[-161.48,66.26],[-160.99,66.23],[-161.52,66.4],[-161.91,66.34],[-161.88,66.51],[-162.63,66.86],[-162.32,66.94],[-162.01,66.78],[-162.07,66.65],[-161.43,66.45],[-161.29,66.52],[-161.88,66.72],[-161.48,66.96],[-163.67,67.1],[-164.08,67.59],[-166.84,68.34],[-166.3,68.46],[-166.22,68.88],[-164.25,68.93],[-163.53,69.14],[-163.17,69.39],[-163.01,69.81],[-161.88,70.33],[-161.04,70.33],[-159.17,70.87],[-158.03,70.83],[-156.57,71.35],[-155.57,71.17],[-155.51,71.08],[-155.98,70.96],[-155.94,70.84],[-155.19,70.97],[-155.27,71.06],[-155.03,71.15],[-154.61,71.03],[-154.57,70.83],[-154.17,70.77],[-153.24,70.92],[-152.22,70.82],[-152.42,70.61],[-151.7,70.55],[-151.88,70.43],[-149.46,70.52],[-144.95,69.96],[-143.25,70.15],[-141.0,69.65],[-141.0,60.31],[-139.99,60.19],[-139.09,60.36],[-139.2,60.09],[-137.6,59.24],[-137.53,58.91],[-136.58,59.17],[-136.47,59.46],[-136.23,59.53],[-136.35,59.6],[-135.48,59.8],[-135.25,59.7],[-135.03,59.56],[-134.96,59.28],[-133.38,58.43],[-132.25,57.22],[-132.37,57.1],[-132.05,57.05],[-132.13,56.87],[-131.87,56.81],[-131.84,56.6],[-130.1,56.12],[-130.0,55.99],[-130.15,55.72],[-129.98,55.28],[-130.7,54.72],[-130.95,54.83],[-131.09,55.19],[-130.87,55.29],[-130.9,55.7],[-131.22,55.98],[-130.93,55.58],[-130.93,55.34],[-131.03,55.41],[-131.16,55.2],[-131.3,55.23],[-131.2,55.39],[-131.43,55.24],[-131.84,55.46],[-131.65,55.59],[-131.69,55.89],[-131.84,55.88],[-131.97,55.5],[-132.15,55.56],[-132.28,55.76],[-132.08,55.83],[-131.94,56.19],[-132.37,55.85],[-132.72,56.22],[-132.36,56.29],[-132.39,56.49],[-132.21,56.46],[-132.57,56.63],[-132.92,56.99],[-132.85,57.08],[-133.55,57.24],[-133.28,57.33],[-133.47,57.36],[-133.65,57.71],[-133.16,57.6],[-134.05,58.06],[-134.01,58.4],[-134.15,58.2],[-134.63,58.25],[-135.4,59.29],[-135.54,59.31],[-135.3,59.1],[-135.63,59.27],[-135.38,59.09],[-135.06,58.19],[-135.43,58.4],[-135.91,58.38],[-136.16,58.98],[-136.25,58.75],[-136.55,58.97],[-136.92,58.95],[-136.46,58.78],[-136.46,58.61],[-136.22,58.67],[-136.04,58.38],[-136.7,58.22],[-137.68,58.62],[-138.18,59.01],[-139.86,59.54],[-139.51,59.7],[-139.63,59.87],[-139.54,60.04],[-140.31,59.69],[-141.42,59.88],[-141.26,60.0],[-141.55,60.17],[-141.37,60.02],[-141.6,59.96],[-142.91,60.09],[-144.19,60.0],[-144.59,59.8],[-144.05,60.04],[-144.91,60.22],[-144.74,60.26],[-144.96,60.29],[-144.89,60.46],[-145.25,60.31],[-145.96,60.47],[-145.76,60.59],[-146.65,60.24],[-146.52,60.35],[-146.72,60.35],[-146.64,60.47],[-145.8,60.59],[-146.0,60.62],[-145.91,60.71],[-146.26,60.62],[-146.06,60.78],[-146.67,60.69],[-146.17,60.87],[-146.8,60.81],[-146.61,61.09],[-146.29,61.12],[-146.97,60.93],[-147.08,61.15],[-147.13,60.95],[-147.38,60.88],[-147.55,60.91],[-147.56,61.08],[-147.6,60.85],[-148.14,60.79],[-147.74,61.27],[-148.45,60.79],[-148.11,60.74],[-148.33,60.48],[-148.09,60.6],[-147.94,60.44],[-148.02,60.28],[-148.31,60.25],[-147.91,60.13],[-147.87,59.99],[-148.25,59.93],[-148.34,60.14],[-148.44,59.94],[-149.09,59.96],[-149.07,60.06],[-149.38,59.84],[-149.42,60.12],[-149.39,59.98],[-149.61,59.84],[-149.53,59.71],[-149.74,59.95],[-149.75,59.64],[-150.03,59.79],[-149.93,59.67],[-150.39,59.34],[-150.32,59.61],[-150.48,59.46],[-150.64,59.55],[-150.6,59.43],[-150.94,59.23],[-151.98,59.25],[-151.89,59.42],[-151.17,59.59],[-150.98,59.78],[-151.5,59.63],[-151.87,59.78],[-151.3,60.39],[-151.41,60.72],[-150.38,61.04],[-150.0,60.86],[-149.77,60.97],[-149.0,60.83],[-150.07,61.16],[-149.54,61.49],[-149.98,61.24],[-151.03,61.18],[-151.79,60.86],[-151.71,60.71],[-152.31,60.51],[-152.23,60.39],[-152.41,60.29],[-152.75,60.23],[-152.57,60.07],[-152.71,59.92],[-153.28,59.81],[-153.02,59.83],[-153.05,59.69],[-153.34,59.62],[-153.46,59.79],[-153.73,59.44],[-154.12,59.37],[-154.26,59.14],[-154.16,59.02],[-153.7,59.07],[-153.25,58.86],[-154.06,58.49],[-154.21,58.14],[-154.99,58.01],[-155.34,57.83],[-155.31,57.72],[-155.62,57.77],[-155.73,57.55],[-156.53,57.33],[-156.32,57.29],[-156.56,56.98],[-157.2,56.77],[-157.46,56.85],[-157.46,56.63],[-158.04,56.6],[-157.87,56.47],[-158.4,56.46],[-158.49,56.34],[-158.12,56.23],[-158.48,56.09],[-158.44,55.99],[-158.6,56.13],[-158.65,55.96],[-159.41,55.79],[-159.54,55.88],[-159.53,55.67],[-159.73,55.57],[-159.61,55.81],[-159.81,55.86],[-160.41,55.67],[-160.54,55.47],[-160.62,55.58],[-161.23,55.36],[-161.51,55.36],[-161.36,55.62],[-161.53,55.63],[-161.9,55.2],[-162.05,55.23],[-162.05,55.07],[-162.47,55.05],[-162.59,55.3],[-162.72,55.22],[-162.57,54.97],[-163.19,55.09],[-163.03,54.94],[-163.37,54.8],[-163.06,54.66],[-163.34,54.75],[-164.84,54.42],[-164.95,54.58],[-164.49,54.92],[-163.77,55.06],[-163.32,54.88],[-163.31,55.13],[-162.88,55.18],[-161.81,55.89],[-160.83,56.03],[-160.94,55.82],[-160.81,55.74],[-160.66,55.74],[-160.79,55.89],[-160.27,55.78],[-160.59,55.98],[-160.36,56.28],[-158.96,56.85],[-158.67,56.8],[-158.65,57.03],[-158.39,57.24],[-157.79,57.54],[-157.59,57.49],[-157.71,57.64],[-157.58,58.12],[-157.35,58.22],[-157.55,58.28],[-157.53,58.41],[-156.93,58.97],[-158.23,58.62],[-158.57,58.8],[-158.53,59.0],[-158.77,58.86],[-158.86,58.7],[-158.7,58.48],[-158.9,58.39],[-159.64,58.94],[-159.91,58.78],[-160.32,59.07],[-161.75,58.55],[-162.17,58.65],[-161.77,58.78],[-162.06,59.27],[-161.7,59.49],[-162.37,60.17],[-162.55,59.98],[-163.93,59.8],[-165.13,60.43],[-164.97,60.54],[-165.36,60.51],[-164.97,60.72],[-164.91,60.94],[-165.2,60.97],[-164.95,61.07],[-165.59,61.11],[-165.62,61.28],[-165.92,61.42],[-165.74,61.49],[-166.15,61.51],[-166.13,61.72],[-165.81,61.67],[-166.09,61.82],[-165.64,61.85],[-165.75,62.07],[-164.84,62.69],[-164.78,62.95],[-164.42,63.21],[-163.05,63.06],[-162.3,63.54],[-161.14,63.5],[-160.77,63.83],[-160.97,64.24],[-161.51,64.42],[-161.01,64.5],[-160.78,64.72],[-161.19,64.92],[-162.17,64.68],[-162.79,64.33],[-163.17,64.64],[-163.31,64.59],[-163.03,64.52],[-163.17,64.4],[-163.6,64.56],[-165.02,64.43],[-166.24,64.58],[-166.48,64.73],[-166.43,64.88],[-166.9,65.14],[-166.35,65.28],[-167.4,65.4],[-168.13,65.66]]],[[[-169.05,52.86],[-168.76,53.18],[-168.34,53.26],[-168.34,53.48],[-168.01,53.57],[-167.79,53.52],[-167.84,53.39],[-169.05,52.86]]],[[[-171.84,63.55],[-171.67,63.79],[-170.91,63.57],[-170.28,63.68],[-169.86,63.44],[-168.68,63.3],[-168.78,63.18],[-169.38,63.15],[-169.64,62.94],[-170.56,63.35],[-171.46,63.31],[-171.84,63.55]]],[[[-175.33,52.03],[-174.3,52.21],[-174.45,52.31],[-174.19,52.42],[-173.99,52.33],[-174.2,52.2],[-174.09,52.11],[-175.33,52.03]]],[[[-176.99,51.63],[-176.77,51.97],[-176.4,51.87],[-176.29,51.74],[-176.99,51.63]]],[[[-133.82,55.96],[-133.55,56.1],[-133.66,56.31],[-133.16,56.32],[-132.14,55.46],[-132.61,55.49],[-132.32,55.47],[-132.1,55.28],[-132.21,55.22],[-131.99,55.26],[-132.2,55.01],[-131.98,55.03],[-132.03,54.7],[-132.51,54.78],[-132.35,54.85],[-132.61,54.97],[-132.61,55.14],[-132.75,55.0],[-133.12,55.25],[-132.89,54.9],[-132.63,54.88],[-132.76,54.82],[-132.67,54.67],[-132.87,54.7],[-133.22,55.23],[-133.47,55.25],[-133.08,55.41],[-133.18,55.59],[-133.7,55.78],[-133.32,55.82],[-133.52,55.89],[-133.5,56.02],[-133.82,55.96]]],[[[-134.41,56.85],[-134.15,56.96],[-133.8,56.79],[-134.05,57.03],[-133.89,57.1],[-133.1,57.01],[-132.54,56.58],[-133.12,56.49],[-133.6,56.43],[-133.71,56.55],[-133.96,56.09],[-134.19,56.02],[-134.3,56.29],[-134.2,56.53],[-134.41,56.85]]],[[[-134.96,58.4],[-134.7,58.16],[-134.18,58.16],[-133.82,57.63],[-134.21,57.9],[-133.87,57.38],[-134.6,57.03],[-134.65,57.23],[-134.46,57.39],[-134.96,58.4]]],[[[-135.7,57.36],[-135.42,57.56],[-134.85,57.41],[-134.81,57.3],[-134.96,57.31],[-134.61,56.64],[-134.67,56.17],[-134.81,56.24],[-135.06,56.54],[-134.97,56.6],[-135.51,56.78],[-135.36,57.24],[-135.7,57.36]]],[[[-135.85,57.24],[-135.76,57.35],[-135.4,57.23],[-135.64,57.01],[-135.86,57.0],[-135.75,57.17],[-135.85,57.24]]],[[[-136.57,57.93],[-136.4,58.27],[-136.24,58.17],[-135.79,58.29],[-135.5,58.17],[-135.64,57.99],[-135.4,58.14],[-134.97,58.05],[-134.93,57.92],[-135.17,57.92],[-135.02,57.78],[-134.87,57.46],[-135.68,57.68],[-135.51,57.6],[-135.71,57.37],[-136.57,57.93]]],[[[-147.93,59.78],[-147.2,60.35],[-147.0,60.34],[-147.5,59.93],[-147.39,59.88],[-147.93,59.78]]]]}},{"type":"Feature","id":"04","geometry":{"type":"MultiPolygon","coordinates":[[[[-114.72,32.72],[-114.46,32.91],[-114.71,33.09],[-114.73,33.31],[-114.53,33.55],[-114.54,33.93],[-114.13,34.26],[-114.64,34.88],[-114.66,35.62],[-114.76,36.09],[-114.15,36.02],[-114.05,36.19],[-114.05,37.0],[-109.04,37.0],[-109.05,31.33],[-111.08,31.33],[-114.81,32.49],[-114.72,32.72]]]]}},{"type":"Feature","id":"08","geometry":{"type":"MultiPolygon","coordinates":[[[[-109.05,41.0],[-102.05,41.0],[-102.04,36.99],[-102.78,37.0],[-109.04,37.0],[-109.05,41.0]]]]}},{"type":"Feature","id":"12","geometry":{"type":"MultiPolygon","coordinates":[[[[-85.0,31.0],[-84.86,30.71],[-82.21,30.57],[-82.17,30.36],[-82.04,30.37],[-81.95,30.83],[-81.43,30.7],[-81.26,29.81],[-80.57,28.59],[-80.57,28.1],[-80.03,26.8],[-80.15,25.67],[-80.3,25.62],[-80.37,25.29],[-80.2,25.41],[-80.66,24.9],[-80.46,25.21],[-81.14,25.16],[-81.29,25.69],[-81.69,25.85],[-81.87,26.38],[-82.11,26.48],[-82.07,26.96],[-82.27,26.72],[-82.64,27.39],[-82.74,27.54],[-82.39,27.84],[-82.69,28.03],[-82.59,27.82],[-82.73,27.61],[-82.85,27.86],[-82.69,28.91],[-83.79,29.98],[-84.27,30.1],[-84.34,29.9],[-85.12,29.72],[-85.01,29.62],[-84.69,29.76],[-85.05,29.59],[-85.35,29.66],[-85.42,29.84],[-85.34,29.69],[-85.3,29.81],[-85.6,30.06],[-86.3,30.36],[-87.52,30.28],[-87.37,30.44],[-87.6,31.0],[-85.0,31.0]]]]}},{"type":"Feature","id":"13","geometry":{"type":"MultiPolygon","coordinates":[[[[-85.61,34.98],[-83.11,35.0],[-83.34,34.68],[-82.88,34.48],[-82.56,33.94],[-81.49,33.01],[-81.11,32.11],[-80.84,32.02],[-81.2,31.72],[-81.13,31.62],[-81.49,30.98],[-81.44,30.71],[-81.95,30.83],[-82.04,30.37],[-82.17,30.36],[-82.21,30.57],[-84.86,30.71],[-85.11,31.19],[-85.14,31.84],[-84.89,32.26],[-85.19,32.87],[-85.61,34.98]]]]}},{"type":"Feature","id":"18","geometry":{"type":"MultiPolygon","coordinates":[[[[-87.52,41.71],[-84.81,41.76],[-84.81,38.79],[-85.41,38.74],[-85.42,38.54],[-86.05,37.96],[-86.35,38.2],[-86.51,37.93],[-86.72,37.89],[-86.86,37.99],[-87.13,37.78],[-87.6,37.97],[-87.63,37.83],[-87.9,37.92],[-87.95,37.77],[-88.1,37.9],[-87.99,38.25],[-87.49,38.74],[-87.64,39.17],[-87.53,39.35],[-87.52,41.71]]]]}},{"type":"Feature","id":"20","geometry":{"type":"MultiPolygon","coordinates":[[[[-102.05,40.0],[-95.31,40.0],[-94.88,39.83],[-95.11,39.57],[-94.95,39.39],[-94.59,39.16],[-94.62,37.0],[-102.04,36.99],[-102.05,40.0]]]]}},{"type":"Feature","id":"23","geometry":{"type":"MultiPolygon","coordinates":[[[[-70.7,43.06],[-70.99,43.38],[-71.08,45.31],[-70.86,45.23],[-70.83,45.4],[-70.64,45.38],[-70.72,45.52],[-70.26,45.89],[-70.29,46.19],[-70.0,46.69],[-69.23,47.46],[-69.04,47.43],[-68.9,47.18],[-68.32,47.36],[-67.79,47.07],[-67.8,45.68],[-67.45,45.6],[-67.49,45.28],[-67.16,45.16],[-66.98,44.81],[-67.57,44.56],[-68.18,44.38],[-68.19,44.24],[-68.4,44.25],[-68.48,44.43],[-68.66,44.0],[-68.78,44.49],[-69.0,44.43],[-69.08,43.97],[-70.17,43.68],[-70.7,43.06]]]]}},{"type":"Feature","id":"25","geometry":{"type":"MultiPolygon","coordinates":[[[[-73.26,42.75],[-71.29,42.7],[-70.9,42.89],[-70.6,42.66],[-70.87,42.55],[-71.01,42.28],[-70.72,42.21],[-70.7,41.99],[-70.41,41.74],[-70.0,41.81],[-70.24,42.07],[-69.97,41.91],[-69.99,41.54],[-70.0,41.67],[-70.35,41.64],[-70.95,41.41],[-70.66,41.54],[-70.63,41.71],[-71.12,41.5],[-71.38,42.02],[-73.49,42.05],[-73.26,42.75]]]]}},{"type":"Feature","id":"27","geometry":{"type":"MultiPolygon","coordinates":[[[[-97.23,49.0],[-95.15,49.0],[-95.15,49.38],[-94.96,49.37],[-94.54,48.7],[-93.79,48.52],[-92.99,48.62],[-92.63,48.54],[-92.71,48.46],[-92.51,48.45],[-92.37,48.22],[-92.06,48.36],[-91.57,48.04],[-90.89,48.25],[-90.76,48.1],[-89.49,48.01],[-90.87,47.56],[-92.09,46.79],[-92.01,46.71],[-92.29,46.66],[-92.35,46.02],[-92.86,45.72],[-92.89,45.58],[-92.65,45.44],[-92.81,44.77],[-91.44,44.0],[-91.22,43.5],[-96.45,43.5],[-96.45,45.3],[-96.86,45.61],[-96.58,45.83],[-96.56,46.06],[-96.8,46.66],[-96.86,47.61],[-97.13,48.14],[-97.23,49.0]]]]}},{"type":"Feature","id":"34","geometry":{"type":"MultiPolygon","coordinates":[[[[-75.56,39.63],[-74.72,40.15],[-75.2,40.65],[-75.05,40.87],[-75.14,40.97],[-74.75,41.35],[-73.89,40.98],[-74.07,40.66],[-74.26,40.5],[-73.98,40.45],[-74.1,39.76],[-74.86,38.94],[-74.97,38.94],[-74.89,39.16],[-75.37,39.34],[-75.56,39.63]]]]}},{"type":"Feature","id":"37","geometry":{"type":"MultiPolygon","coordinates":[[[[-81.68,36.59],[-75.87,36.55],[-75.53,35.79],[-75.99,36.53],[-75.8,36.07],[-76.18,36.3],[-76.06,36.16],[-76.46,36.18],[-76.3,36.1],[-76.58,36.01],[-76.74,36.21],[-76.67,35.94],[-76.01,35.96],[-76.04,35.67],[-75.95,35.96],[-75.73,35.82],[-75.73,35.63],[-76.14,35.33],[-76.49,35.37],[-76.59,35.51],[-76.46,35.55],[-76.63,35.51],[-76.58,35.39],[-77.02,35.52],[-76.47,35.26],[-76.8,34.96],[-76.98,35.06],[-76.76,34.92],[-76.29,35.01],[-76.53,34.68],[-76.67,34.71],[-76.52,34.65],[-76.04,35.06],[-76.54,34.59],[-77.03,34.66],[-77.56,34.42],[-77.96,33.85],[-78.54,33.85],[-79.67,34.8],[-80.8,34.82],[-81.04,35.15],[-82.39,35.22],[-83.11,35.0],[-84.32,34.99],[-84.29,35.22],[-83.88,35.52],[-82.99,35.77],[-82.63,36.07],[-82.56,35.95],[-82.03,36.13],[-81.71,36.34],[-81.68,36.59]]]]}},{"type":"Feature","id":"38","geometry":{"type":"MultiPolygon","coordinates":[[[[-104.05,49.0],[-97.23,49.0],[-97.13,48.14],[-96.83,47.34],[-96.56,45.94],[-104.04,45.95],[-104.05,49.0]]]]}},{"type":"Feature","id":"40","geometry":{"type":"MultiPolygon","coordinates":[[[[-103.0,37.0],[-94.62,37.0],[-94.43,35.39],[-94.49,33.64],[-95.23,33.96],[-96.15,33.84],[-96.32,33.69],[-97.0,33.95],[-97.12,33.72],[-97.21,33.92],[-97.44,33.82],[-97.69,33.99],[-97.88,33.85],[-98.11,34.15],[-98.49,34.06],[-100.0,34.56],[-100.0,36.5],[-103.0,36.5],[-103.0,37.0]]]]}},{"type":"Feature","id":"42","geometry":{"type":"MultiPolygon","coordinates":[[[[-80.52,41.98],[-79.76,42.27],[-79.76,42.0],[-75.36,42.0],[-75.08,41.8],[-74.98,41.48],[-74.7,41.36],[-75.09,41.01],[-75.19,40.58],[-74.72,40.15],[-75.42,39.8],[-80.52,39.72],[-80.52,41.98]]]]}},{"type":"Feature","id":"46","geometry":{"type":"MultiPolygon","coordinates":[[[[-104.06,45.0],[-104.04,45.95],[-96.56,45.94],[-96.86,45.61],[-96.45,45.3],[-96.45,43.5],[-96.6,43.45],[-96.44,43.12],[-96.63,42.71],[-96.51,42.48],[-97.22,42.85],[-98.02,42.76],[-98.5,43.0],[-104.05,43.0],[-104.06,45.0]]]]}},{"type":"Feature","id":"48","geometry":{"type":"MultiPolygon","coordinates":[[[[-103.0,36.5],[-100.0,36.5],[-100.0,34.56],[-99.71,34.39],[-99.38,34.46],[-99.19,34.22],[-98.49,34.06],[-98.11,34.15],[-97.88,33.85],[-97.69,33.99],[-97.44,33.82],[-97.21,33.92],[-97.12,33.72],[-97.0,33.95],[-96.32,33.69],[-96.15,33.84],[-95.23,33.96],[-94.39,33.55],[-94.04,33.54],[-94.04,31.99],[-93.52,31.07],[-93.74,30.54],[-93.7,30.07],[-93.93,29.8],[-93.84,29.68],[-94.73,29.37],[-94.49,29.52],[-94.77,29.55],[-94.69,29.76],[-94.94,29.7],[-94.89,29.31],[-95.17,29.11],[-94.73,29.33],[-96.89,28.03],[-97.37,27.15],[-97.16,26.08],[-97.37,26.56],[-97.36,27.35],[-96.92,28.09],[-96.42,28.4],[-96.77,28.41],[-96.87,28.18],[-97.21,28.08],[-97.02,28.04],[-97.19,27.83],[-97.52,27.85],[-97.25,27.7],[-97.41,27.32],[-97.64,27.27],[-97.42,27.26],[-97.44,26.61],[-97.15,25.95],[-97.37,25.84],[-97.8,26.06],[-98.25,26.07],[-99.11,26.43],[-99.45,27.02],[-99.51,27.56],[-100.29,28.28],[-100.67,29.1],[-101.41,29.76],[-102.3,29.88],[-102.67,29.74],[-103.12,28.99],[-103.43,29.04],[-104.51,29.64],[-104.92,30.6],[-106.64,31.87],[-106.62,32.0],[-103.07,32.0],[-103.0,36.5]]]]}},{"type":"Feature","id":"56","geometry":{"type":"MultiPolygon","coordinates":[[[[-104.06,45.0],[-104.05,41.0],[-111.05,41.0],[-111.05,43.68],[-111.05,45.0],[-104.06,45.0]]]]}},{"type":"Feature","id":"09","geometry":{"type":"MultiPolygon","coordinates":[[[[-73.49,42.05],[-71.8,42.02],[-71.83,41.34],[-72.55,41.25],[-72.91,41.29],[-73.66,40.98],[-73.73,41.1],[-73.48,41.21],[-73.49,42.05]]]]}},{"type":"Feature","id":"29","geometry":{"type":"MultiPolygon","coordinates":[[[[-95.76,40.59],[-91.73,40.61],[-91.42,40.38],[-91.51,40.18],[-91.37,39.73],[-90.79,39.31],[-90.66,38.93],[-90.11,38.85],[-90.36,38.21],[-89.52,37.69],[-89.38,37.04],[-89.1,36.96],[-89.19,36.64],[-89.45,36.46],[-89.56,36.57],[-89.53,36.25],[-89.71,36.24],[-89.6,36.12],[-89.73,36.0],[-90.38,36.0],[-90.08,36.27],[-90.15,36.5],[-94.62,36.5],[-94.59,39.16],[-95.1,39.53],[-94.88,39.83],[-95.42,40.05],[-95.76,40.59]]]]}},{"type":"Feature","id":"54","geometry":{"type":"MultiPolygon","coordinates":[[[[-82.6,38.42],[-82.32,38.45],[-82.03,39.03],[-81.78,38.92],[-81.68,39.27],[-80.88,39.62],[-80.6,40.32],[-80.64,40.62],[-80.52,40.64],[-80.52,39.72],[-79.48,39.72],[-79.49,39.21],[-78.78,39.62],[-78.47,39.52],[-78.18,39.7],[-77.83,39.6],[-77.75,39.28],[-77.83,39.13],[-78.35,39.47],[-78.4,39.17],[-78.87,38.76],[-79.0,38.85],[-79.31,38.41],[-79.65,38.59],[-80.3,37.51],[-81.22,37.24],[-81.85,37.29],[-82.64,38.14],[-82.6,38.42]]]]}},{"type":"Feature","id":"17","geometry":{"type":"MultiPolygon","coordinates":[[[[-91.42,40.38],[-90.97,40.92],[-91.04,41.42],[-90.46,41.52],[-90.18,41.81],[-90.16,42.12],[-90.64,42.51],[-87.8,42.49],[-87.84,42.3],[-87.52,41.71],[-87.53,39.35],[-87.64,39.17],[-87.49,38.74],[-87.99,38.25],[-88.08,37.83],[-88.08,37.47],[-88.48,37.39],[-88.46,37.07],[-88.98,37.23],[-89.13,36.98],[-89.38,37.04],[-89.52,37.69],[-90.36,38.21],[-90.11,38.85],[-90.59,38.87],[-90.79,39.31],[-91.37,39.73],[-91.51,40.18],[-91.42,40.38]]]]}},{"type":"Feature","id":"35","geometry":{"type":"MultiPolygon","coordinates":[[[[-109.04,37.0],[-103.0,37.0],[-103.07,32.0],[-103.72,32.0],[-106.62,32.0],[-106.53,31.78],[-108.21,31.78],[-108.21,31.33],[-109.05,31.33],[-109.04,37.0]]]]}},{"type":"Feature","id":"05","geometry":{"type":"MultiPolygon","coordinates":[[[[-94.62,36.5],[-90.15,36.5],[-90.08,36.27],[-90.38,36.0],[-89.66,35.89],[-89.96,35.72],[-89.92,35.51],[-90.18,35.38],[-90.06,35.14],[-90.3,35.04],[-90.31,34.87],[-90.48,34.89],[-90.57,34.43],[-90.83,34.27],[-90.9,34.02],[-91.09,33.96],[-90.99,33.79],[-91.15,33.73],[-91.03,33.67],[-91.23,33.67],[-91.04,33.27],[-91.17,33.0],[-94.04,33.02],[-94.04,33.54],[-94.49,33.64],[-94.43,35.39],[-94.62,36.5]]]]}},{"type":"Feature","id":"06","geometry":{"type":"MultiPolygon","coordinates":[[[[-124.21,42.0],[-120.0,42.0],[-120.0,39.0],[-115.41,35.63],[-114.63,35.0],[-114.39,34.46],[-114.14,34.3],[-114.44,34.09],[-114.53,33.55],[-114.73,33.41],[-114.71,33.09],[-114.46,32.91],[-114.53,32.76],[-117.12,32.53],[-117.36,33.17],[-117.78,33.54],[-118.41,33.74],[-118.54,34.04],[-119.13,34.1],[-119.56,34.41],[-120.47,34.45],[-120.65,34.58],[-120.63,35.12],[-120.86,35.21],[-120.91,35.45],[-121.88,36.29],[-121.86,36.93],[-122.4,37.2],[-122.52,37.78],[-122.05,37.46],[-122.43,37.96],[-122.3,38.11],[-122.49,38.11],[-122.53,37.82],[-123.01,38.0],[-122.97,38.25],[-123.74,38.95],[-123.85,39.83],[-124.41,40.44],[-124.11,41.03],[-124.21,42.0]]]]}},{"type":"Feature","id":"10","geometry":{"type":"MultiPolygon","coordinates":[[[[-75.79,39.72],[-75.42,39.8],[-75.61,39.62],[-75.44,39.31],[-75.31,38.92],[-75.08,38.77],[-75.05,38.45],[-75.69,38.46],[-75.79,39.72]]]]}},{"type":"Feature","id":"15","geometry":{"type":"MultiPolygon","coordinates":[[[[-156.06,19.74],[-155.83,19.98],[-155.81,20.26],[-155.2,19.97],[-154.81,19.52],[-155.67,18.92],[-155.89,19.04],[-156.06,19.74]]],[[[-156.7,20.92],[-156.59,21.03],[-155.99,20.77],[-156.38,20.58],[-156.7,20.92]]],[[[-158.28,21.58],[-157.97,21.71],[-157.71,21.38],[-157.69,21.27],[-158.11,21.3],[-158.28,21.58]]],[[[-159.79,22.03],[-159.58,22.22],[-159.31,22.18],[-159.45,21.87],[-159.79,22.03]]]]}},{"type":"Feature","id":"19","geometry":{"type":"MultiPolygon","coordinates":[[[[-96.45,43.5],[-91.22,43.5],[-91.06,43.25],[-91.18,43.13],[-91.06,42.74],[-90.71,42.63],[-90.16,42.12],[-90.34,41.59],[-91.04,41.42],[-91.11,41.24],[-90.94,41.01],[-91.12,40.67],[-91.41,40.54],[-91.37,40.39],[-91.73,40.61],[-93.35,40.58],[-95.76,40.59],[-96.13,41.97],[-96.63,42.71],[-96.44,43.12],[-96.6,43.5],[-96.45,43.5]]]]}},{"type":"Feature","id":"21","geometry":{"type":"MultiPolygon","coordinates":[[[[-89.13,36.98],[-88.98,37.23],[-88.46,37.07],[-88.48,37.39],[-88.08,37.47],[-88.16,37.66],[-87.9,37.92],[-87.63,37.83],[-87.6,37.97],[-87.38,37.94],[-87.13,37.78],[-86.79,37.99],[-86.64,37.84],[-86.35,38.2],[-86.05,37.96],[-85.42,38.54],[-85.45,38.71],[-84.81,38.79],[-84.89,39.07],[-84.55,39.1],[-83.77,38.65],[-83.31,38.6],[-82.89,38.76],[-82.6,38.46],[-82.5,37.93],[-81.97,37.54],[-83.14,36.74],[-83.69,36.58],[-88.07,36.68],[-88.05,36.5],[-89.42,36.5],[-89.21,36.58],[-89.13,36.98]]]]}},{"type":"Feature","id":"24","geometry":{"type":"MultiPolygon","coordinates":[[[[-79.48,39.72],[-75.79,39.72],[-75.69,38.46],[-75.05,38.41],[-75.24,38.03],[-75.89,37.92],[-75.86,38.36],[-76.17,38.24],[-76.31,38.58],[-76.03,38.57],[-76.35,38.69],[-76.2,38.93],[-76.38,38.85],[-76.3,39.03],[-76.16,39.0],[-76.28,39.15],[-75.97,39.56],[-76.28,39.3],[-76.36,39.39],[-76.34,39.26],[-76.58,39.26],[-76.39,39.01],[-76.56,38.77],[-76.32,38.04],[-77.02,38.45],[-77.25,38.38],[-76.91,38.89],[-77.52,39.12],[-77.46,39.23],[-77.76,39.33],[-77.83,39.6],[-78.78,39.62],[-79.49,39.21],[-79.48,39.72]]]]}},{"type":"Feature","id":"26","geometry":{"type":"MultiPolygon","coordinates":[[[[-86.82,41.76],[-86.22,42.59],[-86.23,43.02],[-86.54,43.62],[-86.51,44.05],[-86.04,44.92],[-85.54,45.21],[-85.65,44.85],[-85.47,44.99],[-85.53,44.75],[-85.37,45.27],[-84.92,45.39],[-85.12,45.57],[-85.01,45.76],[-84.77,45.79],[-83.5,45.36],[-83.32,45.14],[-83.27,45.02],[-83.45,45.04],[-83.27,44.71],[-83.33,44.34],[-83.96,43.75],[-83.68,43.59],[-83.41,43.92],[-82.79,44.02],[-82.42,42.97],[-82.52,42.61],[-82.69,42.52],[-82.62,42.67],[-82.8,42.65],[-83.42,41.74],[-86.82,41.76]]],[[[-90.42,46.57],[-88.96,47.01],[-88.18,47.46],[-87.8,47.47],[-87.71,47.4],[-87.96,47.39],[-88.35,47.08],[-88.5,46.76],[-88.14,46.97],[-88.28,46.83],[-87.9,46.91],[-87.35,46.5],[-86.7,46.44],[-86.14,46.67],[-84.95,46.77],[-85.03,46.48],[-84.13,46.53],[-84.12,46.23],[-84.25,46.18],[-83.77,46.02],[-83.58,46.09],[-83.56,45.91],[-84.38,45.93],[-84.66,46.05],[-84.75,45.84],[-85.51,46.09],[-86.28,45.94],[-86.62,45.61],[-86.72,45.67],[-86.54,45.89],[-86.96,45.67],[-87.02,45.84],[-87.59,45.1],[-87.74,45.17],[-87.66,45.37],[-87.88,45.38],[-87.78,45.67],[-88.14,45.82],[-88.1,45.92],[-90.12,46.34],[-90.42,46.57]]]]}},{"type":"Feature","id":"28","geometry":{"type":"MultiPolygon","coordinates":[[[[-91.17,33.0],[-91.04,33.27],[-91.23,33.67],[-91.03,33.67],[-91.15,33.73],[-90.99,33.79],[-91.08,33.98],[-90.57,34.43],[-90.59,34.67],[-90.47,34.67],[-90.57,34.74],[-90.25,34.91],[-90.31,35.0],[-88.2,35.0],[-88.1,34.89],[-88.47,31.89],[-88.4,30.37],[-89.19,30.33],[-89.62,30.22],[-89.85,30.66],[-89.75,31.0],[-91.64,31.0],[-91.64,31.27],[-91.41,31.57],[-91.52,31.61],[-91.09,31.99],[-91.01,32.16],[-91.16,32.2],[-90.88,32.36],[-91.11,32.48],[-91.0,32.61],[-91.14,32.6],[-91.06,32.92],[-91.17,33.0]]]]}},{"type":"Feature","id":"30","geometry":{"type":"MultiPolygon","coordinates":[[[[-116.05,49.0],[-104.05,49.0],[-104.04,45.0],[-111.05,45.0],[-111.05,44.47],[-111.39,44.76],[-111.47,44.54],[-112.29,44.57],[-112.85,44.36],[-113.69,45.25],[-113.93,45.68],[-114.35,45.46],[-114.55,45.56],[-114.33,46.66],[-114.79,46.71],[-115.33,47.26],[-115.76,47.42],[-115.63,47.48],[-115.72,47.7],[-116.05,47.98],[-116.05,49.0]]]]}},{"type":"Feature","id":"33","geometry":{"type":"MultiPolygon","coordinates":[[[[-71.5,45.01],[-71.44,45.23],[-71.08,45.31],[-70.99,43.38],[-70.7,43.06],[-71.29,42.7],[-72.46,42.73],[-72.47,42.97],[-72.07,44.27],[-71.58,44.5],[-71.5,45.01]]]]}},{"type":"Feature","id":"36","geometry":{"type":"MultiPolygon","coordinates":[[[[-79.76,42.27],[-78.85,42.78],[-79.07,43.26],[-78.37,43.38],[-76.95,43.27],[-76.24,43.53],[-76.3,43.84],[-76.13,43.9],[-76.38,44.03],[-76.31,44.2],[-74.83,45.02],[-73.34,45.01],[-73.37,43.62],[-73.25,43.55],[-73.26,42.75],[-73.51,42.09],[-73.48,41.21],[-73.73,41.1],[-73.78,40.79],[-72.28,41.16],[-72.1,40.99],[-71.86,41.07],[-73.21,40.63],[-74.01,40.57],[-73.89,40.98],[-74.98,41.48],[-75.08,41.8],[-75.36,42.0],[-79.76,42.0],[-79.76,42.27]]]]}},{"type":"Feature","id":"39","geometry":{"type":"MultiPolygon","coordinates":[[[[-84.81,41.7],[-83.45,41.73],[-82.48,41.38],[-81.74,41.49],[-80.52,41.98],[-80.52,40.64],[-80.67,40.57],[-80.6,40.32],[-80.83,39.71],[-81.73,39.22],[-81.78,38.92],[-82.03,39.03],[-82.19,38.59],[-82.53,38.41],[-82.89,38.76],[-83.66,38.63],[-84.21,38.81],[-84.44,39.11],[-84.82,39.11],[-84.81,41.7]]]]}},{"type":"Feature","id":"41","geometry":{"type":"MultiPolygon","coordinates":[[[[-123.55,46.26],[-122.9,46.08],[-122.76,45.66],[-122.27,45.54],[-121.81,45.71],[-121.13,45.61],[-118.99,46.0],[-116.92,46.0],[-116.46,45.6],[-117.22,44.29],[-116.9,44.18],[-117.03,43.81],[-117.03,42.0],[-124.21,42.0],[-124.55,42.84],[-124.15,43.91],[-123.96,45.28],[-124.0,46.24],[-123.55,46.26]]]]}},{"type":"Feature","id":"47","geometry":{"type":"MultiPolygon","coordinates":[[[[-89.73,36.0],[-89.54,36.5],[-88.05,36.5],[-88.07,36.68],[-81.92,36.62],[-81.65,36.61],[-81.71,36.34],[-82.56,35.95],[-82.63,36.07],[-82.99,35.77],[-83.88,35.52],[-84.29,35.22],[-84.32,34.99],[-90.31,35.0],[-90.06,35.14],[-90.17,35.42],[-89.92,35.51],[-89.96,35.72],[-89.7,35.83],[-89.73,36.0]]]]}},{"type":"Feature","id":"49","geometry":{"type":"MultiPolygon","coordinates":[[[[-114.04,41.99],[-111.05,42.0],[-111.05,41.0],[-109.05,41.0],[-109.04,37.53],[-109.04,37.0],[-114.05,37.0],[-114.04,41.99]]]]}},{"type":"Feature","id":"51","geometry":{"type":"MultiPolygon","coordinates":[[[[-75.67,37.95],[-75.24,38.03],[-75.9,37.12],[-76.02,37.32],[-75.67,37.95]]],[[[-81.97,37.54],[-81.68,37.2],[-80.3,37.51],[-79.65,38.59],[-79.31,38.41],[-79.0,38.85],[-78.87,38.76],[-78.4,39.17],[-78.35,39.47],[-77.83,39.13],[-77.72,39.32],[-77.46,39.23],[-77.52,39.12],[-77.04,38.87],[-77.32,38.38],[-77.04,38.4],[-76.96,38.21],[-76.34,37.95],[-76.24,37.89],[-76.36,37.61],[-76.91,37.97],[-76.3,37.56],[-76.27,37.31],[-76.41,37.4],[-76.35,37.27],[-76.49,37.25],[-76.3,37.0],[-76.95,37.23],[-76.69,37.2],[-76.48,36.9],[-75.99,36.92],[-75.87,36.55],[-83.68,36.6],[-83.14,36.74],[-81.97,37.54]]]]}},{"type":"Feature","id":"53","geometry":{"type":"MultiPolygon","coordinates":[[[[-117.03,49.0],[-117.06,46.37],[-116.92,46.0],[-118.99,46.0],[-121.13,45.61],[-121.53,45.73],[-122.27,45.54],[-122.64,45.61],[-123.11,46.19],[-124.08,46.27],[-124.07,46.63],[-123.95,46.38],[-123.83,46.72],[-124.09,46.75],[-124.14,46.91],[-123.86,46.95],[-124.12,47.04],[-124.18,46.93],[-124.42,47.74],[-124.73,48.16],[-124.65,48.39],[-122.93,48.06],[-122.76,48.14],[-122.61,47.89],[-123.15,47.36],[-122.91,47.39],[-123.12,47.39],[-122.53,47.91],[-122.55,47.29],[-122.73,47.33],[-122.71,47.13],[-122.86,47.27],[-122.68,47.1],[-122.33,47.35],[-122.43,47.66],[-122.23,48.03],[-122.4,48.23],[-122.38,48.06],[-122.51,48.13],[-122.37,48.29],[-122.71,48.46],[-122.43,48.6],[-122.54,48.78],[-122.67,48.73],[-122.76,49.0],[-117.03,49.0]]]]}},{"type":"Feature","id":"55","geometry":{"type":"MultiPolygon","coordinates":[[[[-92.01,46.71],[-90.84,46.96],[-90.9,46.58],[-90.74,46.69],[-90.12,46.34],[-88.1,45.92],[-88.14,45.82],[-87.78,45.67],[-87.88,45.38],[-87.66,45.37],[-87.74,45.17],[-87.59,45.1],[-88.04,44.57],[-87.38,44.87],[-87.06,45.29],[-87.34,44.72],[-87.91,43.24],[-87.8,42.49],[-90.64,42.51],[-91.15,42.9],[-91.06,43.25],[-91.28,43.84],[-92.81,44.77],[-92.65,45.44],[-92.89,45.58],[-92.86,45.72],[-92.29,46.07],[-92.29,46.66],[-92.01,46.71]]]]}},{"type":"Feature","id":"31","geometry":{"type":"MultiPolygon","coordinates":[[[[-104.05,43.0],[-98.5,43.0],[-98.02,42.76],[-97.31,42.87],[-96.4,42.48],[-96.11,41.74],[-95.84,41.17],[-95.89,40.72],[-95.31,40.0],[-102.05,40.0],[-102.05,41.0],[-104.05,41.0],[-104.05,43.0]]]]}},{"type":"Feature","id":"45","geometry":{"type":"MultiPolygon","coordinates":[[[[-83.11,35.0],[-82.39,35.22],[-81.04,35.15],[-80.8,34.82],[-79.67,34.8],[-78.54,33.85],[-78.94,33.64],[-79.36,33.01],[-80.47,32.5],[-80.46,32.33],[-80.75,32.31],[-80.72,32.16],[-80.89,32.03],[-81.11,32.11],[-81.49,33.01],[-82.56,33.94],[-82.88,34.48],[-83.34,34.68],[-83.11,35.0]]]]}},{"type":"Feature","id":"16","geometry":{"type":"MultiPolygon","coordinates":[[[[-116.92,46.0],[-117.06,46.37],[-117.03,49.0],[-116.05,49.0],[-116.05,47.98],[-115.72,47.7],[-115.63,47.48],[-115.76,47.42],[-115.33,47.26],[-114.79,46.71],[-114.33,46.66],[-114.55,45.56],[-114.35,45.46],[-113.93,45.68],[-113.45,44.96],[-112.85,44.36],[-112.29,44.57],[-111.47,44.54],[-111.39,44.76],[-111.05,44.47],[-111.05,42.0],[-117.03,42.0],[-117.03,43.81],[-116.9,44.18],[-117.24,44.4],[-116.46,45.6],[-116.92,46.0]]]]}},{"type":"Feature","id":"32","geometry":{"type":"MultiPolygon","coordinates":[[[[-120.0,41.99],[-114.04,41.99],[-114.05,36.19],[-114.15,36.02],[-114.76,36.09],[-114.63,35.0],[-120.0,39.0],[-120.0,41.99]]]]}},{"type":"Feature","id":"50","geometry":{"type":"MultiPolygon","coordinates":[[[[-73.34,45.01],[-71.5,45.01],[-71.58,44.5],[-72.07,44.27],[-72.45,43.14],[-72.56,42.85],[-72.46,42.73],[-73.29,42.8],[-73.25,43.55],[-73.43,43.59],[-73.34,45.01]]]]}},{"type":"Feature","id":"22","geometry":{"type":"MultiPolygon","coordinates":[[[[-94.04,33.02],[-91.09,32.98],[-91.15,32.64],[-90.99,32.49],[-91.11,32.48],[-90.88,32.36],[-91.16,32.2],[-91.01,32.16],[-91.09,31.99],[-91.52,31.61],[-91.41,31.57],[-91.64,31.27],[-91.64,31.0],[-89.75,31.0],[-89.85,30.66],[-89.53,30.18],[-89.86,30.0],[-89.66,29.86],[-89.48,30.08],[-89.37,29.91],[-89.22,29.97],[-89.43,29.66],[-89.68,29.62],[-89.51,29.39],[-89.31,29.39],[-89.0,29.18],[-89.42,28.93],[-89.28,29.18],[-89.84,29.32],[-90.25,29.09],[-90.43,29.35],[-90.87,29.06],[-91.34,29.3],[-91.13,29.34],[-91.46,29.47],[-91.62,29.74],[-91.86,29.71],[-91.83,29.83],[-92.2,29.75],[-92.02,29.62],[-92.32,29.53],[-93.18,29.77],[-93.84,29.69],[-93.93,29.8],[-93.7,30.07],[-93.74,30.54],[-93.52,31.07],[-94.04,31.99],[-94.04,33.02]]]]}},{"type":"Feature","id":"44","geometry":{"type":"MultiPolygon","coordinates":[[[[-71.86,41.32],[-71.8,42.01],[-71.38,42.02],[-71.31,41.67],[-71.45,41.69],[-71.48,41.37],[-71.86,41.32]]]]}}]}.features;
