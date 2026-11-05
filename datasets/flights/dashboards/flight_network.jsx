import React from "react";
import { useQuery, useUrlState } from "@malloyyo/dashboard";

// Self-contained on purpose: a dashboard component can import only React and @malloyyo/dashboard. The map is drawn
// from the airports' own coordinates (no outline file is fetched): each airport is a dot, each route an arc, so the
// network traces the country. Every number on the page comes from nw_airports or nw_routes (flight_network.malloy).

const CSS = `
.fn { box-sizing: border-box; font-family: var(--dash-font, system-ui, sans-serif); color: #e6edf7;
  background: radial-gradient(120% 90% at 30% 0%, #13213f 0%, #0a1226 45%, #060a16 100%);
  border-radius: 16px; padding: 20px 22px 18px; max-width: 1320px; margin: 0 auto; }
.fn *, .fn *::before, .fn *::after { box-sizing: border-box; }
.fn-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 10px 24px; margin-bottom: 10px; }
.fn h1 { font-size: 27px; line-height: 1.15; letter-spacing: -0.015em; margin: 0; font-weight: 700; color: #fff; }
.fn-sub { font-size: 12.5px; color: #8ea0bd; margin: 5px 0 0; }
.fn-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.fn-chip { border: 1px solid rgba(148,180,230,.18); background: rgba(20,34,66,.6); border-radius: 10px; padding: 6px 12px; min-width: 92px; }
.fn-chip b { display: block; font-size: 18px; color: #fff; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.fn-chip span { font-size: 11px; color: #8ea0bd; text-transform: uppercase; letter-spacing: .06em; }
.fn-body { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 16px; align-items: stretch; }
.fn-map { position: relative; min-width: 0; }
.fn-map svg { display: block; width: 100%; height: auto; }
.fn-panel { border: 1px solid rgba(148,180,230,.16); background: rgba(10,18,38,.72); border-radius: 14px; padding: 16px 16px 12px;
  backdrop-filter: blur(6px); min-width: 0; }
.fn-hint { font-size: 12px; color: #fbbf24; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; margin: 0 0 4px; }
.fn-code { font-size: 40px; font-weight: 800; line-height: 1; color: #fbbf24; letter-spacing: -0.02em; }
.fn-city { font-size: 14px; color: #b9c7dd; margin: 4px 0 12px; }
.fn-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.fn text.lbl { paint-order: stroke; stroke: #060a16; stroke-width: 3px; stroke-linejoin: round; }
.fn-kpi { background: rgba(30,48,88,.45); border-radius: 10px; padding: 8px 10px; }
.fn-kpi b { display: block; font-size: 21px; color: #fff; font-variant-numeric: tabular-nums; }
.fn-kpi span { font-size: 11px; color: #8ea0bd; }
.fn-kpi i { font-style: normal; font-size: 11px; color: #6f83a4; display: block; }
.fn-h3 { font-size: 11.5px; text-transform: uppercase; letter-spacing: .08em; color: #8ea0bd; margin: 0 0 6px; font-weight: 700; }
.fn-list { list-style: none; padding: 0; margin: 0; }
.fn-list li { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 4px 6px;
  border-radius: 8px; cursor: pointer; }
.fn-list li:hover { background: rgba(56,189,248,.10); }
.fn-list .c { font-weight: 700; font-size: 13.5px; color: #fff; }
.fn-list .n { font-size: 12px; color: #9fb0c9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fn-list .bar { height: 4px; border-radius: 2px; background: rgba(148,180,230,.15); margin-top: 3px; }
.fn-list .bar i { display: block; height: 100%; border-radius: 2px; background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.fn-list.nat .bar i { background: linear-gradient(90deg, #0ea5e9, #67e8f9); }
.fn-list .v { text-align: right; font-size: 13px; font-variant-numeric: tabular-nums; color: #fff; white-space: nowrap; }
.fn-list .v small { display: block; color: #8ea0bd; font-size: 11px; }
.fn-foot { font-size: 11px; color: #6f83a4; margin-top: 10px; line-height: 1.45; }
.fn-back { float: right; font-size: 11.5px; color: #8ea0bd; background: none; border: 1px solid rgba(148,180,230,.2); border-radius: 999px;
  padding: 2px 10px; cursor: pointer; }
.fn-err { color: #fca5a5; font-size: 13px; white-space: pre-wrap; }
.fn-load { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #8ea0bd; font-size: 14px; }
.fn .ap { cursor: pointer; }
.fn .draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: fn-draw .75s ease-out forwards; }
@keyframes fn-draw { to { stroke-dashoffset: 0; } }
.fn .pulse { transform-box: fill-box; transform-origin: center; animation: fn-pulse 1.6s ease-out infinite; }
@keyframes fn-pulse { 0% { transform: scale(1); opacity: .9; } 100% { transform: scale(3.2); opacity: 0; } }
.fn .fade { transition: opacity .35s; }
@media (max-width: 900px) { .fn-body { grid-template-columns: minmax(0, 1fr); } .fn { padding: 14px 12px; } .fn h1 { font-size: 22px; } }
`;

