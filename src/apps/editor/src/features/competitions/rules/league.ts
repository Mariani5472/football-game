import type {
  CompetitionStage,
  StageFormatRule,
  StageParticipantRule,
  StagePointsRule,
  StandingRule,
} from "../types";

export const LEAGUE_TEAM_COUNT = 20;
export const LEAGUE_LEGS = 2;
export const LEAGUE_ROUNDS = LEAGUE_TEAM_COUNT - 1; // 19 rounds per leg.
export const LEAGUE_TOTAL_ROUNDS = LEAGUE_ROUNDS * LEAGUE_LEGS;
export const LEAGUE_MATCHES_PER_ROUND = LEAGUE_TEAM_COUNT / 2;
export const LEAGUE_TOTAL_MATCHES =
  (LEAGUE_TEAM_COUNT * (LEAGUE_TEAM_COUNT - 1) * LEAGUE_LEGS) / 2;

export const leagueParticipantRule: StageParticipantRule = {
  participantType: "TEAM",
  minParticipants: LEAGUE_TEAM_COUNT,
  maxParticipants: LEAGUE_TEAM_COUNT,
};

export const leagueFormatRule: StageFormatRule = {
  formatType: "LEAGUE",
  participantCount: LEAGUE_TEAM_COUNT,
  groupCount: undefined,
  participantsPerGroup: undefined,
  legs: LEAGUE_LEGS,
  homeAway: 1,
  aggregateScore: 0,
  extraTime: 0,
  penalties: 0,
  awayGoalsRule: 0,
};

export const leaguePointsRule: StagePointsRule = {
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
};

export const leagueStandingRules: StandingRule[] = [
  { ruleOrder: 1, ruleType: "POINTS" },
  { ruleOrder: 2, ruleType: "GOAL_DIFFERENCE" },
  { ruleOrder: 3, ruleType: "GOALS_FOR" },
  { ruleOrder: 4, ruleType: "WINS" },
];

export interface LeagueValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSimpleLeague(stage: CompetitionStage): LeagueValidationResult {
  const errors: string[] = [];

  if (stage.participants.length !== LEAGUE_TEAM_COUNT) {
    errors.push(`League requires exactly ${LEAGUE_TEAM_COUNT} teams.`);
  }

  if (stage.participantRule.participantType !== "TEAM") {
    errors.push("League participants must be teams.");
  }

  if (
    stage.participantRule.minParticipants !== LEAGUE_TEAM_COUNT ||
    stage.participantRule.maxParticipants !== LEAGUE_TEAM_COUNT
  ) {
    errors.push(`Participant rule must require exactly ${LEAGUE_TEAM_COUNT} teams.`);
  }

  if (
    stage.formatRule.formatType !== "LEAGUE" ||
    stage.formatRule.participantCount !== LEAGUE_TEAM_COUNT
  ) {
    errors.push("League format must be configured for 20 participants.");
  }

  if (stage.formatRule.legs !== LEAGUE_LEGS || stage.formatRule.homeAway !== 1) {
    errors.push("League must use a double round robin with home and away legs.");
  }

  if (
    stage.pointsRule.winPoints !== 3 ||
    stage.pointsRule.drawPoints !== 1 ||
    stage.pointsRule.lossPoints !== 0
  ) {
    errors.push("League points must be 3 for a win, 1 for a draw and 0 for a loss.");
  }

  const standing = [...stage.standingRules].sort((a, b) => a.ruleOrder - b.ruleOrder);
  const expected = ["POINTS", "GOAL_DIFFERENCE", "GOALS_FOR", "WINS"];

  if (
    standing.length !== expected.length ||
    standing.some((rule, index) => rule.ruleType !== expected[index])
  ) {
    errors.push("Standing rules must be Points, Goal Difference, Goals For and Wins, in that order.");
  }

  return { valid: errors.length === 0, errors };
}
