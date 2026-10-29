import React from "react";
import { useQuery } from "@malloyyo/dashboard";

// Self-contained: a dashboard component can import only React and @malloyyo/dashboard.
// Two changes, each with what it is, what it saved and one chart across all four versions.

const CSS = `
.ts { --save: #22c55e; --cost: #f59e0b; box-sizing: border-box; max-width: 820px; margin: 0 auto; padding: 32px 16px 48px;
  font-family: var(--dash-font); color: var(--dash-fg); }
.ts *, .ts *::before, .ts *::after { box-sizing: border-box; }
.ts h1 { font-size: 26px; line-height: 1.2; margin: 0 0 8px; }
.ts .lede { font-size: 18px; line-height: 1.45; margin: 0 0 36px; color: var(--dash-muted); }
.ts-card { border: 1px solid var(--dash-border); border-left: 4px solid var(--save); border-radius: 14px; padding: 26px 26px 20px; margin: 0 0 28px;
  display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 28px; }
.ts-big { font-size: 46px; font-weight: 700; line-height: 1; color: var(--save); font-variant-numeric: tabular-nums; }
.ts-cap { font-size: 14px; color: var(--dash-muted); margin-top: 8px; line-height: 1.35; }
.ts h2 { font-size: 20px; line-height: 1.3; margin: 0 0 8px; }
.ts p { font-size: 15px; line-height: 1.5; margin: 0 0 22px; }
.ts .small { font-size: 13px; color: var(--dash-muted); margin: 14px 0 0; }
.ts-row { margin: 0 0 14px; }
.ts-row .top { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.ts-row .val { font-variant-numeric: tabular-nums; white-space: nowrap; }
.ts-track { height: 18px; margin-top: 5px; border-radius: 5px; background: color-mix(in srgb, var(--dash-border) 55%, transparent); }
.ts-bar { height: 100%; border-radius: 5px; background: color-mix(in srgb, var(--dash-muted) 55%, transparent); }
.ts-row.hi .ts-bar { background: var(--save); }
.ts-row.base .ts-bar { background: var(--cost); }
.ts-row.base .val { color: var(--cost); }
.ts-row.hi .val { color: var(--save); }
.ts .cost { color: var(--cost); font-weight: 700; }
.ts .save { color: var(--save); font-weight: 700; }
.ts-tag { display: inline-block; font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 999px; margin-bottom: 8px;
  color: var(--save); border: 1px solid var(--save); }
.ts-row.hi .top { font-weight: 700; }
.ts-foot { font-size: 16px; margin: 8px 0 22px; padding: 14px 18px; border-radius: 12px;
  background: color-mix(in srgb, var(--save) 14%, transparent); border: 1px solid color-mix(in srgb, var(--save) 45%, transparent); }
.ts details { font-size: 13px; color: var(--dash-muted); line-height: 1.5; }
.ts summary { cursor: pointer; }
@media (max-width: 640px) { .ts-card { grid-template-columns: minmax(0, 1fr); gap: 14px; padding: 20px 18px 16px; } }
`;

const fmt = (n) => (n == null || isNaN(n) ? "–" : Math.round(Number(n)).toLocaleString("en-US"));
const k = (n) => (n == null || isNaN(n) ? "–" : `${Math.round(Number(n) / 1000)},000`);
const pct = (n) => (n == null || isNaN(n) ? "–" : `${Math.round(Number(n) * 100)}%`);
const rowsOf = (q) => (Array.isArray(q.rows) ? q.rows : []);

const ORDER = ["today", "small edits", "short list", "both"];
const LABEL = { today: "Today", "small edits": "Small edits", "short list": "Shorter dataset list", both: "Both changes" };

function Bars({ v, field, hi }) {
  const rows = ORDER.filter((x) => v[x]);
  const max = Math.max(1, ...rows.map((x) => Number(v[x][field]) || 0));
  return rows.map((x) => (
    <div key={x} className={`ts-row${hi.includes(x) ? " hi" : x === "today" ? " base" : ""}`}>
      <div className="top"><span>{LABEL[x]}</span><span className="val">{fmt(v[x][field])}</span></div>
      <div className="ts-track"><div className="ts-bar" style={{ width: `${(100 * (Number(v[x][field]) || 0)) / max}%` }} /></div>
    </div>
  ));
}

export default function TokenSavers() {
  const q = useQuery({ query: "token_savers_page" });
  const v = Object.fromEntries(rowsOf(q).map((r) => [r.version, r]));
  const t = v.today || {};
  const e = v["small edits"] || {};
  const s = v["short list"] || {};
  const cut = (a, b) => (a && b != null ? 1 - b / a : null);
  const total = rowsOf(q).reduce((n, r) => n + Number(r.chats || 0), 0);
  const shown = rowsOf(q).reduce((n, r) => n + Number(r.displayed || 0), 0);

  if (q.loading) return <div className="ts"><style>{CSS}</style><p className="small">Loading…</p></div>;

  return (
    <div className="ts">
      <style>{CSS}</style>
      <h1>Token savers: Malloyyo dashboard chats</h1>
      <p className="lede">Two changes, each halving one part of a dashboard chat. Tested in claude.ai.</p>

      <section className="ts-card">
        <div>
          <div className="ts-big">−{pct(cut(t.written_per_chat, e.written_per_chat))}</div>
          <div className="ts-cap">written per chat</div>
        </div>
        <div>
          <span className="ts-tag">Tested</span>
          <h2>Send only the change</h2>
          <p>Today every edit resends the whole dashboard, <span className="cost">about 5,000 characters</span>. With a
            find-and-replace option, Claude sends <span className="save">just the change</span>.</p>
          <Bars v={v} field="written_per_chat" hi={["small edits", "both"]} />
          <p className="small">Characters Claude wrote per chat. All {shown} test dashboards displayed correctly.</p>
        </div>
      </section>

      <section className="ts-card">
        <div>
          <div className="ts-big">−{pct(cut(t.reread_per_chat, s.reread_per_chat))}</div>
          <div className="ts-cap">reread per chat</div>
        </div>
        <div>
          <span className="ts-tag">Tested</span>
          <h2>Shorten the dataset list</h2>
          <p>List only source names and dashboard titles; details stay in describe_source. The list drops from{" "}
            <span className="cost">{fmt(t.list_size)}</span> to <span className="save">{fmt(s.list_size)}</span> characters, and Claude rereads it at every step.</p>
          <Bars v={v} field="reread_per_chat" hi={["short list", "both"]} />
          <p className="small">Estimated tokens Claude reread per chat.</p>
        </div>
      </section>

      <p className="ts-foot"><b>Together, both halve.</b> At API prices the two savings are about equal.</p>
      <details>
        <summary>How this was tested</summary>
        <p className="small">{total} claude.ai chats with Sonnet 5.5, the same nine requests in each (three questions,
          build a dashboard, four edits, one more question), on a test server with 16 made-up datasets sized like
          staging. Three to six chats per version. Figures are characters, or tokens estimated as characters ÷ 4,
          since claude.ai shows no token counts; its own instructions and tool list are not counted. Today's dashboards
          resend 4,800 to 6,100 characters per edit. Three of the six "today" chats, and three "shorter list" chats, ran on a
          build whose edits option Claude never saw. Claude still called describe_source once per chat with the short
          list. More compact query results were tried in Claude Code (two chats) and showed no clear saving.</p>
      </details>
    </div>
  );
}
