import type { SqlRow, SqlValue } from "../../../database/Database.js";
import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { CreatedPlayer, PlayerCreationData, PlayerRepository } from "../domain/PlayerRepository.js";

export class SqlitePlayerRepository implements PlayerRepository {
  constructor(private readonly database: WorldDatabase) {}

  transaction<T>(work: () => T): T {
    return this.database.transaction(work);
  }

  create(data: PlayerCreationData): CreatedPlayer {
    const person = this.database.create("person", {
      full_name: data.fullName,
      common_name: data.commonName?.trim() || null,
      birth_date: data.birthDate || null,
      person_type_id: data.personTypeId,
    });
    const personId = Number(person.id);
    const player = this.database.create("player", { person_id: personId });
    if (data.positionId !== undefined) {
      this.database.create("player_position", {
        player_id: personId,
        position_id: data.positionId,
        rating: data.positionRating ?? 10,
      });
    }
    return {
      person: person as SqlRow & Record<string, SqlValue>,
      player: player as SqlRow & Record<string, SqlValue>,
    };
  }
}
