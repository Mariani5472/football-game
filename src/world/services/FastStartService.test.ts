import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { WorldDatabase } from "../../database/world/WorldDatabase.js";
import { FastStartService } from "./FastStartService.js";

const files: string[] = [];

afterEach(() => {
  for (const file of files.splice(0)) {
    try {
      fs.rmSync(file, { force: true });
    } catch {
      // Best effort cleanup for temporary test databases.
    }
  }
});

function createDatabase(): { database: WorldDatabase; file: string } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "football-fast-start-"));
  const file = path.join(directory, "world.db");
  files.push(directory);
  return { database: WorldDatabase.create(file), file };
}

describe("FastStartService", () => {
  it("builds a sandbox world through validation with a persisted calendar", () => {
    const { database } = createDatabase();

    try {
      const result = new FastStartService(database).run({
        template: "SANDBOX",
        seasonYear: 2026,
      });

      expect(result.steps).toEqual([
        "SCENARIO",
        "WORLD",
        "CLUBS",
        "PEOPLE",
        "PLAYERS",
        "STADIUMS",
        "COMPETITIONS",
        "CALENDAR",
        "VALIDATION",
        "COMPLETED",
      ]);
      expect(result.summary.validation.valid).toBe(true);
      expect(result.summary.counts.teams).toBe(8);
      expect(result.summary.counts.clubs).toBe(8);
      expect(result.summary.counts.players).toBe(160);
      expect(result.summary.counts.stadiums).toBe(8);
      expect(result.summary.counts.competitions).toBe(2);
      expect(result.summary.counts.rounds).toBeGreaterThan(0);
      expect(result.summary.counts.fixtures).toBeGreaterThan(0);
      expect(database.metadata("world_build_status")).toBe("VALID");
      expect(database.metadata("world_last_build_at")).toBeDefined();
    } finally {
      database.close();
    }
  });

  it("uses the shared scenario registry instead of duplicating scenario definitions", () => {
    const { database } = createDatabase();

    try {
      const scenarios = new FastStartService(database).listScenarios();
      expect(scenarios.map(scenario => scenario.id)).toEqual([
        "EMPTY",
        "SANDBOX",
        "BRAZIL",
      ]);
    } finally {
      database.close();
    }
  });
});
