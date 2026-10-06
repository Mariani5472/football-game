import type { WorldDatabase } from "./WorldDatabase.js";
import { BASE_PACKAGE_PRIORITY } from "./WorldBasePackageDefinition.js";

export interface DefaultDataPackage {
  packageKey: string;
  version: string;
  priority: number;
  sourceFile: string | null;
  sourceSha256: string | null;
  categories: string[];
  provides: string[];
  importedEntities: number;
  attributedValues: number;
  sourceHashRecorded: boolean;
}

export class DefaultDataRepository {
  constructor(private readonly database: WorldDatabase) {}

  get(): DefaultDataPackage | null {
    const row = this.database.connection
      .prepare(
        "SELECT id,package_key AS packageKey,version,priority,source_file AS sourceFile,source_sha256 AS sourceSha256,categories_json AS categoriesJson FROM world_package WHERE lower(package_key)='world.base' LIMIT 1",
      )
      .get() as Record<string, unknown> | undefined;

    if (!row) return null;

    if (
      Number(row.priority) !==
      BASE_PACKAGE_PRIORITY
    ) {
      throw new Error(
        "Base default-data package must keep priority 0.",
      );
    }

    const id = Number(row.id);
    const importedEntities =
      this.database.tableExists(
        "world_entity_provenance",
      )
        ? Number(
            (
              this.database.connection
                .prepare(
                  "SELECT COUNT(DISTINCT table_name || ':' || row_key) AS count FROM world_entity_provenance WHERE package_id=?",
                )
                .get(id) as { count: number }
            ).count,
          )
        : 0;

    return {
      packageKey: String(row.packageKey),
      version: String(row.version),
      priority: Number(row.priority),
      sourceFile:
        row.sourceFile == null
          ? null
          : String(row.sourceFile),
      sourceSha256:
        row.sourceSha256 == null
          ? null
          : String(row.sourceSha256),
      categories: parseArray(row.categoriesJson),
      provides:
        this.database.tableExists(
          "world_package_provides",
        )
          ? (
              this.database.connection
                .prepare(
                  "SELECT provide_key FROM world_package_provides WHERE package_id=? ORDER BY provide_key",
                )
                .all(id) as Array<{
                provide_key: string;
              }>
            ).map(
              item => item.provide_key,
            )
          : [],
      importedEntities,
      attributedValues:
        this.database.tableExists(
          "world_attribute_provenance",
        )
          ? Number(
              (
                this.database.connection
                  .prepare(
                    "SELECT COUNT(*) AS count FROM world_attribute_provenance WHERE package_id=?",
                  )
                  .get(id) as { count: number }
              ).count,
            )
          : 0,
      sourceHashRecorded: Boolean(
        row.sourceFile &&
          row.sourceSha256,
      ),
    };
  }
}

function parseArray(value: unknown): string[] {
  try {
    const parsed: unknown = JSON.parse(
      String(value ?? "[]"),
    );
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is string =>
            typeof item === "string",
        )
      : [];
  } catch {
    return [];
  }
}
