import React from "react";
import { Controls, useQuery } from "@malloyyo/dashboard";

// Self-contained on purpose: a dashboard component can import only React and @malloyyo/dashboard.

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
.od-charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; }
.od-stack { display: grid; gap: 16px; min-width: 0; }
.od-card { border: 1px solid var(--dash-border); border-radius: 12px; padding: 18px 20px 20px; min-width: 0; }
.od-card h2 { font-size: 17px; margin: 0 0 4px; line-height: 1.3; }
.od-card .sub { font-size: 13px; color: var(--dash-muted); margin: 0 0 16px; }
.od-row { margin: 0 0 14px; }
.od-row .top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 14px; }
.od-row .name { min-width: 0; overflow-wrap: anywhere; }
.od-row .val { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.od-row .val small { font-weight: 400; color: var(--dash-muted); font-size: 12px; margin-left: 6px; }
.od-track { height: 16px; margin-top: 5px; border-radius: 4px; background: color-mix(in srgb, var(--dash-border) 55%, transparent); }
.od-bar { height: 100%; border-radius: 4px; background: var(--dash-accent); min-width: 2px; }
.od-bar.neg { background: var(--dash-danger); opacity: .75; }
.od-table-card { margin-top: 16px; }
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
@media (max-width: 900px) {
  .od-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .od-charts { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .od { padding: 18px 16px 32px; }
  .od h1 { font-size: 22px; }
  .od-kpi { padding: 12px 14px; }
  .od-kpi .v { font-size: 26px; }
  .od-kpi .l { font-size: 13px; }
  .od-card { padding: 14px 14px 16px; }
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
const money = (n) => (n == null || isNaN(n) ? "–" : "$" + compact(n));
const share = (p) => (p == null || isNaN(p) ? "–" : Math.round(p * 100) + "%");

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

// The survey reports most names in capitals; show them in title case.
const titleCase = (s) =>
  s && s === s.toUpperCase()
    ? s.toLowerCase().replace(/(^|[\s\-/(.])([a-z])/g, (m, a, b) => a + b.toUpperCase())
    : s;
const bandName = (b) => (b ? String(b).replace(/^\d+ /, "") : "–");
const pct1 = (p) => (p == null || isNaN(p) ? "–" : (p * 100).toFixed(1) + "%");

export default function Dashboard({ dashboard, givens }) {
  const q = useQuery({ query: "econtent_prospects_dashboard", givens });
  const k = q.rows[0] || {};
  const prospects = (k.prospects || []).map((r) => ({ ...r, name: `${titleCase(r.system)} (${r.state})` }));
  const bySize = (k.room_by_size || []).map((r) => ({ ...r, name: bandName(r.band) }));
  const byState = k.room_by_state || [];
  const topShare = k.total_room ? k.top_25_room / k.total_room : null;

  return (
    <div className="od">
      <style>{CSS}</style>
      <h1>{dashboard.title}</h1>
      <Controls />
      {q.error && <div className="err">{String(q.error)}</div>}
      <div className={q.loading ? "loading" : ""}>
        <div className="od-kpis">
          <div className="od-kpi">
            <div className="v">{money(k.total_room)}</div>
            <div className="l">Collection budget that could move to digital</div>
            <div className="s">If every system below its size's typical digital share matched it</div>
          </div>
          <div className="od-kpi hot">
            <div className="v">{share(topShare)}</div>
            <div className="l">Of that room sits in the top 25 systems</div>
            <div className="s">{money(k.top_25_room)} across 25 of {k.systems_below_band != null ? k.systems_below_band.toLocaleString() : "–"} prospects</div>
          </div>
          <div className="od-kpi">
            <div className="v">{k.systems_below_band != null ? k.systems_below_band.toLocaleString() : "–"}</div>
            <div className="l">Systems below typical for their size</div>
            <div className="s">of {k.systems_benchmarked != null ? k.systems_benchmarked.toLocaleString() : "–"} benchmarked, FY2024</div>
          </div>
          <div className="od-kpi">
            <div className="v">{pct1(k.median_digital_share)}</div>
            <div className="l">Median digital share of borrowing</div>
            <div className="s">Systems in this view</div>
          </div>
        </div>

        <div className="od-charts">
          <section className="od-card">
            <h2>Biggest room for digital content</h2>
            <p className="sub">Budget that would move to digital, by library system</p>
            <Bars
              rows={prospects.slice(0, 15)}
              value="room"
              label="name"
              right={(r) => money(r.room)}
              note={(r) => `${share(r.digital_share)} digital · typical ${share(r.typical_for_band)}`}
            />
          </section>
          <div className="od-stack">
            <section className="od-card">
              <h2>Room by system size</h2>
              <p className="sub">Population served; typical digital share in each</p>
              <Bars
                rows={bySize}
                value="room"
                label="name"
                right={(r) => money(r.room)}
                note={(r) => `${r.systems.toLocaleString()} systems · typical ${share(r.typical_for_band)}`}
              />
            </section>
            <section className="od-card">
              <h2>Room by state</h2>
              <p className="sub">Top {Math.min(10, byState.length)} states</p>
              <Bars rows={byState.slice(0, 10)} value="room" label="state" right={(r) => money(r.room)} />
            </section>
          </div>
        </div>

        <section className="od-card od-table-card">
          <h2>Prospect list</h2>
          <p className="sub">Systems below the typical digital share for their size, ranked by room</p>
          <div className="od-tablewrap">
            <table>
              <thead>
                <tr>
                  <th className="rank">#</th>
                  <th className="agency">System</th>
                  <th className="hide-sm">Collection budget</th>
                  <th>Digital</th>
                  <th className="hide-sm">Typical</th>
                  <th>Room</th>
                </tr>
              </thead>
              <tbody>
                {prospects.slice(0, 25).map((r, i) => (
                  <tr key={r.name + i}>
                    <td className="rank">{i + 1}</td>
                    <td className="agency">{r.name}</td>
                    <td className="hide-sm">{money(r.collection_budget)}</td>
                    <td>{share(r.digital_share)}</td>
                    <td className="hide-sm">{share(r.typical_for_band)}</td>
                    <td className="up">{money(r.room)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <p className="foot">
        Source: IMLS Public Libraries Survey, FY2024. Digital share is digital borrowing over all borrowing. Typical is
        the median for the system's size band (population served) across all US systems, whatever state is picked.
        Room is collection budget times the gap to that median, for systems below it. It assumes peers' digital share
        is the right target; some communities borrow more print by choice.
      </p>
    </div>
  );
}
