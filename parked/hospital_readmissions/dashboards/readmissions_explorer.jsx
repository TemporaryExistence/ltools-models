import React from "react";
import { useQuery, useUrlState, filters } from "@malloyyo/dashboard";

// Readmissions explorer (Medicare HRRP, FY 2026 files). A state tile map shaded by CMS's estimate of net
// readmissions above expected per 1,000 eligible discharges; click a state for its hospitals, ranked by CMS's
// estimate of net readmissions above expected per year (a count, as the model asks); click a hospital for its
// conditions: CMS's predicted rate against the expected rate for the same patients at an average US hospital.
// Imports only React and @malloyyo/dashboard. The map is drawn here as an SVG tile grid (positions hardcoded
// below); nothing is fetched from outside. Every figure comes from the two named queries in
// readmissions_explorer.malloy (measures of measure_results in readmissions.malloy).

// 50 states + DC on an 11 x 8 grid: [column, row].
const TILES = {
  AK: [0, 0], ME: [10, 0],
  VT: [9, 1], NH: [10, 1],
  WA: [0, 2], ID: [1, 2], MT: [2, 2], ND: [3, 2], MN: [4, 2], IL: [5, 2], WI: [6, 2], MI: [7, 2], NY: [8, 2], RI: [9, 2], MA: [10, 2],
  OR: [0, 3], NV: [1, 3], WY: [2, 3], SD: [3, 3], IA: [4, 3], IN: [5, 3], OH: [6, 3], PA: [7, 3], NJ: [8, 3], CT: [9, 3],
  CA: [0, 4], UT: [1, 4], CO: [2, 4], NE: [3, 4], MO: [4, 4], KY: [5, 4], WV: [6, 4], VA: [7, 4], MD: [8, 4], DE: [9, 4],
  AZ: [1, 5], NM: [2, 5], KS: [3, 5], AR: [4, 5], TN: [5, 5], NC: [6, 5], SC: [7, 5], DC: [8, 5],
  OK: [3, 6], LA: [4, 6], MS: [5, 6], AL: [6, 6], GA: [7, 6],
  HI: [0, 7], TX: [3, 7], FL: [8, 7],
};

const NAMES = {
  AK: "Alaska", AL: "Alabama", AR: "Arkansas", AZ: "Arizona", CA: "California", CO: "Colorado", CT: "Connecticut",
  DC: "District of Columbia", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", IA: "Iowa", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", MA: "Massachusetts", MD: "Maryland",
  ME: "Maine", MI: "Michigan", MN: "Minnesota", MO: "Missouri", MS: "Mississippi", MT: "Montana", NC: "North Carolina",
  ND: "North Dakota", NE: "Nebraska", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NV: "Nevada",
  NY: "New York", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VA: "Virginia", VT: "Vermont",
  WA: "Washington", WI: "Wisconsin", WV: "West Virginia", WY: "Wyoming",
};

// Colour: teal = fewer readmissions than expected, coral = more; clamp at +/- 10 per 1,000.
const C = {
  bg: "#090e1c", panel: "#10182b", panel2: "#141e35", line: "#22304f", fg: "#eef2fb", muted: "#8d99b8", dim: "#5d6a8a",
  lo: [22, 199, 170], mid: [44, 56, 84], hi: [255, 92, 112], none: "#1a2238",
};
const CLAMP = 10;
const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
function shade(v) {
  if (v == null || isNaN(v)) return C.none;
  const t = Math.min(1, Math.abs(v) / CLAMP);
  return rgb(mix(C.mid, v < 0 ? C.lo : C.hi, Math.pow(t, 0.6)));
}
const tone = (v, near = 0) => (v == null ? C.muted : v < -near ? rgb(C.lo) : v > near ? rgb(C.hi) : C.fg);

