import React from "react";
import { VegaChart, useQuery, useUrlState } from "@malloyyo/dashboard";

// Medicare readmissions (HRRP FY2026): one panel per finding (true excess and its cost by condition; penalized
// hospitals' gaps against chance; a hospital lookup, default the Raleigh area), with valuations and limits.
// Self-contained on purpose: a dashboard component can import only React and @malloyyo/dashboard. Every query is a
// whole template literal over the published model (views and measures of index.malloy), so the same component
// works as a repo dashboard and as an instance draft. Every figure on the page comes from these queries.


const CSS = `
.od { box-sizing: border-box; max-width: 1120px; margin: 0 auto; padding: 28px 24px 40px;
  font-family: var(--dash-font); color: var(--dash-fg); }
.od *, .od *::before, .od *::after { box-sizing: border-box; }
.od h1 { font-size: 28px; line-height: 1.2; letter-spacing: -0.01em; margin: 0 0 10px; max-width: 44ch; }
.od .lede { font-size: 15px; line-height: 1.5; margin: 0 0 6px; max-width: 86ch; }
.od-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0 24px; }
.od-kpi { border: 1px solid var(--dash-border); border-radius: 12px; padding: 14px 16px; min-width: 0; }
.od-kpi .v { font-size: 30px; font-weight: 700; line-height: 1.05; font-variant-numeric: tabular-nums; color: var(--dash-accent); }
.od-kpi .r { font-size: 12px; color: var(--dash-muted); margin-top: 4px; }
.od-kpi .l { font-size: 14px; font-weight: 600; margin-top: 8px; line-height: 1.3; }
.od-card { border: 1px solid var(--dash-border); border-radius: 12px; padding: 18px 20px 20px; min-width: 0; margin-top: 16px; }
.od-card h2 { font-size: 18px; margin: 0 0 6px; line-height: 1.3; }
.od-card .tag { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--dash-accent); margin: 0 0 4px; }
.od-card p { font-size: 14px; line-height: 1.5; margin: 0 0 10px; max-width: 90ch; }
.od-card .act { border-left: 3px solid var(--dash-accent); padding-left: 10px; color: var(--dash-fg); }
.od-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start; margin: 8px 0 6px; }
.od-two h3 { font-size: 14px; margin: 0 0 6px; }
.od-tablewrap { overflow-x: auto; }
.od table { width: 100%; border-collapse: collapse; font-size: 14px; font-variant-numeric: tabular-nums; }
.od th { text-align: right; font-size: 12px; font-weight: 600; color: var(--dash-muted); padding: 6px 8px;
  border-bottom: 1px solid var(--dash-border); vertical-align: bottom; line-height: 1.3; }
.od td { text-align: right; padding: 7px 8px; border-bottom: 1px solid var(--dash-border); white-space: nowrap; }
.od th:first-child, .od td:first-child { text-align: left; padding-left: 0; white-space: normal; }
.od-chips { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0; padding: 0; }
.od-chips li { font-size: 12px; line-height: 1.3; color: var(--dash-muted); border: 1px solid var(--dash-border); border-radius: 999px; padding: 3px 9px; }
.od .err { color: var(--dash-danger); font-size: 13px; white-space: pre-wrap; }
.od .muted { color: var(--dash-muted); font-size: 13px; }
.od-vega svg { display: block; max-width: 100%; }
.od-about h3 { font-size: 14px; margin: 16px 0 6px; }
.od-about dl { display: grid; grid-template-columns: 10em minmax(0, 1fr); gap: 5px 16px; font-size: 13px; margin: 0; line-height: 1.45; }
.od-about dt { color: var(--dash-muted); font-weight: 600; }
.od-about dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.od-about a { color: var(--dash-accent); }
.od-about ul { font-size: 13px; line-height: 1.5; margin: 0; padding-left: 18px; max-width: 95ch; }
.od-about li + li { margin-top: 4px; }
@media (max-width: 900px) {
  .od-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .od-two { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .od { padding: 18px 16px 32px; }
  .od h1 { font-size: 22px; }
  .od-kpis { grid-template-columns: minmax(0, 1fr); }
  .od-kpi .v { font-size: 26px; }
  .od-card { padding: 14px 14px 16px; }
  .od-about dl { grid-template-columns: minmax(0, 1fr); gap: 2px 0; }
  .od-about dd { margin-bottom: 6px; }
  .od td, .od th { padding-left: 5px; padding-right: 5px; }
}
`;