// ---- formatting ----
const num = (v) => Number(v) || 0;
const isNum = (v) => v != null && !isNaN(Number(v));
const pct1 = (p) => (isNum(p) ? (Number(p) * 100).toFixed(1) + "%" : "–");
const min1 = (v) => (isNum(v) ? Number(v).toFixed(1) + " min" : "–");
const perDay = (v) => (num(v) >= 100 ? Math.round(num(v)).toLocaleString() : num(v) >= 10 ? Math.round(num(v)) : num(v).toFixed(1));
const big = (v) => (num(v) >= 1e6 ? (num(v) / 1e6).toFixed(2) + "M" : Math.round(num(v)).toLocaleString());
const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const cityShort = (c) => String(c || "").split(",")[0];

// ---- projection: Albers equal-area for the lower 48, insets for Alaska, Hawaii and Puerto Rico / USVI ----
const RAD = Math.PI / 180;
function albers(lon0, lat0, p1, p2) {
  const n = (Math.sin(p1 * RAD) + Math.sin(p2 * RAD)) / 2;
  const C = Math.cos(p1 * RAD) ** 2 + 2 * n * Math.sin(p1 * RAD);
  const r0 = Math.sqrt(C - 2 * n * Math.sin(lat0 * RAD)) / n;
  return (lon, lat) => {
    const t = n * (lon - lon0) * RAD;
    const r = Math.sqrt(C - 2 * n * Math.sin(lat * RAD)) / n;
    return [r * Math.sin(t), -(r0 - r * Math.cos(t))];
  };
}
function boxOf(f, lons, lats) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let lo = lons[0]; lo <= lons[1]; lo += (lons[1] - lons[0]) / 12)
    for (let la = lats[0]; la <= lats[1]; la += (lats[1] - lats[0]) / 12) {
      const [x, y] = f(lo, la);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  return { x0, x1, y0, y1 };
}
const W = 960, H = 580;
function makeProjector() {
  const m = 18;
  const regions = {
    L48: { f: albers(-96, 37.5, 29.5, 45.5), lons: [-124.8, -66.9], lats: [24.5, 49.4] },
    AK: { f: albers(-154, 58, 55, 65), lons: [-178, -130], lats: [51, 71.5] },
    HI: { f: albers(-157, 20.5, 8, 18), lons: [-160.3, -154.7], lats: [18.9, 22.3] },
    PR: { f: albers(-66, 18, 8, 18), lons: [-67.3, -64.5], lats: [17.6, 18.6] },
  };
  const b = boxOf(regions.L48.f, regions.L48.lons, regions.L48.lats);
  const s = Math.min((W - 2 * m) / (b.x1 - b.x0), (H - 2 * m - 30) / (b.y1 - b.y0));
  const place = (r, scale, cx, cy) => {
    const bb = boxOf(r.f, r.lons, r.lats);
    const mx = (bb.x0 + bb.x1) / 2, my = (bb.y0 + bb.y1) / 2;
    r.t = (lon, lat) => { const [x, y] = r.f(lon, lat); return [cx + (x - mx) * scale, cy + (y - my) * scale]; };
  };
  place(regions.L48, s, W / 2, m + ((b.y1 - b.y0) * s) / 2);
  place(regions.AK, s * 0.34, 120, H - 78);
  place(regions.HI, s * 0.95, 285, H - 42);
  place(regions.PR, s * 1.3, W - 95, H - 26);
  return (lon, lat) => {
    lon = num(lon); lat = num(lat);
    if (!lon && !lat) return null;
    if (lon > 0) return null; // Guam and Saipan: left off the map, listed in the footnote
    if (lat > 50 && lon < -129) return regions.AK.t(lon, lat);
    if (lon < -150 && lat < 30) return regions.HI.t(lon, lat);
    if (lon > -68.5 && lat < 19.5) return regions.PR.t(lon, lat);
    const q = regions.L48.t(lon, lat);
    q.l48 = true;
    return q;
  };
}
const project = makeProjector();

