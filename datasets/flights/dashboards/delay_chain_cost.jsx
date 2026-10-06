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

export default function Dashboard({ dashboard, givens }) {
  const q = useQuery({ query: "delay_chain_cost", givens });
  const k = q.rows[0] || {};
  const slots = k.most_costly_slots || [];
  const airports = k.cost_by_airport || [];
  const slotName = (r) => `${r.airline} · ${r.origin} · ${r.hour_label}`;

  return (
    <div className="od">
      <style>{CSS}</style>
      <h1>{dashboard.title}</h1>
      <Controls />
      {q.error && <div className="err">{String(q.error)}</div>}
      <div className={q.loading ? "loading" : ""}>
        <div className="od-kpis">
          <div className="od-kpi">
            <div className="v">{money(k.total_downstream_cost)}</div>
            <div className="l">Cost of delay chains, May–July 2026</div>
            <div className="s">Late-aircraft minutes on the later flights of aircraft that started the day late</div>
          </div>
          <div className="od-kpi hot">
            <div className="v">{share(k.share_in_top_50_slots)}</div>
            <div className="l">Started by just 50 departure slots</div>
            <div className="s">
              {money(k.cost_in_top_50_slots)} from 50 of {k.slots != null ? k.slots.toLocaleString() : "–"} slots
            </div>
          </div>
          <div className="od-kpi">
            <div className="v">{share(k.share_started_5_to_8am)}</div>
            <div className="l">Started by 5–8am departures</div>
            <div className="s">First flights scheduled 5:00 to 8:59am</div>
          </div>
          <div className="od-kpi">
            <div className="v">{money(slots[0] && slots[0].downstream_cost_usd)}</div>
            <div className="l">Costliest single slot</div>
            <div className="s">{slots[0] ? slotName(slots[0]) : "–"}</div>
          </div>
        </div>

        <div className="od-charts">
          <section className="od-card">
            <h2>The costliest departure slots</h2>
            <p className="sub">Airline · first-flight airport · scheduled hour, ranked nationally</p>
            <Bars
              rows={slots.slice(0, 15).map((r) => ({ ...r, name: `${r.slot_rank}. ${slotName(r)}` }))}
              value="downstream_cost_usd"
              label="name"
              right={(r) => money(r.downstream_cost_usd)}
              note={(r) => `${r.late_first_legs} late starts`}
            />
          </section>
          <section className="od-card">
            <h2>Where the chains start</h2>
            <p className="sub">Cost by airport of the late first flight</p>
            <Bars
              rows={airports}
              value="downstream_cost_usd"
              label="origin"
              right={(r) => money(r.downstream_cost_usd)}
              note={(r) => `${r.late_first_legs.toLocaleString()} late starts`}
            />
          </section>
        </div>

        <section className="od-card od-table-card">
          <h2>Departures to protect first</h2>
          <p className="sub">Where a spare aircraft, more turn time or priority handling would pay back first</p>
          <div className="od-tablewrap">
            <table>
              <thead>
                <tr>
                  <th className="rank">#</th>
                  <th className="agency">Slot</th>
                  <th className="hide-sm">Late first flights</th>
                  <th className="hide-sm">Later-flight delay min</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((r) => (
                  <tr key={r.slot_rank}>
                    <td className="rank">{r.slot_rank}</td>
                    <td className="agency">{slotName(r)}</td>
                    <td className="hide-sm">{r.late_first_legs.toLocaleString()}</td>
                    <td className="hide-sm">{Math.round(r.downstream_late_aircraft_minutes).toLocaleString()}</td>
                    <td className="up">{money(r.downstream_cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <p className="foot">
        Source: BTS on-time performance, May–July 2026. When an aircraft's first flight of the day arrived 15+ minutes
        late, the late-aircraft delay minutes on its later flights that day are attributed to that first flight's
        airline, airport and scheduled hour, at $100.76 a minute (Airlines for America, 2024 average block-minute
        cost). Attribution, not proof every minute was avoidable: storms delay first and later flights together. Slot
        ranks and the top-50 share are national, so they hold when filtered.
      </p>
    </div>
  );
}
