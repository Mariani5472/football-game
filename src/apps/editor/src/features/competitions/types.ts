export type CompetitionStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED";
export type StageFormat = "LEAGUE" | "GROUP" | "KNOCKOUT";

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
  rules: StageRules;
  schedule: StageSchedule;
  standing: StandingRules;
  qualification: QualificationRule[];
  draw: DrawDefinition;
}

export interface StageRules {
  legs: number;
  homeAway: boolean;
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
}

export interface StageSchedule {
  startDate: string;
  endDate: string;
  intervalDays: number;
  homeAwayBalanced: boolean;
}

export interface StandingRules {
  tiebreakers: string[];
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
