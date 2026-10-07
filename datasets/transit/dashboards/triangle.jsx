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

// ---- How the Triangle moves: transit ----

const share = (p) => (p == null || isNaN(p) ? "–" : Math.round(p * 100) + "%");
const big = (n) => {
  if (n == null || isNaN(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e8 ? 0 : 1) + "M";
  if (a >= 1e3) return Math.round(n / 1e3) + "k";
  return String(Math.round(n));
};
const one = (n) => (n == null || isNaN(n) ? "–" : n.toFixed(1));
const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const TRI = "Triangle (Raleigh + Durham)";
const isoMonth = (v) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};
const agencyShort = (s) => String(s || "").trim().replace("North Carolina State University", "NC State Wolfline");

// Dumbbell per metro: service restored (hollow) and riders recovered (filled), with 100% marked.
function peerSpec(t, narrow) {
  const y = { field: "metro", type: "nominal", sort: { field: "order" }, axis: { title: null, labelLimit: narrow ? 120 : 220, labelFontSize: 12, labelFontWeight: { condition: { test: "indexof(datum.label, 'Triangle') >= 0", value: 700 }, value: 400 } } };
  const x = (field) => ({ field, type: "quantitative", scale: { domain: [0.5, 1.38] }, axis: { title: "Share of 2019", format: ".0%", values: [0.6, 0.8, 1, 1.2] } });
  return {
    config: vegaConfig(t),
    height: narrow ? 260 : 280,
    encoding: { y },
    layer: [
      { data: { values: [{}] }, mark: { type: "rule", color: t.muted, strokeDash: [3, 3] }, encoding: { x: { datum: 1 }, y: { value: 0 }, y2: { value: narrow ? 260 : 280 } } },
      { mark: { type: "rule", color: t.border, strokeWidth: 3 }, encoding: { x: x("riders"), x2: { field: "service" } } },
      {
        mark: { type: "point", filled: false, size: 110, strokeWidth: 2.5, color: t.pal.alt },
        encoding: { x: x("service"), tooltip: [{ field: "metro", title: "Metro" }, { field: "service", title: "Service vs 2019", format: ".0%" }] },
      },
      {
        mark: { type: "circle", size: 130, color: t.pal.up },
        encoding: {
          x: x("riders"),
          tooltip: [
            { field: "metro", title: "Metro" },
            { field: "riders", title: "Riders vs 2019", format: ".0%" },
            { field: "reported", title: "As reported (with GoRaleigh)", format: ".0%" },
            { field: "service", title: "Service vs 2019", format: ".0%" },
          ],
        },
      },
      {
        transform: [{ filter: "datum.reported != datum.riders" }],
        mark: { type: "point", shape: "diamond", filled: false, size: 80, strokeWidth: 1.5, color: t.muted },
        encoding: { x: x("reported") },
      },
      {
        mark: { type: "text", align: "left", dx: 10, fontSize: 12, fontWeight: 700, color: t.pal.up },
        encoding: { x: { field: "hi", type: "quantitative" }, text: { field: "riders", type: "quantitative", format: ".0%" } },
      },
    ],
  };
}

// Monthly trips per Triangle agency, with GoRaleigh's counting change marked.
function monthlySpec(t, narrow, agencies) {
  const range = [t.pal.up, t.pal.alt, t.pal.violet, t.pal.teal, t.pal.quietLine, t.pal.quiet];
  return {
    config: vegaConfig(t),
    height: narrow ? 260 : 320,
    layer: [
      {
        data: { values: [{ m: "2024-07-01" }] },
        mark: { type: "rule", color: t.pal.down, strokeDash: [4, 3], strokeWidth: 1.5 },
        encoding: { x: { field: "m", type: "temporal" } },
      },
      {
        data: { values: [{ m: "2024-07-01", txt: narrow ? "Counting change" : "July 2024: GoRaleigh counting change" }] },
        mark: { type: "text", align: "right", dx: -6, dy: 0, baseline: "top", fontSize: 12, fontWeight: 600, color: t.pal.down },
        encoding: { x: { field: "m", type: "temporal" }, y: { value: 2 }, text: { field: "txt" } },
      },
      {
        mark: { type: "line", interpolate: "monotone" },
        encoding: {
          strokeWidth: { condition: { test: "datum.agency == 'GoRaleigh'", value: 3 }, value: 1.5 },
          x: { field: "month", type: "temporal", axis: { title: null, format: "%Y", tickCount: narrow ? 4 : 9, labelAngle: 0 } },
          y: { field: "trips", type: "quantitative", axis: { title: "Trips a month", format: "~s", tickCount: 5 } },
          color: {
            field: "agency", type: "nominal", sort: agencies,
            scale: { domain: agencies, range: range.slice(0, agencies.length) },
            legend: { orient: "top", title: null, columns: narrow ? 2 : 3, symbolType: "stroke", symbolStrokeWidth: 3, labelLimit: 180 },
          },
          tooltip: [
            { field: "agency", title: "Agency" },
            { field: "month", type: "temporal", title: "Month", format: "%b %Y" },
            { field: "trips", type: "quantitative", title: "Trips", format: ",.0f" },
          ],
        },
      },
    ],
  };
}

