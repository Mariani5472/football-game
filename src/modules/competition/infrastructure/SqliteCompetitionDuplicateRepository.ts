import type { SqlRow } from "../../../database/Database.js";
import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { CompetitionDuplicateRepository } from "../domain/CompetitionDuplicateRepository.js";

/** Duplicates competition identity only; seasons, teams, stages and history stay with the source. */
export class SqliteCompetitionDuplicateRepository implements CompetitionDuplicateRepository {
  constructor(private readonly database: WorldDatabase) {}

  transaction<T>(work: () => T): T {
    return this.database.transaction(work);
  }

  duplicateIdentity(competitionId: number): SqlRow {
    const source = this.database.findById<SqlRow>("competition", competitionId);
    if (!source) throw new Error("Competition not found: " + competitionId);
    const sourceName = String(source.name ?? "").trim();
    if (!sourceName) throw new Error("Competition has no name to duplicate.");

    const baseName = "Copy of " + sourceName;
    let name = baseName;
    let suffix = 2;
    const exists = this.database.connection.prepare(
      "SELECT 1 FROM competition WHERE name=? AND gender_id IS ? LIMIT 1",
    );
    while (exists.get(name, source.gender_id ?? null)) {
      name = baseName + " (" + suffix + ")";
      suffix += 1;
    }

    const values = Object.fromEntries(
      Object.entries(source).filter(([column]) => column !== "id"),
    );
    return this.database.create("competition", {
      ...values,
      name,
      extinct: 0,
    });
  }
}

