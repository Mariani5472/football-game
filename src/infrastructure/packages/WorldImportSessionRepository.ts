import type DatabaseConnection from "better-sqlite3";
import type { ConflictPolicy, ImportConflictRecord, ImportSessionRecord } from "./WorldPackageTypes.js";

/** Owns import-session lifecycle and its read models. */
export class WorldImportSessionRepository {
  constructor(private readonly connection: DatabaseConnection.Database) {}

  create(packageId: number, sourceFile: string, sourceSha256: string): number {
    const result = this.connection.prepare(`INSERT INTO world_import_session(status,package_id,source_file,source_sha256,started_at) VALUES('CREATED',?,?,?,?)`)
      .run(packageId, sourceFile, sourceSha256, new Date().toISOString());
    return Number(result.lastInsertRowid);
  }

  setStatus(id: number, status: string, summary?: Record<string, unknown>, error?: string): void {
    const terminal = status === "COMPLETED" || status === "FAILED";
    this.connection.prepare("UPDATE world_import_session SET status=?,summary_json=?,error_message=?,completed_at=? WHERE id=?")
      .run(status, JSON.stringify(summary ?? {}), error ?? null, terminal ? new Date().toISOString() : null, id);
  }

  get(id: number): ImportSessionRecord | undefined {
    const row = this.connection.prepare(`SELECT s.id,s.status,s.package_id AS packageId,p.package_key AS packageKey,s.source_file AS sourceFile,s.source_sha256 AS sourceSha256,s.started_at AS startedAt,s.completed_at AS completedAt,s.error_message AS errorMessage,s.summary_json AS summaryJson FROM world_import_session s JOIN world_package p ON p.id=s.package_id WHERE s.id=? LIMIT 1`)
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      id: Number(row.id), status: String(row.status), packageId: Number(row.packageId), packageKey: String(row.packageKey),
      sourceFile: String(row.sourceFile), sourceSha256: String(row.sourceSha256), startedAt: String(row.startedAt),
      completedAt: row.completedAt == null ? null : String(row.completedAt),
      errorMessage: row.errorMessage == null ? null : String(row.errorMessage),
      summary: JSON.parse(String(row.summaryJson ?? "{}")) as Record<string, unknown>,
    };
  }

  listConflicts(sessionId: number): ImportConflictRecord[] {
    return (this.connection.prepare(`SELECT id,package_id AS packageId,table_name AS tableName,incoming_key AS incomingKey,incoming_id AS incomingId,world_key AS worldKey,world_id AS worldId,conflict_type AS conflictType,column_name AS columnName,existing_value AS existingValue,incoming_value AS incomingValue,resolution,resolved FROM world_import_conflict WHERE import_session_id=? ORDER BY id`)
      .all(sessionId) as Array<Record<string, unknown>>).map(row => ({
      id: Number(row.id), packageId: Number(row.packageId), tableName: String(row.tableName), incomingKey: String(row.incomingKey),
      incomingId: row.incomingId == null ? null : Number(row.incomingId), worldKey: row.worldKey == null ? null : String(row.worldKey),
      worldId: row.worldId == null ? null : Number(row.worldId), conflictType: String(row.conflictType),
      columnName: row.columnName == null ? null : String(row.columnName), existingValue: row.existingValue == null ? null : String(row.existingValue),
      incomingValue: row.incomingValue == null ? null : String(row.incomingValue), resolution: String(row.resolution) as ConflictPolicy,
      resolved: Number(row.resolved ?? 0) === 1,
    }));
  }
}