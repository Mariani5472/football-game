import DatabaseConnection from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { Database } from "../Database.js";
import { SchemaRunner } from "../SchemaRunner.js";

export class SaveDatabase extends Database {
  private constructor(
    db: DatabaseConnection.Database,
  ) {
    super(db);
  }

  static create(filePath: string): SaveDatabase {
    const directory = path.dirname(filePath);

    fs.mkdirSync(directory, {
      recursive: true,
    });

    const db = new DatabaseConnection(filePath);

    const database = new SaveDatabase(db);

    database.initialize();
    database.ensureRuntimeCompatibility();

    return database;
  }

  static open(filePath: string): SaveDatabase {
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `[SaveDatabase] Database não encontrada: ${filePath}`,
      );
    }

    const db = new DatabaseConnection(filePath);
    const database = new SaveDatabase(db);
    database.ensureRuntimeCompatibility();
    return database;
  }

  /**
   * V1 saves originally constrained a world stage to one occurrence per save.
   * A career can contain the same stage definition in multiple season snapshots,
   * so migrate the old table shape in-place while preserving dependent rows.
   */
  private ensureRuntimeCompatibility(): void {
    const indexes = this.connection.pragma("index_list('stage_state')") as Array<{
      name: string;
      unique: number;
      origin: string;
    }>;
    let legacyUnique = false;
    for (const index of indexes) {
      if (index.unique !== 1 || index.origin !== "u") continue;
      const columns = (this.connection.pragma(`index_info('${index.name.replace(/'/g, "''")}')`) as Array<{ name: string | null }>)
        .map((column) => column.name);
      if (columns.join(",") === "save_id,world_stage_id") legacyUnique = true;
    }
    if (!legacyUnique) return;

    this.connection.pragma("foreign_keys = OFF");
    try {
      this.connection.transaction(() => {
        this.connection.exec(`
          CREATE TABLE stage_state_rebuild (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            save_id INTEGER NOT NULL,
            season_state_id INTEGER NOT NULL,
            world_stage_id INTEGER,
            status TEXT NOT NULL,
            current_round_number INTEGER,
            FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
            FOREIGN KEY (season_state_id) REFERENCES season_state(id) ON DELETE CASCADE,
            UNIQUE (save_id, season_state_id, world_stage_id)
          );
          INSERT INTO stage_state_rebuild
            (id, save_id, season_state_id, world_stage_id, status, current_round_number)
          SELECT id, save_id, season_state_id, world_stage_id, status, current_round_number
            FROM stage_state;
          DROP TABLE stage_state;
          ALTER TABLE stage_state_rebuild RENAME TO stage_state;
          CREATE INDEX IF NOT EXISTS idx_stage_state_season ON stage_state(season_state_id);
        `);
      })();
    } finally {
      this.connection.pragma("foreign_keys = ON");
    }
  }

  private initialize(): void {
    const schemaPath = path.resolve(
      process.cwd(),
      "src/schemas/save/save_v1.sql",
    );

    const runner = new SchemaRunner(this);

    runner.run(schemaPath);

    runner.initializeMetadata({
      schemaVersion: 1,
      databaseType: "save",
    });
  }
}