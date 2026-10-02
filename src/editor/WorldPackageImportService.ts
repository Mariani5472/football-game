import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import DatabaseConnection from "better-sqlite3";

import { WorldDatabase } from "../database/world/WorldDatabase.js";
import {
  type IdentityContext,
  type IdentityPolicy,
  generateUuid,
  identityPolicy,
} from "../database/world/WorldIdentity.js";

export type ConflictPolicy =
  | "REPLACE"
  | "MERGE"
  | "KEEP_EXISTING"
  | "KEEP_INCOMING"
  | "MANUAL";

export interface PackageManifest {
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

export interface ImportPreview {
  sessionId: number;
  packageKey: string;
  status: string;
  tables: number;
  rows: number;
  newRows: number;
  existingRows: number;
  conflicts: number;
  message: string;
}

export interface ImportConflictRecord {
  id: number;
  packageId: number;
  tableName: string;
  incomingKey: string;
  incomingId: number | null;
  worldKey: string | null;
  worldId: number | null;
  conflictType: string;
  columnName: string | null;
  existingValue: string | null;
  incomingValue: string | null;
  resolution: ConflictPolicy;
  resolved: boolean;
}

export interface ImportSessionRecord {
  id: number;
  status: string;
  packageId: number;
  packageKey: string;
  sourceFile: string;
  sourceSha256: string;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  summary: Record<string, unknown>;
}

export interface RebuildResult {
  status: "COMPLETED";
  packages: number;
  rows: number;
  sessions: number;
  message: string;
}

type Row = Record<string, unknown>;
type KeyObject = Record<string, unknown>;

interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: unknown;
  primaryKeyOrder: number;
}

interface ForeignKeyInfo {
  id: number;
  sequence: number;
  table: string;
  from: string;
  to: string;
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primaryKey: string[];
  foreignKeys: ForeignKeyInfo[];
  uniqueColumns: string[][];
  rowIdPrimaryKey: boolean;
}

interface PackageRuntime {
  id: number;
  manifest: PackageManifest;
  sourceFile: string;
  sourceSha256: string;
  loadOrder: number;
  priority: number;
  alias: string;
}

interface ImportRuntime {
  packageId: number;
  sessionId: number;
  manifest: PackageManifest;
  tableInfos: Map<string, TableInfo>;
  mapping: Map<string, KeyObject>;
  packagePriority: number;
  alias: string;
}

class UnresolvedForeignKeyError extends Error {
  constructor(
    readonly tableName: string,
    readonly columnName: string,
    readonly targetTable: string,
    readonly targetKey: string,
  ) {
    super(
      "Unresolved foreign key " +
        tableName +
        "." +
        columnName +
        " -> " +
        targetTable +
        " " +
        targetKey,
    );
    this.name = "UnresolvedForeignKeyError";
  }
}

const INTERNAL_TABLES = new Set([
  "database_metadata",
  "editor_template",
  "world_package",
  "world_package_load_order",
  "world_package_provides",
  "world_package_dependency",
  "world_package_conflict",
  "world_entity_identity",
  "world_entity_provenance",
  "world_attribute_provenance",
  "world_import_session",
  "world_import_id_map",
  "world_import_conflict",
]);

const EVENT_TABLES = new Set([
  "fixture",
  "transfer",
  "player_transfer",
  "award",
  "player_injury",
  "person_suspension",
  "competition_history",
]);

export class WorldPackageImportService {
  constructor(private readonly world: WorldDatabase) {
    this.bootstrapWorldIdentities();
  }

  inspect(sourceFile: string): ImportPreview {
    const absolute = this.resolveSource(sourceFile);
    const sourceSha256 = sha256File(absolute);
    const alias = "incoming_package";

    this.attach(alias, absolute);

    try {
      const manifest = this.readManifest(alias);
      this.validateManifest(manifest);

      const packageId = this.ensurePackage(
        manifest,
        absolute,
        sourceSha256,
      );
      const sessionId = this.createSession(
        packageId,
        absolute,
        sourceSha256,
      );

      this.setSessionStatus(sessionId, "INSPECTING");

      const tableInfos = this.loadTableInfos(alias);
      this.validateCompatibleTables(tableInfos);

      const context = this.createIdentityContext(alias, tableInfos);
      const mapping = new Map<string, KeyObject>();

      let rows = 0;
      let newRows = 0;
      let existingRows = 0;
      let conflicts = 0;

      for (const table of this.orderTables(tableInfos)) {
        for (const row of this.iterateRows(alias, table.name)) {
          rows += 1;

          const incomingKey = serializeKey(table, row);
          const resolved = this.resolveExisting(
            table,
            row,
            context,
            mapping,
            packageId,
            incomingKey,
          );

          if (resolved.conflict) {
            conflicts += 1;
            this.recordConflict(
              sessionId,
              packageId,
              table,
              row,
              resolved.worldKey,
              resolved.worldId,
              resolved.conflict.type,
              resolved.conflict.column,
              resolved.conflict.existingValue,
              resolved.conflict.incomingValue,
            );
          }

          let effectiveWorldKey = resolved.worldKey;

          if (!effectiveWorldKey) {
            const translated = this.tryBuildTranslatedRow(
              table,
              row,
              mapping,
              tableInfos,
            );

            if (translated) {
              effectiveWorldKey = this.findExistingByUnique(
                table,
                translated,
              );

              if (effectiveWorldKey) {
                const changes = this.findRowChanges(
                  table,
                  effectiveWorldKey,
                  translated,
                );

                for (const change of changes) {
                  conflicts += 1;
                  this.recordConflict(
                    sessionId,
                    packageId,
                    table,
                    row,
                    effectiveWorldKey,
                    toNumberOrNull(
                      effectiveWorldKey[table.primaryKey[0]],
                    ),
                    "ATTRIBUTE",
                    change.column,
                    change.existingValue,
                    change.incomingValue,
                  );
                }
              }
            }
          }

          if (effectiveWorldKey) {
            existingRows += 1;
            mapping.set(
              mapKey(table.name, incomingKey),
              effectiveWorldKey,
            );
          } else {
            newRows += 1;
            mapping.set(
              mapKey(table.name, incomingKey),
              virtualKey(table, incomingKey),
            );
          }
        }
      }

      const status =
        conflicts > 0 ? "CONFLICTS_FOUND" : "READY";

      this.setSessionStatus(sessionId, status, {
        tables: tableInfos.size,
        rows,
        newRows,
        existingRows,
        conflicts,
      });
      this.setBuildDirty();

      return {
        sessionId,
        packageKey: manifest.packageKey,
        status,
        tables: tableInfos.size,
        rows,
        newRows,
        existingRows,
        conflicts,
        message:
          conflicts > 0
            ? "Package inspected; review the detected conflicts before importing."
            : "Package is compatible and ready to import.",
      };
    } finally {
      this.detach(alias);
    }
  }

  import(
    sessionId: number,
    resolutions: Record<string, ConflictPolicy> = {},
  ): ImportPreview {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error("Import session not found: " + sessionId);
    }

    const absolute = session.sourceFile;
    if (!fs.existsSync(absolute)) {
      throw new Error("Package file not found: " + absolute);
    }

    const sourceHash = sha256File(absolute);
    if (sourceHash !== session.sourceSha256) {
      throw new Error(
        "Package changed after inspection. Inspect it again before importing.",
      );
    }

    const alias = "incoming_package";
    this.attach(alias, absolute);

