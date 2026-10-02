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
import { WorldMigrationService } from "./WorldMigrationService.js";
import { initializeWorldCompositionSchema } from "./WorldCompositionSchema.js";
import { initializeWorldCompositionSchema } from "./WorldCompositionSchema.js";

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
    database.initializeEditorTemplates();
    database.initializeWorldComposition();
    return database;
  }

  static open(filePath: string): WorldDatabase {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Database não encontrada: ${filePath}`);
    }

    const database = new WorldDatabase(new DatabaseConnection(filePath));
    WorldMigrationService.ensureCompatible(database);
    database.initializeEditorTemplates();
    database.initializeWorldComposition();
    return database;
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

  private initializeWorldComposition(): void {
    initializeWorldCompositionSchema(this.connection);
  }

  private initializeWorldComposition(): void {
    initializeWorldCompositionSchema(this.connection);
  }

  private initializeEditorWorkspace(): void {
    this.execute(`
      CREATE TABLE IF NOT EXISTS world_package (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        package_key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONFLICT', 'ERROR')),
        icon TEXT,
        source_file TEXT,
        source_sha256 TEXT,
        categories_json TEXT NOT NULL DEFAULT '[]',
        description TEXT,
        schema_version INTEGER NOT NULL,
        imported_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  private initializeEditorTemplates(): void {
    this.execute(`
      CREATE TABLE IF NOT EXISTS editor_template (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        root_table TEXT NOT NULL,
        source_key TEXT NOT NULL,
        relations_json TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  private initialize(): void {
    const schemaPath = path.resolve(
      process.cwd(),
      "src/schemas/world/world_schema_v2.sql",
    );

    const runner = new SchemaRunner(this);
    runner.run(schemaPath);
    runner.initializeMetadata({
      schemaVersion: WorldMigrationService.currentVersion,
      databaseType: "world",
    });
    this.setMetadata("package_version", "0.3.0");
    this.setMetadata("schema_id", "world-v3");
    this.setMetadata("world_name", "New World");
    this.setMetadata("world_year", String(new Date().getFullYear()));
    this.setMetadata("world_created_at", new Date().toISOString());
  }
}

export type { ListOptions, ListResult, SqlRow, SqlValue } from "../Database.js";
