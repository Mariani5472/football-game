import type { PackageTableInfo } from "./WorldPackageTypes.js";

export interface WorldTableShape {
  columns: Array<{ name: string }>;
  primaryKey: string[];
}

/** Validates package structure against the World schema while allowing package-only identity UUID columns. */
export class WorldPackageSchemaService {
  private static readonly PACKAGE_ONLY_COLUMNS = new Set(["uuid"]);

  validateCompatibleTables(
    tables: Map<string, PackageTableInfo>,
    hasWorldTable: (table: string) => boolean,
    getWorldTable: (table: string) => WorldTableShape,
  ): void {
    for (const table of tables.values()) {
      if (!hasWorldTable(table.name)) {
        throw new Error(
          "Package table is not part of World schema: " +
            table.name,
        );
      }

      const worldSchema = getWorldTable(table.name);
      const worldColumns = new Set(
        worldSchema.columns.map(
          column => column.name,
        ),
      );

      for (const column of table.columns) {
        if (
          !worldColumns.has(column.name) &&
          !WorldPackageSchemaService.PACKAGE_ONLY_COLUMNS.has(
            column.name,
          )
        ) {
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

  orderTables(
    tables: Map<string, PackageTableInfo>,
  ): PackageTableInfo[] {
    const entries =
      Array.from(tables.values());
    const names = new Set(
      entries.map(table => table.name),
    );
    const dependencies =
      new Map<string, Set<string>>();

    for (const table of entries) {
      dependencies.set(
        table.name,
        new Set(
          table.foreignKeys
            .filter(
              fk =>
                fk.table !==
                  table.name &&
                names.has(fk.table),
            )
            .map(
              fk => fk.table,
            ),
        ),
      );
    }

    const result: PackageTableInfo[] = [];
    const remaining =
      new Set(
        entries.map(
          table => table.name,
        ),
      );

    while (remaining.size > 0) {
      const ready =
        Array.from(remaining)
          .filter(name =>
            Array.from(
              dependencies.get(name) ??
                [],
            ).every(dep =>
              result.some(
                table =>
                  table.name === dep,
              ),
            ),
          )
          .sort();

      if (ready.length === 0) {
        for (const name of
          Array.from(remaining).sort()) {
          result.push(
            tables.get(name)!,
          );
          remaining.delete(name);
        }
        continue;
      }

      for (const name of ready) {
        result.push(
          tables.get(name)!,
        );
        remaining.delete(name);
      }
    }

    return result;
  }
}
