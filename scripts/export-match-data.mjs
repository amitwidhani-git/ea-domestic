#!/usr/bin/env node
/**
 * Export raw match data (prediction, final result, live odds timeline) for
 * finished matches on a given UTC date — the data feed for the social-video
 * pipeline. No swing/highlight detection here on purpose: just the raw
 * joined data, so the video side can decide what's highlight-worthy itself.
 *
 * Usage: node scripts/export-match-data.mjs [YYYY-MM-DD]   (default: yesterday, UTC)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  const text = fs.readFileSync(path.join(root, ".env.local"), "utf8");
  const uri = text.match(/^MONGODB_URI=(.+)$/m)?.[1]?.trim();
  const dbName = text.match(/^MONGODB_DB=(.+)$/m)?.[1]?.trim() ?? "edgeanalysts";
  if (!uri) throw new Error("MONGODB_URI not found in .env.local");
  return { uri, dbName };
}

function targetDate() {
  const arg = process.argv[2];
  if (arg) return arg;
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

// Same "best price per outcome, independently, across bookmakers" convention
// ev_signals already uses site-wide — matches lib/liveFixtures.ts's
// fallbackPrematchOdds(), duplicated here since this script runs standalone,
// outside the Next.js app's module graph.
function bestPricePerSide(snaps) {
  const side = (key) => {
    const vals = snaps.map((s) => Number(s.prices?.[key])).filter((n) => Number.isFinite(n));
    return vals.length ? Math.max(...vals) : null;
  };
  const home = side("home"), draw = side("draw"), away = side("away");
  return home != null && draw != null && away != null ? { home, draw, away } : null;
}

async function main() {
  const { uri, dbName } = loadEnv();
  const date = targetDate();
  const from = `${date}T00:00:00.000Z`;
  const to = `${date}T23:59:59.999Z`;

  const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(dbName);

  // matches is the same collection /results and the homepage read from —
  // FINISHED is the only "settled" status value this collection uses.
  const matches = await db.collection("matches")
    .find({ status: "FINISHED", kickoffUtc: { $gte: from, $lte: to } })
    .sort({ kickoffUtc: 1 })
    .toArray();

  console.log(`Found ${matches.length} finished match(es) on ${date} (UTC).`);

  const out = [];
  for (const m of matches) {
    const matchId = String(m._id);

    const [prediction, evSignals, homeTeam, awayTeam] = await Promise.all([
      db.collection("predictions").findOne({ matchId }),
      db.collection("ev_signals").find({ matchId, settledResult: { $ne: null } }).toArray(),
      db.collection("teams").findOne({ _id: m.homeTeamId }),
      db.collection("teams").findOne({ _id: m.awayTeamId }),
    ]);

    // live_fixtures (the GCP poller's collection) only has a doc if the
    // poller happened to be tracking this fixture — not guaranteed for
    // every match in our own `matches` collection.
    const apiFixtureId = m.sourceRefs?.apiFootballFixtureId ?? null;
    const live = apiFixtureId != null ? await db.collection("live_fixtures").findOne({ fixtureId: apiFixtureId }) : null;

    let prematchOdds = null;
    if (live?.prematchOdds?.home != null) {
      prematchOdds = { ...live.prematchOdds, source: "live_fixtures poller" };
    } else {
      const snaps = await db.collection("odds_snapshots").find({ matchId }).toArray();
      const best = snaps.length ? bestPricePerSide(snaps) : null;
      prematchOdds = best ? { ...best, source: "odds_snapshots (best price)" } : null;
    }

    out.push({
      matchId,
      league: m.league ?? null,
      kickoffUtc: m.kickoffUtc ?? null,
      homeTeam: { id: String(m.homeTeamId), name: homeTeam?.name ?? null, apiFootballId: homeTeam?.aliases?.apiFootball ?? null },
      awayTeam: { id: String(m.awayTeamId), name: awayTeam?.name ?? null, apiFootballId: awayTeam?.aliases?.apiFootball ?? null },
      finalScore: m.score ?? null,
      penaltyScore: m.penaltyScore ?? null,
      ftr: m.ftr ?? null,
      prediction: prediction ? {
        pick: prediction.pick ?? null,
        probs: prediction.probs ?? null,
        modelCorrect: prediction.modelCorrect ?? null,
        frozenAt: prediction.frozenAt ?? null,
        hash: prediction.hash ?? null,
      } : null,
      evSignals: evSignals.map((s) => ({
        selection: s.selection ?? null,
        ev: s.ev ?? null,
        bestPrice: s.bestPrice ?? null,
        bestBookmaker: s.bestBookmaker ?? null,
        settledResult: s.settledResult ?? null,
      })),
      apiFootballFixtureId: apiFixtureId,
      trackedByPoller: live != null,
      prematchOdds,
      liveOddsFinal: live?.liveOdds ?? null,
      // Raw poller shape (minute, polledAt, home/draw/away as strings) —
      // left untransformed here; lib/liveFixtures.ts's mapOddsHistory() is
      // the place that normalises this for the web app.
      oddsHistory: live?.oddsHistory ?? [],
      events: live?.events ?? [],
    });
  }

  await client.close();

  const outDir = path.join(root, "scripts", "out");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  const withHistory = out.filter((m) => m.oddsHistory.length > 0).length;
  const withPrediction = out.filter((m) => m.prediction).length;
  console.log(`Wrote ${out.length} match record(s) to scripts/out/${date}.json`);
  console.log(`  ${withPrediction} of ${out.length} have a prediction, ${withHistory} have a live odds-history timeline.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
