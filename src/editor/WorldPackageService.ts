import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { WorldDatabase } from "../database/world/WorldDatabase.js";
import { WorldPackageImportService } from "./WorldPackageImportService.js";

export type WorldPackageStatus = "ACTIVE" | "CONFLICT" | "ERROR" | "DISABLED";

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
}

export interface RegisterWorldPackageInput {
  packageKey: string;
  name: string;
  version?: string;
  status?: WorldPackageStatus;
  icon?: string | null;
  sourceFile?: string | null;
  sourceSha256?: string | null;
  categories?: string[];
  description?: string | null;
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
  constructor(private readonly database: WorldDatabase) {
    this.ensurePackageRegistry();
  }

  listPackages(): WorldPackageRecord[] {
    const rows = this.database.connection.prepare(`
      SELECT id, package_key AS packageKey, name, version, status, icon,
             source_file AS sourceFile, source_sha256 AS sourceSha256,
             categories_json AS categoriesJson, description,
             schema_version AS schemaVersion, imported_at AS importedAt,
             updated_at AS updatedAt
      FROM world_package
      ORDER BY imported_at ASC, id ASC
    `).all() as Array<Record<string, unknown>>;

    return rows.map(row => ({
      id: Number(row.id),
      packageKey: String(row.packageKey),
      name: String(row.name),
      version: String(row.version),
      status: String(row.status) as WorldPackageStatus,
      icon: row.icon == null ? null : String(row.icon),
      sourceFile: row.sourceFile == null ? null : String(row.sourceFile),
      sourceSha256: row.sourceSha256 == null ? null : String(row.sourceSha256),
      categories: JSON.parse(String(row.categoriesJson ?? "[]")) as string[],
      description: row.description == null ? null : String(row.description),
      schemaVersion: Number(row.schemaVersion ?? 0),
      importedAt: String(row.importedAt),
      updatedAt: String(row.updatedAt),
    }));
  }

  registerPackage(input: RegisterWorldPackageInput): WorldPackageRecord {
    const packageKey = input.packageKey.trim();
    const name = input.name.trim();
    if (!packageKey) throw new Error("Package key is required.");
    if (!name) throw new Error("Package name is required.");

    const now = new Date().toISOString();
    this.database.connection.prepare(`
      INSERT INTO world_package (
        package_key, name, version, status, icon, source_file, source_sha256,
        categories_json, description, schema_version, imported_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      packageKey,
      name,
      input.version?.trim() || "1.0.0",
      input.status ?? "ACTIVE",
      input.icon ?? null,
      input.sourceFile ?? null,
      input.sourceSha256 ?? null,
      JSON.stringify(input.categories ?? []),
      input.description ?? null,
      Number(this.database.metadata("schema_version") ?? 0),
      now,
      now,
    );

    return this.listPackages().find(item => item.packageKey === packageKey)!;
  }

  removePackage(id: number): boolean {
    return this.database.connection.prepare("DELETE FROM world_package WHERE id = ?").run(id).changes > 0;
  }

  private ensurePackageRegistry(): void {
    this.database.execute(`
      CREATE TABLE IF NOT EXISTS world_package (
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
      )
    `);
  }

  exportWorld(
    outputPath: string,
    issues: WorldPackageIssue[] = [],
  ): WorldExportResult {
    const errors = issues.filter(issue => issue.severity === "ERROR");

    if (errors.length > 0) {
      return {
        metadata: this.buildMetadata(outputPath, false),
        outputPath: path.resolve(outputPath),
        blocked: true,
        issues,
      };
    }

    const destination = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });

    this.database.connection.pragma("wal_checkpoint(TRUNCATE)");
    this.database.connection.backup(destination);

    return {
      metadata: this.buildMetadata(destination, true),
      outputPath: destination,
      blocked: false,
      issues,
    };
  }

  private buildMetadata(outputPath: string, exported: boolean): WorldPackageMetadata {
    const destination = path.resolve(outputPath);
    const exists = exported && fs.existsSync(destination);
    const tables = this.database.listTables();

    let rowCount = 0;
    for (const table of tables) {
      rowCount += Number(
        (this.database.connection
          .prepare(`SELECT COUNT(*) AS count FROM "${table}"`)
          .get() as { count: number }).count,
      );
    }

    return {
      format: "world.db",
      packageVersion: this.database.metadata("package_version") ?? "0.2.0",
      schemaVersion: Number(this.database.metadata("schema_version") ?? 0),
      databaseType: "world",
      fileName: path.basename(destination),
      sizeBytes: exists ? fs.statSync(destination).size : 0,
      sha256: exists ? sha256File(destination) : "",
      exportedAt: new Date().toISOString(),
      tableCount: tables.length,
      rowCount,
    };
  }
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
