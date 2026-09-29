export { CompetitionsPage } from "./pages";
export type {
  Competition,
  CompetitionSeason,
  CompetitionStage,
  CompetitionStatus,
  StageFormat,
  ParticipantType,
  StandingRuleType,
  StageParticipantRule,
  StageParticipantSource,
  StageFormatRule,
  StagePointsRule,
  StageMatchRule,
  StandingRule,
  StageSchedule,
  QualificationRule,
  DrawDefinition,
} from "./types";

export {
  LEAGUE_TEAM_COUNT,
  LEAGUE_LEGS,
  LEAGUE_ROUNDS,
  LEAGUE_TOTAL_ROUNDS,
  LEAGUE_MATCHES_PER_ROUND,
  LEAGUE_TOTAL_MATCHES,
  validateSimpleLeague,
} from "./rules/league";

export type { SchedulingType, ScheduleProfile, ScheduledFixture, ScheduledRound, RoundRobinSchedule, ScheduleGenerationResult } from "./scheduling";
export { generateRoundRobin } from "./scheduling";
