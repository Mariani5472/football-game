import { WorldDatabase } from "./WorldDatabase.js";

export const WORLD_SCHEMA_VERSION = 3;

export interface WorldMigration {
  from: number;
  to: number;
  name: string;
  migrate: (database: WorldDatabase) => void;
}

const MIGRATIONS: WorldMigration[] = [
  {
    from: 2,
    to: 3,
    name: "p5-world-composition",
    migrate: database => {
      const personColumns = database.connection
        .prepare(`PRAGMA table_info("person")`)
        .all() as Array<{ name: string }>;

      if (!personColumns.some(column => column.name === "uuid")) {
        database.connection.exec('ALTER TABLE person ADD COLUMN uuid TEXT');
      }

      database.connection.exec(`
        UPDATE person
        SET uuid = lower(hex(randomblob(16)))
        WHERE uuid IS NULL OR uuid = '';
      `);

      database.connection.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_person_uuid ON person(uuid);
      `);

      const packageColumns = database.connection.prepare(`PRAGMA table_info("world_package")`).all() as Array<{ name:string }>;
      const add = (column:string, sql:string) => {
        if (!packageColumns.some(item => item.name === column)) {
          database.connection.exec(`ALTER TABLE world_package ADD COLUMN ${sql}`);
        }
      };
      add("package_type", "package_type TEXT NOT NULL DEFAULT 'CONTENT'");
      add("priority", "priority INTEGER NOT NULL DEFAULT 100");
      add("installed_at", "installed_at TEXT");
      add("enabled", "enabled INTEGER NOT NULL DEFAULT 1");
      database.connection.exec(`
        UPDATE world_package
        SET installed_at = COALESCE(installed_at, imported_at, datetime('now'))
        WHERE installed_at IS NULL;
      `);
      database.connection.exec(`CREATE TABLE IF NOT EXISTS world_package_load_order (
        package_id INTEGER PRIMARY KEY,
        load_order INTEGER NOT NULL UNIQUE,
        FOREIGN KEY (package_id) REFERENCES world_package(id) ON DELETE CASCADE
      )`);
      database.connection.exec(`CREATE TABLE IF NOT EXISTS world_package_provides (
        package_id INTEGER NOT NULL,
        provide_key TEXT NOT NULL,
        PRIMARY KEY(package_id, provide_key),
        FOREIGN KEY(package_id) REFERENCES world_package(id) ON DELETE CASCADE
      )`);
      database.connection.exec(`CREATE TABLE IF NOT EXISTS world_package_dependency (
        package_id INTEGER NOT NULL,
        dependency_key TEXT NOT NULL,
        min_version TEXT,
        PRIMARY KEY(package_id, dependency_key),
        FOREIGN KEY(package_id) REFERENCES world_package(id) ON DELETE CASCADE
      )`);
      database.connection.exec(`CREATE TABLE IF NOT EXISTS world_package_conflict (
        package_id INTEGER NOT NULL,
        conflict_key TEXT NOT NULL,
        PRIMARY KEY(package_id, conflict_key),
        FOREIGN KEY(package_id) REFERENCES world_package(id) ON DELETE CASCADE
      )`);
    },
  },
];

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

    let current = version;

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
      database.setMetadata("last_migration_at", new Date().toISOString());
    }
  }
}
