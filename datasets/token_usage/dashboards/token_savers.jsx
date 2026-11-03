import React from "react";
import { useQuery } from "@malloyyo/dashboard";

// Self-contained: a dashboard component can import only React and @malloyyo/dashboard.
// One scale for every version: estimated cost per chat, today = 100, split into writing and rereading.

const CSS = `
.ts { --write: #f59e0b; --read: #60a5fa; --save: #22c55e; box-sizing: border-box; max-width: 860px; margin: 0 auto;
  padding: 32px 16px 48px; font-family: var(--dash-font); color: var(--dash-fg); }
.ts *, .ts *::before, .ts *::after { box-sizing: border-box; }
.ts h1 { font-size: 26px; line-height: 1.2; margin: 0 0 8px; }
.ts .lede { font-size: 19px; line-height: 1.45; margin: 0 0 30px; }
.ts .lede b { color: var(--save); }
.ts-card { border: 1px solid var(--dash-border); border-radius: 14px; padding: 24px 24px 18px; margin: 0 0 26px; }
.ts h2 { font-size: 18px; margin: 0 0 4px; }
.ts .sub { font-size: 13px; color: var(--dash-muted); margin: 0 0 20px; }
.ts-key { display: flex; gap: 18px; font-size: 13px; margin: 0 0 18px; flex-wrap: wrap; }
.ts-key i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.ts-row { display: grid; grid-template-columns: 210px minmax(0, 1fr) 64px; gap: 14px; align-items: center; margin: 0 0 6px; }
.ts-row .name { font-size: 14px; line-height: 1.25; }
.ts-row .name small { display: block; font-size: 12px; color: var(--dash-muted); }
.ts-row .total { font-size: 22px; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.ts-row.best .total, .ts-row.best .name { color: var(--save); font-weight: 700; }
.ts-track { position: relative; height: 26px; }
.ts-seg { position: absolute; top: 0; height: 100%; }
.ts-seg.w { background: var(--write); border-radius: 5px 0 0 5px; }
.ts-seg.r { background: var(--read); border-radius: 0 5px 5px 0; }
.ts-seg span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px;
  font-weight: 700; color: #111; }
.ts-tier { font-size: 12px; color: var(--dash-muted); margin: 14px 0 8px; text-transform: uppercase; letter-spacing: .05em; }
.ts-concl li { font-size: 15px; line-height: 1.5; margin: 0 0 8px; }
.ts-concl ul { margin: 0; padding-left: 18px; }
.ts details { font-size: 13px; color: var(--dash-muted); line-height: 1.5; margin-top: 8px; }
.ts summary { cursor: pointer; }
.ts-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 0 0 26px; }
.ts-opt { border: 1px solid var(--dash-border); border-radius: 12px; padding: 16px 18px; }
.ts-opt h3 { font-size: 16px; margin: 0 0 6px; }
.ts-opt p { font-size: 14px; line-height: 1.5; margin: 0 0 6px; color: var(--dash-fg); }
.ts-opt .alt { font-size: 13px; color: var(--dash-muted); }
.ts-rec { border: 2px solid var(--save); border-radius: 14px; padding: 18px 22px; margin: 0 0 26px; }
.ts-rec h2 { color: var(--save); }
.ts-rec li { font-size: 15px; line-height: 1.5; margin: 0 0 6px; }
.ts-rec ul { margin: 6px 0 0; padding-left: 18px; }
.ts-tbl { overflow-x: auto; }
.ts-tbl table { border-collapse: collapse; width: 100%; font-size: 13px; font-variant-numeric: tabular-nums; }
.ts-tbl th, .ts-tbl td { padding: 6px 8px; border-bottom: 1px solid var(--dash-border); text-align: right; white-space: nowrap; }
.ts-tbl th:first-child, .ts-tbl td:first-child { text-align: left; white-space: normal; }
.ts-tbl th { font-weight: 600; color: var(--dash-muted); }
.ts-tbl tr.w td:first-child { color: var(--write); font-weight: 600; }
.ts-tbl tr.grp td { color: var(--read); font-weight: 600; padding-top: 12px; }
.ts-tbl tr.in td:first-child { padding-left: 20px; }
.ts-tbl tr.sum td { font-weight: 700; border-bottom: 0; }
.ts-tbl td.nw { white-space: nowrap; }
.ts-chats summary { cursor: pointer; font-size: 16px; color: var(--dash-fg); }
.ts-chats .ts-tbl { margin-top: 14px; }
@media (max-width: 640px) {
  .ts-tbl .opt, .ts-chats .sub .opt { display: none; }
  .ts-tbl table { font-size: 12px; }
  .ts-tbl th, .ts-tbl td { padding: 6px 4px; }
  .ts-tbl tr.in td:first-child { padding-left: 10px; }
  .ts-opts { grid-template-columns: minmax(0, 1fr); }
  .ts-row { grid-template-columns: minmax(0, 1fr) 56px; }
  .ts-row .ts-track { grid-column: 1 / -1; grid-row: 2; }
}
`;