const PALETTE = {
  light: { nc: "#2a78d6", rest: "#9aa0a8", third: "#c23b3a", bar: "#2a78d6" },
  dark: { nc: "#5598e7", rest: "#7d838c", third: "#e66767", bar: "#5598e7" },
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
    font: v("--dash-font", "system-ui, sans-serif"),
    pal: PALETTE[dark ? "dark" : "light"],
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
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
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
  background: "transparent",
  font: t.font,
  padding: { left: 2, right: 8, top: 6, bottom: 2 },
  view: { stroke: null },
  axis: {
    labelColor: t.muted, titleColor: t.muted, labelFontSize: 12, titleFontSize: 12, titleFontWeight: 600,
    gridColor: t.border, domainColor: t.border, tickColor: t.border, labelPadding: 4, titlePadding: 8,
  },
  legend: { labelColor: t.fg, titleColor: t.muted, labelFontSize: 12, titleFontSize: 12, orient: "top", title: null },
  text: { color: t.fg, fontSize: 12 },
});

const N = (v) => (v == null ? null : Number(v));
const int = (v) => (v == null || isNaN(Number(v)) ? "–" : Math.round(Number(v)).toLocaleString("en-US"));
const pct = (v) => (v == null || isNaN(Number(v)) ? "–" : Math.round(Number(v) * 100) + "%");
const dec = (v, d = 2) => (v == null || isNaN(Number(v)) ? "–" : Number(v).toFixed(d));
const money = (v) => {
  if (v == null || isNaN(Number(v))) return "–";
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(1) + " billion";
  if (Math.abs(n) >= 1e6) return "$" + Math.round(n / 1e6).toLocaleString("en-US") + " million";
  return "$" + Math.round(n).toLocaleString("en-US");
};
const shortMoney = (v) => {
  if (v == null || isNaN(Number(v))) return "–";
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e7) return "$" + Math.round(n / 1e6) + "M";
  return "$" + (n / 1e6).toFixed(1) + "M";
};
const one = (q) => (q.rows && q.rows[0]) || null;

function Chips({ items }) {
  const shown = (items || []).filter(Boolean);
  if (!shown.length) return null;
  return <ul className="od-chips" aria-label="Limits">{shown.map((c) => <li key={c}>{c}</li>)}</ul>;
}

function Status({ qs }) {
  const err = qs.map((q) => q.error).find(Boolean);
  if (err) return <p className="err">Could not load: {String(err.message || err)}</p>;
  if (qs.some((q) => q.loading)) return <p className="muted">Loading…</p>;
  return null;
}

function Chart({ spec, data }) {
  if (!data || !data.length) return null;
  return <div className="od-vega"><VegaChart spec={spec} data={data} /></div>;
}


function groupedBars(t, narrow, { y, x, xTitle, fmt, domain, range }) {
  const enc = {
    y: { field: y, type: "nominal", sort: null, axis: { title: null, labelLimit: narrow ? 120 : 200, labelColor: t.fg } },
    x: { field: x, type: "quantitative", axis: { title: xTitle, tickCount: 4, format: fmt } },
    yOffset: { field: "grp", sort: domain },
    color: { field: "grp", type: "nominal", scale: { domain, range }, legend: domain.length > 1 ? { title: null, columns: narrow ? 1 : domain.length } : null },
    tooltip: [{ field: y, title: "" }, { field: "grp", title: "" }, { field: x, type: "quantitative", title: xTitle, format: fmt }],
  };
  return {
    config: vegaConfig(t), width: "container",
    layer: [
      { mark: { type: "bar", cornerRadiusEnd: 3, height: { band: 0.85 } }, encoding: enc },
      { mark: { type: "text", align: "left", dx: 4, fontSize: 11, color: t.fg },
        encoding: { y: enc.y, x: enc.x, yOffset: enc.yOffset, text: { field: x, type: "quantitative", format: fmt } } },
    ],
  };
}

const CSS_HR = `
.hr-pick { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; margin: 6px 0 10px; font-size: 14px; }
.hr-pick input { font: inherit; color: var(--dash-fg); background: transparent; border: 1px solid var(--dash-border);
  border-radius: 8px; padding: 6px 10px; width: min(420px, 100%); }
.hr-pick button { font: inherit; font-size: 13px; color: var(--dash-accent); background: transparent; border: 1px solid var(--dash-border);
  border-radius: 999px; padding: 3px 10px; cursor: pointer; }
.hr-sel { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; padding: 0; list-style: none; }
.hr-sel li { font-size: 12px; border: 1px solid var(--dash-border); border-radius: 999px; padding: 2px 4px 2px 10px; display: flex; align-items: center; gap: 4px; }
.hr-sel button { border: 0; background: transparent; color: var(--dash-muted); cursor: pointer; font-size: 14px; line-height: 1; padding: 0 4px; }
.od td.v-in { color: var(--dash-muted); }
.od td.v-out { color: var(--dash-accent); font-weight: 700; }
.od .hide-sm {}
@media (max-width: 560px) { .od .hide-sm { display: none; } }
.od td.wrap { white-space: normal; text-align: left; min-width: 9em; }
`;

