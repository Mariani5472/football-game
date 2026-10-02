import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import type { GenerationContext } from "./GenerationContext.js";

export class ClimateGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(
    context: GenerationContext,
  ): void {
    const climates = [
      "Temperate",
      "Tropical",
    ];

    const insert = this.database.connection
      .prepare(`
        INSERT INTO climate (
          name,
          short_name
        )
        VALUES (?, ?)
      `);

    for (const name of climates) {
      const result = insert.run(
        name,
        name.substring(0, 3).toUpperCase(),
      );

      context.climateIds.push(
        Number(result.lastInsertRowid),
      );
    }
  }
}