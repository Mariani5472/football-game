import path from "node:path";
import type DatabaseConnection from "better-sqlite3";
import type { PackageManifest } from "./WorldPackageTypes.js";

export interface RegisteredPackage {
  id: number;
  manifest: PackageManifest;
  sourceFile: string;
  sourceSha256: string;
  loadOrder: number;
  priority: number;
  alias: string;
}

/** Persistence boundary for installed package metadata and ordering. */
export class WorldPackageRegistryRepository {
  constructor(private readonly connection: DatabaseConnection.Database) {}

  listEnabled(): RegisteredPackage[] {
    const rows = this.connection.prepare(
      `SELECT p.id,p.package_key AS packageKey,p.name,p.version,
        p.package_type AS packageType,p.priority,p.source_file AS sourceFile,
        p.source_sha256 AS sourceSha256,p.schema_version AS schemaVersion,
        COALESCE(o.load_order,p.id) AS loadOrder
       FROM world_package p
       LEFT JOIN world_package_load_order o ON o.package_id=p.id
       WHERE p.enabled=1
       ORDER BY COALESCE(o.load_order,p.id),p.id`,
    ).all() as Array<Record<string, unknown>>;

    return rows.map(row => {
      const id = Number(row.id);
      const priority = Number(row.priority ?? 100);
      return {
        id,
        manifest: this.manifest(id, {
          packageKey: String(row.packageKey),
          name: String(row.name),
          version: String(row.version),
          packageType: String(row.packageType ?? "CONTENT"),
          priority,
          schemaVersion: Number(row.schemaVersion ?? 0),
        }),
        sourceFile: row.sourceFile == null ? "" : path.resolve(String(row.sourceFile)),
        sourceSha256: String(row.sourceSha256 ?? ""),
        loadOrder: Number(row.loadOrder),
        priority,
        alias: "",
      };
    });
  }

  manifest(packageId: number, base: PackageManifest): PackageManifest {
    const provides = this.connection.prepare(
      "SELECT provide_key AS value FROM world_package_provides WHERE package_id=? ORDER BY provide_key",
    ).all(packageId) as Array<{ value: string }>;
    const dependencies = this.connection.prepare(
      "SELECT dependency_key AS key,min_version AS minVersion FROM world_package_dependency WHERE package_id=? ORDER BY dependency_key",
    ).all(packageId) as Array<{ key: string; minVersion: string | null }>;
    const conflicts = this.connection.prepare(
      "SELECT conflict_key AS value FROM world_package_conflict WHERE package_id=? ORDER BY conflict_key",
    ).all(packageId) as Array<{ value: string }>;
    return {
      ...base,
      provides: provides.map(row => row.value),
      dependencies: dependencies.map(row => ({ key: row.key, minVersion: row.minVersion })),
      conflicts: conflicts.map(row => row.value),
    };
  }

  /** Must run in the caller's transaction when package data is being applied. */
  ensure(manifest: PackageManifest, sourceFile: string, sourceSha256: string, applyUpdate = true): number {
    const now = new Date().toISOString();
    const packageKey = manifest.packageKey.trim().toLowerCase();
    const existing = this.connection.prepare(
      "SELECT id,package_key AS packageKey,version,package_type AS packageType,source_file AS sourceFile,source_sha256 AS sourceSha256 FROM world_package WHERE lower(package_key)=? LIMIT 1",
    ).get(packageKey) as { id: number; packageKey: string; version: string; packageType: string; sourceFile: string | null; sourceSha256: string | null } | undefined;

    let packageId: number;
    if (existing) {
      packageId = existing.id;
      if (!applyUpdate) return packageId;
      if (existing.version !== manifest.version || existing.sourceSha256 !== sourceSha256) {
        this.connection.prepare(
          `INSERT INTO world_package_version_history(
            package_id,package_key,version,package_type,source_file,source_sha256,replaced_at,replacement_reason
          ) VALUES(?,?,?,?,?,?,?,?)`,
        ).run(existing.id, existing.packageKey, existing.version, existing.packageType, existing.sourceFile, existing.sourceSha256, now, "PACKAGE_UPDATE");
      }
      this.connection.prepare(
        `UPDATE world_package SET package_key=?,name=?,version=?,package_type=?,priority=COALESCE(?,priority),
          source_file=?,source_sha256=?,categories_json=?,description=?,schema_version=?,updated_at=?,status='ACTIVE',enabled=1
         WHERE id=?`,
      ).run(packageKey, manifest.name, manifest.version, manifest.packageType ?? "CONTENT", manifest.priority ?? null,
        sourceFile, sourceSha256, JSON.stringify(manifest.categories ?? []), manifest.description ?? null,
        manifest.schemaVersion, now, packageId);
    } else {
      const orderRow = this.connection.prepare(
        "SELECT COALESCE(MAX(load_order),0)+1 AS value FROM world_package_load_order",
      ).get() as { value: number };
      const result = this.connection.prepare(
        `INSERT INTO world_package(
          package_key,name,version,package_type,priority,status,source_file,source_sha256,categories_json,
          description,schema_version,imported_at,installed_at,updated_at,enabled
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      ).run(packageKey, manifest.name, manifest.version, manifest.packageType ?? "CONTENT", manifest.priority ?? 100,
        "ACTIVE", sourceFile, sourceSha256, JSON.stringify(manifest.categories ?? []), manifest.description ?? null,
        manifest.schemaVersion, now, now, now);
      packageId = Number(result.lastInsertRowid);
      this.connection.prepare("INSERT INTO world_package_load_order(package_id,load_order) VALUES(?,?)")
        .run(packageId, Number(orderRow.value));
    }
    this.replaceCapabilities(packageId, manifest);
    return packageId;
  }

  private replaceCapabilities(packageId: number, manifest: PackageManifest): void {
    this.connection.prepare("DELETE FROM world_package_provides WHERE package_id=?").run(packageId);
    for (const provide of manifest.provides ?? []) this.connection.prepare(
      "INSERT INTO world_package_provides(package_id,provide_key) VALUES(?,?)",
    ).run(packageId, provide);
    this.connection.prepare("DELETE FROM world_package_dependency WHERE package_id=?").run(packageId);
    for (const dependency of manifest.dependencies ?? []) this.connection.prepare(
      "INSERT INTO world_package_dependency(package_id,dependency_key,min_version) VALUES(?,?,?)",
    ).run(packageId, dependency.key, dependency.minVersion ?? null);
    this.connection.prepare("DELETE FROM world_package_conflict WHERE package_id=?").run(packageId);
    for (const conflict of manifest.conflicts ?? []) this.connection.prepare(
      "INSERT INTO world_package_conflict(package_id,conflict_key) VALUES(?,?)",
    ).run(packageId, conflict);
  }
}