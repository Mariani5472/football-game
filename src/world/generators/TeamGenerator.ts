import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import type { GenerationContext } from "./GenerationContext.js";

export class TeamGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(
    context: GenerationContext,
  ): void {
    const insertTeam = this.database.connection
      .prepare(
        `
          INSERT INTO team (
            name,
            short_name,
            nation_id,
            reputation
          )
          VALUES (?, ?, ?, ?)
        `,
      );

    const insertClub = this.database.connection
      .prepare(
        `
          INSERT INTO club (
            team_id,
            city_id,
            base_nation_id
          )
          VALUES (?, ?, ?)
        `,
      );

    for (let i = 0; i < 8; i++) {
      const nationId =
        context.nationIds[i % 2];

      const cityId =
        context.cityIds[i];

      const team = insertTeam.run(
        `Sandbox FC ${i + 1}`,
        `SB${i + 1}`,
        nationId,
        50,
      );

      const teamId =
        Number(team.lastInsertRowid);

      insertClub.run(
        teamId,
        cityId,
        nationId,
      );

      context.teamIds.push(teamId);
      context.clubIds.push(teamId);
    }
  }
}
