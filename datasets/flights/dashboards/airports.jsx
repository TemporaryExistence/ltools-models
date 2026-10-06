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

// ---- Airports and delay chains charts ----

// Late rate by scheduled hour: hubs, small airports and the selected airport on one chart.
function hourSpec(t, narrow, series) {
  const domain = series.map((s) => s[0]);
  const range = series.map((s) => s[1]);
  return {
    config: vegaConfig(t),
    height: narrow ? 240 : 290,
    transform: [{ filter: "datum.dep_hour >= 5" }],
    encoding: {
      x: {
        field: "dep_hour", type: "quantitative", scale: { domain: [5, 23], nice: false },
        axis: { title: "Scheduled departure", values: narrow ? [6, 10, 14, 18, 22] : [5, 7, 9, 11, 13, 15, 17, 19, 21], labelExpr: HOUR_LABEL, grid: false },
      },
      y: { field: "late_rate", type: "quantitative", scale: { zero: true }, axis: { title: "Arrived 15+ min late", format: ".0%", tickCount: 5 } },
      color: { field: "series", type: "nominal", scale: { domain, range }, legend: null },
    },
    layer: [
      {
        mark: { type: "line", interpolate: "monotone" },
        encoding: {
          strokeWidth: { condition: { test: "datum.series == '" + domain[domain.length - 1] + "'", value: 3 }, value: 2 },
        },
      },
      {
        mark: { type: "circle", size: 40, opacity: 0.001 },
        encoding: {
          size: { value: 140 },
          tooltip: [
            { field: "series", title: "Airports" },
            { field: "dep_hour", type: "quantitative", title: "Hour (0-23)" },
            { field: "late_rate", type: "quantitative", title: "Arrived late", format: ".1%" },
          ],
        },
      },
    ],
  };
}

// Late rate by leg of the aircraft's day, as steps: national and the selected airport.
function legSpec(t, narrow, sel) {
  const x = {
    field: "leg", type: "ordinal",
    axis: { title: "Flight of the aircraft's day", labelExpr: "datum.value == 7 ? '7th+' : datum.value == 1 ? '1st' : datum.value == 2 ? '2nd' : datum.value == 3 ? '3rd' : datum.value + 'th'", labelAngle: 0, grid: false },
  };
  const y = { field: "late_rate", type: "quantitative", scale: { zero: true }, axis: { title: "Arrived 15+ min late", format: ".0%", tickCount: 5 } };
  const series = sel ? [["All US airports", t.pal.blue], [sel, t.pal.orange]] : [["All US airports", t.pal.blue]];
  return {
    config: vegaConfig(t),
    height: narrow ? 240 : 290,
    encoding: { x, y, color: { field: "series", type: "nominal", scale: { domain: series.map((s) => s[0]), range: series.map((s) => s[1]) }, legend: null } },
    layer: [
      { mark: { type: "line", interpolate: "step", strokeWidth: 2.5 } },
      {
        mark: { type: "circle", size: 50, stroke: t.bg, strokeWidth: 1.5, opacity: 1 },
        encoding: {
          tooltip: [
            { field: "series", title: "Airports" },
            { field: "leg", title: "Flight of the day" },
            { field: "late_rate", type: "quantitative", title: "Arrived late", format: ".1%" },
            { field: "legs", type: "quantitative", title: "Flights", format: "," },
          ],
        },
      },
      {
        transform: [{ filter: "datum.series == 'All US airports' && (datum.leg == 1 || datum.leg == 5)" }],
        mark: { type: "text", dy: -12, fontSize: 13, fontWeight: 700, color: t.fg },
        encoding: { text: { field: "late_rate", type: "quantitative", format: ".0%" } },
      },
    ],
  };
}

