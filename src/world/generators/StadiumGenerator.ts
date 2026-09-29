import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import type { GenerationContext } from "./GenerationContext.js";

export class StadiumGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(
    context: GenerationContext,
    count = 8,
  ): void {
    if (
      context.cityIds.length < count ||
      context.clubIds.length < count
    ) {
      throw new Error(
        `Sandbox precisa de pelo menos ${count} cidades e clubes para gerar os estádios.`,
      );
    }

    const insert = this.database.connection
      .prepare(
        `
          INSERT INTO stadium (
            city_id,
            name,
            capacity,
            seated_capacity,
            seats_in_use,
            owner_club_id
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      );

    for (let i = 0; i < count; i++) {
      const cityId = context.cityIds[i];
      const clubId = context.clubIds[i];

      const capacity =
        10_000 + (i * 1_000);

      const result = insert.run(
        cityId,
        `Sandbox Stadium ${i + 1}`,
        capacity,
        capacity,
        capacity,
        clubId,
      );

      context.stadiumIds.push(
        Number(result.lastInsertRowid),
      );
    }
  }
}
