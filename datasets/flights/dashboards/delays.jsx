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

// ---- Flight delays charts ----

function daySpec(t, narrow) {
  return {
    config: vegaConfig(t),
    height: narrow ? 220 : 260,
    encoding: {
      x: { field: "flight_date", type: "temporal", axis: { title: null, format: "%b %-d", tickCount: narrow ? 3 : 6, grid: false } },
    },
    layer: [
      {
        mark: { type: "area", color: t.pal.blue, opacity: 0.14, interpolate: "monotone" },
        encoding: { y: { field: "late_rate", type: "quantitative" } },
      },
      {
        mark: { type: "line", color: t.pal.blue, strokeWidth: 2, interpolate: "monotone" },
        encoding: {
          y: { field: "late_rate", type: "quantitative", axis: { title: "Arrived 15+ min late", format: ".0%", tickCount: 5 } },
        },
      },
      {
        mark: { type: "point", opacity: 0, size: 120 },
        encoding: {
          y: { field: "late_rate", type: "quantitative" },
          tooltip: [
            { field: "flight_date", type: "temporal", title: "Day", format: "%a %b %-d" },
            { field: "late_rate", type: "quantitative", title: "Arrived late", format: ".1%" },
            { field: "flight_count", type: "quantitative", title: "Flights", format: "," },
            { field: "cancellations", type: "quantitative", title: "Cancelled", format: "," },
          ],
        },
      },
    ],
  };
}

function hourSpec(t, narrow) {
  return {
    config: vegaConfig(t),
    height: narrow ? 220 : 260,
    transform: [{ filter: "datum.dep_hour >= 5" }],
    encoding: {
      x: {
        field: "dep_hour", type: "quantitative", scale: { domain: [5, 23], nice: false },
        axis: { title: "Scheduled departure", values: narrow ? [6, 10, 14, 18, 22] : [5, 7, 9, 11, 13, 15, 17, 19, 21], labelExpr: HOUR_LABEL, grid: false },
      },
      y: { field: "late_rate", type: "quantitative", axis: { title: "Arrived 15+ min late", format: ".0%", tickCount: 5 }, scale: { zero: true } },
    },
    layer: [
      { mark: { type: "line", color: t.pal.orange, strokeWidth: 2.5, interpolate: "monotone" } },
      {
        mark: { type: "circle", color: t.pal.orange, size: 46, stroke: t.bg, strokeWidth: 1.5 },
        encoding: {
          tooltip: [
            { field: "dep_hour", type: "quantitative", title: "Hour (0-23)" },
            { field: "late_rate", type: "quantitative", title: "Arrived late", format: ".1%" },
            { field: "flight_count", type: "quantitative", title: "Flights", format: "," },
          ],
        },
      },
    ],
  };
}

const CAUSES = [
  ["late_aircraft_delay_hours", "Aircraft arrived late"],
  ["airline_delay_hours", "Airline (crew, maintenance)"],
  ["air_traffic_delay_hours", "Air traffic system"],
  ["weather_delay_hours", "Weather"],
];

function causeSpec(t, narrow) {
  const domain = CAUSES.map((c) => c[1]);
  return {
    config: vegaConfig(t),
    height: narrow ? 240 : 400,
    transform: [
      { fold: CAUSES.map((c) => c[0]), as: ["cause_field", "hours"] },
      { calculate: CAUSES.map((c) => `datum.cause_field == '${c[0]}' ? '${c[1]}' : `).join("") + "''", as: "cause" },
      { calculate: "indexof(" + JSON.stringify(domain) + ", datum.cause)", as: "cause_order" },
      { calculate: narrow ? "replace(replace(datum.size_band, /^\\d /, ''), / \\(.*\\)$/, '')" : "replace(datum.size_band, /^\\d /, '')", as: "band" },
      { joinaggregate: [{ op: "sum", field: "hours", as: "band_hours" }], groupby: ["size_band"] },
      { calculate: "datum.hours / datum.band_hours", as: "share" },
    ],
    mark: { type: "bar", stroke: t.bg, strokeWidth: 2, cornerRadius: 2, height: { band: 0.72 } },
    encoding: {
      y: { field: "band", type: "nominal", sort: { field: "size_band" }, axis: { title: null, labelLimit: narrow ? 110 : 200 } },
      x: { field: "hours", type: "quantitative", stack: "normalize", axis: { title: "Share of delay hours", format: ".0%", tickCount: narrow ? 3 : 5 } },
      color: {
        field: "cause", type: "nominal",
        scale: { domain, range: [t.pal.blue, t.pal.orange, t.pal.aqua, t.pal.yellow] },
        legend: null,
      },
      order: { field: "cause_order" },
      tooltip: [
        { field: "band", title: "Airport size" },
        { field: "cause", title: "Cause" },
        { field: "share", type: "quantitative", title: "Share", format: ".0%" },
        { field: "hours", type: "quantitative", title: "Delay hours", format: ",.0f" },
      ],
    },
  };
}