const N = (v) => (v == null || isNaN(Number(v)) ? null : Number(v));
const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const signed = (v, d = 1) => {
  if (v == null) return "–";
  const s = Math.abs(v).toFixed(d);
  if (Number(s) === 0) return (0).toFixed(d);
  return (v < 0 ? "−" : "+") + s;
};
const int = (v) => (v == null ? "–" : Math.round(v).toLocaleString("en-US"));
const big = (v) => (v == null ? "–" : v >= 1e6 ? (v / 1e6).toFixed(2) + "M" : int(v));
const SMALL = new Set(["of", "and", "the", "at", "in", "for", "on"]);
const KEEP = new Set(["UCH", "HCA", "UNC", "UPMC", "VA", "MUSC", "UAB", "UCSF", "UCLA", "UC", "NYU", "OSF", "SSM", "CHI", "II", "III", "LLC", "AHN", "WVU", "UVA", "OU", "KU", "LSU", "UT", "UW", "IU", "MD"]);
function title(s) {
  const raw = String(s || "");
  if (raw !== raw.toUpperCase()) return raw;
  return raw.toLowerCase().split(/(\s+|-|\/)/).map((w, i) => {
    const up = w.toUpperCase();
    if (KEEP.has(up)) return up;
    if (i > 0 && SMALL.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join("");
}

const CSS = `
.rx { box-sizing: border-box; min-height: 100vh; background: radial-gradient(1200px 600px at 20% -10%, #16234a 0%, ${C.bg} 55%) ${C.bg};
  color: ${C.fg}; font-family: "Inter", "SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif; padding: 20px 30px 24px; }
.rx *, .rx *::before, .rx *::after { box-sizing: border-box; }
.rx-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 18px; flex-wrap: wrap; }
.rx-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: ${rgb(C.lo)}; margin: 0 0 8px; }
.rx h1 { font-size: 30px; line-height: 1.1; letter-spacing: -.02em; font-weight: 750; margin: 0; }
.rx-sub { font-size: 13px; color: ${C.muted}; margin: 8px 0 0; max-width: 92ch; line-height: 1.45; }
.rx-kpis { display: flex; gap: 10px; }
.rx-kpi { background: ${C.panel}; border: 1px solid ${C.line}; border-radius: 14px; padding: 10px 16px; min-width: 120px; }
.rx-kpi b { display: block; font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -.01em; }
.rx-kpi span { font-size: 11.5px; color: ${C.muted}; }
.rx-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 18px; align-items: start; }
.rx-card { background: linear-gradient(180deg, ${C.panel2}, ${C.panel}); border: 1px solid ${C.line}; border-radius: 18px; padding: 18px 20px; min-width: 0;
  box-shadow: 0 20px 50px rgba(0,0,0,.35); }
.rx-maphead { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 6px; }
.rx-maphead h2 { font-size: 15px; font-weight: 650; margin: 0; }
.rx-maphead small { color: ${C.muted}; font-size: 12px; }
.rx-map { display: block; width: 100%; height: auto; max-height: calc(100vh - 360px); min-height: 300px; margin: 0 auto; }
.rx-tile { cursor: pointer; transition: transform .18s ease, filter .18s ease; transform-box: fill-box; transform-origin: center;
  animation: rxIn .55s cubic-bezier(.2,.8,.2,1) backwards; }
.rx-tile:hover { filter: brightness(1.25); transform: scale(1.06); }
.rx-tile.sel { transform: scale(1.1); }
.rx-tile.dimmed rect, .rx-tile.dimmed text { opacity: .38; }
@keyframes rxIn { from { opacity: 0; transform: translateY(8px) scale(.9); } to { opacity: 1; transform: none; } }
.rx-ring { animation: rxPulse 1.8s ease-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes rxPulse { 0% { opacity: .9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.35); } }
.rx-legend { display: flex; align-items: center; gap: 14px; margin-top: 10px; flex-wrap: wrap; }
.rx-ramp { flex: 1 1 260px; min-width: 220px; }
.rx-ramp .bar { height: 10px; border-radius: 6px; }
.rx-ramp .ticks { display: flex; justify-content: space-between; font-size: 11px; color: ${C.muted}; margin-top: 5px; font-variant-numeric: tabular-nums; }
.rx-ramp .ends { display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 5px; }
.rx-sw { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: ${C.muted}; }
.rx-sw i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; border: 1px dashed ${C.dim}; background: ${C.none}; }
.rx-note { font-size: 11.5px; color: ${C.dim}; margin: 12px 0 0; line-height: 1.5; }
.rx-side h2 { font-size: 26px; font-weight: 750; letter-spacing: -.02em; margin: 0; }
.rx-side .lbl { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: ${C.muted}; margin: 0 0 6px; }
.rx-hero { display: flex; align-items: baseline; gap: 10px; margin: 8px 0 2px; }
.rx-hero b { font-size: 44px; font-weight: 800; letter-spacing: -.03em; font-variant-numeric: tabular-nums; line-height: 1; }
.rx-hero span { font-size: 13px; color: ${C.muted}; line-height: 1.3; }
.rx-facts { display: flex; gap: 18px; font-size: 12.5px; color: ${C.muted}; margin: 10px 0 14px; flex-wrap: wrap; }
.rx-facts b { color: ${C.fg}; font-variant-numeric: tabular-nums; font-weight: 650; }
.rx-axis { display: grid; grid-template-columns: minmax(0, 1fr) 46%; gap: 10px; align-items: end; font-size: 10.5px; color: ${C.dim}; text-transform: uppercase; letter-spacing: .1em; padding: 0 6px 6px; border-bottom: 1px solid ${C.line}; }
.rx-axis div:last-child { display: flex; justify-content: space-between; }
.rx-list { max-height: max(260px, calc(100vh - 430px)); overflow-y: auto; margin: 0 -6px; padding: 4px 0; scrollbar-width: thin; scrollbar-color: ${C.line} transparent; }
.rx-row { display: grid; grid-template-columns: minmax(0, 1fr) 46%; gap: 10px; align-items: center; padding: 6px 6px; border-radius: 9px; cursor: pointer;
  animation: rxRow .45s ease both; }
.rx-row:hover { background: rgba(255,255,255,.04); }
.rx-row.on { background: rgba(255,255,255,.07); }
@keyframes rxRow { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }
.rx-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rx-name em { font-style: normal; color: ${C.dim}; font-size: 11px; margin-right: 6px; font-variant-numeric: tabular-nums; }
.rx-bar { position: relative; height: 18px; }
.rx-bar .mid { position: absolute; left: 50%; top: -4px; bottom: -4px; width: 1px; background: ${C.dim}; }
.rx-bar .rx-b { position: absolute; top: 3px; height: 12px; border-radius: 3px; animation: rxGrow .6s cubic-bezier(.2,.8,.2,1) both; }
.rx-bar .v { position: absolute; top: 1px; font-size: 11px; font-variant-numeric: tabular-nums; font-weight: 600; }
@keyframes rxGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.rx-detail { margin: 2px 6px 10px; padding: 12px 14px; border-radius: 12px; background: rgba(0,0,0,.25); border: 1px solid ${C.line}; animation: rxIn .35s ease both; }
.rx-detail h3 { font-size: 14px; margin: 0 0 2px; }
.rx-detail .k { font-size: 11.5px; color: ${C.muted}; margin: 0 0 10px; }
.rx-cond { display: grid; grid-template-columns: 128px minmax(0, 1fr) 92px; gap: 10px; align-items: center; padding: 5px 0; font-size: 12px; }
.rx-cond .t { color: ${C.fg}; }
.rx-cond .r { text-align: right; font-variant-numeric: tabular-nums; color: ${C.muted}; font-size: 11.5px; }
.rx-chip { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: ${rgb(C.hi)}; border: 1px solid ${rgb(C.hi)}; border-radius: 999px; padding: 1px 6px; margin-left: 4px; }
.rx-key { display: flex; gap: 14px; font-size: 11px; color: ${C.muted}; margin-top: 8px; flex-wrap: wrap; }
.rx-states { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
.rx-states h4 { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: ${C.muted}; margin: 0 0 6px; font-weight: 700; }
.rx-pill { display: flex; justify-content: space-between; padding: 7px 10px; border-radius: 9px; background: rgba(255,255,255,.03); border: 1px solid ${C.line}; margin-bottom: 6px; cursor: pointer; font-size: 13px; }
.rx-pill:hover { background: rgba(255,255,255,.07); }
.rx-pill b { font-variant-numeric: tabular-nums; }
.rx-hint { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: ${C.fg}; background: rgba(22,199,170,.1); border: 1px solid rgba(22,199,170,.35); border-radius: 999px; padding: 6px 12px; margin-top: 14px; }
.rx-hint i { width: 8px; height: 8px; border-radius: 50%; background: ${rgb(C.lo)}; display: inline-block; animation: rxBlink 1.4s ease-in-out infinite; }
@keyframes rxBlink { 50% { opacity: .25; } }
.rx-back { background: none; border: 1px solid ${C.line}; color: ${C.muted}; border-radius: 999px; padding: 4px 10px; font-size: 11.5px; cursor: pointer; float: right; }
.rx-back:hover { color: ${C.fg}; }
.rx-msg { color: ${C.muted}; font-size: 13px; }
.rx-err { color: ${rgb(C.hi)}; font-size: 13px; white-space: pre-wrap; }
@media (max-width: 980px) { .rx-grid { grid-template-columns: minmax(0, 1fr); } .rx-top { align-items: flex-start; } }
@media (max-width: 560px) { .rx { padding: 18px 16px; } .rx h1 { font-size: 23px; } .rx-kpis { flex-wrap: wrap; } .rx-hero b { font-size: 36px; }
  .rx-cond { grid-template-columns: 96px minmax(0, 1fr) 70px; } .rx-states { grid-template-columns: 1fr; } }
`;

const S = 60, GAP = 6;

function TileMap({ states, sel, onPick }) {
  const byState = new Map(states.map((s) => [s.state, s]));
  const codes = Object.keys(TILES);
  return (
    <svg className="rx-map" viewBox={`-6 -6 ${11 * S + 12} ${8 * S + 12}`} role="img" aria-label="State tile map">
      {codes.map((code) => {
        const [c, r] = TILES[code];
        const s = byState.get(code);
        const v = s ? N(s.net_excess_per_1000) : null;
        const x = c * S, y = r * S, w = S - GAP;
        const isSel = sel === code;
        const light = v != null && Math.abs(v) > CLAMP * 0.55;
        return (
          <g key={code} className={`rx-tile${isSel ? " sel" : ""}${sel && !isSel ? " dimmed" : ""}`}
            style={{ animationDelay: `${(c + r) * 28}ms` }} onClick={() => onPick(code)}>
            <title>{`${NAMES[code]}: ${v == null ? "no figure (outside the payment program)" : signed(v) + " per 1,000 eligible discharges"}`}</title>
            <rect x={x} y={y} width={w} height={w} rx={9} fill={shade(v)}
              stroke={v == null ? C.dim : isSel ? "#ffffff" : "rgba(255,255,255,.06)"} strokeWidth={isSel ? 2.5 : 1}
              strokeDasharray={v == null ? "4 3" : null} />
            {isSel ? <rect className="rx-ring" x={x} y={y} width={w} height={w} rx={9} fill="none" stroke="#ffffff" strokeWidth={2} /> : null}
            <text x={x + w / 2} y={y + w / 2 - 2} textAnchor="middle" fontSize="15" fontWeight="750"
              fill={light ? "#0b1020" : C.fg} style={{ pointerEvents: "none", letterSpacing: ".02em" }}>{code}</text>
            <text x={x + w / 2} y={y + w / 2 + 14} textAnchor="middle" fontSize="11" fontWeight="600"
              fill={light ? "rgba(11,16,32,.75)" : "rgba(238,242,251,.7)"} style={{ pointerEvents: "none", fontVariantNumeric: "tabular-nums" }}>
              {v == null ? "n/a" : signed(v)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Legend() {
  const stops = [];
  for (let i = 0; i <= 20; i++) stops.push(`${shade(-CLAMP + i)} ${(i / 20) * 100}%`);
  return (
    <div className="rx-legend">
      <div className="rx-ramp">
        <div className="ends"><span style={{ color: rgb(C.lo) }}>Fewer than expected</span><span style={{ color: rgb(C.hi) }}>More than expected</span></div>
        <div className="bar" style={{ background: `linear-gradient(90deg, ${stops.join(", ")})` }} />
        <div className="ticks"><span>{"≤ −10"}</span><span>{"−5"}</span><span>0 = expected</span><span>+5</span><span>{"≥ +10"}</span></div>
      </div>
      <span className="rx-sw"><i />No figure: Maryland (outside the payment program)</span>
    </div>
  );
}

function HospitalBars({ rows, sel, onPick, detail }) {
  const max = Math.max(0.5, ...rows.map((h) => Math.abs(N(h.net_excess_readmissions_per_year) || 0)));
  return (
    <div className="rx-list">
      {rows.map((h, i) => {
        const v = N(h.net_excess_readmissions_per_year) || 0;
        const w = (Math.abs(v) / max) * 38;
        const on = sel === h.facility_id;
        return (
          <React.Fragment key={h.facility_id}>
            <div className={`rx-row${on ? " on" : ""}`} style={{ animationDelay: `${Math.min(i, 18) * 22}ms` }}
              onClick={() => onPick(on ? "" : h.facility_id)} title={`${title(h.facility_name)}: ${signed(v)} a year; ${signed(N(h.net_excess_per_1000))} per 1,000 eligible discharges`}>
              <div className="rx-name"><em>{i + 1}</em>{title(h.facility_name)}</div>
              <div className="rx-bar">
                <div className="mid" />
                <div className="rx-b" style={{ width: `${w}%`, left: v < 0 ? `${50 - w}%` : "50%", background: tone(v),
                  transformOrigin: v < 0 ? "right" : "left", animationDelay: `${Math.min(i, 18) * 22 + 80}ms` }} />
                <div className="v" style={v < 0 ? { right: `${50 + w + 2}%`, color: tone(v) } : { left: `${50 + w + 2}%`, color: tone(v) }}>{signed(v)}</div>
              </div>
            </div>
            {on ? detail : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Conditions({ id, hosp }) {
  const q = useQuery({ query: "rx_conditions", givens: { FACILITY: filters.oneOf(id) }, skip: !id });
  const rows = list(q.rows).filter((r) => r.facility_id === id);
  const XMAX = 25;
  const pos = (v) => `${Math.max(0, Math.min(100, (v / XMAX) * 100))}%`;
  return (
    <div className="rx-detail">
      <h3>{title(hosp.facility_name)}</h3>
      <p className="k">{int(N(hosp.discharges))} eligible discharges, three years · {signed(N(hosp.net_excess_per_1000))} per 1,000 · {int(N(hosp.penalized_rows))} penalized condition{N(hosp.penalized_rows) === 1 ? "" : "s"}</p>
      {q.error ? <p className="rx-err">Could not load: {String(q.error.message || q.error)}</p> : null}
      {q.loading && !rows.length ? <p className="rx-msg">Loading conditions…</p> : null}
      {rows.map((r) => {
        const p = N(r.predicted_rate), e = N(r.expected_rate), err = N(r.excess_readmission_ratio);
        const scored = p != null && e != null;
        const col = scored ? tone(p - e) : C.dim;
        return (
          <div className="rx-cond" key={r.condition}>
            <div className="t">{r.condition}</div>
            {scored ? (
              <svg width="100%" height="18" style={{ overflow: "visible" }}>
                <line x1="0" x2="100%" y1="9" y2="9" stroke={C.line} strokeWidth="4" strokeLinecap="round" />
                <line x1={pos(Math.min(p, e))} x2={pos(Math.max(p, e))} y1="9" y2="9" stroke={col} strokeWidth="4" />
                <circle cx={pos(e)} cy="9" r="5.5" fill={C.panel} stroke={C.fg} strokeWidth="1.6" />
                <circle cx={pos(p)} cy="9" r="5" fill={col}><title>{`Predicted ${p.toFixed(1)}%, expected ${e.toFixed(1)}%`}</title></circle>
              </svg>
            ) : <div className="rx-msg" style={{ fontSize: 11.5 }}>Fewer than 25 eligible discharges: not scored</div>}
            <div className="r">
              {scored ? `${p.toFixed(1)}% vs ${e.toFixed(1)}%` : "–"}
              {err != null && r.penalty_indicator ? <span className="rx-chip">Penalized</span> : null}
            </div>
          </div>
        );
      })}
      {rows.length ? (
        <div className="rx-key">
          <span><svg width="12" height="12"><circle cx="6" cy="6" r="4.5" fill={C.panel} stroke={C.fg} strokeWidth="1.5" /></svg> Expected: an average US hospital with the same patients</span>
          <span><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill={rgb(C.hi)} /></svg> This hospital, CMS's predicted (risk-adjusted) rate</span>
          <span>Scale 0 to {XMAX}% readmitted within 30 days. Penalized = excess readmission ratio above the peer-group median.</span>
        </div>
      ) : null}
    </div>
  );
}

export default function Dashboard() {
  const q = useQuery({ query: "readmissions_explorer" });
  const hq = useQuery({ query: "rx_hospitals" });
  const [sel, setSel] = useUrlState("state", "");
  const [hid, setHid] = useUrlState("hospital", "");

  React.useEffect(() => {
    try {
      document.body.style.background = C.bg; document.body.style.margin = "0";
      // The page is already dark: ask colour-inverting browser extensions (Dark Reader) to leave it alone.
      if (!document.querySelector('meta[name="darkreader-lock"]')) {
        const m = document.createElement("meta"); m.name = "darkreader-lock"; document.head.appendChild(m);
      }
    } catch (e) { /* frame */ }
  }, []);

  const nat = q.rows && q.rows[0];
  const states = nat ? list(nat.by_state) : [];
  const hospitals = list(hq.rows);
  const st = states.find((s) => s.state === sel);
  const stHosp = React.useMemo(() => hospitals.filter((h) => h.state === sel), [hospitals, sel]);
  const hosp = stHosp.find((h) => h.facility_id === hid);
  const ranked = states.filter((s) => N(s.net_excess_per_1000) != null && TILES[s.state])
    .sort((a, b) => N(b.net_excess_per_1000) - N(a.net_excess_per_1000));
  const natV = nat ? N(nat.net_excess_per_1000) : null;

  const pickState = (code) => { setHid(""); setSel(code === sel ? "" : code); };

  const v = st ? N(st.net_excess_per_1000) : null;
  return (
    <div className="rx">
      <style>{CSS}</style>
      <div className="rx-top">
        <div>
          <p className="rx-eyebrow">Medicare · 30-day hospital readmissions</p>
          <h1>Which hospitals send patients back?</h1>
          <p className="rx-sub">CMS's estimate of net readmissions above expected per 1,000 eligible discharges: heart attack, heart failure, pneumonia, COPD, bypass surgery and hip/knee replacement. Discharges July 2021 to June 2024, Hospital Readmissions Reduction Program, FY 2026 files.</p>
        </div>
        <div className="rx-kpis">
          <div className="rx-kpi"><b>{nat ? int(N(nat.hospital_count)) : "…"}</b><span>hospitals</span></div>
          <div className="rx-kpi"><b>{nat ? big(N(nat.discharges)) : "…"}</b><span>eligible discharges</span></div>
          <div className="rx-kpi"><b style={{ color: tone(natV, 0.5) }}>{nat ? signed(natV) : "…"}</b><span>US per 1,000</span></div>
        </div>
      </div>

      {q.error ? <p className="rx-err">Could not load: {String(q.error.message || q.error)}</p> : null}

      <div className="rx-grid">
        <div className="rx-card">
          <div className="rx-maphead">
            <h2>By state</h2>
            <small>Click a state</small>
          </div>
          {q.loading && !nat ? <p className="rx-msg">Loading…</p> : <TileMap states={states} sel={sel} onPick={pickState} />}
          <Legend />
          <p className="rx-note">Expected = readmissions an average US hospital would have with the same patients (CMS risk adjustment). These are CMS's shrunken estimates, not counted readmissions; small hospitals are pulled toward expected.</p>
        </div>

        <div className="rx-card rx-side">
          {!st ? (
            <div>
              <p className="lbl">United States</p>
              <div className="rx-hero"><b style={{ color: tone(natV, 0.5) }}>{nat ? signed(natV) : "…"}</b><span>net readmissions above expected<br />per 1,000 eligible discharges</span></div>
              <div className="rx-states">
                <div>
                  <h4>Most above expected</h4>
                  {ranked.slice(0, 5).map((s) => (
                    <div className="rx-pill" key={s.state} onClick={() => pickState(s.state)}><span>{NAMES[s.state]}</span><b style={{ color: tone(N(s.net_excess_per_1000)) }}>{signed(N(s.net_excess_per_1000))}</b></div>
                  ))}
                </div>
                <div>
                  <h4>Most below expected</h4>
                  {ranked.slice(-5).reverse().map((s) => (
                    <div className="rx-pill" key={s.state} onClick={() => pickState(s.state)}><span>{NAMES[s.state]}</span><b style={{ color: tone(N(s.net_excess_per_1000)) }}>{signed(N(s.net_excess_per_1000))}</b></div>
                  ))}
                </div>
              </div>
              <span className="rx-hint"><i />Pick a state to rank its hospitals</span>
            </div>
          ) : (
            <div key={sel}>
              <button className="rx-back" onClick={() => pickState(sel)}>All states</button>
              <p className="lbl">{sel}</p>
              <h2>{NAMES[sel]}</h2>
              {v == null ? (
                <p className="rx-msg" style={{ marginTop: 12 }}>Maryland is outside Medicare's readmissions payment program. Its hospitals have ratios in the file but no eligible discharge counts, so no figure is shown.</p>
              ) : (
                <>
                  <div className="rx-hero"><b style={{ color: tone(v) }}>{signed(v)}</b><span>per 1,000 eligible discharges<br />US: {signed(natV)}</span></div>
                  <div className="rx-facts">
                    <span><b>{int(N(st.hospital_count))}</b> hospitals in the file</span>
                    <span><b>{int(N(st.discharges))}</b> eligible discharges</span>
                    <span><b style={{ color: tone(N(st.net_excess_readmissions_per_year)) }}>{signed(N(st.net_excess_readmissions_per_year), 0)}</b> readmissions a year vs expected</span>
                  </div>
                  <div className="rx-axis"><div>{stHosp.length} hospitals ranked by readmissions a year vs expected</div><div><span>{"\u2190 fewer"}</span><span>{"more \u2192"}</span></div></div>
                  {hq.error ? <p className="rx-err">Could not load hospitals: {String(hq.error.message || hq.error)}</p> : null}
                  {hq.loading && !stHosp.length ? <p className="rx-msg">Loading hospitals…</p> : null}
                  {hq.truncated ? <p className="rx-err">The hospital list was cut: {String(hq.truncated.hint || "")}</p> : null}
                  <HospitalBars rows={stHosp} sel={hid} onPick={setHid}
                    detail={hosp ? <Conditions id={hosp.facility_id} hosp={hosp} /> : null} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
