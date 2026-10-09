import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import DatabaseConnection from "better-sqlite3";
import type { PackageManifest } from "./WorldPackageTypes.js";
import { DEFAULT_PACKAGE_PRIORITY } from "./WorldPackageTypes.js";

export class WorldPackageSourceRepository {
  constructor(private readonly connection: DatabaseConnection.Database) {}

  resolve(sourceFile: string): string {
    const absolute = path.resolve(sourceFile);
    if (!fs.existsSync(absolute)) {
      throw new Error("Package file not found: " + absolute);
    }
    return absolute;
  }

  sha256(filePath: string): string {
    return crypto
      .createHash("sha256")
      .update(fs.readFileSync(filePath))
      .digest("hex");
  }

  attach(alias: string, sourceFile: string): void {
    const escaped = sourceFile.replaceAll("'", "''");
    this.connection.exec(
      "ATTACH DATABASE '" +
        escaped +
        "' AS " +
        this.quote(alias),
    );
  }

  detach(alias: string): void {
    try {
      this.connection.exec(
        "DETACH DATABASE " +
          this.quote(alias),
      );
    } catch {
      /* The alias may already be detached. */
    }
  }

  readManifest(alias: string): PackageManifest {
    const schema = this.quote(alias);

    const manifestTable = this.connection
      .prepare(
        "SELECT 1 FROM " +
          schema +
          ".sqlite_master WHERE type='table' AND name='package_manifest' LIMIT 1",
      )
      .get();

    if (manifestTable) {
      const row = this.connection
        .prepare(
          "SELECT manifest_json FROM " +
            schema +
            ".package_manifest LIMIT 1",
        )
        .get() as
        | { manifest_json?: string }
        | undefined;

      if (row?.manifest_json) {
        const parsed =
          JSON.parse(row.manifest_json) as Partial<
            PackageManifest
          > & { id?: string };
        const packageKey =
          parsed.packageKey ??
          parsed.id ??
          "";

        return {
          ...parsed,
          id: packageKey,
          packageKey,
          priority:
            parsed.priority ??
            DEFAULT_PACKAGE_PRIORITY,
        } as PackageManifest;
      }
    }

    const metadataTable = this.connection
      .prepare(
        "SELECT 1 FROM " +
          schema +
          ".sqlite_master WHERE type='table' AND name='database_metadata' LIMIT 1",
      )
      .get();

    if (!metadataTable) {
      throw new Error(
        "Package manifest is missing. Expected package_manifest or database_metadata.",
      );
    }

    const metadata = this.connection
      .prepare(
        "SELECT key,value FROM " +
          schema +
          ".database_metadata",
      )
      .all() as Array<{
      key: string;
      value: string;
    }>;

    const values = new Map(
      metadata.map(item => [item.key, item.value]),
    );

    const packageKey =
      values.get("package_key") ??
      values.get("package_id");
    const name = values.get("package_name");

    if (!packageKey || !name) {
      throw new Error(
        "Package manifest is incomplete: package_key and package_name are required.",
      );
    }

    return {
      packageKey,
      name,
      version: values.get("package_version") ?? "1.0.0",
      packageType:
        values.get("package_type") ??
        "CONTENT",
      priority: Number(
        values.get("package_priority") ??
          DEFAULT_PACKAGE_PRIORITY,
      ),
      schemaVersion: Number(
        values.get("schema_version") ?? 0,
      ),
      categories: parseJsonArray(
        values.get("package_categories"),
      ),
      description:
        values.get("package_description") ??
        null,
      provides: parseJsonArray(
        values.get("package_provides"),
      ),
      dependencies: parseJsonDependencies(
        values.get("package_dependencies"),
      ),
      conflicts: parseJsonArray(
        values.get("package_conflicts"),
      ),
    };
  }

  private quote(identifier: string): string {
    if (
      !/^[A-Za-z_][A-Za-z0-9_]*$/.test(
        identifier,
      )
    ) {
      throw new Error(
        "Invalid SQLite identifier: " + identifier,
      );
    }

    return '"' + identifier + '"';
  }
}

function parseJsonArray(
  value: string | undefined,
): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map(String)
      : [];
  } catch {
    return [];
  }
}

function parseJsonDependencies(
  value: string | undefined,
): Array<{
  key: string;
  minVersion?: string | null;
}> {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(item => ({
        key: String(item?.key ?? ""),
        minVersion:
          item?.minVersion == null
            ? null
            : String(item.minVersion),
      }))
      .filter(item => item.key.length > 0);
  } catch {
    return [];
  }
}
