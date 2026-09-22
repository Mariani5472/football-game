export type StageType =
  | "LEAGUE"
  | "GROUP"
  | "KNOCKOUT"
  | "PLAYOFF";

export interface CompetitionStage {
  id: number;
  competitionSeasonId: number;

  name: string;
  type: StageType;

  order: number;
}