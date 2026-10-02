import crypto from "node:crypto";

import { initializeWorldCompositionSchema } from "./WorldCompositionSchema.js";
import { WorldDatabase } from "./WorldDatabase.js";

export const WORLD_BASE_SCHEMA_VERSION = 2;
export const WORLD_SCHEMA_VERSION = 3;

export interface WorldMigration {
  from: number;
  to: number;
  name: string;
  migrate: (database: WorldDatabase) => void;
}

const IDENTITY_TABLES = [
  "federation",
  "continent",
  "continent_region",
  "currency",
  "language_family",
  "language_group",
  "language_subgroup",
  "language",
  "gender",
  "nation",
  "nation_region",
  "city",
  "team",
  "stadium",
  "competition",
  "person",
] as const;

const MIGRATIONS: WorldMigration[] = [
  {
    from: 2,
    to: 3,
    name: "p5-world-composition",
    migrate: database => {
      ensureLegacyPackageRegistry(database);

      for (const table of IDENTITY_TABLES) {
        addUuidColumn(database, table);
      }

      initializeWorldCompositionSchema(database);

      const packageColumns = database.connection
        .prepare('PRAGMA table_info("world_package")')
        .all() as Array<{ name: string }>;

      addColumnIfMissing(
        database,
        packageColumns,
        "package_type",
        "package_type TEXT NOT NULL DEFAULT 'CONTENT'",
      );
      addColumnIfMissing(
        database,
        packageColumns,
        "priority",
        "priority INTEGER NOT NULL DEFAULT 100",
      );
      addColumnIfMissing(
        database,
        packageColumns,
        "installed_at",
        "installed_at TEXT",
      );
      addColumnIfMissing(
        database,
        packageColumns,
        "enabled",
        "enabled INTEGER NOT NULL DEFAULT 1",
      );

      database.connection.exec(
        "UPDATE world_package SET installed_at = COALESCE(installed_at, imported_at, datetime('now')) WHERE installed_at IS NULL",
      );

      database.connection.exec(
        "CREATE INDEX IF NOT EXISTS idx_world_package_enabled ON world_package(enabled, priority)",
      );
    },
  },
];

function ensureLegacyPackageRegistry(database: WorldDatabase): void {
  database.connection.exec(
    `CREATE TABLE IF NOT EXISTS world_package (
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
    )`,
  );
}

function addUuidColumn(
  database: WorldDatabase,
  table: string,
): void {
  const columns = database.connection
    .prepare(
      'PRAGMA table_info("' + table + '")',
    )
    .all() as Array<{ name: string }>;

  if (
    !columns.some(
      column => column.name === "uuid",
    )
  ) {
    database.connection.exec(
      'ALTER TABLE "' +
        table +
        '" ADD COLUMN uuid TEXT',
    );
  }

  const missing = database.connection
    .prepare(
      'SELECT rowid FROM "' +
        table +
        '" WHERE uuid IS NULL OR uuid = ""',
    )
    .all() as Array<{ rowid: number }>;

  const update = database.connection.prepare(
    'UPDATE "' +
      table +
      '" SET uuid = ? WHERE rowid = ?',
  );

  for (const row of missing) {
    update.run(
      crypto.randomUUID(),
      row.rowid,
    );
  }

  database.connection.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS "ux_' +
      table +
      '_uuid" ON "' +
      table +
      '"(uuid)',
  );
}

function addColumnIfMissing(
  database: WorldDatabase,
  currentColumns: Array<{ name: string }>,
  name: string,
  definition: string,
): void {
  if (
    !currentColumns.some(
      column => column.name === name,
    )
  ) {
    database.connection.exec(
      "ALTER TABLE world_package ADD COLUMN " +
        definition,
    );
  }
}

export class WorldMigrationService {
  static readonly currentVersion =
    WORLD_SCHEMA_VERSION;

  static getVersion(
    database: WorldDatabase,
  ): number | null {
    const value = database.metadata(
      "schema_version",
    );
    return value == null
      ? null
      : Number(value);
  }

  static ensureCompatible(
    database: WorldDatabase,
  ): void {
    const version =
      this.getVersion(database);

    if (version == null) {
      throw new Error(
        "Unsupported world database: schema version metadata is missing. Supported version: v" +
          this.currentVersion +
          ".",
      );
    }

    if (!Number.isInteger(version)) {
      throw new Error(
        "Unsupported world database: schema_version is invalid.",
      );
    }

    if (version > this.currentVersion) {
      throw new Error(
        "World database schema v" +
          version +
          " is newer than supported v" +
          this.currentVersion +
          ".",
      );
    }

    let current = version;

    while (
      current < this.currentVersion
    ) {
      const migration =
        MIGRATIONS.find(
          item =>
            item.from === current,
        );

      if (!migration) {
        throw new Error(
          "World database schema v" +
            current +
            " is incompatible. No migration to v" +
            this.currentVersion +
            " is registered.",
        );
      }

      database.transaction(
        () => migration.migrate(database),
      );

      current = migration.to;

      database.setMetadata(
        "schema_version",
        String(current),
      );
      database.setMetadata(
        "last_migration_at",
        new Date().toISOString(),
      );
    }
  }
}
