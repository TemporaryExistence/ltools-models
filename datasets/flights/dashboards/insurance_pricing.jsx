import React from "react";
import { VegaChart, filters, useGiven, useQuery } from "@malloyyo/dashboard";

// Self-contained on purpose: a dashboard component can import only React and @malloyyo/dashboard.

const CSS = `
.od { box-sizing: border-box; max-width: 1180px; margin: 0 auto; padding: 24px 24px 40px;
  font-family: var(--dash-font); color: var(--dash-fg); }
.od *, .od *::before, .od *::after { box-sizing: border-box; }
.od h1 { font-size: 26px; line-height: 1.2; letter-spacing: -0.01em; margin: 0 0 6px; }
.od-src { font-size: 13px; color: var(--dash-muted); margin: 0 0 12px; line-height: 1.5; }
.od-src a, .od-about a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.od-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.od-card { border: 1px solid var(--dash-border); border-radius: 12px; padding: 14px 16px 16px; min-width: 0; }
.od-card h2 { font-size: 17px; margin: 0 0 2px; line-height: 1.3; }
.od-card .sub { font-size: 12.5px; color: var(--dash-muted); margin: 0 0 8px; }
.od-vega { width: 100%; min-width: 0; }
.od-vega svg { display: block; max-width: 100%; }
.od .err { color: var(--dash-danger); font-size: 13px; white-space: pre-wrap; }
.od .loading { opacity: .45; transition: opacity .15s; }
.od-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0; font-size: 11.5px; color: var(--dash-muted); }
.od-tags span { border: 1px solid var(--dash-border); border-radius: 999px; padding: 1px 8px; line-height: 1.5; }
.od-tags span.warn { border-color: var(--hot); color: var(--dash-fg); }
.od-key { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--dash-muted); margin: 0 0 6px; }
.od-key i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; vertical-align: middle; margin-right: 5px; }
.od-key i.tick { width: 2px; height: 13px; border-radius: 0; opacity: .55; margin: 0 6px 0 4px; }
.ans { list-style: none; margin: 0; padding: 0; }
.ans li { display: grid; grid-template-columns: 1.9em minmax(0, 1fr) auto; gap: 0 10px; align-items: center;
  padding: 5px 8px; border-radius: 8px; border: 2px solid transparent; }
.ans li + li { margin-top: 2px; }
.ans .rk { font-size: 13px; font-weight: 700; color: var(--dash-muted); font-variant-numeric: tabular-nums; text-align: right; }
.ans .nm { font-size: 14px; line-height: 1.25; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ans .nm em { font-style: normal; color: var(--dash-muted); font-size: 12px; }
.ans .bar { position: relative; height: 7px; margin-top: 4px; border-radius: 4px; background: color-mix(in srgb, var(--dash-border) 70%, transparent); }
.ans .bar i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; background: var(--grey); }
.ans .bar b { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--dash-fg); opacity: .55; }
.ans .rt { text-align: right; font-variant-numeric: tabular-nums; font-size: 13.5px; font-weight: 700; white-space: nowrap; }
.ans .rt small { display: block; font-size: 11.5px; font-weight: 400; color: var(--dash-muted); }
.ans .l1 { display: flex; flex-direction: row-reverse; flex-wrap: nowrap; justify-content: flex-start; align-items: center; gap: 2px 7px; }
.ans .tag { display: inline-block; font-size: 11.5px; font-weight: 600; border-radius: 999px; padding: 1px 8px;
  border: 1px solid var(--dash-border); color: var(--dash-fg); white-space: nowrap; }
.ans li.sel { background: color-mix(in srgb, var(--sel) 13%, transparent); }
.ans li.sel .nm { font-weight: 700; }
.ans li.sel .bar i { background: var(--sel); }
.ans li.top { border-color: var(--hot); background: color-mix(in srgb, var(--hot) 10%, transparent); }
.ans li.top .bar i { background: var(--hot); }
.ans li.top .tag { background: var(--hot); border-color: var(--hot); color: #fff; }
.ans li.top.sel { background: color-mix(in srgb, var(--sel) 16%, transparent); }
.ans li.gap { display: block; text-align: center; color: var(--dash-muted); font-size: 12px; padding: 0; }
.ans .chip { display: inline-block; font-size: 10.5px; font-weight: 700; border-radius: 4px; padding: 0 4px; margin-left: 6px;
  vertical-align: 1px; color: var(--dash-bg); background: var(--wx); }
.ans .chip.th { background: var(--dash-muted); }
.ans .chip.ok { background: var(--good); }
.od-pick { display: inline-flex; align-items: center; gap: 10px; margin: 0 0 14px; font-size: 13px; color: var(--dash-muted); font-weight: 600; }
.od-pick select { font: inherit; font-size: 15px; font-weight: 400; padding: 7px 10px; border: 1px solid var(--dash-border); border-radius: 8px;
  background: var(--dash-control-bg, var(--dash-bg)); color: var(--dash-fg); max-width: 220px; }
.od-proof { margin-top: 26px; }
.od-proof > h2 { font-size: 18px; margin: 0 0 10px; }
.od-proof .od-grid + .od-grid, .od-proof .od-grid + .od-card, .od-proof .od-card + .od-grid { margin-top: 16px; }
.od details { margin-top: 10px; }
.od summary { cursor: pointer; font-size: 13px; color: var(--dash-muted); font-weight: 600; }
@media (max-width: 900px) { .od-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 560px) {
  .od { padding: 14px 12px 32px; }
  .od h1 { font-size: 21px; }
  .od-card { padding: 10px 10px 12px; }
  .ans li { grid-template-columns: 1.5em minmax(0, 1fr) auto; gap: 0 7px; padding: 5px 5px; }
  .ans .nm { font-size: 13px; white-space: normal; }
  .ans .rt { font-size: 12.5px; }
  .ans .l1 { flex-direction: column-reverse; align-items: flex-end; }
  .ans .rt small { white-space: normal; max-width: 9.5em; margin-left: auto; }
}
.od-about { margin-top: 26px; }
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

// ---- formatting ----
const num = (v) => Number(v) || 0;
const isNum = (v) => v != null && !isNaN(Number(v));
const usd = (v) => {
  if (!isNum(v)) return "–";
  const a = Math.abs(Number(v));
  const s = a >= 1e9 ? (a / 1e9).toFixed(2) + "B" : a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M" : a >= 1e3 ? Math.round(a / 1e3) + "k" : Math.round(a).toString();
  return (Number(v) < 0 ? "−$" : "$") + s;
};
const range = (lo, hi) => `${usd(lo)}–${usd(hi).replace("$", "")}`;
const pct0 = (p) => (isNum(p) ? Math.round(Number(p) * 100) + "%" : "–");
const pct1 = (p) => (isNum(p) ? (Number(p) * 100).toFixed(1) + "%" : "–");
const givenText = (g) => (g && g.value ? String(g.value).replace(/\\/g, "") : "");
const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

// ---- theme ----
const PALETTE = {
  light: { hot: "#d4502a", sel: "#2a78d6", wx: "#8a5cd1", grey: "#b8c2cf", good: "#1baf7a" },
  dark: { hot: "#e0623a", sel: "#3987e5", wx: "#9a70e0", grey: "#5c6470", good: "#199e70" },
};
function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (cs.getPropertyValue(name) || "").trim() || fallback;
  const dark = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return {
    dark, fg: v("--dash-fg", dark ? "#ededed" : "#171717"), muted: v("--dash-muted", dark ? "#9ca3af" : "#6b7280"),
    border: v("--dash-border", dark ? "#2a2a2a" : "#e5e7eb"), bg: v("--dash-bg", dark ? "#0a0a0a" : "#ffffff"),
    font: v("--dash-font", "system-ui, sans-serif"), pal: PALETTE[dark ? "dark" : "light"],
  };
}
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
    if (mq.addEventListener) mq.addEventListener("change", update); else mq.addListener(update);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", update) : mq.removeListener(update));
  }, []);
  return theme;
}
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
const vegaConfig = (t) => ({
  background: "transparent", font: t.font, padding: { left: 2, right: 8, top: 6, bottom: 2 }, view: { stroke: null },
  axis: { labelColor: t.muted, titleColor: t.muted, labelFontSize: 12, titleFontSize: 12, titleFontWeight: 600,
    gridColor: t.border, domainColor: t.border, tickColor: t.border, labelPadding: 4, titlePadding: 10 },
  legend: { labelColor: t.fg, titleColor: t.muted, labelFontSize: 12, titleFontSize: 12 },
  text: { color: t.fg, fontSize: 12 },
});

// ---- small components ----
function Card({ title, sub, children }) {
  return <section className="od-card">{title && <h2>{title}</h2>}{sub && <div className="sub">{sub}</div>}{children}</section>;
}
function Tags({ items }) {
  return <div className="od-tags">{items.filter(Boolean).map((c) => <span key={c.text || c} className={c.warn ? "warn" : ""}>{c.text || c}</span>)}</div>;
}
function Key({ items }) {
  return <div className="od-key">{items.map(([label, color, kind]) => <span key={label}><i className={kind === "tick" ? "tick" : ""} style={{ background: color }} />{label}</span>)}</div>;
}
// Ranked answer list: rows = [{ key, rank, name, meta, chips, frac, mark, value, small, tag, top, sel }].
function Ranked({ rows }) {
  return (
    <ol className="ans">
      {rows.map((r) => r.gap ? <li key={r.key} className="gap">⋯</li> : (
        <li key={r.key} className={[r.top ? "top" : "", r.sel ? "sel" : ""].join(" ")}>
          <span className="rk">{r.rank}</span>
          <div style={{ minWidth: 0 }}>
            <div className="nm">{r.name}{(r.chips || []).map((c) => <span key={c.t} className={`chip ${c.k || ""}`}>{c.t}</span>)}{r.meta && <em> · {r.meta}</em>}</div>
            <div className="bar"><i style={{ width: `${Math.max(2, Math.min(1, r.frac) * 100)}%` }} />{r.mark != null && <b style={{ left: `${r.mark * 100}%` }} />}</div>
          </div>
          <div className="rt"><div className="l1"><span>{r.value}</span>{r.tag && <span className="tag">{r.tag}</span>}</div>{r.small && <small>{r.small}</small>}</div>
        </li>
      ))}
    </ol>
  );
}
// Show the first n rows; then the selected rows that fall below them, after a gap marker.
function headPlusSel(rows, n) {
  const head = rows.slice(0, n);
  const rest = rows.slice(n).filter((r) => r.sel).slice(0, 3);
  return rest.length ? [...head, { gap: true, key: "gap" }, ...rest] : head;
}

const whole = (n) => (isNum(n) ? Math.round(Number(n)).toLocaleString() : "–");

// ---- airport picker: searchable by code or city, commits an exact-match filter on the given ----
const PICK_CSS = `
.ap-pick { position: relative; display: inline-block; width: 340px; max-width: 100%; margin: 2px 0 22px; }
.ap-pick label { display: block; font-size: 12px; font-weight: 600; color: var(--dash-muted); margin: 0 0 4px; }
.ap-pick input { width: 100%; font: inherit; font-size: 15px; padding: 9px 34px 9px 12px; border: 1px solid var(--dash-border);
  border-radius: 8px; background: var(--dash-control-bg, var(--dash-bg)); color: var(--dash-fg); }
