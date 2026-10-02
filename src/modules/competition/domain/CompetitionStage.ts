export interface CompetitionStage {
  id: number;
  competitionSeasonId: number;
  name: string;
  stageOrder: number;
  format: StageFormat | null;
  points: StagePointsRule | null;
  schedule: StageSchedule | null;
}

export interface StageFormat {
  formatType: string;
  participantCount: number | null;
  legs: number;
  homeAway: boolean;
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
