import path from "node:path";
import fs from "node:fs";

import { WorldDatabase } from "../../database/world/WorldDatabase.js";
import {
  FastStartService,
  type FastStartTemplate,
} from "../../world/services/FastStartService.js";
import { WorldStatisticsService } from "../../world/services/WorldStatisticsService.js";
import { WorldValidator } from "../../world/validation/WorldValidator.js";

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

  const validation = new WorldValidator(database).validate();

  if (!validation.valid) {
    console.log("");
    console.log("Validation: FAILED");

    for (const issue of validation.errors) {
      console.error(
        `[ERROR] [${issue.rule}] ${issue.message}`,
      );
    }

    throw new Error("World validation failed.");
  }

  console.log("");
  console.log("World generated successfully.");

  console.log("");
  console.log(
    `Validation: PASSED${validation.warnings.length > 0
      ? ` (${validation.warnings.length} warnings)`
      : ""
    }`,
  );

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