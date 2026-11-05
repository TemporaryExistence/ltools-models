import React from "react";
import { useQuery, useUrlState } from "@malloyyo/dashboard";

// Self-contained on purpose: a dashboard component can import only React and @malloyyo/dashboard. The clock is
// drawn in SVG; the map is drawn on a canvas from the crashes' own latitude and longitude (no outline file is fetched):
// every crash traces the country's roads, and the selected hour's crashes sit on top. A click runs no query. Every number on the
// page comes from cc_clock or cc_peds (crash_clock.malloy).

const CSS = `
.cc { box-sizing: border-box; font-family: var(--dash-font, system-ui, sans-serif); color: #efe9f4;
  background: radial-gradient(110% 90% at 20% 0%, #2a1530 0%, #140b1c 50%, #0b0710 100%);
  border-radius: 16px; padding: 20px 22px 16px; max-width: 1320px; margin: 0 auto; }
.cc *, .cc *::before, .cc *::after { box-sizing: border-box; }
.cc-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 10px 24px; margin-bottom: 8px; }
.cc h1 { font-size: 27px; line-height: 1.15; letter-spacing: -0.015em; margin: 0; font-weight: 700; color: #fff; }
.cc-sub { font-size: 12.5px; color: #a893b5; margin: 5px 0 0; }
.cc-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.cc-chip { border: 1px solid rgba(240,160,200,.16); background: rgba(50,24,58,.55); border-radius: 10px; padding: 6px 12px; min-width: 92px; }
.cc-chip b { display: block; font-size: 18px; color: #fff; font-variant-numeric: tabular-nums; }
.cc-chip span { font-size: 11px; color: #a893b5; text-transform: uppercase; letter-spacing: .06em; }
.cc-body { display: grid; grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr); gap: 18px; align-items: start; }
.cc-clock svg, .cc-map svg { display: block; width: 100%; height: auto; }
.cc-clock .cell { cursor: pointer; transition: opacity .2s; }
.cc-clock .cell:hover { stroke: #fff; stroke-width: 1.2; }
.cc-panel { border: 1px solid rgba(240,160,200,.14); background: rgba(20,10,28,.7); border-radius: 14px; padding: 14px 16px 12px; min-width: 0; }
.cc-sel { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.cc-sel b { font-size: 30px; color: #ff8a5c; letter-spacing: -0.01em; }
.cc-sel span { font-size: 14px; color: #d8c6e2; }
.cc-map { position: relative; margin: 4px 0 6px; }
.cc-legend { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 11.5px; color: #a893b5; margin-top: 4px; }
.cc-legend i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-left: 8px; }
.cc-legend i.hot { background: #ff6e32; margin-left: 0; }
.cc-legend i.cool { background: #8c69b4; }
.cc-bars { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.cc-bar { background: rgba(60,28,70,.4); border-radius: 10px; padding: 8px 10px 10px; }
.cc-bar b { font-size: 22px; color: #fff; font-variant-numeric: tabular-nums; display: block; }
.cc-bar span { font-size: 11.5px; color: #c7b2d4; display: block; margin-bottom: 6px; }
.cc-bar .t { position: relative; height: 6px; border-radius: 3px; background: rgba(255,255,255,.06); }
.cc-bar .t i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 3px; background: linear-gradient(90deg, #e0405e, #ff9a5a); }
.cc-bar .t u { position: absolute; top: -5px; bottom: -5px; width: 3px; margin-left: -1px; border-radius: 1px; background: #fde047; box-shadow: 0 0 5px rgba(253,224,71,.8); }
.cc-bar small { display: block; font-size: 11px; color: #9a84a8; margin-top: 6px; }
.cc-foot { font-size: 11px; color: #85709a; margin-top: 10px; line-height: 1.45; }
.cc-err { color: #fca5a5; font-size: 13px; white-space: pre-wrap; }
.cc .pop { animation: cc-pop .5s ease-out both; }
@keyframes cc-pop { from { opacity: 0; } to { opacity: 1; } }
@media (max-width: 900px) { .cc-body { grid-template-columns: minmax(0, 1fr); } .cc { padding: 14px 12px; } .cc h1 { font-size: 22px; } }
`;

