import type { SqlValue, TableSchema } from "../database/Database.js";
import type { WorldDatabase } from "../database/world/WorldDatabase.js";

export interface CsvImportRow { line: number; values: Record<string, unknown> }
export interface CsvImportIssue { line: number; message: string }
export interface CsvPreview { table: string; total: number; valid: number; errors: CsvImportIssue[] }

const RESERVED_TABLES = new Set(["database_metadata"]);
const INTERNAL_TABLES = new Set([
  "world_package", "world_package_load_order", "world_package_provides", "world_package_dependency",
  "world_package_conflict", "world_package_version_history", "world_entity_identity", "world_entity_provenance",
  "world_attribute_provenance", "world_import_session", "world_import_id_map", "world_import_conflict",
]);

export class CsvImportService {
  constructor(private readonly database: WorldDatabase) {}

  preview(table: string, rows: CsvImportRow[]): CsvPreview {
    const schema = this.editableSchema(table);
    if (new Set(rows.map(row => row.line)).size !== rows.length) throw new Error("CSV rows must have unique source line numbers.");
    const errors: CsvImportIssue[] = [];
    const normalized = rows.map(row => {
      try { return this.normalizeRow(schema, row.values); }
      catch (error) { errors.push({ line: row.line, message: error instanceof Error ? error.message : String(error) }); return null; }
    });
    this.detectDuplicateValues(schema, rows, normalized, errors);
    this.detectExistingUniqueValues(schema, rows, normalized, errors);
    this.validateForeignKeys(schema, rows, normalized, errors);
    return { table, total: rows.length, valid: rows.length - new Set(errors.map(issue => issue.line)).size, errors };
  }

  import(table: string, rows: CsvImportRow[]): { imported: number; errors: CsvImportIssue[] } {
    const schema = this.editableSchema(table);
    const preview = this.preview(table, rows);
    const rejected = new Set(preview.errors.map(issue => issue.line));
    const errors = [...preview.errors];
    const imported = this.database.transaction(() => {
      let count = 0;
      for (const row of rows) {
        if (rejected.has(row.line)) continue;
        try {
          const values = this.normalizeRow(schema, row.values);
          this.database.transaction(() => this.database.create(table, values));
          count++;
        } catch (error) { errors.push({ line: row.line, message: error instanceof Error ? error.message : String(error) }); }
      }
      return count;
    });
    return { imported, errors };
  }

  private editableSchema(table: string): TableSchema {
    if (RESERVED_TABLES.has(table) || INTERNAL_TABLES.has(table) || table.startsWith("sqlite_") || table.startsWith("editor_")) throw new Error(`CSV import is not available for table ${table}.`);
    return this.database.tableSchema(table);
  }

