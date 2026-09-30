import { describe, expect, it } from "vitest";
import {
  LEAGUE_TOTAL_MATCHES,
  LEAGUE_TOTAL_ROUNDS,
  leagueFormatRule,
  leagueParticipantRule,
  leaguePointsRule,
  leagueStandingRules,
  validateSimpleLeague,
} from "./league";
import type { CompetitionStage } from "../types";

function createStage(
  overrides: Partial<CompetitionStage> = {},
): CompetitionStage {
  return {
    id: 1,
    seasonId: 1,
    name: "League",
    stageOrder: 1,
    format: "LEAGUE",
    participants: Array.from({ length: 20 }, (_, index) => index + 1),
    participantRule: leagueParticipantRule,
    participantSources: [],
    formatRule: leagueFormatRule,
    pointsRule: leaguePointsRule,
    matchRules: [],
    standingRules: leagueStandingRules,
    schedule: {
      startDate: "2026-04-04",
      endDate: "2026-12-06",
      schedulingType: "ROUND_ROBIN",
      intervalDays: 7,
      homeAwayBalanced: true,
    },
    qualification: [],
    draw: {
      drawType: "NONE",
      groupCount: 0,
      teamsPerGroup: 0,
      seedCount: 0,
    },
    ...overrides,
  };
}

describe("simple league rules", () => {
  it("uses 20 teams, 38 rounds and 380 matches", () => {
    expect(leagueParticipantRule.minParticipants).toBe(20);
    expect(leagueParticipantRule.maxParticipants).toBe(20);
    expect(leagueFormatRule.legs).toBe(2);
    expect(leaguePointsRule).toEqual({
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
    });
    expect(LEAGUE_TOTAL_ROUNDS).toBe(38);
    expect(LEAGUE_TOTAL_MATCHES).toBe(380);
  });

  it("accepts the required standing order", () => {
    expect(
      validateSimpleLeague(createStage()),
    ).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects an invalid participant count", () => {
    const result = validateSimpleLeague(
      createStage({
        participants: Array.from({ length: 18 }, (_, index) => index + 1),
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("League requires exactly 20 teams.");
  });

  it("rejects an invalid standing order", () => {
    const result = validateSimpleLeague(
      createStage({
        standingRules: [
          { ruleOrder: 1, ruleType: "POINTS" },
          { ruleOrder: 2, ruleType: "WINS" },
          { ruleOrder: 3, ruleType: "GOAL_DIFFERENCE" },
          { ruleOrder: 4, ruleType: "GOALS_FOR" },
        ],
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Standing rules must be Points, Goal Difference, Goals For and Wins, in that order.",
    );
  });
});