// ---- formatting ----
const num = (v) => Number(v) || 0;
const isNum = (v) => v != null && !isNaN(Number(v));
const pct0 = (p) => (isNum(p) ? Math.round(Number(p) * 100) + "%" : "–");
const whole = (v) => Math.round(num(v)).toLocaleString();
const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const DAYS = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY3 = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hourText = (h) => (h === 0 ? "12 AM" : h < 12 ? h + " AM" : h === 12 ? "12 PM" : h - 12 + " PM");

// ---- colour: dark plum -> crimson -> orange -> pale yellow ----
const STOPS = [[27, 16, 53], [91, 26, 107], [181, 35, 94], [240, 87, 58], [253, 180, 75], [255, 243, 176]];
function heat(t) {
  t = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(t)), f = t - i;
  const c = STOPS[i].map((v, k) => Math.round(v + (STOPS[i + 1][k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// ---- clock geometry: 24 hours clockwise from midnight at the top, 7 rings (Sunday inside), a gap for labels ----
const CX = 280, CY = 285, R0 = 62, RW = 26, GAP = 22;
const SPAN = (360 - GAP) / 24;
const ang = (h) => GAP / 2 + h * SPAN; // degrees clockwise from 12 o'clock
const pt = (deg, r) => [CX + r * Math.sin((deg * Math.PI) / 180), CY - r * Math.cos((deg * Math.PI) / 180)];
function sector(h, ring) {
  const a0 = ang(h) + 0.35, a1 = ang(h + 1) - 0.35, ri = R0 + ring * RW + 0.8, ro = R0 + (ring + 1) * RW - 0.8;
  const [x0, y0] = pt(a0, ro), [x1, y1] = pt(a1, ro), [x2, y2] = pt(a1, ri), [x3, y3] = pt(a0, ri);
  return `M${x0},${y0}A${ro},${ro} 0 0 1 ${x1},${y1}L${x2},${y2}A${ri},${ri} 0 0 0 ${x3},${y3}Z`;
}

// ---- map projection: Albers equal-area, Alaska and Hawaii as insets ----
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
const MW = 700, MH = 430;
function makeProjector() {
  const m = 10;
  const regions = {
    L48: { f: albers(-96, 37.5, 29.5, 45.5), lons: [-124.8, -66.9], lats: [24.5, 49.4] },
    AK: { f: albers(-154, 58, 55, 65), lons: [-178, -130], lats: [51, 71.5] },
    HI: { f: albers(-157, 20.5, 8, 18), lons: [-160.3, -154.7], lats: [18.9, 22.3] },
  };
  const b = boxOf(regions.L48.f, regions.L48.lons, regions.L48.lats);
  const s = Math.min((MW - 2 * m) / (b.x1 - b.x0), (MH - 2 * m - 24) / (b.y1 - b.y0));
  const place = (r, scale, cx, cy) => {
    const bb = boxOf(r.f, r.lons, r.lats);
    const mx = (bb.x0 + bb.x1) / 2, my = (bb.y0 + bb.y1) / 2;
    r.t = (lon, lat) => { const [x, y] = r.f(lon, lat); return [cx + (x - mx) * scale, cy + (y - my) * scale]; };
  };
  place(regions.L48, s, MW / 2, m + ((b.y1 - b.y0) * s) / 2);
  place(regions.AK, s * 0.32, 78, MH - 52);
  place(regions.HI, s * 0.95, 200, MH - 28);
  return (lon, lat) => {
    lon = num(lon); lat = num(lat);
    if (!lon && !lat) return null;
    if (lat > 50 && lon < -129) return regions.AK.t(lon, lat);
    if (lon < -150 && lat < 30) return regions.HI.t(lon, lat);
    if (lon > -60 || lat < 17) return null;
    return regions.L48.t(lon, lat);
  };
}
const project = makeProjector();

// Parse a cell's "lat,lon;lat,lon" string into projected map points (once per cell, cached).
function parsePoints(s) {
  const out = [];
  if (!s) return out;
  for (const pair of String(s).split(";")) {
    const k = pair.indexOf(",");
    if (k < 0) continue;
    const p = project(Number(pair.slice(k + 1)), Number(pair.slice(0, k)));
    if (p) out.push(p);
  }
  return out;
}

// Canvas map: every crash on the clock in faint purple (traces the roads), the selected cell's crashes bright on top.
function CrashMap({ all, sel, selKey }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = MW * dpr; cv.height = MH * dpr;
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, MW, MH);
    g.fillStyle = "rgba(130, 100, 175, 0.13)";
    for (const p of all) g.fillRect(p[0] - 0.45, p[1] - 0.45, 0.9, 0.9);
    let start = null, raf = 0;
    const n = sel.length;
    const step = (ts) => {
      if (start === null) start = ts;
      const k = Math.min(1, (ts - start) / 450);
      g.save();
      g.fillStyle = "rgba(255, 110, 50, 0.82)";
      const from = Math.floor(n * (step.done || 0)), to = Math.floor(n * k);
      for (let i = from; i < to; i++) { const p = sel[i]; g.beginPath(); g.arc(p[0], p[1], 1.9, 0, 6.2832); g.fill(); }
      g.restore();
      step.done = k;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [all, sel, selKey]);
  return <canvas ref={ref} style={{ width: "100%", height: "auto", aspectRatio: `${MW} / ${MH}`, display: "block" }} />;
}

function Bar({ label, cell, all }) {
  const ok = isNum(cell);
  const max = Math.max(num(cell), num(all), 0.01) * 1.15;
  return (
    <div className="cc-bar">
      <span>{label}</span>
      <b>{ok ? pct0(cell) : "…"}</b>
      <div className="t"><i style={{ width: `${(100 * num(cell)) / max}%` }} /><u style={{ left: `${(100 * num(all)) / max}%` }} /></div>
      <small>{pct0(all)} across all hours (yellow tick)</small>
    </div>
  );
}

export default function Dashboard() {
  const clock = useQuery({ query: "cc_clock" });
  const peds = useQuery({ query: "cc_peds" });
  const [selKey, setSelKey] = useUrlState("cell", "1-2"); // "weekday-hour"; default Sunday 2 AM

  const C = (clock.rows && clock.rows[0]) || null;
  const P = (peds.rows && peds.rows[0]) || null;
  const cells = list(C && C.cells);
  const key = (c) => num(c.day_of_week_code) + "-" + num(c.hour);
  const pts = React.useMemo(() => { const m = {}; cells.forEach((c) => { m[key(c)] = parsePoints(c.points); }); return m; }, [C]);
  const allPts = React.useMemo(() => [].concat(...Object.values(pts)), [pts]);
  const pedBy = React.useMemo(() => { const m = {}; list(P && P.cells).forEach((c) => { m[key(c)] = c; }); return m; }, [P]);
  const vals = cells.map((c) => num(c.deaths));
  const vMax = vals.length ? Math.max(...vals) : 1, vMin = vals.length ? Math.min(...vals) : 0;
  const peak = cells.reduce((a, c) => (!a || num(c.deaths) > num(a.deaths) ? c : a), null);

  const [selD, selH] = String(selKey).split("-").map(Number);
  const X = cells.find((c) => key(c) === selKey) || null;
  const PX = pedBy[selKey] || null;
  const selPts = pts[selKey] || [];
  const errors = [clock, peds].filter((x) => x.error).map((x) => String(x.error));

  return (
    <div className="cc">
      <style>{CSS}</style>
      <div className="cc-head">
        <div>
          <h1>When and where Americans die on the road</h1>
          <p className="cc-sub">Every fatal crash, NHTSA FARS {C ? `${C.first_year}–${C.last_year}` : ""} · deaths by hour and weekday · click any cell</p>
        </div>
        {C && (
          <div className="cc-chips">
            <div className="cc-chip"><b>{whole(C.deaths)}</b><span>deaths</span></div>
            <div className="cc-chip"><b>{whole(C.fatal_crashes)}</b><span>fatal crashes</span></div>
            {peak && <div className="cc-chip"><b>{DAY3[num(peak.day_of_week_code)]} {hourText(num(peak.hour))}</b><span>deadliest hour · {whole(peak.deaths)}</span></div>}
          </div>
        )}
      </div>
      {errors.map((e, i) => <div className="cc-err" key={i}>{e}</div>)}
      <div className="cc-body">
        <div className="cc-clock">
          <svg viewBox="0 0 560 580" role="img" aria-label="Clock of road deaths by hour and weekday">
            {cells.map((c) => {
              const d = num(c.day_of_week_code), h = num(c.hour);
              return (
                <path key={d + "-" + h} className="cell" d={sector(h, d - 1)} fill={heat((num(c.deaths) - vMin) / (vMax - vMin || 1))}
                  onClick={() => setSelKey(d + "-" + h)}>
                  <title>{`${DAYS[d]} ${hourText(h)}: ${whole(c.deaths)} deaths`}</title>
                </path>
              );
            })}
            {X && (
              <path d={sector(selH, selD - 1)} fill="none" stroke="#fff" strokeWidth="3" pointerEvents="none"
                style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,.9))" }} />
            )}
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const [x, y] = pt(0, R0 + (d - 0.5) * RW);
              return <text key={"d" + d} x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight={d === selD ? 800 : 600}
                fill={d === selD ? "#fff" : "#b9a3c7"}>{DAY3[d]}</text>;
            })}
            {Array.from({ length: 24 }, (_, h) => {
              const [x, y] = pt(ang(h + 0.5), R0 + 7 * RW + 16);
              const major = h % 3 === 0;
              return <text key={"h" + h} x={x} y={y + 4} textAnchor="middle" fontSize={major ? 12.5 : 9.5} fontWeight={h === selH ? 800 : major ? 700 : 400}
                fill={h === selH ? "#fff" : major ? "#d8c6e2" : "#7d6890"}>{major ? hourText(h).replace(" ", "").toLowerCase() : h % 12}</text>;
            })}
            {X && (
              <g key={"c" + selKey} className="pop">
                <text x={CX} y={CY - 12} textAnchor="middle" fontSize="12" fill="#c7b2d4">{DAY3[selD]} {hourText(selH)}</text>
                <text x={CX} y={CY + 14} textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">{whole(X.deaths)}</text>
                <text x={CX} y={CY + 30} textAnchor="middle" fontSize="10.5" fill="#a893b5">deaths</text>
              </g>
            )}
            {cells.length > 0 && (
              <g transform="translate(150, 560)">
                {Array.from({ length: 30 }, (_, i) => <rect key={i} x={i * 9} y={0} width={9.5} height={8} fill={heat(i / 29)} />)}
                <text x={-6} y={8} textAnchor="end" fontSize="10.5" fill="#a893b5">{whole(vMin)}</text>
                <text x={276} y={8} fontSize="10.5" fill="#a893b5">{whole(vMax)} deaths in the hour</text>
              </g>
            )}
            {!C && !errors.length && <text x={CX} y={CY} textAnchor="middle" fontSize="14" fill="#a893b5">Loading 222,695 crashes…</text>}
          </svg>
        </div>

        <div className="cc-panel">
          <div className="cc-sel">
            <b>{selD ? `${DAYS[selD]}, ${hourText(selH)}` : "Pick an hour"}</b>
            {X && <span>{whole(X.deaths)} deaths in {whole(X.fatal_crashes)} crashes</span>}
          </div>
          <div className="cc-map">
            <CrashMap all={allPts} sel={selPts} selKey={selKey} />
            {X && <div className="cc-legend"><i className="hot" /> {whole(X.mapped_crashes)} mapped crashes this hour <i className="cool" /> all {whole(allPts.length)} mapped crashes</div>}
          </div>
          {X && (
            <div className="cc-bars">
              <Bar label="Alcohol-impaired driving" cell={X.alcohol_impaired_share} all={C.alcohol_impaired_share} />
              <Bar label="Speeding-related" cell={X.speeding_related_share} all={C.speeding_related_share} />
              <Bar label="Pedestrians killed" cell={PX && PX.pedestrian_share_of_deaths} all={P && P.pedestrian_share_of_deaths} />
            </div>
          )}
          <div className="cc-foot">Shares of deaths. Alcohol: NHTSA's imputed alcohol-impaired-driving deaths. Speeding: crashes NHTSA codes speeding-related.
            Pedestrians: pedestrians killed (FARS person file). 2024 is NHTSA's Annual Report File, not final. Positions rounded to about 1 km.
            {C ? ` The hour is unknown for ${(num(C.hour_unknown_share) * 100).toFixed(1)}% of deaths, which are left off the clock.` : ""}</div>
        </div>
      </div>
    </div>
  );
}
