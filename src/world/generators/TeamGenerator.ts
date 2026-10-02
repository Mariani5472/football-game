import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import type { GenerationContext } from "./GenerationContext.js";

export interface TeamGenerationOptions {
  count?: number;
  namePrefix?: string;
  shortNamePrefix?: string;
}

export class TeamGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(
    context: GenerationContext,
    options: TeamGenerationOptions = {},
  ): void {
    const count = options.count ?? 8;
    const namePrefix = options.namePrefix ?? "Sandbox FC";
    const shortNamePrefix = options.shortNamePrefix ?? "SB";

    if (context.cityIds.length < count) {
      throw new Error(
        `Sandbox precisa de pelo menos ${count} cidades para gerar os times.`,
      );
    }

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

    for (let i = 0; i < count; i++) {
      const nationId =
        context.nationIds[i % context.nationIds.length];

      const cityId =
        context.cityIds[i];

      const team = insertTeam.run(
        `${namePrefix} ${i + 1}`,
        `${shortNamePrefix}${i + 1}`,
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
