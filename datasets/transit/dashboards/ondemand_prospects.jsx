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

// ---- Conclusion charts, caveat chips and "About this data" (added 2026-10-07). The same block sits in every
// libraries and transit dashboard: a component can import only React and @malloyyo/dashboard, so it is repeated. ----

const CSS_ABOUT = `
.od-concl { margin: 16px 0 26px; }
.od-concl > h2 { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--dash-accent); margin: 0 0 10px; }
.od-concl-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; }
.od-concl-card { border: 1px solid var(--dash-border); border-radius: 12px; padding: 14px 16px 12px; min-width: 0; }
.od-concl-card.wide { grid-column: 1 / -1; }
.od-concl-card h3 { font-size: 15px; margin: 0 0 2px; line-height: 1.3; }
.od-concl-card .stat { font-size: 13px; color: var(--dash-muted); margin: 0 0 8px; font-variant-numeric: tabular-nums; }
.od-chips { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0; padding: 0; }
.od-chips li { font-size: 12px; line-height: 1.3; color: var(--dash-muted); border: 1px solid var(--dash-border); border-radius: 999px; padding: 3px 9px; }
.od-chips li::before { content: "⚠ "; color: var(--dash-muted); }
.od-headchips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin: -6px 0 16px; }
.od-headchips .od-chips { margin: 0; }
.od-headchips .od-jump { font-size: 12px; }
.od-findnote { font-size: 12px; color: var(--dash-muted); margin: 8px 0 0; }
.od a.od-jump { color: var(--dash-accent); cursor: pointer; text-decoration: underline; white-space: nowrap; }
.od-about h3 { font-size: 14px; margin: 18px 0 6px; }
.od-about .od-src { border-top: 1px solid var(--dash-border); padding-top: 10px; margin-top: 12px; }
.od-about .od-src h3 { margin-top: 0; }
.od-about dl { display: grid; grid-template-columns: 9.5em minmax(0, 1fr); gap: 5px 16px; font-size: 13px; margin: 0; line-height: 1.45; }
.od-about dt { color: var(--dash-muted); font-weight: 600; }
.od-about dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.od-about a { color: var(--dash-accent); }
.od-about p.txt { font-size: 13px; line-height: 1.5; margin: 0; max-width: 95ch; }
.od-about ul { font-size: 13px; line-height: 1.5; margin: 0; padding-left: 18px; max-width: 95ch; }
.od-about li + li { margin-top: 4px; }
@media (max-width: 560px) {
  .od-concl-grid { grid-template-columns: minmax(0, 1fr); }
  .od-about dl { grid-template-columns: minmax(0, 1fr); gap: 2px 0; }
  .od-about dd { margin-bottom: 6px; }
}
`;

