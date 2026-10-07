import React from "react";
import { Controls, VegaChart, useQuery } from "@malloyyo/dashboard";

// Self-contained on purpose: a dashboard component can import only React and @malloyyo/dashboard.

// ---- Shared chart helpers (the same block sits in each profit dashboard; a component can import only React and
// @malloyyo/dashboard, so it is repeated rather than shared). ----

const CSS = `
.od { box-sizing: border-box; max-width: 1120px; margin: 0 auto; padding: 28px 24px 40px;
  font-family: var(--dash-font); color: var(--dash-fg); }
.od *, .od *::before, .od *::after { box-sizing: border-box; }
.od h1 { font-size: 28px; line-height: 1.2; letter-spacing: -0.01em; margin: 0 0 18px; max-width: 40ch; }
.od-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0 28px; }
.od-kpi { border: 1px solid var(--dash-border); border-radius: 12px; padding: 16px 18px; }
.od-kpi .v { font-size: 34px; font-weight: 700; line-height: 1.05; font-variant-numeric: tabular-nums; }
.od-kpi .l { font-size: 14px; font-weight: 600; margin-top: 8px; }
.od-kpi .s { font-size: 13px; color: var(--dash-muted); margin-top: 4px; line-height: 1.35; }
.od-kpi.hot { border-color: var(--dash-accent); }
.od-kpi.hot .v { color: var(--dash-accent); }
.od-kpi.cold .v { color: var(--dash-muted); }
.od-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; margin-top: 16px; }
.od-grid.wide-left { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
.od-card { border: 1px solid var(--dash-border); border-radius: 12px; padding: 18px 20px 20px; min-width: 0; }
.od-card + .od-card, .od-grid + .od-card, .od-card + .od-grid { margin-top: 16px; }
.od-card h2 { font-size: 17px; margin: 0 0 4px; line-height: 1.3; }
.od-card .sub { font-size: 13px; color: var(--dash-muted); margin: 0 0 14px; line-height: 1.4; }
.od-multi { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px 22px; }
.od-panel { min-width: 0; }
.od-panel .pt { font-size: 14px; font-weight: 600; line-height: 1.3; margin: 0; overflow-wrap: anywhere; }
.od-panel .pn { font-size: 13px; color: var(--dash-muted); margin: 2px 0 2px; }
.od-panel .pn b { color: var(--dash-accent); font-weight: 700; }
.od-key { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 13px; color: var(--dash-muted); margin: -4px 0 14px; }
.od-key i { display: inline-block; width: 18px; height: 0; border-top: 3px solid; vertical-align: middle; margin-right: 6px; border-radius: 2px; }
.od-row { margin: 0 0 14px; }
.od-row .top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 14px; }
.od-row .name { min-width: 0; overflow-wrap: anywhere; }
.od-row .val { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.od-row .val small { font-weight: 400; color: var(--dash-muted); font-size: 12px; margin-left: 6px; }
.od-track { height: 16px; margin-top: 5px; border-radius: 4px; background: color-mix(in srgb, var(--dash-border) 55%, transparent); }
.od-bar { height: 100%; border-radius: 4px; background: var(--dash-accent); min-width: 2px; }
.od-bar.neg { background: var(--dash-danger); opacity: .75; }
.od-tablewrap { overflow-x: auto; }
.od table { width: 100%; border-collapse: collapse; font-size: 14px; font-variant-numeric: tabular-nums; }
.od th { text-align: right; font-size: 12px; font-weight: 600; color: var(--dash-muted); padding: 8px 10px;
  border-bottom: 1px solid var(--dash-border); white-space: normal; vertical-align: bottom; line-height: 1.3; }
.od td { text-align: right; padding: 9px 10px; border-bottom: 1px solid var(--dash-border); white-space: nowrap; }
.od th:first-child, .od td:first-child { padding-left: 0; }
.od th.agency, .od td.agency { text-align: left; white-space: normal; min-width: 0; }
@media (min-width: 700px) { .od td.agency { min-width: 12em; } .od th.wrap { max-width: 9em; } }
.od td.rank { color: var(--dash-muted); width: 1%; padding-right: 4px; }
.od th.rank { width: 1%; }
.od td.up { color: var(--dash-accent); font-weight: 600; }
.od .foot { font-size: 12px; color: var(--dash-muted); line-height: 1.5; margin-top: 22px; max-width: 80ch; }
.od .err { color: var(--dash-danger); font-size: 13px; white-space: pre-wrap; }
.od .loading { opacity: .45; transition: opacity .15s; }
.od-vega svg { display: block; max-width: 100%; }
.od-mapcard .od-vega { max-width: 860px; margin: 0 auto; }
.od-names { list-style: none; padding: 0; margin: 10px 0 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 20px; font-size: 13px; }
.od-names li { min-width: 0; overflow-wrap: anywhere; line-height: 1.35; }
.od-names b { display: inline-block; min-width: 1.2em; }
.od-names span { color: var(--dash-muted); white-space: nowrap; }
@media (max-width: 900px) {
  .od-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .od-grid, .od-grid.wide-left { grid-template-columns: minmax(0, 1fr); }
  .od-multi { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .od-names { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .od { padding: 18px 16px 32px; }
  .od h1 { font-size: 22px; }
  .od-kpi { padding: 12px 14px; }
  .od-kpi .v { font-size: 26px; }
  .od-kpi .l { font-size: 13px; }
  .od-card { padding: 14px 14px 16px; }
  .od-multi { gap: 14px 14px; }
  .od-names { grid-template-columns: minmax(0, 1fr); }
  .od .hide-sm { display: none; }
  .od-row .val { text-align: right; }
  .od-row .val small { display: block; margin-left: 0; }
  .od td, .od th { padding-left: 6px; padding-right: 6px; }
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
const signed = (s, n) => (n > 0 ? "+" : n < 0 ? "−" : "") + s.replace("-", "");
const pct = (p) => {
  if (p == null || isNaN(p)) return "–";
  const v = p * 100;
  return signed(Math.abs(v) < 10 ? v.toFixed(1) + "%" : Math.round(v).toLocaleString() + "%", v);
};
const plusCompact = (n) => signed(compact(n), n);

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
        <div className={r[value] < 0 ? "od-bar neg" : "od-bar"} style={{ width: `${(Math.abs(r[value]) / max) * 100}%` }} />
      </div>
    </div>
  ));
}

// Chart colours. Hues and steps from a CVD-checked palette (blue for growth, red for decline, one blue ramp for
// ordered size bands), each mode stepped for its own surface. Text and axes take the runtime's --dash-* colours.
const PALETTE = {
  light: {
    up: "#2a78d6", down: "#e34948", divDown: "#c23b3a", divMid: "#e9e8e4", divUp: "#1c5cab",
    bands: ["#104281", "#1c5cab", "#2a78d6", "#5598e7", "#86b6ef"],
    seq: ["#dbe9fb", "#0d366b"], empty: "#f1f2f4",
  },
  dark: {
    up: "#3987e5", down: "#e66767", divDown: "#e66767", divMid: "#3a3a37", divUp: "#6da7ec",
    bands: ["#cde2fb", "#86b6ef", "#5598e7", "#2a78d6", "#1c5cab"],
    seq: ["#1a2b42", "#9ec5f4"], empty: "#1b1b1b",
  },
};

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

// Width of an element, for charts whose height must follow their width (the maps).
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

// A US state choropleth over inlined geometry. `values` maps a 2-letter state code to a number (null = no data);
// `extra` maps it to fields for the tooltip.
function StateMap({ t, values, extra, scale, legendTitle, legendFormat, tooltip }) {
  const [ref, width] = useWidth();
  const features = React.useMemo(() => {
    const byFips = {};
    for (const [abbr, v] of Object.entries(values || {})) {
      const f = ABBR_TO_FIPS[abbr];
      if (f) byFips[f] = { value: v, ...((extra && extra[abbr]) || {}) };
    }
    return US_FEATURES.map((ft) => ({ ...ft, properties: { name: ft.properties.name, value: null, ...(byFips[ft.id] || {}) } }));
  }, [values, extra]);
  const spec = React.useMemo(() => {
    if (!width) return null;
    const w = Math.max(240, width);
    return {
      config: vegaConfig(t),
      width: w,
      height: Math.round(w * 0.6),
      projection: { type: "identity" },
      mark: { type: "geoshape", stroke: t.bg, strokeWidth: 0.8 },
      encoding: {
        color: {
          condition: { test: "datum.properties.value == null", value: t.pal.empty },
          field: "properties.value",
          type: "quantitative",
          scale,
          legend: {
            title: legendTitle, format: legendFormat, orient: "bottom", direction: "horizontal",
            gradientLength: Math.min(300, w - 60), gradientThickness: 12, titleOrient: "top", labelOverlap: true,
            // SI formats give every tick the same prefix ("$0M"); show zero plainly.
            labelExpr: `datum.value === 0 ? '${String(legendFormat || "").startsWith("$") ? "$0" : "0%"}' : datum.label`,
          },
        },
        tooltip,
      },
    };
  }, [t, width, scale, legendTitle, legendFormat, tooltip]);
  return (
    <div ref={ref} className="od-vega">
      {spec && <VegaChart spec={spec} data={features} />}
    </div>
  );
}

function Card({ title, sub, children, className }) {
  return (
    <section className={"od-card" + (className ? " " + className : "")}>
      <h2>{title}</h2>
      {sub && <p className="sub">{sub}</p>}
      {children}
    </section>
  );
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

// ---- Microtransit prospects (ADA paratransit separated out) ----
// This page draws no map, so the state geometry is not bundled.
const US_FEATURES = [];
const ABBR_TO_FIPS = {};

const money = (n) => {
  if (n == null || isNaN(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return "$" + (a >= 1e8 ? Math.round(n / 1e6) : (n / 1e6).toFixed(1)) + "M";
  if (a >= 1e3) return "$" + Math.round(n / 1e3) + "k";
  return "$" + Math.round(n);
};
const plusMoney = (n) => signed(money(n), n);
const share = (p) => (p == null || isNaN(p) ? "–" : Math.round(p * 100) + "%");

// Stacked bars by year: paratransit (and sponsored) vs general public.
function mixSpec(t, narrow) {
  return {
    config: vegaConfig(t),
    height: narrow ? 220 : 260,
    encoding: {
      x: { field: "year", type: "ordinal", axis: { title: "Year · general-public share of hours", labelAngle: 0 } },
      y: { field: "hours", type: "quantitative", stack: "zero", axis: { title: "Vehicle revenue hours a year", format: "~s", tickCount: 5 } },
      color: {
        field: "kind", type: "nominal",
        scale: { domain: ["General public (est.)", "Paratransit + sponsored"], range: [t.pal.up, t.dark ? "#4b4b47" : "#cfd3d8"] },
        legend: { orient: "top", title: null, direction: narrow ? "vertical" : "horizontal", symbolType: "square" },
      },
      order: { field: "order", type: "quantitative" },
      tooltip: [
        { field: "year", title: "Year" },
        { field: "kind", title: "Service" },
        { field: "hours", type: "quantitative", title: "Hours", format: ",.0f" },
      ],
    },
    mark: { type: "bar", width: { band: 0.6 } },
  };
}

// Scatter: ADA share of on-demand trips (x) against general-public hours added since 2022 (y).
function prospectSpec(t, narrow) {
  const x = {
    field: "ada_share", type: "quantitative", scale: { domain: [0, 1] },
    axis: { title: "ADA paratransit share of on-demand trips, 2024", format: ".0%", values: [0, 0.25, 0.5, 0.75, 1] },
  };
  const y = {
    field: "hours_added", type: "quantitative", scale: { type: "symlog", constant: 1000, domain: [-150000, 250000], clamp: true },
    axis: { title: "New general-public hours added, 2022 to 2024", format: "~s", values: [-100000, -25000, 0, 25000, 100000, 200000] },
  };
  const size = { field: "ondemand_hours_2024", type: "quantitative", scale: { range: [10, narrow ? 360 : 640] }, legend: null };
  return {
    config: vegaConfig(t),
    height: narrow ? 360 : 440,
    layer: [
      { mark: { type: "rule", color: t.muted, strokeDash: [3, 3] }, encoding: { y: { datum: 0 } } },
      {
        mark: { type: "circle", opacity: 0.7, stroke: t.bg, strokeWidth: 1 },
        encoding: {
          x, y, size,
          color: {
            field: "kind", type: "nominal",
            scale: { domain: ["Adding", "Cutting", "No new service"], range: [t.pal.up, t.pal.down, t.muted] },
            legend: { orient: "top", title: null, direction: narrow ? "vertical" : "horizontal", symbolSize: 110 },
          },
          tooltip: [
            { field: "agency", title: "Agency" },
            { field: "ada_share", type: "quantitative", title: "ADA share of trips", format: ".0%" },
            { field: "hours_added", type: "quantitative", title: "New general-public hours added", format: "+,.0f" },
            { field: "ondemand_hours_2024", type: "quantitative", title: "All on-demand hours, 2024", format: ",.0f" },
          ],
        },
      },
      {
        transform: [{ filter: "datum.labelled" }],
        mark: { type: "circle", fillOpacity: 0, stroke: t.fg, strokeWidth: 1.5 },
        encoding: { x, y, size },
      },
      // Rank numbers above each ringed dot; 5 goes below, where 4 and 5 sit close together.
      {
        transform: [{ filter: "datum.labelled && datum.added_rank != 5" }],
        mark: { type: "text", dy: narrow ? -12 : -15, fontSize: 12, fontWeight: 700, color: t.fg },
        encoding: { x, y, text: { field: "added_rank" } },
      },
      {
        transform: [{ filter: "datum.added_rank == 5" }],
        mark: { type: "text", dy: narrow ? 13 : 16, fontSize: 12, fontWeight: 700, color: t.fg },
        encoding: { x, y, text: { field: "added_rank" } },
      },
      // The two largest paratransit agencies, named where a naive on-demand list would rank them.
      {
        transform: [{ filter: "datum.big_para" }],
        mark: { type: "text", align: "right", dx: -6, dy: narrow ? 22 : 26, fontSize: 12, color: t.muted, limit: narrow ? 230 : 380 },
        encoding: { x, y, text: { field: "short" } },
      },
    ],
  };
}

// Diverging bars: on-demand service in the latest 12 monthly reports vs 2024, for the top prospects.
function momentumSpec(t, narrow, n) {
  return {
    config: vegaConfig(t),
    height: Math.max(180, n * (narrow ? 30 : 32)),
    encoding: {
      y: { field: "agency", type: "nominal", sort: null, axis: { title: null, labelLimit: narrow ? 150 : 230, labelFontSize: 12 } },
      x: { field: "momentum", type: "quantitative", scale: { domain: [-0.65, 0.4], clamp: true }, axis: { title: "vs 2024, all on-demand", format: "+.0%", tickCount: 5 } },
    },
    layer: [
      {
        mark: { type: "bar", cornerRadiusEnd: 3, height: { band: 0.62 } },
        encoding: {
          color: { condition: { test: "datum.momentum < 0", value: t.pal.down }, value: t.pal.up },
          tooltip: [
            { field: "agency", title: "Agency" },
            { field: "momentum", type: "quantitative", title: "On-demand hours vs 2024", format: "+.0%" },
          ],
        },
      },
      { mark: { type: "rule", color: t.muted }, encoding: { x: { datum: 0 } } },
      {
        transform: [{ filter: "datum.momentum >= 0" }],
        mark: { type: "text", align: "left", dx: 4, fontSize: 12, fontWeight: 600, color: t.fg },
        encoding: { text: { field: "momentum", type: "quantitative", format: "+.0%" }, x: { field: "momentum", type: "quantitative" } },
      },
      {
        transform: [{ filter: "datum.momentum < 0" }],
        mark: { type: "text", align: "right", dx: -4, fontSize: 12, fontWeight: 600, color: t.fg },
        encoding: { text: { field: "momentum", type: "quantitative", format: "+.0%" }, x: { field: "momentum", type: "quantitative" } },
      },
    ],
  };
}

// Year with its general-public share, e.g. "2024 · 20%" (in the axis label, where it stays legible).
const yearLabel = (r) => `${r.report_year} · ${share(r.general_public / (r.general_public + r.paratransit_and_sponsored))}`;
const shortName = (s) => String(s || "").replace(/ \([^)]*\)$/, "");

export default function Dashboard({ dashboard, givens }) {
  const t = useTheme();
  const narrow = useNarrow();
  const main = useQuery({ query: "ondemand_prospects", givens });
  const moneyQ = useQuery({ query: "ondemand_money", givens });
  const mix = useQuery({ query: "ondemand_mix_by_year", givens });
  const points = useQuery({ query: "ondemand_agency_points", givens });
  const largest = useQuery({ query: "ondemand_largest", givens });
  const all = [main, moneyQ, mix, points, largest];
  const error = all.map((q) => q.error).find(Boolean);
  const busy = main.loading || moneyQ.loading;
  const ranked = (main.rows[0] && main.rows[0].ranked) || [];
  const m = moneyQ.rows[0] || {};
  const stateName = givens && givens.STATE ? String(givens.STATE).replace(/'/g, "") : "";
  const title = stateName ? `Microtransit prospects in ${stateName}` : dashboard.title;
  const spendGrowth = m.spend_2022 ? m.spend_2024 / m.spend_2022 - 1 : null;
  const hoursGrowth = m.hours_2022 ? m.hours_2024 / m.hours_2022 - 1 : null;
  // Only meaningful with many agencies: in one state the top 15 can be nearly everyone, and cutters can push the
  // share past 100%.
  const topShare = m.spend_added > 0 && m.agencies > 30 ? m.top15_spend_added / m.spend_added : null;

  const mixRows = React.useMemo(() => mix.rows.flatMap((r) => [
    { year: yearLabel(r), kind: "General public (est.)", hours: r.general_public, order: 1 },
    { year: yearLabel(r), kind: "Paratransit + sponsored", hours: r.paratransit_and_sponsored, order: 2 },
  ]), [mix.rows]);

  const pointRows = React.useMemo(() => {
    const bigPara = points.rows.filter((r) => r.ada_share >= 0.95)
      .sort((a, b) => b.ondemand_hours_2024 - a.ondemand_hours_2024).slice(0, 2).map((r) => r.agency);
    return points.rows.map((r) => ({
      ...r,
      kind: r.hours_added > 500 ? "Adding" : r.hours_added < -500 ? "Cutting" : "No new service",
      labelled: r.added_rank <= 8,
      // One combined note on the largest paratransit agency (the two sit on the same spot).
      big_para: r.agency === bigPara[0],
      short: (narrow ? "Two largest" : bigPara.map(shortName).join(", ")) + ": 100% ADA",
    }));
  }, [points.rows, narrow]);
  const top10 = ranked.slice(0, 10);
  const mixChart = React.useMemo(() => mixSpec(t, narrow), [t, narrow]);
  const prospectChart = React.useMemo(() => prospectSpec(t, narrow), [t, narrow]);
  const momentumRows = React.useMemo(
    () => top10.filter((r) => r.momentum != null).map((r) => ({ agency: shortName(r.agency), momentum: r.momentum })),
    [top10]
  );
  const momentumChart = React.useMemo(() => momentumSpec(t, narrow, momentumRows.length), [t, narrow, momentumRows.length]);

  return (
    <div className="od">
      <style>{CSS}</style>
      <h1>{title}</h1>
      <Controls />
      {error && <div className="err">{String(error)}</div>}
      <div className={busy ? "loading" : ""}>
        <div className="od-kpis">
          <div className="od-kpi hot">
            <div className="v">{money(m.spend_2024)}</div>
            <div className="l">A year on general-public on-demand, 2024</div>
            <div className="s">{plusMoney(m.spend_added)} ({pct(spendGrowth)}) since 2022, agency operating spend (est.)</div>
          </div>
          <div className="od-kpi">
            <div className="v">{pct(hoursGrowth)}</div>
            <div className="l">General-public on-demand hours, 2022 to 2024</div>
            <div className="s">{compact(m.hours_2022)} → {compact(m.hours_2024)} vehicle hours a year</div>
          </div>
          <div className="od-kpi">
            <div className="v">{share(topShare)}</div>
            <div className="l">Of the added spend came from 15 agencies</div>
            <div className="s">{topShare == null ? "Shown for selections of more than 30 agencies" : `${money(m.top15_spend_added)} of ${money(m.spend_added)}`}</div>
          </div>
          <div className="od-kpi">
            <div className="v">
              {m.agencies_growing ?? "–"} <span style={{ fontWeight: 400, color: "var(--dash-muted)" }}>/</span>{" "}
              {m.agencies_cutting ?? "–"}
            </div>
            <div className="l">Agencies growing / cutting it</div>
            <div className="s">of {m.agencies ?? "–"} urban agencies reporting both years; re-flagged ADA trips not counted</div>
          </div>
        </div>

        <div className="od-grid wide-left">
          <Card
            title="The buyers are the agencies adding general-public service, not the biggest on-demand operators"
            sub="Each dot is an urban agency with 20k+ on-demand hours in 2024; size = its on-demand hours. Numbered: the eight that added the most new general-public hours."
          >
            <div className="od-vega"><VegaChart spec={prospectChart} data={pointRows} /></div>
          </Card>
          <Card
            title="Most on-demand service is still ADA paratransit; the general-public slice is the part growing"
            sub="Urban agencies, vehicle revenue hours a year; the general-public share is under each year."
          >
            <div className="od-vega"><VegaChart spec={mixChart} data={mixRows} /></div>
          </Card>
        </div>

        <div className="od-grid">
          <Card title="Most new general-public on-demand hours, 2022 to 2024" sub="Estimated; ADA paratransit and sponsored trips taken out; capped at each agency's total on-demand growth">
            <Bars
              rows={top10}
              value="hours_added"
              label="agency"
              right={(r) => plusCompact(r.hours_added) + " h"}
              note={(r) => plusMoney(r.spend_added) + " a year"}
            />
          </Card>
          <Card title="Check before calling: all on-demand hours since 2024 (incl. paratransit)" sub="Latest 12 monthly reports (Sep 2025 to Aug 2026) vs calendar 2024; the monthly file does not split out ADA paratransit">
            <div className="od-vega"><VegaChart spec={momentumChart} data={momentumRows} /></div>
          </Card>
        </div>

        <Card
          title="Not microtransit buyers: the largest on-demand operators run ADA paratransit"
          sub="Largest on-demand operators of 2024 and the share of their trips that are ADA paratransit. A ranking by all on-demand growth puts these on top."
        >
          <Bars
            rows={largest.rows}
            value="ondemand_hours"
            label="agency"
            right={(r) => compact(r.ondemand_hours) + " h"}
            note={(r) => share(r.ada_share) + " ADA"}
          />
        </Card>

        <Card title="Prospect list: who a microtransit vendor should call first" sub={`Top ${ranked.length} urban agencies by new general-public on-demand hours, 2022 to 2024. Hours re-flagged from ADA to general public are not counted as new${m.hours_reflagged > 0 ? ` (${compact(m.hours_reflagged)} hours at ${m.agencies_reflagged} agencies in this selection)` : ""}.`}>
          <div className="od-tablewrap">
            <table>
              <thead>
                <tr>
                  <th className="rank">#</th>
                  <th className="agency">Agency</th>
                  <th className="hide-sm">Hours 2022</th>
                  <th className="hide-sm">Hours 2024</th>
                  <th>New hours</th>
                  <th className="hide-sm wrap">All on-demand added</th>
                  <th className="hide-sm">Re-flagged</th>
                  <th className="hide-sm">Spend added</th>
                  <th className="hide-sm">ADA share</th>
                  <th className="wrap">All on-demand since 2024 (incl. paratransit)</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.agency}>
                    <td className="rank">{i + 1}</td>
                    <td className="agency">{r.agency}</td>
                    <td className="hide-sm">{compact(r.hours_2022)}</td>
                    <td className="hide-sm">{compact(r.hours_2024)}</td>
                    <td className={r.hours_added > 0 ? "up" : ""}>{plusCompact(r.hours_added)}</td>
                    <td className="hide-sm">{plusCompact(r.total_added)}</td>
                    <td className="hide-sm">{r.reflagged > 500 ? compact(r.reflagged) : "–"}</td>
                    <td className="hide-sm">{plusMoney(r.spend_added)}</td>
                    <td className="hide-sm">{share(r.ada_share)}</td>
                    <td style={r.momentum < -0.1 ? { color: "var(--dash-danger)", fontWeight: 600 } : undefined}>{pct(r.momentum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <p className="foot">
        Source: FTA National Transit Database annual data, report years 2022 to 2024 (Service and Metrics tables,
        demand-response mode), public domain. General public = trips that are neither ADA-related nor sponsored by a
        third party; each agency's hours and operating expense are split by that trip share, so hours and spend are
        estimates. Spend is what agencies pay to run the service (contractor fees included), not software revenue.
        Urban agencies that reported on-demand trips with an ADA breakdown in both 2022 and 2024. The NTD does not
        separate app-based microtransit from older general-public dial-a-ride. Some agencies mark every on-demand trip
        as ADA-related while running microtransit (Trinity Metro, Fort Worth), so they are missing here. Some re-flag
        trips between ADA and general public from year to year (Stark Area RTA, Canton: 93% ADA in 2022, 11% in 2024),
        so an agency's general-public hours added are capped at its total on-demand hours added and the excess is
        counted as already running in 2022. Cuts are not capped, so growth is a conservative figure. "All on-demand
        hours since 2024" uses the monthly file, which includes ADA paratransit; VIA (San Antonio) is missing most of
        July and August 2026.
      </p>
    </div>
  );
}
