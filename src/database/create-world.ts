import { WorldDatabase } from "@database/world/WorldDatabase.js";
import path from "node:path";


export function createWorld() {
  const databasePath = path.resolve(process.cwd(), "save/world.db");

  const database = WorldDatabase.create(databasePath);

  try {
    const tables = database.connection
      .prepare(`
      SELECT COUNT(*) AS count
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
    `)
      .get() as { count: number };

    const foreignKeys = database.connection
      .prepare(`
      PRAGMA foreign_key_check
    `)
      .all();

    if (foreignKeys.length > 0) {
      throw new Error(["Foreign key check failed.",
        JSON.stringify(foreignKeys, null, 2),
      ].join("\n"),
      );
    }

    console.log(`Tables: ${tables.count}`);
    console.log(`Foreign keys: ${foreignKeys.length}`);
  } finally {
    database.close();
  }
}