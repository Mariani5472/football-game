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

  const result = service.run({
    template: selectedTemplate,
    seasonYear,
  });

  const validation = result.summary.validation;

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
  console.log(`Calendar: ${result.summary.counts.rounds} rounds / ${result.summary.counts.fixtures} fixtures`);
  console.log(`Build status: ${database.metadata("world_build_status") ?? "UNKNOWN"}`);

  console.log("");
  console.log(
    `Validation: PASSED${validation.warnings.length > 0
      ? ` (${validation.warnings.length} warnings)`
      : ""
    }`,
  );

  for (const issue of validation.warnings) {
    console.warn(
      `[WARNING] [${issue.rule}] ${issue.message}`,
    );
  }

  for (const issue of validation.infos) {
    console.info(
      `[INFO] [${issue.rule}] ${issue.message}`,
    );
  }

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