// Quadratic arc between two points, always bent the same way for a pair so both directions share one curve.
function arcPath(a, b) {
  const [x1, y1] = a, [x2, y2] = b;
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
  const k = Math.min(0.22, 40 / d + 0.12);
  const cx = (x1 + x2) / 2 - dy * k, cy = (y1 + y2) / 2 + dx * k;
  return `M${x1.toFixed(1)},${y1.toFixed(1)}Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

const SKY = "#38bdf8", AMBER = "#fbbf24";

export default function Dashboard() {
  const aq = useQuery({ query: "nw_airports" });
  const rq = useQuery({ query: "nw_routes" });
  const [sel, setSel] = useUrlState("ap", "");
  const [hover, setHover] = React.useState(null);

  const nat = (aq.rows && aq.rows[0]) || null;
  const airports = React.useMemo(() => list(nat && nat.airports).map((a) => ({ ...a, p: project(a.lon, a.lat) })), [nat]);
  const byCode = React.useMemo(() => { const m = {}; airports.forEach((a) => { m[a.origin] = a; }); return m; }, [airports]);
  const routesRow = (rq.rows && rq.rows[0]) || null;
  const outbound = React.useMemo(() => {
    const m = {};
    list(routesRow && routesRow.origins).forEach((o) => { m[o.origin] = list(o.dests); });
    return m;
  }, [routesRow]);

  // Undirected pairs (both directions summed) for the background network: the busiest 1,100 drawn.
  const pairs = React.useMemo(() => {
    const m = {};
    Object.entries(outbound).forEach(([o, ds]) => ds.forEach((d) => {
      const k = o < d.dest ? o + "|" + d.dest : d.dest + "|" + o;
      m[k] = (m[k] || 0) + num(d.flight_count);
    }));
    return Object.entries(m).map(([k, w]) => { const [a, b] = k.split("|"); return { a, b, w }; })
      .filter((x) => byCode[x.a] && byCode[x.b] && byCode[x.a].p && byCode[x.b].p && byCode[x.a].p.l48 && byCode[x.b].p.l48)
      .sort((x, y) => y.w - x.w).slice(0, 1100);
  }, [outbound, byCode]);
  const wMax = pairs.length ? pairs[0].w : 1;
  const fMax = airports.length ? num(airports[0].flight_count) : 1;
  const rad = (a) => 1.4 + 11.5 * Math.sqrt(num(a.flight_count) / fMax);

  const selA = sel && byCode[sel] ? byCode[sel] : null;
  const selDests = selA ? list(outbound[sel]) : [];
  const destSet = new Set(selDests.map((d) => d.dest));
  const dMax = selDests.length ? num(selDests[0].per_day) : 1;
  const errors = [aq, rq].filter((x) => x.error).map((x) => String(x.error));
  const ready = airports.length > 0 && routesRow;
  const top = selDests.slice(0, 7);
  const busiest = airports.slice(0, 7);
  const labelled = new Set(airports.slice(0, 14).map((a) => a.origin));
  const unmapped = airports.filter((a) => !a.p).map((a) => a.origin);

  const pick = (code) => setSel(code === sel ? "" : code);

  return (
    <div className="fn">
      <style>{CSS}</style>
      <div className="fn-head">
        <div>
          <h1>Every route, every airport</h1>
          <p className="fn-sub">US domestic flights, May–July 2026 · BTS on-time data · airport positions from OurAirports · click an airport</p>
        </div>
        {nat && (
          <div className="fn-chips">
            <div className="fn-chip"><b>{big(nat.flight_count)}</b><span>flights</span></div>
            <div className="fn-chip"><b>{num(nat.airport_count)}</b><span>airports</span></div>
            <div className="fn-chip"><b>{routesRow ? num(routesRow.route_count).toLocaleString() : "…"}</b><span>routes</span></div>
            <div className="fn-chip"><b>{pct1(nat.on_time_rate)}</b><span>on time</span></div>
          </div>
        )}
      </div>
      {errors.map((e, i) => <div className="fn-err" key={i}>{e}</div>)}
      <div className="fn-body">
        <div className="fn-map">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of US airports and routes">
            <defs>
              <radialGradient id="fnGlow"><stop offset="0%" stopColor={AMBER} stopOpacity=".55" /><stop offset="100%" stopColor={AMBER} stopOpacity="0" /></radialGradient>
            </defs>
            <g style={{ mixBlendMode: "screen" }} className="fade" opacity={selA ? 0.22 : 1}>
              {pairs.map((x) => {
                const r = Math.sqrt(x.w / wMax);
                return <path key={x.a + x.b} d={arcPath(byCode[x.a].p, byCode[x.b].p)} fill="none" stroke={SKY}
                  strokeOpacity={0.05 + 0.55 * r} strokeWidth={0.35 + 2.4 * r} />;
              })}
            </g>
            {selA && (
              <g key={"sel" + sel} style={{ mixBlendMode: "screen" }}>
                {selDests.map((d) => {
                  const b = byCode[d.dest];
                  if (!b || !b.p || !selA.p) return null;
                  const r = Math.sqrt(num(d.per_day) / dMax);
                  return <path key={d.dest} className="draw" pathLength="1" d={arcPath(selA.p, b.p)} fill="none" stroke={AMBER}
                    strokeOpacity={0.35 + 0.6 * r} strokeWidth={0.6 + 3.2 * r} />;
                })}
              </g>
            )}
            {airports.map((a) => {
              if (!a.p) return null;
              const on = !selA || a.origin === sel || destSet.has(a.origin);
              const r = rad(a);
              return (
                <g key={a.origin} className="ap" onClick={() => pick(a.origin)}
                  onMouseEnter={() => setHover(a.origin)} onMouseLeave={() => setHover(null)}>
                  <circle cx={a.p[0]} cy={a.p[1]} r={Math.max(r, 6)} fill="transparent" />
                  <circle cx={a.p[0]} cy={a.p[1]} r={r} className="fade"
                    fill={a.origin === sel ? AMBER : destSet.has(a.origin) ? "#fde68a" : "#dbeafe"}
                    fillOpacity={on ? 0.92 : 0.18} stroke="#0a1226" strokeWidth={0.6} />
                </g>
              );
            })}
            {airports.filter((a) => a.p && labelled.has(a.origin) && !selA).map((a) => (
              <text key={"l" + a.origin} x={a.p[0] + rad(a) + 2} y={a.p[1] + 3.5} fontSize="11" fontWeight="600" fill="#c7d4e8" className="lbl" pointerEvents="none">{a.origin}</text>
            ))}
            {selA && selA.p && (
              <g pointerEvents="none">
                <circle cx={selA.p[0]} cy={selA.p[1]} r={34} fill="url(#fnGlow)" />
                <circle key={"p" + sel} className="pulse" cx={selA.p[0]} cy={selA.p[1]} r={rad(selA) + 2} fill="none" stroke={AMBER} strokeWidth="2" />
                <text x={selA.p[0] + rad(selA) + 5} y={selA.p[1] - 6} fontSize="16" fontWeight="800" fill={AMBER} className="lbl">{sel}</text>
              </g>
            )}
            {selA && top.slice(0, 5).map((d) => {
              const b = byCode[d.dest];
              return b && b.p ? <text key={"t" + d.dest} x={b.p[0] + rad(b) + 3} y={b.p[1] + 4} fontSize="11.5" fontWeight="700" fill="#fde68a" className="lbl" pointerEvents="none">{d.dest}</text> : null;
            })}
            {hover && byCode[hover] && byCode[hover].p && (
              <g pointerEvents="none">
                <rect x={byCode[hover].p[0] + 10} y={byCode[hover].p[1] - 30} rx="6" width={Math.max(120, cityShort(byCode[hover].city).length * 7 + 60)} height="24" fill="#0b1630" stroke="rgba(148,180,230,.35)" />
                <text x={byCode[hover].p[0] + 18} y={byCode[hover].p[1] - 13} fontSize="12" fill="#fff"><tspan fontWeight="800">{hover}</tspan> {cityShort(byCode[hover].city)} · {perDay(byCode[hover].per_day)}/day</text>
              </g>
            )}
            <text x={W - 12} y={H - 6} textAnchor="end" fontSize="10" fill="#4f6385">Dot = flights from the airport · arc = flights both ways (busiest 1,100 routes in the lower 48)</text>
          </svg>
          {!ready && !errors.length && <div className="fn-load">Loading every flight…</div>}
        </div>

        <aside className="fn-panel">
          {selA ? (
            <>
              <button className="fn-back" onClick={() => setSel("")}>All airports</button>
              <div className="fn-code">{sel}</div>
              <div className="fn-city">{selA.city}</div>
              <div className="fn-kpis">
                <div className="fn-kpi"><b>{perDay(selA.per_day)}</b><span>departures a day</span></div>
                <div className="fn-kpi"><b>{pct1(selA.on_time_rate)}</b><span>on time</span><i>US {pct1(nat.on_time_rate)}</i></div>
                <div className="fn-kpi"><b>{min1(selA.avg_arrival_delay)}</b><span>avg arrival delay</span><i>US {min1(nat.avg_arrival_delay)}</i></div>
                <div className="fn-kpi"><b>{pct1(selA.cancel_rate)}</b><span>cancelled</span><i>US {pct1(nat.cancel_rate)}</i></div>
              </div>
              <div className="fn-h3">Top destinations · {selDests.length} nonstop</div>
              <ul className="fn-list">
                {top.map((d) => (
                  <li key={d.dest} onClick={() => byCode[d.dest] && setSel(d.dest)}>
                    <span className="c">{d.dest}</span>
                    <span><span className="n">{byCode[d.dest] ? cityShort(byCode[d.dest].city) : ""}</span>
                      <div className="bar"><i style={{ width: `${(100 * num(d.per_day)) / dMax}%` }} /></div></span>
                    <span className="v">{perDay(d.per_day)}/day<small>{pct1(d.late_rate)} late</small></span>
                  </li>
                ))}
              </ul>
              <div className="fn-foot">On time = arrived less than 15 minutes late, of flights that operated. Average delay counts early arrivals as negative. Late = 15+ minutes.</div>
            </>
          ) : (
            <>
              <div className="fn-hint">Click any airport</div>
              <div className="fn-city" style={{ marginTop: 0 }}>Its routes light up, with its on-time rate, delays and top destinations.</div>
              {nat && (
                <div className="fn-kpis">
                  <div className="fn-kpi"><b>{perDay(nat.per_day)}</b><span>flights a day, US</span></div>
                  <div className="fn-kpi"><b>{pct1(nat.on_time_rate)}</b><span>on time</span></div>
                  <div className="fn-kpi"><b>{min1(nat.avg_arrival_delay)}</b><span>avg arrival delay</span></div>
                  <div className="fn-kpi"><b>{pct1(nat.cancel_rate)}</b><span>cancelled</span></div>
                </div>
              )}
              <div className="fn-h3">Busiest airports</div>
              <ul className="fn-list nat">
                {busiest.map((a) => (
                  <li key={a.origin} onClick={() => pick(a.origin)}>
                    <span className="c">{a.origin}</span>
                    <span><span className="n">{cityShort(a.city)}</span>
                      <div className="bar"><i style={{ width: `${(100 * num(a.flight_count)) / fMax}%` }} /></div></span>
                    <span className="v">{perDay(a.per_day)}/day<small>{pct1(a.on_time_rate)} on time</small></span>
                  </li>
                ))}
              </ul>
              <div className="fn-foot">BTS Reporting Carrier On-Time Performance, 13 reporting airlines, 92 days.{unmapped.length ? ` Not drawn: ${unmapped.join(", ")} (Guam, Saipan).` : ""}</div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
