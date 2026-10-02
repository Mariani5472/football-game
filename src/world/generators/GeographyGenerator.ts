// src/world/generators/GeographyGenerator.ts

import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import type { GenerationContext } from "./GenerationContext.js";

export class GeographyGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(context: GenerationContext): void {
    const continentId = this.createContinent();

    context.continentId = continentId;

    const regionIds = this.createRegions(continentId);

    const nationIds = this.createNations(regionIds);

    context.nationIds.push(...nationIds);
  }

  private createContinent(): number {
    const result = this.database.connection
      .prepare(`
        INSERT INTO continent (
          name,
          short_name
        )
        VALUES (?, ?)
      `)
      .run(
        "Sandbox",
        "SBX",
      );

    return Number(result.lastInsertRowid);
  }

  private createRegions(
    continentId: number,
  ): number[] {
    const insert = this.database.connection.prepare(`
      INSERT INTO continent_region (
        continent_id,
        name,
        short_name
      )
      VALUES (?, ?, ?)
    `);

    const regionIds: number[] = [];

    for (let i = 0; i < 4; i++) {
      const result = insert.run(
        continentId,
        `Sandbox Region ${i + 1}`,
        `SR${i + 1}`,
      );

      regionIds.push(
        Number(result.lastInsertRowid),
      );
    }

    return regionIds;
  }

  private createNations(
    regionIds: number[],
  ): number[] {
    const insert = this.database.connection.prepare(`
      INSERT INTO nation (
        name,
        short_name,
        continent_region_id
      )
      VALUES (?, ?, ?)
    `);

    const nations: number[] = [];

    const definitions = [
      {
        name: "Sandboxland",
        shortName: "SBL",
        regionId: regionIds[0],
      },
      {
        name: "Testland",
        shortName: "TST",
        regionId: regionIds[2],
      },
    ];

    for (const definition of definitions) {
      const result = insert.run(
        definition.name,
        definition.shortName,
        definition.regionId,
      );

      nations.push(
        Number(result.lastInsertRowid),
      );
    }

    return nations;
  }
}