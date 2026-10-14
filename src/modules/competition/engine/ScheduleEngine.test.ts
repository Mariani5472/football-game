import { describe, expect, it } from "vitest";
import { ScheduleEngine } from "./ScheduleEngine.js";

const teams = Array.from({ length: 8 }, (_, index) => ({
  teamId: index + 1,
  name: `Team ${index + 1}`,
  reputation: 50,
}));

describe("ScheduleEngine", () => {
  it("supports an odd-sized round-robin with one bye per round", () => {
    const rounds = new ScheduleEngine().generateRoundRobin(teams.slice(0, 5), "2026-08-01", 7, 1);
    expect(rounds).toHaveLength(5);
    expect(rounds.every((round) => round.fixtures.length === 2)).toBe(true);
    expect(rounds.flatMap((round) => round.fixtures)).toHaveLength(10);
  });

  it("generates a four-round single-leg knockout for eight teams", () => {
    const rounds = new ScheduleEngine().generateKnockout(teams, "2026-08-01", 7, 1);
    expect(rounds).toHaveLength(3);
    expect(rounds.map((round) => round.fixtures.length)).toEqual([4, 0, 0]);
  });

  it("generates two dated legs for each knockout matchup", () => {
    const rounds = new ScheduleEngine().generateKnockout(teams, "2026-08-01", 7, 2);
    expect(rounds).toHaveLength(6);
    expect(rounds.map((round) => round.fixtures.length)).toEqual([4, 4, 0, 0, 0, 0]);
    expect(rounds[0].fixtures[0].homeTeamId).toBe(rounds[1].fixtures[0].awayTeamId);
    expect(rounds[0].date).not.toBe(rounds[1].date);
  });

  it("supports an executable knockout round once a matchup is resolved", () => {
    const rounds = new ScheduleEngine().generateKnockoutRound(
      [
        { homeTeamId: 1, awayTeamId: 2 },
        { homeTeamId: 3, awayTeamId: 4 },
      ],
      "2026-08-01",
      7,
      2,
      1,
    );

    expect(rounds).toHaveLength(1);
    expect(rounds[0].fixtures).toHaveLength(2);
  });

  it("supports byes for non-power-of-two participant counts", () => {
    const rounds = new ScheduleEngine().generateKnockout(teams.slice(0, 6), "2026-08-01", 7, 1);
    expect(rounds[0].fixtures).toHaveLength(2);
  });
});
