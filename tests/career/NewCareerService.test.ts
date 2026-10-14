import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import { SaveDatabase } from "../../src/database/save/SaveDatabase.js";
import { WorldDatabase } from "../../src/database/world/WorldDatabase.js";
import { NewCareerService } from "../../src/career/NewCareerService.js";
import { ScenarioGenerator } from "../../src/world/generators/ScenarioGenerator.js";

const databases: Array<
  WorldDatabase | SaveDatabase
> = [];
const files: string[] = [];

afterEach(() => {
  for (const database of databases) {
    if (database.connection.open) {
      database.close();
    }
  }

  databases.length = 0;

  for (const file of files) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  files.length = 0;
});

describe("SaveDatabase season compatibility", () => {
  it("allows the same World stage definition in consecutive Save seasons", () => {
    const save = SaveDatabase.create(":memory:");
    databases.push(save);
    const db = save.connection;
    const saveId = Number(db.prepare(
      "INSERT INTO save (name, created_at, last_saved_at, game_date, status, version) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("Multi-season", "2026-01-01", "2026-01-01", "2026-01-01", "ACTIVE", 1).lastInsertRowid);
    const firstSeason = Number(db.prepare(
      "INSERT INTO season_state (save_id, competition_id, competition_season_id, year, status) VALUES (?, ?, ?, ?, ?)",
    ).run(saveId, 1, 1, 2026, "COMPLETED").lastInsertRowid);
    const secondSeason = Number(db.prepare(
      "INSERT INTO season_state (save_id, competition_id, competition_season_id, year, status) VALUES (?, ?, ?, ?, ?)",
    ).run(saveId, 1, 1, 2027, "SCHEDULED").lastInsertRowid);

    db.prepare(
      "INSERT INTO stage_state (save_id, season_state_id, world_stage_id, status, current_round_number) VALUES (?, ?, ?, ?, ?)",
    ).run(saveId, firstSeason, 99, "COMPLETED", 38);
    db.prepare(
      "INSERT INTO stage_state (save_id, season_state_id, world_stage_id, status, current_round_number) VALUES (?, ?, ?, ?, ?)",
    ).run(saveId, secondSeason, 99, "SCHEDULED", 0);

    expect(db.prepare(
      "SELECT COUNT(*) AS count FROM stage_state WHERE save_id = ? AND world_stage_id = ?",
    ).get(saveId, 99)).toEqual({ count: 2 });
  });
});

describe("NewCareerService", () => {
  it("creates a save snapshot without copying the world schema", () => {
    const worldPath = path.join(
      os.tmpdir(),
      `football-world-career-${Date.now()}.db`,
    );

    const savePath = path.join(
      os.tmpdir(),
      `football-save-career-${Date.now()}.db`,
    );

    files.push(worldPath, savePath);

    const world =
      WorldDatabase.create(worldPath);

    databases.push(world);

    new ScenarioGenerator(world)
      .generateBrazilSandbox(2026);

    const managerPersonId =
      (
        world.connection
          .prepare(
            "SELECT person_id FROM player ORDER BY person_id LIMIT 1",
          )
          .get() as { person_id: number }
      ).person_id;

    const managerClubId =
      (
        world.connection
          .prepare(
            "SELECT team_id FROM club ORDER BY team_id LIMIT 1",
          )
          .get() as { team_id: number }
      ).team_id;

    const result =
      new NewCareerService(world).create({
        savePath,
        saveName: "Brazil Career",
        gameDate: "2026-04-04",
        managerPersonId,
        managerClubId,
        packageName: "brazil-sandbox",
        packageVersion: "1.0.0",
        sourcePath: worldPath,
      });

    expect(result.teams).toBe(20);
    expect(result.players).toBe(160);
    expect(result.contracts).toBe(160);
    expect(result.competitions).toBe(1);
    expect(result.fixtures).toBe(380);

    const save =
      SaveDatabase.open(savePath);

    databases.push(save);

    const tables =
      save.connection
        .prepare(
          `
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
          `,
        )
        .all() as Array<{ name: string }>;

    expect(
      tables.some(
        (table) =>
          table.name === "team",
      ),
    ).toBe(false);

    const metadata =
      save.connection
        .prepare(
          `
            SELECT
              package_name,
              package_version,
              package_hash,
              source_path
            FROM save_world
            WHERE save_id = ?
          `,
        )
        .get(result.saveId) as {
          package_name: string;
          package_version: string;
          package_hash: string | null;
          source_path: string | null;
        };

    expect(metadata.package_name)
      .toBe("brazil-sandbox");
    expect(metadata.package_version)
      .toBe("1.0.0");
    expect(metadata.package_hash)
      .toHaveLength(64);
    expect(metadata.source_path)
      .toBe(worldPath);

    const fixtureCount =
      (
        save.connection
          .prepare(
            "SELECT COUNT(*) AS count FROM fixture_state WHERE save_id = ?",
          )
          .get(result.saveId) as { count: number }
      ).count;

    expect(fixtureCount).toBe(380);

    const calendarFixtureCount =
      (
        save.connection
          .prepare(
            `
              SELECT COUNT(*) AS count
              FROM calendar_event
              WHERE save_id = ?
                AND event_type = 'FIXTURE'
            `,
          )
          .get(result.saveId) as { count: number }
      ).count;

    expect(calendarFixtureCount).toBe(380);

    const manager =
      save.connection
        .prepare(
          "SELECT person_id, club_id FROM save_manager WHERE save_id = ?",
        )
        .get(result.saveId) as {
          person_id: number;
          club_id: number;
        };

    expect(manager.person_id)
      .toBe(managerPersonId);
    expect(manager.club_id)
      .toBe(managerClubId);
  });
});
