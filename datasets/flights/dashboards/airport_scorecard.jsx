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
  return <div className="od-key">{items.map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>;
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


// ---- About this data ----
const SOURCES = [
  ["Flights", "BTS Reporting Carrier On-Time Performance", "https://www.transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ",
    "US DOT, public domain. 1,851,282 flights, 1 May–31 Jul 2026 (reporting carriers only). Downloaded 6 Oct 2026."],
  ["Airports", "OurAirports", "https://ourairports.com/data/", "Public domain coordinates; nearby = 5+ departures a day within 175 miles (great circle)."],
  ["Weather", "Iowa Environmental Mesonet ASOS/METAR archive", "https://mesonet.agron.iastate.edu/request/download.phtml",
    "National Weather Service observations at the 99 busiest airports, for the storm-day cancellation rate. Downloaded 7 Oct 2026."],
];
const METHOD = [
  "Destinations to pitch = flown 13+ times in 92 days (about weekly) from the nearby NON-hub airports together, and under 13 times from the selected airport. Nearby airports themselves are left out.",
  "Hub = a nearby airport that is an airline hub (American CLT DFW ORD PHL PHX MIA DCA; Delta ATL DTW MSP SLC SEA; United EWR IAD DEN IAH SFO; JFK, LGA, LAX, BOS) or has 300+ departures a day. Hub flights carry connecting passengers, so they are left out of the ranking and listed separately.",
  "Ranked by how many non-hub nearby airports fly the destination, then by their flights a day: several airports around the selected one flying it is a broader demand signal than one airport flying it often. Origin–destination ticket data (DB1B) is not used.",
  "Flights a day = scheduled departures May–Jul ÷ 92. Who flies it = each operating airline's flights a day from each nearby airport (13+ in 92 days).",
  "On time = operated flights arriving within 15 minutes; cancelled = share of scheduled departures; storm-day cancelled = Severe/Extreme days at the airport (99 busiest only).",
];
const CAVEATS = [
  "BTS covers reporting carriers only: Breeze, Avelo, Sun Country and international flights are missing, so some destinations may already be served.",
  "Leisure airports nearby (Myrtle Beach) carry inbound visitors: their flights show demand from the destination end, a lead rather than proof of demand from the selected airport's area.",
  "Regional flights appear under the operating airline (PSA, Republic, Endeavor…), not the brand that sells them (American Eagle, United Express, Delta Connection).",
  "Three months (May–Jul 2026).",
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
// Airline hubs (connecting banks): American CLT DFW ORD PHL PHX MIA DCA; Delta ATL DTW MSP SLC SEA; United EWR IAD DEN IAH SFO;
// plus JFK, LGA, LAX, BOS. Any nearby airport with 300+ departures a day counts as a hub too.
const HUBS = new Set(["CLT", "DFW", "ORD", "PHL", "PHX", "MIA", "DCA", "ATL", "DTW", "MSP", "SLC", "SEA", "EWR", "IAD", "DEN", "IAH", "SFO", "JFK", "LGA", "LAX", "BOS"]);
const cityShort = (c) => String(c || "").split(",")[0].split("/")[0];
const perDay = (v) => (num(v) >= 10 ? Math.round(num(v)) : num(v).toFixed(1));

export default function Dashboard({ dashboard, givens }) {
  const t = useTheme();
  const narrow = useNarrow();
  const og = useGiven("ORIGIN");
  const ov = og.value ? filters.values(String(og.value)) : null;
  const origin = (ov && ov[0]) || givenText(og) || "selected airport";
  // Three requests: the dev server compiles the model once per request, one at a time.
  const apl = useQuery({ query: "ap_airports", givens });
  const pt = useQuery({ query: "ap_pitch", givens });
  const pq = useQuery({ query: "ap_peers_q", givens });
  const all = [apl, pt, pq];
  const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const P = t.pal;
  const style = { "--hot": P.hot, "--sel": P.sel, "--wx": P.wx, "--grey": P.grey, "--good": P.good };

  const peers = list(pq.rows);
  const peerSet = new Set(peers.map((r) => r.peer));
  const home = peers.find((r) => num(r.miles) === 0) || {};
  const others = peers.filter((r) => num(r.miles) > 0);

  // 1. Destinations to pitch.
  const dests = list(pt.rows).filter((r) => !peerSet.has(r.dest));
  const maxD = Math.max(1, ...dests.map((r) => num(r.nearby_per_day)));
  // Regional operators owned by one brand are pitched through that brand.
  const BRAND = { PSA: "American", Envoy: "American", Piedmont: "American", Endeavor: "Delta" };
  // Carrier hubs: their flights to a destination carry connecting passengers, not local demand.
  const hubs = new Set(others.filter((r) => num(r.departures_per_day) >= 300 || HUBS.has(r.peer)).map((r) => r.peer));
  const who = (r, only) => {
    const by = {};
    list(r.carriers).filter((c) => !only || only(c)).forEach((c) => { const b = BRAND[c.airline] || c.airline; (by[b] = by[b] || []).push(c); });
    return Object.entries(by).map(([a, cs]) => ({ a, n: cs.reduce((s, c) => s + num(c.per_day), 0), from: Array.from(new Set(cs.map((c) => c.peer))),
      ops: Array.from(new Set(cs.filter((c) => BRAND[c.airline]).map((c) => c.airline))) }))
      .sort((x, y) => y.n - x.n);
  };
  const nonHub = (c) => !hubs.has(c.peer);
  // Rank on non-hub service: how many non-hub nearby airports fly it, then their flights a day.
  const scored = dests.map((r) => {
    const nh = list(r.carriers).filter(nonHub);
    return { r, nhAirports: new Set(nh.map((c) => c.peer)).size, nhPerDay: nh.reduce((s, c) => s + num(c.per_day), 0) };
  });
  const ranked = scored.filter((x) => x.nhPerDay * 92 >= 13)
    .sort((a, b) => b.nhAirports - a.nhAirports || b.nhPerDay - a.nhPerDay);
  const hubOnlyDests = scored.filter((x) => x.nhPerDay * 92 < 13);
  const maxNH = Math.max(0.01, ...ranked.map((x) => x.nhPerDay));
  const fmtWho = (w) => w.slice(0, 2).map((x) => `${x.a}${x.ops.length ? ` (incl. ${x.ops.join(", ")})` : ""} from ${x.from.join("/")} ${perDay(x.n)}/day`).join(" · ");
  const rows = ranked.map(({ r, nhAirports, nhPerDay }, i) => {
    const w = who(r, nonHub);
    return {
      key: r.dest, rank: i + 1, top: i === 0,
      name: `${r.dest} · ${cityShort(r.dest_city)}`,
      meta: narrow && i > 0 ? null : fmtWho(w),
      frac: nhPerDay / maxNH,
      value: `${perDay(nhPerDay)}/day`, small: `from ${nhAirports} non-hub airport${nhAirports === 1 ? "" : "s"} · ${num(r.home_per_day) > 0 ? perDay(r.home_per_day) + "/day here" : "none here"}`,
      tag: w[0] ? `pitch ${w[0].a}` : null,
    };
  });
  const hubRows = hubOnlyDests.map(({ r }, i) => ({
    key: r.dest, rank: i + 1, name: `${r.dest} · ${cityShort(r.dest_city)}`, meta: fmtWho(who(r)),
    frac: num(r.nearby_per_day) / maxD, value: `${perDay(r.nearby_per_day)}/day`, small: "hub only",
  }));
  const nHead = narrow ? 6 : 9;
  const nonHubPeers = others.filter((r) => !hubs.has(r.peer)).map((r) => r.peer);

  // Proof: reliability vs nearby airports, ranked by on time.
  const rel = peers.slice().sort((a, b) => num(b.on_time_rate) - num(a.on_time_rate));
  const relRows = rel.map((r, i) => ({
    key: r.peer, rank: i + 1, sel: num(r.miles) === 0,
    name: `${r.peer} · ${cityShort(r.city)}`, meta: num(r.miles) === 0 ? "selected" : `${whole(r.miles)} mi`,
    frac: (num(r.on_time_rate) - 0.6) / 0.35, value: pct0(r.on_time_rate) + " on time",
    small: `${pct1(r.cancel_rate)} cancelled${isNum(r.storm_cancel_rate) && r.storm_cancel_rate !== null ? ` · storm days ${pct0(r.storm_cancel_rate)}` : ""}`,
  }));
  const reachRows = peers.slice().sort((a, b) => num(b.nonstop_destinations) - num(a.nonstop_destinations)).map((r, i, arr) => ({
    key: r.peer, rank: i + 1, sel: num(r.miles) === 0, name: `${r.peer} · ${cityShort(r.city)}`,
    meta: `${whole(r.departures_per_day)} departures/day`, frac: num(r.nonstop_destinations) / Math.max(1, num(arr[0].nonstop_destinations)),
    value: `${whole(r.nonstop_destinations)} nonstops`,
  }));
  const homeOnTimeRank = rel.findIndex((r) => num(r.miles) === 0) + 1;

  const loading = all.some((x) => x.loading);
  const ready = !!pq.rows[0] && !pt.loading;

  return (
    <div className="od" style={style}>
      <style>{CSS}</style>
      <h1>{dashboard.title}</h1>
      <p className="od-src">
        BTS flights May–Jul 2026 · airports within 175 miles · OurAirports ·{" "}
        <a href="#about-this-data" onClick={scrollToAbout}>About this data</a>
      </p>
      <AirportPicker given="ORIGIN" rows={apl.rows || []} label="Airport" />
      {all.map((x, i) => x.error && <div className="err" key={i}>{String(x.error)}</div>)}
      {ready && (
        <div className={loading ? "loading" : ""}>
          <Card title={`Destinations flown nearby, not from ${origin}`}
            sub={`${rows.length} destinations · weekly+ from non-hub ${nonHubPeers.join(", ") || "airports (none)"} · ranked by non-hub airports flying it, then flights a day`}>
            <Tags items={[{ text: hubs.size ? `Method: ${Array.from(hubs).join("/")} left out (carrier hub, connecting traffic)` : "Method: no carrier hub nearby", warn: true },
              "Bar = flights a day from non-hub airports", "Tag = airline already flying it there"]} />
            <div style={{ height: 8 }} />
            {rows.length ? <Ranked rows={rows.slice(0, nHead)} /> : <div className="od-src">No destination is flown weekly from a nearby non-hub airport but not from {origin}.</div>}
            {rows.length > nHead && (
              <details>
                <summary>All {rows.length} destinations</summary>
                <Ranked rows={rows.slice(nHead)} />
              </details>
            )}
            {hubRows.length > 0 && (
              <details>
                <summary>{hubRows.length} more flown nearby only from {Array.from(hubs).join("/")} (hub, connecting traffic)</summary>
                <Ranked rows={hubRows} />
              </details>
            )}
          </Card>

          <section className="od-proof">
            <h2>Proof: {origin} against the same airports</h2>
            <div className="od-grid">
              <Card title="On time" sub={`${origin} #${homeOnTimeRank || "–"} of ${rel.length} · arrived within 15 min, May–Jul`}>
                <Ranked rows={relRows} />
              </Card>
              <Card title="Nonstop reach" sub={`Destinations served weekly+ · ${origin} ${whole(home.nonstop_destinations)}`}>
                <Ranked rows={reachRows} />
              </Card>
            </div>
          </section>
        </div>
      )}
      <AboutData />
    </div>
  );
}
