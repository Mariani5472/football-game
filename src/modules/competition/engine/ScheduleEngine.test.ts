import { describe, expect, it } from "vitest";
import { ScheduleEngine } from "./ScheduleEngine.js";

const teams = Array.from({ length: 8 }, (_, index) => ({
  teamId: index + 1,
  name: `Team ${index + 1}`,
  reputation: 50,
}));

describe("ScheduleEngine", () => {
  it("generates a four-round single-leg knockout for eight teams", () => {
    const rounds = new ScheduleEngine().generateKnockout(teams, "2026-08-01", 7, 1);
    expect(rounds).toHaveLength(3);
    expect(rounds.map(round => round.fixtures.length)).toEqual([4, 2, 1]);
  });

  it("generates paired home-away fixtures for each knockout matchup", () => {
    const rounds = new ScheduleEngine().generateKnockout(teams, "2026-08-01", 7, 2);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].fixtures).toHaveLength(8);
    expect(rounds[0].fixtures[0].homeTeamId).toBe(rounds[0].fixtures[1].awayTeamId);
  });

  it("supports byes for non-power-of-two participant counts", () => {
    const rounds = new ScheduleEngine().generateKnockout(teams.slice(0, 6), "2026-08-01", 7, 1);
    expect(rounds[0].fixtures).toHaveLength(2);
  });
});
