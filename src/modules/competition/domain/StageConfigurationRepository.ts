export interface CompetitionStageSetup {
  seasonId: number;
  name: string;
  stageOrder: number;
  stageTypeId?: number;
  participantRule?: { type: string; minimum?: number; maximum?: number; sourceType?: string; sourceCompetitionId?: number; sourceSeasonId?: number; sourceStageId?: number; positionFrom?: number; positionTo?: number };
  format: { type: "LEAGUE" | "GROUP" | "KNOCKOUT"; participantCount?: number; groupCount?: number; participantsPerGroup?: number; legs: number; homeAway: boolean; aggregateScore?: boolean; extraTime?: boolean; penalties?: boolean; awayGoalsRule?: boolean };
  points?: { win: number; draw: number; loss: number };
  schedule?: { type: string; startDate?: string; endDate?: string; intervalDays?: number; homeAwayBalanced?: boolean };
  standingRules?: string[];
  matchRules?: Array<{ type: string; value?: string }>;
  qualificationRules?: Array<{ positionFrom: number; positionTo: number; type: string; destinationCompetitionId?: number; destinationStageId?: number }>;
}

export interface StageConfigurationRepository {
  transaction<T>(work: () => T): T;
  seasonExists(seasonId: number): boolean;
  nextStageOrder(seasonId: number): number;
  stageBelongsToSeason(stageId: number, seasonId: number): boolean;
  stageOrderAvailable(seasonId: number, stageOrder: number, excludingStageId: number): boolean;
  createStage(setup: CompetitionStageSetup): { id: number; seasonId: number; name: string; stageOrder: number };
  updateStage(stageId: number, setup: CompetitionStageSetup): { id: number; seasonId: number; name: string; stageOrder: number };
}
