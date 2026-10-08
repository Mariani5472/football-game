import fs from "node:fs";
import path from "node:path";

import type { ConflictPolicy, ImportConflictRecord, ImportSessionRecord, PackageForeignKeyInfo, PackageManifest, PackageTableInfo } from "./WorldPackageTypes.js";
export type { ConflictPolicy, ImportConflictRecord, ImportSessionRecord, PackageManifest } from "./WorldPackageTypes.js";
import { WorldPackageSchemaService } from "./WorldPackageSchemaService.js";
import { WorldPackageConflictPolicy } from "./WorldPackageConflictPolicy.js";
import { WorldImportProvenanceRepository } from "./WorldImportProvenanceRepository.js";
import { WorldImportSessionRepository } from "./WorldImportSessionRepository.js";
import { WorldPackageSourceRepository } from "./WorldPackageSourceRepository.js";
import { WorldPackageRegistryRepository } from "./WorldPackageRegistryRepository.js";
import { UnresolvedForeignKeyError, WorldPackageReferenceResolutionService } from "./WorldPackageReferenceResolutionService.js";

import { WorldDatabase } from "../../database/world/WorldDatabase.js";
import {
  type IdentityContext,
  type IdentityPolicy,
  generateUuid,
  identityPolicy,
} from "../../database/world/WorldIdentity.js";
import {
  type PackageIdentityIssue,
  validatePackageIdentity,
} from "./WorldPackageIdentityService.js";

export interface ImportPreview {
  sessionId: number;
  packageKey: string;
  status: string;
  identityUpdate?: boolean;
  identityIssues?: PackageIdentityIssue[];
  tables: number;
  rows: number;
  newRows: number;
  existingRows: number;
  conflicts: number;
  message: string;
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
  tableInfos: Map<string, PackageTableInfo>;
  mapping: Map<string, KeyObject>;
  packagePriority: number;
  alias: string;
}