const abPct = (p) => (p == null || isNaN(p) ? "–" : Math.round(p * 100) + "%");
const abPct1 = (p) => (p == null || isNaN(p) ? "–" : (Math.round(p * 1000) / 10).toFixed(1) + "%");
const abInt = (n) => (n == null || isNaN(n) ? "–" : Math.round(Number(n)).toLocaleString("en-US"));
const abBig = (n) => {
  if (n == null || isNaN(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1) + " billion";
  if (a >= 1e6) return (n / 1e6).toFixed(1) + " million";
  return abInt(n);
};
const abMoney = (n) => {
  if (n == null || isNaN(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (a >= 1e8) return "$" + Math.round(n / 1e6) + "M";
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (a >= 1000) return "$" + Math.round(n).toLocaleString("en-US");
  return "$" + Number(n).toFixed(2);
};
const abMonth = (v) => {
  if (v == null) return "–";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};
const abOne = (x) => (Array.isArray(x) ? x[0] : x) || null;
const abOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Scrolls to the About panel (an in-page link; the dashboard frame may not follow #anchors).
function AboutLink({ children }) {
  const go = (e) => {
    e.preventDefault();
    const el = document.getElementById("about-this-data");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return <a className="od-jump" href="#about-this-data" onClick={go}>{children || "About this data"}</a>;
}

// Short caveat labels shown as chips.
function Chips({ items }) {
  const shown = (items || []).filter(Boolean);
  if (!shown.length) return null;
  return (
    <ul className="od-chips" aria-label="Caveats">
      {shown.map((c) => <li key={c}>{c}</li>)}
    </ul>
  );
}

// The caveats that apply to a dashboard's headline, as chips right under it.
function HeadCaveat({ items }) {
  return (
    <div className="od-headchips"><Chips items={items} /><AboutLink>Sources and definitions</AboutLink></div>
  );
}

// One conclusion as a chart: a short label, an optional one-line figure, the chart, and its caveat chips.
function ConclCard({ title, stat, spec, data, chips, wide }) {
  return (
    <section className={"od-concl-card" + (wide ? " wide" : "")}>
      <h3>{title}</h3>
      {stat && <p className="stat">{stat}</p>}
      {spec && data && data.length > 0 ? <div className="od-vega"><VegaChart spec={spec} data={data} /></div> : <p className="stat">Loading…</p>}
      <Chips items={chips} />
    </section>
  );
}

// The conclusion charts at the top of a dataset's main dashboard.
function Conclusions({ children }) {
  return (
    <section className="od-concl" aria-label="What the data shows">
      <h2>What the data shows</h2>
      <div className="od-concl-grid">{children}</div>
      <p className="od-findnote">Computed live from the data behind this page. Sources and checks: <AboutLink />.</p>
    </section>
  );
}

// A neutral bar colour for the marks that are context, not the point.
const abNeutral = (t) => (t.dark ? "#5b616b" : "#b4b8bf");

// Source, coverage, rows, refresh date, licence, definitions and caveats. `live` is the page's *_about query row.
function AboutData({ about, live }) {
  return (
    <section className="od-card od-about" id="about-this-data">
      <h2>About this data</h2>
      <p className="sub">{about.summary}{live && about.liveLine ? " " + about.liveLine(live) : ""}</p>
      {about.sources.map((s) => (
        <div className="od-src" key={s.name}>
          <h3>{s.name}</h3>
          <dl>
            <dt>Publisher</dt><dd>{s.publisher}</dd>
            <dt>Link</dt><dd><a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a></dd>
            <dt>Coverage</dt><dd>{s.coverage}</dd>
            <dt>Rows</dt><dd>{s.rows}</dd>
            <dt>Last refreshed</dt><dd>{s.refreshed}</dd>
            <dt>Licence</dt><dd>{s.licence}</dd>
          </dl>
        </div>
      ))}
      <h3>How the numbers were checked</h3>
      <p className="txt">{about.checks}</p>
      <h3>Definitions</h3>
      <dl>
        {about.definitions.map(([term, text]) => (
          <React.Fragment key={term}><dt>{term}</dt><dd>{text}</dd></React.Fragment>
        ))}
      </dl>
      <h3>Caveats</h3>
      <ul>
        {about.caveats.map((c, i) => <li key={i}>{c}</li>)}
      </ul>
    </section>
  );
}

// Source facts for this page, checked against the publisher on 7 October 2026
// (/home/andrew/Project/work/units/ltools/outputs/2026-10-07_libraries-transit-source-check.md).
const ABOUT = {
  summary:
    "On-demand (demand-response) service by agency, type of service and report year, 2022 to 2024, from the National " +
    "Transit Database annual tables, split into ADA paratransit and general-public on-demand service.",
  liveLine: (r) =>
    `The table behind this page has ${abInt(r.table_rows)} rows, report years ${r.first_year} to ${r.last_year}, ` +
    `${abInt(r.agency_ids)} agencies (counted live).`,
  sources: [
    {
      name: "2022 - 2024 NTD Annual Data: Service (by Mode and Time Period)",
      publisher: "Federal Transit Administration, National Transit Database (data.transportation.gov, dataset wwdp-t4re)",
      url: "https://data.transportation.gov/d/wwdp-t4re",
      coverage: "Demand-response rows, annual totals, report years 2022 to 2024: trips, ADA-related trips, sponsored trips, revenue hours and miles.",
      rows: "6,108 (2,010 in 2022, 2,022 in 2023, 2,076 in 2024; the same counts the publisher's API returns)",
      refreshed: "Downloaded 6 October 2026 (publisher last updated 7 July 2026).",
      licence: "Public domain, U.S. Government work (stated on the dataset page).",
    },
    {
      name: "2022 - 2024 NTD Annual Data: Metrics",
      publisher: "Federal Transit Administration, National Transit Database (dataset ekg5-frzt)",
      url: "https://data.transportation.gov/d/ekg5-frzt",
      coverage: "Total operating expenses for each agency's demand-response service, 2022 to 2024.",
      rows: "Joined onto the service rows.",
      refreshed: "Downloaded 6 October 2026 (publisher last updated 7 July 2026).",
      licence: "Public domain, U.S. Government work (stated on the dataset page).",
    },
    {
      name: "2024 NTD Demand Response Geographic Area Coverage (Service Schedules; Passenger Eligibility and Fares)",
      publisher: "Federal Transit Administration, National Transit Database (datasets uk25-sge7 and i3pw-uwab)",
      url: "https://data.transportation.gov/d/uk25-sge7",
      coverage: "2024 only: whether each service is ADA-only or open to the general public, and whether riders must be eligible (i3pw-uwab: https://data.transportation.gov/d/i3pw-uwab).",
      rows: "Joined onto the service rows.",
      refreshed: "Downloaded 6 October 2026 (publisher last updated 3 November 2025 and 30 September 2025).",
      licence: "Public domain, U.S. Government work (stated on each dataset page).",
    },
    {
      name: "Complete Monthly Ridership (with Adjustments and Estimates)",
      publisher: "Federal Transit Administration, National Transit Database (dataset 8bui-9xvu)",
      url: "https://data.transportation.gov/d/8bui-9xvu",
      coverage: "Used only for each agency's on-demand hours in the latest 12 months (September 2025 to August 2026).",
      rows: "372,801 monthly rows (matches the publisher's API).",
      refreshed: "Downloaded 6 October 2026 (publisher last updated 1 October 2026).",
      licence: "Public domain, U.S. Government work.",
    },
  ],
  checks:
    "On 7 October 2026 the copy behind this page was compared with the publisher's live API: rows per report year " +
    "(2,010, 2,022, 2,076) and demand-response trips per year (113,022,304; 130,039,169; 139,745,774) match exactly.",
  definitions: [
    ["On-demand", "The NTD mode 'demand response': dial-a-ride, ADA paratransit and microtransit."],
    ["General public", "Trips that are neither ADA-related nor paid for by a third party (sponsored)."],
    ["ADA trips", "Trips the agency reports as ADA complementary paratransit."],
    ["Spend", "Total operating expenses for the service, contractor fees included. Not software revenue."],
    ["Hours", "Vehicle revenue hours. General-public hours and spend are each agency's totals split by its general-public trip share."],
  ],
  caveats: [
    "The NTD does not separate app-based microtransit from older general-public dial-a-ride, so 'general public' includes both.",
    "General-public hours and spend are estimates (split by trip share), not reported figures.",
    "Some agencies mark every on-demand trip as ADA-related while running microtransit (Trinity Metro, Fort Worth), so they are missing.",
    "Some agencies re-flag trips between ADA and general public from year to year (Stark Area RTA: 93% ADA in 2022, 11% in 2024); growth is capped at each agency's total on-demand growth, so it is a conservative figure.",
    "The 'since 2024' check uses the monthly file, which includes ADA paratransit; VIA (San Antonio) is missing most of July and August 2026.",
  ],
};

export default function Dashboard({ dashboard, givens }) {
  const t = useTheme();
  const narrow = useNarrow();
  const main = useQuery({ query: "ondemand_prospects", givens });
  const aboutQ = useQuery({ query: "ondemand_about", givens });
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
      <style>{CSS + CSS_ABOUT}</style>
      <h1>{title}</h1>
      <HeadCaveat items={["Estimates: hours and spend split by trip share", "Microtransit and dial-a-ride not separable in NTD", "Spend = operating cost, not software revenue", "Report years 2022 to 2024"]} />
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
      <AboutData about={ABOUT} live={aboutQ.rows[0]} />
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