    try {
      const manifest = this.readManifest(alias);
      this.validateManifest(manifest);

      const packageRow = this.world.connection
        .prepare(
          "SELECT id, priority FROM world_package WHERE package_key=?",
        )
        .get(manifest.packageKey) as
        | { id: number; priority: number }
        | undefined;

      if (!packageRow) {
        throw new Error("Package registry entry is missing.");
      }

      const tableInfos = this.loadTableInfos(alias);
      this.validateCompatibleTables(tableInfos);

      const runtime: ImportRuntime = {
        packageId: packageRow.id,
        sessionId,
        manifest,
        tableInfos,
        mapping: new Map(),
        packagePriority: Number(
          packageRow.priority ?? manifest.priority ?? 100,
        ),
        alias,
      };

      this.setSessionStatus(sessionId, "RESOLVING");

      const explicitResolution = this.buildResolutionMap(
        this.listConflicts(sessionId),
        resolutions,
      );

      let rows = 0;
      let created = 0;
      let updated = 0;
      let skipped = 0;

      this.world.transaction(() => {
        this.world.connection.pragma("defer_foreign_keys = ON");
        this.setSessionStatus(sessionId, "COMMITTING");

        const pending = new Map<string, Row[]>();
        for (const table of this.orderTables(tableInfos)) {
          pending.set(
            table.name,
            Array.from(this.iterateRows(alias, table.name)),
          );
        }

        let progress = true;
        while (pending.size > 0 && progress) {
          progress = false;

          for (const [tableName, pendingRows] of Array.from(
            pending.entries(),
          )) {
            const table = tableInfos.get(tableName);
            if (!table) {
              pending.delete(tableName);
              continue;
            }

            const next: Row[] = [];

            for (const row of pendingRows) {
              try {
                const result = this.importRow(
                  runtime,
                  table,
                  row,
                  explicitResolution,
                );

                rows += 1;
                if (result.created) created += 1;
                if (result.updated) updated += 1;
                if (result.skipped) skipped += 1;

                progress = true;
              } catch (error) {
                if (error instanceof UnresolvedForeignKeyError) {
                  next.push(row);
                  continue;
                }
                throw error;
              }
            }

            if (next.length === 0) {
              pending.delete(tableName);
            } else {
              pending.set(tableName, next);
            }
          }
        }

        if (pending.size > 0) {
          const unresolved = Array.from(pending.entries())
            .map(
              ([tableName, pendingRows]) =>
                tableName + " (" + pendingRows.length + " rows)",
            )
            .join(", ");

          throw new Error(
            "Unable to resolve package foreign keys: " +
              unresolved,
          );
        }

        this.world.setMetadata("world_build_status", "VALID");
        this.world.setMetadata(
          "world_last_build_at",
          new Date().toISOString(),
        );
      });

      this.setSessionStatus(sessionId, "COMPLETED", {
        tables: tableInfos.size,
        rows,
        created,
        updated,
        skipped,
      });

      this.world.connection
        .prepare(
          "UPDATE world_package SET status='ACTIVE', updated_at=? WHERE id=?",
        )
        .run(new Date().toISOString(), packageRow.id);

      return {
        sessionId,
        packageKey: manifest.packageKey,
        status: "COMPLETED",
        tables: tableInfos.size,
        rows,
        newRows: created,
        existingRows: updated,
        conflicts: this.listConflicts(sessionId).length,
        message:
          "Imported " +
          rows +
          " rows (" +
          created +
          " created, " +
          updated +
          " updated, " +
          skipped +
          " unchanged).",
      };
    } catch (error) {
      this.setSessionStatus(
        sessionId,
        "FAILED",
        undefined,
        error instanceof Error ? error.message : String(error),
      );
      this.world.setMetadata("world_build_status", "INVALID");
      throw error;
    } finally {
      this.detach(alias);
    }
  }

  rebuild(): RebuildResult {
    const packages = this.listEnabledPackages();

    for (const pkg of packages) {
      if (!pkg.sourceFile) {
        throw new Error(
          "Enabled package has no source file: " +
            pkg.manifest.packageKey,
        );
      }

      if (!fs.existsSync(pkg.sourceFile)) {
        throw new Error(
          "Package source file not found: " +
            pkg.manifest.packageKey +
            " -> " +
            pkg.sourceFile,
        );
      }

      const actualHash = sha256File(pkg.sourceFile);
      if (actualHash !== pkg.sourceSha256) {
        throw new Error(
          "Package hash changed: " + pkg.manifest.packageKey,
        );
      }

      this.validateManifest(pkg.manifest);
    }

    const runtimes = packages.map(pkg => ({
      ...pkg,
      alias: "incoming_" + pkg.id,
    }));

    for (const runtime of runtimes) {
      this.attach(runtime.alias, runtime.sourceFile);
    }

    const sessions: Array<{
      runtime: PackageRuntime;
      sessionId: number;
    }> = [];

    try {
      for (const runtime of runtimes) {
        sessions.push({
          runtime,
          sessionId: this.createSession(
            runtime.id,
            runtime.sourceFile,
            runtime.sourceSha256,
          ),
        });
      }

      let totalRows = 0;

      this.world.transaction(() => {
        this.world.connection.pragma("defer_foreign_keys = ON");
        this.clearBuiltWorld();

        for (const item of sessions) {
          const tableInfos = this.loadTableInfos(item.runtime.alias);
          this.validateCompatibleTables(tableInfos);

          const runtime: ImportRuntime = {
            packageId: item.runtime.id,
            sessionId: item.sessionId,
            manifest: item.runtime.manifest,
            tableInfos,
            mapping: new Map(),
            packagePriority: item.runtime.priority,
            alias: item.runtime.alias,
          };

          this.setSessionStatus(
            item.sessionId,
            "RESOLVING",
          );

          const pending = new Map<string, Row[]>();
          for (const table of this.orderTables(tableInfos)) {
            pending.set(
              table.name,
              Array.from(
                this.iterateRows(
                  item.runtime.alias,
                  table.name,
                ),
              ),
            );
          }

          let packageRows = 0;
          let progress = true;

          while (pending.size > 0 && progress) {
            progress = false;

            for (const [tableName, pendingRows] of Array.from(
              pending.entries(),
            )) {
              const table = tableInfos.get(tableName);
              if (!table) {
                pending.delete(tableName);
                continue;
              }

              const next: Row[] = [];

              for (const row of pendingRows) {
                try {
                  const result = this.importRow(
                    runtime,
                    table,
                    row,
                    new Map(),
                  );

                  if (
                    result.created ||
                    result.updated ||
                    result.skipped
                  ) {
                    packageRows += 1;
                  }

                  progress = true;
                } catch (error) {
                  if (error instanceof UnresolvedForeignKeyError) {
                    next.push(row);
                    continue;
                  }
                  throw error;
                }
              }

              if (next.length === 0) {
                pending.delete(tableName);
              } else {
                pending.set(tableName, next);
              }
            }
          }

          if (pending.size > 0) {
            throw new Error(
              "Unable to resolve foreign keys while rebuilding " +
                item.runtime.manifest.packageKey,
            );
          }

          totalRows += packageRows;

          this.setSessionStatus(
            item.sessionId,
            "COMPLETED",
            {
              tables: tableInfos.size,
              rows: packageRows,
            },
          );
        }

        this.world.setMetadata("world_build_status", "VALID");
        this.world.setMetadata(
          "world_last_build_at",
          new Date().toISOString(),
        );
      });

      return {
        status: "COMPLETED",
        packages: packages.length,
        rows: totalRows,
        sessions: sessions.length,
        message:
          "World rebuilt from " +
          packages.length +
          " enabled package(s).",
      };
    } catch (error) {
      for (const item of sessions) {
        this.setSessionStatus(
          item.sessionId,
          "FAILED",
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
      this.world.setMetadata(
        "world_build_status",
        "INVALID",
      );
      throw error;
    } finally {
      for (const runtime of runtimes) {
        this.detach(runtime.alias);
      }
    }
  }

  getSession(id: number): ImportSessionRecord | undefined {
    const row = this.world.connection
      .prepare(
        `SELECT
          s.id,
          s.status,
          s.package_id AS packageId,
          p.package_key AS packageKey,
          s.source_file AS sourceFile,
          s.source_sha256 AS sourceSha256,
          s.started_at AS startedAt,
          s.completed_at AS completedAt,
          s.error_message AS errorMessage,
          s.summary_json AS summaryJson
        FROM world_import_session s
        JOIN world_package p ON p.id=s.package_id
        WHERE s.id=?
        LIMIT 1`,
      )
      .get(id) as Record<string, unknown> | undefined;

    if (!row) return undefined;

    return {
      id: Number(row.id),
      status: String(row.status),
      packageId: Number(row.packageId),
      packageKey: String(row.packageKey),
      sourceFile: String(row.sourceFile),
      sourceSha256: String(row.sourceSha256),
      startedAt: String(row.startedAt),
      completedAt:
        row.completedAt == null
          ? null
          : String(row.completedAt),
      errorMessage:
        row.errorMessage == null
          ? null
          : String(row.errorMessage),
      summary: JSON.parse(
        String(row.summaryJson ?? "{}"),
      ) as Record<string, unknown>,
    };
  }

  listConflicts(sessionId: number): ImportConflictRecord[] {
    return (
      this.world.connection
        .prepare(
          `SELECT
            id,
            package_id AS packageId,
            table_name AS tableName,
            incoming_key AS incomingKey,
            incoming_id AS incomingId,
            world_key AS worldKey,
            world_id AS worldId,
            conflict_type AS conflictType,
            column_name AS columnName,
            existing_value AS existingValue,
            incoming_value AS incomingValue,
            resolution,
            resolved
          FROM world_import_conflict
          WHERE import_session_id=?
          ORDER BY id`,
        )
        .all(sessionId) as Array<Record<string, unknown>>
    ).map(row => ({
      id: Number(row.id),
      packageId: Number(row.packageId),
      tableName: String(row.tableName),
      incomingKey: String(row.incomingKey),
      incomingId:
        row.incomingId == null
          ? null
          : Number(row.incomingId),
      worldKey:
        row.worldKey == null
          ? null
          : String(row.worldKey),
      worldId:
        row.worldId == null
          ? null
          : Number(row.worldId),
      conflictType: String(row.conflictType),
      columnName:
        row.columnName == null
          ? null
          : String(row.columnName),
      existingValue:
        row.existingValue == null
          ? null
          : String(row.existingValue),
      incomingValue:
        row.incomingValue == null
          ? null
          : String(row.incomingValue),
      resolution: String(row.resolution) as ConflictPolicy,
      resolved: Number(row.resolved ?? 0) === 1,
    }));
  }

  private buildResolutionMap(
    conflicts: ImportConflictRecord[],
    resolutions: Record<string, ConflictPolicy>,
  ): Map<string, ConflictPolicy> {
    const result = new Map<string, ConflictPolicy>();

    for (const conflict of conflicts) {
      const byId = resolutions[String(conflict.id)];
      const byKey =
        resolutions[
          conflict.tableName +
            ":" +
            conflict.incomingKey +
            ":" +
            (conflict.columnName ?? "*")
        ];

      if (byId) result.set(String(conflict.id), byId);
      else if (byKey) {
        result.set(String(conflict.id), byKey);
      }
    }

    return result;
  }

  private importRow(
    runtime: ImportRuntime,
    table: TableInfo,
    row: Row,
    explicitResolution: Map<string, ConflictPolicy>,
  ): { created: boolean; updated: boolean; skipped: boolean } {
    const context = this.createIdentityContext(
      runtime.alias,
      runtime.tableInfos,
    );
    const incomingKey = serializeKey(table, row);

    const resolved = this.resolveExisting(
      table,
      row,
      context,
      runtime.mapping,
      runtime.packageId,
      incomingKey,
    );

    if (resolved.conflict?.type === "IDENTITY") {
      const sessionConflict = this.findSessionConflict(
        runtime.sessionId,
        table,
        incomingKey,
        resolved.conflict.column,
      );

      const identityPolicyValue =
        (sessionConflict
          ? explicitResolution.get(
              String(sessionConflict.id),
            )
          : undefined) ?? "MANUAL";

      if (identityPolicyValue === "MANUAL") {
        throw new Error(
          "Manual identity resolution required for " +
            table.name +
            " " +
            incomingKey,
        );
      }

      if (
        resolved.worldKey &&
        identityPolicyValue === "KEEP_EXISTING"
      ) {
        runtime.mapping.set(
          mapKey(table.name, incomingKey),
          resolved.worldKey,
        );
        this.recordProvenance(
          runtime,
          table,
          resolved.worldKey,
          row,
          "KEEP_EXISTING",
          new Set(),
        );
        this.recordIdMap(
          runtime,
          table,
          row,
          incomingKey,
          resolved.worldKey,
          "KEEP_EXISTING",
        );
        this.resolveSessionConflict(
          sessionConflict?.id ?? null,
          "KEEP_EXISTING",
        );
        return {
          created: false,
          updated: false,
          skipped: true,
        };
      }
    }

    const translated = this.buildTranslatedRow(
      runtime,
      table,
      row,
    );

    let worldKey = resolved.worldKey;

    if (!worldKey) {
      worldKey = this.findExistingByUnique(
        table,
        translated,
      );
    }

    if (!worldKey) {
      const values = this.prepareInsertValues(
        table,
        translated,
        row,
      );
      worldKey = this.insertRow(table, values);

      runtime.mapping.set(
        mapKey(table.name, incomingKey),
        worldKey,
      );

      this.persistIdentity(
        table,
        worldKey,
        row,
        runtime,
      );

      this.recordProvenance(
        runtime,
        table,
        worldKey,
        row,
        "CREATED",
        new Set(Object.keys(values)),
      );

      this.recordIdMap(
        runtime,
        table,
        row,
        incomingKey,
        worldKey,
        "CREATED",
      );

      return {
        created: true,
        updated: false,
        skipped: false,
      };
    }

    runtime.mapping.set(
      mapKey(table.name, incomingKey),
      worldKey,
    );

    const changes = this.findRowChanges(
      table,
      worldKey,
      translated,
    );

    if (changes.length === 0) {
      this.persistIdentity(
        table,
        worldKey,
        row,
        runtime,
      );
      this.recordProvenance(
        runtime,
        table,
        worldKey,
        row,
        "EXISTING",
        new Set(),
      );
      this.recordIdMap(
        runtime,
        table,
        row,
        incomingKey,
        worldKey,
        "EXISTING",
      );
      return {
        created: false,
        updated: false,
        skipped: true,
      };
    }

    const winningColumns = new Set<string>();
    let updated = false;

    for (const change of changes) {
      const sessionConflict = this.findSessionConflict(
        runtime.sessionId,
        table,
        incomingKey,
        change.column,
      );

      const policy =
        (sessionConflict
          ? explicitResolution.get(
              String(sessionConflict.id),
            )
          : undefined) ??
        this.defaultConflictPolicy(
          table,
          worldKey,
          change.column,
          runtime.packageId,
          runtime.packagePriority,
        );

      if (policy === "MANUAL") {
        throw new Error(
          "Manual conflict resolution required for " +
            table.name +
            " " +
            incomingKey +
            " column " +
            change.column,
        );
      }

      if (policy === "KEEP_EXISTING") {
        this.resolveSessionConflict(
          sessionConflict?.id ?? null,
          "KEEP_EXISTING",
        );
        continue;
      }

      if (
        policy === "MERGE" &&
        change.existingValue != null &&
        change.existingValue !== ""
      ) {
        this.resolveSessionConflict(
          sessionConflict?.id ?? null,
          "KEEP_EXISTING",
        );
        continue;
      }

      winningColumns.add(change.column);
      updated = true;

      this.resolveSessionConflict(
        sessionConflict?.id ?? null,
        policy,
      );
    }

    if (winningColumns.size > 0) {
      const values: Record<string, unknown> = {};

      for (const column of winningColumns) {
        values[column] =
          translated[column] ?? null;
      }

      this.updateRow(
        table,
        worldKey,
        values,
      );

      this.persistProvenanceColumns(
        runtime,
        table,
        worldKey,
        row,
        values,
        "REPLACE",
      );
    } else {
      this.recordProvenance(
        runtime,
        table,
        worldKey,
        row,
        "KEEP_EXISTING",
        new Set(),
      );
    }

    this.recordIdMap(
      runtime,
      table,
      row,
      incomingKey,
      worldKey,
      updated ? "UPDATED" : "EXISTING",
    );

    return {
      created: false,
      updated,
      skipped: !updated,
    };
  }

  private resolveExisting(
    table: TableInfo,
    row: Row,
    context: IdentityContext,
    mapping: Map<string, KeyObject>,
    packageId: number,
    incomingKey: string,
  ): {
    worldKey: KeyObject | null;
    worldId: number | null;
    naturalKey: string | null;
    conflict?: {
      type: "IDENTITY";
      column: string;
      existingValue: string | null;
      incomingValue: string | null;
    };
  } {
    const policy = identityPolicy(table.name);

    if (policy) {
      const uuidValue =
        policy.uuidColumn &&
        row[policy.uuidColumn] != null
          ? String(row[policy.uuidColumn])
          : null;

      const naturalKey = safeNaturalKey(
        policy,
        row,
        context,
      );

      let uuidWorldKey: KeyObject | null = null;
      if (uuidValue) {
        const identity = this.world.connection
          .prepare(
            "SELECT table_name,row_id FROM world_entity_identity WHERE entity_uuid=?",
          )
          .get(uuidValue) as
          | { table_name: string; row_id: number }
          | undefined;

        if (identity && identity.table_name === table.name) {
          uuidWorldKey = {
            [table.primaryKey[0]]:
              identity.row_id,
          };
        }
      }

      let naturalWorldKey: KeyObject | null = null;
      if (naturalKey) {
        const identity = this.world.connection
          .prepare(
            "SELECT row_id FROM world_entity_identity WHERE table_name=? AND natural_key=?",
          )
          .get(table.name, naturalKey) as
          | { row_id: number }
          | undefined;

        if (identity) {
          naturalWorldKey = {
            [table.primaryKey[0]]:
              identity.row_id,
          };
        }
      }

      if (
        uuidWorldKey &&
        naturalWorldKey &&
        serializeKey(table, uuidWorldKey) !==
          serializeKey(table, naturalWorldKey)
      ) {
        return {
          worldKey: uuidWorldKey,
          worldId: toNumberOrNull(
            uuidWorldKey[table.primaryKey[0]],
          ),
          naturalKey,
          conflict: {
            type: "IDENTITY",
            column: "uuid",
            existingValue:
              String(
                naturalWorldKey[
                  table.primaryKey[0]
                ] ?? "",
              ),
            incomingValue: uuidValue,
          },
        };
      }

      const worldKey =
        uuidWorldKey ?? naturalWorldKey;

      if (worldKey) {
        return {
          worldKey,
          worldId: toNumberOrNull(
            worldKey[table.primaryKey[0]],
          ),
          naturalKey,
        };
      }
    }

    const previous = this.previousImportMapping(
      packageId,
      table.name,
      incomingKey,
    );

    if (previous) {
      const existing = this.findRowByKey(
        table,
        previous,
      );
      if (existing) {
        return {
          worldKey: previous,
          worldId: toNumberOrNull(
            previous[table.primaryKey[0]],
          ),
          naturalKey: null,
        };
      }
    }

    return {
      worldKey: null,
      worldId: null,
      naturalKey: null,
    };
  }

  private defaultConflictPolicy(
    table: TableInfo,
    worldKey: KeyObject,
    column: string,
    _packageId: number,
    incomingPriority: number,
  ): ConflictPolicy {
    if (EVENT_TABLES.has(table.name)) {
      return "KEEP_EXISTING";
    }

    if (table.primaryKey.length > 1) {
      return "MERGE";
    }

    const owner = this.world.connection
      .prepare(
        `SELECT p.priority
         FROM world_attribute_provenance a
         JOIN world_package p ON p.id=a.package_id
         WHERE a.table_name=?
           AND a.row_key=?
           AND a.column_name=?
           AND a.is_current=1
         LIMIT 1`,
      )
      .get(
        table.name,
        serializeKey(table, worldKey),
        column,
      ) as { priority?: number } | undefined;

    const existingPriority = Number(
      owner?.priority ?? -1,
    );

    return incomingPriority >= existingPriority
      ? "KEEP_INCOMING"
      : "KEEP_EXISTING";
  }

  private buildTranslatedRow(
    runtime: ImportRuntime,
    table: TableInfo,
    row: Row,
  ): Record<string, unknown> {
    const translated: Record<string, unknown> = {};

    for (const column of table.columns) {
      if (column.name in row) {
        translated[column.name] =
          row[column.name];
      }
    }

    for (const group of groupForeignKeys(
      table.foreignKeys,
    )) {
      const targetInfo =
        runtime.tableInfos.get(group[0].table) ??
        infoToTableInfo(
          this.world.tableSchema(group[0].table),
        );

      const incomingTargetKey: KeyObject = {};
      for (const fk of group) {
        const targetColumn =
          fk.to ||
          targetInfo.primaryKey[fk.sequence];
        incomingTargetKey[targetColumn] =
          row[fk.from];
      }

      if (
        Object.values(incomingTargetKey).every(
          value => value == null,
        )
      ) {
        for (const fk of group) {
          translated[fk.from] = null;
        }
        continue;
      }

      const targetMapped =
        runtime.mapping.get(
          mapKey(
            group[0].table,
            serializeKey(
              targetInfo,
              incomingTargetKey,
            ),
          ),
        );

      if (!targetMapped) {
        throw new UnresolvedForeignKeyError(
          table.name,
          group[0].from,
          group[0].table,
          serializeKey(
            targetInfo,
            incomingTargetKey,
          ),
        );
      }

      for (const fk of group) {
        const targetColumn =
          fk.to ||
          targetInfo.primaryKey[fk.sequence];

        translated[fk.from] =
          targetMapped[targetColumn];
      }
    }

    return translated;
  }

  private tryBuildTranslatedRow(
    table: TableInfo,
    row: Row,
    mapping: Map<string, KeyObject>,
    tableInfos: Map<string, TableInfo>,
  ): Record<string, unknown> | null {
    const translated: Record<string, unknown> = {
      ...row,
    };

    try {
      for (const group of groupForeignKeys(
        table.foreignKeys,
      )) {
        const targetInfo =
          tableInfos.get(group[0].table) ??
          infoToTableInfo(
            this.world.tableSchema(group[0].table),
          );

        const incomingTargetKey: KeyObject = {};
        for (const fk of group) {
          incomingTargetKey[
            fk.to ||
              targetInfo.primaryKey[fk.sequence]
          ] = row[fk.from];
        }

        if (
          Object.values(incomingTargetKey).every(
            value => value == null,
          )
        ) {
          for (const fk of group) {
            translated[fk.from] = null;
          }
          continue;
        }

        const mapped = mapping.get(
          mapKey(
            group[0].table,
            serializeKey(
              targetInfo,
              incomingTargetKey,
            ),
          ),
        );

        if (!mapped) return null;

        for (const fk of group) {
          translated[fk.from] =
            mapped[
              fk.to ||
                targetInfo.primaryKey[
                  fk.sequence
                ]
            ];
        }
      }

      return translated;
    } catch {
      return null;
    }
  }

  private prepareInsertValues(
    table: TableInfo,
    translated: Record<string, unknown>,
    incoming: Row,
  ): Record<string, unknown> {
    const values: Record<string, unknown> = {};

    for (const column of table.columns) {
      if (!(column.name in translated)) {
        continue;
      }

      if (
        column.primaryKeyOrder > 0 &&
        table.rowIdPrimaryKey
      ) {
        continue;
      }

      values[column.name] =
        translated[column.name];
    }

    const policy = identityPolicy(table.name);
    if (policy?.uuidColumn) {
      const uuidColumn = policy.uuidColumn;
      if (
        values[uuidColumn] == null ||
        String(values[uuidColumn]).trim() === ""
      ) {
        values[uuidColumn] =
          incoming[uuidColumn] == null
            ? generateUuid()
            : String(incoming[uuidColumn]);
      }
    }

    return values;
  }

  private insertRow(
    table: TableInfo,
    values: Record<string, unknown>,
  ): KeyObject {
    const columns = Object.keys(values);
    if (columns.length === 0) {
      throw new Error(
        "Cannot insert an empty row into " +
          table.name,
      );
    }

    const statement =
      "INSERT INTO " +
      quoteIdentifier(table.name) +
      " (" +
      columns
        .map(quoteIdentifier)
        .join(", ") +
      ") VALUES (" +
      columns.map(() => "?").join(", ") +
      ")";

    const result = this.world.connection
      .prepare(statement)
      .run(
        ...columns.map(
          column => values[column] ?? null,
        ),
      );

    if (table.rowIdPrimaryKey) {
      return {
        [table.primaryKey[0]]:
          Number(result.lastInsertRowid),
      };
    }

    const primaryKeyValues: KeyObject = {};
    for (const column of table.primaryKey) {
      primaryKeyValues[column] =
        values[column];
    }

    if (
      Object.values(primaryKeyValues).some(
        value => value === undefined,
      )
    ) {
      const row = this.world.connection
        .prepare(
          "SELECT * FROM " +
            quoteIdentifier(table.name) +
            " WHERE rowid=last_insert_rowid() LIMIT 1",
        )
        .get() as Row | undefined;

      if (!row) {
        throw new Error(
          "Inserted row could not be resolved: " +
            table.name,
        );
      }

      return pickKey(table, row);
    }

    return primaryKeyValues;
  }

  private updateRow(
    table: TableInfo,
    worldKey: KeyObject,
    values: Record<string, unknown>,
  ): void {
    const writable = Object.keys(values).filter(
      column =>
        !table.primaryKey.includes(column),
    );

    if (writable.length === 0) return;

    const setSql = writable
      .map(
        column =>
          quoteIdentifier(column) + "=?",
      )
      .join(", ");

    const whereSql = table.primaryKey
      .map(
        column =>
          quoteIdentifier(column) + "=?",
      )
      .join(" AND ");

    this.world.connection
      .prepare(
        "UPDATE " +
          quoteIdentifier(table.name) +
          " SET " +
          setSql +
          " WHERE " +
          whereSql,
      )
      .run(
        ...writable.map(
          column => values[column] ?? null,
        ),
        ...table.primaryKey.map(
          column => worldKey[column],
        ),
      );
  }

  private findExistingByUnique(
    table: TableInfo,
    values: Record<string, unknown>,
  ): KeyObject | null {
    const candidates = [
      ...table.uniqueColumns,
      ...(table.primaryKey.length > 0 &&
      !table.rowIdPrimaryKey
        ? [table.primaryKey]
        : []),
    ];

    for (const columns of candidates) {
      if (
        columns.length === 0 ||
        columns.some(
          column =>
            values[column] === undefined ||
            values[column] === null,
        )
      ) {
        continue;
      }

      const where = columns
        .map(
          column =>
            quoteIdentifier(column) + "=?",
        )
        .join(" AND ");

      const row = this.world.connection
        .prepare(
          "SELECT * FROM " +
            quoteIdentifier(table.name) +
            " WHERE " +
            where +
            " LIMIT 1",
        )
        .get(
          ...columns.map(
            column => values[column],
          ),
        ) as Row | undefined;

      if (row) {
        return pickKey(table, row);
      }
    }

    return null;
  }

  private findRowByKey(
    table: TableInfo,
    worldKey: KeyObject,
  ): Row | undefined {
    if (table.primaryKey.length === 0) {
      return undefined;
    }

    const where = table.primaryKey
      .map(
        column =>
          quoteIdentifier(column) + "=?",
      )
      .join(" AND ");

    return this.world.connection
      .prepare(
        "SELECT * FROM " +
          quoteIdentifier(table.name) +
          " WHERE " +
          where +
          " LIMIT 1",
      )
      .get(
        ...table.primaryKey.map(
          column => worldKey[column],
        ),
      ) as Row | undefined;
  }

  private findRowChanges(
    table: TableInfo,
    worldKey: KeyObject,
    incoming: Record<string, unknown>,
  ): Array<{
    column: string;
    existingValue: unknown;
    incomingValue: unknown;
  }> {
    const current = this.findRowByKey(
      table,
      worldKey,
    );

    if (!current) return [];

    const changes: Array<{
      column: string;
      existingValue: unknown;
      incomingValue: unknown;
    }> = [];

    for (const column of table.columns) {
      if (
        table.primaryKey.includes(
          column.name,
        ) ||
        !(column.name in incoming)
      ) {
        continue;
      }

      if (
        normalizeComparable(
          current[column.name],
        ) !==
        normalizeComparable(
          incoming[column.name],
        )
      ) {
        changes.push({
          column: column.name,
          existingValue:
            current[column.name],
          incomingValue:
            incoming[column.name],
        });
      }
    }

    return changes;
  }

  private persistIdentity(
    table: TableInfo,
    worldKey: KeyObject,
    incomingRow: Row,
    runtime: ImportRuntime,
  ): void {
    const policy = identityPolicy(table.name);
    if (!policy) return;

    const context = this.createIdentityContext(
      runtime.alias,
      runtime.tableInfos,
    );

    const naturalKey = safeNaturalKey(
      policy,
      incomingRow,
      context,
    );

    let uuid: string | null = null;
    if (policy.uuidColumn) {
      const row = this.findRowByKey(
        table,
        worldKey,
      );

      uuid =
        incomingRow[policy.uuidColumn] !=
          null &&
        String(
          incomingRow[policy.uuidColumn],
        ).trim() !== ""
          ? String(
              incomingRow[
                policy.uuidColumn
              ],
            )
          : row?.[policy.uuidColumn] !=
                  null
            ? String(row[policy.uuidColumn])
            : generateUuid();

      const setSql =
        "UPDATE " +
        quoteIdentifier(table.name) +
        " SET " +
        quoteIdentifier(policy.uuidColumn) +
        "=? WHERE " +
        table.primaryKey
          .map(
            column =>
              quoteIdentifier(column) +
              "=?",
          )
          .join(" AND ");

      this.world.connection
        .prepare(setSql)
        .run(
          uuid,
          ...table.primaryKey.map(
            column =>
              worldKey[column],
          ),
        );
    }

    this.world.connection
      .prepare(
        `INSERT OR REPLACE INTO world_entity_identity(
          table_name,row_id,entity_uuid,natural_key
        ) VALUES(?,?,?,?)`,
      )
      .run(
        table.name,
        Number(
          worldKey[
            table.primaryKey[0]
          ],
        ),
        uuid,
        naturalKey,
      );
  }

  private bootstrapWorldIdentities(): void {
    const context: IdentityContext = {
      token: (tableName, keyObject) => {
        if (!this.world.tableExists(tableName)) {
          return null;
        }

        const table = infoToTableInfo(
          this.world.tableSchema(tableName),
        );
        const row = this.findRowByKey(
          table,
          keyObject,
        );

        if (!row) return null;

        const policy = identityPolicy(tableName);

        if (
          policy?.uuidColumn &&
          row[policy.uuidColumn]
        ) {
          return (
            "uuid:" +
            String(row[policy.uuidColumn])
          );
        }

        if (policy) {
          const naturalKey = safeNaturalKey(
            policy,
            row,
            context,
          );
          if (naturalKey) {
            return "natural:" + naturalKey;
          }
        }

        return (
          "pk:" +
          serializeKey(table, pickKey(table, row))
        );
      },
    };

    for (const tableName of this.world.listTables()) {
      const policy = identityPolicy(
        tableName,
      );
      if (!policy) continue;

      const table = infoToTableInfo(
        this.world.tableSchema(tableName),
      );

      for (const row of this.world.connection
        .prepare(
          "SELECT * FROM " +
            quoteIdentifier(table.name),
        )
        .iterate() as Iterable<Row>) {
        const worldKey = pickKey(
          table,
          row,
        );

        let uuid: string | null = null;
        if (policy.uuidColumn) {
          uuid =
            row[policy.uuidColumn] !=
              null &&
            String(
              row[policy.uuidColumn],
            ).trim() !== ""
              ? String(
                  row[policy.uuidColumn],
                )
              : generateUuid();

          this.world.connection
            .prepare(
              "UPDATE " +
                quoteIdentifier(table.name) +
                " SET " +
                quoteIdentifier(
                  policy.uuidColumn,
                ) +
                "=? WHERE " +
                table.primaryKey
                  .map(
                    column =>
                      quoteIdentifier(
                        column,
                      ) + "=?",
                  )
                  .join(" AND "),
            )
            .run(
              uuid,
              ...table.primaryKey.map(
                column =>
                  worldKey[column],
              ),
            );
        }

        const naturalKey = safeNaturalKey(
          policy,
          row,
          context,
        );

        this.world.connection
          .prepare(
            `INSERT OR IGNORE INTO world_entity_identity(
              table_name,row_id,entity_uuid,natural_key
            ) VALUES(?,?,?,?)`,
          )
          .run(
            table.name,
            Number(
              worldKey[
                table.primaryKey[0]
              ],
            ),
            uuid,
            naturalKey,
          );
      }
    }
  }

  private recordProvenance(
    runtime: ImportRuntime,
    table: TableInfo,
    worldKey: KeyObject,
    incoming: Row,
    resolution: string,
    winningColumns: Set<string>,
  ): void {
    const now = new Date().toISOString();
    const rowKey = serializeKey(
      table,
      worldKey,
    );

    this.world.connection
      .prepare(
        `INSERT OR REPLACE INTO world_entity_provenance(
          table_name,row_key,package_id,resolution,imported_at
        ) VALUES(?,?,?,?,?)`,
      )
      .run(
        table.name,
        rowKey,
        runtime.packageId,
        resolution,
        now,
      );

    for (const [column, value] of Object.entries(
      incoming,
    )) {
      if (
        column === "id" &&
        table.rowIdPrimaryKey
      ) {
        continue;
      }

      this.recordAttributeProvenance(
        table,
        rowKey,
        column,
        runtime.packageId,
        value,
        winningColumns.has(column),
        resolution,
        now,
      );
    }
  }

  private persistProvenanceColumns(
    runtime: ImportRuntime,
    table: TableInfo,
    worldKey: KeyObject,
    incoming: Row,
    values: Record<string, unknown>,
    resolution: string,
  ): void {
    const now = new Date().toISOString();
    const rowKey = serializeKey(
      table,
      worldKey,
    );

    for (const column of Object.keys(values)) {
      this.recordAttributeProvenance(
        table,
        rowKey,
        column,
        runtime.packageId,
        incoming[column],
        true,
        resolution,
        now,
      );
    }
  }

  private recordAttributeProvenance(
    table: TableInfo,
    rowKey: string,
    column: string,
    packageId: number,
    value: unknown,
    current: boolean,
    resolution: string,
    now: string,
  ): void {
    if (current) {
      this.world.connection
        .prepare(
          `UPDATE world_attribute_provenance
           SET is_current=0
           WHERE table_name=?
             AND row_key=?
             AND column_name=?`,
        )
        .run(
          table.name,
          rowKey,
          column,
        );
    }

    this.world.connection
      .prepare(
        `INSERT OR REPLACE INTO world_attribute_provenance(
          table_name,row_key,column_name,package_id,
          value_hash,resolution,is_current,updated_at
        ) VALUES(?,?,?,?,?,?,?,?)`,
      )
      .run(
        table.name,
        rowKey,
        column,
        packageId,
        sha256Value(value),
        resolution,
        current ? 1 : 0,
        now,
      );
  }

  private recordIdMap(
    runtime: ImportRuntime,
    table: TableInfo,
    row: Row,
    incomingKey: string,
    worldKey: KeyObject,
    resolution: string,
  ): void {
    const worldId =
      table.primaryKey.length === 1
        ? toNumberOrNull(
            worldKey[
              table.primaryKey[0]
            ],
          )
        : null;

    const context = this.createIdentityContext(
      runtime.alias,
      runtime.tableInfos,
    );

    this.world.connection
      .prepare(
        `INSERT OR REPLACE INTO world_import_id_map(
          import_session_id,table_name,incoming_key,incoming_id,
          incoming_uuid,world_key,world_id,resolution,natural_key
        ) VALUES(?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        runtime.sessionId,
        table.name,
        incomingKey,
        table.primaryKey.length === 1
          ? toNumberOrNull(
              row[
                table.primaryKey[0]
              ],
            )
          : null,
        row.uuid == null
          ? null
          : String(row.uuid),
        serializeKey(
          table,
          worldKey,
        ),
        worldId,
        resolution,
        safeNaturalKey(
          identityPolicy(table.name),
          row,
          context,
        ),
      );
  }

  private recordConflict(
    sessionId: number,
    packageId: number,
    table: TableInfo,
    row: Row,
    worldKey: KeyObject | null,
    worldId: number | null,
    conflictType: string,
    column: string | null,
    existingValue: unknown,
    incomingValue: unknown,
  ): void {
    this.world.connection
      .prepare(
        `INSERT INTO world_import_conflict(
          import_session_id,package_id,table_name,incoming_key,
          incoming_id,world_key,world_id,conflict_type,column_name,
          existing_value,incoming_value,resolution,resolved
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0)`,
      )
      .run(
        sessionId,
        packageId,
        table.name,
        serializeKey(table, row),
        table.primaryKey.length === 1
          ? toNumberOrNull(
              row[table.primaryKey[0]],
            )
          : null,
        worldKey
          ? serializeKey(table, worldKey)
          : null,
        worldId,
        conflictType,
        column,
        existingValue == null
          ? null
          : String(existingValue),
        incomingValue == null
          ? null
          : String(incomingValue),
        "MANUAL",
      );
  }

  private resolveSessionConflict(
    id: number | null,
    resolution: ConflictPolicy,
  ): void {
    if (id == null) return;

    this.world.connection
      .prepare(
        "UPDATE world_import_conflict SET resolution=?,resolved=1 WHERE id=?",
      )
      .run(resolution, id);
  }

  private findSessionConflict(
    sessionId: number,
    table: TableInfo,
    incomingKey: string,
    column: string | null,
  ): ImportConflictRecord | null {
    return (
      this.listConflicts(sessionId).find(
        conflict =>
          conflict.tableName ===
            table.name &&
          conflict.incomingKey ===
            incomingKey &&
          conflict.columnName ===
            column &&
          !conflict.resolved,
      ) ?? null
    );
  }

  private previousImportMapping(
    packageId: number,
    tableName: string,
    incomingKey: string,
  ): KeyObject | null {
    const row = this.world.connection
      .prepare(
        `SELECT m.world_key AS worldKey
         FROM world_import_id_map m
         JOIN world_import_session s
           ON s.id=m.import_session_id
         WHERE s.package_id=?
           AND m.table_name=?
           AND m.incoming_key=?
           AND s.status='COMPLETED'
           AND m.world_key IS NOT NULL
         ORDER BY s.id DESC
         LIMIT 1`,
      )
      .get(
        packageId,
        tableName,
        incomingKey,
      ) as { worldKey: string } | undefined;

    if (!row?.worldKey) return null;

    try {
      return JSON.parse(row.worldKey) as KeyObject;
    } catch {
      return null;
    }
  }

  private listEnabledPackages(): PackageRuntime[] {
    const rows = this.world.connection
      .prepare(
        `SELECT
          p.id,
          p.package_key AS packageKey,
          p.name,
          p.version,
          p.package_type AS packageType,
          p.priority,
          p.source_file AS sourceFile,
          p.source_sha256 AS sourceSha256,
          p.schema_version AS schemaVersion,
          COALESCE(o.load_order,p.id) AS loadOrder
        FROM world_package p
        LEFT JOIN world_package_load_order o
          ON o.package_id=p.id
        WHERE p.enabled=1
        ORDER BY COALESCE(o.load_order,p.id),p.id`,
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map(row => {
      const packageId = Number(row.id);
      return {
        id: packageId,
        manifest: this.packageManifestFromRegistry(
          packageId,
          {
            packageKey: String(row.packageKey),
            name: String(row.name),
            version: String(row.version),
            packageType: String(
              row.packageType ?? "CONTENT",
            ),
            priority: Number(
              row.priority ?? 100,
            ),
            schemaVersion: Number(
              row.schemaVersion ?? 0,
            ),
          },
        ),
        sourceFile:
          row.sourceFile == null
            ? ""
            : path.resolve(
                String(row.sourceFile),
              ),
        sourceSha256: String(
          row.sourceSha256 ?? "",
        ),
        loadOrder: Number(row.loadOrder),
        priority: Number(
          row.priority ?? 100,
        ),
        alias: "",
      };
    });
  }

  private packageManifestFromRegistry(
    packageId: number,
    base: PackageManifest,
  ): PackageManifest {
    const provides = (
      this.world.connection
        .prepare(
          "SELECT provide_key AS value FROM world_package_provides WHERE package_id=? ORDER BY provide_key",
        )
        .all(packageId) as Array<{
        value: string;
      }>
    ).map(row => row.value);

    const dependencies = (
      this.world.connection
        .prepare(
          "SELECT dependency_key AS key,min_version AS minVersion FROM world_package_dependency WHERE package_id=? ORDER BY dependency_key",
        )
        .all(packageId) as Array<{
        key: string;
        minVersion: string | null;
      }>
    ).map(row => ({
      key: row.key,
      minVersion: row.minVersion,
    }));

    const conflicts = (
      this.world.connection
        .prepare(
          "SELECT conflict_key AS value FROM world_package_conflict WHERE package_id=? ORDER BY conflict_key",
        )
        .all(packageId) as Array<{
        value: string;
      }>
    ).map(row => row.value);

    return {
      ...base,
      provides,
      dependencies,
      conflicts,
    };
  }

  private ensurePackage(
    manifest: PackageManifest,
    sourceFile: string,
    sourceSha256: string,
  ): number {
    const now = new Date().toISOString();
    const existing = this.world.connection
      .prepare(
        "SELECT id FROM world_package WHERE package_key=?",
      )
      .get(manifest.packageKey) as
      | { id: number }
      | undefined;

    let packageId: number;

    if (existing) {
      packageId = existing.id;

      this.world.connection
        .prepare(
          `UPDATE world_package
           SET name=?,version=?,package_type=?,priority=?,
               source_file=?,source_sha256=?,categories_json=?,
               description=?,schema_version=?,updated_at=?
           WHERE id=?`,
        )
        .run(
          manifest.name,
          manifest.version,
          manifest.packageType ??
            "CONTENT",
          manifest.priority ?? 100,
          sourceFile,
          sourceSha256,
          JSON.stringify(
            manifest.categories ?? [],
          ),
          manifest.description ?? null,
          manifest.schemaVersion,
          now,
          packageId,
        );
    } else {
      const nextOrder = Number(
        (
          this.world.connection
            .prepare(
              "SELECT COALESCE(MAX(load_order),0)+1 AS value FROM world_package_load_order",
            )
            .get() as { value: number }
        ).value,
      );

      const result = this.world.connection
        .prepare(
          `INSERT INTO world_package(
            package_key,name,version,package_type,priority,status,
            source_file,source_sha256,categories_json,description,
            schema_version,imported_at,installed_at,updated_at,enabled
          ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
        )
        .run(
          manifest.packageKey,
          manifest.name,
          manifest.version,
          manifest.packageType ??
            "CONTENT",
          manifest.priority ?? 100,
          "ACTIVE",
          sourceFile,
          sourceSha256,
          JSON.stringify(
            manifest.categories ?? [],
          ),
          manifest.description ?? null,
          manifest.schemaVersion,
          now,
          now,
          now,
        );

      packageId = Number(
        result.lastInsertRowid,
      );

      this.world.connection
        .prepare(
          "INSERT INTO world_package_load_order(package_id,load_order) VALUES(?,?)",
        )
        .run(
          packageId,
          nextOrder,
        );
    }

    this.replacePackageCapabilities(
      packageId,
      manifest,
    );

    this.setBuildDirty();
    return packageId;
  }

  private replacePackageCapabilities(
    packageId: number,
    manifest: PackageManifest,
  ): void {
    this.world.connection
      .prepare(
        "DELETE FROM world_package_provides WHERE package_id=?",
      )
      .run(packageId);

    for (const provide of manifest.provides ?? []) {
      this.world.connection
        .prepare(
          "INSERT INTO world_package_provides(package_id,provide_key) VALUES(?,?)",
        )
        .run(packageId, provide);
    }

    this.world.connection
      .prepare(
        "DELETE FROM world_package_dependency WHERE package_id=?",
      )
      .run(packageId);

    for (const dependency of manifest.dependencies ?? []) {
      this.world.connection
        .prepare(
          "INSERT INTO world_package_dependency(package_id,dependency_key,min_version) VALUES(?,?,?)",
        )
        .run(
          packageId,
          dependency.key,
          dependency.minVersion ?? null,
        );
    }

    this.world.connection
      .prepare(
        "DELETE FROM world_package_conflict WHERE package_id=?",
      )
      .run(packageId);

    for (const conflict of manifest.conflicts ?? []) {
      this.world.connection
        .prepare(
          "INSERT INTO world_package_conflict(package_id,conflict_key) VALUES(?,?)",
        )
        .run(packageId, conflict);
    }
  }

  private createSession(
    packageId: number,
    sourceFile: string,
    sourceSha256: string,
  ): number {
    const result = this.world.connection
      .prepare(
        `INSERT INTO world_import_session(
          status,package_id,source_file,source_sha256,started_at
        ) VALUES('CREATED',?,?,?,?)`,
      )
      .run(
        packageId,
        sourceFile,
        sourceSha256,
        new Date().toISOString(),
      );

    return Number(
      result.lastInsertRowid,
    );
  }

  private setSessionStatus(
    id: number,
    status: string,
    summary?: Record<string, unknown>,
    error?: string,
  ): void {
    const terminal =
      status === "COMPLETED" ||
      status === "FAILED";

    this.world.connection
      .prepare(
        "UPDATE world_import_session SET status=?,summary_json=?,error_message=?,completed_at=? WHERE id=?",
      )
      .run(
        status,
        JSON.stringify(summary ?? {}),
        error ?? null,
        terminal
          ? new Date().toISOString()
          : null,
        id,
      );
  }

  private validateManifest(
    manifest: PackageManifest,
  ): void {
    if (!manifest.packageKey?.trim()) {
      throw new Error(
        "Package manifest packageKey is required.",
      );
    }

    if (!manifest.name?.trim()) {
      throw new Error(
        "Package manifest name is required.",
      );
    }

    if (!manifest.version?.trim()) {
      throw new Error(
        "Package manifest version is required.",
      );
    }

    const worldSchema = Number(
      this.world.metadata("schema_version") ??
        0,
    );

    if (
      Number(manifest.schemaVersion) !==
      worldSchema
    ) {
      throw new Error(
        "Package schema v" +
          manifest.schemaVersion +
          " is incompatible with World schema v" +
          worldSchema +
          ".",
      );
    }

    const priority = Number(
      manifest.priority ?? 100,
    );
    if (!Number.isFinite(priority)) {
      throw new Error(
        "Package priority must be numeric.",
      );
    }

    const installed = this.world.connection
      .prepare(
        "SELECT id,package_key AS packageKey,version,enabled FROM world_package",
      )
      .all() as Array<{
      id: number;
      packageKey: string;
      version: string;
      enabled: number;
    }>;

    const ownId =
      installed.find(
        item =>
          item.packageKey ===
          manifest.packageKey,
      )?.id ?? null;

    for (const dependency of
      manifest.dependencies ?? []) {
      const candidate = installed.find(
        item =>
          item.enabled === 1 &&
          item.packageKey ===
            dependency.key,
      );

      if (!candidate) {
        const provider = this.world.connection
          .prepare(
            `SELECT 1
             FROM world_package_provides pr
             JOIN world_package p ON p.id=pr.package_id
             WHERE p.enabled=1
               AND pr.provide_key=?
             LIMIT 1`,
          )
          .get(dependency.key);

        if (!provider) {
          throw new Error(
            "Missing package dependency: " +
              dependency.key,
          );
        }
      } else if (
        dependency.minVersion &&
        compareVersions(
          candidate.version,
          dependency.minVersion,
        ) < 0
      ) {
        throw new Error(
          "Package " +
            manifest.packageKey +
            " requires " +
            dependency.key +
            " >= " +
            dependency.minVersion +
            ", but " +
            candidate.version +
            " is installed.",
        );
      }
    }

    for (const conflictKey of
      manifest.conflicts ?? []) {
      const conflict = this.world.connection
        .prepare(
          `SELECT 1
           FROM world_package p
           LEFT JOIN world_package_provides pr
             ON pr.package_id=p.id
           WHERE p.enabled=1
             AND p.id<>?
             AND (
               p.package_key=?
               OR pr.provide_key=?
             )
           LIMIT 1`,
        )
        .get(
          ownId ?? -1,
          conflictKey,
          conflictKey,
        );

      if (conflict) {
        throw new Error(
          "Package conflict detected: " +
            manifest.packageKey +
            " conflicts with " +
            conflictKey +
            ".",
        );
      }
    }

    for (const provide of
      manifest.provides ?? []) {
      const duplicateProvider =
        this.world.connection
          .prepare(
            `SELECT 1
             FROM world_package_provides pr
             JOIN world_package p ON p.id=pr.package_id
             WHERE p.enabled=1
               AND p.id<>?
               AND pr.provide_key=?
             LIMIT 1`,
          )
          .get(
            ownId ?? -1,
            provide,
          );

      if (duplicateProvider) {
        throw new Error(
          "Logical package scope already provided by another enabled package: " +
            provide,
        );
      }
    }
  }

  private validateCompatibleTables(
    tableInfos: Map<string, TableInfo>,
  ): void {
    for (const table of tableInfos.values()) {
      if (!this.world.tableExists(table.name)) {
        throw new Error(
          "Package table is not part of World schema: " +
            table.name,
        );
      }

      const worldSchema =
        this.world.tableSchema(
          table.name,
        );

      const worldColumns = new Set(
        worldSchema.columns.map(
          column => column.name,
        ),
      );

      for (const column of table.columns) {
        if (!worldColumns.has(column.name)) {
          throw new Error(
            "Package table " +
              table.name +
              " contains unsupported column: " +
              column.name,
          );
        }
      }

      const worldPk =
        worldSchema.primaryKey;
      if (
        worldPk.length !==
          table.primaryKey.length ||
        worldPk.some(
          (column, index) =>
            table.primaryKey[index] !==
            column,
        )
      ) {
        throw new Error(
          "Package primary key differs from World schema for table " +
            table.name +
            ".",
        );
      }
    }
  }

  private loadTableInfos(
    alias: string,
  ): Map<string, TableInfo> {
    const infos = new Map<string, TableInfo>();

    for (const table of this.listIncomingTables(
      alias,
    )) {
      infos.set(
        table.name,
        this.readTableInfo(
          alias,
          table.name,
        ),
      );
    }

    return infos;
  }

  private listIncomingTables(
    alias: string,
  ): Array<{ name: string }> {
    return (
      this.world.connection
        .prepare(
          "SELECT name " +
            "FROM " +
            quoteIdentifier(alias) +
            ".sqlite_master " +
            "WHERE type='table' " +
            "AND name NOT LIKE 'sqlite_%' " +
            "ORDER BY name",
        )
        .all() as Array<{
        name: string;
      }>
    ).filter(
      table =>
        !INTERNAL_TABLES.has(
          table.name,
        ),
    );
  }

  private readTableInfo(
    alias: string,
    tableName: string,
  ): TableInfo {
    const columns = this.world.connection
      .prepare(
        "PRAGMA " +
          quoteIdentifier(alias) +
          ".table_info(" +
          quoteIdentifier(tableName) +
          ")",
      )
      .all() as Array<{
      name: string;
      type: string;
      notnull: number;
      dflt_value: unknown;
      pk: number;
    }>;

    const foreignKeys =
      this.world.connection
        .prepare(
          "PRAGMA " +
            quoteIdentifier(alias) +
            ".foreign_key_list(" +
            quoteIdentifier(tableName) +
            ")",
        )
        .all() as Array<{
        id: number;
        seq: number;
        table: string;
        from: string;
        to: string;
      }>;

    const worldSchema =
      this.world.tableSchema(
        tableName,
      );

    return {
      name: tableName,
      columns: columns.map(
        column => ({
          name: column.name,
          type: column.type,
          notNull:
            column.notnull === 1,
          defaultValue:
            column.dflt_value,
          primaryKeyOrder:
            column.pk,
        }),
      ),
      primaryKey: columns
        .filter(column => column.pk > 0)
        .sort(
          (a, b) =>
            a.pk - b.pk,
        )
        .map(
          column =>
            column.name,
        ),
      foreignKeys:
        foreignKeys.map(
          fk => ({
            id: fk.id,
            sequence: fk.seq,
            table: fk.table,
            from: fk.from,
            to: fk.to,
          }),
        ),
      uniqueColumns:
        worldSchema.uniqueColumns,
      rowIdPrimaryKey:
        worldSchema.primaryKey.length ===
          1 &&
        worldSchema.columns.find(
          column =>
            column.name ===
            worldSchema.primaryKey[0],
        )?.type.toUpperCase() ===
          "INTEGER",
    };
  }

  private createIdentityContext(
    alias: string,
    tableInfos: Map<string, TableInfo>,
  ): IdentityContext {
    const cache = new Map<
      string,
      string | null
    >();
    const visiting = new Set<string>();

    const token = (
      tableName: string,
      keyObject: KeyObject,
    ): string | null => {
      const table =
        tableInfos.get(tableName);
      if (!table) return null;

      const rawKey = serializeKey(
        table,
        keyObject,
      );
      const cacheKey =
        tableName + ":" + rawKey;

      if (cache.has(cacheKey)) {
        return cache.get(cacheKey) ?? null;
      }

      if (visiting.has(cacheKey)) {
        return "pk:" + rawKey;
      }

      visiting.add(cacheKey);

      const row =
        this.findAttachedRow(
          alias,
          table,
          keyObject,
        );

      if (!row) {
        visiting.delete(cacheKey);
        return null;
      }

      const policy =
        identityPolicy(tableName);

      let result: string | null = null;

      if (
        policy?.uuidColumn &&
        row[policy.uuidColumn]
      ) {
        result =
          "uuid:" +
          String(
            row[
              policy.uuidColumn
            ],
          );
      } else if (policy) {
        const natural =
          safeNaturalKey(
            policy,
            row,
            { token },
          );

        result = natural
          ? "natural:" + natural
          : "pk:" + rawKey;
      } else {
        result = "pk:" + rawKey;
      }

      visiting.delete(cacheKey);
      cache.set(
        cacheKey,
        result,
      );
      return result;
    };

    return { token };
  }

  private findAttachedRow(
    alias: string,
    table: TableInfo,
    keyObject: KeyObject,
  ): Row | undefined {
    if (
      table.primaryKey.length === 0
    ) {
      return undefined;
    }

    const where = table.primaryKey
      .map(
        column =>
          quoteIdentifier(column) +
          "=?",
      )
      .join(" AND ");

    return this.world.connection
      .prepare(
        "SELECT * FROM " +
          quoteIdentifier(alias) +
          "." +
          quoteIdentifier(table.name) +
          " WHERE " +
          where +
          " LIMIT 1",
      )
      .get(
        ...table.primaryKey.map(
          column =>
            keyObject[column],
        ),
      ) as Row | undefined;
  }

  private orderTables(
    tableInfos: Map<string, TableInfo>,
  ): TableInfo[] {
    const tables =
      Array.from(
        tableInfos.values(),
      );
    const names = new Set(
      tables.map(
        table => table.name,
      ),
    );

    const dependencies =
      new Map<
        string,
        Set<string>
      >();

    for (const table of tables) {
      const deps = new Set<string>();

      for (const fk of table.foreignKeys) {
        if (
          fk.table !== table.name &&
          names.has(fk.table)
        ) {
          deps.add(fk.table);
        }
      }

      dependencies.set(
        table.name,
        deps,
      );
    }

    const result: TableInfo[] = [];
    const remaining = new Set(
      tables.map(
        table => table.name,
      ),
    );

    while (remaining.size > 0) {
      const ready =
        Array.from(remaining)
          .filter(
            tableName =>
              Array.from(
                dependencies.get(
                  tableName,
                ) ?? [],
              ).every(
                dep =>
                  result.some(
                    table =>
                      table.name ===
                      dep,
                  ),
              ),
          )
          .sort();

      if (ready.length === 0) {
        for (const tableName of Array.from(
          remaining,
        ).sort()) {
          result.push(
            tableInfos.get(
              tableName,
            )!,
          );
          remaining.delete(
            tableName,
          );
        }
        continue;
      }

      for (const tableName of ready) {
        result.push(
          tableInfos.get(
            tableName,
          )!,
        );
        remaining.delete(
          tableName,
        );
      }
    }

    return result;
  }

  private clearBuiltWorld(): void {
    const tables =
      this.world
        .listTables()
        .filter(
          table =>
            !INTERNAL_TABLES.has(
              table,
            ),
        );

    this.world.connection
      .prepare(
        "DELETE FROM world_import_conflict",
      )
      .run();

    this.world.connection
      .prepare(
        "DELETE FROM world_import_id_map",
      )
      .run();

    this.world.connection
      .prepare(
        "DELETE FROM world_attribute_provenance",
      )
      .run();

    this.world.connection
      .prepare(
        "DELETE FROM world_entity_provenance",
      )
      .run();

    this.world.connection
      .prepare(
        "DELETE FROM world_entity_identity",
      )
      .run();

    for (const table of tables) {
      this.world.connection
        .prepare(
          "DELETE FROM " +
            quoteIdentifier(table),
        )
        .run();
    }
  }

  private setBuildDirty(): void {
    this.world.setMetadata(
      "world_build_status",
      "DIRTY",
    );
  }

  private detach(alias: string): void {
    try {
      this.world.connection.exec(
        "DETACH DATABASE " +
          quoteIdentifier(alias),
      );
    } catch {
      // no-op if the alias was already detached
    }
  }

  private attach(
    alias: string,
    sourceFile: string,
  ): void {
    const escaped =
      sourceFile.replaceAll(
        "'",
        "''",
      );

    this.world.connection.exec(
      "ATTACH DATABASE '" +
        escaped +
        "' AS " +
        quoteIdentifier(alias),
    );
  }

  private resolveSource(
    sourceFile: string,
  ): string {
    const absolute =
      path.resolve(sourceFile);

    if (!fs.existsSync(absolute)) {
      throw new Error(
        "Package file not found: " +
          absolute,
      );
    }

    return absolute;
  }

  private readManifest(
    alias: string,
  ): PackageManifest {
    const manifestTable =
      this.world.connection
        .prepare(
          "SELECT 1 FROM " +
            quoteIdentifier(alias) +
            ".sqlite_master " +
            "WHERE type='table' " +
            "AND name='package_manifest' " +
            "LIMIT 1",
        )
        .get();

    if (manifestTable) {
      const row =
        this.world.connection
          .prepare(
            "SELECT manifest_json FROM " +
              quoteIdentifier(alias) +
              ".package_manifest LIMIT 1",
          )
          .get() as
          | {
              manifest_json?: string;
            }
          | undefined;

      if (row?.manifest_json) {
        return JSON.parse(
          row.manifest_json,
        ) as PackageManifest;
      }
    }

    const metadataTable =
      this.world.connection
        .prepare(
          "SELECT 1 FROM " +
            quoteIdentifier(alias) +
            ".sqlite_master " +
            "WHERE type='table' " +
            "AND name='database_metadata' " +
            "LIMIT 1",
        )
        .get();

    if (!metadataTable) {
      throw new Error(
        "Package manifest is missing. Expected package_manifest or database_metadata.",
      );
    }

    const metadata =
      this.world.connection
        .prepare(
          "SELECT key,value FROM " +
            quoteIdentifier(alias) +
            ".database_metadata",
        )
        .all() as Array<{
        key: string;
        value: string;
      }>;

    const values = new Map(
      metadata.map(item => [
        item.key,
        item.value,
      ]),
    );

    const packageKey =
      values.get("package_key");
    const name =
      values.get("package_name");

    if (!packageKey || !name) {
      throw new Error(
        "Package manifest is incomplete: package_key and package_name are required.",
      );
    }

    return {
      packageKey,
      name,
      version:
        values.get(
          "package_version",
        ) ?? "1.0.0",
      packageType:
        values.get(
          "package_type",
        ) ?? "CONTENT",
      priority: Number(
        values.get(
          "package_priority",
        ) ?? 100,
      ),
      schemaVersion:
        Number(
          values.get(
            "schema_version",
          ) ?? 0,
        ),
      categories:
        parseJsonArray(
          values.get(
            "package_categories",
          ),
        ),
      description:
        values.get(
          "package_description",
        ) ?? null,
      provides:
        parseJsonArray(
          values.get(
            "package_provides",
          ),
        ),
      dependencies:
        parseJsonDependencies(
          values.get(
            "package_dependencies",
          ),
        ),
      conflicts:
        parseJsonArray(
          values.get(
            "package_conflicts",
          ),
        ),
    };
  }
}

function mapKey(
  tableName: string,
  incomingKey: string,
): string {
  return (
    tableName +
    "::" +
    incomingKey
  );
}

function serializeKey(
  table: TableInfo,
  row: Row | KeyObject,
): string {
  const values: KeyObject = {};

  for (const column of table.primaryKey) {
    values[column] =
      row[column];
  }

  return JSON.stringify(
    values,
  );
}

function virtualKey(
  table: TableInfo,
  incomingKey: string,
): KeyObject {
  return Object.fromEntries(
    table.primaryKey.map(
      column => [
        column,
        "__NEW__:" +
          table.name +
          ":" +
          incomingKey,
      ],
    ),
  );
}

function pickKey(
  table: TableInfo,
  row: Row,
): KeyObject {
  const values: KeyObject = {};

  for (const column of table.primaryKey) {
    values[column] =
      row[column];
  }

  return values;
}

function groupForeignKeys(
  foreignKeys: ForeignKeyInfo[],
): ForeignKeyInfo[][] {
  const groups =
    new Map<
      number,
      ForeignKeyInfo[]
    >();

  for (const fk of foreignKeys) {
    const group =
      groups.get(fk.id) ?? [];
    group.push(fk);
    groups.set(
      fk.id,
      group,
    );
  }

  return Array.from(
    groups.values(),
  ).map(
    group =>
      group.sort(
        (a, b) =>
          a.sequence -
          b.sequence,
      ),
  );
}

function infoToTableInfo(schema: {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    notNull: boolean;
    defaultValue: unknown;
    primaryKey: boolean;
  }>;
  primaryKey: string[];
  foreignKeys: Array<{
    id: number;
    sequence: number;
    table: string;
    from: string;
    to: string;
    onUpdate: string;
    onDelete: string;
  }>;
  uniqueColumns: string[][];
}): TableInfo {
  return {
    name: schema.name,
    columns: schema.columns.map(
      column => ({
        name: column.name,
        type: column.type,
        notNull:
          column.notNull,
        defaultValue:
          column.defaultValue,
        primaryKeyOrder:
          column.primaryKey
            ? schema.primaryKey.indexOf(
                column.name,
              ) + 1
            : 0,
      }),
    ),
    primaryKey:
      schema.primaryKey,
    foreignKeys:
      schema.foreignKeys.map(
        fk => ({
          id: fk.id,
          sequence: fk.sequence,
          table: fk.table,
          from: fk.from,
          to: fk.to,
        }),
      ),
    uniqueColumns:
      schema.uniqueColumns,
    rowIdPrimaryKey:
      schema.primaryKey.length ===
        1 &&
      schema.columns.find(
        column =>
          column.name ===
          schema.primaryKey[0],
      )?.type.toUpperCase() ===
        "INTEGER",
  };
}

