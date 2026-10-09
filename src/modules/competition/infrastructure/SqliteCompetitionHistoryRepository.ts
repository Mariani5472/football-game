import type { SqlRow } from "../../../database/Database.js";
import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { CompetitionHistoryInput, CompetitionHistoryRecord, CompetitionHistoryRepository, CompetitionHostInput } from "../domain/CompetitionHistoryRepository.js";

export class SqliteCompetitionHistoryRepository implements CompetitionHistoryRepository {
  constructor(private readonly database: WorldDatabase) {}

  transaction<T>(operation: () => T): T { return this.database.transaction(operation); }

  createHistory(competitionId: number, year: number): CompetitionHistoryRecord {
    const row = this.database.create<SqlRow>("competition_history", { competition_id: competitionId, year });
    return { ...row, id: Number(row.id) };
  }

  addRankedTeam(historyId: number, teamId: number, slot: number): void {
    this.database.create("competition_history_team", { competition_history_id: historyId, team_id: teamId, slot_number: slot });
  }

  addHost(historyId: number, host: CompetitionHostInput, slot: number): void {
    this.database.create("competition_history_host", {
      competition_history_id: historyId, nation_id: host.nationId,
      stadium_id: host.stadiumId, slot_number: slot,
    });
  }

  addClubHistory(input: CompetitionHistoryInput): void {
    this.database.create("club_competition_history", {
      club_id: input.clubId,
      competition_id: input.competitionId,
      year: input.year,
      position: input.position,
      ...input.clubStats,
    });
  }
}
