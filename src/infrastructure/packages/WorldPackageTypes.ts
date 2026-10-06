export const BASE_PACKAGE_PRIORITY = 0;
export const DEFAULT_PACKAGE_PRIORITY = 10;

export interface PackageManifest {
  /** Formal package identity. packageKey remains the persisted registry field. */
  id?: string;
  packageKey: string;
  name: string;
  version: string;
  packageType?: string;
  priority?: number;
  schemaVersion: number;
  categories?: string[];
  description?: string | null;
  provides?: string[];
  dependencies?: Array<{ key: string; minVersion?: string | null }>;
  conflicts?: string[];
}

export interface PackageColumnInfo { name: string; type: string; notNull: boolean; defaultValue: unknown; primaryKeyOrder: number }
export interface PackageForeignKeyInfo { id: number; sequence: number; table: string; from: string; to: string }
export interface PackageTableInfo {
  name: string;
  columns: PackageColumnInfo[];
  primaryKey: string[];
  foreignKeys: PackageForeignKeyInfo[];
  uniqueColumns: string[][];
  rowIdPrimaryKey: boolean;
}
export type ConflictPolicy = "REPLACE" | "MERGE" | "KEEP_EXISTING" | "KEEP_INCOMING" | "MANUAL";
export interface ImportConflictRecord {
  id: number; packageId: number; tableName: string; incomingKey: string; incomingId: number | null;
  worldKey: string | null; worldId: number | null; conflictType: string; columnName: string | null;
  existingValue: string | null; incomingValue: string | null; resolution: ConflictPolicy; resolved: boolean;
}
export interface ImportSessionRecord {
  id: number; status: string; packageId: number; packageKey: string; sourceFile: string;
  sourceSha256: string; startedAt: string; completedAt: string | null; errorMessage: string | null;
  summary: Record<string, unknown>;
}
