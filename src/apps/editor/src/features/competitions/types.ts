export type CompetitionStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED";
export type StageFormat = "LEAGUE" | "GROUP" | "KNOCKOUT";
export type ParticipantType = "TEAM";
export type StandingRuleType =
  | "POINTS"
  | "GOAL_DIFFERENCE"
  | "GOALS_FOR"
  | "WINS";

export interface Competition {
  id: number;
  name: string;
  shortName: string;
  countryId?: number;
  type: string;
  level?: number;
  reputation?: number;
  seasons: CompetitionSeason[];
}

export interface CompetitionSeason {
  id: number;
  competitionId: number;
  year: number;
  startDate: string;
  endDate: string;
  status: CompetitionStatus;
  teams: number[];
  stages: CompetitionStage[];
}

export interface CompetitionStage {
  id: number;
  seasonId: number;
  name: string;
  stageOrder: number;
  format: StageFormat;
  participants: number[];

  // Second-pass schema rules.
  participantRule: StageParticipantRule;
  participantSources: StageParticipantSource[];
  formatRule: StageFormatRule;
  pointsRule: StagePointsRule;
  matchRules: StageMatchRule[];
  standingRules: StandingRule[];

  schedule: StageSchedule;
  qualification: QualificationRule[];
  draw: DrawDefinition;
}

export interface StageParticipantRule {
  participantType: ParticipantType;
  minParticipants: number;
  maxParticipants: number;
}

export interface StageParticipantSource {
  sourceType: string;
  sourceCompetitionId?: number;
  sourceStageId?: number;
  positionFrom?: number;
  positionTo?: number;
}

export interface StageFormatRule {
  formatType: StageFormat;
  participantCount: number;
  groupCount?: number;
  participantsPerGroup?: number;
  legs: number;
  homeAway: 0 | 1;
  aggregateScore: 0 | 1;
  extraTime: 0 | 1;
  penalties: 0 | 1;
  awayGoalsRule: 0 | 1;
}

export interface StagePointsRule {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
}

export interface StageMatchRule {
  ruleType: string;
  ruleValue?: string;
}

export interface StandingRule {
  ruleOrder: number;
  ruleType: StandingRuleType;
}

export interface StageSchedule {
  startDate: string;
  endDate: string;
  intervalDays: number;
  homeAwayBalanced: boolean;
}

export interface QualificationRule {
  positionFrom: number;
  positionTo: number;
  type: "QUALIFY" | "PROMOTE" | "RELEGATE";
  destinationCompetitionId?: number;
  destinationStageId?: number;
}

export interface DrawDefinition {
  type: "NONE" | "RANDOM" | "SEEDED";
  seedCount: number;
  orderMode: "RANDOM" | "SEEDED";
}
