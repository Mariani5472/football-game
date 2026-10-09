import type DatabaseConnection from "better-sqlite3";

export function initializeWorldCompositionSchema(db: DatabaseConnection.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS world_package (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      package_type TEXT NOT NULL DEFAULT 'CONTENT',
      priority INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONFLICT', 'ERROR', 'DISABLED')),
      icon TEXT,
      source_file TEXT,
      source_sha256 TEXT,
      categories_json TEXT NOT NULL DEFAULT '[]',
      description TEXT,
      schema_version INTEGER NOT NULL,
      imported_at TEXT NOT NULL,
      installed_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS world_package_load_order (
      package_id INTEGER PRIMARY KEY,
      load_order INTEGER NOT NULL UNIQUE,
      FOREIGN KEY (package_id) REFERENCES world_package(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS world_package_provides (
      package_id INTEGER NOT NULL,
      provide_key TEXT NOT NULL,
      PRIMARY KEY (package_id, provide_key),
      FOREIGN KEY (package_id) REFERENCES world_package(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS world_package_dependency (
      package_id INTEGER NOT NULL,
      dependency_key TEXT NOT NULL,
      min_version TEXT,
      PRIMARY KEY (package_id, dependency_key),
      FOREIGN KEY (package_id) REFERENCES world_package(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS world_package_conflict (
      package_id INTEGER NOT NULL,
      conflict_key TEXT NOT NULL,
      PRIMARY KEY (package_id, conflict_key),
      FOREIGN KEY (package_id) REFERENCES world_package(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS world_package_version_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      package_key TEXT NOT NULL,
      version TEXT NOT NULL,
      package_type TEXT NOT NULL,
      source_file TEXT,
      source_sha256 TEXT,
      replaced_at TEXT NOT NULL,
      replacement_reason TEXT NOT NULL,
      FOREIGN KEY (package_id) REFERENCES world_package(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_world_package_version_history_package
      ON world_package_version_history(package_id, replaced_at);

    CREATE TABLE IF NOT EXISTS world_entity_identity (
      table_name TEXT NOT NULL,
      row_id INTEGER NOT NULL,
      entity_uuid TEXT,
      natural_key TEXT,
      PRIMARY KEY (table_name, row_id),
      UNIQUE (entity_uuid),
      UNIQUE (table_name, natural_key)
    );

    CREATE TABLE IF NOT EXISTS world_entity_provenance (
      table_name TEXT NOT NULL,
      row_key TEXT NOT NULL,
      package_id INTEGER NOT NULL,
      resolution TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      PRIMARY KEY (table_name, row_key, package_id),
      FOREIGN KEY (package_id) REFERENCES world_package(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS world_attribute_provenance (
      table_name TEXT NOT NULL,
      row_key TEXT NOT NULL,
      column_name TEXT NOT NULL,
      package_id INTEGER NOT NULL,
      value_hash TEXT,
      resolution TEXT NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
      updated_at TEXT NOT NULL,
      PRIMARY KEY (table_name, row_key, column_name, package_id),
      FOREIGN KEY (package_id) REFERENCES world_package(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS world_import_session (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL CHECK (status IN (
        'CREATED', 'INSPECTING', 'RESOLVING', 'CONFLICTS_FOUND',
        'READY', 'COMMITTING', 'COMPLETED', 'FAILED'
      )),
      package_id INTEGER NOT NULL,
      source_file TEXT NOT NULL,
      source_sha256 TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      error_message TEXT,
      summary_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (package_id) REFERENCES world_package(id)
    );

    CREATE TABLE IF NOT EXISTS world_import_id_map (
      import_session_id INTEGER NOT NULL,
      table_name TEXT NOT NULL,
      incoming_key TEXT NOT NULL,
      incoming_id INTEGER,
      incoming_uuid TEXT,
      world_key TEXT,
      world_id INTEGER,
      resolution TEXT NOT NULL,
      natural_key TEXT,
      PRIMARY KEY (import_session_id, table_name, incoming_key),
      FOREIGN KEY (import_session_id) REFERENCES world_import_session(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS world_import_conflict (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_session_id INTEGER NOT NULL,
      package_id INTEGER NOT NULL,
      table_name TEXT NOT NULL,
      incoming_key TEXT NOT NULL,
      incoming_id INTEGER,
      world_key TEXT,
      world_id INTEGER,
      conflict_type TEXT NOT NULL,
      column_name TEXT,
      existing_value TEXT,
      incoming_value TEXT,
      resolution TEXT NOT NULL DEFAULT 'MANUAL',
      resolved INTEGER NOT NULL DEFAULT 0 CHECK (resolved IN (0, 1)),
      FOREIGN KEY (import_session_id) REFERENCES world_import_session(id) ON DELETE CASCADE,
      FOREIGN KEY (package_id) REFERENCES world_package(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_world_entity_identity_uuid
      ON world_entity_identity(entity_uuid);

    CREATE INDEX IF NOT EXISTS idx_world_entity_provenance_package
      ON world_entity_provenance(package_id);

    CREATE INDEX IF NOT EXISTS idx_world_attribute_provenance_package
      ON world_attribute_provenance(package_id);

    CREATE INDEX IF NOT EXISTS idx_world_attribute_provenance_current
      ON world_attribute_provenance(table_name, row_key, column_name, is_current);

    CREATE INDEX IF NOT EXISTS idx_world_import_id_map_world
      ON world_import_id_map(world_id);

    CREATE INDEX IF NOT EXISTS idx_world_import_conflict_session
      ON world_import_conflict(import_session_id, resolved);
  `);
}

export const WORLD_PACKAGE_STATUS = [
  "ACTIVE",
  "CONFLICT",
  "ERROR",
  "DISABLED",
] as const;

export const WORLD_IMPORT_STATUS = [
  "CREATED",
  "INSPECTING",
  "RESOLVING",
  "CONFLICTS_FOUND",
  "READY",
  "COMMITTING",
  "COMPLETED",
  "FAILED",
] as const;
