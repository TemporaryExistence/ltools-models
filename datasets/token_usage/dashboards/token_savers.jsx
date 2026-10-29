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
@media (max-width: 640px) {
  .ts-opts { grid-template-columns: minmax(0, 1fr); }
  .ts-row { grid-template-columns: minmax(0, 1fr) 56px; }
  .ts-row .ts-track { grid-column: 1 / -1; grid-row: 2; }
}
`;

const fmt = (n) => (n == null || isNaN(n) ? "–" : Math.round(Number(n)).toLocaleString("en-US"));
const rowsOf = (q) => (Array.isArray(q.rows) ? q.rows : []);
const NAME = {
  today: ["Today", "no change"],
  "trimmed list": ["B2 · Trimmed list", "keep descriptions, drop dashboard details"],
  "small edits": ["A · Small edits", "change A alone"],
  "short list": ["B1 · Names-only list", "change B1 alone"],
  both: ["A + B1", "both changes together"],
};

export default function TokenSavers() {
  const q = useQuery({ query: "token_savers_page" });
  if (q.loading) return <div className="ts"><style>{CSS}</style><p className="sub">Loading…</p></div>;
  const v = Object.fromEntries(rowsOf(q).map((r) => [r.version, r]));
  const base = Number((v.today || {}).cost_per_chat) || 1;
  const ix = (n) => (100 * Number(n)) / base;
  const order = Object.keys(NAME).filter((k) => v[k]).sort((a, b) => v[b].cost_per_chat - v[a].cost_per_chat);
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
        third. <b>Together they cut it in half.</b></p>

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
            description) and <b>B2 trimmed</b> (keep descriptions, drop dashboard descriptions and links).</p>
        </div>
      </div>

      <section className="ts-card">
        <h2>Cost per chat (today = 100)</h2>
        <p className="sub">Today's average chat is 100, so 50 means half the cost. Estimated at API
          prices from {total} claude.ai test chats.</p>
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
          <li><b>Ship A (small edits).</b> It cut the writing from {r("today", "write_cost_per_chat")} to {r("small edits", "write_cost_per_chat")}; total
            100 → {r("small edits", "cost_per_chat")}.</li>
          <li><b>Add B1 (names-only list) if losing table descriptions is acceptable.</b> It cut the rereading from{" "}
            {r("today", "reread_cost_per_chat")} to {r("short list", "reread_cost_per_chat")}. A shrinks the writing and B1 the rereading, so
            together both parts shrink: 100 → {r("both", "cost_per_chat")}. Without descriptions, Claude learns what a table holds by
            looking it up; in these tests it looked up one table per chat either way.</li>
          <li><b>B2 (trimmed list) alone isn't worth much:</b> 100 → {r("trimmed list", "cost_per_chat")}.</li>
        </ul>
      </section>

      <section className="ts-card ts-concl">
        <h2>How sure is this?</h2>
        <ul>
          <li>Three to six test chats per row. Every A + B1 chat ({r("both", "cost_min")}–{r("both", "cost_max")}) cost less than every
            chat with only one change ({Math.min(r("small edits", "cost_min"), r("short list", "cost_min"))} and up), so that gap is solid.</li>
          <li>A alone ({r("small edits", "cost_per_chat")}) and B1 alone ({r("short list", "cost_per_chat")}) are too close to call between them.</li>
          <li>B2's chats cost {r("trimmed list", "cost_min")} to {r("trimmed list", "cost_max")}, all at or below today's cheapest chat ({r("today", "cost_min")}):
            a small but steady saving.</li>
          <li>B1 was not tested on a question where Claude must choose between similar tables.</li>
        </ul>
      </section>

      <details>
        <summary>How this was tested</summary>
        <p>{total} claude.ai chats with Sonnet 5.5, the same nine requests in each (three questions, build a dashboard, four
          edits, one more question), on a test server with 16 made-up datasets sized like staging. Cost weights follow API
          prices: a written token about five times a new input token, a reread one (mostly cached) about a tenth. Characters
          are converted to tokens at four per token; claude.ai shows no token counts, hides Claude's thinking, and its own
          instructions and tool list are not counted. Today's list: {fmt((v.today || {}).list_size)} characters; trimmed:{" "}
          {fmt((v["trimmed list"] || {}).list_size)}; names only: {fmt((v["short list"] || {}).list_size)}. The names-only list was
          not tested on a choice between similar sources. All {shown} test dashboards displayed correctly. Three of the six
          "today" chats and three names-only chats ran on a build whose edits option Claude never saw; one more chat was
          discarded after a request was sent twice.</p>
      </details>
    </div>
  );
}
