import Link from "next/link";
import type { CSSProperties } from "react";
import LivescorebetPromo from "@/components/LivescorebetPromo";
import WorldCupProof from "@/components/WorldCupProof";
import GameRecord from "@/components/track-record/GameRecord";
import { MIN_SAMPLE, type GamePage, type GameQuery, type Report, type Tier } from "@/lib/trackRecord";
import "./trackRecord.css";

/** "View full results" link to /results, hidden for now. Flip to true to restore it. */
export const SHOW_FULL_RESULTS_LINK = false;

export type TrackRecordTab = "record" | "market" | "games" | "history";

export const TABS: { key: TrackRecordTab; label: string }[] = [
  { key: "record", label: "Our record" },
  { key: "market", label: "Compared against the market" },
  { key: "games", label: "Game record" },
  { key: "history", label: "History" },
];

/* ============================== helpers ============================== */
const pct = (c: number, n: number) => (n ? (c / n) * 100 : 0);
const fmt = (v: number) => `${Math.round(v)}%`;

function tierStats(report: Report, tier: Tier) {
  const rows = report.competitions.filter((r) => r.tier === tier);
  const c = rows.reduce((a, r) => a + r.c, 0), n = rows.reduce((a, r) => a + r.n, 0);
  return { c, n, rate: pct(c, n) };
}

// Claims render only while the data supports them
const headlineCopy = (overall: number, top: number) => {
  const lead = overall >= 44 ? "Right nearly half the time overall" : "Every pick, every competition, logged before kick-off";
  return top >= 48 ? `${lead}, and closer to 1 in 2 in Europe's top divisions` : lead;
};
const tierCopy: Record<Tier, (r: number) => string> = {
  top: (r) => (r >= 48 ? "About 1 in 2 top-flight picks called correctly" : "Europe's top divisions"),
  cup: () => "Cup ties often pair mismatched sides, so expect this to run higher",
  lower: () => "Tighter, more evenly matched leagues, where results are harder to call",
  women: () => "New for this season. Early sample, so read it as indicative",
  international: () => "New model, early data. Treat as indicative",
};

/* ============================== sections ============================== */
function Integrity({ report }: { report: Report }) {
  const { logged, edited, deleted } = report.integrity;
  const ll = report.lastLogged;
  return (
    <>
      <div className="integ">
        <div><b>{logged}</b><span>picks logged before kick-off</span></div>
        <div className="zero"><b>{edited}</b><span>edited after kick-off</span></div>
        <div className="zero"><b>{deleted}</b><span>deleted, win or lose</span></div>
      </div>
      {ll && <div className="ll">Last logged: {ll.label}, {ll.time}.{ll.hash && ` Hash ${ll.hash}`}</div>}
    </>
  );
}

function Ruler({ value }: { value: number }) {
  // No market-favourite marker on the hero, by design: the market comparison lives on its own tab.
  return (
    <div className="ruler" role="img" aria-label={`EdgeIQ ${fmt(value)} of picks correct`}>
      <div className="rtrack" />
      <div className="rfill" style={{ width: `${value}%` }} />
    </div>
  );
}

function Headline({ report }: { report: Report }) {
  const { correct, total } = report.overall;
  const rate = pct(correct, total);
  const { fixtures, withoutPick } = report.unpredicted;
  const top = tierStats(report, "top");
  // Hero shows top divisions only while it beats the overall; the overall always sits beside it
  const heroTop = top.n > 0 && top.rate > rate;
  const comps = report.competitions.filter((r) => r.n > 0).length;
  return (
    <div className="panel sec">
      <div className="head">
        <span className="big">{fmt(heroTop ? top.rate : rate)}</span>
        <div>
          {heroTop ? (
            <>
              <h2>in Europe&apos;s top divisions</h2>
              <p>{top.c} of {top.n} top-division picks correct. Across all {comps} competitions: {correct} of {total} ({fmt(rate)})</p>
            </>
          ) : (
            <>
              <h2>{correct} of {total} picks correct</h2>
              <p>{headlineCopy(rate, top.rate)}</p>
            </>
          )}
        </div>
      </div>
      <Ruler value={heroTop ? top.rate : rate} />
      {fixtures > 0 && (
        <p className="note">
          {withoutPick} of {fixtures} fixtures played this season have no pick because they were added after that round&apos;s freeze window. We never add picks late
        </p>
      )}
    </div>
  );
}

