import fs from "node:fs";
import path from "node:path";

import { WorldDatabase } from "../../database/world/WorldDatabase.js";
import { NewCareerService } from "../../career/NewCareerService.js";

const worldPath = path.resolve(process.cwd(), "save/world.db");
const savePath = path.resolve(process.cwd(), "save/career.db");
const gameDate = "2026-04-04";

if (!fs.existsSync(worldPath)) {
  throw new Error(
    `World database não encontrada: ${worldPath}. Execute "npm run world:fast-start -- BRAZIL" primeiro.`,
  );
}

if (fs.existsSync(savePath)) {
  fs.unlinkSync(savePath);
}

const world = WorldDatabase.open(worldPath);

try {
  const manager =
    world.connection
      .prepare(`
        SELECT
          p.person_id AS personId,
          pc.club_id AS clubId
        FROM player p
        INNER JOIN person_contract pc
          ON pc.person_id = p.person_id
        ORDER BY p.person_id
        LIMIT 1
      `)
      .get();

  if (!manager) {
    throw new Error(
      "World não possui um manager inicial válido.",
    );
  }

  const result = new NewCareerService(world).create({
    savePath,
    saveName: "Brazil Career",
    gameDate,
    managerPersonId: manager.personId,
    managerClubId: manager.clubId,
    packageName: "world.db",
    packageVersion: "2",
    sourcePath: worldPath,
  });

  console.log("");
  console.log("New Career created successfully.");
  console.log(`Save: ${result.savePath}`);
  console.log(`Teams: ${result.teams}`);
  console.log(`Players: ${result.players}`);
  console.log(`Contracts: ${result.contracts}`);
  console.log(`Competitions: ${result.competitions}`);
  console.log(`Fixtures: ${result.fixtures}`);
} finally {
  world.close();
}