export default function Dashboard({ dashboard, givens }) {
  const t0 = useTheme();
  const t = React.useMemo(() => ({
    ...t0,
    pal: {
      ...t0.pal,
      alt: t0.dark ? "#f0a030" : "#c46a00",
      violet: t0.dark ? "#b192ee" : "#7446c4",
      teal: t0.dark ? "#3cc6b0" : "#0f8a78",
      quiet: t0.dark ? "#5b5f66" : "#b8bcc4",
      quietLine: t0.dark ? "#9ca3af" : "#6b7079",
    },
  }), [t0]);
  const narrow = useNarrow();
  const peersQ = useQuery({ query: "triangle", givens });
  const monthQ = useQuery({ query: "triangle_monthly", givens });
  const belowQ = useQuery({ query: "triangle_nc_below", givens });
  const agQ = useQuery({ query: "triangle_agencies_table", givens });
  const all = [peersQ, monthQ, belowQ, agQ];
  const error = all.map((q) => q.error).find(Boolean);
  const busy = all.some((q) => q.loading);

  const peers = peersQ.rows;
  const tri = peers.find((r) => r.peer_metro === TRI) || {};
  const rank = peers.findIndex((r) => r.peer_metro === TRI) + 1;
  const title = tri.recovery_without_goraleigh != null
    ? `The Triangle is back to ${share(tri.recovery_without_goraleigh)} of its 2019 transit riders once GoRaleigh's counting change is taken out`
    : dashboard.title;

  const peerRows = React.useMemo(() => peers.map((r, i) => ({
    metro: r.peer_metro === TRI ? (narrow ? "Triangle" : "Triangle (Raleigh + Durham)") : r.peer_metro,
    order: i,
    riders: r.recovery_without_goraleigh,
    reported: r.recovery_vs_2019,
    service: r.service_vs_2019,
    hi: Math.max(r.recovery_without_goraleigh, r.service_vs_2019, r.recovery_vs_2019),
  })), [peers, narrow]);
  const lead = peers[0];
  const peerTitle = lead && rank
    ? `${lead.peer_metro} leads its peers at ${share(lead.recovery_without_goraleigh)} of 2019 riders; the Triangle is ${ordinal(rank)} of ${peers.length}`
    : "The Triangle against its peers";
  const behindService = peers.filter((r) => r.service_vs_2019 - r.recovery_without_goraleigh > 0.1).length;

  const monthRows = React.useMemo(() => monthQ.rows.map((r) => ({ agency: agencyShort(r.agency_name), month: isoMonth(r.report_month), trips: r.trips_total })), [monthQ.rows]);
  const monthShown = React.useMemo(() => (narrow ? monthRows.filter((r) => r.month >= "2022-01-01") : monthRows), [monthRows, narrow]);
  const agencyOrder = React.useMemo(() => {
    const tot = {};
    for (const r of monthRows) tot[r.agency] = (tot[r.agency] || 0) + r.trips;
    return Object.keys(tot).sort((a, b) => tot[b] - tot[a]);
  }, [monthRows]);
  const gr = (m) => (monthRows.find((r) => r.agency === "GoRaleigh" && r.month === m) || {}).trips;
  const jun = gr("2024-06-01"), jul = gr("2024-07-01");

  const below = belowQ.rows;
  const lost = below.reduce((s, r) => s + (r.trips_lost_vs_2019 || 0), 0);
  const belowRows = below.slice(0, 10).map((r) => ({ ...r, name: r.agency_label.replace(/ \(NC\)$/, "") }));

  const honestAg = agQ.rows.filter((r) => r.ntd_id !== "40007" && r.recovery_vs_2019 != null);
  const pastAg = honestAg.filter((r) => r.recovery_vs_2019 >= 1).map((r) => agencyShort(r.agency_name));
  const worstAg = honestAg.slice().sort((a, b) => a.recovery_vs_2019 - b.recovery_vs_2019)[0];
  const insideTitle = worstAg
    ? `Inside the Triangle: ${pastAg.length ? pastAg.join(" and ") + " past 2019" : "no agency past 2019"}; ${agencyShort(worstAg.agency_name)} furthest behind at ${share(worstAg.recovery_vs_2019)}`
    : "Inside the Triangle";
  const peerChart = React.useMemo(() => peerSpec(t, narrow), [t, narrow]);
  const monthChart = React.useMemo(() => monthlySpec(t, narrow, agencyOrder), [t, narrow, agencyOrder]);
  const charlotte = peers.find((r) => r.peer_metro === "Charlotte") || {};

  return (
    <div className="od">
      <style>{CSS}</style>
      <h1>{title}</h1>
      <Controls />
      {error && <div className="err">{String(error)}</div>}
      <div className={busy ? "loading" : ""}>
        <div className="od-kpis">
          <div className="od-kpi hot">
            <div className="v">{share(tri.recovery_without_goraleigh)}</div>
            <div className="l">Of 2019 riders, GoRaleigh left out</div>
            <div className="s">{share(tri.recovery_vs_2019)} as reported; GoRaleigh's July 2024 counting change inflates it</div>
          </div>
          <div className="od-kpi">
            <div className="v">{share(tri.service_vs_2019)}</div>
            <div className="l">Of 2019 service running</div>
            <div className="s">Vehicle revenue hours, latest 12 months vs 2019</div>
          </div>
          <div className="od-kpi">
            <div className="v">{pct(tri.yoy_change)}</div>
            <div className="l">Trips vs the year before</div>
            <div className="s">{big(tri.trips_latest_12m)} trips, Sep 2025 to Aug 2026 (all agencies)</div>
          </div>
          <div className="od-kpi cold">
            <div className="v">{share(charlotte.recovery_vs_2019)}</div>
            <div className="l">Charlotte, for contrast</div>
            <div className="s">Of 2019 riders, on {share(charlotte.service_vs_2019)} of its 2019 service</div>
          </div>
        </div>

        <Card
          title={peerTitle}
          sub={`Latest 12 months as a share of 2019. Filled dot = riders (the Triangle without GoRaleigh; the grey diamond is its reported figure), ring = service hours. In ${behindService} of ${peers.length} metros riders trail service by more than 10 points.`}
        >
          <div className="od-key">
            <span><i style={{ borderColor: t.pal.up }} />Riders vs 2019</span>
            <span><i style={{ borderColor: t.pal.alt }} />Service vs 2019</span>
          </div>
          <div className="od-vega">{peerRows.length > 0 && <VegaChart spec={peerChart} data={peerRows} />}</div>
        </Card>

        <Card
          title={jun && jul ? `GoRaleigh's monthly boardings jumped from ${big(jun)} to ${big(jul)} in July 2024 on about the same service: a counting change, not riders` : "Monthly trips, Triangle agencies"}
          sub={`Trips a month by agency since January ${narrow ? 2022 : 2018}. GoRaleigh's numbers after July 2024 cannot be compared with 2019, which is why the honest Triangle figure leaves it out.`}
        >
          <div className="od-vega">{monthShown.length > 0 && <VegaChart spec={monthChart} data={monthShown} />}</div>
        </Card>

        <div className="od-grid">
          <Card
            title={`${below.length} North Carolina agencies are still below 2019, ${big(lost)} trips a year short`}
            sub="Agencies with 100,000+ trips in 2019, by trips lost (latest 12 months vs 2019). Under each: riders and service as a share of 2019."
          >
            <Bars
              rows={belowRows}
              value="trips_lost_vs_2019"
              label="name"
              right={(r) => "−" + big(r.trips_lost_vs_2019)}
              note={(r) => `riders ${share(r.recovery_vs_2019)} · service ${share(r.service_vs_2019)}`}
            />
          </Card>
          <Card title={insideTitle} sub="Each Triangle agency, latest 12 months vs 2019. GoRaleigh's figure rests on the new counting.">
            <div className="od-tablewrap">
              <table>
                <thead>
                  <tr>
                    <th className="agency">Agency</th>
                    <th>Trips, 12 months</th>
                    <th>Riders vs 2019</th>
                    <th>Service vs 2019</th>
                    <th className="hide-sm">Riders per hour</th>
                  </tr>
                </thead>
                <tbody>
                  {agQ.rows.map((r) => (
                    <tr key={r.ntd_id}>
                      <td className="agency">{agencyShort(r.agency_name)}{r.ntd_id === "40007" ? " *" : ""}</td>
                      <td>{big(r.trips_latest_12m)}</td>
                      <td className={r.recovery_vs_2019 >= 1 && r.ntd_id !== "40007" ? "up" : ""} style={r.ntd_id === "40007" ? { color: "var(--dash-muted)" } : undefined}>{share(r.recovery_vs_2019)}</td>
                      <td>{share(r.service_vs_2019)}</td>
                      <td className="hide-sm">{one(r.trips_per_hour_12m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="sub" style={{ marginTop: 10, marginBottom: 0 }}>* GoRaleigh: counting change in July 2024; on the old counting it was at about 80% of 2019.</p>
          </Card>
        </div>
      </div>
      <p className="foot">
        Source: FTA National Transit Database, Complete Monthly Ridership (with Adjustments and Estimates), public domain.
        Latest 12 months = September 2025 to August 2026. The Triangle = the Raleigh and Durham urbanized areas (GoRaleigh,
        GoDurham, GoTriangle, Chapel Hill Transit, NC State Wolfline, GoWake Access). Peers = Sun Belt metros of 1.0 to 1.9
        million people (2020 Census). GoRaleigh's fixed-route boardings doubled from June to July 2024 while service hours
        rose about 5%: a change in how boardings are counted (inferred; the city has not confirmed the cause). Fares
        resumed on 1 September 2024, after the break.
      </p>
    </div>
  );
}
const US_FEATURES = [];
const ABBR_TO_FIPS = {};
