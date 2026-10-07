export type StageFormatType = "LEAGUE" | "GROUP" | "KNOCKOUT";
export type SchedulingType = "ROUND_ROBIN" | "GROUP" | "KNOCKOUT";

export interface CompetitionStage {
  id: number;
  competitionSeasonId: number;
  name: string;
  stageOrder: number;
  format: StageFormat | null;
  points: StagePointsRule | null;
  schedule: StageSchedule | null;
  participantSources: ParticipantSource[];
  standingRules: string[];
  qualificationRules: StageQualificationRule[];
}

export interface StageFormat {
  formatType: StageFormatType;
  participantCount: number | null;
  legs: number;
  homeAway: boolean;
  groupCount?: number | null;
  participantsPerGroup?: number | null;
  aggregateScore?: boolean;
  extraTime?: boolean;
  penalties?: boolean;
  awayGoalsRule?: boolean;
}

export interface StagePointsRule {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
}

export interface StageSchedule {
  schedulingType: string;
  startDate: string | null;
  endDate: string | null;
  intervalDays: number;
  homeAwayBalanced: boolean;
}

export interface StageQualificationRule {
  positionFrom: number;
  positionTo: number;
  type: "QUALIFY" | "PROMOTE" | "RELEGATE";
  destinationCompetitionId?: number;
  destinationStageId?: number;
}