function Tiers({ report }: { report: Report }) {
  const order = ([["top", "Top divisions"], ["cup", "Cups"], ["lower", "Second tier and below"], ["women", "Women's Super League"], ["international", "Nations League"]] as [Tier, string][])
    .filter(([k]) => tierStats(report, k).n > 0);
  return (
    <div className="sec">
      <h2>The average hides a pattern</h2>
      <div className="sub">Sharpest where the data is deepest</div>
      <div className="tiers">
        {order.map(([k, label]) => {
          const s = tierStats(report, k);
          return (
            <div key={k} className="panel tier">
              <h3>{label}</h3>
              <b>{fmt(s.rate)}</b>
              <small>{s.c} of {s.n} correct. {tierCopy[k](s.rate)}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Staircase({ report }: { report: Report }) {
  const { bands, sample } = report.confidence;
  const last = bands[bands.length - 1];
  if (!last) return null;
  return (
    <div className="sec panel">
      <h2>The more confident EdgeIQ is, the more often it&apos;s right</h2>
      <div className="sub">How often picks landed, grouped by how confident EdgeIQ was before kick-off. {sample}</div>
      <div className="stairs">
        {bands.map((b) => {
          const r = pct(b.c, b.n);
          return (
            <div key={b.band} className="step">
              <div className="col">
                <div className="bar" style={{ height: `${Math.max(r, 12)}%` }}>{fmt(r)}</div>
              </div>
              <div className="lab">{b.band}</div>
              <div className="n">{b.c} of {b.n}</div>
            </div>
          );
        })}
      </div>
      <div className="n" style={{ marginTop: 6 }}>EdgeIQ&apos;s confidence in its pick</div>
      <p className="note">
        When EdgeIQ rated a result {last.band.toLowerCase()} likely, it happened {fmt(pct(last.c, last.n))} of the time. Even then, a pick can lose, so read these as probabilities, not tips
      </p>
    </div>
  );
}

function DrawStat({ report }: { report: Report }) {
  const { modelAvg, actual, n } = report.draws;
  return (
    <div className="panel tier">
      <h3>Draws, priced realistically</h3>
      <b>{fmt(modelAvg)} predicted, {fmt(actual)} actual</b>
      <small>EdgeIQ&apos;s average draw probability compared against the share of matches that actually ended level, across {n} matches</small>
    </div>
  );
}

function Pulse({ report }: { report: Report }) {
  const p = report.pulse;
  return (
    <div className="sec">
      <h2>{p.live ? <><span className="beat" aria-hidden="true" />Live now</> : "As of Monday"}</h2>
      <div className="pulse">
        <div><b>{p.locked}</b><span>{p.locked === 1 ? "pick" : "picks"} locked for upcoming fixtures</span></div>
        <div><b>{p.nextKickoff ?? "To be confirmed"}</b><span>next kick-off</span></div>
        <div><b>{p.awaiting}</b><span>{p.awaiting === 1 ? "pick" : "picks"} awaiting {p.awaiting === 1 ? "a result" : "results"}</span></div>
        <div><b>{p.updated}</b><span>last updated</span></div>
      </div>
    </div>
  );
}

function Trend({ report }: { report: Report }) {
  const { weeks, small } = report.trend;
  if (weeks.length < 4) return null;
  const rates = weeks.map((w) => w.rate);
  const W = 640, H = 200, P = 32;
  // y-axis scales to the data (with the chance baseline always in view)
  const lo = Math.min(Math.floor(report.chanceBaseline / 5) * 5 - 5, Math.floor((Math.min(...rates) - 5) / 5) * 5);
  const hi = Math.max(60, Math.ceil((Math.max(...rates) + 5) / 5) * 5);
  const x = (i: number) => P + (i * (W - P * 2)) / Math.max(weeks.length - 1, 1);
  const y = (v: number) => H - P - ((v - lo) / (hi - lo)) * (H - P * 2);
  const pts = weeks.map((w, i) => `${x(i)},${y(w.rate)}`).join(" ");
  return (
    <div className="sec panel trend">
      <h2>Weekly hit rate</h2>
      <div className="sub">Every week&apos;s picks, win or lose, by week commencing. The dashed line marks what guessing would get</div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weekly hit rate over ${weeks.length} weeks: ${weeks.map((w) => `${w.wk} ${w.rate}%`).join(", ")}`}>
        <line x1={P} x2={W - P} y1={y(report.chanceBaseline)} y2={y(report.chanceBaseline)} stroke="var(--mut)" strokeDasharray="4 4" />
        <polyline points={pts} fill="none" stroke="var(--g)" strokeWidth="3" strokeLinejoin="round" />
        {weeks.map((w, i) => (
          <g key={w.wk}>
            <circle cx={x(i)} cy={y(w.rate)} r="4" fill="var(--g)" />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--mut)">{w.wk}</text>
            <text x={x(i)} y={y(w.rate) - 10} textAnchor="middle" fontSize="12" fill="var(--tx)">{w.rate}%</text>
          </g>
        ))}
      </svg>
      {small.length > 0 && (
        <p className="note">
          Weeks with fewer than {MIN_SAMPLE} picks are left off the chart: {small.map((w) => `w/c ${w.wk} (${w.c} of ${w.n})`).join(", ")}
        </p>
      )}
    </div>
  );
}

function MarketCalls({ report }: { report: Report }) {
  const calls = report.modelCalls;
  const d = report.market.diverged;
  if (!calls.length) return null;
  return (
    <div className="sec panel">
      <h2>Calls the market didn&apos;t see</h2>
      <div className="sub">
        Results EdgeIQ picked that the market rated unlikely. For balance: when they disagreed, EdgeIQ was right {d.model} times and the market {d.market} times
      </div>
      <div className="calls">
        {calls.map((c) => (
          <div key={`${c.match}-${c.date}`} className="call">
            <span>{c.match} <small>{c.date}</small></span>
            <small>EdgeIQ said {c.modelProb}%, market said {c.marketProb}%</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function Ladder({ report }: { report: Report }) {
  const rows = report.competitions
    .filter((r) => r.n > 0)
    .map((r) => ({ ...r, rate: pct(r.c, r.n) }))
    .sort((a, b) => Number(b.n >= MIN_SAMPLE) - Number(a.n >= MIN_SAMPLE) || b.rate - a.rate);
  return (
    <div className="sec">
      <h2>Every competition, ranked</h2>
      <div className="sub">The line marks what guessing would get. Faded rows have fewer than {MIN_SAMPLE} picks, so treat them as early reads</div>
      <div className="ladder">
        {rows.map((r) => (
          <div key={r.code} className={`rung${r.n < MIN_SAMPLE ? " small" : ""}`}>
            <span>{r.name}</span>
            <div className="tk">
              <div className="fl" style={{ width: `${r.rate}%` }} />
              <div className="base" style={{ left: `${report.chanceBaseline}%` }} />
            </div>
            <span>{fmt(r.rate)} <em>{r.c}/{r.n}</em></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Form({ report }: { report: Report }) {
  if (!report.recent.length) return null;
  const wins = report.recent.filter((x) => x.correct).length;
  return (
    <div className="sec">
      <h2>Latest {report.recent.length} picks</h2>
      <div className="sub">{wins} correct. Shown in kick-off order, nothing filtered</div>
      <div className="form">
        {report.recent.map((r) => (
          <div
            key={r.matchId}
            role="img"
            className={`dot${r.correct ? " w" : ""}`}
            title={`${r.label}: ${r.correct ? "correct" : "wrong"}`}
            aria-label={`${r.label}: ${r.correct ? "correct" : "wrong"}`}
          />
        ))}
      </div>
    </div>
  );
}

function MarketTab({ report }: { report: Report }) {
  const m = report.market;
  const mr = pct(m.model.c, m.model.n), kr = pct(m.market.c, m.market.n);
  const alignedN = m.aligned.correct + m.aligned.wrong;
  const d = m.diverged, dn = d.model + d.market + d.neither;
  const seg = (v: number, c: string, l: string) => ({ v, c, l, w: pct(v, dn) });
  const segs = [seg(d.model, "var(--g)", "EdgeIQ right"), seg(d.market, "var(--mk)", "Market right"), seg(d.neither, "var(--line)", "Neither")];
  return (
    <>
      <div className="panel sec">
        <h2>EdgeIQ compared against the market favourite</h2>
        <div className="sub">Same fixtures, {m.sample}. EdgeIQ&apos;s probabilities are set independently of the odds</div>
        <div className="vs">
          <div className="vsrow"><span>EdgeIQ</span><div className="tk"><div className="fl" style={{ width: `${mr}%` }} /></div><b>{fmt(mr)}</b></div>
          <div className="vsrow"><span>Market favourite</span><div className="tk"><div className="fl" style={{ width: `${kr}%`, background: "var(--mk)" }} /></div><b>{fmt(kr)}</b></div>
        </div>
        <p className="note">
          {kr > mr
            ? "The market is ahead on picking the most likely result so far. We publish this because a record you can check is worth more than one that only shows wins"
            : "EdgeIQ is level with or ahead of the market favourite on these fixtures so far. We publish this comparison either way, because a record you can check is worth more than one that only shows wins"}
        </p>
      </div>

      <div className="tiers split sec" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <div className="panel tier">
          <h3>When EdgeIQ and the market agree</h3>
          <b>{fmt(pct(m.aligned.correct, alignedN))}</b>
          <small>{m.aligned.correct} of {alignedN} correct</small>
        </div>
        <div className="panel">
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>When they disagree ({dn} matches)</h3>
          <div className="stack" role="img" aria-label={segs.map((s) => `${s.l} ${s.v}`).join(", ")}>
            {segs.map((s) => <div key={s.l} style={{ width: `${s.w}%`, background: s.c }}>{s.v}</div>)}
          </div>
          <div className="legend">{segs.map((s) => <span key={s.l} style={{ "--c": s.c } as CSSProperties}>{s.l}</span>)}</div>
        </div>
      </div>

      <MarketCalls report={report} />

      {!m.edgeReady && (
        <p className="note sec">Edge percentage results appear here once bookmaker prices are converted to fair probabilities, so the comparison with EdgeIQ is like for like</p>
      )}
    </>
  );
}

/* ============================== page ============================== */
export default function TrackRecordDashboard({
  report, tab, games, gameQuery, gameLeagues,
}: {
  report: Report;
  tab: TrackRecordTab;
  games: GamePage | null;
  gameQuery: GameQuery;
  gameLeagues: { code: string; name: string }[];
}) {
  return (
    <div className="tr">
      <h1>Track record</h1>
      <p>
        A permanent log, not a highlight reel. Every Edge Analysts prediction goes live before kick-off and is never altered,
        removed or rewritten, whether it&apos;s right or wrong.
      </p>
      <p style={{ marginTop: 6, fontSize: 13 }}>Updated {report.asOf}</p>
      {SHOW_FULL_RESULTS_LINK && (
        <Link href="/results" className="link" style={{ display: "inline-block", marginTop: 12 }}>
          View full results →
        </Link>
      )}
      <Integrity report={report} />
      <Pulse report={report} />

      <nav className="tabs" aria-label="Track record views">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "record" ? "/track-record" : `/track-record?tab=${t.key}`}
            className="tab"
            aria-current={tab === t.key ? "page" : undefined}
            scroll={false}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "record" && (
        <>
          <p className="note" style={{ marginTop: 24 }}>
            Every figure on this tab is calculated from the full prediction log and updates automatically as results
            come in, so the latest games are always included. Last updated {report.asOf}. The comparison against the
            market uses a weekly snapshot, currently covering {report.marketPeriod}.
          </p>
          <Headline report={report} />
          <Trend report={report} />
          <Tiers report={report} />
          <Staircase report={report} />
          <div className="sec" style={{ maxWidth: 420 }}><DrawStat report={report} /></div>
          <div className="sec"><LivescorebetPromo /></div>
          <Ladder report={report} />
          <Form report={report} />
        </>
      )}
      {tab === "market" && <MarketTab report={report} />}
      {tab === "games" && games && <GameRecord games={games} query={gameQuery} leagues={gameLeagues} />}
      {tab === "history" && (
        <div className="sec">
          <WorldCupProof intro="Edge Analysts created the EdgeIQ model and have already tested it at the highest level. Every prediction below was frozen ahead of kick-off across all 104 World Cup matches. Here's exactly how it played out, round by round." />
        </div>
      )}

      <section className="sec">
        <h2>How the track record works</h2>
        <div className="tiers" style={{ marginTop: 16 }}>
          <div className="panel tier">
            <h3>How we settle predictions</h3>
            <p style={{ fontSize: 14 }}>
              League fixtures such as the Premier League and Championship settle on the 90-minute result, so a draw
              after 90 minutes is a draw. Cup fixtures such as the FA Cup, League Cup and Community Shield settle on the
              final outcome, including penalty shootouts where applicable, with the winner advancing.
            </p>
          </div>
          <div className="panel tier">
            <h3>What does Edge Analysts publish, and when?</h3>
            <p style={{ fontSize: 14 }}>
              Edge Analysts publishes an EdgeIQ model output and an edge percentage for every fixture, before kick-off.
              Every single one goes into the audit log. Nothing is added afterward. Nothing is removed. The record is
              immutable, auditable and timestamped. What you get is an unbiased, data-led read on every match, checkable
              against the record and against live market odds.
            </p>
          </div>
        </div>
      </section>

      <div className="disc">Model probability only. Not a betting recommendation. 18+ BeGambleAware.org</div>
    </div>
  );
}

