import React from "react";
import { Controls, VegaChart, useQuery } from "@malloyyo/dashboard";

// Self-contained on purpose: a dashboard component can import only React and @malloyyo/dashboard.

// ---- Shared chart helpers (the same block sits in each libraries / profit dashboard; a component can import only
// React and @malloyyo/dashboard, so it is repeated rather than shared). ----

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
  border-bottom: 1px solid var(--dash-border); white-space: nowrap; }
.od td { text-align: right; padding: 9px 10px; border-bottom: 1px solid var(--dash-border); white-space: nowrap; }
.od th:first-child, .od td:first-child { padding-left: 0; }
.od th.agency, .od td.agency { text-align: left; white-space: normal; min-width: 0; }
.od td.rank { color: var(--dash-muted); width: 1%; padding-right: 4px; }
.od th.rank { width: 1%; }
.od td.up { color: var(--dash-accent); font-weight: 600; }
.od .foot { font-size: 12px; color: var(--dash-muted); line-height: 1.5; margin-top: 22px; max-width: 80ch; }
.od .err { color: var(--dash-danger); font-size: 13px; white-space: pre-wrap; }
.od .loading { opacity: .45; transition: opacity .15s; }
.od-vega svg { display: block; max-width: 100%; }
.od-mapcard .od-vega { max-width: 860px; margin: 0 auto; }
.od-hdlist .od-bar { background: #7446c4; }
.od-sclist .od-bar { background: #c46a00; }
.od-hdnote { margin: 4px 0 0; }
@media (prefers-color-scheme: dark) {
  .od-hdlist .od-bar { background: #b192ee; }
  .od-sclist .od-bar { background: #f0a030; }
}
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

// ---- Library dashboard helpers (shared by the libraries dashboards; repeated per file for the same reason) ----

const CSS2 = `
.od .lede { font-size: 15px; color: var(--dash-muted); margin: -8px 0 6px; max-width: 80ch; line-height: 1.45; }
.od-kpis.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.od-toggle { display: inline-flex; border: 1px solid var(--dash-border); border-radius: 8px; overflow: hidden; margin: 0 0 12px; }
.od-toggle button { font: inherit; font-size: 13px; padding: 6px 12px; border: 0; background: transparent; color: var(--dash-muted); cursor: pointer; }
.od-toggle button + button { border-left: 1px solid var(--dash-border); }
.od-toggle button.on { background: var(--dash-accent); color: #fff; font-weight: 600; }
.od td.neg { color: var(--dash-danger); font-weight: 600; }
.od td.muted, .od span.muted { color: var(--dash-muted); }
.od tr.callout td { font-weight: 700; }
.od-maps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 24px; }
.od-maps.stack { grid-template-columns: minmax(0, 1fr); max-width: 900px; margin: 0 auto; }
.od-maps .pt { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
.od details { margin-top: 16px; }
.od summary { cursor: pointer; font-size: 14px; font-weight: 600; }
.od-legend { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12px; color: var(--dash-muted); margin: 8px 0 0; }
.od-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -2px; margin-right: 6px; }
@media (max-width: 900px) {
  .od-maps { grid-template-columns: minmax(0, 1fr); }
  .od-kpis.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .od-kpis.three { grid-template-columns: minmax(0, 1fr); }
  .od .lede { font-size: 14px; }
}
`;

// Extra hues on top of PALETTE: an orange for the call-out, greys for context marks.
const EXTRA = {
  light: { alt: "#c46a00", quiet: "#b8bcc4", quietLine: "#8a8f98", ring: "#171717", empty: "#e3e4e8" },
  dark: { alt: "#f0a030", quiet: "#5b5f66", quietLine: "#9ca3af", ring: "#ededed", empty: "#2b2d31" },
};
function useT() {
  const t0 = useTheme();
  return React.useMemo(() => ({ ...t0, pal: { ...t0.pal, ...EXTRA[t0.dark ? "dark" : "light"] } }), [t0]);
}

const num = (v) => (v == null || v === "" ? null : Number(v));
const money = (n) => (n == null || isNaN(n) ? "–" : "$" + compact(n));
const dollars = (n) => (n == null || isNaN(n) ? "–" : "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const dollars0 = (n) => (n == null || isNaN(n) ? "–" : "$" + Math.round(n).toLocaleString());
const share = (p) => (p == null || isNaN(p) ? "–" : Math.round(p * 100) + "%");
const pct1 = (p) => (p == null || isNaN(p) ? "–" : (p * 100).toFixed(1) + "%");
const count = (n) => (n == null || isNaN(n) ? "–" : Math.round(Number(n)).toLocaleString());
const dec1 = (n) => (n == null || isNaN(n) ? "–" : Number(n).toFixed(1));
const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
// The survey reports most names in capitals; show them in title case.
const titleCase = (s) =>
  s && s === s.toUpperCase()
    ? s.toLowerCase().replace(/(^|[\s\-/(.])([a-z])/g, (m, a, b) => a + b.toUpperCase())
    : s;

const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  AS: "American Samoa", GU: "Guam", MP: "Northern Mariana Islands", PR: "Puerto Rico", VI: "US Virgin Islands",
};
// The one state every row belongs to, or null when the view spans several (or none).
function onlyState(rows) {
  const s = new Set(rows.map((r) => r.state).filter(Boolean));
  return s.size === 1 ? [...s][0] : null;
}
const stateName = (abbr) => (abbr ? STATE_NAMES[abbr] || abbr : "the US");

function Toggle({ options, value, onChange }) {
  return (
    <div className="od-toggle" role="group">
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? "on" : ""} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

// Area-weighted centre of a shape's largest polygon (where its label goes).
function ringCentre(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let k = 0; k + 1 < ring.length; k++) {
    const [x0, y0] = ring[k], [x1, y1] = ring[k + 1];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  return a ? { area: Math.abs(a / 2), x: cx / (3 * a), y: cy / (3 * a) } : { area: 0, x: ring[0][0], y: ring[0][1] };
}
function geometryCentre(geom) {
  let best = null;
  for (const poly of geom.coordinates) {
    const c = ringCentre(poly[0]);
    if (!best || c.area > best.area) best = c;
  }
  return best;
}
// A two-series trend: the picked area (accent, solid) against a comparison (grey, dashed). `rows` are long-form
// { fiscal_year, series, value }.
function trendSpec(t, narrow, { title, format, domain, series, years }) {
  const xs = { domain: years || ["2018", "2019", "2020", "2021", "2022", "2023", "2024"] };
  return {
    config: vegaConfig(t),
    height: narrow ? 200 : 230,
    layer: [
      {
        data: { values: [{ a: "2020", b: "2021" }] },
        mark: { type: "rect", color: t.muted, opacity: t.dark ? 0.12 : 0.08 },
        encoding: { x: { field: "a", type: "ordinal", scale: xs }, x2: { field: "b" } },
      },
      {
        encoding: {
          x: { field: "fy", type: "ordinal", scale: xs, axis: { title: null, labelAngle: 0, labelExpr: "'FY' + slice(datum.label, 2)" } },
          y: { field: "value", type: "quantitative", axis: { title, format, tickCount: 5 }, scale: { zero: true, ...(domain ? { domain } : {}) } },
          color: { field: "series", type: "nominal", scale: { domain: series, range: [t.pal.up, t.pal.quietLine] }, legend: series.length > 1 ? { orient: "top", title: null } : null },
          strokeDash: { field: "series", type: "nominal", scale: { domain: series, range: [[1, 0], [5, 4]] }, legend: null },
        },
        layer: [
          { mark: { type: "line", strokeWidth: 2.5, interpolate: "monotone" } },
          {
            mark: { type: "point", filled: true, size: 40, stroke: t.bg, strokeWidth: 1 },
            encoding: {
              tooltip: [
                { field: "series", title: "Where" },
                { field: "fy", title: "Fiscal year" },
                { field: "value", type: "quantitative", title, format },
              ],
            },
          },
        ],
      },
    ],
  };
}

// ---- Library systems by size ----

// Size bands, largest first. Codes are the first character of the model's size_band (band 6 "Not comparable" and
// "Unknown" are left out of the charts, as the model's playbook view does).
const BANDS = [
  { code: "1", name: "Very large (500k+)", short: "500k+" },
  { code: "2", name: "Large (100k–500k)", short: "100k–500k" },
  { code: "3", name: "Medium (25k–100k)", short: "25k–100k" },
  { code: "4", name: "Small (5k–25k)", short: "5k–25k" },
  { code: "5", name: "Very small (under 5k)", short: "Under 5k" },
];
const BAND_BY_CODE = Object.fromEntries(BANDS.map((b) => [b.code, b]));
const bandOf = (sizeBand) => BAND_BY_CODE[String(sizeBand || "").slice(0, 1)];
const bandColor = (t) => ({ domain: BANDS.map((b) => b.name), range: t.pal.bands });

// Dumbbell: each band's visits per person in FY2019 (hollow) and FY2024 (filled).
function dumbbellSpec(t, narrow, max) {
  const y = { field: "bandName", type: "nominal", sort: BANDS.map((b) => b.name), axis: { title: null, labelFontSize: 13, labelColor: t.fg, labelLimit: narrow ? 110 : 200, labelExpr: narrow ? "split(datum.label, ' (')[0]" : "datum.label" } };
  const x = (field) => ({ field, type: "quantitative", scale: { zero: true, domain: [0, max * (narrow ? 1.6 : 1.3)], nice: false }, axis: { title: "Visits per person served", format: ".1f", tickCount: 6 } });
  const tooltip = [
    { field: "bandName", title: "Size (people served)" },
    { field: "v19", type: "quantitative", title: "FY2019", format: ".2f" },
    { field: "v24", type: "quantitative", title: "FY2024", format: ".2f" },
    { field: "change", type: "quantitative", title: "Change", format: "+.0%" },
    { field: "systems", type: "quantitative", title: "Systems, FY2024", format: "," },
  ];
  return {
    config: vegaConfig(t),
    height: { step: narrow ? 44 : 50 },
    layer: [
      { mark: { type: "rule", color: t.pal.quietLine, strokeWidth: 3, opacity: 0.6 }, encoding: { y, x: x("v24"), x2: { field: "v19" } } },
      { mark: { type: "circle", size: 190, color: t.bg, stroke: t.pal.quietLine, strokeWidth: 2, opacity: 1 }, encoding: { y, x: x("v19"), tooltip } },
      { mark: { type: "circle", size: 210, opacity: 1 }, encoding: { y, x: x("v24"), color: { field: "bandName", type: "nominal", scale: bandColor(t), legend: null }, tooltip } },
      { mark: { type: "text", align: "right", dx: -13, fontSize: 12, fontWeight: 700, color: t.fg }, encoding: { y, x: x("v24"), text: { field: "v24", type: "quantitative", format: ".1f" } } },
      { mark: { type: "text", align: "left", dx: 13, fontSize: 12, color: t.muted }, encoding: { y, x: x("v19"), text: { field: "changeText" } } },
    ],
  };
}

// Horizontal bars by band with value labels (one measure).
function bandBarSpec(t, narrow, { field, title, format, labelFormat }) {
  const y = { field: "bandShort", type: "nominal", sort: BANDS.map((b) => b.short), axis: { title: null, labelFontSize: 12, labelColor: t.fg } };
  return {
    config: vegaConfig(t),
    height: { step: narrow ? 34 : 38 },
    layer: [
      {
        mark: { type: "bar", cornerRadiusEnd: 4, height: { band: 0.66 } },
        encoding: {
          y,
          x: { field, type: "quantitative", axis: { title, format, tickCount: 4 }, scale: { zero: true } },
          color: { field: "bandName", type: "nominal", scale: bandColor(t), legend: null },
          tooltip: [
            { field: "bandName", title: "Size (people served)" },
            { field, type: "quantitative", title, format: labelFormat },
            { field: "systems", type: "quantitative", title: "Systems", format: "," },
          ],
        },
      },
      { mark: { type: "text", align: "left", dx: 5, fontSize: 12, fontWeight: 700, color: t.fg }, encoding: { y, x: { field, type: "quantitative" }, text: { field, type: "quantitative", format: labelFormat } } },
    ],
  };
}

// Box plot from pre-computed percentiles (the raw systems would exceed the runtime's row cap).
function boxSpec(t, narrow, { prefix, title, format, max }) {
  const x = { field: "bandShort", type: "nominal", sort: BANDS.map((b) => b.short), axis: { title: "People served", labelAngle: narrow ? -35 : 0, labelAlign: narrow ? "right" : "center", labelLimit: 90 } };
  const y = (f) => ({ field: f, type: "quantitative", scale: { domain: [0, max], clamp: true, nice: false }, axis: { title, format, tickCount: 5 } });
  const tooltip = [
    { field: "bandName", title: "Size" },
    { field: "systems", type: "quantitative", title: "Systems", format: "," },
    { field: prefix + "10", type: "quantitative", title: "10th percentile", format },
    { field: prefix + "25", type: "quantitative", title: "25th percentile", format },
    { field: prefix + "50", type: "quantitative", title: "Typical (median)", format },
    { field: prefix + "75", type: "quantitative", title: "75th percentile", format },
    { field: prefix + "90", type: "quantitative", title: "90th percentile", format },
  ];
  return {
    config: vegaConfig(t),
    height: narrow ? 230 : 260,
    encoding: { x },
    layer: [
      { mark: { type: "rule", color: t.muted, strokeWidth: 1.5 }, encoding: { y: y(prefix + "10"), y2: { field: prefix + "90" }, tooltip } },
      { mark: { type: "bar", width: { band: 0.5 }, cornerRadius: 4 }, encoding: { y: y(prefix + "25"), y2: { field: prefix + "75" }, color: { field: "bandName", type: "nominal", scale: bandColor(t), legend: null }, tooltip } },
      { mark: { type: "tick", thickness: 6, size: narrow ? 30 : 52, color: t.bg }, encoding: { y: y(prefix + "50") } },
      { mark: { type: "tick", thickness: 3, size: narrow ? 28 : 50, color: t.fg }, encoding: { y: y(prefix + "50"), tooltip } },
      {
        mark: { type: "text", align: "left", dx: narrow ? 16 : 28, baseline: "middle", fontSize: 12, fontWeight: 700, color: t.fg },
        encoding: { y: y(prefix + "50"), text: { field: prefix + "50", type: "quantitative", format } },
      },
    ],
  };
}

// Visits per person each year, one line per band.
function bandTrendSpec(t, narrow, shown) {
  return {
    config: vegaConfig(t),
    height: narrow ? 240 : 280,
    layer: [
      {
        data: { values: [{ a: "2020", b: "2021" }] },
        mark: { type: "rect", color: t.muted, opacity: t.dark ? 0.12 : 0.08 },
        encoding: { x: { field: "a", type: "ordinal", scale: { domain: ["2018", "2019", "2020", "2021", "2022", "2023", "2024"] } }, x2: { field: "b" } },
      },
      {
        encoding: {
          x: { field: "fy", type: "ordinal", scale: { domain: ["2018", "2019", "2020", "2021", "2022", "2023", "2024"] }, axis: { title: null, labelAngle: 0, labelExpr: "'FY' + slice(datum.label, 2)" } },
          y: { field: "visits_per_capita", type: "quantitative", axis: { title: "Visits per person served", format: ".1f", tickCount: 5 }, scale: { zero: true } },
          color: { field: "bandName", type: "nominal", scale: bandColor(t), legend: { orient: "top", title: null, columns: narrow ? 2 : 5, labelLimit: 200, ...(shown.length ? { values: shown } : {}) } },
        },
        layer: [
          { mark: { type: "line", strokeWidth: 2.5, interpolate: "monotone" } },
          {
            mark: { type: "point", filled: true, size: 36, stroke: t.bg, strokeWidth: 1 },
            encoding: {
              tooltip: [
                { field: "bandName", title: "Size" },
                { field: "fy", title: "Fiscal year" },
                { field: "visits_per_capita", type: "quantitative", title: "Visits per person", format: ".2f" },
              ],
            },
          },
        ],
      },
    ],
  };
}

function SystemTable({ rows, cols }) {
  return (
    <div className="od-tablewrap">
      <table>
        <thead>
          <tr>
            <th className="rank">#</th>
            <th className="agency">System</th>
            {cols.map((c) => <th key={c.key} className={c.hide ? "hide-sm" : ""}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.library_name + r.state + i}>
              <td className="rank">{i + 1}</td>
              <td className="agency">{titleCase(r.library_name)} <span className="muted">{r.state}</span></td>
              {cols.map((c) => <td key={c.key} className={c.hide ? "hide-sm" : ""}>{c.fmt(r[c.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const LARGE_COLS = [
  { key: "total_population", label: "People served", fmt: (v) => compact(num(v)), hide: true },
  { key: "visits_per_capita", label: "Visits / person", fmt: dec1 },
  { key: "digital_share", label: "Digital share", fmt: (v) => share(num(v)), hide: true },
  { key: "spend_per_capita", label: "Spend / person", fmt: dollars, hide: true },
  { key: "cost_per_visit", label: "Cost / visit", fmt: dollars },
];
const SMALL_COLS = [
  { key: "total_population", label: "People served", fmt: count, hide: true },
  { key: "visits_per_capita", label: "Visits / person", fmt: dec1 },
  { key: "circulation_per_capita", label: "Borrowed / person", fmt: dec1, hide: true },
  { key: "spend_per_capita", label: "Spend / person", fmt: dollars0, hide: true },
  { key: "cost_per_visit", label: "Cost / visit", fmt: dollars },
];

export default function Dashboard({ dashboard, givens }) {
  const t = useT();
  const narrow = useNarrow();
  const q = useQuery({ query: "systems_by_size", givens });
  const vq = useQuery({ query: "systems_by_size_value", givens });
  const sq = useQuery({ query: "systems_by_size_spread", givens });
  const error = [q, vq, sq].map((x) => x.error).find(Boolean);
  const k = q.rows[0] || {};
  const v = vq.rows[0] || {};
  const where = (() => {
    const s = onlyState(k.largest_systems || []);
    return s && (k.largest_systems || []).length ? stateName(s) : null;
  })();

  const value = (v.systems_by_size_value_per_dollar || []).map((r) => {
    const b = bandOf(r.size_band) || {};
    return {
      ...r, bandName: b.name, bandShort: b.short, systems: num(r.systems_fy2024),
      cost_per_visit: num(r.cost_per_visit_fy2024), spend_per_capita: num(r.spend_per_capita_fy2024),
      visits_per_1k: num(r.visits_per_1k_dollars_fy2024), vpp: num(r.visits_per_capita_fy2024),
    };
  }).filter((r) => r.bandName);
  // Charts leave out bands with fewer than 3 systems (one library is not a band); headlines need 5.
  const MIN = 3;
  const keep = new Set(value.filter((r) => r.systems >= MIN).map((r) => r.bandName));
  const dropped = value.filter((r) => !keep.has(r.bandName));
  const valueShown = value.filter((r) => keep.has(r.bandName));
  // Compare the smallest and largest bands that have at least 5 systems, so one odd library can't carry a headline.
  const solid = value.filter((r) => r.systems >= 5);
  const big = solid[0], small = solid[solid.length - 1];
  const headline = big && small && big !== small
    ? `${where ? `In ${where}, library` : "Library"} systems serving ${small.bandShort.toLowerCase()} people cost ${dollars(small.cost_per_visit)} a visit and those serving ${big.bandShort} ${dollars(big.cost_per_visit)}, ${small.vpp > big.vpp ? "while drawing" : "on"} ${dec1(small.vpp)} visits per person against ${dec1(big.vpp)}`
    : dashboard.title;

  const bands = (v.by_size_band || []).map((r) => {
    const b = bandOf(r.size_band);
    if (!b) return null;
    const v19 = num(r.visits_per_capita_fy2019), v24 = num(r.visits_per_capita_fy2024), change = num(r.visits_change_vs_fy2019);
    return { bandName: b.name, bandShort: b.short, v19, v24, change, systems: num(r.systems_fy2024), changeText: change != null ? (narrow ? pct(change) : `${pct(change)} since FY2019`) : "" };
  }).filter((r) => r && r.v19 != null && r.v24 != null && keep.has(r.bandName));
  const changes = bands.map((b) => b.change).filter((c) => c != null);
  const lo = Math.min(...changes), hi = Math.max(...changes);
  const dumbTitle = changes.length && hi < 0
    ? `Every size band lost ${Math.round(-hi * 100)}% to ${Math.round(-lo * 100)}% of its visits per person since FY2019`
    : "Visits per person, FY2019 against FY2024, by system size";
  const dMax = Math.max(...bands.map((b) => Math.max(b.v19, b.v24)), 1);
  const dumb = React.useMemo(() => dumbbellSpec(t, narrow, dMax), [t, narrow, dMax]);

  const spendHigherSmall = big && small && small.spend_per_capita > big.spend_per_capita;
  const visitCheaperSmall = big && small && small.cost_per_visit < big.cost_per_visit;
  const costRatio = big && small ? small.cost_per_visit / big.cost_per_visit : null;
  const valueTitle = big && small && big !== small
    ? (Math.abs(costRatio - 1) < 0.06
      ? `A visit costs about the same at every size (${dollars(small.cost_per_visit)} against ${dollars(big.cost_per_visit)})`
      : spendHigherSmall && visitCheaperSmall
      ? "Small systems spend more per person, but each visit costs less"
      : visitCheaperSmall ? "Small systems get each visit for less" : "Bigger systems get each visit for less")
    : "Spend per person and cost per visit by system size";
  const costSpec = React.useMemo(() => bandBarSpec(t, narrow, { field: "cost_per_visit", title: "Cost per visit", format: "$,.0f", labelFormat: "$,.2f" }), [t, narrow]);
  const spendSpec = React.useMemo(() => bandBarSpec(t, narrow, { field: "spend_per_capita", title: "Spend per person", format: "$,.0f", labelFormat: "$,.2f" }), [t, narrow]);

  const spread = sq.rows.map((r) => {
    const b = BAND_BY_CODE[r.band] || {};
    const out = { ...r, bandName: b.name, bandShort: b.short, systems: num(r.systems) };
    for (const p of ["10", "25", "50", "75", "90"]) {
      out["v" + p] = num(r["v" + p]);
      out["c" + p] = num(r["c" + p]);
    }
    return out;
  }).filter((r) => r.bandName && keep.has(r.bandName));
  const vMax = Math.ceil(Math.max(...spread.map((r) => r.v90 || 0), 1));
  const cMax = Math.ceil(Math.max(...spread.map((r) => r.c90 || 0), 1) / 5) * 5;
  const vBox = React.useMemo(() => boxSpec(t, narrow, { prefix: "v", title: "Visits per person served", format: ".1f", max: vMax }), [t, narrow, vMax]);
  const cBox = React.useMemo(() => boxSpec(t, narrow, { prefix: "c", title: "Cost per visit", format: "$,.0f", max: cMax }), [t, narrow, cMax]);
  const widest = spread.filter((r) => r.systems >= 5).sort((a, b) => (b.v90 - b.v10) - (a.v90 - a.v10))[0];

  const trend = (k.size_band_by_year || []).map((r) => {
    const b = bandOf(r.size_band) || {};
    return { fy: String(r.fiscal_year), bandName: b.name, visits_per_capita: num(r.visits_per_capita) };
  }).filter((r) => r.bandName && keep.has(r.bandName));
  const shownBands = BANDS.map((b) => b.name).filter((n) => keep.has(n));
  const trendS = React.useMemo(() => bandTrendSpec(t, narrow, shownBands), [t, narrow, shownBands.join("|")]);
  const noneBack = bands.length > 0 && bands.every((b) => b.v24 < b.v19);
  const solidSpread = spread.filter((r) => r.systems >= 5);
  const cBig = solidSpread[0], cSmall = solidSpread[solidSpread.length - 1];

  return (
    <div className="od">
      <style>{CSS + CSS2}</style>
      <h1>{headline}</h1>
      <Controls />
      {error && <div className="err">{String(error)}</div>}
      <div className={q.loading ? "loading" : ""}>
        <div className="od-kpis">
          <div className="od-kpi">
            <div className="v">{count(k.systems_fy2024)}</div>
            <div className="l">Library systems, FY2024</div>
            <div className="s">{where ? where : "Every state"}, every size</div>
          </div>
          <div className="od-kpi">
            <div className="v">{dec1(k.visits_per_capita_fy2024)}</div>
            <div className="l">Visits per person served</div>
            <div className="s">{dollars(k.spend_per_capita_fy2024)} spent per person</div>
          </div>
          <div className="od-kpi hot">
            <div className="v">{dollars(k.cost_per_visit_fy2024)}</div>
            <div className="l">Operating cost per visit</div>
            <div className="s">{small && big && small !== big ? `${dollars(small.cost_per_visit)} under 5k people, ${dollars(big.cost_per_visit)} at the top` : "FY2024"}</div>
          </div>
          <div className="od-kpi">
            <div className="v">{pct(num(k.visits_change_vs_fy2019))}</div>
            <div className="l">Visits since FY2019</div>
            <div className="s">Total in-person visits, FY2024 vs FY2019</div>
          </div>
        </div>

        <Card
          title={dumbTitle}
          sub="Visits per person served, by size of the population a system serves. Hollow: FY2019. Filled: FY2024. Smaller systems draw more visits per person."
        >
          <div className="od-vega"><VegaChart spec={dumb} data={bands} /></div>
        </Card>

        <Card title={valueTitle} sub="FY2024, comparable systems. Operating spend per person served, and per in-person visit.">
          <div className="od-grid" style={{ marginTop: 0 }}>
            <div>
              <p className="pt" style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px" }}>Spend per person</p>
              <div className="od-vega"><VegaChart spec={spendSpec} data={valueShown} /></div>
            </div>
            <div>
              <p className="pt" style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px" }}>Cost per visit</p>
              <div className="od-vega"><VegaChart spec={costSpec} data={valueShown} /></div>
            </div>
          </div>
        </Card>

        <div className="od-grid">
          <Card
            title={widest ? `Systems of the same size differ widely: the middle 80% of ${widest.bandShort === "Under 5k" ? "systems under 5k" : `${widest.bandShort} systems`} draw ${dec1(widest.v10)} to ${dec1(widest.v90)} visits per person` : "Spread of visits per person"}
            sub="Each system's visits per person, FY2024. Box: middle half of systems. Whiskers: middle 80%. Labelled line: the typical (median) system."
          >
            <div className="od-vega"><VegaChart spec={vBox} data={spread} /></div>
          </Card>
          <Card title={cBig && cSmall && cBig !== cSmall ? `The typical visit costs ${dollars(cBig.c50)} in the biggest systems and ${dollars(cSmall.c50)} in the smallest` : "Spread of cost per visit"} sub="Each system's operating spend per visit, FY2024. Box: middle half. Whiskers: middle 80%. Labelled line: the typical system.">
            <div className="od-vega"><VegaChart spec={cBox} data={spread} /></div>
          </Card>
        </div>

        <Card title="Visits per person, FY2018 to FY2024, by system size" sub={`Shaded: the pandemic closures.${noneBack ? " Every band dropped together and none is back to its FY2019 level." : ""}`}>
          <div className="od-vega"><VegaChart spec={trendS} data={trend} /></div>
        </Card>

          <Card title="The largest systems" sub="FY2024, by people served.">
            <SystemTable rows={(k.largest_systems || []).slice(0, 12)} cols={LARGE_COLS} />
          </Card>
          <Card title="The most-used small systems" sub="FY2024, serving 1,000 to 25,000 people, by visits per person.">
            <SystemTable rows={(k.busiest_small_systems || []).slice(0, 12)} cols={SMALL_COLS} />
          </Card>
      </div>
      <p className="foot">
        Source: IMLS Public Libraries Survey FY2018 to FY2024 (public domain). Size bands by population served that
        year: 500k+ (the top ~1%), 100k–500k, 25k–100k, 5k–25k and under 5k. Charts leave out systems the survey marks as
        outside the public-library definition and five statewide or coordinating bodies (the model's "not comparable"
        band). The spread charts count systems reporting visits, population and spend. Dollars are operating spend as
        reported, not adjusted for inflation.
        {dropped.length > 0 && ` Left out of the charts here: ${dropped.map((r) => `${r.bandShort} (${count(r.systems)} system${r.systems === 1 ? "" : "s"})`).join(", ")}, too few to read as a band.`}
      </p>
    </div>
  );
}

