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

    return database;
  }

  static open(filePath: string): SaveDatabase {
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `[SaveDatabase] Database não encontrada: ${filePath}`,
      );
    }

    const db = new DatabaseConnection(filePath);

    return new SaveDatabase(db);
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