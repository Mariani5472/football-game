import DatabaseConnection from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { Database } from "../Database.js";
import { SchemaRunner } from "../SchemaRunner.js";

export class WorldDatabase extends Database {
  private constructor(
    db: DatabaseConnection.Database,
  ) {
    super(db);
  }

  static create(filePath: string): WorldDatabase {
    const directory = path.dirname(filePath);

    fs.mkdirSync(directory, { recursive: true, });

    const db = new DatabaseConnection(filePath);

    const database = new WorldDatabase(db);

    database.initialize();

    return database;
  }

  static open(filePath: string): WorldDatabase {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Database não encontrada: ${filePath}`,);
    }

    const db = new DatabaseConnection(filePath);

    return new WorldDatabase(db);
  }

  private initialize(): void {
    const schemaPath = path.resolve(
      process.cwd(),
      "src/schemas/world/world_schema_v2.sql",
    );

    const runner = new SchemaRunner(this);

    runner.run(schemaPath);

    runner.initializeMetadata({
      schemaVersion: 2,
      databaseType: "world",
    });
  }
}