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
.od-charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
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

export default function Dashboard({ dashboard, givens }) {
  const kpi = useQuery({ query: "ondemand_prospects", givens });
  const contrast = useQuery({ query: "ondemand_contrast", givens });
  const fastest = useQuery({ query: "ondemand_fastest", givens });
  const k = kpi.rows[0] || {};
  const c = contrast.rows[0] || {};
  const ranked = k.ondemand_scaling || [];
  const error = kpi.error || contrast.error || fastest.error;
  const busy = kpi.loading || contrast.loading || fastest.loading;
  const where = givens && givens.STATE ? `all agencies in ${String(givens.STATE).replace(/'/g, "")}` : "all agencies nationwide";
  const topN = Math.min(10, c.ranked_agencies || 10);
  const othersAdded = (k.ondemand_hours_now - k.ondemand_hours_2019) - (c.top10_hours_added || 0);

  return (
    <div className="od">
      <style>{CSS}</style>
      <h1>{dashboard.title}</h1>
      <Controls />
      {error && <div className="err">{String(error)}</div>}
      <div className={busy ? "loading" : ""}>
        <div className="od-kpis">
          <div className="od-kpi cold">
            <div className="v">{pct(k.ondemand_change_vs_2019)}</div>
            <div className="l">On-demand hours since 2019, {where}</div>
            <div className="s">
              {compact(k.ondemand_hours_2019)} → {compact(k.ondemand_hours_now)} hours a year
            </div>
          </div>
          <div className="od-kpi hot">
            <div className="v">{pct(c.top10_growth)}</div>
            <div className="l">Top {topN} agencies by hours added, combined</div>
            <div className="s">
              {plusCompact(c.top10_hours_added)} hours; everyone else {plusCompact(othersAdded)}
            </div>
          </div>
          <div className="od-kpi">
            <div className="v">
              {c.growing_agencies ?? "–"} <span style={{ fontWeight: 400, color: "var(--dash-muted)" }}>/</span>{" "}
              {c.shrinking_agencies ?? "–"}
            </div>
            <div className="l">Agencies growing / shrinking</div>
            <div className="s">of {c.ranked_agencies ?? "–"} with 20k+ hours in 2019</div>
          </div>
          <div className="od-kpi">
            <div className="v">{k.ondemand_agencies ?? "–"}</div>
            <div className="l">Agencies running on-demand</div>
            <div className="s">{compact(k.ondemand_trips_now)} trips in the last 12 months</div>
          </div>
        </div>

        <div className="od-charts">
          <section className="od-card">
            <h2>Most on-demand hours added since 2019</h2>
            <p className="sub">Yearly vehicle revenue hours, last 12 months vs 2019</p>
            <Bars
              rows={ranked.slice(0, 12)}
              value="hours_added"
              label="agency"
              right={(r) => plusCompact(r.hours_added)}
              note={(r) => pct(r.growth)}
            />
          </section>
          <section className="od-card">
            <h2>Fastest growth since 2019</h2>
            <p className="sub">Agencies with 20k+ on-demand hours in 2019</p>
            <Bars
              rows={fastest.rows}
              value="growth"
              label="agency"
              right={(r) => pct(r.growth)}
              note={(r) => `${compact(r.hours_2019)} → ${compact(r.hours_now)} hrs`}
            />
          </section>
        </div>

        <section className="od-card od-table-card">
          <h2>Prospect list: agencies adding the most on-demand service</h2>
          <p className="sub">Top {ranked.length} by hours added, last 12 months vs 2019</p>
          <div className="od-tablewrap">
            <table>
              <thead>
                <tr>
                  <th className="rank">#</th>
                  <th className="agency">Agency</th>
                  <th className="hide-sm">Hours 2019</th>
                  <th className="hide-sm">Hours now</th>
                  <th>Added</th>
                  <th>Growth</th>
                  <th className="hide-sm">Trips now</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.agency}>
                    <td className="rank">{i + 1}</td>
                    <td className="agency">{r.agency}</td>
                    <td className="hide-sm">{compact(r.hours_2019)}</td>
                    <td className="hide-sm">{compact(r.hours_now)}</td>
                    <td className={r.hours_added > 0 ? "up" : ""}>{plusCompact(r.hours_added)}</td>
                    <td>{pct(r.growth)}</td>
                    <td className="hide-sm">{compact(r.trips_now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <p className="foot">
        Source: FTA National Transit Database, monthly ridership. Demand-response vehicle revenue hours, calendar 2019
        vs September 2025 to August 2026. Rankings include agencies with more than 20,000 hours in 2019. Demand
        response includes mandated ADA paratransit, so not all growth is discretionary microtransit.
      </p>
    </div>
  );
}
