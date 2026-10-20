import React from "react";
import { VegaChart, filters, useGiven, useQuery, useUrlState } from "@malloyyo/dashboard";

// Self-contained on purpose: a dashboard component can import only React and @malloyyo/dashboard.

// ---- Shared chart helpers (the same block sits in each transit dashboard; a component can import only React and
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

// ---- Transit: budget gap and what a cut costs. First screen: agencies ranked by the 2024 relief gap as a share of
// their operating budget (federal operating money above their own pre-COVID share; $10M+ budgets only, so small
// agencies with noisy percentages do not top it), with dollars as the toggle, #1 highlighted, each row tagged with the action the data supports
// (cut the least-used hours first, with what that agency's infrequent routes cost where its public schedule is in the
// sample) or "no gap". The selected agency ($BUDGET_AGENCY, default GoRaleigh, picked by full name or by
// clicking a row) is highlighted inside the ranking. Below: the proof (its hours by frequency, riders lost per $1M by
// kind of system, riders after a cut or an addition), a collapsed "More", and About this data. No route names: route ridership is
// not public, so the data names a pool of hours, never a route. ----

const BC_CSS = `
.bc-pick { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px 14px; margin: 0 0 12px; }
.bc-pick label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: var(--dash-muted); min-width: 0; flex: 1 1 340px; max-width: 560px; }
.bc-pick input { font: inherit; font-size: 15px; font-weight: 500; color: var(--dash-fg); background: var(--dash-control-bg, transparent);
  border: 1px solid var(--dash-border); border-radius: 8px; padding: 8px 11px; width: 100%; min-width: 0; }
.bc-pick input:focus { outline: 2px solid var(--dash-accent); outline-offset: 1px; }
.bc-pick .meta { font-size: 13px; color: var(--dash-muted); padding-bottom: 9px; }
.bc-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: stretch; }
.bc-card { border: 1px solid var(--dash-border); border-radius: 12px; padding: 14px 16px 12px; min-width: 0; display: flex; flex-direction: column; }
.bc-card > .hd { display: flex; align-items: baseline; gap: 9px; margin: 0 0 8px; }
.bc-card > .hd .n { flex: none; display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
  background: var(--dash-accent); color: var(--dash-bg); font-size: 12px; font-weight: 700; }
.bc-card > .hd h2 { font-size: 16px; margin: 0; line-height: 1.25; }
.bc-card .od-chips { margin-top: auto; padding-top: 8px; }
.bc-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0 0 8px; }
.bc-tiles > div { border: 1px solid var(--dash-border); border-radius: 10px; padding: 8px 11px; min-width: 0; }
.bc-tiles .v { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.1; }
.bc-tiles .v.bad { color: var(--dash-danger); }
.bc-tiles .v.good { color: var(--dash-accent); }
.bc-tiles .l { font-size: 12px; color: var(--dash-muted); margin-top: 3px; line-height: 1.3; }
.bc-tiles .l b { color: var(--dash-fg); font-weight: 600; }
.cr-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--dash-muted); margin: 0 0 6px; }
.cr-legend i { display: inline-block; width: 11px; height: 11px; vertical-align: -1px; margin-right: 5px; border-radius: 2px; }
.bc-none { font-size: 13px; color: var(--dash-muted); margin: 6px 0; }
.rk { margin: 4px 0 18px; }
.rk-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 14px; margin: 0 0 8px; }
.rk-head h2 { font-size: 16px; margin: 0; line-height: 1.25; }
.rk-by { display: inline-flex; border: 1px solid var(--dash-border); border-radius: 8px; overflow: hidden; font-size: 12px; }
.rk-by button { font: inherit; font-size: 12px; border: 0; background: transparent; color: var(--dash-muted); padding: 4px 10px; cursor: pointer; }
.rk-by button.on { background: var(--dash-fg); color: var(--dash-bg); font-weight: 600; }
.rk-list { list-style: none; margin: 0; padding: 0; }
.rk-row { display: grid; grid-template-columns: 2.1em minmax(0, 16em) minmax(0, 1fr) 10.5em; grid-template-areas: "n name bar val" ". tags tags tags";
  align-items: center; column-gap: 10px; row-gap: 2px; padding: 3px 8px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; }
.rk-row + .rk-row { margin-top: 1px; }
.rk-row:hover { background: color-mix(in srgb, var(--dash-border) 35%, transparent); }
.rk-row .n { grid-area: n; font-size: 13px; color: var(--dash-muted); font-variant-numeric: tabular-nums; text-align: right; }
.rk-row .name { grid-area: name; font-size: 14px; font-weight: 600; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rk-row .bar { grid-area: bar; height: 12px; border-radius: 3px; background: color-mix(in srgb, var(--dash-border) 45%, transparent); min-width: 0; }
.rk-row .bar i { display: block; height: 100%; border-radius: 3px; min-width: 2px; }
.rk-row .val { grid-area: val; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.rk-row .val small { font-weight: 500; font-size: 12px; color: var(--dash-muted); margin-left: 6px; }
.rk-row .val small.flag { display: block; margin-left: 0; font-size: 11px; color: var(--dash-danger); font-weight: 700; }
.rk-row .tags { grid-area: tags; display: flex; flex-wrap: wrap; gap: 4px 6px; min-width: 0; }
.rk-row .tags span { font-size: 12px; line-height: 1.25; border-radius: 999px; padding: 1px 9px; border: 1px solid var(--dash-border); min-width: 0; overflow-wrap: anywhere; }
.rk-row .tags .act { border-color: color-mix(in srgb, var(--dash-danger) 55%, transparent); color: var(--dash-fg); }
.rk-row .tags .keep { border-color: color-mix(in srgb, var(--dash-accent) 55%, transparent); color: var(--dash-fg); }
.rk-row .tags .none { color: var(--dash-muted); }
.rk-row .tags .stab { color: var(--dash-muted); border-style: dashed; }
.rk-row.first { background: color-mix(in srgb, var(--dash-danger) 9%, transparent); border-color: color-mix(in srgb, var(--dash-danger) 45%, transparent); }
.rk-row.first .tags .act { background: var(--dash-danger); border-color: var(--dash-danger); color: #fff; font-weight: 600; }
.rk-row.sel { border: 2px solid var(--dash-accent); }
.rk-row.sel .name { color: var(--dash-accent); }
.rk-row .you { font-size: 11px; font-weight: 700; color: var(--dash-accent); margin-left: 6px; text-transform: uppercase; letter-spacing: .04em; }
.rk-gapline { text-align: center; color: var(--dash-muted); font-size: 13px; line-height: 1; padding: 2px 0; list-style: none; }
.rk-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin-top: 8px; }
.rk-foot .od-chips { margin: 0; }
.rk-proof { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--dash-muted); margin: 6px 0 10px; }
.bc-card.wide { grid-column: 1 / -1; }
@media (max-width: 760px) {
  .rk-row { grid-template-columns: 1.6em minmax(0, 1fr) auto; grid-template-areas: "n name val" ". bar bar" ". tags tags"; column-gap: 8px; padding: 5px 6px; }
  .rk-row .bar { height: 8px; }
  .rk-row .name { font-size: 13px; }
  .rk-row .val { font-size: 13px; }
  .rk-row .val small { margin-left: 4px; }
  .rk-row .tags span { font-size: 11px; padding: 1px 7px; }
}
.bc-more { margin: 22px 0 16px; border: 1px solid var(--dash-border); border-radius: 12px; }
.bc-more > summary { cursor: pointer; padding: 12px 16px; font-size: 15px; font-weight: 600; list-style: none; display: flex; align-items: baseline; gap: 10px; }
.bc-more > summary::-webkit-details-marker { display: none; }
.bc-more > summary::before { content: "▸"; color: var(--dash-accent); }
.bc-more[open] > summary::before { content: "▾"; }
.bc-more > summary span { font-size: 12px; font-weight: 400; color: var(--dash-muted); }
.bc-more > .body { padding: 0 16px 16px; }
.bc-more .od-card h2 { font-size: 15px; }
@media (max-width: 900px) { .bc-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 560px) {
  .bc-tiles .v { font-size: 20px; }
  .bc-more > summary span { display: none; }
  .bc-more > .body { padding: 0 10px 12px; }
}
`;