function safeNaturalKey(
  policy: IdentityPolicy | undefined,
  row: Row,
  context: IdentityContext,
): string | null {
  if (!policy) return null;

  try {
    return policy.naturalKey(
      row,
      context,
    );
  } catch {
    return null;
  }
}

function normalizeComparable(
  value: unknown,
): string {
  if (value == null) return "";
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("hex");
  }
  return String(value);
}

function toNumberOrNull(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "bigint") {
    const number = Number(value);
    return Number.isFinite(number)
      ? number
      : null;
  }

  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : null;
}

function sha256File(
  filePath: string,
): string {
  return crypto
    .createHash("sha256")
    .update(
      fs.readFileSync(
        filePath,
      ),
    )
    .digest("hex");
}

function sha256Value(
  value: unknown,
): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(value),
    )
    .digest("hex");
}

function compareVersions(
  a: string,
  b: string,
): number {
  const left =
    a.split(".").map(
      part =>
        Number(part) || 0,
    );
  const right =
    b.split(".").map(
      part =>
        Number(part) || 0,
    );

  const length = Math.max(
    left.length,
    right.length,
  );

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    const l =
      left[index] ?? 0;
    const r =
      right[index] ?? 0;

    if (l !== r) {
      return l > r ? 1 : -1;
    }
  }

  return 0;
}

function parseJsonArray(
  value?: string,
): string[] {
  if (!value) return [];

  try {
    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.map(String)
      : [];
  } catch {
    return [];
  }
}

function parseJsonDependencies(
  value?: string,
): Array<{
  key: string;
  minVersion?: string | null;
}> {
  if (!value) return [];

  try {
    const parsed =
      JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(item => ({
        key: String(
          item?.key ?? "",
        ),
        minVersion:
          item?.minVersion == null
            ? null
            : String(
                item.minVersion,
              ),
      }))
      .filter(
        item =>
          item.key.length > 0,
      );
  } catch {
    return [];
  }
}

export function quoteIdentifier(
  value: string,
): string {
  if (
    !/^[A-Za-z_][A-Za-z0-9_]*$/.test(
      value,
    )
  ) {
    throw new Error(
      "Invalid SQL identifier: " +
        value,
    );
  }

  return '"' + value + '"';
}
