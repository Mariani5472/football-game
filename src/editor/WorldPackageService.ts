import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { WorldDatabase } from "../database/world/WorldDatabase.js";

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