const fmt = (n) => (n == null || isNaN(n) ? "–" : Math.round(Number(n)).toLocaleString("en-US"));
const rowsOf = (q) => (Array.isArray(q.rows) ? q.rows : []);
const NAME = {
  today: ["Current", "Malloyyo as it is now"],
  "small edits": ["A · Small edits", "change A alone"],
  "short list": ["B1 · Names-only list", "change B1 alone"],
  "trimmed list": ["B2 · Trimmed list", "change B2 alone"],
  both: ["A + B1", "both changes together"],
};

// Where each version's cost comes from: every part on the same today = 100 scale.
const SHORT = { today: "Current", "trimmed list": "B2", "small edits": "A", "short list": "B1", both: "A+B1" };
const PART_ORDER = ["what Claude writes", "dataset list", "query results", "dashboard code sent", "help pages",
  "Claude's replies", "data descriptions", "other tool calls", "your messages", "other tool results", "save replies"];

function Breakdown({ base, order }) {
  const q = useQuery({ query: "token_savers_parts" });
  if (q.loading) return null;
  const cell = {};
  rowsOf(q).forEach((r) => { (cell[r.part] = cell[r.part] || {})[r.version] = (100 * Number(r.cost_per_chat)) / base; });
  const parts = PART_ORDER.filter((p) => cell[p]);
  return (
    <section className="ts-card">
      <h2>Where the cost comes from</h2>
      <p className="sub">Each part of an average chat, on the same scale (the current whole chat = 100). Writing is what
        Claude writes; every other row is content that stays in the chat and is read again on each later action.</p>
      <div className="ts-tbl">
        <table>
          <thead><tr><th>Part</th>{order.map((k) => <th key={k}>{SHORT[k]}</th>)}</tr></thead>
          <tbody>
            {parts.map((p, i) => [
              i === 1 ? <tr key="rr" className="grp"><td colSpan={order.length + 1}>Rereading</td></tr> : null,
              <tr key={p} className={p === "what Claude writes" ? "w" : "in"}>
                <td>{p === "what Claude writes" ? "Writing" : p === "your messages" ? "the user's messages"
                  : p === "data descriptions" ? "table descriptions looked up" : p}</td>
                {order.map((k) => <td key={k}>{cell[p][k] == null ? "–" : cell[p][k].toFixed(1)}</td>)}
              </tr>,
            ])}
            <tr className="sum"><td>Total</td>{order.map((k) => (
              <td key={k}>{Math.round(parts.reduce((n, p) => n + (cell[p][k] || 0), 0))}</td>))}</tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Chats({ base }) {
  const q = useQuery({ query: "token_savers_chats" });
  if (q.loading) return null;
  const ix = (n) => Math.round((100 * Number(n)) / base);
  // Group by version in the page's order and number the chats within each version (the test's internal chat names
  // don't match the version labels).
  const rank = Object.keys(NAME);
  const seen = {};
  const rows = rowsOf(q).slice().sort((a, b) => rank.indexOf(a.version) - rank.indexOf(b.version))
    .map((r) => ({ ...r, n: (seen[r.version] = (seen[r.version] || 0) + 1) }));
  return (
    <details className="ts-card ts-chats">
      <summary><b>Every test chat</b> ({rowsOf(q).length})</summary>
      <div className="ts-tbl">
        <table>
          <thead><tr><th>Version</th><th>#</th><th>Cost</th><th>Writing</th><th>Rereading</th>
            <th className="opt">List size</th><th className="opt">Small edits used</th><th className="opt">Actions</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.chat}>
                <td className="nw">{SHORT[r.version] || r.version}</td><td>{r.n}</td><td><b>{ix(r.cost_per_chat)}</b></td>
                <td>{ix(r.write_cost_per_chat)}</td><td>{ix(r.reread_cost_per_chat)}</td>
                <td className="opt">{fmt(r.list_size)}</td><td className="opt">{fmt(r.small_saves)}</td>
                <td className="opt">{fmt(r.model_calls)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sub">Cost, writing and rereading on the current = 100 scale.<span className="opt"> List size: characters
        in the dataset list. Small edits used: saves in the chat sent as small edits. Actions: Claude's model calls in the
        chat.</span> Every chat looked up one table's description.</p>
    </details>
  );
}

export default function TokenSavers() {
  const q = useQuery({ query: "token_savers_page" });
  if (q.loading) return <div className="ts"><style>{CSS}</style><p className="sub">Loading…</p></div>;
  const v = Object.fromEntries(rowsOf(q).map((r) => [r.version, r]));
  const base = Number((v.today || {}).cost_per_chat) || 1;
  const ix = (n) => (100 * Number(n)) / base;
  const order = Object.keys(NAME).filter((k) => v[k]);
  const maxIx = Math.max(...order.map((k) => ix(v[k].cost_per_chat)));
  const pos = (n) => `${(100 * n) / maxIx}%`;
  const r = (k, f) => Math.round(ix((v[k] || {})[f]));
  const shown = rowsOf(q).reduce((n, x) => n + Number(x.displayed || 0), 0);
  const total = rowsOf(q).reduce((n, x) => n + Number(x.chats || 0), 0);

  return (
    <div className="ts">
      <style>{CSS}</style>
      <h1>Token savers: Malloyyo dashboard chats</h1>
      <p className="lede">Two changes to Malloyyo, A and B1 below, each cut what a dashboard chat costs by about a
        third (100 → {r("small edits", "cost_per_chat")} and 100 → {r("short list", "cost_per_chat")}). <b>Together they cut it in half.</b> A third
        change, B2, saves little.</p>

      <div className="ts-opts">
        <div className="ts-opt">
          <h3>A · Small edits</h3>
          <p>When Claude edits a saved dashboard, it sends just the changed text instead of rewriting the whole
            dashboard (about 5,000 characters), even for a new title.</p>
        </div>
        <div className="ts-opt">
          <h3>B · A shorter list of data</h3>
          <p>At the start of a chat Claude asks Malloyyo for its list of data: every dataset, its tables and its
            dashboards. That list stays in the chat and Claude reads it again every time it takes another action.</p>
          <p className="alt">Two versions were tested, as alternatives: <b>B1 names only</b> (drop each table's one-line
            description and the dashboard details) and <b>B2 trimmed</b> (keep the table descriptions, drop each dashboard's description and link).</p>
        </div>
      </div>

      <section className="ts-card">
        <h2>Cost per chat (current = 100)</h2>
        <p className="sub">The current average chat is 100, so 50 means half the cost. Cost is tokens weighted by API
          price (a written token counts five times a new input token, a reread one a tenth of one), from {total} claude.ai test chats.</p>
        <div className="ts-key">
          <span><i style={{ background: "var(--write)" }} />Writing: what Claude writes (replies, saved dashboards)</span>
          <span><i style={{ background: "var(--read)" }} />Rereading: what Claude reads again each time it acts</span>
        </div>
        {order.map((k) => {
          const w = ix(v[k].write_cost_per_chat), rd = ix(v[k].reread_cost_per_chat);
          return (
            <div key={k} className={`ts-row${k === "both" ? " best" : ""}`}>
              <div className="name">{NAME[k][0]}<small>{NAME[k][1]} · {v[k].chats} chats</small></div>
              <div className="ts-track">
                <div className="ts-seg w" style={{ left: 0, width: pos(w) }}><span>{Math.round(w)}</span></div>
                <div className="ts-seg r" style={{ left: pos(w), width: pos(rd) }}><span>{Math.round(rd)}</span></div>
              </div>
              <div className="total">{Math.round(w + rd)}</div>
            </div>
          );
        })}
      </section>

      <section className="ts-rec">
        <h2>What to do</h2>
        <ul>
          <li><b>Ship A (small edits).</b> It cut the writing from {r("today", "write_cost_per_chat")} to {r("small edits", "write_cost_per_chat")} and
            the rereading a little ({r("today", "reread_cost_per_chat")} to {r("small edits", "reread_cost_per_chat")}, partly because less dashboard code stays in the chat);
            total 100 → {r("small edits", "cost_per_chat")}.</li>
          <li><b>Add B1 (names-only list) if losing table descriptions is acceptable.</b> It cut the rereading from{" "}
            {r("today", "reread_cost_per_chat")} to {r("short list", "reread_cost_per_chat")}. (Its chats also wrote a little less,{" "}
            {r("short list", "write_cost_per_chat")} vs {r("today", "write_cost_per_chat")}, which the list alone doesn't explain.) A shrinks the writing and B1 the rereading, so
            together both parts shrink: 100 → {r("both", "cost_per_chat")}. Without descriptions, Claude learns what a table holds by
            looking it up; in these tests it looked up one table per chat either way.</li>
          <li><b>B2 (trimmed list) alone isn't worth much:</b> 100 → {r("trimmed list", "cost_per_chat")}.</li>
        </ul>
      </section>

      <section className="ts-card ts-concl">
        <h2>How sure is this?</h2>
        <ul>
          <li>Three to six test chats per row (see below for why some rows have six). Every A + B1 chat ({r("both", "cost_min")}–{r("both", "cost_max")}) cost less than every
            chat with only one change ({Math.min(r("small edits", "cost_min"), r("short list", "cost_min"))} and up), so that gap is solid.</li>
          <li>A alone ({r("small edits", "cost_per_chat")}) and B1 alone ({r("short list", "cost_per_chat")}) are too close to call between them.</li>
          <li>B2's chats cost {r("trimmed list", "cost_min")} to {r("trimmed list", "cost_max")}, at or about the cheapest current chat ({r("today", "cost_min")}):
            a small but steady saving.</li>
          <li>Current chats ranged {r("today", "cost_min")} to {r("today", "cost_max")}; the one long chat ({r("today", "cost_max")}) pulls the
            baseline up, so every saving may be a few points smaller.</li>
          <li>Only what passes through the chat is counted. Claude's hidden thinking, claude.ai's own instructions and the
            tool list are left out, so the share of the whole bill saved is likely smaller than shown.</li>
          <li>Not tested: B1 on a question where Claude must choose between similar tables, and A + B2 together.</li>
        </ul>
      </section>

      <Breakdown base={base} order={order} />
      <Chats base={base} />

      <details>
        <summary>How this was tested</summary>
        <p>{total} claude.ai chats with Sonnet 5.5, the same nine requests (written for this test) in each (three questions, build a dashboard, four
          edits, one more question), on a test server with 16 made-up datasets sized like staging. Cost weights follow API
          prices: a written token about five times a new input token, a reread one (mostly cached) about a tenth. Characters
          are converted to tokens at four per token; claude.ai shows no token counts, hides Claude's thinking, and its own
          instructions and tool list are not counted. Current list: {fmt((v.today || {}).list_size)} characters; trimmed:{" "}
          {fmt((v["trimmed list"] || {}).list_size)}; names only: {fmt((v["short list"] || {}).list_size)}. The names-only list was
          not tested on a choice between similar sources. All {shown} test dashboards displayed correctly. Three chats planned as A and three
          planned as A + B1 ran without the small-edits option reaching Claude (claude.ai had kept the older tool list), so
          they were counted as current and as B1; that is why those rows have six chats. One more chat was discarded after a request was sent twice.</p>
      </details>
    </div>
  );
}
