import type { SqlRow } from "../../../database/Database.js";

export interface CompetitionDuplicateRepository {
  transaction<T>(work: () => T): T;
  duplicateIdentity(competitionId: number): SqlRow;
}

