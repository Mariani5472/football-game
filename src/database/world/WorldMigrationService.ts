import { WorldDatabase } from "./WorldDatabase.js";

export const WORLD_SCHEMA_VERSION = 2;

export interface WorldMigration {
  from: number;
  to: number;
  name: string;
  migrate: (database: WorldDatabase) => void;
}

/*
 * Migrations are deliberately explicit. The current world schema is v2, so
 * v1 databases without a supported structural migration are rejected instead
 * of being silently opened against a newer schema.
 */
const MIGRATIONS: WorldMigration[] = [];

export class WorldMigrationService {
  static readonly currentVersion = WORLD_SCHEMA_VERSION;

  static getVersion(database: WorldDatabase): number | null {
    const value = database.metadata("schema_version");
    return value == null ? null : Number(value);
  }

  static ensureCompatible(database: WorldDatabase): void {
    const version = this.getVersion(database);

    if (version == null) {
      throw new Error(
        `Unsupported world database: schema version metadata is missing. Supported version: v${this.currentVersion}.`,
      );
    }

    if (!Number.isInteger(version)) {
      throw new Error("Unsupported world database: schema_version is invalid.");
    }

    if (version > this.currentVersion) {
      throw new Error(
        `World database schema v${version} is newer than supported v${this.currentVersion}.`,
      );
    }

    if (version === this.currentVersion) return;

    let current = version;
    const applied: string[] = [];

    while (current < this.currentVersion) {
      const migration = MIGRATIONS.find(item => item.from === current);
      if (!migration) {
        throw new Error(
          `World database schema v${current} is incompatible. No migration to v${this.currentVersion} is registered.`,
        );
      }

      database.transaction(() => migration.migrate(database));
      current = migration.to;
      database.setMetadata("schema_version", String(current));
      applied.push(migration.name);
    }

    if (applied.length) {
      database.setMetadata("last_migration_at", new Date().toISOString());
    }
  }
}