class PackageIdentityValidationError extends Error {
  constructor(readonly issues: PackageIdentityIssue[]) {
    super(
      issues.map(issue => issue.message).join(" "),
    );
    this.name = "PackageIdentityValidationError";
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
  "world_package_version_history",
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
  private readonly packageSources: WorldPackageSourceRepository;
  private readonly packageRegistry: WorldPackageRegistryRepository;
  private readonly packageSchema = new WorldPackageSchemaService();
  private readonly referenceResolution = new WorldPackageReferenceResolutionService();
  private readonly conflictPolicy = new WorldPackageConflictPolicy();
  private readonly provenance: WorldImportProvenanceRepository;
  private readonly sessions: WorldImportSessionRepository;

  constructor(private readonly world: WorldDatabase) {
    this.packageSources = new WorldPackageSourceRepository(world.connection);
    this.packageRegistry = new WorldPackageRegistryRepository(world.connection);
    this.provenance = new WorldImportProvenanceRepository(world.connection);
    this.sessions = new WorldImportSessionRepository(world.connection);
    this.bootstrapWorldIdentities();
  }

  inspect(sourceFile: string): ImportPreview {
    const absolute = this.packageSources.resolve(sourceFile);
    const sourceSha256 = this.packageSources.sha256(absolute);
    const alias = "incoming_package";

    this.packageSources.attach(alias, absolute);

    try {
      const manifest = this.packageSources.readManifest(alias);
      this.validateManifest(manifest, sourceSha256);

      const packageId = this.ensurePackage(
        manifest,
        absolute,
        sourceSha256,
        false,
      );
      const sessionId = this.createSession(
        packageId,
        absolute,
        sourceSha256,
      );

      this.setSessionStatus(sessionId, "INSPECTING");

      const tableInfos = this.loadPackageTableInfos(alias);
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
          const translated = this.tryBuildTranslatedRow(
            table,
            row,
            mapping,
            tableInfos,
          );

          if (!effectiveWorldKey && translated) {
            effectiveWorldKey =
              this.findExistingByUnique(
                table,
                translated,
              );
          }

          if (effectiveWorldKey && translated) {
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
      this.packageSources.detach(alias);
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

    const sourceHash = this.packageSources.sha256(absolute);
    if (sourceHash !== session.sourceSha256) {
      throw new Error(
        "Package changed after inspection. Inspect it again before importing.",
      );
    }

    const alias = "incoming_package";
    this.packageSources.attach(alias, absolute);

    try {
      const manifest = this.packageSources.readManifest(alias);
      this.validateManifest(manifest, sourceHash);

      const packageRow = this.world.connection
        .prepare(
          "SELECT id, priority FROM world_package WHERE lower(package_key)=?",
        )
        .get(manifest.packageKey.trim().toLowerCase()) as
        | { id: number; priority: number }
        | undefined;

      if (!packageRow) {
        throw new Error("Package registry entry is missing.");
      }

      const tableInfos = this.loadPackageTableInfos(alias);
      this.validateCompatibleTables(tableInfos);

      const runtime: ImportRuntime = {
        packageId: packageRow.id,
        sessionId,
        manifest,
        tableInfos,
        mapping: new Map(),
        packagePriority: Number(manifest.priority ?? packageRow.priority ?? 100),
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
        this.ensurePackage(manifest, absolute, sourceHash, true);
        runtime.packagePriority = Number(manifest.priority ?? packageRow.priority ?? 100);

        const summary = this.referenceResolution.apply({
          tables: this.orderTables(tableInfos),
          loadRows: tableName => Array.from(this.iterateRows(alias, tableName)),
          applyRow: (table, row) => this.importRow(runtime, table, row, explicitResolution),
          unresolvedMessage: pending => "Unable to resolve package foreign keys: " + Array.from(pending.entries()).map(([tableName, pendingRows]) => tableName + " (" + pendingRows.length + " rows)").join(", "),
        });
        rows = summary.processed;
        created = summary.created;
        updated = summary.updated;
        skipped = summary.skipped;

        this.world.setMetadata("world_build_status", "VALID");
        this.world.setMetadata("world_last_build_at", new Date().toISOString());
        this.setSessionStatus(sessionId, "COMPLETED", { tables: tableInfos.size, rows, created, updated, skipped });
        this.world.connection.prepare("UPDATE world_package SET status='ACTIVE', updated_at=? WHERE id=?").run(new Date().toISOString(), packageRow.id);
      });
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
      this.packageSources.detach(alias);
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

      const actualHash = this.packageSources.sha256(pkg.sourceFile);
      if (actualHash !== pkg.sourceSha256) {
        throw new Error(
          "Package hash changed: " + pkg.manifest.packageKey,
        );
      }

      this.validateManifest(pkg.manifest, pkg.sourceSha256);
    }

    const runtimes = packages.map(pkg => ({
      ...pkg,
      alias: "incoming_" + pkg.id,
    }));

    for (const runtime of runtimes) {
      this.packageSources.attach(runtime.alias, runtime.sourceFile);
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
          const tableInfos = this.loadPackageTableInfos(item.runtime.alias);
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

          const summary = this.referenceResolution.apply({
            tables: this.orderTables(tableInfos),
            loadRows: tableName => Array.from(this.iterateRows(item.runtime.alias, tableName)),
            applyRow: (table, row) => this.importRow(runtime, table, row, new Map()),
            unresolvedMessage: () => "Unable to resolve foreign keys while rebuilding " + item.runtime.manifest.packageKey,
          });
          const packageRows = summary.created + summary.updated + summary.skipped;
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
        this.packageSources.detach(runtime.alias);
      }
    }
  }

  getSession(id: number): ImportSessionRecord | undefined { return this.sessions.get(id); }

  listConflicts(sessionId: number): ImportConflictRecord[] { return this.sessions.listConflicts(sessionId); }

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
    table: PackageTableInfo,
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
    table: PackageTableInfo,
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
    table: PackageTableInfo,
    worldKey: KeyObject,
    column: string,
    _packageId: number,
    incomingPriority: number,
  ): ConflictPolicy {
    const owner = table.primaryKey.length > 1 ? undefined : this.world.connection
      .prepare(
        `SELECT p.priority
         FROM world_attribute_provenance a
         JOIN world_package p ON p.id=a.package_id
         WHERE a.table_name=? AND a.row_key=? AND a.column_name=? AND a.is_current=1
         LIMIT 1`,
      )
      .get(table.name, serializeKey(table, worldKey), column) as { priority?: number } | undefined;
    return this.conflictPolicy.defaultPolicy({
      eventRecord: EVENT_TABLES.has(table.name),
      compositeKey: table.primaryKey.length > 1,
      incomingPriority,
      existingPriority: Number(owner?.priority ?? -1),
    });
  }
  private buildTranslatedRow(
    runtime: ImportRuntime,
    table: PackageTableInfo,
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

      const targetIncomingKey = serializeKey(
        targetInfo,
        incomingTargetKey,
      );

      let targetMapped =
        runtime.mapping.get(
          mapKey(
            group[0].table,
            targetIncomingKey,
          ),
        );

      if (!targetMapped) {
        const attachedTarget = this.findAttachedRow(
          runtime.alias,
          targetInfo,
          incomingTargetKey,
        );

        if (attachedTarget) {
          const targetResolution =
            this.resolveExisting(
              targetInfo,
              attachedTarget,
              this.createIdentityContext(
                runtime.alias,
                runtime.tableInfos,
              ),
              runtime.mapping,
              runtime.packageId,
              targetIncomingKey,
            );

          targetMapped = targetResolution.worldKey ?? undefined;

          if (targetMapped) {
            runtime.mapping.set(
              mapKey(
                group[0].table,
                targetIncomingKey,
              ),
              targetMapped,
            );
          }
        }
      }

      if (!targetMapped) {
        throw new UnresolvedForeignKeyError(
          table.name,
          group[0].from,
          group[0].table,
          targetIncomingKey,
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
    table: PackageTableInfo,
    row: Row,
    mapping: Map<string, KeyObject>,
    tableInfos: Map<string, PackageTableInfo>,
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
    table: PackageTableInfo,
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
    table: PackageTableInfo,
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
    table: PackageTableInfo,
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
    table: PackageTableInfo,
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
    table: PackageTableInfo,
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
    table: PackageTableInfo,
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
    table: PackageTableInfo,
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

      // Materialize the result set before issuing UPDATE/INSERT statements
      // on the same SQLite connection. better-sqlite3 keeps an active iterator
      // statement busy while it is being consumed.
      const rows = this.world.connection
        .prepare(
          "SELECT * FROM " +
          quoteIdentifier(table.name),
        )
        .all() as Row[];

      for (const row of rows) {
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

  private recordProvenance(runtime: ImportRuntime, table: PackageTableInfo, worldKey: KeyObject, incoming: Row, resolution: string, winningColumns: Set<string>): void {
    this.provenance.recordEntity({ table, rowKey: serializeKey(table, worldKey), packageId: runtime.packageId, incoming, resolution, winningColumns });
  }

  private persistProvenanceColumns(runtime: ImportRuntime, table: PackageTableInfo, worldKey: KeyObject, incoming: Row, values: Record<string, unknown>, resolution: string): void {
    this.provenance.recordAttributes({ table, rowKey: serializeKey(table, worldKey), packageId: runtime.packageId, incoming, columns: values, resolution });
  }

  private recordIdMap(runtime: ImportRuntime, table: PackageTableInfo, row: Row, incomingKey: string, worldKey: KeyObject, resolution: string): void {
    const worldId = table.primaryKey.length === 1 ? toNumberOrNull(worldKey[table.primaryKey[0]]) : null;
    const context = this.createIdentityContext(runtime.alias, runtime.tableInfos);
    this.provenance.recordIdMap({
      sessionId: runtime.sessionId, tableName: table.name, incomingKey,
      incomingId: table.primaryKey.length === 1 ? toNumberOrNull(row[table.primaryKey[0]]) : null,
      incomingUuid: row.uuid == null ? null : String(row.uuid),
      worldKey: serializeKey(table, worldKey), worldId, resolution,
      naturalKey: safeNaturalKey(identityPolicy(table.name), row, context),
    });
  }

  private recordConflict(sessionId: number, packageId: number, table: PackageTableInfo, row: Row, worldKey: KeyObject | null, worldId: number | null, conflictType: string, column: string | null, existingValue: unknown, incomingValue: unknown): void {
    this.provenance.recordConflict({
      sessionId, packageId, tableName: table.name, incomingKey: serializeKey(table, row),
      incomingId: table.primaryKey.length === 1 ? toNumberOrNull(row[table.primaryKey[0]]) : null,
      worldKey: worldKey ? serializeKey(table, worldKey) : null, worldId,
      conflictType, column, existingValue, incomingValue,
    });
  }

  private resolveSessionConflict(id: number | null, resolution: ConflictPolicy): void {
    if (id != null) this.provenance.resolveConflict(id, resolution);
  }
  private findSessionConflict(sessionId: number, table: PackageTableInfo, incomingKey: string, column: string | null): ImportConflictRecord | null {
    return this.listConflicts(sessionId).find(conflict => conflict.tableName === table.name && conflict.incomingKey === incomingKey && conflict.columnName === column && !conflict.resolved) ?? null;
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

  private listEnabledPackages(): PackageRuntime[] { return this.packageRegistry.listEnabled(); }

  private ensurePackage(manifest: PackageManifest, sourceFile: string, sourceSha256: string, applyUpdate = true): number {
    const packageId = this.packageRegistry.ensure(manifest, sourceFile, sourceSha256, applyUpdate);
    if (applyUpdate) this.setBuildDirty();
    return packageId;
  }

  private createSession(packageId: number, sourceFile: string, sourceSha256: string): number { return this.sessions.create(packageId, sourceFile, sourceSha256); }

  private setSessionStatus(id: number, status: string, summary?: Record<string, unknown>, error?: string): void { this.sessions.setStatus(id, status, summary, error); }

  private validateManifest(
    manifest: PackageManifest,
    sourceSha256?: string,
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
      this.world.metadata("schema_version") ?? 0,
    );

    console.log(manifest)

    if (Number(manifest.schemaVersion) !== worldSchema) {
      throw new Error(
        "Package schema v" +
        manifest.schemaVersion +
        " is incompatible with World schema v" +
        worldSchema +
        ".",
      );
    }

    const priority = Number(manifest.priority ?? 100);
    if (!Number.isFinite(priority)) {
      throw new Error("Package priority must be numeric.");
    }

    const identity = validatePackageIdentity(
      this.world,
      manifest,
      sourceSha256 ?? "",
    );

    if (identity.issues.length > 0) {
      throw new PackageIdentityValidationError(
        identity.issues,
      );
    }
  }

  private validateCompatibleTables(tableInfos: Map<string, PackageTableInfo>): void {
    this.packageSchema.validateCompatibleTables(tableInfos, table => this.world.tableExists(table), table => this.world.tableSchema(table));
  }

  private loadPackageTableInfos(
    alias: string,
  ): Map<string, PackageTableInfo> {
    const infos = new Map<string, PackageTableInfo>();

    for (const table of this.listIncomingTables(
      alias,
    )) {
      infos.set(
        table.name,
        this.readPackageTableInfo(
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

  private readPackageTableInfo(
    alias: string,
    tableName: string,
  ): PackageTableInfo {
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
    tableInfos: Map<string, PackageTableInfo>,
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
      let table =
        tableInfos.get(tableName);

      if (!table) {
        const exists =
          this.world.connection
            .prepare(
              "SELECT 1 FROM " +
              quoteIdentifier(alias) +
              ".sqlite_master WHERE type='table' AND name=? LIMIT 1",
            )
            .get(tableName);

        if (!exists) return null;

        try {
          table = this.readPackageTableInfo(
            alias,
            tableName,
          );
          tableInfos.set(
            tableName,
            table,
          );
        } catch {
          return null;
        }
      }

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

  private *iterateRows(alias: string, tableName: string): IterableIterator<Row> {
    const statement = this.world.connection.prepare(
      "SELECT * FROM " + quoteIdentifier(alias) + "." + quoteIdentifier(tableName),
    );
    for (const row of statement.iterate()) yield row as Row;
  }
  private findAttachedRow(
    alias: string,
    table: PackageTableInfo,
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

  private orderTables(tableInfos: Map<string, PackageTableInfo>): PackageTableInfo[] {
    return this.packageSchema.orderTables(tableInfos);
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
    this.world.setMetadata(
      "world_dirty_reason",
      "PACKAGE_COMPOSITION",
    );
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
  table: PackageTableInfo,
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
  table: PackageTableInfo,
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
  table: PackageTableInfo,
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
  foreignKeys: PackageForeignKeyInfo[],
): PackageForeignKeyInfo[][] {
  const groups =
    new Map<
      number,
      PackageForeignKeyInfo[]
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
}): PackageTableInfo {
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