// One point per airport: size (log scale) against late rate, sized by delay-chain cost, coloured by size band.
function scatterSpec(t, narrow, sel) {
  const x = {
    field: "departures_per_day", type: "quantitative", scale: { type: "log", domain: [3, 1200] },
    axis: { title: "Departures a day (log scale)", values: narrow ? [3, 10, 30, 100, 300, 1000] : [3, 5, 10, 20, 50, 100, 200, 500, 1000], format: "~s" },
  };
  const y = { field: "late_rate", type: "quantitative", scale: { zero: false, nice: true }, axis: { title: "Arrived 15+ min late", format: ".0%", tickCount: 6 } };
  return {
    config: vegaConfig(t),
    height: narrow ? 340 : 440,
    layer: [
      {
        mark: { type: "circle", opacity: 0.78, stroke: t.bg, strokeWidth: 1 },
        encoding: {
          x, y,
          size: {
            field: "chain_cost_usd", type: "quantitative",
            scale: { range: [narrow ? 8 : 14, narrow ? 300 : 1100] },
            legend: narrow ? null : { title: "Delay-chain cost started here", format: "$.2~s", orient: "right", symbolFillColor: t.muted, symbolStrokeWidth: 0, values: [1e6, 5e6, 2e7] },
          },
          color: {
            field: "band", type: "nominal",
            scale: { domain: BANDS.map(bandName), range: t.pal.bands },
            legend: narrow
              ? { title: null, orient: "bottom", direction: "horizontal", columns: 2, symbolType: "circle", labelLimit: 160 }
              : { title: "Airport size", orient: "right", symbolType: "circle", labelLimit: 160 },
          },
          order: { field: "chain_cost_usd", sort: "descending" },
          tooltip: [
            { field: "label", title: "Airport" },
            { field: "band", title: "Size" },
            { field: "departures_per_day", type: "quantitative", title: "Departures a day", format: ",.0f" },
            { field: "late_rate", type: "quantitative", title: "Arrived late", format: ".1%" },
            { field: "chain_cost_usd", type: "quantitative", title: "Delay-chain cost", format: "$,.0f" },
          ],
        },
      },
      {
        transform: [{ filter: "datum.labelled" }],
        mark: { type: "text", align: "left", dx: 7, dy: -7, fontSize: 12, fontWeight: 600, color: t.fg },
        encoding: { x, y, text: { field: "origin" } },
      },
      {
        transform: [{ filter: "datum.selected" }],
        mark: { type: "circle", size: narrow ? 260 : 340, fill: null, stroke: t.pal.orange, strokeWidth: 3 },
        encoding: { x, y },
      },
    ],
  };
}

