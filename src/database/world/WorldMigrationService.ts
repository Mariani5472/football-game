import crypto from "node:crypto";

import { initializeWorldCompositionSchema } from "./WorldCompositionSchema.js";
import { WorldDatabase } from "./WorldDatabase.js";

export const WORLD_BASE_SCHEMA_VERSION = 2;
export const WORLD_SCHEMA_VERSION = 5;

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
  "nationality_method",
  "nation_development_state",
  "gender",
  "weekday",
  "club_status",
  "competition_type",
  "competition_stage_type",
  "pitch_type",
  "stadium_owner_type",
  "person_type",
  "position_definition",
  "referee_category",
  "employment",
  "weather_season",
] as const;

const MIGRATIONS: WorldMigration[] = [
  {
    from: 4,
    to: 5,
    name: "p7-stadium-images",
    migrate: database => {
      database.connection.exec(`
        CREATE TABLE IF NOT EXISTS stadium_image (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          stadium_id INTEGER NOT NULL,
          url TEXT NOT NULL,
          caption TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
          source TEXT,
          FOREIGN KEY (stadium_id) REFERENCES stadium(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_stadium_image_stadium
          ON stadium_image(stadium_id, sort_order);
      `);
    },
  },

  {
    from: 3,
    to: 4,
    name: "p6-package-identity",
    migrate: database => {
      initializeWorldCompositionSchema(database.connection);

      database.connection.exec(`
        CREATE TABLE IF NOT EXISTS confederation (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL UNIQUE,
          short_name TEXT NOT NULL UNIQUE,
          description TEXT
        );

        CREATE TABLE IF NOT EXISTS confederation_member_nation (
          confederation_id INTEGER NOT NULL,
          nation_id INTEGER NOT NULL,
          joined_at TEXT,
          PRIMARY KEY(confederation_id, nation_id),
          FOREIGN KEY(confederation_id) REFERENCES confederation(id) ON DELETE CASCADE,
          FOREIGN KEY(nation_id) REFERENCES nation(id) ON DELETE CASCADE
        );
      `);

      const duplicateIdentity = database.connection
        .prepare(
          "SELECT lower(package_key) AS packageKey, COUNT(*) AS count FROM world_package GROUP BY lower(package_key) HAVING COUNT(*) > 1 LIMIT 1",
        )
        .get() as { packageKey: string; count: number } | undefined;

      if (duplicateIdentity) {
        throw new Error(
          "Cannot migrate World to schema v4: duplicate package identity detected for " +
            duplicateIdentity.packageKey +
            ". Resolve the duplicate packages before migrating.",
        );
      }

      database.connection.exec(
        "UPDATE world_package SET package_key=lower(trim(package_key))",
      );
      database.connection.exec(
        "UPDATE world_package_provides SET provide_key=lower(trim(provide_key))",
      );
      database.connection.exec(
        "UPDATE world_package_dependency SET dependency_key=lower(trim(dependency_key))",
      );
      database.connection.exec(
        "UPDATE world_package_conflict SET conflict_key=lower(trim(conflict_key))",
      );

      database.connection.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS ux_world_package_identity_normalized ON world_package(lower(package_key))",
      );

      database.connection.exec(
        "CREATE INDEX IF NOT EXISTS idx_world_package_enabled_identity ON world_package(enabled, package_key)",
      );

      database.setMetadata("package_version", "0.4.0");
      database.setMetadata("schema_id", "world-v4");
    },
  },
  {
    from: 2,
    to: 3,
    name: "p5-world-composition",
    migrate: database => {
      ensureLegacyPackageRegistry(database);

      for (const table of IDENTITY_TABLES) {
        addUuidColumn(database, table);
      }

      initializeWorldCompositionSchema(database.connection);

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
    .prepare(`SELECT rowid FROM "${table}" WHERE uuid IS NULL OR uuid = ''`)
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
