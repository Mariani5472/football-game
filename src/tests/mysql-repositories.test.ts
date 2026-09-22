import { describe, expect, it } from "vitest";
import { MySqlCompetitionRepository, MySqlFixtureRepository, type SqlExecutor } from "../infrastructure/mysql/mysql-repositories.js";
import { FixtureStatus } from "../data/types.js";

describe("MySQL adapters", () => {
  it("maps competition rows without exposing SQL to the engine", async () => {
    const db: SqlExecutor = { query: async <T>() => [{ id: 8, name: "Brasileirão Betano", competition_type: "league" }] as T[], execute: async () => undefined };
    await expect(new MySqlCompetitionRepository(db).findById("8")).resolves.toEqual({ id: "8", name: "Brasileirão Betano", type: "league" });
  });
  it("persists a finished fixture result", async () => {
    const calls: unknown[][] = [];
    const db: SqlExecutor = { query: async () => [], execute: async (_sql, values) => { calls.push(values ?? []); } };
    await new MySqlFixtureRepository(db).update({ id: "f1", stageId: "s", roundId: "r", homeTeamId: "1", awayTeamId: "2", status: FixtureStatus.FINISHED, legs: [{ number: 1, homeTeamId: "1", awayTeamId: "2", result: { homeGoals: 2, awayGoals: 1 } }] });
    expect(calls).toEqual([[FixtureStatus.FINISHED, 2, 1, "f1"]]);
  });
});
