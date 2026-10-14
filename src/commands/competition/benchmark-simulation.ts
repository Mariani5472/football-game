import path from "node:path";
import { WorldDatabase } from "../../database/world/WorldDatabase.js";
import { CompetitionEngine } from "../../modules/competition/engine/CompetitionEngine.js";
import { CompetitionRepository } from "../../modules/competition/repository/CompetitionRepository.js";

const worldPath = path.resolve(process.cwd(), process.env.WORLD_DB ?? "save/world.db");
const iterations = Math.max(1, Number(process.argv[2] ?? 100));
const world = WorldDatabase.open(worldPath);
try {
  const repository = new CompetitionRepository(world);
  const season = world.connection.prepare(
    "SELECT id FROM competition_season ORDER BY year DESC, id LIMIT 1",
  ).get() as { id: number } | undefined;
  if (!season) throw new Error("World has no competition season to benchmark.");
  const engine = new CompetitionEngine(world);
  const generated = engine.generateSeason({ competitionSeasonId: season.id });
  const started = performance.now();
  let fixtures = 0;
  for (let iteration = 0; iteration < iterations; iteration++) {
    const result = engine.simulateSeason(generated, 2026 + iteration);
    fixtures += result.fixturesPlayed;
  }
  const elapsedMs = performance.now() - started;
  console.log("Competition simulation benchmark");
  console.log(`Iterations: ${iterations}`);
  console.log(`Fixtures per iteration: ${generated.fixtures.length}`);
  console.log(`Fixtures simulated: ${fixtures}`);
  console.log(`Elapsed: ${elapsedMs.toFixed(2)} ms`);
  console.log(`Throughput: ${(fixtures / Math.max(elapsedMs, 0.001) * 1000).toFixed(0)} fixtures/s`);
} finally {
  world.close();
}
