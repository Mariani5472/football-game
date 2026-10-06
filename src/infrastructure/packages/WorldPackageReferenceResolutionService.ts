import type { PackageTableInfo } from "./WorldPackageTypes.js";

export type PackageRow = Record<string, unknown>;
export interface ImportedRowResult { created: boolean; updated: boolean; skipped: boolean }
export interface PackageApplySummary { processed: number; created: number; updated: number; skipped: number }

export class UnresolvedForeignKeyError extends Error {
  constructor(readonly tableName: string, readonly columnName: string, readonly targetTable: string, readonly targetKey: string) {
    super(`Unresolved foreign key ${tableName}.${columnName} -> ${targetTable} ${targetKey}`);
    this.name = "UnresolvedForeignKeyError";
  }
}

/** Retries rows whose references depend on rows that have not been applied yet. */
export class WorldPackageReferenceResolutionService {
  apply(options: {
    tables: PackageTableInfo[];
    loadRows: (tableName: string) => PackageRow[];
    applyRow: (table: PackageTableInfo, row: PackageRow) => ImportedRowResult;
    unresolvedMessage: (pending: Map<string, PackageRow[]>) => string;
  }): PackageApplySummary {
    const pending = new Map<string, PackageRow[]>();
    for (const table of options.tables) pending.set(table.name, options.loadRows(table.name));

    const summary: PackageApplySummary = { processed: 0, created: 0, updated: 0, skipped: 0 };
    let progress = true;
    while (pending.size > 0 && progress) {
      progress = false;
      for (const [tableName, pendingRows] of Array.from(pending.entries())) {
        const table = options.tables.find(candidate => candidate.name === tableName);
        if (!table) {
          pending.delete(tableName);
          continue;
        }

        const next: PackageRow[] = [];
        for (const row of pendingRows) {
          try {
            const result = options.applyRow(table, row);
            summary.processed += 1;
            if (result.created) summary.created += 1;
            if (result.updated) summary.updated += 1;
            if (result.skipped) summary.skipped += 1;
            progress = true;
          } catch (error) {
            if (!(error instanceof UnresolvedForeignKeyError)) throw error;
            next.push(row);
          }
        }

        if (next.length === 0) pending.delete(tableName);
        else pending.set(tableName, next);
      }
    }

    if (pending.size > 0) throw new Error(options.unresolvedMessage(pending));
    return summary;
  }
}

