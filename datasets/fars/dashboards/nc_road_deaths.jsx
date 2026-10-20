import React from "react";
import { VegaChart, useQuery } from "@malloyyo/dashboard";

// North Carolina road deaths: one panel per finding (F1 collectors per mile, F2 alcohol count and imputation,
// F3 Wake pedestrians, F4 speeding definitions), each with its value at US DOT's value of a statistical life.
// Self-contained on purpose: a dashboard component can import only React and @malloyyo/dashboard. Every query is a
// whole string literal over the published model (views and measures of index.malloy), so the same component
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
  if (Math.abs(n) >= 1e8) return "$" + Math.round(n / 1e6).toLocaleString("en-US") + " million";
  if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + " million";
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

// ---- Charts ----

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

function lines(t, { x, y, color, domain, range, yTitle, fmt, height, narrow }) {
  return {
    config: vegaConfig(t), width: "container", height: height || 220,
    mark: { type: "line", point: true, strokeWidth: 2.5 },
    encoding: {
      x: { field: x, type: "ordinal", axis: { title: null, labelAngle: 0 } },
      y: { field: y, type: "quantitative", axis: { title: yTitle, format: fmt, tickCount: 5 } },
      color: { field: color, type: "nominal", scale: { domain, range }, legend: { title: null, columns: narrow ? 1 : 3 } },
      tooltip: [{ field: x, title: "Year" }, { field: color, title: "" }, { field: y, type: "quantitative", title: yTitle, format: fmt }],
    },
  };
}

function yearBars(t, { x, y, yTitle }) {
  return {
    config: vegaConfig(t), width: "container", height: 150,
    layer: [
      { mark: { type: "bar", cornerRadiusEnd: 3, color: t.pal.bar }, encoding: {
        x: { field: x, type: "ordinal", axis: { title: null, labelAngle: 0 } },
        y: { field: y, type: "quantitative", axis: { title: yTitle, tickCount: 4 } },
        tooltip: [{ field: x, title: "Year" }, { field: y, type: "quantitative", title: yTitle }] } },
      { mark: { type: "text", dy: -7, fontSize: 11, color: t.fg }, encoding: {
        x: { field: x, type: "ordinal" }, y: { field: y, type: "quantitative" }, text: { field: y, type: "quantitative" } } },
    ],
  };
}

// ---- Page ----