.ap-pick input:focus { outline: 2px solid var(--dash-accent); outline-offset: -1px; }
.ap-pick .caret { position: absolute; right: 12px; bottom: 12px; pointer-events: none; color: var(--dash-muted); font-size: 11px; }
.ap-pick ul { position: absolute; z-index: 20; left: 0; right: 0; top: 100%; margin: 4px 0 0; padding: 4px; list-style: none;
  max-height: 300px; overflow-y: auto; border: 1px solid var(--dash-border); border-radius: 8px;
  background: var(--dash-bg); box-shadow: 0 8px 24px rgba(0,0,0,.14); }
.ap-pick li { display: flex; gap: 10px; align-items: baseline; padding: 7px 8px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.ap-pick li b { flex: none; width: 3.2em; font-variant-numeric: tabular-nums; }
.ap-pick li span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ap-pick li em { font-style: normal; font-size: 12px; color: var(--dash-muted); }
.ap-pick li.on { background: color-mix(in srgb, var(--dash-accent) 14%, transparent); }
.ap-pick li.none { cursor: default; color: var(--dash-muted); }
`;
function AirportPicker({ given, rows, label }) {
  const g = useGiven(given);
  const vals = g.value ? filters.values(String(g.value)) : null;
  const code = (vals && vals[0]) || givenText(g);
  const byCode = {};
  rows.forEach((r) => { byCode[r.origin] = r; });
  const show = (c) => (c ? (byCode[c] ? `${c} — ${byCode[c].origin_city}` : c) : "");
  const [term, setTerm] = React.useState(null);
  const [act, setAct] = React.useState(0);
  const open = term !== null;
  const q = (term || "").trim().toLowerCase();
  const list = !q ? rows : rows
    .map((r) => {
      const c = String(r.origin).toLowerCase(), city = String(r.origin_city || "").toLowerCase();
      const s = c === q ? 0 : c.startsWith(q) ? 1 : city.startsWith(q) ? 2 : city.includes(q) ? 3 : 9;
      return [s, r];
    })
    .filter(([s]) => s < 9)
    .sort((a, b) => a[0] - b[0])
    .map(([, r]) => r);
  const shown = list.slice(0, 60);
  const pick = (r) => { if (r) g.set(filters.oneOf(String(r.origin))); setTerm(null); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setTerm((t) => (t === null ? "" : t)); setAct((i) => Math.min(i + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAct((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (open) pick(shown[act]); }
    else if (e.key === "Escape") { setTerm(null); e.currentTarget.blur(); }
  };
  return (
    <div className="ap-pick">
      <style>{PICK_CSS}</style>
      <label htmlFor={`pick-${given}`}>{label}</label>
      <input id={`pick-${given}`} role="combobox" aria-expanded={open} aria-autocomplete="list" autoComplete="off" spellCheck={false}
        placeholder="City or code" value={open ? term : show(code)}
        onFocus={() => { setTerm(""); setAct(0); }}
        onBlur={() => setTimeout(() => setTerm(null), 150)}
        onChange={(e) => { setTerm(e.target.value); setAct(0); }}
        onKeyDown={onKey} />
      <span className="caret">▼</span>
      {open && (
        <ul role="listbox">
          {shown.map((r, i) => (
            <li key={r.origin} role="option" aria-selected={i === act} className={i === act ? "on" : ""}
              onMouseDown={(e) => { e.preventDefault(); pick(r); }} onMouseEnter={() => setAct(i)}>
              <b>{r.origin}</b><span>{r.origin_city}</span><em>{whole(r.deps / 92)}/day</em>
            </li>
          ))}
          {shown.length === 0 && <li className="none">No airport matches “{term}”</li>}
        </ul>
      )}
    </div>
  );
}


// ---- chart specs ----
// Bar pairs: share of flights a signal flags vs share of all payouts on those flights.
function signalSpec(t, narrow, origin) {
  const y = { field: "signal", type: "nominal", sort: null, axis: { title: null, labelLimit: narrow ? 160 : 220, labelFontSize: narrow ? 11 : 12,
    labelFontWeight: { condition: { test: `indexof(datum.value, '${origin} ·') === 0`, value: 700 }, value: 400 } } };
  const SER = ["Flights flagged", "Payouts on them"];
  return {
    config: vegaConfig(t),
    height: { step: narrow ? 13 : 15 },
    layer: [
      {
        mark: { type: "bar", cornerRadiusEnd: 2 },
        encoding: { y, yOffset: { field: "series", type: "nominal", sort: SER },
          x: { field: "v", type: "quantitative", scale: { domain: [0, narrow ? 0.8 : 0.7] }, axis: { title: "Share of all flights / all payouts", format: "%", tickCount: narrow ? 4 : 8 } },
          color: { field: "series", type: "nominal", sort: SER, scale: { domain: SER, range: [t.pal.grey, t.pal.hot] }, legend: { orient: "bottom", title: null, columns: narrow ? 1 : 2 } },
          tooltip: [{ field: "signal", title: "Signal" }, { field: "series", title: "" }, { field: "v", type: "quantitative", format: ".1%", title: "Share" }] },
      },
      { mark: { type: "text", align: "left", dx: 4, fontSize: 11, fontWeight: 700, color: t.fg },
        encoding: { y, yOffset: { field: "series", type: "nominal", sort: SER }, x: { field: "v", type: "quantitative" }, text: { field: "v", type: "quantitative", format: ".0%" } } },
    ],
  };
}
// July backtest by decile of the May–June price: paid (bars) vs model price (line) vs one national price (dashed).
function calibSpec(t, narrow) {
  const x = { field: "decile", type: "ordinal", axis: { title: narrow ? "Price group, cheapest → dearest" : "July flights in ten price groups, cheapest → dearest", labelAngle: 0 } };
  const SER = ["Paid in July", "Model price", "One national price"];
  return {
    config: vegaConfig(t),
    height: narrow ? 220 : 260,
    transform: [{ fold: SER, as: ["series", "v"] }],
    layer: [
      {
        transform: [{ filter: "datum.series === 'Paid in July'" }],
        mark: { type: "bar", width: { band: 0.7 }, cornerRadiusTopLeft: 2, cornerRadiusTopRight: 2 },
        encoding: { x, y: { field: "v", type: "quantitative", axis: { title: "Payout per policy", format: "$.0f" } },
          color: { field: "series", type: "nominal", scale: { domain: SER, range: [t.pal.grey, t.pal.hot, t.fg] }, legend: { orient: "bottom", title: null, columns: narrow ? 1 : 3 } },
          tooltip: [{ field: "decile", title: "Group" }, { field: "Paid in July", type: "quantitative", format: "$.2f" }, { field: "Model price", type: "quantitative", format: "$.2f" },
            { field: "One national price", type: "quantitative", format: "$.2f" }] },
      },
      {
        transform: [{ filter: "datum.series !== 'Paid in July'" }],
        mark: { type: "line", strokeWidth: 2.5, point: { filled: true, size: 30 } },
        encoding: { x, y: { field: "v", type: "quantitative" },
          color: { field: "series", type: "nominal", scale: { domain: SER, range: [t.pal.grey, t.pal.hot, t.fg] }, legend: null },
          strokeDash: { field: "series", type: "nominal", scale: { domain: ["Model price", "One national price"], range: [[1, 0], [4, 3]] }, legend: null } },
      },
      {
        transform: [{ filter: "datum.series === 'Paid in July'" }],
        mark: { type: "text", dy: -7, fontSize: 11, fontWeight: 700, color: t.fg },
        encoding: { x, y: { field: "v", type: "quantitative" }, text: { field: "v", type: "quantitative", format: "$.0f" } },
      },
    ],
  };
}


// ---- About this data ----
const SOURCES = [
  ["Flights", "BTS Reporting Carrier On-Time Performance", "https://www.transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ",
    "US DOT, public domain. Every US domestic flight reported, 1 May–31 Jul 2026: 1,851,282 flights, 354 airports. Downloaded 6 Oct 2026."],
  ["Weather observed", "Iowa Environmental Mesonet ASOS/METAR archive", "https://mesonet.agron.iastate.edu/request/download.phtml",
    "Iowa State University, redistributing National Weather Service observations, free. 99 busiest airports, hourly, local time. Downloaded 7 Oct 2026."],
  ["Weather forecast", "NWS Storm Prediction Center convective outlooks, via the IEM point service", "https://mesonet.agron.iastate.edu/json/spcoutlook.py?help",
    "US public domain. Day 1 and Day 2 categorical outlooks (marginal to high severe-thunderstorm risk) at each airport. Downloaded 7 Oct 2026."],
  ["Storm-day loss", "Disruption ledger (A4A block-minute cost; masFlight; EUROCONTROL)", "https://www.airlines.org/dataset/u-s-passenger-carrier-delay-costs/",
    "Delay minutes × $69.07–$100.76 plus cancellations × $5,770–$22,000, by weather band at the departure airport; expected = what the same band cost at the other airports."],
  ["Product terms", "Allianz OneTrip; Chase Sapphire Reserve; Cover-More / Blink", "https://www.allianztravelinsurance.com/travel/insurance-101/trip-delay-insurance-explained.htm",
    "Allianz: 3–6 h minimum delay, $100 a day fixed option. Chase Sapphire Reserve: 6 h or overnight, up to $500. Cover-More Europe (Blink): 3 h delay pays €30 or a lounge pass automatically."],
];
const METHOD = [
  "Sample product (parametric, pays automatically): $200 if the flight is cancelled, $100 if it arrives 3+ h late, another $100 at 6+ h. Expected payout = 200 × P(cancel) + 100 × P(3 h) + 100 × P(6 h).",
  "Price multiple = the cell's expected payout per policy ÷ the US average over all flights May–Jul. Cells are airport × departure-hour band, all airlines together.",
  "Every rate is shrunk toward a broader rate (airport → national, airport × hour → national hour shape, airline cell → the airline's factor). Thin = under 100 flights in the cell over three months: its price is mostly the broader rate. Range = 90% interval (Beta posterior).",
  "Outlook rule: SPC outlook marginal-or-higher at either end, issued the day before (Day 2). Multiple = payout per flagged policy ÷ payout per policy overall (the loss ratio if only flagged buyers bought at the base price).",
  "July test: rates estimated on May–June only; model price re-levelled to July's overall rate; one national price = the May–June national average.",
];
const CAVEATS = [
  "One summer. July was worse than May–June (cancel rate 2.6% vs 1.3%).",
  "Arrival delay of the flight, not the traveller: no connections or rebooking in BTS.",
  "Weather covers the 99 busiest airports; pricing covers all 354.",
  "SPC outlooks forecast severe storms only.",
];
function AboutData() {
  return (
    <section className="od-card od-about" id="about-this-data">
      <h2>About this data</h2>
      <dl>
        {SOURCES.map(([what, name, url, note]) => (
          <React.Fragment key={what}>
            <dt>{what}</dt>
            <dd><a href={url} target="_blank" rel="noopener noreferrer">{name}</a>. {note}</dd>
          </React.Fragment>
        ))}
        <dt>Method</dt>
        <dd><ul>{METHOD.map((m) => <li key={m}>{m}</li>)}</ul></dd>
        <dt>Caveats</dt>
        <dd><ul>{CAVEATS.map((m) => <li key={m}>{m}</li>)}</ul></dd>
      </dl>
    </section>
  );
}
function scrollToAbout(e) {
  if (e) e.preventDefault();
  const el = typeof document !== "undefined" ? document.getElementById("about-this-data") : null;
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

const SIGNALS = { 1: "Day-before storm outlook", 2: "Day-before outlook, slight risk+", 3: "Overnight storm outlook", 6: "Thunder reported 3 h out", 8: "Thunder reported 1 h out" };
const LEAD = { 1: "D−1", 2: "D−1", 3: "~1am", 6: "3 h", 8: "1 h" };
const BAND = (h) => String(h || "").replace(/-/g, "–");
const times1 = (r) => (isNum(r) ? "×" + Number(r).toFixed(1) : "–");
const usd2 = (v) => (isNum(v) ? "$" + Number(v).toFixed(2) : "–");

export default function Dashboard({ dashboard, givens }) {
  const t = useTheme();
  const narrow = useNarrow();
  const og = useGiven("ORIGIN");
  const ov = og.value ? filters.values(String(og.value)) : null;
  const origin = (ov && ov[0]) || givenText(og) || "selected airport";
  // Five requests: the dev server compiles the model once per request, one at a time.
  const apl = useQuery({ query: "ins_airports", givens });
  const cq = useQuery({ query: "ins_cells_all", givens });
  const sg = useQuery({ query: "ins_signals", givens });
  const lg = useQuery({ query: "ins_ledger", givens });
  const ca = useQuery({ query: "ins_calibration_q", givens });
  const all = [apl, cq, sg, lg, ca];
  const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const c0 = cq.rows[0] || {};
  const base = num(c0.expected_payout);
  const P = t.pal;
  const style = { "--hot": P.hot, "--sel": P.sel, "--wx": P.wx, "--grey": P.grey, "--good": P.good };

  // 1. Every airport x hour cell, ranked by price multiple.
  const cellsAll = list(c0.cells).map((r, i) => ({ ...r, rank: i + 1, mult: num(r.expected_payout) / (base || 1) }));
  const maxMult = Math.max(1, ...cellsAll.slice(0, 1).map((r) => r.mult));
  const cellRow = (r) => {
    const thin = num(r.flight_count) < 100;
    return {
      key: `${r.origin}${r.hour_band}`, rank: r.rank, sel: r.origin === origin, top: r.rank === 1,
      name: `${r.origin} ${BAND(r.hour_label)}`,
      chips: thin ? [{ t: "thin · shrunk", k: "th" }] : r.rank === 1 && num(r.flight_count) >= 1000 ? [{ t: "stable: 1,000+ flights", k: "ok" }] : [],
      meta: `${whole(r.flight_count)} flights`,
      frac: r.mult / maxMult, mark: 1 / maxMult,
      value: usd2(r.expected_payout), small: `90%: ${usd2(r.expected_payout_lo).replace(/\.\d\d$/, "")}–${usd2(r.expected_payout_hi).replace(/\.\d\d$/, "").replace("$", "")}`,
      tag: `price ${times1(r.mult)}`,
    };
  };
  const cellRows = cellsAll.map(cellRow);
  const nHead = narrow ? 6 : 9;
  const cellShown = headPlusSel(cellRows, nHead);
  const selCells = cellsAll.filter((r) => r.origin === origin);
  const thinTop = cellsAll.slice(0, 20).filter((r) => num(r.flight_count) < 100).length;
  const top1k = cellsAll.find((r) => num(r.flight_count) >= 1000) || {};

  // 2. Storm-outlook rule.
  const sgr = sg.rows[0] || {};
  const sigNat = list(sgr.nat), sigSel = list(sgr.sel);
  const d2 = sigNat.find((r) => num(r.ord) === 1) || {};
  const maxLift = Math.max(1, ...sigNat.filter((r) => SIGNALS[num(r.ord)]).map((r) => num(r.lift)));
  const ruleRows = sigNat.filter((r) => SIGNALS[num(r.ord)]).map((r, i) => {
    const o = num(r.ord);
    return {
      key: `n${o}`, rank: LEAD[o], top: o === 1,
      name: SIGNALS[o], meta: `flags ${pct0(r.flagged_share)} of flights`,
      frac: num(r.lift) / maxLift, mark: 1 / maxLift,
      value: times1(r.lift), small: `${pct0(r.payout_share)} of payouts`,
      tag: o === 1 ? `surcharge ${times1(r.lift)}` : o >= 6 ? "stop sales" : `surcharge ${times1(r.lift)}`,
    };
  });
  const s1 = sigSel.find((r) => num(r.ord) === 1);
  if (s1 && num(s1.flagged_share) > 0) {
    ruleRows.push({ gap: true, key: "gap" });
    ruleRows.push({ key: "sel1", rank: origin, sel: true, name: `${origin}: day-before outlook`, meta: `flags ${pct0(s1.flagged_share)}`,
      frac: num(s1.lift) / maxLift, mark: 1 / maxLift, value: times1(s1.lift), small: `${pct0(s1.payout_share)} of payouts` });
  }

  // Proof: selected airport by hour band.
  const selMax = Math.max(1, ...selCells.map((r) => r.mult));
  const selHourRows = selCells.slice().sort((a, b) => String(a.hour_band).localeCompare(String(b.hour_band))).map((r) => ({
    ...cellRow(r), top: false, sel: r.mult >= 1.5, rank: `#${r.rank}`, frac: r.mult / selMax, mark: 1 / selMax, tag: null, value: times1(r.mult),
    small: `${usd2(r.expected_payout)} · ${whole(r.flight_count)} flights`, meta: null,
  }));
  // Proof: storm-day exposure by airport (ledger insurer view).
  const lgr = lg.rows[0] || {};
  const stormAll = list(lgr.airports).filter((r) => num(r.flight_count) >= 300).slice().sort((a, b) => num(b.risk_factor) - num(a.risk_factor));
  const maxRf = Math.max(1, ...stormAll.map((r) => num(r.risk_factor)));
  const stormRows = headPlusSel(stormAll.map((r, i) => ({
    key: r.origin, rank: i + 1, sel: r.origin === origin, name: r.origin, meta: `${num(r.days_per_month).toFixed(1)} storm days/mo`,
    frac: num(r.risk_factor) / maxRf, mark: 1 / maxRf, value: times1(r.risk_factor),
    small: `${range(r.expected_loss_per_month_lo, r.expected_loss_per_month_hi)}/mo expected`,
  })), narrow ? 6 : 8);
  // Proof: what a buyer sees coming; July backtest.
  const sigBars = [];
  sigNat.forEach((r) => { const n = SIGNALS[num(r.ord)]; if (n) { sigBars.push({ signal: n, series: "Flights flagged", v: num(r.flagged_share) }); sigBars.push({ signal: n, series: "Payouts on them", v: num(r.payout_share) }); } });
  const cal = list(ca.rows).map((r) => ({ decile: num(r.decile), "Paid in July": num(r.actual_payout), "Model price": num(r.predicted_payout_relevelled), "One national price": num(r.naive_payout) }));

  const specs = React.useMemo(() => ({ sig: signalSpec(t, narrow, origin), cal: calibSpec(t, narrow) }), [t, narrow, origin]);
  const loading = all.some((x) => x.loading);
  const ready = !!cq.rows[0];
  const selBest = selCells[0];

  return (
    <div className="od" style={style}>
      <style>{CSS}</style>
      <h1>{dashboard.title}</h1>
      <p className="od-src">
        National ranking · BTS flights · IEM weather · NWS storm outlooks · May–Jul 2026 · pays $200 cancelled, $100 at 3 h, +$100 at 6 h ·{" "}
        <a href="#about-this-data" onClick={scrollToAbout}>About this data</a>
      </p>
      <AirportPicker given="ORIGIN" rows={apl.rows || []} label="Highlight airport" />
      {all.map((x, i) => x.error && <div className="err" key={i}>{String(x.error)}</div>)}
      {ready && (
        <div className={loading ? "loading" : ""}>
          <div className="od-grid wide">
            <Card title="Surcharge cells: airport × departure hour" sub={`Price ÷ US base ${usd2(base)} · ${origin}'s top cell: ${selBest ? `#${selBest.rank} of ${cellsAll.length.toLocaleString()} (${times1(selBest.mult)})` : "no flights"}`}>
              <Key items={[["#1", P.hot], [origin, P.sel], ["thin = under 100 flights, shrunk", P.grey], ["tick = base price (×1)", t.fg, "tick"]]} />
              <Ranked rows={cellShown} />
              <Tags items={[`${thinTop} of the top 20 are thin`, top1k.rank ? `#1 of cells with 1,000+ flights: ${top1k.origin} ${BAND(top1k.hour_label)}` : null]} />
              <details>
                <summary>Top 60 cells</summary>
                <Ranked rows={cellRows.slice(nHead, 60)} />
              </details>
            </Card>
            <Card title="Storm-outlook rule" sub="Payout per flagged policy ÷ base · all airports · left = when the buyer can know">
              <Key items={[["#1", P.hot], ["tick = no surcharge (×1)", t.fg, "tick"]]} />
              <Ranked rows={ruleRows} />
              <Tags items={["Outlook = NWS severe-storm risk at either end", "Thunder = reported at either end"]} />
            </Card>
          </div>

          <section className="od-proof">
            <h2>Proof</h2>
            <div className="od-grid">
              <Card title={`${origin} by departure hour`} sub="Price multiple vs US base, national rank">
                <Key items={[["tick = base price (×1)", t.fg, "tick"]]} />
                {selHourRows.length ? <Ranked rows={selHourRows} /> : <div className="od-src">No flights from {origin}.</div>}
                <Tags items={["Blue = 1.5× base or more"]} />
              </Card>
              <Card title="Storm-day loss vs what the storm explains" sub="Disruption ledger, Severe/Extreme days at departure · 300+ flights">
                <Key items={[["tick = ×1, as the storm predicts", t.fg, "tick"]]} />
                <Ranked rows={stormRows} />
                <Tags items={["×1 = loses what the same storm cost elsewhere", "Range = expected loss a month"]} />
              </Card>
            </div>
            <div className="od-grid">
              <Card title="What a buyer can see coming" sub="Share of flights flagged vs share of payouts on them">
                <div className="od-vega"><VegaChart spec={specs.sig} data={sigBars} /></div>
              </Card>
              <Card title="July backtest" sub="Priced on May–June, paid in July, by price group">
                <div className="od-vega"><VegaChart spec={specs.cal} data={cal} /></div>
                <Tags items={["631,970 July flights", { text: "July 2× May–June cancellations", warn: true }]} />
              </Card>
            </div>
          </section>
        </div>
      )}
      <AboutData />
    </div>
  );
}