// The Raleigh area (Triangle) hospitals in the file: the model's `raleigh_area` view lists the same CCNs
// (Rex, WakeMed Raleigh, WakeMed Cary, Duke University, Duke Regional, UNC Hospitals, Johnston).
const RALEIGH_AREA = "340114,340069,340173,340030,340155,340061,340090";

const r1 = (v) => (v == null || isNaN(Number(v)) ? "–" : (Math.round(Number(v) * 10) / 10).toFixed(1));
const title = (s) => String(s || "").toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bUnc\b/g, "UNC").replace(/\bEcu\b/g, "ECU").replace(/\bInc\b/g, "Inc.").replace(/\bWakemed\b/g, "WakeMed").replace(/\bCaromont\b/g, "CaroMont").replace(/\bFirsthealth\b/g, "FirstHealth");

// Posterior probability the hospital is truly above its peer median on its penalized heart attack, heart failure,
// pneumonia and COPD measures (range when counts are hidden); hip/knee and bypass are not estimated.
function probTxt(g) {
  if (g.prob_above_median_min == null) return "Not estimated (hip/knee or bypass only)";
  const x = [N(g.prob_above_median_min), N(g.prob_above_median_max)].sort((p, q) => p - q);
  return x[1] - x[0] < 0.005 ? x[0].toFixed(2) : `${x[0].toFixed(2)} to ${x[1].toFixed(2)}`;
}

// A hospital's actual gap above a peer-median hospital's count, against its chance band (binomial SD).
function verdict(g) {
  const lo = N(g.actual_above_median_min), hi = N(g.actual_above_median_max), sd = N(g.chance_sd_binomial);
  if (hi < sd) return { txt: "Within 1 chance band", out: false };
  if (lo >= 2 * sd) return { txt: "Beyond 2 chance bands", out: true };
  if (hi < 2 * sd) return { txt: lo >= sd ? "1 to 2 chance bands" : "Within 2 chance bands", out: false };
  return { txt: "Between " + (lo < sd ? "under 1" : "1") + " and over 2 bands (count hidden)", out: false };
}

function kSpec(t, narrow) {
  const y = { field: "k", type: "nominal", sort: null, axis: { title: null, labelColor: t.fg } };
  const x = { type: "quantitative", scale: { domain: [0, 1] }, axis: { title: "Share of penalized hospitals", format: ".0%", tickCount: 5 } };
  return {
    config: vegaConfig(t), width: "container", height: 3 * 46,
    layer: [
      { mark: { type: "bar", color: t.pal.nc, height: { band: 0.55 }, cornerRadius: 3 }, encoding: { y, x: { ...x, field: "lo" }, x2: { field: "hi" },
        tooltip: [{ field: "k", title: "" }, { field: "lo", type: "quantitative", title: "Observed, at least", format: ".0%" }, { field: "hi", type: "quantitative", title: "Observed, at most", format: ".0%" }, { field: "nul", type: "quantitative", title: "Chance and selection alone", format: ".1%" }] } },
      { mark: { type: "tick", color: t.pal.third, thickness: 3, size: 26 }, encoding: { y, x: { ...x, field: "nul" } } },
    ],
  };
}