export default function Dashboard() {
  const t = useTheme();
  const narrow = useNarrow();

  // Value of a statistical life and its range, per death, and the data's size (About).
  // Double-quoted (not a template literal) because the queries quote the reserved word year in backticks.
  const vslQ = useQuery({ malloy: "run: crashes -> { aggregate: deaths, fatal_crashes, vsl is deaths_valued_at_vsl / deaths, vsl_low is deaths_valued_at_vsl_low / deaths, vsl_high is deaths_valued_at_vsl_high / deaths, first_year is `year`.min(), last_year is `year`.max(), us_deaths_2024 is deaths { where: `year` = 2024 }, us_deaths_2024_valued is deaths_valued_at_vsl { where: `year` = 2024 }, nc_deaths_10_over_2024 is deaths_vehicle_10_over_limit { where: state_name = 'North Carolina' and `year` = 2024 } }" });

  // F1
  const f1Q = useQuery({ malloy: `run: road_exposure -> nc_vs_us_deaths_per_mile_by_road_class` });
  const f1RestQ = useQuery({ malloy: "run: road_exposure -> deaths_per_mile_by_road_class + { where: state_name != 'North Carolina' and `year` >= 2022 }" });
  const f1FnQ = useQuery({ malloy: `run: road_exposure -> nc_deaths_per_mile_by_road_function` });
  // F2
  const f2Q = useQuery({ malloy: `run: crashes -> nc_vs_rest_alcohol_testing` });
  const f2NcQ = useQuery({ malloy: `run: crashes -> alcohol_counting_methods + { where: state_name = 'North Carolina' }` });
  const f2BacQ = useQuery({ malloy: `run: persons -> nc_vs_rest_bac_known_killed_drivers` });
  // F3
  const f3Q = useQuery({ malloy: `run: persons -> wake_vs_rest_of_nc_pedestrians` });
  const f3YrQ = useQuery({ malloy: `run: persons -> pedestrian_deaths_dark_arterial_by_year + { where: crashes.county_fips = '37183' }` });
  const f3UsQ = useQuery({ malloy: `run: persons -> { where: crashes.state_name != 'North Carolina'; aggregate: pedestrian_deaths, pedestrian_deaths_dark_arterial }` });
  // F4
  const f4Q = useQuery({ malloy: `run: nc_speeding_definitions -> nc_speeding_two_definitions` });
  const f4FlagQ = useQuery({ malloy: `run: vehicles -> nc_vs_rest_speeding_flag_on_fast_vehicles` });
  const f4KnownQ = useQuery({ malloy: `run: crashes -> { group_by: nc_or_rest_of_us; aggregate: speed_known_share }` });

  const v = one(vslQ);
  const lowF = v ? N(v.vsl_low) / N(v.vsl) : null;
  const highF = v ? N(v.vsl_high) / N(v.vsl) : null;
  const range = (val) => (val == null || lowF == null ? "" : `range ${shortMoney(val * lowF)} to ${shortMoney(val * highF)}`);

  // F1 figures
  const f1 = f1Q.rows || [];
  const rest = f1RestQ.rows || [];
  const ncColl = f1.find((r) => r.road_class === "Collector");
  const restColl = rest.find((r) => r.road_class === "Collector");
  const f1Value = ncColl ? N(ncColl.nc_deaths_2024_valued_at_vsl) : null;
  const f1Bars = React.useMemo(() => {
    const out = [];
    for (const r of f1) {
      const rr = rest.find((x) => x.road_class === r.road_class);
      out.push({ cls: r.road_class, grp: "North Carolina", rate: N(r.nc_rate_2022_2024) });
      if (rr) out.push({ cls: r.road_class, grp: "Rest of US", rate: N(rr.deaths_per_100m_vmt) });
    }
    return out;
  }, [f1, rest]);
  const fn = f1FnQ.rows || [];
  const major = fn.find((r) => String(r.road_function).includes("Major collector"));
  const minor = fn.find((r) => String(r.road_function).includes("Minor collector"));

  // F2 figures
  const f2 = (f2Q.rows || []).map((r) => ({ year: String(r.year), grp: r.nc_or_rest_of_us, share: N(r.alcohol_share_resting_on_imputation) }));
  const nc2 = f2NcQ.rows || [];
  const nc2024 = nc2.find((r) => Number(r.year) === 2024);
  const nc2021 = nc2.find((r) => Number(r.year) === 2021);
  const nc2023 = nc2.find((r) => Number(r.year) === 2023);
  const ncSince22 = f2.filter((r) => r.grp === "North Carolina" && Number(r.year) >= 2022).map((r) => r.share);
  const bac = f2BacQ.rows || [];
  const f2Value = nc2024 ? N(nc2024.alcohol_impaired_deaths_valued_at_vsl) : null;
  const change = (a, b) => (a == null || b == null ? "–" : Math.abs(Math.round((N(b) / N(a) - 1) * 100)) + "%");

  // F3 figures
  const f3 = f3Q.rows || [];
  const wake = f3.find((r) => r.wake_or_rest_of_nc === "Wake County");
  const restNc = f3.find((r) => r.wake_or_rest_of_nc === "Rest of NC");
  const yrs = f3YrQ.rows || [];
  const f3Total = yrs.reduce((s, r) => s + N(r.pedestrian_deaths_dark_arterial), 0);
  const f3PerYear = yrs.length ? f3Total / yrs.length : null;
  const f3Value = yrs.length ? yrs.reduce((s, r) => s + N(r.dark_arterial_valued_at_vsl), 0) / yrs.length : null;
  const f3Bars = React.useMemo(() => {
    const out = [];
    const add = (label, key) => {
      if (wake) out.push({ m: label, grp: "Wake County", v: N(wake[key]) });
      if (restNc) out.push({ m: label, grp: "Rest of NC", v: N(restNc[key]) });
    };
    add("Of all road deaths", "pedestrian_share_of_deaths");
    add("Dark, on arterials", "dark_arterial_share_of_pedestrian_deaths");
    add("At intersections", "at_intersection_share_of_pedestrian_deaths");
    return out;
  }, [wake, restNc]);
  const us3 = one(f3UsQ);
  const usDarkShare = us3 ? N(us3.pedestrian_deaths_dark_arterial) / N(us3.pedestrian_deaths) : null;
  const yrMin = yrs.length ? Math.min(...yrs.map((r) => N(r.pedestrian_deaths_dark_arterial))) : null;
  const yrMax = yrs.length ? Math.max(...yrs.map((r) => N(r.pedestrian_deaths_dark_arterial))) : null;

  // F4 figures
  const f4 = f4Q.rows || [];
  const s22 = f4.find((r) => Number(r.year) === 2022);
  const s24 = f4.find((r) => Number(r.year) === 2024);
  const s19 = f4.find((r) => Number(r.year) === 2019);
  const f4Lines = React.useMemo(() => f4.flatMap((r) => [
    { year: String(r.year), s: "FARS flag", n: N(r.fars_speeding_related_deaths) },
    { year: String(r.year), s: "NCDOT count", n: N(r.ncdot_speed_related_deaths) },
    { year: String(r.year), s: "Vehicle 10+ mph over", n: N(r.deaths_vehicle_10_over_limit) },
  ]), [f4]);
  const flag = (f4FlagQ.rows || []).map((r) => ({ year: String(r.year), grp: r.nc_or_rest_of_us, share: N(r.flagged_share_of_10_over) }));
  const flagNc = (y) => flag.find((r) => r.grp === "North Carolina" && Number(r.year) === y);
  const known = f4KnownQ.rows || [];
  const knownNc = known.find((r) => r.nc_or_rest_of_us === "North Carolina");
  const knownRest = known.find((r) => r.nc_or_rest_of_us === "Rest of US");
  const f4Value = v && v.nc_deaths_10_over_2024 != null ? N(v.nc_deaths_10_over_2024) * N(v.vsl) : null;

  const specs = React.useMemo(() => ({
    f1: { ...groupedBars(t, narrow, { y: "cls", x: "rate", xTitle: "Deaths per 100M vehicle-miles, 2022-24", fmt: ".2f", domain: ["North Carolina", "Rest of US"], range: [t.pal.nc, t.pal.rest] }), height: { step: 15 } },
    f2: lines(t, { x: "year", y: "share", color: "grp", domain: ["North Carolina", "Rest of US"], range: [t.pal.nc, t.pal.rest], yTitle: "Share resting on imputation", fmt: ".0%" }),
    f3: { ...groupedBars(t, narrow, { y: "m", x: "v", xTitle: "Share, 2019-2024", fmt: ".0%", domain: ["Wake County", "Rest of NC"], range: [t.pal.nc, t.pal.rest] }), height: { step: 15 } },
    f3yr: yearBars(t, { x: "year", y: "pedestrian_deaths_dark_arterial", yTitle: "Deaths" }),
    f4: lines(t, { x: "year", y: "n", color: "s", domain: ["FARS flag", "NCDOT count", "Vehicle 10+ mph over"], range: [t.pal.third, t.pal.rest, t.pal.nc], yTitle: "NC deaths", fmt: ",d", height: 240, narrow }),
    f4flag: lines(t, { x: "year", y: "share", color: "grp", domain: ["North Carolina", "Rest of US"], range: [t.pal.nc, t.pal.rest], yTitle: "Flagged share", fmt: ".0%", height: 200 }),
  }), [t, narrow]);

  const f3YrRows = yrs.map((r) => ({ year: String(r.year), pedestrian_deaths_dark_arterial: N(r.pedestrian_deaths_dark_arterial) }));

  return (
    <div className="od">
      <style>{CSS}</style>
      <h1>North Carolina road deaths: four findings and what they are worth</h1>
      <p className="lede">
        Each panel answers one question about deaths on North Carolina roads, from every fatal crash in the US
        {v ? ` ${v.first_year} to ${v.last_year}` : ""}, and values the deaths at US DOT's value of a statistical life,
        {v ? ` ${money(v.vsl)} per death (DOT's range ${money(v.vsl_low)} to ${money(v.vsl_high)})` : ""}.
        The four values overlap and must not be added together.
      </p>
      <Status qs={[vslQ]} />

      <div className="od-kpis">
        <div className="od-kpi"><div className="v">{shortMoney(f1Value)}</div><div className="r">{range(f1Value)}</div>
          <div className="l">{ncColl ? int(ncColl.nc_deaths_2024) : "–"} deaths on NC collector roads, 2024</div></div>
        <div className="od-kpi"><div className="v">{shortMoney(f2Value)}</div><div className="r">{range(f2Value)}</div>
          <div className="l">{nc2024 ? int(nc2024.alcohol_impaired_deaths) : "–"} NC alcohol-impaired-driving deaths, 2024</div></div>
        <div className="od-kpi"><div className="v">{shortMoney(f3Value)}</div><div className="r">{range(f3Value)} a year</div>
          <div className="l">About {int(f3PerYear)} Wake pedestrians a year killed in the dark on arterials</div></div>
        <div className="od-kpi"><div className="v">{shortMoney(f4Value)}</div><div className="r">{range(f4Value)}</div>
          <div className="l">{v ? int(v.nc_deaths_10_over_2024) : "–"} NC deaths in crashes with a vehicle 10+ mph over the limit, 2024</div></div>
      </div>

      <section className="od-card">
        <p className="tag">1 · Road type</p>
        <h2>NC collector roads kill more people per mile driven than the rest of the US, about {ncColl ? dec(ncColl.nc_ratio_vs_freeway_2022_2024, 1) : "–"} times NC's interstates</h2>
        <p>
          On 2022-2024 data, NC collectors had {ncColl ? dec(ncColl.nc_rate_2022_2024) : "–"} deaths per 100 million
          vehicle-miles against {restColl ? dec(restColl.deaths_per_100m_vmt) : "–"} in the rest of the US. Against its
          own interstates and freeways NC's collector rate is {ncColl ? dec(ncColl.nc_ratio_vs_freeway_2022_2024) : "–"} times
          higher; in the rest of the US it is {restColl ? dec(restColl.rate_vs_interstate_freeway) : "–"} times.
          Minor collectors are worst ({minor ? dec(minor.rate_2022_2024) : "–"}; major collectors {major ? dec(major.rate_2022_2024) : "–"}).
          NC's other arterials sit below the rest of the US.
        </p>
        <Status qs={[f1Q, f1RestQ, f1FnQ]} />
        <Chart spec={specs.f1} data={f1Bars} />
        <p className="act">
          For NCDOT's Traffic Safety Unit or an MPO screening corridors for safety money: look first at collectors,
          minor collectors especially, when screening for systemic treatments.
          Valued: {ncColl ? int(ncColl.nc_deaths_2024) : "–"} NC collector deaths in 2024, {money(f1Value)} ({range(f1Value)}).
        </p>
        <Chips items={[
          "Rates include pedestrians, who do not drive the miles",
          "2024 data not final; 2024 alone is within chance of the national ratio",
          "Minor-collector miles are state estimates",
          "No county mileage, so no Wake rate",
          "Ranking projects also needs treatment costs and effects",
        ]} />
      </section>

      <section className="od-card">
        <p className="tag">2 · Alcohol</p>
        <h2>Since 2022, most of NC's alcohol-impaired-driving count rests on NHTSA's imputation, not on test results</h2>
        <p>
          NHTSA estimates blood alcohol for drivers without a reported test result. The share of NC's
          alcohol-impaired-driving deaths not backed by a tested driver at .08 or above
          was {ncSince22.length ? `${pct(Math.min(...ncSince22))} to ${pct(Math.max(...ncSince22))}` : "–"} from 2022, well above
          the rest of the US. A count from test results alone would show NC's alcohol deaths
          falling {nc2021 && nc2023 ? change(nc2021.alcohol_deaths_tested_only, nc2023.alcohol_deaths_tested_only) : "–"} from 2021 to 2023
          ({nc2021 ? int(nc2021.alcohol_deaths_tested_only) : "–"} to {nc2023 ? int(nc2023.alcohol_deaths_tested_only) : "–"}),
          while NHTSA's count fell {nc2021 && nc2023 ? change(nc2021.alcohol_impaired_deaths, nc2023.alcohol_impaired_deaths) : "–"}.
          Two things moved: in 2021 NC reported a result for far more killed drivers; from 2022 it reported about as many as
          in 2019-2020, but a much smaller share of them were at .08 or above, while NHTSA's count held. Why is not known.
        </p>
        <Status qs={[f2Q, f2NcQ, f2BacQ]} />
        <div className="od-two">
          <div>
            <h3>Share of alcohol-impaired-driving deaths resting on imputation</h3>
            <Chart spec={specs.f2} data={f2} />
          </div>
          <div className="od-tablewrap">
            <h3>North Carolina by year</h3>
            <table>
              <thead><tr><th>Year</th><th>NHTSA count (imputed)</th><th>From test results only</th><th>Killed drivers with a known result</th><th>Of those, at .08+</th></tr></thead>
              <tbody>{nc2.map((r) => {
                const b = bac.find((x) => Number(x.year) === Number(r.year) && x.nc_or_rest_of_us === "North Carolina");
                return (<tr key={String(r.year)}><td>{String(r.year)}</td><td>{int(r.alcohol_impaired_deaths)}</td>
                  <td>{int(r.alcohol_deaths_tested_only)}</td><td>{b ? pct(b.killed_driver_bac_known_share) : "–"}</td><td>{b ? pct(b.killed_driver_tested_positive_share) : "–"}</td></tr>);
              })}</tbody>
            </table>
          </div>
        </div>
        <p className="act">
          For NC's Governor's Highway Safety Program, the Chief Medical Examiner and county DWI task forces: find out why
          the share of tested drivers over the limit fell while the modelled count held before reading either number as a
          trend, and do not read a fall in tested positives as a fall in drunk driving.
          Valued: {nc2024 ? int(nc2024.alcohol_impaired_deaths) : "–"} NC alcohol-impaired-driving deaths in 2024, {money(f2Value)} ({range(f2Value)}).
        </p>
        <Chips items={["Use NHTSA's imputed count for trends", "Why NC's testing rose in 2021 is not known", "2024 data not final; 2024 results are more often missing"]} />
      </section>

      <section className="od-card">
        <p className="tag">3 · Wake County pedestrians</p>
        <h2>Pedestrians are {wake ? pct(wake.pedestrian_share_of_deaths) : "–"} of Wake County's road deaths, and about half of them die in the dark on arterials</h2>
        <p>
          {v ? `${v.first_year}-${v.last_year}` : ""}: {wake ? int(wake.pedestrian_deaths) : "–"} pedestrians killed in Wake County,
          against {restNc ? pct(restNc.pedestrian_share_of_deaths) : "–"} of deaths in the rest of NC.
          {wake ? ` ${int(wake.pedestrian_deaths_dark_arterial)}` : ""} of them died in the dark on non-freeway arterials,
          about {int(f3PerYear)} a year ({int(yrMin)} to {int(yrMax)} in a single year); only {wake ? pct(wake.at_intersection_share_of_pedestrian_deaths) : "–"} died at an intersection.
          That share matches the pattern outside NC ({pct(usDarkShare)} of pedestrian deaths, same years).
        </p>
        <Status qs={[f3Q, f3YrQ, f3UsQ]} />
        <div className="od-two">
          <div><h3>Pedestrians, Wake County against the rest of NC</h3><Chart spec={specs.f3} data={f3Bars} /></div>
          <div><h3>Wake pedestrians killed in the dark on arterials, by year</h3><Chart spec={specs.f3yr} data={f3YrRows} /></div>
        </div>
        <p className="act">
          For City of Raleigh transportation staff, NCDOT Division 5 and CAMPO: fund arterial lighting and mid-block
          crossings ahead of intersection crosswalk upgrades.
          Valued: about {int(f3PerYear)} deaths a year, {money(f3Value)} a year ({range(f3Value)}).
        </p>
        <Chips items={["Small yearly counts swing widely", "Published treatment effects are for crashes, not deaths", "The rest-of-NC contrast is mostly urban against rural"]} />
      </section>

      <section className="od-card">
        <p className="tag">4 · Speeding</p>
        <h2>NC's FARS speeding count rose while recorded speeds did not: the rise appears to be in how crashes are flagged</h2>
        <p>
          FARS speeding-related deaths in NC went from {s22 ? int(s22.fars_speeding_related_deaths) : "–"} (2022)
          to {s24 ? int(s24.fars_speeding_related_deaths) : "–"} (2024). Over the same years deaths in crashes with a vehicle
          recorded 10+ mph over the limit went from {s22 ? int(s22.deaths_vehicle_10_over_limit) : "–"} to {s24 ? int(s24.deaths_vehicle_10_over_limit) : "–"},
          and NCDOT's own count from {s22 ? int(s22.ncdot_speed_related_deaths) : "–"} to {s24 ? int(s24.ncdot_speed_related_deaths) : "–"}.
          NC records travel speed and the limit for {knownNc ? pct(knownNc.speed_known_share) : "–"} of vehicles in fatal crashes
          (rest of US {knownRest ? pct(knownRest.speed_known_share) : "–"}), so the like-for-like check is possible: of NC vehicles recorded
          10+ mph over, FARS flagged {flagNc(2019) ? pct(flagNc(2019).share) : "–"} in 2019 and {flagNc(2024) ? pct(flagNc(2024).share) : "–"} in 2024.
          FARS was {s19 ? dec(s19.fars_over_ncdot) : "–"} times NCDOT's count in 2019 and {s24 ? dec(s24.fars_over_ncdot) : "–"} times in 2024.
        </p>
        <Status qs={[f4Q, f4FlagQ, f4KnownQ]} />
        <div className="od-two">
          <div><h3>NC speeding deaths, three ways (FARS flag, NCDOT's count, a vehicle recorded 10+ mph over the limit)</h3><Chart spec={specs.f4} data={f4Lines} /></div>
          <div><h3>Vehicles recorded 10+ mph over the limit that FARS flags as speeding</h3><Chart spec={specs.f4flag} data={flag} /></div>
        </div>
        <p className="act">
          For GHSP's planning staff, NHTSA's regional office and NCDOT's data owners: set and judge NC's speeding target on
          one definition, track the speed-based count beside it, and ask NHTSA's FARS staff what changed, before moving
          money into or out of speed enforcement.
          Valued: {v ? int(v.nc_deaths_10_over_2024) : "–"} deaths in 2024 crashes with a vehicle 10+ mph over the limit, {money(f4Value)} ({range(f4Value)}).
          That is a ceiling on what less speeding could save, not deaths caused by speeding.
        </p>
        <Chips items={["Coding change is inferred; who changed what is not documented", "NCDOT counts typed in from its fact sheets", "2024 data not final"]} />
      </section>

      <section className="od-card od-about" id="about-this-data">
        <h2>About this data</h2>
        <h3>Sources</h3>
        <dl>
          <dt>Fatal crashes</dt><dd>NHTSA Fatality Analysis Reporting System (FARS), {v ? `${v.first_year}-${v.last_year}` : ""}: {v ? int(v.fatal_crashes) : "–"} fatal crashes, {v ? int(v.deaths) : "–"} deaths. {v ? v.last_year : ""} is the Annual Report File and will be revised. <a href="https://www.nhtsa.gov/research-data/fatality-analysis-reporting-system-fars" target="_blank" rel="noopener noreferrer">nhtsa.gov</a></dd>
          <dt>Miles driven</dt><dd>FHWA Highway Statistics table VM-2, by state, rural or urban, and road function. <a href="https://www.fhwa.dot.gov/policyinformation/statistics.cfm" target="_blank" rel="noopener noreferrer">fhwa.dot.gov</a></dd>
          <dt>NC speed counts</dt><dd>NCDOT's yearly speeding fact sheets (state crash data), typed in beside the FARS counts.</dd>
          <dt>Value of a life</dt><dd>US DOT departmental guidance on the value of a statistical life: {v ? money(v.vsl) : "–"} per death in 2025 dollars, sensitivity range {v ? money(v.vsl_low) : "–"} to {v ? money(v.vsl_high) : "–"}. <a href="https://www.transportation.gov/office-policy/transportation-policy/revised-departmental-guidance-on-valuation-of-a-statistical-life-in-economic-analysis" target="_blank" rel="noopener noreferrer">transportation.gov</a></dd>
        </dl>
        <h3>Definitions</h3>
        <dl>
          <dt>Deaths</dt><dd>People who died within 30 days of the crash.</dd>
          <dt>Alcohol-impaired</dt><dd>A death in a crash where a driver had blood alcohol of .08 or above, averaged over NHTSA's ten imputed values. NHTSA's method and published counts.</dd>
          <dt>Speeding-related</dt><dd>FARS: any driver in the crash speeding, racing or too fast for conditions. NCDOT: speeding a contributing factor in state crash data.</dd>
          <dt>Collector</dt><dd>Roads that gather traffic from local streets to arterials; built from FARS road-function codes, assumed to match FHWA's mileage classes (both come from state road inventories).</dd>
          <dt>Dark</dt><dd>Any of FARS's three dark codes (lighted, not lighted, unknown lighting).</dd>
        </dl>
        <h3>Limits</h3>
        <ul>
          <li>The values overlap: one death can be on a collector, alcohol-impaired and speeding-related. All {v ? int(v.us_deaths_2024) : "–"} US road deaths in 2024 are worth {v ? money(v.us_deaths_2024_valued) : "–"} at the same rate; every value here is part of that.</li>
          <li>A value of deaths is not what any single treatment would save. Treatment effects come from published crash studies and are not in this data.</li>
          <li>Per-mile rates leave out the few deaths with unknown road type or rural or urban location, so they run very slightly low.</li>
          <li>The speeding finding rests on an inference: the FARS flag rose while recorded speeds and NCDOT's count did not. NHTSA and NC's FARS analyst can confirm what changed.</li>
          <li>Deaths are a full count, so differences between years or places can still be chance; small counts such as Wake's yearly pedestrian deaths swing widely.</li>
        </ul>
      </section>
    </div>
  );
}
