import type { CompetitionDuplicateRepository } from "../domain/CompetitionDuplicateRepository.js";

export class DuplicateCompetition {
  constructor(private readonly competitions: CompetitionDuplicateRepository) {}

  execute(competitionId: number) {
    if (!Number.isInteger(competitionId) || competitionId <= 0) throw new Error("A valid competition is required.");
    return this.competitions.transaction(() => this.competitions.duplicateIdentity(competitionId));
  }
}