const mBig = (n) => {
  if (n == null || isNaN(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(a >= 1e8 ? 0 : 1) + "M";
  if (a >= 1e3) return "$" + Math.round(n / 1e3) + "k";
  return "$" + Math.round(n);
};
// The share ranking's size floor: below a $10M operating budget a few hundred thousand dollars swing the percentage.
const SHARE_FLOOR = 10e6;
const pc0 = (p) => (p == null || isNaN(p) ? "–" : Math.round(p * 100) + "%");
const pc1 = (p) => (p == null || isNaN(p) ? "–" : (Math.round(p * 1000) / 10).toFixed(1) + "%");
const kN = (n) => {
  if (n == null || isNaN(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e8 ? 0 : 1) + "M";
  if (a >= 1e3) return Math.round(n / 1e3) + "k";
  return String(Math.round(n));
};
const one2 = (n) => (n == null || isNaN(n) ? "–" : Number(n).toFixed(2));
const shortName = (s) => String(s || "")
  .replace("Research Triangle Regional Public Transportation Authority", "GoTriangle")
  .replace("City of Raleigh (NC)", "GoRaleigh (NC)").replace("City of Durham (NC)", "GoDurham (NC)")
  .replace("City of Charlotte North Carolina (NC)", "Charlotte CATS (NC)").replace("City of Winston Salem (NC)", "Winston-Salem (NC)")
  .replace("City of Greensboro (NC)", "Greensboro (NC)").replace("City of Asheville (NC)", "Asheville (NC)")
  .replace("Town of Chapel Hill (NC)", "Chapel Hill (NC)").replace("Cape Fear Public Transportation Authority (NC)", "Wilmington Wave (NC)")
  .replace(/^City of /, "").replace(/^Town of /, "").replace(/^County of /, "")
  .replace("MTA New York City Transit", "NYC Transit").replace("New Jersey Transit Corporation", "NJ Transit")
  .replace("Northeast Illinois Regional Commuter Railroad Corporation", "Metra")
  .replace("Southeastern Pennsylvania Transportation Authority", "SEPTA")
  .replace("Washington Metropolitan Area Transit Authority", "WMATA").replace("San Francisco Bay Area Rapid Transit District", "BART")
  .replace("City and County of San Francisco (CA)", "SF Muni (CA)").replace("Los Angeles County Metropolitan Transportation Authority", "LA Metro")
  .replace("Golden Gate Bridge, Highway and Transportation District", "Golden Gate Transit")
  .replace("Metropolitan Transit Authority of Harris County, Texas", "Houston METRO")
  .replace("Suburban Mobility Authority for Regional Transportation", "SMART Detroit")
  .replace("Regional Transportation Commission of Southern Nevada", "RTC Southern Nevada")
  .replace("Central Ohio Transit Authority", "COTA Columbus").replace("Capital Area Transportation Authority", "CATA Lansing")
  .replace("Rhode Island Public Transit Authority", "RIPTA").replace("Fort Worth Transportation Authority", "Trinity Metro")
  .replace("New Orleans Regional Transit Authority", "New Orleans RTA").replace("Metropolitan Council", "Met Council")
  .replace("Lehigh and Northampton Transportation Authority", "LANTA Allentown")
  .replace("Southern California Regional Rail Authority", "Metrolink").replace("Virginia Railway Express", "VRE")
  .replace("Northern Indiana Commuter Transportation District", "South Shore Line")
  .replace("South Florida Regional Transportation Authority", "Tri-Rail")
  .replace("Regional Transportation District", "RTD").replace("Regional Transit Authority", "RTA").replace("Transportation Authority", "TA")
  .replace("Transit Authority", "TA").replace("Transportation District", "TD").replace("Public Transportation", "PT")
  .replace("Metropolitan", "Metro").replace(/\s+/g, " ").trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const typeLabel = (b) => String(b || "").replace(/^\d\s*/, "");
const sizeLabel = (s) => String(s || "").replace(/ \(.*\)$/, "").toLowerCase();
function BcCard({ n, title, children }) {
  return (
    <section className="bc-card">
      <div className="hd"><span className="n">{n}</span><h2>{title}</h2></div>
      {children}
    </section>
  );
}

// The agency picker: every NTD agency by its full name and state, searchable (type any part of the name; brand names
// such as GoRaleigh are listed beside the NTD name). Picking one sets $BUDGET_AGENCY to that exact name; the state is
// kept in the URL so two agencies with the same name in different states stay apart.
function AgencyPicker({ agencies, mine, setState }) {
  const { set } = useGiven("BUDGET_AGENCY");
  const byLabel = React.useMemo(() => {
    const m = new Map();
    for (const r of agencies) m.set(`${r.agency_name} (${r.state})`, r);
    return m;
  }, [agencies]);
  const current = mine ? `${mine.agency_name} (${mine.state})` : "";
  const [draft, setDraft] = React.useState(current);
  React.useEffect(() => setDraft(current), [current]);
  const pick = (label) => {
    const r = byLabel.get(label);
    if (!r) return false;
    setState(r.state);
    set(filters.oneOf(r.agency_name));
    return true;
  };
  return (
    <div className="bc-pick">
      <label>
        Agency (type any part of the name)
        <input
          value={draft}
          list="bc-agency-list"
          spellCheck={false}
          onChange={(e) => { setDraft(e.target.value); pick(e.target.value); }}
          onFocus={(e) => e.target.select()}
          onBlur={() => { if (!byLabel.has(draft)) setDraft(current); }}
          onKeyDown={(e) => { if (e.key === "Escape") setDraft(current); }}
          aria-label="Agency"
        />
        <datalist id="bc-agency-list">
          {agencies.map((r) => {
            const label = `${r.agency_name} (${r.state})`;
            const brand = shortName(label);
            return <option key={r.ntd_id} value={label} label={brand !== label && !label.startsWith(brand.replace(/ \(..\)$/, "")) ? brand : undefined} />;
          })}
        </datalist>
      </label>
      {mine && <span className="meta">{sizeLabel(mine.size_class)} · {mBig(mine.ops_2024)} operating budget, 2024</span>}
    </div>
  );
}

// 2: riders lost a year per $1M of local-bus service cut, by kind of bus system; the reader's agency on top.
function menuSpec(t, narrow, n, max) {
  const y = { field: "name", type: "nominal", sort: { field: "o", order: "ascending" }, axis: { title: null, labelLimit: narrow ? 130 : 200, labelFontSize: 12, labelColor: t.fg } };
  return {
    config: vegaConfig(t), height: n * 32,
    layer: [
      { mark: { type: "bar", cornerRadiusEnd: 3, height: { band: 0.68 } },
        encoding: { y, x: { field: "v", type: "quantitative", scale: { domain: [0, max * (narrow ? 1.45 : 1.25)] }, axis: { title: "Riders lost a year per $1M of bus service cut", format: "~s", tickCount: 4 } },
          color: { field: "c", type: "nominal", scale: { domain: ["cov", "bus", "busy", "mine"], range: [t.pal.bands[4], t.pal.bands[3], t.pal.bands[1], t.pal.up] }, legend: null },
          tooltip: [{ field: "name", title: "" }, { field: "v", type: "quantitative", title: "Riders lost per $1M", format: ",.0f" }, { field: "rph", type: "quantitative", title: "Riders per service hour", format: ".1f" }, { field: "cph", type: "quantitative", title: "Hours-driven cost per hour", format: "$,.0f" }, { field: "n", title: "Agencies" }] } },
      { mark: { type: "text", align: "left", dx: 5, fontSize: 12, fontWeight: 700, color: t.fg }, encoding: { y, x: { field: "v", type: "quantitative" }, text: { field: "lab" } } },
    ],
  };
}

// 3: riders per 1% of bus hours cut vs added, year 1 and year 2, as a butterfly.
function doorSpec(t, narrow, maxX) {
  const y = { field: "yr", type: "nominal", sort: ["Year 1", "Year 2"], axis: { title: null, labelFontSize: 12, labelColor: t.fg, labelFontWeight: 600 } };
  const x = { field: "v", type: "quantitative", scale: { domain: [-maxX, maxX] }, axis: { title: "Riders, % per 1% of bus hours", labelExpr: "(datum.value > 0 ? '+' : '') + format(datum.value, '.1f') + '%'", values: [-1, -0.5, 0, 0.5, 1] } };
  const color = { field: "dir", type: "nominal", scale: { domain: ["Cut 1%", "Add 1%"], range: [t.pal.down, t.pal.up] }, legend: null };
  const tip = [{ field: "dir", title: "" }, { field: "yr", title: "" }, { field: "v", type: "quantitative", title: "Riders, %", format: "+.2f" }, { field: "band", title: "95% band" }, { field: "riders", type: "quantitative", title: "Riders a year at this agency", format: "+,.0f" }];
  return {
    config: vegaConfig(t), height: narrow ? 128 : 136,
    layer: [
      { mark: { type: "bar", cornerRadius: 3, height: { band: 0.62 } }, encoding: { y, x, color, tooltip: tip } },
      { data: { values: [{ v: 0 }] }, mark: { type: "rule", color: t.fg, strokeWidth: 1 }, encoding: { x: { field: "v", type: "quantitative" } } },
      { transform: [{ filter: "datum.v < 0" }], mark: { type: "text", align: "right", dx: -5, fontSize: 12, fontWeight: 700, color: t.pal.down }, encoding: { y, x, text: { field: "lab" } } },
      { transform: [{ filter: "datum.v > 0" }], mark: { type: "text", align: "left", dx: 5, fontSize: 12, fontWeight: 700, color: t.pal.up }, encoding: { y, x, text: { field: "lab" } } },
    ],
  };
}

// 4: the reader's weekday bus hours split by midday frequency (GTFS), one stacked bar with labels in the segments.
const HW = ["Every 15 min or better", "16–30 min", "31–60 min", "Over 60 min / peak only"];
const hwColors = (t) => [t.pal.up, t.pal.bands[3], abNeutral(t), t.pal.down];
function hoursBarSpec(t, narrow) {
  const x = { field: "x0", type: "quantitative", scale: { domain: [0, 1] }, axis: null };
  return {
    config: vegaConfig(t), height: narrow ? 40 : 44,
    layer: [
      { mark: { type: "bar", height: narrow ? 36 : 40, stroke: t.bg, strokeWidth: 1 },
        encoding: { x, x2: { field: "x1" }, color: { field: "k", type: "nominal", scale: { domain: HW, range: hwColors(t) }, legend: null },
          tooltip: [{ field: "k", title: "Midday frequency" }, { field: "v", type: "quantitative", title: "Share of hours", format: ".0%" }, { field: "cost", type: "quantitative", title: "What those hours cost a year", format: "$,.0f" }] } },
      { transform: [{ filter: `datum.v >= 0.09 && datum.k != '${HW[2]}'` }], mark: { type: "text", fontSize: 13, fontWeight: 700, color: "#ffffff" }, encoding: { x: { field: "mid", type: "quantitative" }, text: { field: "lab" } } },
      { transform: [{ filter: `datum.v >= 0.09 && datum.k == '${HW[2]}'` }], mark: { type: "text", fontSize: 13, fontWeight: 700, color: t.dark ? "#ffffff" : "#171717" }, encoding: { x: { field: "mid", type: "quantitative" }, text: { field: "lab" } } },
    ],
  };
}

// ---- More: the national picture, validation and the evidence behind the numbers. ----

function cliffSpec(t, narrow) {
  const x = { field: "year", type: "ordinal", axis: { title: null, labelAngle: 0, values: narrow ? [2015, 2018, 2021, 2024] : undefined } };
  return {
    config: vegaConfig(t), height: narrow ? 190 : 210,
    layer: [
      { mark: { type: "bar", cornerRadiusEnd: 3, width: { band: 0.72 } },
        encoding: { x, y: { field: "v", type: "quantitative", axis: { title: "Above the pre-COVID federal share", labelExpr: "replace(format(datum.value, '$.2s'), 'G', 'B')", tickCount: 4 } },
          color: { field: "relief", type: "nominal", scale: { domain: [true, false], range: [t.pal.down, abNeutral(t)] }, legend: null },
          tooltip: [{ field: "year", title: "Year" }, { field: "v", type: "quantitative", title: "Federal money above the pre-COVID share", format: "$,.0f" }] } },
      { transform: [{ filter: "datum.year >= 2020" }], mark: { type: "text", dy: -7, fontSize: 11, fontWeight: 700, color: t.fg },
        encoding: { x, y: { field: "v", type: "quantitative" }, text: { field: "lab" } } },
    ],
  };
}

function exposureSpec(t, narrow) {
  const x = { field: "ops", type: "quantitative", scale: { type: "log", domain: [1e6, 2e10], nice: false, clamp: true }, axis: { title: "Operating budget, 2024 (log)", labelExpr: "replace(format(datum.value, '$.0s'), 'G', 'B')", values: [1e6, 1e7, 1e8, 1e9, 1e10] } };
  const y = { field: "rs", type: "quantitative", scale: { domain: [0, 0.55], clamp: true }, axis: { title: "Relief share of budget", format: ".0%", tickCount: 6 } };
  const tip = [{ field: "name", title: "Agency" }, { field: "rs", type: "quantitative", title: "Relief share", format: ".1%" }, { field: "gap", type: "quantitative", title: "Relief gap", format: "$,.0f" }, { field: "ops", type: "quantitative", title: "Operating budget", format: "$,.0f" }];
  return {
    config: vegaConfig(t), height: narrow ? 260 : 300,
    layer: [
      { data: { values: [{ v: 0.1 }] }, mark: { type: "rule", color: t.muted, strokeDash: [4, 3] }, encoding: { y: { field: "v", type: "quantitative" } } },
      { transform: [{ filter: "!datum.mine" }], mark: { type: "circle", size: narrow ? 26 : 34, opacity: 0.55 },
        encoding: { x, y, color: { field: "flagged", type: "nominal", scale: { domain: [true, false], range: [t.pal.down, abNeutral(t)] }, legend: null }, tooltip: tip } },
      { transform: [{ filter: "datum.mine" }], mark: { type: "circle", size: 200, opacity: 1, color: t.pal.up, stroke: t.bg, strokeWidth: 1.5 }, encoding: { x, y, tooltip: tip } },
      { transform: [{ filter: "datum.mine" }], mark: { type: "text", align: "left", dx: 11, dy: -2, fontSize: 12, fontWeight: 700, color: t.pal.up }, encoding: { x, y, text: { field: "short" } } },
    ],
  };
}

function ladderSpec(t, narrow, n, max) {
  const y = { field: "k", type: "nominal", sort: null, axis: { title: null, labelLimit: narrow ? 120 : 220, labelFontSize: 12, labelColor: t.fg } };
  return {
    config: vegaConfig(t), height: n * 32,
    layer: [
      { mark: { type: "bar", cornerRadiusEnd: 3, height: { band: 0.66 }, color: t.pal.down },
        encoding: { y, x: { field: "v", type: "quantitative", scale: { domain: [0, max * (narrow ? 1.9 : 1.45)] }, axis: { title: "Riders lost a year (by year 2)", format: "~s", tickCount: 4 } },
          tooltip: [{ field: "k", title: "Cut" }, { field: "v", type: "quantitative", title: "Riders lost a year", format: ",.0f" }, { field: "p", type: "quantitative", title: "Share of bus riders", format: ".1%" }, { field: "fares", type: "quantitative", title: "Fares lost", format: "$,.0f" }] } },
      { mark: { type: "text", align: "left", dx: 5, fontSize: 12, fontWeight: 700, color: t.fg }, encoding: { y, x: { field: "v", type: "quantitative" }, text: { field: "lab" } } },
    ],
  };
}

function pathSpec(t, narrow) {
  const x = { field: "t", type: "quantitative", scale: { domain: [-12, 23] }, axis: { title: "Months from the service change", values: [-12, -6, 0, 6, 12, 18, 23] } };
  return {
    config: vegaConfig(t),
    facet: { field: "panel", type: "nominal", sort: ["Sharp cuts", "Sharp additions"], header: { title: null, labelFontSize: 13, labelFontWeight: 600, labelColor: t.fg } },
    columns: narrow ? 1 : 2,
    spec: {
      width: narrow ? 240 : 400, height: narrow ? 140 : 170,
      layer: [
        { mark: { type: "rule", color: t.border }, encoding: { y: { datum: 0 } } },
        { mark: { type: "rule", color: t.muted, strokeDash: [3, 3] }, encoding: { x: { datum: 0 } } },
        { mark: { type: "line", strokeWidth: 2.2 },
          encoding: { x, y: { field: "v", type: "quantitative", axis: { title: "vs matched peers", format: "+.0%", tickCount: 5 }, scale: { domain: [-0.32, 0.3] } },
            color: { field: "s", type: "nominal", scale: { domain: ["Service hours", "Riders"], range: [abNeutral(t), t.pal.down] }, legend: null },
            tooltip: [{ field: "panel", title: "" }, { field: "t", title: "Month" }, { field: "s", title: "" }, { field: "v", type: "quantitative", title: "vs peers", format: "+.1%" }] } },
      ],
    },
    resolve: { scale: { y: "shared" } },
  };
}

function flagRateSpec(t, narrow, n) {
  const y = { field: "k", type: "nominal", sort: null, axis: { title: null, labelLimit: narrow ? 150 : 260, labelFontSize: 12, labelColor: t.fg } };
  return {
    config: vegaConfig(t), height: n * 28,
    layer: [
      { mark: { type: "bar", cornerRadiusEnd: 3, height: { band: 0.66 } },
        encoding: { y, x: { field: "v", type: "quantitative", scale: { domain: [0, 0.5] }, axis: { title: "Share of agencies flagged", format: ".0%", tickCount: 4 } },
          color: { field: "c", type: "nominal", scale: { domain: ["noise", "real"], range: [abNeutral(t), t.pal.down] }, legend: null },
          tooltip: [{ field: "k", title: "" }, { field: "v", type: "quantitative", title: "Flagged", format: ".1%" }, { field: "n", title: "Agencies" }] } },
      { mark: { type: "text", align: "left", dx: 5, fontSize: 12, fontWeight: 700, color: t.fg }, encoding: { y, x: { field: "v", type: "quantitative" }, text: { field: "v", type: "quantitative", format: ".0%" } } },
    ],
  };
}

function adaSpec(t, narrow, n) {
  const y = { field: "name", type: "nominal", sort: null, axis: { title: null, labelLimit: narrow ? 140 : 260, labelFontSize: 12, labelColor: t.fg } };
  return {
    config: vegaConfig(t), height: n * 28,
    layer: [
      { mark: { type: "bar", cornerRadiusEnd: 3, height: { band: 0.66 } },
        encoding: { y, x: { field: "v", type: "quantitative", scale: { domain: [0, 0.32] }, axis: { title: "ADA paratransit share of operating cost", format: ".0%", tickCount: 4 } },
          color: { field: "mine", type: "nominal", scale: { domain: [true, false], range: [t.pal.up, abNeutral(t)] }, legend: null },
          tooltip: [{ field: "name", title: "" }, { field: "v", type: "quantitative", title: "ADA share", format: ".1%" }] } },
      { mark: { type: "text", align: "left", dx: 5, fontSize: 12, fontWeight: 700, color: t.fg }, encoding: { y, x: { field: "v", type: "quantitative" }, text: { field: "v", type: "quantitative", format: ".0%" } } },
    ],
  };
}

// The collapsed "More" section. Mounted only when opened, so its queries do not run for a reader who never opens it.
function More({ t, narrow, givens, mine, mineShort, menuRows, events, allRows }) {
  const clQ = useQuery({ query: "budget_cuts", givens });
  const paQ = useQuery({ query: "bc_path", givens });
  const rbQ = useQuery({ query: "bc_robust", givens });
  const raQ = useQuery({ query: "bc_rail", givens });
  const all = [clQ, paQ, rbQ, raQ];
  const error = all.map((q) => q.error).find(Boolean);
  const busy = all.some((q) => q.loading);

  const cl = clQ.rows;
  const c24 = cl.find((r) => r.report_year === 2024) || {};
  const cliffRows = React.useMemo(() => cl.map((r) => ({ year: r.report_year, v: r.relief_gap_total, relief: r.report_year >= 2020, lab: mBig(r.relief_gap_total) })), [cl]);
  const exRows = React.useMemo(() => allRows.filter((r) => r.ops_2024 > 0 && r.relief_share != null).map((r) => ({
    name: r.agency_label, short: clip(shortName(r.agency_label), 26), ops: r.ops_2024, rs: r.relief_share, gap: r.relief_gap,
    flagged: !!r.flagged, mine: !!mine && r.ntd_id === mine.ntd_id,
  })), [allRows, mine]);

  const ladder = React.useMemo(() => {
    const e2 = events.cut ? events.cut.elasticity_y2 : null;
    if (!mine || !mine.bus_vrh_2024 || !mine.bus_avoidable_cost_per_hour || e2 == null) return [];
    const avoid = mine.bus_vrh_2024 * mine.bus_avoidable_cost_per_hour;
    const farePerTrip = mine.bus_riders_lost_per_1m ? (mine.bus_fares_lost_per_1m || 0) / mine.bus_riders_lost_per_1m : 0;
    const cuts = [[1e6, "$1M"], [2.5e6, "$2.5M"], [5e6, "$5M"], [0.1 * mine.bus_opex, "10% of bus budget"], [0.2 * mine.bus_opex, "20% of bus budget"]];
    return cuts.filter(([c]) => c > 0 && c < 0.9 * avoid).sort((a, b) => a[0] - b[0]).map(([c, k]) => {
      const lost = mine.bus_trips_2024 * (1 - Math.pow(1 - c / avoid, e2));
      return { k: k.startsWith("$") ? k + " cut" : `${k} (${mBig(c)})`, v: lost, p: lost / mine.bus_trips_2024, fares: lost * farePerTrip, lab: `${kN(lost)} · ${pc1(lost / mine.bus_trips_2024)}` };
    });
  }, [mine, events]);

  const pathRows = React.useMemo(() => paQ.rows.flatMap((r) => [
    { panel: r.dir === "cut" ? "Sharp cuts" : "Sharp additions", t: r.t, s: "Service hours", v: r.hours_change },
    { panel: r.dir === "cut" ? "Sharp cuts" : "Sharp additions", t: r.t, s: "Riders", v: r.riders_change },
  ]), [paQ.rows]);
  const flagRows = React.useMemo(() => {
    const g = (c, s) => rbQ.rows.find((r) => r.check_name.startsWith(c) && String(r.size_class).startsWith(s)) || {};
    return [
      { k: narrow ? "Bus, 2018 (no relief)" : "Bus agencies, 2018 (before relief)", v: g("a)", "Bus").flag_rate, n: g("a)", "Bus").agencies, c: "noise" },
      { k: narrow ? "Bus, 2024" : "Bus agencies, 2024", v: g("main)", "Bus").flag_rate, n: g("main)", "Bus").agencies, c: "real" },
      { k: narrow ? "Big, 2018 (no relief)" : "Big systems, 2018 (before relief)", v: g("a)", "Big").flag_rate, n: g("a)", "Big").agencies, c: "noise" },
      { k: narrow ? "Big, 2024" : "Big systems, 2024", v: g("main)", "Big").flag_rate, n: g("main)", "Big").agencies, c: "real" },
    ].filter((r) => r.v != null);
  }, [rbQ.rows, narrow]);
  const rail = raQ.rows[0] || {};
  const adaRows = React.useMemo(() => {
    const rows = menuRows.filter((r) => r.c !== "mine").map((r) => ({ name: r.name, v: r.ada, mine: false }));
    if (rail.ada_share_pooled != null) rows.push({ name: "All US transit", v: rail.ada_share_pooled, mine: false });
    if (mine && mine.ada_share_opex != null) rows.unshift({ name: mineShort, v: mine.ada_share_opex, mine: true });
    return rows.filter((r) => r.v != null);
  }, [menuRows, rail, mine, mineShort]);
  const busCut = events.cut || {}, busAdd = events.add || {};

  const specs = React.useMemo(() => ({
    cliff: cliffSpec(t, narrow), exposure: exposureSpec(t, narrow),
    ladder: ladderSpec(t, narrow, ladder.length || 1, Math.max(1, ...ladder.map((r) => r.v))),
    path: pathSpec(t, narrow), flag: flagRateSpec(t, narrow, flagRows.length || 1),
    ada: adaSpec(t, narrow, adaRows.length || 1),
  }), [t, narrow, ladder, flagRows.length, adaRows.length]);

  return (
    <div className={busy ? "loading" : ""}>
      {error && <div className="err">{String(error)}</div>}
      <div className="od-grid">
        <Card title="US: federal relief still in operating budgets">
          <div className="od-vega"><VegaChart spec={specs.cliff} data={cliffRows} /></div>
          <Chips items={[`${mBig(c24.relief_gap_total)} in 2024`, "Each agency vs its own 2017–19 share", "2015–19: normal-year noise"]} />
        </Card>
        <Card title={mineShort ? `${mineShort}: riders lost a year by size of bus cut` : "Riders lost a year by size of bus cut"}>
          <div className="od-vega"><VegaChart spec={specs.ladder} data={ladder} /></div>
          <Chips items={[mine ? `${kN(mine.bus_trips_2024)} bus riders in 2024` : null, `Elasticity ${one2((events.cut || {}).elasticity_y2)}, constant`, "Overhead treated as fixed", "Fares lost shrink the saving"]} />
        </Card>
      </div>
      <Card title="Relief share of every bus agency and big system, 2024">
        <div className="cr-legend"><span><i style={{ background: t.pal.down, borderRadius: "50%" }} />Flagged (10%+)</span><span><i style={{ background: t.pal.up, borderRadius: "50%" }} />{mineShort || "Your agency"}</span></div>
        <div className="od-vega"><VegaChart spec={specs.exposure} data={exRows} /></div>
        <Chips items={[`${exRows.length} agencies`, "Capped at 55%", "Log scale"]} />
      </Card>
      <div className="od-grid">
        <Card title="Does the relief flag fire by chance?">
          <div className="od-vega"><VegaChart spec={specs.flag} data={flagRows} /></div>
          <Chips items={["2018 vs 2015–17: no relief existed", "Watch: NTD 2025 funding (late 2026)"]} />
        </Card>
        <Card title="Fixed: ADA paratransit share of the budget">
          <div className="od-vega"><VegaChart spec={specs.ada} data={adaRows} /></div>
          <Chips items={["Required wherever fixed routes run", "Cutting a route can shrink the ADA area"]} />
        </Card>
      </div>
      <Card title="Riders follow service hours, against matched peers">
        <div className="cr-legend"><span><i style={{ background: abNeutral(t) }} />Service hours</span><span><i style={{ background: t.pal.down }} />Riders</span></div>
        <div className="od-vega"><VegaChart spec={specs.path} data={pathRows} /></div>
        <Chips items={[`${busCut.events || "–"} sharp bus cuts, ${busAdd.events || "–"} additions, 2004–2025 outside COVID`, `Cut ${one2(busCut.elasticity_y2)} (${one2(busCut.e_y2_lo)}–${one2(busCut.e_y2_hi)}) · added ${one2(busAdd.elasticity_y2)} (${one2(busAdd.e_y2_lo)}–${one2(busAdd.e_y2_hi)}), year 2`, "Flat before the change"]} />
      </Card>
    </div>
  );
}

const ABOUT = {
  summary:
    "Operating money by source for every agency reporting to the Federal Transit Administration's National Transit Database (NTD), 2015 to 2024; " +
    "monthly riders and service hours January 2002 to August 2026; and public GTFS bus schedules for 43 agencies. Relief money (CARES, CRRSAA, ARP) " +
    "is not a separate column in any NTD table, so the relief gap is the federal operating money above each agency's own 2017–19 federal share.",
  liveLine: (r) => `${abInt(r.agencies)} agencies in 2024, ${abInt(r.agencies_flagged)} flagged, ${abMoney(r.relief_gap_total)} relief gap on ${abMoney(r.operating_budget)} of operating money (counted live).`,
  sources: [
    {
      name: "NTD TS1.2 Operating and Capital Funding Time Series (2024 edition)",
      publisher: "Federal Transit Administration, National Transit Database (transit.dot.gov; retrieved from the Internet Archive copy of 29 April 2026)",
      url: "https://www.transit.dot.gov/ntd/data-product/ts12-operating-funding-time-series",
      coverage: "Operating funds by source (fares and directly generated, local, state, federal) per agency, 1991–2024; 2015–2024 used.",
      rows: "22,573 agency × year rows, 2015–2024",
      refreshed: "Downloaded 7 October 2026. Federal and total match the 2022–24 table to the dollar for 99.8% of agencies.",
      licence: "Public domain, U.S. Government work.",
    },
    {
      name: "NTD 2022–2024 Funding Sources (by expense type, federal, state, local, taxes levied by agency)",
      publisher: "Federal Transit Administration, National Transit Database (data.transportation.gov 4tmr-gwuu, qpjk-b3zw, dd43-h6wv, 8tvb-ywj3, c8k8-y2cj)",
      url: "https://data.transportation.gov/d/4tmr-gwuu",
      coverage: "2022–2024: operating funds by source; general fund vs dedicated taxes (local and state tables mix operating and capital).",
      rows: "about 6,800 agency × year rows per table",
      refreshed: "Downloaded 7 October 2026.",
      licence: "Public domain, U.S. Government work.",
    },
    {
      name: "NTD Complete Monthly Ridership and Time Series 2.1",
      publisher: "Federal Transit Administration, National Transit Database (8bui-9xvu, npsm-38gk)",
      url: "https://data.transportation.gov/d/8bui-9xvu",
      coverage: "Monthly boardings and revenue hours by agency and mode, January 2002 to August 2026; annual cost, fares, trips and hours 2015–2024; ADA paratransit trips 2024.",
      rows: "372,801 monthly rows; 36,945 annual rows",
      refreshed: "Downloaded 6–7 October 2026.",
      licence: "Public domain, U.S. Government work.",
    },
    {
      name: "GTFS schedules via the Mobility Database catalog",
      publisher: "Each agency's published GTFS feed (MobilityData catalog, keyless)",
      url: "https://mobilitydatabase.org",
      coverage: "43 bus agencies including 7 in North Carolina; one Tuesday–Thursday per feed, mostly October 2026 (some 2025).",
      rows: "1,942 bus routes",
      refreshed: "Downloaded 7 October 2026.",
      licence: "Per each agency's feed terms (open data).",
    },
  ],
  checks:
    "Relief flag: in 2018, before relief existed, 3–4% of bus agencies and big systems would have crossed 10% against a 2015–17 baseline; 27–30% cross it in 2024. " +
    "Ranking: the default order is the gap as a share of the 2024 operating budget, for agencies with $10M+ budgets only (below that, a few hundred thousand dollars swing the percentage); dollars are the toggle. " +
    "Both orders are re-run with the 2019 federal share alone as the baseline: #1 is marked with its rank there, and rows that move more than two places are marked. By dollars the top 10 is the same ten agencies on either baseline. " +
    "Service response: 126 sharp bus cuts and 158 additions outside COVID, each against 10 same-size peers whose hours held steady and whose riders tracked it before; the gap in the year before is −0.5%; 95% bands from 500 bootstrap draws. " +
    "An agency-level panel (500 agencies, 2003–2026) gives a similar first year (0.66 for hours below peers, 0.47 above) but a lower second year for cuts (0.55). Fake cut dates and fake cutting agencies show no effect; the cut estimate moves from 0.64 to 0.80 with the cut-size rule. Numbers re-run through Malloyyo match the DuckDB build.",
  definitions: [
    ["Relief gap", "Federal operating money in 2024 minus the agency's 2017–19 federal share × its 2024 operating money (never below zero). Agencies without 2017–19 money use their size class's median."],
    ["Flagged", "Relief gap of 10% or more of the 2024 operating budget."],
    ["No gap", "Relief gap under 1% of the 2024 operating budget."],
    ["Share ranking", "Relief gap ÷ 2024 operating budget, ranked among bus agencies and big systems with a $10M+ operating budget. The default order; the dollar ranking is the toggle."],
    ["Infrequent hours", "The share of the agency's weekday bus hours on routes running every 31 minutes or less often at midday (GTFS) × its 2024 bus revenue hours × hours-driven cost per hour: what those hours cost, not what they carry. Shown only for the 43 agencies whose public schedule is in the sample; ≈ where scheduled and reported hours disagree."],
    ["Riders lost per $1M", "Elasticity × riders per revenue hour × $1M ÷ hours-driven cost per revenue hour (operating cost minus general administration, treated as fixed). Bus uses the event study's year-2 elasticity; rail uses the agency panel's year-1 rail-cut figure (0.30), because only 13 sharp rail cuts exist."],
    ["Kind of bus system", "By 2024 boardings per bus revenue hour: coverage (under 12), mixed (12–20), urban (20–30), busy network (30+)."],
    ["ADA paratransit share", "Demand-response operating cost × the ADA share of its trips, as a share of all operating cost. Required wherever fixed routes run."],
    ["Frequent", "A route with a bus every 15 minutes or better between 10:00 and 15:00 on a weekday, in its busier direction."],
  ],
  caveats: [
    "Agency totals cannot pick routes. Which route to cut needs route-level ridership (automatic passenger counters), which is not public here.",
    "The data does not record why a cut was made. About 40% of the cuts measured are 2009–12, when many agencies cut for budget reasons (inferred from timing); 9 fall in the 2021–23 driver-shortage years.",
    "Relief accounting differs: relief passed through a regional funder can show up as local money, and new state or local money voted in 2025–26 is not in 2024 data, so a gap here is the 2024 exposure, not a 2026 deficit.",
    "The action tag is the cut order the data supports if the gap is closed by cutting service. Fares, taxes and reserves are other ways to close it; this page does not rank them.",
    "Coverage routes lose fewer riders per dollar, but those riders are more likely to have no other way to travel; the NTD has no rider income or car ownership.",
    "Boardings, not people. GoRaleigh's boardings doubled in July 2024 on little more service, likely a counting change (no document found); its 2024 report year ends before the jump.",
    "Elasticity is linear in logs; cuts bigger than about 30% of service are outside most of the evidence.",
  ],
};

// The cut order the data suggests for one agency: close its 2024 gap by cutting its least-used hours first (likely its
// infrequent routes, whose cost is shown when its public schedule is in the sample; which hours carry the fewest riders
// needs its passenger counts). Inferred from the between-agency menu, not measured within the agency.
function actionTags(r, g) {
  if (!r || r.relief_gap == null || !(r.relief_share >= 0.01)) return { none: "no gap" };
  const gap = mBig(r.relief_gap);
  if (!(r.bus_opex > 0)) return { act: `close ${gap} gap: rail only, no bus hours pool` };
  let pool = null;
  if (g && r.bus_vrh_2024 && r.bus_avoidable_cost_per_hour) {
    pool = ((g.share_31_to_60 || 0) + (g.share_over60_or_peak_only || 0)) * r.bus_vrh_2024 * r.bus_avoidable_cost_per_hour;
  }
  const poolTxt = pool == null ? ""
    : `infrequent routes cost ${g.hours_check_flag ? "≈" : ""}${mBig(pool)} a year`;
  return { act: `close ${gap} gap: cut the least-used hours first`, keep: poolTxt || "find them with passenger counts" };
}

// The first screen: agencies ranked by relief gap as a share of budget (or in dollars), #1 highlighted, the selected agency outlined
// (pinned under the list with its rank when it is not in the top rows). Clicking a row selects that agency.
function GapRanking({ rows, selId, by, setBy, onPick, topN, flaggedCount, universe, extraChips, floorChip }) {
  const top = rows.slice(0, topN);
  const sel = selId != null ? rows.find((r) => r.ntd_id === selId) : null;
  const pinned = sel && sel.rank > topN ? sel : null;
  const metric = (r) => (by === "share" ? r.relief_share || 0 : r.relief_gap || 0);
  const max = Math.max(1e-9, ...top.map(metric));
  const row = (r) => {
    const first = r.rank === 1;
    const isSel = r.ntd_id === selId;
    const v = metric(r);
    return (
      <li key={r.ntd_id} className={"rk-row" + (first ? " first" : "") + (isSel ? " sel" : "")} title={r.agency_label}
        onClick={() => onPick(r)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onPick(r); }}>
        <span className="n">{r.rank > 0 ? r.rank : "–"}</span>
        <span className="name">{r.short}{isSel && <span className="you">selected</span>}</span>
        <span className="bar"><i style={{ width: `${Math.min(1, v / max) * 100}%`, background: r.flagged ? "var(--dash-danger)" : "var(--dash-muted)", opacity: first ? 1 : r.flagged ? 0.72 : 0.5 }} /></span>
        <span className="val">{by === "share" ? pc1(r.relief_share) : mBig(r.relief_gap)}<small>{by === "share" ? mBig(r.relief_gap) : pc1(r.relief_share)}</small>{r.flagged ? <small className="flag">relief ≥10% of budget</small> : null}</span>
        <span className="tags">
          {r.tags.act && <span className="act">{r.tags.act}</span>}
          {r.tags.keep && <span className="keep">{r.tags.keep}</span>}
          {r.tags.none && <span className="none">{r.tags.none}</span>}
          {r.stab && <span className="stab">{r.stab}</span>}
        </span>
      </li>
    );
  };
  return (
    <section className="rk" aria-label="Agencies ranked by relief gap">
      <div className="rk-head">
        <h2>Biggest 2024 relief gap{by === "share" ? ", share of budget" : ""}</h2>
        <span className="rk-by" role="group" aria-label="Rank by">
          <button type="button" className={by === "share" ? "on" : ""} onClick={() => setBy("share")}>% of budget</button>
          <button type="button" className={by !== "share" ? "on" : ""} onClick={() => setBy("usd")}>$ gap</button>
        </span>
      </div>
      <ol className="rk-list">
        {top.map(row)}
        {pinned && <li className="rk-gapline" aria-hidden="true">⋯</li>}
        {pinned && row(pinned)}
      </ol>
      <div className="rk-foot">
        <Chips items={[`${universe} bus agencies and big systems · ${flaggedCount} at 10%+ (red)`, floorChip, "Gap = federal money above own 2017–19 share", "Infrequent-route cost shown where the public schedule is in the 43-agency sample", "Agency totals, not routes", ...(extraChips || []), "Click a row to select it"]} />
      </div>
    </section>
  );
}

export default function Dashboard({ givens }) {
  const t = useTheme();
  const narrow = useNarrow();
  const [pickState, setPickState] = useUrlState("st", "");
  // Default: share of budget, the view a transit-finance reader ranks by (dollars mostly sort by size).
  const [by, setBy] = useUrlState("by", "share");
  const [moreOpen, setMoreOpen] = React.useState(false);
  const { set: setAgency } = useGiven("BUDGET_AGENCY");
  const pkQ = useQuery({ query: "bc_pick", givens });
  const miQ = useQuery({ query: "bc_mine", givens });
  const alQ = useQuery({ query: "bc_all", givens });
  const meQ = useQuery({ query: "bc_menu", givens });
  const gtQ = useQuery({ query: "bc_gtfs", givens });
  const evQ = useQuery({ query: "bc_events", givens });
  const abQ = useQuery({ query: "bc_about", givens });
  const all = [pkQ, miQ, alQ, meQ, gtQ, evQ, abQ];
  const error = all.map((q) => q.error).find(Boolean);
  const busy = all.some((q) => q.loading);

  const mine = miQ.rows.find((r) => r.state === pickState) || miQ.rows[0] || null;
  const mineName = mine ? shortName(mine.agency_label) : null;
  const mineShort = mineName ? mineName.replace(/ \([A-Z]{2}\)$/, "") : null;

  // The ranking: every bus agency and big system with a 2024 gap figure, by share of budget (default; $10M+ operating
  // budgets only, so a small agency's noisy percentage cannot top it) or by dollars. The same order against a
  // 2019-only baseline is the stability check (marked on #1 and on rows that move more than 2 places).
  const gtById = React.useMemo(() => new Map(gtQ.rows.map((r) => [r.ntd_id, r])), [gtQ.rows]);
  const ranked = React.useMemo(() => {
    const base = alQ.rows.filter((r) => r.ops_2024 > 0 && r.relief_gap != null && (by !== "share" || r.ops_2024 >= SHARE_FLOOR));
    const key = (r) => (by === "share" ? r.relief_share || 0 : r.relief_gap || 0);
    const altKey = (r) => (by === "share" ? (r.relief_gap_2019base || 0) / r.ops_2024 : r.relief_gap_2019base || 0);
    const alt = new Map([...base].sort((a, b) => altKey(b) - altKey(a)).map((r, i) => [r.ntd_id, i + 1]));
    return [...base].sort((a, b) => key(b) - key(a)).map((r, i) => {
      const rank = i + 1, a2 = alt.get(r.ntd_id);
      const stab = rank === 1 ? (a2 === 1 ? "#1 on a 2019-only baseline too" : `#${a2} on a 2019-only baseline`)
        : rank <= 12 && Math.abs(a2 - rank) > 2 ? `#${a2} on a 2019-only baseline` : null;
      return { ...r, rank, stab, short: clip(shortName(r.agency_label), narrow ? 30 : 38), tags: actionTags(r, gtById.get(r.ntd_id)) };
    });
  }, [alQ.rows, by, gtById, narrow]);
  const flaggedCount = ranked.filter((r) => r.flagged).length;
  // The selected agency when it is outside the ranked set (small / rural / specialty): pinned with no rank.
  const rows = React.useMemo(() => {
    if (!mine || ranked.some((r) => r.ntd_id === mine.ntd_id)) return ranked;
    const why = by === "share" && mine.ops_2024 > 0 && mine.ops_2024 < SHARE_FLOOR && mine.size_class !== "Small / rural / specialty"
      ? `not ranked by share: under $${SHARE_FLOOR / 1e6}M budget` : "not ranked: small / rural / specialty";
    return [...ranked, { ...mine, rank: ranked.length + 1e6, short: clip(shortName(mine.agency_label), 38), tags: { none: why }, unranked: true }];
  }, [ranked, mine, by]);
  const shownRows = React.useMemo(() => rows.map((r) => (r.unranked ? { ...r, rank: -1 } : r)), [rows]);
  const onPick = (r) => { setPickState(r.state); setAgency(filters.oneOf(r.agency_name)); };

  // Proof 1: riders lost per $1M cut, by kind of bus system; the selected agency on top.
  const menuRows = React.useMemo(() => {
    const rows = meQ.rows.map((r) => {
      const k = String(r.bus_type).charAt(0);
      return { name: narrow ? typeLabel(r.bus_type).replace(/ \(.*\)$/, "") : typeLabel(r.bus_type) + " bus", v: r.bus_riders_lost_per_1m_pooled, rph: r.bus_riders_per_hour_pooled, cph: r.bus_cost_per_hour_pooled,
        n: r.agencies, c: k === "1" ? "cov" : k === "4" ? "busy" : "bus", lab: kN(r.bus_riders_lost_per_1m_pooled), ada: r.ada_share_pooled };
    });
    if (mine && mine.bus_riders_lost_per_1m) rows.unshift({ name: mineShort + (mine.bus_type ? ` (${typeLabel(mine.bus_type).replace(/ \(.*\)$/, "").toLowerCase()})` : ""), v: mine.bus_riders_lost_per_1m, rph: mine.bus_riders_per_hour, cph: mine.bus_avoidable_cost_per_hour, c: "mine", lab: kN(mine.bus_riders_lost_per_1m) });
    return rows.map((r, o) => ({ ...r, o }));
  }, [meQ.rows, mine, mineShort, narrow]);
  const cov = meQ.rows.find((r) => String(r.bus_type).startsWith("1")) || {};
  const busyNet = meQ.rows.find((r) => String(r.bus_type).startsWith("4")) || {};
  const menuRatio = cov.bus_riders_lost_per_1m_pooled && busyNet.bus_riders_lost_per_1m_pooled ? busyNet.bus_riders_lost_per_1m_pooled / cov.bus_riders_lost_per_1m_pooled : null;

  // Proof 2: riders after a cut or an addition
  const ev = (d) => evQ.rows.find((r) => r.mode_family === "bus" && r.direction === d) || {};
  const busCut = ev("cut"), busAdd = ev("add");
  const doorRows = React.useMemo(() => {
    const trips = mine && mine.bus_trips_2024 ? mine.bus_trips_2024 : null;
    const rows = [];
    const add = (yr, dir, e, lo, hi, sign) => {
      if (e == null) return;
      const v = sign * e;
      const riders = trips ? sign * trips * e / 100 : null;
      rows.push({ yr, dir, v, band: `${one2(lo)}–${one2(hi)}`, riders,
        lab: `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}%` + (riders != null && !narrow ? ` · ${v > 0 ? "+" : "−"}${kN(Math.abs(riders))}` : "") });
    };
    add("Year 1", "Cut 1%", busCut.elasticity_y1, busCut.e_y1_lo, busCut.e_y1_hi, -1);
    add("Year 1", "Add 1%", busAdd.elasticity_y1, busAdd.e_y1_lo, busAdd.e_y1_hi, 1);
    add("Year 2", "Cut 1%", busCut.elasticity_y2, busCut.e_y2_lo, busCut.e_y2_hi, -1);
    add("Year 2", "Add 1%", busAdd.elasticity_y2, busAdd.e_y2_lo, busAdd.e_y2_hi, 1);
    return rows;
  }, [busCut, busAdd, mine, narrow]);

  // Proof 3: the selected agency's weekday bus hours by midday frequency (what its infrequent routes cost)
  const mineG = mine ? gtById.get(mine.ntd_id) || null : null;
  const hourCost = mine && mine.bus_vrh_2024 && mine.bus_avoidable_cost_per_hour ? mine.bus_vrh_2024 * mine.bus_avoidable_cost_per_hour : null;
  const hoursRows = React.useMemo(() => {
    if (!mineG) return [];
    let x0 = 0;
    return [mineG.share_freq15, mineG.share_16_to_30, mineG.share_31_to_60, mineG.share_over60_or_peak_only].map((v, i) => {
      const s = v || 0;
      const row = { k: HW[i], v: s, x0, x1: x0 + s, mid: x0 + s / 2, cost: hourCost != null ? s * hourCost : null, lab: pc0(s) };
      x0 += s;
      return row;
    }).filter((r) => r.v > 0);
  }, [mineG, hourCost]);
  const freqShare = mineG ? mineG.share_freq15 || 0 : null;
  const coverageShare = mineG ? (mineG.share_31_to_60 || 0) + (mineG.share_over60_or_peak_only || 0) : null;
  const coverageDollars = coverageShare != null && hourCost != null ? coverageShare * hourCost : null;
  const mineRanked = mine ? ranked.find((r) => r.ntd_id === mine.ntd_id) : null;

  const specs = React.useMemo(() => ({
    menu: menuSpec(t, narrow, menuRows.length || 1, Math.max(1, ...menuRows.map((r) => r.v || 0))),
    door: doorSpec(t, narrow, narrow ? 1.1 : 1.5),
    hours: hoursBarSpec(t, narrow),
  }), [t, narrow, menuRows]);

  const events = React.useMemo(() => ({ cut: busCut, add: busAdd }), [busCut, busAdd]);
  const headChips = ["NTD 2024 + monthly to Aug 2026", "Relief is not its own NTD column", "Cut order if cutting; fares and taxes not ranked"];

  return (
    <div className="od">
      <style>{CSS + CSS_ABOUT + BC_CSS}</style>
      <h1>Transit: budget gap and what a cut costs</h1>
      <AgencyPicker agencies={pkQ.rows} mine={mine} setState={setPickState} />
      {!narrow && <HeadCaveat items={headChips} />}
      {error && <div className="err">{String(error)}</div>}
      <div className={busy ? "loading" : ""}>
        {!mine && !busy && <p className="bc-none">No agency matches. Pick one from the list.</p>}
        <GapRanking rows={shownRows} selId={mine ? mine.ntd_id : null} by={by} setBy={setBy} onPick={onPick}
          topN={narrow ? 5 : 10} flaggedCount={flaggedCount} universe={ranked.length} extraChips={narrow ? headChips : null}
          floorChip={by === "share" ? `Share ranking: $${SHARE_FLOOR / 1e6}M+ operating budget only` : null} />
        {narrow && <p className="bc-none"><AboutLink>Sources and definitions</AboutLink></p>}

        <p className="rk-proof">What a cut costs{mineShort ? ` · ${mineShort}` : ""}</p>
        <div className="bc-grid">
          <section className="bc-card wide">
            <div className="hd"><h2>{mineShort ? `${mineShort}: weekday bus hours by midday frequency` : "Weekday bus hours by midday frequency"}</h2></div>
            {mineG ? (
              <>
                <div className="bc-tiles">
                  <div><div className="v good">{pc0(freqShare)}</div><div className="l"><b>Frequent</b> · hours every 15 min or better</div></div>
                  <div><div className="v bad">{mBig(coverageDollars)}</div><div className="l"><b>Infrequent hours</b> · {pc0(coverageShare)} of hours, every 31+ min{mineRanked && mineRanked.relief_gap > 0 ? ` · gap ${mBig(mineRanked.relief_gap)}` : ""}</div></div>
                </div>
                <div className="cr-legend">{HW.map((k, i) => <span key={k}><i style={{ background: hwColors(t)[i] }} />{k}</span>)}</div>
                <div className="od-vega"><VegaChart spec={specs.hours} data={hoursRows} /></div>
              </>
            ) : (
              <p className="bc-none">{mineShort ? `${mineShort}: no public schedule in the 43-agency sample.` : ""} Kind of system: {mine && mine.bus_type ? typeLabel(mine.bus_type) : "–"}.</p>
            )}
            <Chips items={[mineG ? `Weekday schedule, ${abMonth(mineG.service_date)}` : null, mineG && mineG.hours_check_flag ? "Scheduled vs reported hours disagree" : null, "Coverage riders may have no other way to travel", "Route riders not public: check APC data", "Cuts can shrink the ADA area"]} />
          </section>

          <BcCard n={1} title="Riders lost per $1M cut, by kind of agency">
            <div className="od-vega"><VegaChart spec={specs.menu} data={menuRows} /></div>
            <Chips items={[menuRatio ? `Busy network ${menuRatio.toFixed(1)}× coverage, spending-weighted` : null, `Elasticity ${one2(busCut.elasticity_y2)} by year 2`, "Compares agencies, not routes", "Hours-driven cost only", "2024 riders and costs"]} />
          </BcCard>

          <BcCard n={2} title="Riders after a 1% change in bus hours">
            <div className="cr-legend"><span><i style={{ background: t.pal.down }} />Cut 1%</span><span><i style={{ background: t.pal.up }} />Add 1%</span>{mineShort && !narrow && <span>· riders a year at {mineShort}</span>}</div>
            <div className="od-vega"><VegaChart spec={specs.door} data={doorRows} /></div>
            <Chips items={["Riders build up more slowly after additions; research does not settle whether the gap lasts", `${busCut.events || "–"} cuts, ${busAdd.events || "–"} additions vs matched peers`, "95% bands in tooltip"]} />
          </BcCard>
        </div>

        <details className="bc-more" onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
          <summary>More<span>US picture, relief share of every agency, the cut ladder, the evidence</span></summary>
          {moreOpen && <div className="body"><More t={t} narrow={narrow} givens={givens} mine={mine} mineShort={mineShort} menuRows={menuRows} events={events} allRows={alQ.rows} /></div>}
        </details>
      </div>
      <AboutData about={ABOUT} live={abQ.rows[0]} />
    </div>
  );
}
