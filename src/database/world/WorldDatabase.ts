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
import {
  WORLD_BASE_SCHEMA_VERSION,
  WorldMigrationService,
} from "./WorldMigrationService.js";
import { initializeWorldCompositionSchema } from "./WorldCompositionSchema.js";
import { WorldBasePackageService } from "./WorldBasePackageService.js";

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
    WorldMigrationService.ensureCompatible(database);
    database.initializeEditorTemplates();
    database.initializeWorldComposition();
    database.ensureEditorMetadata();
    WorldBasePackageService.ensureInstalled(database, filePath);
    database.ensureEditorMetadata();
    WorldBasePackageService.ensureInstalled(database, filePath);
    database.ensureEditorMetadata();
    return database;
  }

  static open(filePath: string): WorldDatabase {
    if (!fs.existsSync(filePath)) {
      throw new Error("Database não encontrada: " + filePath);
    }

    const database = new WorldDatabase(new DatabaseConnection(filePath));
    WorldMigrationService.ensureCompatible(database);
    database.initializeEditorTemplates();
    database.initializeWorldComposition();
    database.ensureEditorMetadata();
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

  private initializeEditorTemplates(): void {
    this.execute(
      `CREATE TABLE IF NOT EXISTS editor_template (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        root_table TEXT NOT NULL,
        source_key TEXT NOT NULL,
        relations_json TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    );
  }

  private ensureEditorMetadata(): void {
    const packageVersion = this.metadata("package_version");
    const schemaId = this.metadata("schema_id");

    if (packageVersion == null) {
      this.setMetadata("package_version", "0.4.0");
    }

    if (schemaId == null) {
      this.setMetadata("schema_id", "world-v4");
    }

    if (this.metadata("world_name") == null) {
      this.setMetadata("world_name", "New World");
    }

    if (this.metadata("world_year") == null) {
      this.setMetadata("world_year", String(new Date().getFullYear()));
    }

    if (this.metadata("world_created_at") == null) {
      this.setMetadata("world_created_at", new Date().toISOString());
    }

    if (this.metadata("world_build_status") == null) {
      this.setMetadata("world_build_status", "DIRTY");
    }

    if (this.metadata("world_dirty_reason") == null) {
      this.setMetadata("world_dirty_reason", "INITIAL");
    }
  }

  private initialize(): void {
    const schemaPath = path.resolve(
      process.cwd(),
      "src/schemas/world/world_schema_v2.sql",
    );

    const runner = new SchemaRunner(this);
    runner.run(schemaPath);
    runner.initializeMetadata({
      schemaVersion: WORLD_BASE_SCHEMA_VERSION,
      databaseType: "world",
    });
  }
}

export type { ListOptions, ListResult, SqlRow, SqlValue } from "../Database.js";