function bandSpec(t, narrow, maxX, n) {
  const y = { field: "name", type: "nominal", sort: null, axis: { title: null, labelLimit: narrow ? 110 : 230, labelColor: t.fg } };
  const x = { type: "quantitative", scale: { domain: [-maxX, maxX], nice: false }, axis: { title: narrow ? "Actual above a peer-median hospital, 3 years" : "Actual readmissions above a peer-median hospital, three years", tickCount: 5 } };
  const band = t.dark ? "#2b3a4d" : "#dbe9fb";
  const band1 = t.dark ? "#3c5677" : "#b5d2f5";
  return {
    config: vegaConfig(t), width: "container", height: Math.max(1, n) * (narrow ? 34 : 30),
    layer: [
      { mark: { type: "bar", color: band, height: { band: 0.7 } }, encoding: { y, x: { ...x, field: "m2" }, x2: { field: "p2" } } },
      { mark: { type: "bar", color: band1, height: { band: 0.7 } }, encoding: { y, x: { ...x, field: "m1" }, x2: { field: "p1" } } },
      { data: { values: [{ z: 0 }] }, mark: { type: "rule", color: t.muted }, encoding: { x: { field: "z", type: "quantitative" } } },
      { mark: { type: "rule", strokeWidth: 3, color: t.pal.third }, encoding: { y, x: { ...x, field: "lo" }, x2: { field: "hi" } } },
      { mark: { type: "point", filled: true, size: 70, color: t.pal.third }, encoding: { y, x: { ...x, field: "mid" },
        tooltip: [{ field: "name", title: "" }, { field: "gapTxt", title: "Actual gap" }, { field: "sdTxt", title: "Chance band (1 SD)" }, { field: "cut", title: "FY2026 cut" }] } },
    ],
  };
}