export default function Dashboard({ dashboard, givens }) {
  const t = useTheme();
  const narrow = useNarrow();
  const q = useQuery({ query: "delays", givens });
  const days = useQuery({ query: "delays_by_day", givens });
  const routes = useQuery({ query: "delays_worst_routes", givens });
  const k = q.rows[0] || {};
  const hours = k.by_departure_hour || [];
  const early = hours.find((h) => h.dep_hour === 6);
  const evening = hours.reduce((m, h) => (h.dep_hour >= 5 && (!m || h.late_rate > m.late_rate) ? h : m), null);
  const causes = (Array.isArray(k.delay_causes) ? k.delay_causes[0] : k.delay_causes) || {};
  const causeTotal = CAUSES.reduce((s, c) => s + (causes[c[0]] || 0), 0);
  const specs = React.useMemo(() => ({ day: daySpec(t, narrow), hour: hourSpec(t, narrow), cause: causeSpec(t, narrow) }), [t, narrow]);
  const hourName = (h) => (h == null ? "–" : h === 0 ? "midnight" : h < 12 ? h + "am" : h === 12 ? "noon" : h - 12 + "pm");

  return (
    <div className="od">
      <style>{CSS}</style>
      <h1>{dashboard.title}</h1>
      <Controls />
      {q.error && <div className="err">{String(q.error)}</div>}
      <div className={q.loading ? "loading" : ""}>
        <div className="od-kpis">
          <div className="od-kpi hot">
            <div className="v">{share(k.late_rate)}</div>
            <div className="l">Arrived 15+ minutes late</div>
            <div className="s">Of {whole(k.flight_count)} scheduled flights, May–July 2026</div>
          </div>
          <div className="od-kpi">
            <div className="v">{early ? share(early.late_rate) : "–"} → {evening ? share(evening.late_rate) : "–"}</div>
            <div className="l">6am vs {hourName(evening && evening.dep_hour)} departures</div>
            <div className="s">Late rate climbs through the day</div>
          </div>
          <div className="od-kpi">
            <div className="v">{share(causeTotal ? (causes.late_aircraft_delay_hours || 0) / causeTotal : null)}</div>
            <div className="l">Of delay hours: plane arrived late</div>
            <div className="s">The biggest single cause BTS records</div>
          </div>
          <div className="od-kpi">
            <div className="v">{pct1(k.cancel_rate)}</div>
            <div className="l">Cancelled</div>
            <div className="s">Average arrival delay {k.avg_arrival_delay != null ? k.avg_arrival_delay.toFixed(1) : "–"} min</div>
          </div>
        </div>

        <div className="od-grid">
          <Card title="Late flights climb from dawn to evening" sub="Share arriving 15+ minutes late, by scheduled departure hour (5am to 11pm)">
            <div className="od-vega"><VegaChart spec={specs.hour} data={hours} /></div>
          </Card>
          <Card title="Day by day" sub="Share arriving 15+ minutes late, each day of May–July 2026">
            <div className="od-vega"><VegaChart spec={specs.day} data={days.rows} /></div>
          </Card>
        </div>

        <div className="od-grid">
          <Card title="Why flights are late, by airport size" sub="Share of the delay hours BTS attributes to each cause, by the size of the departure airport">
            <Key items={CAUSES.map((c, i) => [c[1], [t.pal.blue, t.pal.orange, t.pal.aqua, t.pal.yellow][i], true])} />
            <div className="od-vega"><VegaChart spec={specs.cause} data={k.delay_causes_by_size || []} /></div>
          </Card>
          <Card title="Airlines, most flights first" sub="Share arriving 15+ minutes late">
            <Bars
              rows={(k.by_airline || []).slice(0, 10)}
              value="late_rate"
              label="airline"
              right={(r) => share(r.late_rate)}
              note={(r) => `${compact(r.flight_count)} flights`}
            />
          </Card>
        </div>

        <div className="od-grid">
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
          <Card title="Busiest airports" sub="Departures in the selection and their late rate">
            <div className="od-tablewrap">
              <table>
                <thead><tr><th className="name">Airport</th><th>Flights</th><th>Late</th></tr></thead>
                <tbody>
                  {(k.busiest_airports || []).slice(0, 10).map((r) => (
                    <tr key={r.origin}>
                      <td className="name">{r.origin}</td>
                      <td>{whole(r.flight_count)}</td>
                      <td>{share(r.late_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
      <p className="foot">
        Source: BTS Reporting Carrier On-Time Performance, every scheduled US domestic flight May–July 2026. Late means
        arriving 15 or more minutes after schedule; rates are of flights that operated. Delay causes are the minutes
        airlines report to BTS for late flights. Airport size is the airport's average departures a day over the period.
      </p>
    </div>
  );
}
