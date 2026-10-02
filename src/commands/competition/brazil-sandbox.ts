import fs from "node:fs";
import path from "node:path";

import { WorldDatabase } from "../../database/world/WorldDatabase.js";
import {
  CompetitionEngine,
} from "../../modules/competition/engine/CompetitionEngine.js";
import {
  CompetitionRepository,
} from "../../modules/competition/repository/CompetitionRepository.js";
import {
  FastStartService,
} from "../../world/services/FastStartService.js";

const seasonYear = 2026;
const databasePath = path.resolve(
  process.cwd(),
  "save/world.db",
);

if (fs.existsSync(databasePath)) {
  fs.unlinkSync(databasePath);
}

const database =
  WorldDatabase.create(databasePath);

try {
  new FastStartService(database).run({
    template: "BRAZIL",
    seasonYear,
  });

  const repository =
    new CompetitionRepository(database);

  const competition =
    repository.findByName("Brasileirão");

  if (!competition) {
    throw new Error(
      "Brazil Sandbox não criou a competição esperada.",
    );
  }

  const season =
    repository.findSeason(
      competition.id,
      seasonYear,
    );

  if (!season) {
    throw new Error(
      "Brazil Sandbox não criou a temporada esperada.",
    );
  }

  const participants =
    repository.findParticipants(season.id);

  if (participants.length !== 20) {
    throw new Error(
      `Esperados 20 participantes, encontrados ${participants.length}.`,
    );
  }

  const engine =
    new CompetitionEngine(database);

  const generated =
    engine.generateSeason({
      competitionSeasonId: season.id,
    });

  console.log("");
  console.log(
    `Competition: ${competition.name}`,
  );
  console.log(
    `Season: ${season.year}`,
  );
  console.log(
    `Teams: ${generated.participants.length}`,
  );
  console.log(
    `Rounds: ${generated.rounds}`,
  );
  console.log(
    `Fixtures: ${generated.fixtures.length}`,
  );

  if (
    generated.rounds !== 38 ||
    generated.fixtures.length !== 380
  ) {
    throw new Error(
      "Brazil Sandbox não gerou 38 rodadas / 380 fixtures.",
    );
  }

  const simulation =
    engine.simulateSeason(generated);

  console.log(
    `Fixtures simulated: ${simulation.fixturesPlayed}`,
  );
  console.log("");
  console.log("Final standings:");

  for (
    const [index, row]
    of simulation.standings.entries()
  ) {
    const team =
      generated.participants.find(
        (participant) =>
          participant.teamId === row.teamId,
      );

    console.log(
      `${String(index + 1).padStart(2, " ")}. ${team?.name ?? row.teamId} - ${row.points} pts`,
    );
  }
} finally {
  database.close();
}
