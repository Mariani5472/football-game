import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { WorldDatabase } from "../database/world/WorldDatabase.js";
import { validatePackageIdentity } from "./WorldPackageIdentityService.js";
import {
  WorldPackageImportService,
  type ConflictPolicy,
  type ImportConflictRecord,
  type ImportPreview,
  type ImportSessionRecord,
  type PackageManifest,
  type RebuildResult,
} from "./WorldPackageImportService.js";

export type WorldPackageStatus =
  | "ACTIVE"
  | "CONFLICT"
  | "ERROR"
  | "DISABLED";

export interface WorldPackageRecord {
  id: number;
  packageKey: string;
  name: string;
  version: string;
  status: WorldPackageStatus;
  icon: string | null;
  sourceFile: string | null;
  sourceSha256: string | null;
  categories: string[];
  description: string | null;
  schemaVersion: number;
  importedAt: string;
  updatedAt: string;
  packageType: string;
  priority: number;
  enabled: boolean;
  loadOrder: number | null;
  provides: string[];
  dependencies: Array<{
    key: string;
    minVersion: string | null;
  }>;
  conflicts: string[];
}

export interface RegisterWorldPackageInput {
  packageKey: string;
  name: string;
  version?: string;
  packageType?: string;
  priority?: number;
  status?: WorldPackageStatus;
  icon?: string | null;
  sourceFile?: string | null;
  sourceSha256?: string | null;
  categories?: string[];
  description?: string | null;
  provides?: string[];
  dependencies?: Array<{
    key: string;
    minVersion?: string | null;
  }>;
  conflicts?: string[];
}

export interface UpdateWorldPackageInput {
  enabled?: boolean;
  priority?: number;
  loadOrder?: number;
}

export interface WorldBuildStatus {
  status: "VALID" | "INVALID" | "DIRTY" | "UNKNOWN";
  lastBuildAt: string | null;
  unresolvedConflicts: number;
  enabledPackages: number;
}

export interface WorldPackageMetadata {
  format: "world.db";
  packageVersion: string;
  schemaVersion: number;
  databaseType: "world";
  fileName: string;
  sizeBytes: number;
  sha256: string;
  exportedAt: string;
  tableCount: number;
  rowCount: number;
}

export interface WorldPackageIssue {
  severity: "ERROR" | "WARNING";
  ruleKey: string;
  message: string;
}

export interface WorldExportResult {
  metadata: WorldPackageMetadata;
  outputPath: string;
  blocked: boolean;
  issues: WorldPackageIssue[];
}

export class WorldPackageService {
  constructor(private readonly database: WorldDatabase) {}

