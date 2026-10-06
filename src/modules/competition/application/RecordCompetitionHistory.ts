import type { CompetitionHistoryInput, CompetitionHistoryRepository } from "../domain/CompetitionHistoryRepository.js";

export class RecordCompetitionHistory {
  constructor(private readonly history: CompetitionHistoryRepository) {}

  execute(input: CompetitionHistoryInput) {
    return this.history.transaction(() => {
      const record = this.history.createHistory(input.competitionId, input.year);
      for (const [index, teamId] of (input.positionTeams ?? []).slice(0, 3).entries()) this.history.addRankedTeam(record.id, teamId, index + 1);
      for (const [index, host] of (input.hosts ?? []).slice(0, 3).entries()) this.history.addHost(record.id, host, index + 1);
      if (input.clubId) this.history.addClubHistory(input);
      return record;
    });
  }
}