export default function Dashboard() {
  const t = useTheme();
  const narrow = useNarrow();
  const [sel, setSel] = useUrlState("h", RALEIGH_AREA);
  const [draft, setDraft] = React.useState("");

  // National totals; the cost per readmission is read back from the model's cost measure.
  const totQ = useQuery({ malloy: `run: measure_results -> {
    aggregate:
      hospital_count, discharges, true_excess_per_year, true_excess_cost_per_year, excess_readmissions_per_year,
      beyond_chance_binomial_per_year_min, beyond_chance_binomial_per_year_max
      cost_per_readmission is excess_cost_per_year / excess_readmissions_per_year
  }` });
  const condQ = useQuery({ malloy: `run: measure_results -> true_excess_by_condition` });
  const penQ = useQuery({ malloy: `run: penalty_basis -> {
    aggregate:
      penalized_hospitals, hospitals_all_published, beyond_one_sd_binomial_fewest, beyond_one_sd_binomial_most,
      beyond_two_sd_binomial_fewest, beyond_two_sd_binomial_most, beyond_three_sd_binomial_fewest, beyond_three_sd_binomial_most,
      share_truly_above_median_min, share_truly_above_median_max, real_share_of_gap_at_floor, real_share_of_gap_at_ceiling, hospitals_estimated
    nest: by_chance_band_binomial
  }` });
  const nullQ = useQuery({ malloy: `run: null_selection -> { aggregate: null_share_beyond_one, null_share_beyond_two, null_share_beyond_three }` });
  const hospQ = useQuery({ malloy: `run: hospitals -> {
    where: in_payment_file
    select: facility_id, facility_name, state, payment_reduction_pct
    order_by: facility_name
  }` });
  const gapQ = useQuery({ malloy: `run: penalty_basis -> {
    select: facility_id, payment_reduction_pct, penalized_rows, penalized_rows_suppressed, readmissions_above_median,
      actual_above_median_min, actual_above_median_max, chance_sd_binomial, prob_above_median_min, prob_above_median_max
  }` });
  const condListQ = useQuery({ malloy: `run: measure_results -> {
    where: penalty_indicator
    group_by: facility_id
    nest: conds is { group_by: condition; order_by: condition }
  }` });

  const tot = one(totQ);
  const pen = one(penQ);
  const nul = one(nullQ);
  const cost = tot ? N(tot.cost_per_readmission) : null;
  const conds = condQ.rows || [];
  const share = (a, b) => (a == null || !b ? "–" : pct(N(a) / N(b)));

  // Penalized hospitals beyond 1, 2 and 3 chance bands (range from hidden counts) against chance plus selection alone.
  const kRows = pen && nul ? [1, 2, 3].map((k) => {
    const w = ["one", "two", "three"][k - 1];
    return { k: `Beyond ${k} band${k > 1 ? "s" : ""}`, lo: N(pen[`beyond_${w}_sd_binomial_fewest`]) / N(pen.penalized_hospitals),
      hi: N(pen[`beyond_${w}_sd_binomial_most`]) / N(pen.penalized_hospitals), nul: N(nul[`null_share_beyond_${w}`]) };
  }) : [];
  const lohi = (a, b) => { const x = [N(a), N(b)].sort((p, q) => p - q); return `${pct(x[0])}-${pct(x[1])}`; };
  const bands = pen ? (Array.isArray(pen.by_chance_band_binomial) ? pen.by_chance_band_binomial : [pen.by_chance_band_binomial].filter(Boolean)) : [];
  const bandRows = bands.map((b) => ({ band: String(b.chance_band).replace(/^\d: /, "").replace("SD", "chance bands").replace("1 chance bands", "1 chance band"), n: N(b.penalized_hospitals), cut: N(b.avg_payment_reduction_pct) }));

  const condBars = React.useMemo(() => conds.flatMap((r) => [
    ...(r.true_excess_per_year == null ? [] : [{ c: r.condition, grp: "Estimated true excess", v: N(r.true_excess_per_year) }]),
    { c: r.condition, grp: "CMS's estimate", v: N(r.excess_readmissions_per_year) },
    { c: r.condition, grp: "Floor", v: Math.min(N(r.beyond_chance_binomial_per_year_min), N(r.beyond_chance_binomial_per_year_max)) },
  ]), [conds]);
  const hfpn = conds.filter((r) => r.condition === "Heart failure" || r.condition === "Pneumonia").reduce((s, r) => s + N(r.true_excess_per_year), 0);

  // Lookup
  const hosp = hospQ.rows || [];
  const byId = React.useMemo(() => new Map(hosp.map((h) => [h.facility_id, h])), [hosp]);
  const byLabel = React.useMemo(() => new Map(hosp.map((h) => [`${title(h.facility_name)} (${h.state}, ${h.facility_id})`, h])), [hosp]);
  const gaps = React.useMemo(() => new Map((gapQ.rows || []).map((g) => [g.facility_id, g])), [gapQ.rows]);
  const condMap = React.useMemo(() => new Map((condListQ.rows || []).map((r) => {
    const list = Array.isArray(r.conds) ? r.conds : r.conds ? [r.conds] : [];
    return [r.facility_id, list.map((c) => c.condition).join(", ")];
  })), [condListQ.rows]);
  const ids = String(sel || "").split(",").filter(Boolean);
  const setIds = (list) => setSel(list.join(","));
  const pick = (label) => {
    const h = byLabel.get(label);
    if (!h) return false;
    if (!ids.includes(h.facility_id)) setIds([...ids, h.facility_id]);
    setDraft("");
    return true;
  };
  const picked = ids.map((id) => ({ id, h: byId.get(id), g: gaps.get(id) })).filter((x) => x.h);
  const chartRows = picked.filter((x) => x.g).map(({ h, g }) => {
    const lo = N(g.actual_above_median_min), hi = N(g.actual_above_median_max), sd = N(g.chance_sd_binomial);
    return { name: title(h.facility_name), lo, hi, mid: (lo + hi) / 2, m1: -sd, p1: sd, m2: -2 * sd, p2: 2 * sd,
      gapTxt: lo === hi ? r1(lo) : `${r1(lo)} to ${r1(hi)}`, sdTxt: r1(sd), cut: N(g.payment_reduction_pct).toFixed(2) + "%" };
  });
  const maxX = Math.max(5, ...chartRows.map((r) => Math.max(Math.abs(r.lo), Math.abs(r.hi), r.p2))) * 1.08;

  const specs = React.useMemo(() => ({
    cond: { ...groupedBars(t, narrow, { y: "c", x: "v", xTitle: "Readmissions a year above expected", fmt: ",.0f",
      domain: ["Estimated true excess", "CMS's estimate", "Floor"], range: [t.pal.nc, t.pal.rest, t.dark ? "#3a3f46" : "#d4d7dc"] }), height: { step: 12 } },
    ks: kSpec(t, narrow),
    lookup: bandSpec(t, narrow, maxX, chartRows.length),
  }), [t, narrow, maxX, chartRows.length]);

  return (
    <div className="od">
      <style>{CSS + CSS_HR}</style>
      <h1>Medicare readmissions: the real excess, what it costs, and which penalties chance explains</h1>
      <p className="lede">
        Medicare's readmissions program cut FY2026 payments to hospitals whose patients came back within 30 days more
        often than at a typical peer hospital, on discharges from July 2021 to June 2024
        ({tot ? int(tot.hospital_count) : "–"} hospitals, {tot ? int(tot.discharges) : "–"} eligible stays). Readmissions are
        valued at {cost ? money(cost) : "–"} each, the average cost of the hospital care a Medicare readmission used in 2020. That is a
        cost of care, not what a hospital saves: Medicare pays a readmission as its own stay. Only the true excess carries a
        dollar value; the penalty analysis shows where that excess is and is not visible.
      </p>
      <Status qs={[totQ]} />

      <div className="od-kpis">
        <div className="od-kpi"><div className="v">{tot ? int(tot.true_excess_per_year) : "–"}</div><div className="r">readmissions a year, estimated</div>
          <div className="l">True excess at hospitals running above their patients' expected rate (heart attack, heart failure, pneumonia, COPD)</div></div>
        <div className="od-kpi"><div className="v">{tot ? shortMoney(tot.true_excess_cost_per_year) : "–"}</div><div className="r">a year, cost of care, 2020 dollars</div>
          <div className="l">The hospital care that excess uses</div></div>
        <div className="od-kpi"><div className="v">{pen ? `${share(pen.beyond_two_sd_binomial_fewest, pen.penalized_hospitals)}-${share(pen.beyond_two_sd_binomial_most, pen.penalized_hospitals)}` : "–"}</div>
          <div className="r">chance and selection alone: {nul ? pct(nul.null_share_beyond_two) : "–"}</div>
          <div className="l">Penalized hospitals whose gap is beyond two chance bands</div></div>
        <div className="od-kpi"><div className="v">{pen ? lohi(pen.real_share_of_gap_at_floor, pen.real_share_of_gap_at_ceiling) : "–"}</div><div className="r">estimated, the rest is chance and selection</div>
          <div className="l">Share of penalized hospitals' measured gaps that is a real difference (four conditions)</div></div>
      </div>

      <section className="od-card">
        <p className="tag">1 · True excess by condition</p>
        <h2>About {tot ? int(tot.true_excess_per_year) : "–"} readmissions a year above expected on four conditions, most of them pneumonia and heart failure</h2>
        <p>
          Hospital rates spread around their patients' expected rates by more than chance alone would give. If that spread
          holds at every volume and is roughly normal, hospitals whose true rate is above expected have about {tot ? int(tot.true_excess_per_year) : "–"} excess
          readmissions a year on heart attack, heart failure, pneumonia and COPD, {tot && hfpn ? pct(hfpn / N(tot.true_excess_per_year)) : "–"} of them pneumonia and heart failure.
          Hip/knee replacement and bypass surgery are not estimated: their ratio changes with hospital size, so one centre does not hold.
          That is above CMS's own shrunken estimate ({tot ? int(tot.excess_readmissions_per_year) : "–"}) and above a hard floor:
          actual readmissions above expected exceed what chance alone gives by at least
          {tot ? ` ${int(Math.min(N(tot.beyond_chance_binomial_per_year_min), N(tot.beyond_chance_binomial_per_year_max)))} to ${int(Math.max(N(tot.beyond_chance_binomial_per_year_min), N(tot.beyond_chance_binomial_per_year_max)))}` : " –"} a year.
        </p>
        <Status qs={[condQ]} />
        <div className="od-two">
          <div><Chart spec={specs.cond} data={condBars} /></div>
          <div className="od-tablewrap">
            <table>
              <thead><tr><th>Condition</th><th>True excess a year</th><th>Range for the condition</th><th>Cost of care a year</th></tr></thead>
              <tbody>{conds.map((r) => (
                r.true_excess_per_year == null
                  ? <tr key={r.condition}><td>{r.condition}</td><td className="wrap" colSpan={3}>Not estimated: ratio changes with hospital size</td></tr>
                  : <tr key={r.condition}><td>{r.condition}</td><td>{int(r.true_excess_per_year)}</td>
                  <td>{int(r.true_excess_per_year_low)}-{int(r.true_excess_per_year_high)}</td><td>{shortMoney(r.true_excess_cost_per_year)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <p className="act">
          For a quality improvement organization or health system planning readmission work: put transitional-care support
          into pneumonia and heart failure first, and track heart failure mortality alongside.
          Valued: {tot ? money(tot.true_excess_cost_per_year) : "–"} a year of hospital care.
        </p>
        <Chips items={[
          "Estimate assumes the national spread holds at every volume",
          "Which of pneumonia and heart failure is larger is not settled",
          "The spread includes patient mix the risk model misses",
          "Hip/knee and bypass: not estimated, ratio changes with hospital size",
          "Cost of care, not Medicare payment or hospital saving",
        ]} />
      </section>

      <section className="od-card">
        <p className="tag">2 · Penalties against chance</p>
        <h2>Most FY2026 penalties rest on gaps too small to tell from chance</h2>
        <p>
          A measure is penalized when it comes out above the peer median, so even with no real difference anywhere,
          chance plus that selection puts {nul ? pct(nul.null_share_beyond_two) : "–"} of hospitals beyond two chance bands
          (standard deviations of a peer-median hospital's count). Of {pen ? int(pen.penalized_hospitals) : "–"} penalized
          hospitals, {pen ? `${int(pen.beyond_two_sd_binomial_fewest)} to ${int(pen.beyond_two_sd_binomial_most)}` : "–"} are
          beyond two (the range comes from counts CMS hides when they are 10 or fewer). Too small to tell is not the same as
          caused by chance: an estimate from the spread in panel 1 puts {pen ? lohi(pen.share_truly_above_median_min, pen.share_truly_above_median_max) : "–"} of
          the {pen ? int(pen.hospitals_estimated) : "–"} hospitals penalized on heart attack, heart failure, pneumonia or COPD above their peer median on those
          measures in underlying rate, with {pen ? lohi(pen.real_share_of_gap_at_floor, pen.real_share_of_gap_at_ceiling) : "–"} of the
          measured gap real. Bigger gaps did draw bigger cuts.
        </p>
        <Status qs={[penQ, nullQ]} />
        <div className="od-two">
          <div><h3>Penalized hospitals beyond 1, 2 and 3 chance bands (bar) against chance and selection alone (red mark)</h3><Chart spec={specs.ks} data={kRows} /></div>
          <div className="od-tablewrap">
            <h3>Hospitals with every penalized count published{pen ? ` (${int(pen.hospitals_all_published)})` : ""}: average FY2026 cut</h3>
            <table>
              <thead><tr><th>Actual gap above the peer median</th><th>Hospitals</th><th>Average cut</th></tr></thead>
              <tbody>{bandRows.map((b) => (<tr key={b.band}><td>{b.band}</td><td>{int(b.n)}</td><td>{b.cut == null ? "–" : b.cut.toFixed(2) + "%"}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
        <p className="act">
          For a hospital deciding whether to chase its penalty: if the gap is inside two chance bands, fund readmission
          work on the care it avoids ({cost ? money(cost) : "–"} of hospital care each), not to remove the cut. For a hospital association
          commenting on CMS's next payment rule: ask CMS to penalize only gaps beyond an interval.
          No separate dollar value: these counts move with the chosen cut-off. The money is the excess in panel 1.
        </p>
        <Chips items={["Chance bands are pure sampling noise", "Selection simulated on the count, a stand-in for CMS's rule", "Real-gap shares are estimates from panel 1's spread", "The cut is a share of all Medicare stays; CMS publishes no penalty dollars"]} />
      </section>

      <section className="od-card">
        <p className="tag">3 · Look up a hospital</p>
        <h2>A hospital's gap against its chance band</h2>
        <p>
          Each line is a penalized hospital's actual readmissions above what a peer-median hospital would have, summed over
          the measures that produced its FY2026 cut. Shading marks one and two chance bands around zero. A line instead of a
          dot means CMS hid at least one count (10 or fewer), so the gap is a range. Starts with the Raleigh area.
        </p>
        <div className="hr-pick">
          <input value={draft} list="hr-list" placeholder="Add a hospital: type part of its name" spellCheck={false}
            onChange={(e) => { setDraft(e.target.value); pick(e.target.value); }} aria-label="Hospital" />
          <datalist id="hr-list">{hosp.map((h) => <option key={h.facility_id} value={`${title(h.facility_name)} (${h.state}, ${h.facility_id})`} />)}</datalist>
          <button type="button" onClick={() => setSel(RALEIGH_AREA)}>Raleigh area</button>
          <button type="button" onClick={() => setIds([])}>Clear</button>
        </div>
        <ul className="hr-sel">{picked.map(({ id, h }) => (
          <li key={id}>{title(h.facility_name)}<button type="button" aria-label={"Remove " + title(h.facility_name)} onClick={() => setIds(ids.filter((x) => x !== id))}>×</button></li>
        ))}</ul>
        <Status qs={[hospQ, gapQ, condListQ]} />
        {chartRows.length > 0 && <Chart spec={specs.lookup} data={chartRows} />}
        <div className="od-tablewrap">
          <table>
            <thead><tr><th>Hospital</th><th>FY2026 cut</th><th className="hide-sm">Penalized on</th><th className="hide-sm">CMS's estimate above median</th><th>Actual above median</th><th>Chance band (1 SD)</th><th>Against chance</th><th>Probability the underlying rate is above the median (heart attack, heart failure, pneumonia, COPD)</th></tr></thead>
            <tbody>{picked.map(({ id, h, g }) => {
              if (!g) return (<tr key={id}><td>{title(h.facility_name)} ({h.state})</td><td>{h.payment_reduction_pct == null ? "–" : N(h.payment_reduction_pct).toFixed(2) + "%"}</td><td className="wrap" colSpan={6}>No FY2026 readmissions cut</td></tr>);
              const vd = verdict(g);
              const lo = N(g.actual_above_median_min), hi = N(g.actual_above_median_max);
              return (<tr key={id}>
                <td>{title(h.facility_name)} ({h.state})</td><td>{N(g.payment_reduction_pct).toFixed(2)}%</td>
                <td className="wrap hide-sm">{condMap.get(id) || "–"}</td><td className="hide-sm">{r1(g.readmissions_above_median)}</td>
                <td>{lo === hi ? r1(lo) : `${r1(lo)} to ${r1(hi)}`}</td><td>{r1(g.chance_sd_binomial)}</td>
                <td className={"wrap " + (vd.out ? "v-out" : "v-in")}>{vd.txt}</td>
                <td>{probTxt(g)}</td></tr>);
            })}</tbody>
          </table>
        </div>
        <Chips items={["Three years of discharges, July 2021 to June 2024", "CMS's estimate is shrunken toward average; the actual count is larger", "FY2027 cuts use different years and rules"]} />
      </section>

      <section className="od-card od-about" id="about-this-data">
        <h2>About this data</h2>
        <h3>Sources</h3>
        <dl>
          <dt>Hospital results</dt><dd>CMS Hospital Readmissions Reduction Program, FY2026 hospital file: each hospital's readmission ratio, predicted and expected rates and counts for heart attack, heart failure, pneumonia, COPD, bypass surgery and hip/knee replacement. <a href="https://www.cms.gov/medicare/payment/prospective-payment-systems/acute-inpatient-pps/hospital-readmissions-reduction-program-hrrp" target="_blank" rel="noopener noreferrer">cms.gov</a></dd>
          <dt>Payment cuts</dt><dd>CMS FY2026 IPPS final rule, readmissions supplemental file: eligible discharges, peer group, peer median and each hospital's cut. <a href="https://www.cms.gov/medicare/payment/prospective-payment-systems/acute-inpatient-pps/archived-supplemental-data-files/fy-2026-ipps-final-rule-hospital-readmissions-reduction-program-supplemental-data-file" target="_blank" rel="noopener noreferrer">cms.gov</a></dd>
          <dt>Cost per readmission</dt><dd>{cost ? money(cost) : "–"}: average cost of the hospital care a Medicare readmission used, 2020 (AHRQ HCUP Statistical Brief #307). A cost of care, the same for every condition; not a Medicare payment and not what a hospital saves, since Medicare pays a readmission as its own stay (Medicare Claims Processing Manual, chapter 3, section 40.2.5). <a href="https://hcup-us.ahrq.gov/reports/statbriefs/sb307-readmissions-2020.jsp" target="_blank" rel="noopener noreferrer">hcup-us.ahrq.gov</a></dd>
        </dl>
        <h3>Definitions</h3>
        <dl>
          <dt>Expected</dt><dd>Readmissions the hospital's own patients would have at an average hospital (CMS's risk adjustment).</dd>
          <dt>CMS's estimate</dt><dd>Discharges times the gap between CMS's predicted and expected rates. CMS pulls small hospitals toward average, so this understates actual counts.</dd>
          <dt>Chance band</dt><dd>One standard deviation of the readmissions a peer-median hospital would have on the same stays, from sampling alone.</dd>
          <dt>True excess</dt><dd>Readmissions above expected at hospitals whose underlying rate is above expected, estimated from how widely hospital rates spread beyond chance. Heart attack, heart failure, pneumonia and COPD only.</dd>
          <dt>Floor</dt><dd>Actual readmissions above expected minus what chance alone gives. A lower bound, not an estimate.</dd>
        </dl>
        <h3>Limits</h3>
        <ul>
          <li>The data has no deaths, so nothing here is valued in lives. Studies disagree on whether heart failure deaths rose under the program; any push to cut heart failure readmissions should track mortality.</li>
          <li>FY2026 cuts were applied October 2025 to September 2026 and are finished. FY2027 cuts use two years of discharges and add Medicare Advantage patients.</li>
          <li>Risk adjustment does not capture all patient differences, so part of any gap may not be avoidable by the hospital.</li>
          <li>CMS hides counts of 10 or fewer; figures that depend on them are given as ranges.</li>
          <li>The true-excess estimate's ranges cover hospital sampling only, not its normal-shape or same-spread-at-every-volume assumptions.</li>
          <li>The probability that a hospital's underlying rate is above its peer median is an estimate that borrows the national spread; it is not a measurement of that hospital.</li>
        </ul>
      </section>
    </div>
  );
}