  listPackages(): WorldPackageRecord[] {
    const rows = this.database.connection
      .prepare(
        `SELECT
          p.id,
          p.package_key AS packageKey,
          p.name,
          p.version,
          p.status,
          p.icon,
          p.source_file AS sourceFile,
          p.source_sha256 AS sourceSha256,
          p.categories_json AS categoriesJson,
          p.description,
          p.schema_version AS schemaVersion,
          COALESCE(p.installed_at,p.imported_at) AS importedAt,
          p.updated_at AS updatedAt,
          p.package_type AS packageType,
          p.priority,
          p.enabled,
          o.load_order AS loadOrder
        FROM world_package p
        LEFT JOIN world_package_load_order o
          ON o.package_id=p.id
        ORDER BY
          COALESCE(o.load_order, 2147483647),
          p.id`,
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map(row => ({
      id: Number(row.id),
      packageKey: String(row.packageKey),
      name: String(row.name),
      version: String(row.version),
      status: String(row.status) as WorldPackageStatus,
      icon:
        row.icon == null
          ? null
          : String(row.icon),
      sourceFile:
        row.sourceFile == null
          ? null
          : String(row.sourceFile),
      sourceSha256:
        row.sourceSha256 == null
          ? null
          : String(row.sourceSha256),
      categories:
        parseJsonArray(
          String(
            row.categoriesJson ??
              "[]",
          ),
        ),
      description:
        row.description == null
          ? null
          : String(row.description),
      schemaVersion:
        Number(row.schemaVersion ?? 0),
      importedAt:
        String(row.importedAt ?? ""),
      updatedAt:
        String(row.updatedAt ?? ""),
      packageType:
        String(
          row.packageType ??
            "CONTENT",
        ),
      priority:
        Number(row.priority ?? 100),
      enabled:
        Number(row.enabled ?? 1) === 1,
      loadOrder:
        row.loadOrder == null
          ? null
          : Number(row.loadOrder),
      provides:
        this.listProvides(
          Number(row.id),
        ),
      dependencies:
        this.listDependencies(
          Number(row.id),
        ),
      conflicts:
        this.listConflicts(
          Number(row.id),
        ),
    }));
  }

  registerPackage(
    input: RegisterWorldPackageInput,
  ): WorldPackageRecord {
    const packageKey =
      input.packageKey.trim();
    const name =
      input.name.trim();

    if (!packageKey) {
      throw new Error(
        "Package key is required.",
      );
    }

    if (!name) {
      throw new Error(
        "Package name is required.",
      );
    }

    const identity = validatePackageIdentity(
      this.database,
      {
        packageKey,
        packageType: input.packageType ?? "CONTENT",
        version: input.version?.trim() || "1.0.0",
        provides: input.provides ?? [],
        dependencies: input.dependencies ?? [],
        conflicts: input.conflicts ?? [],
      },
      input.sourceSha256 ?? "",
    );

    if (identity.issues.length > 0) {
      throw new Error(
        identity.issues.map(issue => issue.message).join(" "),
      );
    }

    const existing = this.database.connection
      .prepare(
        "SELECT id FROM world_package WHERE package_key=?",
      )
      .get(packageKey) as
      | { id: number }
      | undefined;

    if (existing) {
      throw new Error(
        "Package key is already registered: " +
          packageKey,
      );
    }

    const now =
      new Date().toISOString();
    const result =
      this.database.connection
        .prepare(
          `INSERT INTO world_package(
            package_key,name,version,package_type,priority,
            status,icon,source_file,source_sha256,
            categories_json,description,schema_version,
            imported_at,installed_at,updated_at,enabled
          ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          packageKey,
          name,
          input.version?.trim() ||
            "1.0.0",
          input.packageType ??
            "CONTENT",
          Number(
            input.priority ?? 100,
          ),
          input.status ===
            "DISABLED"
            ? "ACTIVE"
            : input.status ??
              "ACTIVE",
          input.icon ?? null,
          input.sourceFile ??
            null,
          input.sourceSha256 ??
            null,
          JSON.stringify(
            input.categories ??
              [],
          ),
          input.description ??
            null,
          Number(
            this.database.metadata(
              "schema_version",
            ) ?? 0,
          ),
          now,
          now,
          now,
          input.status ===
            "DISABLED"
            ? 0
            : 1,
        );

    const packageId =
      Number(result.lastInsertRowid);

    const nextOrder =
      Number(
        (
          this.database.connection
            .prepare(
              "SELECT COALESCE(MAX(load_order),0)+1 AS value FROM world_package_load_order",
            )
            .get() as {
            value: number;
          }
        ).value,
      );

    this.database.connection
      .prepare(
        "INSERT INTO world_package_load_order(package_id,load_order) VALUES(?,?)",
      )
      .run(
        packageId,
        nextOrder,
      );

    this.replaceCapabilities(
      packageId,
      input.provides ?? [],
      input.dependencies ?? [],
      input.conflicts ?? [],
    );

    this.setBuildDirty();

    return this.getPackage(packageId);
  }

  updatePackage(
    id: number,
    input: UpdateWorldPackageInput,
  ): WorldPackageRecord {
    const current =
      this.getPackage(id);

    const enabled =
      input.enabled ??
      current.enabled;
    const priority =
      input.priority ??
      current.priority;

    if (!Number.isFinite(priority)) {
      throw new Error(
        "Package priority must be numeric.",
      );
    }

    if (enabled) {
      const identity = validatePackageIdentity(
        this.database,
        {
          packageKey: current.packageKey,
          packageType: current.packageType,
          version: current.version,
          provides: current.provides,
          dependencies: current.dependencies,
          conflicts: current.conflicts,
        },
        current.sourceSha256 ?? "",
      );

      if (identity.issues.length > 0) {
        throw new Error(
          identity.issues.map(issue => issue.message).join(" "),
        );
      }
    }

    this.database.transaction(
      () => {
        this.database.connection
          .prepare(
            "UPDATE world_package SET enabled=?,priority=?,updated_at=? WHERE id=?",
          )
          .run(
            enabled ? 1 : 0,
            priority,
            new Date().toISOString(),
            id,
          );

        if (
          input.loadOrder !==
          undefined
        ) {
          this.reorderPackage(
            id,
            input.loadOrder,
          );
        }
      },
    );

    this.setBuildDirty();

    return this.getPackage(id);
  }

  removePackage(id: number): boolean {
    const packageRow =
      this.getPackage(id);

    const provenance =
      Number(
        (
          this.database.connection
            .prepare(
              "SELECT COUNT(*) AS count FROM world_entity_provenance WHERE package_id=?",
            )
            .get(id) as {
            count: number;
          }
        ).count,
      );

    if (provenance > 0) {
      throw new Error(
        "Package contributes data to the current World. Disable it and rebuild the World before removing it.",
      );
    }

    const deleted =
      this.database.connection
        .prepare(
          "DELETE FROM world_package WHERE id=?",
        )
        .run(id).changes > 0;

    if (deleted) {
      this.database.setMetadata(
        "world_build_status",
        "DIRTY",
      );
    }

    void packageRow;
    return deleted;
  }

  getBuildStatus(): WorldBuildStatus {
    const unresolved =
      Number(
        (
          this.database.connection
            .prepare(
              "SELECT COUNT(*) AS count FROM world_import_conflict WHERE resolved=0",
            )
            .get() as {
            count: number;
          }
        ).count,
      );

    return {
      status:
        (this.database.metadata(
          "world_build_status",
        ) as WorldBuildStatus["status"]) ??
        "UNKNOWN",
      lastBuildAt:
        this.database.metadata(
          "world_last_build_at",
        ) ?? null,
      unresolvedConflicts:
        unresolved,
      enabledPackages:
        Number(
          (
            this.database.connection
              .prepare(
                "SELECT COUNT(*) AS count FROM world_package WHERE enabled=1",
              )
              .get() as {
              count: number;
            }
          ).count,
        ),
    };
  }

  inspectPackage(
    sourceFile: string,
  ): ImportPreview {
    return new WorldPackageImportService(
      this.database,
    ).inspect(sourceFile);
  }

  importPackage(
    sessionId: number,
    resolutions: Record<
      string,
      ConflictPolicy
    > = {},
  ): ImportPreview {
    return new WorldPackageImportService(
      this.database,
    ).import(
      sessionId,
      resolutions,
    );
  }

  getImportSession(
    id: number,
  ): ImportSessionRecord | undefined {
    return new WorldPackageImportService(
      this.database,
    ).getSession(id);
  }

  listImportConflicts(
    id: number,
  ): ImportConflictRecord[] {
    return new WorldPackageImportService(
      this.database,
    ).listConflicts(id);
  }

  rebuild(): RebuildResult {
    if (
      this.database.metadata("world_dirty_reason") ===
      "DIRECT_EDIT"
    ) {
      throw new Error(
        "World has direct editor changes that are not represented by a package. Export or convert those changes to a package before rebuilding.",
      );
    }

    return new WorldPackageImportService(
      this.database,
    ).rebuild();
  }

  exportWorld(
    outputPath: string,
    issues: WorldPackageIssue[] = [],
  ): WorldExportResult {
    const errors = issues.filter(
      issue => issue.severity === "ERROR",
    );

    if (errors.length > 0) {
      return {
        metadata:
          this.buildMetadata(
            outputPath,
            false,
          ),
        outputPath:
          path.resolve(outputPath),
        blocked: true,
        issues,
      };
    }

    const destination =
      path.resolve(outputPath);

    fs.mkdirSync(
      path.dirname(destination),
      { recursive: true },
    );

    this.database.connection.pragma(
      "wal_checkpoint(TRUNCATE)",
    );
    this.database.connection.backup(
      destination,
    );

    return {
      metadata:
        this.buildMetadata(
          destination,
          true,
        ),
      outputPath: destination,
      blocked: false,
      issues,
    };
  }

  private setBuildDirty(): void {
    this.database.setMetadata(
      "world_build_status",
      "DIRTY",
    );
    this.database.setMetadata(
      "world_dirty_reason",
      "PACKAGE_COMPOSITION",
    );
  }

  private getPackage(
    id: number,
  ): WorldPackageRecord {
    const packageItem =
      this.listPackages().find(
        item => item.id === id,
      );

    if (!packageItem) {
      throw new Error(
        "Package not found: " + id,
      );
    }

    return packageItem;
  }

  private reorderPackage(
    packageId: number,
    requestedOrder: number,
  ): void {
    const rows =
      this.database.connection
        .prepare(
          "SELECT package_id AS packageId,load_order AS loadOrder FROM world_package_load_order ORDER BY load_order,package_id",
        )
        .all() as Array<{
        packageId: number;
        loadOrder: number;
      }>;

    const ids =
      rows
        .map(row => row.packageId)
        .filter(
          id => id !== packageId,
        );

    const targetIndex = Math.max(
      0,
      Math.min(
        ids.length,
        requestedOrder - 1,
      ),
    );
    ids.splice(
      targetIndex,
      0,
      packageId,
    );

    this.database.connection
      .prepare(
        "UPDATE world_package_load_order SET load_order=load_order+1000000",
      )
      .run();

    const update =
      this.database.connection.prepare(
        "UPDATE world_package_load_order SET load_order=? WHERE package_id=?",
      );

    ids.forEach(
      (id, index) =>
        update.run(index + 1, id),
    );
  }

  private listProvides(
    packageId: number,
  ): string[] {
    return (
      this.database.connection
        .prepare(
          "SELECT provide_key AS value FROM world_package_provides WHERE package_id=? ORDER BY provide_key",
        )
        .all(packageId) as Array<{
        value: string;
      }>
    ).map(row => row.value);
  }

  private listDependencies(
    packageId: number,
  ): Array<{
    key: string;
    minVersion: string | null;
  }> {
    return this.database.connection
      .prepare(
        "SELECT dependency_key AS key,min_version AS minVersion FROM world_package_dependency WHERE package_id=? ORDER BY dependency_key",
      )
      .all(packageId) as Array<{
      key: string;
      minVersion: string | null;
    }>;
  }

  private listConflicts(
    packageId: number,
  ): string[] {
    return (
      this.database.connection
        .prepare(
          "SELECT conflict_key AS value FROM world_package_conflict WHERE package_id=? ORDER BY conflict_key",
        )
        .all(packageId) as Array<{
        value: string;
      }>
    ).map(row => row.value);
  }

  private replaceCapabilities(
    packageId: number,
    provides: string[],
    dependencies: Array<{
      key: string;
      minVersion?: string | null;
    }>,
    conflicts: string[],
  ): void {
    this.database.connection
      .prepare(
        "DELETE FROM world_package_provides WHERE package_id=?",
      )
      .run(packageId);

    for (const provide of provides) {
      this.database.connection
        .prepare(
          "INSERT INTO world_package_provides(package_id,provide_key) VALUES(?,?)",
        )
        .run(packageId, provide);
    }

    this.database.connection
      .prepare(
        "DELETE FROM world_package_dependency WHERE package_id=?",
      )
      .run(packageId);

    for (const dependency of dependencies) {
      this.database.connection
        .prepare(
          "INSERT INTO world_package_dependency(package_id,dependency_key,min_version) VALUES(?,?,?)",
        )
        .run(
          packageId,
          dependency.key,
          dependency.minVersion ??
            null,
        );
    }

    this.database.connection
      .prepare(
        "DELETE FROM world_package_conflict WHERE package_id=?",
      )
      .run(packageId);

    for (const conflict of conflicts) {
      this.database.connection
        .prepare(
          "INSERT INTO world_package_conflict(package_id,conflict_key) VALUES(?,?)",
        )
        .run(packageId, conflict);
    }
  }

  private buildMetadata(
    outputPath: string,
    exported: boolean,
  ): WorldPackageMetadata {
    const destination =
      path.resolve(outputPath);
    const exists =
      exported &&
      fs.existsSync(destination);

    const tables =
      this.database
        .listTables()
        .filter(
          table =>
            !table.startsWith(
              "world_",
            ) &&
            table !==
              "editor_template",
        );

    let rowCount = 0;

    for (const table of tables) {
      rowCount += Number(
        (
          this.database.connection
            .prepare(
              "SELECT COUNT(*) AS count FROM " +
                quoteIdentifier(table),
            )
            .get() as {
            count: number;
          }
        ).count,
      );
    }

    return {
      format: "world.db",
      packageVersion:
        this.database.metadata(
          "package_version",
        ) ?? "0.3.0",
      schemaVersion:
        Number(
          this.database.metadata(
            "schema_version",
          ) ?? 0,
        ),
      databaseType: "world",
      fileName:
        path.basename(destination),
      sizeBytes: exists
        ? fs.statSync(
            destination,
          ).size
        : 0,
      sha256: exists
        ? sha256File(destination)
        : "",
      exportedAt:
        new Date().toISOString(),
      tableCount: tables.length,
      rowCount,
    };
  }
}

function parseJsonArray(
  value: string,
): string[] {
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

function quoteIdentifier(
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

function sha256File(
  filePath: string,
): string {
  return crypto
    .createHash("sha256")
    .update(
      fs.readFileSync(filePath),
    )
    .digest("hex");
}
