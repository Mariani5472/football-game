import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import type { GenerationContext } from "./GenerationContext.js";

export class CityGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(
    context: GenerationContext,
  ): void {
    if (context.nationIds.length !== 2) {
      throw new Error(
        "Sandbox precisa de exatamente 2 países.",
      );
    }

    if (context.climateIds.length === 0) {
      throw new Error(
        "Nenhum clima foi criado.",
      );
    }

    const insert = this.database.connection
      .prepare(
        `
          INSERT INTO city (
            nation_id,
            name,
            population,
            climate_id
          )
          VALUES (?, ?, ?, ?)
        `,
      );

    const insertLanguage = this.database.connection.prepare(
      `
        INSERT INTO city_language (
          city_id,
          language_id,
          percentage
        )
        VALUES (?, ?, ?)
      `,
    );

    if (context.languageId === undefined) {
      throw new Error(
        "Sandbox precisa de um idioma.",
      );
    }

    for (let i = 0; i < 8; i++) {
      const nationId =
        context.nationIds[i % 2];

      const climateId =
        context.climateIds[i % context.climateIds.length];

      const result = insert.run(
        nationId,
        `Sandbox City ${i + 1}`,
        100_000 + (i * 25_000),
        climateId,
      );

      const cityId = Number(
        result.lastInsertRowid,
      );

      insertLanguage.run(
        cityId,
        context.languageId,
        100,
      );

      context.cityIds.push(cityId);
    }
  }
}