  private normalizeRow(schema: TableSchema, input: Record<string, unknown>): Record<string, SqlValue | undefined> {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Row values must be an object.");
    const columns = new Map(schema.columns.map(column => [column.name, column]));
    const unknown = Object.keys(input).filter(name => !columns.has(name));
    if (unknown.length) throw new Error(`Unknown column(s): ${unknown.join(", ")}.`);
    const output: Record<string, SqlValue | undefined> = {};
    for (const column of schema.columns) {
      const raw = input[column.name];
      if (raw === undefined || raw === "") {
        if (column.notNull && column.defaultValue == null && !column.primaryKey) throw new Error(`${column.name} is required.`);
        if ((column.primaryKey && schema.primaryKey.length === 1) || column.defaultValue != null || column.notNull) continue;
        output[column.name] = null;
        continue;
      }
      if (raw === null) {
        if (column.notNull && column.defaultValue == null) throw new Error(`${column.name} is required.`);
        output[column.name] = null; continue;
      }
      if (typeof raw !== "string" && typeof raw !== "number" && typeof raw !== "bigint" && typeof raw !== "boolean") throw new Error(`${column.name} has an unsupported value.`);
      const value = typeof raw === "string" ? raw.trim() : raw;
      const type = column.type.toUpperCase();
      if (/INT/.test(type)) {
        const parsed = typeof value === "number" ? value : Number(value);
        if (!Number.isSafeInteger(parsed)) throw new Error(`${column.name} must be a whole number.`);
        output[column.name] = parsed;
      } else if (/REAL|FLOA|DOUB|NUM|DEC/.test(type)) {
        const parsed = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(parsed)) throw new Error(`${column.name} must be numeric.`);
        output[column.name] = parsed;
      } else if (/BLOB/.test(type)) throw new Error(`${column.name} cannot be imported from CSV.`);
      else output[column.name] = String(value);
    }
    return output;
  }

  private detectDuplicateValues(schema: TableSchema, rows: CsvImportRow[], normalized: Array<Record<string, SqlValue | undefined> | null>, errors: CsvImportIssue[]): void {
    const badLines = new Set(errors.map(issue => issue.line));
    for (const unique of [...schema.uniqueColumns, ...(schema.primaryKey.length ? [schema.primaryKey] : [])]) {
      const seen = new Map<string, number>();
      for (let index = 0; index < rows.length; index++) {
        const values = normalized[index];
        if (!values || badLines.has(rows[index].line)) continue;
        const keyValues = unique.map(column => values[column]);
        if (keyValues.some(value => value == null)) continue;
        const key = JSON.stringify(keyValues);
        const firstLine = seen.get(key);
        if (firstLine !== undefined) errors.push({ line: rows[index].line, message: `Duplicate value for unique columns: ${unique.join(", ")} (also on line ${firstLine}).` });
        else seen.set(key, rows[index].line);
      }
    }
  }

  private detectExistingUniqueValues(schema: TableSchema, rows: CsvImportRow[], normalized: Array<Record<string, SqlValue | undefined> | null>, errors: CsvImportIssue[]): void {
    const badLines = new Set(errors.map(issue => issue.line));
    const uniqueSets = [...schema.uniqueColumns, ...(schema.primaryKey.length ? [schema.primaryKey] : [])];
    for (let index = 0; index < rows.length; index++) {
      const values = normalized[index];
      if (!values || badLines.has(rows[index].line)) continue;
      for (const unique of uniqueSets) {
        const selected = unique.map(column => values[column]);
        if (selected.some(value => value == null || value === undefined)) continue;
        const where = unique.map(column => `"${column}" = ?`).join(" AND ");
        const exists = this.database.connection.prepare(`SELECT 1 FROM "${schema.name}" WHERE ${where} LIMIT 1`).get(...selected);
        if (exists) errors.push({ line: rows[index].line, message: `Value already exists for unique columns: ${unique.join(", ")}.` });
      }
    }
  }

  private validateForeignKeys(schema: TableSchema, rows: CsvImportRow[], normalized: Array<Record<string, SqlValue | undefined> | null>, errors: CsvImportIssue[]): void {
    const constraints = new Map<number, typeof schema.foreignKeys>();
    for (const fk of schema.foreignKeys) constraints.set(fk.id, [...(constraints.get(fk.id) ?? []), fk]);
    const badLines = new Set(errors.map(issue => issue.line));
    for (let index = 0; index < rows.length; index++) {
      const values = normalized[index];
      if (!values || badLines.has(rows[index].line)) continue;
      for (const foreignKey of constraints.values()) {
        const ordered = [...foreignKey].sort((left, right) => left.sequence - right.sequence);
        const fromValues = ordered.map(item => values[item.from]);
        if (fromValues.some(value => value == null || value === undefined)) continue;
        const targetTable = ordered[0].table;
        const targetColumns = ordered.map(item => item.to);
        const where = targetColumns.map(column => `"${column}" = ?`).join(" AND ");
        const exists = this.database.connection.prepare(`SELECT 1 FROM "${targetTable}" WHERE ${where} LIMIT 1`).get(...fromValues);
        if (!exists) errors.push({ line: rows[index].line, message: `Referenced ${targetTable} record does not exist (${ordered.map(item => item.from).join(", ")}).` });
      }
    }
  }
}
