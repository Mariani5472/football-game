import { describe, expect, it } from "vitest";
import { StandingEngine } from "./StandingEngine.js";

describe("StandingEngine", () => {
  it("sorts by the configured tie breaker order", () => {
    const engine = new StandingEngine();
    const standings = new Map([
      [1, { teamId: 1, played: 2, wins: 1, draws: 1, losses: 0, goalsFor: 3, goalsAgainst: 1, points: 4 }],
      [2, { teamId: 2, played: 2, wins: 1, draws: 1, losses: 0, goalsFor: 4, goalsAgainst: 2, points: 4 }],
    ]);

    expect(engine.sort(standings, ["POINTS", "GOALS_FOR"]).map(row => row.teamId)).toEqual([2, 1]);
    expect(engine.sort(standings, ["POINTS", "GOAL_DIFFERENCE"]).map(row => row.teamId)).toEqual([1, 2]);
  });
});
