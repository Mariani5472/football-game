import type { Database } from "../../database/Database.js";

export class WorldRepository {
  constructor(
    private readonly database: Database,
  ) {}

  getTableCount(): number {
    const result = this.database.connection
      .prepare(`
        SELECT COUNT(*) AS count
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
      `)
      .get() as { count: number };

    return result.count;
  }
}