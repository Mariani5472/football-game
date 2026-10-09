import type { SqlRow } from "../../../database/Database.js";
import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { StadiumRepository } from "../domain/StadiumRepository.js";

export class SqliteStadiumRepository implements StadiumRepository {
  constructor(private readonly database: WorldDatabase) {}

  transaction<T>(work: () => T): T {
    return this.database.transaction(work);
  }

  duplicate(stadiumId: number): SqlRow {
    const source = this.database.findById<SqlRow>("stadium", stadiumId);
    if (!source) throw new Error("Stadium not found: " + stadiumId);

    const cityId = Number(source.city_id);
    const sourceName = String(source.name ?? "").trim();
    if (!sourceName) throw new Error("Stadium has no name to duplicate.");

    const baseName = "Copy of " + sourceName;
    let name = baseName;
    let suffix = 2;
    const exists = this.database.connection.prepare(
      "SELECT 1 FROM stadium WHERE city_id=? AND name=? LIMIT 1",
    );
    while (exists.get(cityId, name)) {
      name = baseName + " (" + suffix + ")";
      suffix += 1;
    }

    const values = Object.fromEntries(
      Object.entries(source).filter(([column]) => column !== "id"),
    );
    return this.database.create("stadium", {
      ...values,
      name,
      extinct: 0,
    });
  }
}

