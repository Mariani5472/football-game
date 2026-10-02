export interface CompetitionSeason {
  id: number;
  competitionId: number;
  year: number;
  startDate: string | null;
  endDate: string | null;
}
