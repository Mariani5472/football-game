import path from "node:path";
import { WorldDatabase } from "../../database/world/WorldDatabase.js";
import { CompetitionEngine } from "../../modules/competition/engine/CompetitionEngine.js";

const worldPath = path.resolve(process.cwd(), process.env.WORLD_DB ?? "save/world.db");
const iterations = Math.max(1, Number(process.argv[2] ?? 100));
const world = WorldDatabase.open(worldPath);
try {
  const latest = world.connection.prepare(
    "SELECT MAX(year) AS year FROM competition_season",
  ).get() as { year: number | null };
  if (latest.year == null) throw new Error("World has no competition seasons to benchmark.");

  const seasons = world.connection.prepare(
    "SELECT id, competition_id AS competitionId FROM competition_season WHERE year = ? ORDER BY competition_id",
  ).all(latest.year) as Array<{ id: number; competitionId: number }>;
  if (!seasons.length) throw new Error(`World has no competition seasons for ${latest.year}.`);

  const engine = new CompetitionEngine(world);
  const generated = seasons.map((season) => ({
    ...season,
    season: engine.generateSeason({ competitionSeasonId: season.id }),
  }));
  const fixturesPerIteration = generated.reduce((sum, item) => sum + item.season.fixtures.length, 0);
  const started = performance.now();
  let fixtures = 0;
  for (let iteration = 0; iteration < iterations; iteration++) {
    for (const item of generated) {
      const result = engine.simulateSeason(item.season, 2026 + iteration + item.competitionId * 31);
      fixtures += result.fixturesPlayed;
    }
  }
  const elapsedMs = performance.now() - started;
  console.log("Competition batch simulation benchmark");
  console.log(`Season year: ${latest.year}`);
  console.log(`Competitions/seasons: ${generated.length}`);
  console.log(`Iterations: ${iterations}`);
  console.log(`Fixtures per batch: ${fixturesPerIteration}`);
  console.log(`Fixtures simulated: ${fixtures}`);
  console.log(`Elapsed: ${elapsedMs.toFixed(2)} ms`);
  console.log(`Throughput: ${(fixtures / Math.max(elapsedMs, 0.001) * 1000).toFixed(0)} fixtures/s`);
} finally {
  world.close();
}
