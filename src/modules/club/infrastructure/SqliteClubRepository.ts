import type { SqlRow, SqlValue } from "../../../database/Database.js";
import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { ClubCreationData, ClubRepository, CreatedClub } from "../domain/ClubRepository.js";

export class SqliteClubRepository implements ClubRepository {
  constructor(private readonly database: WorldDatabase) {}

  transaction<T>(work: () => T): T {
    return this.database.transaction(work);
  }

  create(data: ClubCreationData): CreatedClub {
    const team = this.database.create("team", {
      name: data.name,
      short_name: data.shortName?.trim() || null,
      nation_id: data.nationId,
    });
    const teamId = Number(team.id);
    const club = this.database.create("club", {
      team_id: teamId,
      city_id: data.cityId,
      base_nation_id: data.nationId,
    });
    const stadiumName = data.stadiumName?.trim();
    const stadium = stadiumName && data.cityId
      ? this.database.create("stadium", {
          city_id: data.cityId,
          name: stadiumName,
          owner_club_id: teamId,
        })
      : null;
    return {
      team: team as SqlRow & Record<string, SqlValue>,
      club: club as SqlRow & Record<string, SqlValue>,
      stadium: stadium as (SqlRow & Record<string, SqlValue>) | null,
    };
  }
}