export default function Dashboard({ dashboard, givens }) {
  const t = useTheme();
  const narrow = useNarrow();
  const og = useGiven("ORIGIN");
  const sel = og && og.value ? String(og.value).replace(/\\/g, "") : "";
  const q = useQuery({ query: "airports", givens });
  const legsQ = useQuery({ query: "airports_legs", givens });
  const scat = useQuery({ query: "airports_scatter", givens });
  const inbound = useQuery({ query: "airports_inbound", givens });
  const starts = useQuery({ query: "airports_chain_starts", givens });
  const routes = useQuery({ query: "airports_routes", givens });
  const k = q.rows[0] || {};
  const g = legsQ.rows[0] || {};
  const selName = sel || "Selected airports";

  // Hour lines: hubs and small airports from the national size-band curve, plus the selected airport.
  const hourRows = React.useMemo(() => {
    const out = [];
    for (const r of k.hour_by_size || []) {
      if (r.size_band === BANDS[0]) out.push({ ...r, series: "Hubs (400+ a day)" });
      if (r.size_band === BANDS[3]) out.push({ ...r, series: "Small (10-29 a day)" });
    }
    if (sel) for (const r of k.airport_by_hour || []) out.push({ ...r, series: sel });
    return out;
  }, [k.hour_by_size, k.airport_by_hour, sel]);
  const hourSeries = [["Hubs (400+ a day)", t.pal.blue], ["Small (10-29 a day)", t.pal.aqua]].concat(sel ? [[sel, t.pal.orange]] : []);

  const legRows = React.useMemo(() => {
    const out = (g.late_by_leg || []).map((r) => ({ ...r, series: "All US airports" }));
    if (sel) for (const r of g.airport_late_by_leg || []) out.push({ ...r, series: sel });
    return out;
  }, [g.late_by_leg, g.airport_late_by_leg, sel]);

  const scatRows = React.useMemo(() => {
    const rows = scat.rows || [];
    const top = new Set([...rows].sort((a, b) => b.chain_cost_usd - a.chain_cost_usd).slice(0, narrow ? 4 : 6).map((r) => r.origin));
    const lateTop = new Set([...rows].sort((a, b) => b.late_rate - a.late_rate).slice(0, narrow ? 2 : 4).map((r) => r.origin));
    return rows.map((r) => ({
      ...r, band: bandName(r.size_band), label: `${r.origin} · ${r.origin_city}`,
      labelled: top.has(r.origin) || lateTop.has(r.origin) || r.origin === sel, selected: r.origin === sel,
    }));
  }, [scat.rows, sel, narrow]);

  const specs = React.useMemo(() => ({
    hour: hourSpec(t, narrow, hourSeries),
    leg: legSpec(t, narrow, sel),
    scatter: scatterSpec(t, narrow, sel),
  }), [t, narrow, sel]);

  const eff = g.airport_first_flight_effect || [];
  const effLate = eff.find((r) => /late$/.test(r.day_start));
  const effOn = eff.find((r) => /on time$/.test(r.day_start));
  const inb = g.airport_inbound_effect || [];
  const inbLate = inb.find((r) => /late$/.test(r.inbound));
  const inbOn = inb.find((r) => /on time$/.test(r.inbound));
  const delta = k.airport_late_rate != null && k.national_late_rate != null ? k.airport_late_rate - k.national_late_rate : null;

  return (
    <div className="od" style={{ "--hot": t.pal.orange }}>
      <style>{CSS}</style>
      <h1>{dashboard.title}</h1>
      <Controls />
      {q.error && <div className="err">{String(q.error)}</div>}
      <div className={q.loading ? "loading" : ""}>
        <div className="od-kpis">
          <div className="od-kpi">
            <div className="v">{compact(k.airport_flights)}</div>
            <div className="l">Departures{sel ? " from " + sel : ""}</div>
            <div className="s">Scheduled, in the selection</div>
          </div>
          <div className="od-kpi hot">
            <div className="v">{share(k.airport_late_rate)}</div>
            <div className="l">Arrived 15+ minutes late</div>
            <div className="s">
              {delta == null ? "–" : `${Math.abs(Math.round(delta * 100))} point${Math.abs(Math.round(delta * 100)) === 1 ? "" : "s"} ${delta < 0 ? "better" : "worse"} than all airports (${share(k.national_late_rate)})`}
            </div>
          </div>
          <div className="od-kpi">
            <div className="v">{share(k.airport_chain_share)}</div>
            <div className="l">Of late flights: plane was already late</div>
            <div className="s">The aircraft's previous flight that day arrived late</div>
          </div>
          <div className="od-kpi">
            <div className="v">{pct1(k.airport_cancel_rate)}</div>
            <div className="l">Cancelled</div>
            <div className="s">Of scheduled departures</div>
          </div>
        </div>

        <div className="od-grid">
          <Card title="Each flight of the aircraft's day is more likely to arrive late" sub="Share arriving 15+ minutes late, by which flight of the day it is for that aircraft">
            <Key items={[["All US airports", t.pal.blue, true]].concat(sel ? [[sel, t.pal.orange, true]] : [])} />
            <div className="od-vega"><VegaChart spec={specs.leg} data={legRows} /></div>
          </Card>
          <Card title="Lateness builds through the day, faster at hubs" sub="Share arriving 15+ minutes late, by scheduled departure hour">
            <Key items={hourSeries.map(([l, c]) => [l, c])} />
            <div className="od-vega"><VegaChart spec={specs.hour} data={hourRows} /></div>
          </Card>
        </div>

        <div className="od-grid one">
          <Card title="Every airport: size, lateness and the delay chains it starts" sub="One dot per airport with 300+ flights; bigger dots start costlier delay chains (late-aircraft minutes on the same plane's later flights, at $100.76 a minute)">
            <div className="od-vega"><VegaChart spec={specs.scatter} data={scatRows} /></div>
          </Card>
        </div>

        <div className="od-grid">
          <Card title={sel ? `A late first flight follows the aircraft out of ${sel}` : "A late first flight follows the aircraft"} sub="Later flights of the day: share arriving 15+ minutes late, by how the aircraft's first flight went">
            <div className="vs">
              <div className="late">
                <div className="big">{share(effLate && effLate.late_rate)}</div>
                <div className="cap">when the first flight of the day was late ({whole(effLate && effLate.legs)} flights)</div>
              </div>
              <div>
                <div className="big">{share(effOn && effOn.late_rate)}</div>
                <div className="cap">when it was on time ({whole(effOn && effOn.legs)} flights)</div>
              </div>
            </div>
            <p className="sub" style={{ margin: "22px 0 8px" }}>One step back: by how the aircraft's previous flight went</p>
            <div className="vs">
              <div className="late">
                <div className="big">{share(inbLate && inbLate.late_rate)}</div>
                <div className="cap">when the inbound flight was late ({whole(inbLate && inbLate.legs)} flights)</div>
              </div>
              <div>
                <div className="big">{share(inbOn && inbOn.late_rate)}</div>
                <div className="cap">when it arrived on time ({whole(inbOn && inbOn.legs)} flights)</div>
              </div>
            </div>
          </Card>
          <Card title="Where the late chains start" sub={`Airports whose late first flight of the day ended in a late departure${sel ? " from " + sel : ""}`}>
            <Bars rows={(starts.rows || []).slice(0, 8)} value="late_legs" label="first_origin" right={(r) => whole(r.late_legs)} note={() => "late flights"} />
          </Card>
        </div>

        <div className="od-grid">
          <Card title="Where the aircraft fly in from" sub="Later flights of the day, by the previous airport (100+ flights)">
            <div className="od-tablewrap">
              <table>
                <thead><tr><th className="name">From</th><th className="hide-sm">Flights</th><th>Arrived late</th><th>Left late</th></tr></thead>
                <tbody>
                  {(inbound.rows || []).slice(0, 10).map((r) => (
                    <tr key={r.prev_origin}>
                      <td className="name">{r.prev_origin}</td>
                      <td className="hide-sm">{whole(r.legs)}</td>
                      <td>{share(r.inbound_late_rate)}</td>
                      <td>{share(r.late_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Airlines here" sub="Most departures first">
            <div className="od-tablewrap">
              <table>
                <thead><tr><th className="name">Airline</th><th className="hide-sm">Flights</th><th>Late</th><th>Cancelled</th></tr></thead>
                <tbody>
                  {(k.airport_by_airline || []).map((r) => (
                    <tr key={r.airline}>
                      <td className="name">{r.airline}</td>
                      <td className="hide-sm">{whole(r.flight_count)}</td>
                      <td>{share(r.late_rate)}</td>
                      <td>{pct1(r.cancel_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {(routes.rows || []).length > 0 && (
          <Card title="Busy routes that run late most" sub="Routes with 300+ flights in the selection">
            <div className="od-tablewrap">
              <table>
                <thead><tr><th className="name">Route</th><th className="hide-sm">Flights</th><th>Late</th><th>Avg delay</th></tr></thead>
                <tbody>
                  {routes.rows.map((r) => (
                    <tr key={r.route}>
                      <td className="name">{r.route}</td>
                      <td className="hide-sm">{whole(r.flight_count)}</td>
                      <td className="up">{share(r.late_rate)}</td>
                      <td>{r.avg_arrival_delay != null ? Math.round(r.avg_arrival_delay) + " min" : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      <p className="foot">
        Source: BTS Reporting Carrier On-Time Performance, May–July 2026. Each aircraft (tail number) is followed through
        its day; late means arriving 15+ minutes after schedule, of flights that operated. Airport size is average
        departures a day over the period. Delay-chain cost: when an aircraft's first flight of the day arrived late, the
        late-aircraft delay minutes on its later flights that day, at $100.76 a minute (Airlines for America, 2024
        average block-minute cost); attribution, not proof every minute was avoidable. Airport positions: OurAirports
        (public domain).
      </p>
    </div>
  );
}
