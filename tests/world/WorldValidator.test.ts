import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { WorldDatabase } from "../../src/database/world/WorldDatabase.js";
import { ScenarioGenerator } from "../../src/world/generators/ScenarioGenerator.js";
import { WorldValidator } from "../../src/world/validation/WorldValidator.js";

const databases: WorldDatabase[] = [];
const temporaryFiles: string[] = [];

afterEach(() => {
  for (const database of databases) {
    database.close();
  }

  databases.length = 0;

  for (const file of temporaryFiles) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  temporaryFiles.length = 0;
});

function createDatabase(): WorldDatabase {
  const filePath = path.join(
    os.tmpdir(),
    `football-world-validator-${Date.now()}-${Math.random()}.db`,
  );

  temporaryFiles.push(filePath);

  const database = WorldDatabase.create(filePath);

  databases.push(database);

  return database;
}

describe("WorldValidator", () => {
  it("accepts a coherent sandbox world", () => {
    const database = createDatabase();

    new ScenarioGenerator(database).generateSandbox(2026);

    const result = new WorldValidator(database).validate();

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("reports a city without a climate as a warning", () => {
    const database = createDatabase();

    new ScenarioGenerator(database).generateSandbox(2026);

    database.connection
      .prepare(
        `
          UPDATE city
          SET climate_id = NULL
          WHERE id = 1
        `,
      )
      .run();

    const result = new WorldValidator(database).validate();

    expect(result.valid).toBe(true);
    expect(
      result.warnings.some(
        (issue) =>
          issue.rule === "CITY_WITHOUT_CLIMATE" &&
          issue.entityId === 1,
      ),
    ).toBe(true);
  });

  it("reports a player without attributes as an error", () => {
    const database = createDatabase();

    new ScenarioGenerator(database).generateSandbox(2026);

    database.connection
      .prepare(
        `
          DELETE FROM player_technical_attribute
          WHERE player_id = 1
        `,
      )
      .run();

    database.connection
      .prepare(
        `
          DELETE FROM player_physical_attribute
          WHERE player_id = 1
        `,
      )
      .run();

    database.connection
      .prepare(
        `
          DELETE FROM player_psychological_attribute
          WHERE player_id = 1
        `,
      )
      .run();

    const result = new WorldValidator(database).validate();

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (issue) =>
          issue.rule === "PLAYER_WITHOUT_ATTRIBUTES" &&
          issue.entityId === 1,
      ),
    ).toBe(true);
  });

  it("reports a competition season without stages as an error", () => {
    const database = createDatabase();

    new ScenarioGenerator(database).generateSandbox(2026);

    database.connection
      .prepare(
        `
          DELETE FROM competition_stage
          WHERE competition_season_id = 1
        `,
      )
      .run();

    const result = new WorldValidator(database).validate();

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (issue) =>
          issue.rule === "SEASON_WITHOUT_STAGE" &&
          issue.entityId === 1,
      ),
    ).toBe(true);
  });
});
