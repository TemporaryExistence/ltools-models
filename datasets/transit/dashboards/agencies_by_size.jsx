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

// ---- Transit agencies by size ----

const share = (p) => (p == null || isNaN(p) ? "–" : Math.round(p * 100) + "%");
const count = (n) => (n == null || isNaN(n) ? "–" : Math.round(n).toLocaleString());
const big = (n) => {
  if (n == null || isNaN(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e8 ? 0 : 1) + "M";
  if (a >= 1e3) return Math.round(n / 1e3) + "k";
  return String(Math.round(n));
};
const one = (n) => (n == null || isNaN(n) ? "–" : n.toFixed(1));
const yearOf = (v) => (v instanceof Date ? v.getUTCFullYear() : Number(String(v).slice(0, 4)));
const clean = (s) => String(s || "").replace(/'/g, "").trim();
const NO_BASE = "6 No 2019 data";
// "1 Very large" -> "Very large (100M+)": the band with its 2019-trip range.
const RANGES = { "1": "100M+", "2": "20M–100M", "3": "5M–20M", "4": "1M–5M", "5": "under 1M" };
const bandName = (b) => String(b || "").replace(/^\d+ /, "");
const bandFull = (b) => `${bandName(b)} (${RANGES[String(b).slice(0, 1)] || ""})`;
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
// Trips and service hours, each as a share of its own 2019 level, by year.
function trendSpec(t, narrow) {
  const x = { field: "year", type: "quantitative", axis: { title: null, format: "d", values: narrow ? [2005, 2010, 2015, 2020, 2025] : [2005, 2007, 2009, 2011, 2013, 2015, 2017, 2019, 2021, 2023, 2025], labelAngle: 0 }, scale: { domain: [2003, narrow ? 2027.5 : 2026.5], nice: false } };
  const y = { field: "index", type: "quantitative", axis: { title: "Share of the 2019 level", format: ".0%", tickCount: 5 }, scale: { zero: false } };
  const color = {
    field: "series", type: "nominal",
    scale: { domain: ["Service hours", "Trips"], range: [t.pal.alt, t.pal.up] },
    legend: { orient: "top", title: null, direction: "horizontal", symbolType: "stroke", symbolStrokeWidth: 3 },
  };
  return {
    config: vegaConfig(t),
    height: narrow ? 240 : 300,
    layer: [
      { mark: { type: "rule", color: t.muted, strokeDash: [3, 3] }, encoding: { y: { datum: 1 } } },
      {
        mark: { type: "line", strokeWidth: 2.5, interpolate: "monotone", point: { size: 22, filled: true } },
        encoding: {
          x, y, color,
          tooltip: [
            { field: "year", title: "Year" },
            { field: "series", title: "Series" },
            { field: "raw", type: "quantitative", title: "Total", format: ",.0f" },
            { field: "index", type: "quantitative", title: "vs 2019", format: ".0%" },
          ],
        },
      },
      {
        transform: [{ filter: "datum.year == 2025" }],
        mark: { type: "text", align: "left", dx: 6, fontSize: 12, fontWeight: 700 },
        encoding: {
          x, color,
          y: { field: "index", type: "quantitative" },
                    text: { field: "index", type: "quantitative", format: ".0%" },
        },
      },
    ],
  };
}


const BAND_ORDER = (narrow) => ["1 Very large", "2 Large", "3 Medium", "4 Small", "5 Very small"].map((b) => (narrow ? bandName(b) : bandFull(b)));

// Dumbbell per band: average agency recovery, service restored vs not.
function restoreSpec(t, narrow) {
  const y = { field: "band", type: "nominal", sort: BAND_ORDER(narrow), axis: { title: null, labelLimit: narrow ? 130 : 220, labelFontSize: 12 } };
  const x = (field) => ({ field, type: "quantitative", scale: { domain: [narrow ? 0.5 : 0.6, narrow ? 1.25 : 1.15] }, axis: { title: "Average agency recovery (riders vs 2019)", format: ".0%", values: narrow ? [0.6, 0.8, 1, 1.2] : [0.6, 0.7, 0.8, 0.9, 1, 1.1] } });
  const tip = [
    { field: "band", title: "Size band" },
    { field: "restored", type: "quantitative", title: "Restored 2019 service", format: ".0%" },
    { field: "n_restored", type: "quantitative", title: "Agencies (restored)" },
    { field: "not_restored", type: "quantitative", title: "Did not restore", format: ".0%" },
    { field: "n_not", type: "quantitative", title: "Agencies (not restored)" },
  ];
  return {
    config: vegaConfig(t),
    height: narrow ? 230 : 250,
    layer: [
      { mark: { type: "rule", color: t.muted, strokeDash: [3, 3] }, encoding: { x: { datum: 1 } } },
      { transform: [{ filter: "datum.restored != null && datum.not_restored != null" }], mark: { type: "rule", color: t.border, strokeWidth: 4 }, encoding: { y, x: x("not_restored"), x2: { field: "restored" } } },
      { transform: [{ filter: "datum.not_restored != null" }], mark: { type: "circle", size: 140, color: t.pal.down }, encoding: { y, x: x("not_restored"), tooltip: tip } },
      { transform: [{ filter: "datum.restored != null" }], mark: { type: "circle", size: 140, color: t.pal.up }, encoding: { y, x: x("restored"), tooltip: tip } },
      {
        transform: [{ filter: "datum.not_restored != null" }],
        mark: { type: "text", align: "right", dx: -10, fontSize: 12, fontWeight: 700, color: t.pal.down },
        encoding: { y, x: x("not_restored"), text: { field: "not_restored", type: "quantitative", format: ".0%" } },
      },
      {
        transform: [{ filter: "datum.restored != null" }],
        mark: { type: "text", align: "left", dx: 10, fontSize: 12, fontWeight: 700, color: t.pal.up },
        encoding: { y, x: x("restored"), text: { field: "restored", type: "quantitative", format: ".0%" } },
      },
    ],
  };
}

// Riders vs service by band, grouped horizontal bars with labels.
function bandSpec(t, narrow) {
  const by = { field: "band", type: "nominal", sort: BAND_ORDER(narrow), axis: { title: null, labelLimit: narrow ? 110 : 200, labelFontSize: 12 } };
  const yo = { field: "measure", sort: ["Riders", "Service"] };
  return {
    config: vegaConfig(t),
    height: narrow ? 280 : 260,
    encoding: {
      color: {
        field: "measure", type: "nominal", sort: ["Riders", "Service"],
        scale: { domain: ["Riders", "Service"], range: [t.pal.up, t.pal.alt] },
        legend: { orient: "top", title: null, symbolType: "square", labelExpr: "datum.label == 'Riders' ? 'Riders vs 2019' : 'Service hours vs 2019'" },
      },
    },
    layer: [
      {
        mark: { type: "bar", cornerRadiusEnd: 3, height: { band: 0.85 } },
        encoding: {
          y: by, yOffset: yo,
          x: { field: "value", type: "quantitative", scale: { domain: [0, 1.2] }, axis: { title: "Latest 12 months as a share of 2019", format: ".0%", values: [0, 0.25, 0.5, 0.75, 1] } },
          tooltip: [
            { field: "band", title: "Size band" },
            { field: "measure", title: "Measure" },
            { field: "value", type: "quantitative", title: "vs 2019", format: ".0%" },
          ],
        },
      },
      { mark: { type: "rule", color: t.muted, strokeDash: [3, 3] }, encoding: { x: { datum: 1 }, color: null } },
      {
        mark: { type: "text", align: "left", dx: 4, fontSize: 11, fontWeight: 600, color: t.fg },
        encoding: { y: by, yOffset: yo, x: { field: "value", type: "quantitative" }, text: { field: "value", type: "quantitative", format: ".0%" }, color: null },
      },
    ],
  };
}

// Mode mix: 100% stacked bars per band, percent labels inside segments wide enough to hold them.
function mixSpec(t, narrow) {
  const domain = ["Bus", "Rail", "Ferry"];
  return {
    config: vegaConfig(t),
    height: narrow ? 230 : 240,
    transform: [
      { calculate: "indexof(['Bus','Rail','Ferry'], datum.mode)", as: "mo" },
      { stack: "share", groupby: ["band"], sort: [{ field: "mo" }], as: ["s0", "s1"] },
      { calculate: "(datum.s0 + datum.s1) / 2", as: "mid" },
    ],
    encoding: { y: { field: "band", type: "nominal", sort: BAND_ORDER(narrow), axis: { title: null, labelLimit: narrow ? 110 : 200, labelFontSize: 12 } } },
    layer: [
      {
        mark: { type: "bar", height: { band: 0.66 }, stroke: t.bg, strokeWidth: 1 },
        encoding: {
          x: { field: "s0", type: "quantitative", scale: { domain: [0, 1] }, axis: { title: "Share of the band's trips, latest 12 months", format: ".0%", values: [0, 0.25, 0.5, 0.75, 1] } },
          x2: { field: "s1" },
          color: { field: "mode", type: "nominal", scale: { domain, range: [t.pal.up, t.pal.violet, t.pal.teal] }, legend: { orient: "top", title: null, symbolType: "square" } },
          tooltip: [
            { field: "band", title: "Size band" },
            { field: "mode", title: "Mode" },
            { field: "share", type: "quantitative", title: "Share of trips", format: ".1%" },
            { field: "trips", type: "quantitative", title: "Trips", format: ",.0f" },
          ],
        },
      },
      {
        transform: [{ filter: "datum.share >= 0.07" }],
        mark: { type: "text", fontSize: 12, fontWeight: 700, color: "#ffffff" },
        encoding: { x: { field: "mid", type: "quantitative" }, text: { field: "share", type: "quantitative", format: ".0%" } },
      },
    ],
  };
}

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
    "Monthly ridership and service for every transit agency reporting to the Federal Transit Administration's National " +
    "Transit Database (NTD), with agency names and urbanized-area population from the NTD agency file.",
  liveLine: (r) =>
    `The table behind this page has ${abInt(r.table_rows)} rows covering ${abMonth(r.first_month)} to ` +
    `${abMonth(r.last_month)} and ${abInt(r.agency_ids)} agencies (counted live).`,
  sources: [
    {
      name: "Complete Monthly Ridership (with Adjustments and Estimates)",
      publisher: "Federal Transit Administration, National Transit Database (data.transportation.gov, dataset 8bui-9xvu)",
      url: "https://data.transportation.gov/d/8bui-9xvu",
      coverage: "January 2002 to August 2026, monthly. One row per agency, mode, type of service and month: trips, vehicle revenue hours and miles, peak vehicles.",
      rows: "372,801 (the same count the publisher's API returns)",
      refreshed: "Downloaded 6 October 2026. The publisher last updated the dataset on 1 October 2026; it adds a month roughly monthly.",
      licence: "Public domain, U.S. Government work (stated on the dataset page).",
    },
    {
      name: "2024 NTD Annual Data: Reporter Agency Information",
      publisher: "Federal Transit Administration, National Transit Database (data.transportation.gov, dataset ccvf-fykn)",
      url: "https://data.transportation.gov/d/ccvf-fykn",
      coverage: "One row per reporting agency, report year 2024. Used for brand names (GoRaleigh, GoTriangle), city, and 2020 Census urbanized-area population.",
      rows: "Joined onto the monthly rows; not a separate table here.",
      refreshed: "Downloaded 6 October 2026 (publisher last updated 7 July 2026).",
      licence: "Public domain, U.S. Government work (stated on the dataset page).",
    },
  ],
  checks:
    "On 7 October 2026 the copy behind this page was compared with the publisher's live API: total rows (372,801), " +
    "calendar 2019 trips (9,695,330,196), trips from September 2025 to August 2026 (8,006,939,304) and GoRaleigh's " +
    "June and July 2024 bus boardings (334,075 and 689,105) all match exactly, and the latest month is August 2026 in both.",
  definitions: [
    ["Trips", "Unlinked passenger trips: every boarding counts once, so a bus-to-train transfer is two trips."],
    ["Service", "Vehicle revenue hours: hours vehicles spend in passenger service."],
    ["Latest 12 months", "September 2025 to August 2026, the newest 12 months in the file."],
    ["2019", "Calendar 2019, the last full year before the pandemic, used as the baseline."],
    ["Recovery", "Trips in the latest 12 months divided by trips in 2019 (100% = back to 2019)."],
    ["Riders per service hour", "Trips divided by vehicle revenue hours, counting only rows that report hours."],
    ["Fixed route", "Every mode except demand response (dial-a-ride, paratransit, microtransit) and vanpool."],
  ],
  caveats: [
    "GoRaleigh's boardings doubled from June to July 2024 while service rose about 5%: a change in how boardings are counted (inferred; the city has not confirmed the cause). It lifts GoRaleigh, the Triangle and North Carolina. The NTD does not flag breaks like this, and other agencies may have them.",
    "Agencies that file late are understated in the latest 12 months (VIA San Antonio reported about a quarter of its usual demand-response hours for July and August 2026).",
    "GoCary (Cary, NC) stops appearing after 2011, so the Triangle is understated throughout.",
    "GoRaleigh moved its buses from directly operated to purchased transportation after 2019; read agency totals, not type-of-service rows.",
    "Urbanized-area population is the 2020 Census, so trips per resident overstate use in metros that have grown since.",
    "Demand response lumps ADA paratransit together with microtransit; the monthly file cannot separate them.",
    "2002 service hours are incomplete and 2026 is January to August only.",
  ],
};

export default function Dashboard({ dashboard, givens }) {
  const t0 = useTheme();
  const t = React.useMemo(() => ({
    ...t0,
    pal: {
      ...t0.pal,
      alt: t0.dark ? "#f0a030" : "#c46a00",
      violet: t0.dark ? "#9b78e0" : "#7446c4",
      teal: t0.dark ? "#1f9e8a" : "#0f8a78",
    },
  }), [t0]);
  const narrow = useNarrow();
  const kQ = useQuery({ query: "agencies_by_size", givens });
  const aboutQ = useQuery({ query: "size_about", givens });
  const restoreQ = useQuery({ query: "size_restore", givens });
  const bandsQ = useQuery({ query: "size_bands", givens });
  const fixedQ = useQuery({ query: "size_fixed_route", givens });
  const mixQ = useQuery({ query: "size_mode_mix", givens });
  const trendQ = useQuery({ query: "size_trend", givens });
  const bigQ = useQuery({ query: "size_largest", givens });
  const all = [kQ, restoreQ, bandsQ, fixedQ, mixQ, trendQ, bigQ];
  const error = all.map((q) => q.error).find(Boolean);
  const busy = all.some((q) => q.loading);
  const k = kQ.rows[0] || {};
  const st = clean(givens && givens.STATE);
  const place = st || "US";

  // Restoring service
  const restore = React.useMemo(() => restoreQ.rows.filter((r) => r.size_band !== NO_BASE).map((r) => ({
    band: narrow ? bandName(r.size_band) : bandFull(r.size_band),
    order: r.size_band,
    restored: r.agencies_restored > 0 ? r.recovery_if_restored : null,
    not_restored: r.agencies_not_restored > 0 ? r.recovery_if_not_restored : null,
    n_restored: r.agencies_restored,
    n_not: r.agencies_not_restored,
  })), [restoreQ.rows, narrow]);
  const nR = restore.reduce((s, r) => s + (r.n_restored || 0), 0);
  const nN = restore.reduce((s, r) => s + (r.n_not || 0), 0);
  const title = st ? `${dashboard.title} — ${st}` : dashboard.title;
  const restoreTitle = "Riders vs 2019, by whether 2019 service was restored";

  // Bands
  const bands = bandsQ.rows.filter((r) => r.size_band !== NO_BASE);
  const noBase = bandsQ.rows.find((r) => r.size_band === NO_BASE);
  const bandRows = React.useMemo(() => bands.flatMap((r) => [
    { band: narrow ? bandName(r.size_band) : bandFull(r.size_band), order: r.size_band, measure: "Riders", value: r.recovery_vs_2019 },
    { band: narrow ? bandName(r.size_band) : bandFull(r.size_band), order: r.size_band, measure: "Service", value: r.service_vs_2019 },
  ]).filter((r) => r.value != null), [bandsQ.rows, narrow]);
  const bandTitle = "Riders and service vs 2019 by size band";
  const fixedBy = Object.fromEntries(fixedQ.rows.map((r) => [r.size_band, r]));

  // Mode mix
  const mix = React.useMemo(() => mixQ.rows.filter((r) => r.size_band !== NO_BASE).map((r) => ({
    band: narrow ? bandName(r.size_band) : bandFull(r.size_band),
    order: r.size_band,
    mode: r.mode_group,
    share: r.share_of_band,
    trips: r.trips_latest_12m,
  })), [mixQ.rows, narrow]);
  const mixTitle = "Trips by mode and size band";

  // Trend, indexed to 2019
  const trend = React.useMemo(() => {
    const rows = trendQ.rows.map((r) => ({ ...r, year: yearOf(r.report_year) }));
    const base = rows.find((r) => r.year === 2019);
    if (!base) return [];
    return rows.flatMap((r) => [
      { year: r.year, series: "Trips", raw: r.trips_total, index: base.trips_total ? r.trips_total / base.trips_total : null },
      { year: r.year, series: "Service hours", raw: r.revenue_hours, index: base.revenue_hours ? r.revenue_hours / base.revenue_hours : null },
    ]).filter((r) => r.index != null);
  }, [trendQ.rows]);
  const trendTitle = "Trips and service hours vs 2019, by year";

  const tphTitle = "Riders per service hour by size band";
  const restoreChart = React.useMemo(() => restoreSpec(t, narrow), [t, narrow]);
  const bandChart = React.useMemo(() => bandSpec(t, narrow), [t, narrow]);
  const mixChart = React.useMemo(() => mixSpec(t, narrow), [t, narrow]);
  const trendChart = React.useMemo(() => trendSpec(t, narrow), [t, narrow]);

  return (
    <div className="od">
      <style>{CSS + CSS_ABOUT}</style>
      <h1>{title}</h1>
      <HeadCaveat items={["Correlation, not cause", "Agency averages; agencies above 2x of 2019 left out", "Does not account for fare changes", "NC includes GoRaleigh's July 2024 counting change"]} />
      <Controls />
      {error && <div className="err">{String(error)}</div>}
      <div className={busy ? "loading" : ""}>
        <div className="od-kpis">
          <div className="od-kpi hot">
            <div className="v">{share(k.recovery_vs_2019)}</div>
            <div className="l">Of 2019 riders</div>
            <div className="s">{big(k.trips_latest_12m)} trips in the latest 12 months vs {big(k.trips_2019)} in 2019</div>
          </div>
          <div className="od-kpi">
            <div className="v">{share(k.service_vs_2019)}</div>
            <div className="l">Of 2019 service running</div>
            <div className="s">Vehicle revenue hours, latest 12 months vs 2019</div>
          </div>
          <div className="od-kpi">
            <div className="v">{pct(k.yoy_change)}</div>
            <div className="l">Trips vs the year before</div>
            <div className="s">Sep 2025 to Aug 2026 vs the 12 months before</div>
          </div>
          <div className="od-kpi">
            <div className="v">{count(k.agencies)}</div>
            <div className="l">Agencies</div>
            <div className="s">{one(k.trips_per_hour_12m)} riders per service hour across them</div>
          </div>
        </div>

        <Card
          title={restoreTitle}
          sub={`Average recovery of agencies running at least their 2019 service hours (blue, ${count(nR)} agencies) and of those running less (red, ${count(nN)}). Agencies above 2x of 2019 left out as reporting outliers. Correlation, not proof: agencies that restored service may also have had stronger demand.`}
        >
          <div className="od-key">
            <span><i style={{ borderColor: t.pal.up }} />Restored 2019 service</span>
            <span><i style={{ borderColor: t.pal.down }} />Did not</span>
          </div>
          <div className="od-vega">{restore.length > 0 && <VegaChart spec={restoreChart} data={restore} />}</div>
        </Card>

        <div className="od-grid">
          <Card title={bandTitle} sub="Each band's latest 12 months as a share of 2019: riders (trips) and service (vehicle revenue hours). Bands by agency's total trips in 2019.">
            <div className="od-vega">{bandRows.length > 0 && <VegaChart spec={bandChart} data={bandRows} />}</div>
          </Card>
          <Card title={mixTitle} sub="Each band's trips in the latest 12 months by bus, rail and ferry. Segments under 7% are unlabelled; hover for the figure.">
            <div className="od-vega">{mix.length > 0 && <VegaChart spec={mixChart} data={mix} />}</div>
          </Card>
        </div>

        <div className="od-grid wide-left">
          <Card title={trendTitle} sub={`${place === "US" ? "All US agencies" : place}${clean(givens && givens.SIZE_BAND) ? ", " + lower(bandName(clean(givens.SIZE_BAND))) + " agencies" : ""}, 2003 to 2025, each line as a share of its own 2019 level.`}>
            <div className="od-vega">{trend.length > 0 && <VegaChart spec={trendChart} data={trend} />}</div>
          </Card>
          <Card title={tphTitle} sub="Fixed-route trips per vehicle revenue hour (no dial-a-ride or vanpool), latest 12 months, with 2019 for comparison.">
            <Bars
              rows={bands.map((r) => ({ ...r, name: bandFull(r.size_band), tph: fixedBy[r.size_band] ? fixedBy[r.size_band].trips_per_hour_12m : null, tph19: fixedBy[r.size_band] ? fixedBy[r.size_band].trips_per_hour_2019 : null }))}
              value="tph"
              label="name"
              right={(r) => one(r.tph) + " an hour"}
              note={(r) => one(r.tph19) + " in 2019"}
            />
          </Card>
        </div>

        <Card title="Largest agencies" sub="The largest agencies in the selection by trips in 2019.">
          <div className="od-tablewrap">
            <table>
              <thead>
                <tr>
                  <th className="rank">#</th>
                  <th className="agency">Agency</th>
                  <th className="hide-sm">Trips, 2019</th>
                  <th>Trips, latest 12 months</th>
                  <th>Riders vs 2019</th>
                  <th className="hide-sm">Service vs 2019</th>
                  <th className="hide-sm">vs year before</th>
                  <th className="hide-sm">Riders per hour</th>
                </tr>
              </thead>
              <tbody>
                {bigQ.rows.map((r, i) => (
                  <tr key={r.agency_name + r.city + r.state}>
                    <td className="rank">{i + 1}</td>
                    <td className="agency">{r.agency_name.trim()}<span style={{ color: "var(--dash-muted)" }}>, {r.city} {r.state}</span></td>
                    <td className="hide-sm">{big(r.trips_2019)}</td>
                    <td>{big(r.trips_latest_12m)}</td>
                    <td className={r.recovery_vs_2019 >= 1 ? "up" : ""}>{share(r.recovery_vs_2019)}</td>
                    <td className="hide-sm">{share(r.service_vs_2019)}</td>
                    <td className="hide-sm">{pct(r.yoy_change)}</td>
                    <td className="hide-sm">{one(r.trips_per_hour_12m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <AboutData about={ABOUT} live={aboutQ.rows[0]} />
      <p className="foot">
        Source: FTA National Transit Database, Complete Monthly Ridership (with Adjustments and Estimates), public domain.
        Latest 12 months = September 2025 to August 2026. Size bands by each agency's total trips in 2019: very large
        100M+, large 20M to 100M, medium 5M to 20M, small 1M to 5M, very small under 1M.
        {noBase ? ` ${count(noBase.agencies)} agencies with no 2019 trips (${big(noBase.trips_latest_12m)} trips in the latest 12 months) have no baseline and are left out of the band charts; they are in the totals above.` : ""}
        {" "}The trend starts in 2003 (2002 service hours are incomplete) and stops at 2025 (2026 is a partial year).
      </p>
    </div>
  );
}
const US_FEATURES = [];
const ABBR_TO_FIPS = {};
