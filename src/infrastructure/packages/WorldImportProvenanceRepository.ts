import crypto from "node:crypto";
import type DatabaseConnection from "better-sqlite3";
import type { PackageTableInfo } from "./WorldPackageTypes.js";

export interface EntityProvenanceInput {
  table: PackageTableInfo;
  rowKey: string;
  packageId: number;
  incoming: Record<string, unknown>;
  resolution: string;
  winningColumns: Set<string>;
}
export interface AttributeProvenanceInput {
  tableName: string;
  rowKey: string;
  column: string;
  packageId: number;
  value: unknown;
  current: boolean;
  resolution: string;
  updatedAt: string;
}
export interface ImportIdMapInput {
  sessionId: number;
  tableName: string;
  incomingKey: string;
  incomingId: number | null;
  incomingUuid: string | null;
  worldKey: string;
  worldId: number | null;
  resolution: string;
  naturalKey: string | null;
}
export interface ImportConflictInput {
  sessionId: number;
  packageId: number;
  tableName: string;
  incomingKey: string;
  incomingId: number | null;
  worldKey: string | null;
  worldId: number | null;
  conflictType: string;
  column: string | null;
  existingValue: unknown;
  incomingValue: unknown;
}

/** Persists package-to-World provenance and import audit records. */
export class WorldImportProvenanceRepository {
  constructor(private readonly connection: DatabaseConnection.Database) {}

  recordEntity(input: EntityProvenanceInput): void {
    const now = new Date().toISOString();
    this.connection.prepare(`INSERT OR REPLACE INTO world_entity_provenance(table_name,row_key,package_id,resolution,imported_at) VALUES(?,?,?,?,?)`)
      .run(input.table.name, input.rowKey, input.packageId, input.resolution, now);
    for (const [column, value] of Object.entries(input.incoming)) {
      if (column === "id" && input.table.rowIdPrimaryKey) continue;
      this.recordAttribute({ tableName: input.table.name, rowKey: input.rowKey, column, packageId: input.packageId, value, current: input.winningColumns.has(column), resolution: input.resolution, updatedAt: now });
    }
  }

  recordAttributes(input: { table: PackageTableInfo; rowKey: string; packageId: number; incoming: Record<string, unknown>; columns: Record<string, unknown>; resolution: string }): void {
    const updatedAt = new Date().toISOString();
    for (const column of Object.keys(input.columns)) this.recordAttribute({ tableName: input.table.name, rowKey: input.rowKey, column, packageId: input.packageId, value: input.incoming[column], current: true, resolution: input.resolution, updatedAt });
  }

  recordAttribute(input: AttributeProvenanceInput): void {
    if (input.current) this.connection.prepare(`UPDATE world_attribute_provenance SET is_current=0 WHERE table_name=? AND row_key=? AND column_name=?`).run(input.tableName, input.rowKey, input.column);
    this.connection.prepare(`INSERT OR REPLACE INTO world_attribute_provenance(table_name,row_key,column_name,package_id,value_hash,resolution,is_current,updated_at) VALUES(?,?,?,?,?,?,?,?)`)
      .run(input.tableName, input.rowKey, input.column, input.packageId, hashValue(input.value), input.resolution, input.current ? 1 : 0, input.updatedAt);
  }

  recordIdMap(input: ImportIdMapInput): void {
    this.connection.prepare(`INSERT OR REPLACE INTO world_import_id_map(import_session_id,table_name,incoming_key,incoming_id,incoming_uuid,world_key,world_id,resolution,natural_key) VALUES(?,?,?,?,?,?,?,?,?)`)
      .run(input.sessionId, input.tableName, input.incomingKey, input.incomingId, input.incomingUuid, input.worldKey, input.worldId, input.resolution, input.naturalKey);
  }

  recordConflict(input: ImportConflictInput): void {
    this.connection.prepare(`INSERT INTO world_import_conflict(import_session_id,package_id,table_name,incoming_key,incoming_id,world_key,world_id,conflict_type,column_name,existing_value,incoming_value,resolution,resolved) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0)`)
      .run(input.sessionId, input.packageId, input.tableName, input.incomingKey, input.incomingId, input.worldKey, input.worldId, input.conflictType, input.column, input.existingValue == null ? null : String(input.existingValue), input.incomingValue == null ? null : String(input.incomingValue), "MANUAL");
  }

  resolveConflict(id: number, resolution: string): void {
    this.connection.prepare("UPDATE world_import_conflict SET resolution=?,resolved=1 WHERE id=?").run(resolution, id);
  }
}

function hashValue(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}