export interface CompetitionHostInput { nationId?: number; stadiumId?: number }
export interface CompetitionClubStats { position?: number; clubId?: number; clubStats?: Record<string, number> }
export interface CompetitionHistoryInput extends CompetitionClubStats {
  competitionId: number;
  year: number;
  positionTeams?: number[];
  hosts?: CompetitionHostInput[];
}
export interface CompetitionHistoryRecord { id: number; [key: string]: unknown }

export interface CompetitionHistoryRepository {
  transaction<T>(operation: () => T): T;
  createHistory(competitionId: number, year: number): CompetitionHistoryRecord;
  addRankedTeam(historyId: number, teamId: number, slot: number): void;
  addHost(historyId: number, host: CompetitionHostInput, slot: number): void;
  addClubHistory(input: CompetitionHistoryInput): void;
}
