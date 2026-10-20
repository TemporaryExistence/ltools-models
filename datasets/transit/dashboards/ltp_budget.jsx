import { useQuery, VegaChart } from "@malloyyo/dashboard";

const int = (v) => (v == null ? "–" : Math.round(Number(v)).toLocaleString());
const pct = (v, d = 0) => (v == null ? "–" : (Number(v) * 100).toFixed(d) + "%");
const bn = (v) => (v == null ? "–" : "$" + (Number(v) / 1e9).toFixed(1) + "B");
const cell = { padding: "6px 10px", borderBottom: "1px solid #ddd", textAlign: "right" };
const left = { ...cell, textAlign: "left" };

function Stat({ value, label }) {
  return (
    <div style={{ minWidth: 170, maxWidth: 240 }}>
      <div style={{ fontSize: 36, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#555" }}>{label}</div>
    </div>
  );
}

const pathSpec = {
  mark: { type: "line", tooltip: true },
  height: 220,
  width: "container",
  encoding: {
    x: { field: "t", type: "quantitative", title: "Months from the change" },
    y: { field: "riders_change", type: "quantitative", title: "Riders vs matched peers", axis: { format: "%" } },
    color: { field: "dir", type: "nominal", title: null },
  },
};

export default function Dashboard() {
  const cliff = useQuery({ malloy: `run: relief_by_year -> national_cliff` });
  const menu = useQuery({ malloy: `run: budget_agency -> cut_menu_by_type` });
  const typ = useQuery({ malloy: `run: cut_menu_typical -> typical` });
  const head = useQuery({ malloy: `run: service_change_summary -> headline` });
  const path = useQuery({ malloy: `run: service_change_path -> path` });
  const mine = useQuery({ malloy: `run: budget_agency -> agency_cut_menu` });
  const years = cliff.rows ?? [];
  const y22 = years.find((r) => Number(r.report_year) === 2022);
  const y23 = years.find((r) => Number(r.report_year) === 2023);
  const y24 = years.find((r) => Number(r.report_year) === 2024);
  const busCut = (head.rows ?? []).find((r) => r.mode_family === "bus" && r.direction === "cut");
  const busAdd = (head.rows ?? []).find((r) => r.mode_family === "bus" && r.direction === "add");
  const m = (mine.rows ?? [])[0];
  const typRow = (t) => (typ.rows ?? []).find((r) => r.bus_type === t) || {};
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 980 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600 }}>Transit budget cuts: what each choice costs in riders</h1>
      <p style={{ maxWidth: 740 }}>
        Pandemic federal relief money is running out. If an agency closes the gap by cutting bus service, riders fall
        by about two-thirds of a percent for each 1% of service hours cut in the first year, measured against similar
        agencies that didn't cut. Whether a dollar of cuts costs fewer riders on lightly used service, the data can't settle.
      </p>
      {cliff.error ? <p>Could not load: {String(cliff.error)}</p> : cliff.loading || !y24 ? <p>Loading…</p> : (
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", margin: "16px 0" }}>
          <Stat value={bn(y22.relief_gap_total) + " → " + bn(y24.relief_gap_total)}
                label={"Federal operating money above each agency's own 2017-19 federal share, 2022 → 2024 (" + bn(y23 && y23.relief_gap_total) + " in 2023)"} />
          {busCut ? <Stat value={Number(busCut.elasticity_y1).toFixed(2)}
                label={"% of riders lost per 1% of bus hours cut, year one (" + busCut.events + " cuts, band " +
                       Number(busCut.e_y1_lo).toFixed(2) + "-" + Number(busCut.e_y1_hi).toFixed(2) + ")"} /> : null}
          {busAdd ? <Stat value={Number(busAdd.elasticity_y1).toFixed(2)}
                label={"% of riders gained per 1% of bus hours added, year one (" + busAdd.events + " additions)"} /> : null}
        </div>
      )}
      <h2 style={{ fontSize: 17, fontWeight: 600, marginTop: 20 }}>Riders lost a year per $1M of bus service cut</h2>
      <p style={{ maxWidth: 740, fontSize: 14 }}>
        Agencies grouped by how busy their buses are (2024 riders per service hour). Typical = the median bus agency or big
        system; all agencies = weighted by bus spending, where the largest systems dominate. At the year-two response
        ({busCut ? Number(busCut.elasticity_y2).toFixed(2) : "–"} per 1% of hours) and hours-driven cost per hour, assuming riders respond the same way at every
        kind of agency. The two methods disagree on that: the agency-by-agency method finds about the same first-year
        response everywhere; the cut-by-cut method finds smaller responses at busier agencies, which would erase most of the gap.
        It compares agencies, not routes: which hours inside one agency carry the fewest riders needs its own passenger
        counts, which are not public.
      </p>
      {menu.error ? <p>Could not load: {String(menu.error)}</p> : menu.loading ? <p>Loading…</p> : (
        <table style={{ borderCollapse: "collapse", fontSize: 14 }}>
          <thead><tr>
            <th style={left}>Kind of bus system</th><th style={cell}>Agencies (typical)</th><th style={cell}>Riders per hour, typical</th>
            <th style={cell}>Cost per hour, typical</th><th style={cell}>Riders lost per $1M, typical</th><th style={cell}>Riders lost per $1M, all agencies</th>
          </tr></thead>
          <tbody>{(menu.rows ?? []).map((r) => (
            <tr key={String(r.bus_type)}>
              <td style={left}>{String(r.bus_type).replace(/^\d /, "")}</td><td style={cell}>{int(typRow(r.bus_type).agencies)}</td>
              <td style={cell}>{typRow(r.bus_type).riders_per_hour_median == null ? "–" : Number(typRow(r.bus_type).riders_per_hour_median).toFixed(1)}</td>
              <td style={cell}>{"$" + int(typRow(r.bus_type).cost_per_hour_median)}</td>
              <td style={cell}>{int(typRow(r.bus_type).riders_lost_per_1m_median)}</td>
              <td style={cell}>{int(r.bus_riders_lost_per_1m_pooled)}</td>
            </tr>))}</tbody>
        </table>
      )}
      <h2 style={{ fontSize: 17, fontWeight: 600, marginTop: 24 }}>After a sharp change: riders against matched peers</h2>
      <p style={{ maxWidth: 740, fontSize: 14 }}>
        Riders drop quickly after a cut. After service is added they build up more slowly in the first year; by year two
        the gap narrows, and published research does not settle which way it runs.
      </p>
      {path.error ? <p>Could not load: {String(path.error)}</p> : path.loading ? <p>Loading…</p> : (
        <VegaChart spec={pathSpec} data={path.rows ?? []} />
      )}
      <h2 style={{ fontSize: 17, fontWeight: 600, marginTop: 24 }}>One agency: {m ? String(m.agency_label) : "…"}</h2>
      {mine.error ? <p>Could not load: {String(mine.error)}</p> : mine.loading || !m ? <p>Loading…</p> : (
        <>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", margin: "12px 0" }}>
            <Stat value={pct(m.local_general_fund_share)} label="Operating money from the city or county general fund (estimated split)" />
            <Stat value={(Number(m.relief_share) < 0.001 ? "under 0.1%" : pct(m.relief_share, 1)) + " / " + pct(m.relief_share_2019base, 1)} label="Relief money still in its 2024 budget, against its 2017-19 / 2019-only federal share (share of operating money)" />
            <Stat value={int(m.bus_riders_lost_per_1m)} label="Bus riders lost a year per $1M cut, by year two" />
            <Stat value={int(m.riders_lost_10pct_bus)} label={"Riders lost a year by a cut that saves 10% of the bus budget (about " + pct(m.hours_share_cut_10pct_budget) + " of bus hours, " + pct(m.share_of_bus_riders_lost_10pct) + " of bus riders)"} />
          </div>
          <p style={{ maxWidth: 740, fontSize: 14 }}>
            Based on the agency's 2024 report year (service may have changed since), at the study's central year-two response, with overhead ({pct(1 - m.bus_avoidable_cost_per_hour * m.bus_trips_2024 / m.bus_riders_per_hour / m.bus_opex)} of bus cost) treated as fixed.{String(m.agency_label).startsWith("City of Raleigh") ? " Counted boardings more than doubled in July 2024, likely a counting change; if the new count is right, these figures are higher." : ""} Paratransit (ADA) is {pct(m.ada_share_opex)} of its operating cost.
            It can't be cut on its own: it must cover the area and hours the fixed routes serve, so cutting routes or
            hours can shrink it.
          </p>
        </>
      )}
      <p style={{ fontSize: 12, color: "#666", marginTop: 24 }}>
        Source: FTA National Transit Database (funding 2015-2024, monthly ridership 2002-2026). The relief measure finds
        agencies still running on relief in 2024; agencies that spent it in 2021-23 are not flagged. Cuts are compared
        with up to 10 similar agencies whose service held steady.
      </p>
    </div>
  );
}
