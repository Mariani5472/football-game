import type { WorldDatabase } from "../../database/world/WorldDatabase.js";

export interface CreateNationInput {
  name: string;
  shortName?: string;
  continentRegionId?: number;
}

export interface Nation {
  id: number;
  name: string;
  shortName: string | null;
  continentRegionId: number | null;
}

export class NationRepository {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  create(input: CreateNationInput): Nation {
    const result = this.database.connection
      .prepare(`
        INSERT INTO nation (
          name,
          short_name,
          continent_region_id
        )
        VALUES (?, ?, ?)
      `)
      .run(
        input.name,
        input.shortName ?? null,
        input.continentRegionId ?? null,
      );

    return {
      id: Number(result.lastInsertRowid),
      name: input.name,
      shortName: input.shortName ?? null,
      continentRegionId: input.continentRegionId ?? null,
    };
  }
}