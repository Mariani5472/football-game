import fs from "node:fs";
import path from "node:path";
import DatabaseConnection from "better-sqlite3";

import {
  Database,
  type ListOptions,
  type ListResult,
  type SqlRow,
  type SqlValue,
} from "../Database.js";
import { SchemaRunner } from "../SchemaRunner.js";

export interface WorldListOptions extends ListOptions {
  searchColumns?: string[];
}

export class WorldDatabase extends Database {
  private constructor(db: DatabaseConnection.Database) {
    super(db);
  }

  static create(filePath: string): WorldDatabase {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });

    const database = new WorldDatabase(new DatabaseConnection(filePath));
    database.initialize();
    return database;
  }

  static open(filePath: string): WorldDatabase {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Database não encontrada: ${filePath}`);
    }

    return new WorldDatabase(new DatabaseConnection(filePath));
  }

  list<T extends SqlRow = SqlRow>(
    table: string,
    options: WorldListOptions = {},
  ): ListResult<T> {
    return super.list<T>(table, options);
  }

  createEntity<T extends SqlRow = SqlRow>(
    table: string,
    values: Record<string, SqlValue | undefined>,
  ): T {
    return this.create<T>(table, values);
  }

  updateEntity<T extends SqlRow = SqlRow>(
    table: string,
    id: SqlValue,
    values: Record<string, SqlValue | undefined>,
  ): T {
    return this.update<T>(table, id, values);
  }

  deleteEntity(table: string, id: SqlValue): boolean {
    return this.delete(table, id);
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

export type { ListOptions, ListResult, SqlRow, SqlValue } from "../Database.js";