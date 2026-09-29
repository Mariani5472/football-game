import path from "node:path";
import fs from "node:fs";

import { WorldDatabase } from "../../database/world/WorldDatabase.js";
import {
  FastStartService,
  type FastStartTemplate,
} from "../../world/services/FastStartService.js";
import { WorldStatisticsService } from "../../world/services/WorldStatisticsService.js";

const argument = process.argv[2];

const template =
  argument?.toUpperCase() as FastStartTemplate | undefined;

const selectedTemplate =
  template === "SANDBOX" ||
    template === "BRAZIL" ||
    template === "EMPTY"
    ? template
    : "SANDBOX";

const seasonYear = 2026;

const databasePath = path.resolve(
  process.cwd(),
  "save/world.db",
);

console.log(
  `Generating world using ${selectedTemplate}...`,
);

if (fs.existsSync(databasePath)) {
  fs.unlinkSync(databasePath);
}

const database = WorldDatabase.create(
  databasePath,
);

try {
  const service = new FastStartService(database);

  service.run({
    template: selectedTemplate,
    seasonYear,
  });

  console.log("");
  console.log("World generated successfully.");

  const statistics =
    new WorldStatisticsService(database).get();

  console.log("");
  console.log(`Countries: ${statistics.countries}`);
  console.log(`Cities: ${statistics.cities}`);
  console.log(`Teams: ${statistics.teams}`);
  console.log(`Players: ${statistics.players}`);
  console.log(`Stadiums: ${statistics.stadiums}`);
  console.log(
    `Competitions: ${statistics.competitions}`,
  );

} finally {
  database.close();
}