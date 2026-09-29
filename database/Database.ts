import DatabaseConnection from "better-sqlite3";

export type TransactionCallback<T> = () => T;
export type SqlValue = string | number | bigint | null | Buffer | Uint8Array;
export type SqlRow = Record<string, unknown>;

export interface TableColumn {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: unknown;
  primaryKey: boolean;
}

export interface ForeignKey {
  id: number;
  sequence: number;
  table: string;
  from: string;
  to: string;
  onUpdate: string;
  onDelete: string;
}

export interface TableSchema {
  name: string;
  columns: TableColumn[];
  primaryKey: string[];
  foreignKeys: ForeignKey[];
  uniqueColumns: string[][];
  checks: string[];
}

export interface ListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  searchColumns?: string[];
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
}

export interface ListResult<T extends SqlRow = SqlRow> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export abstract class Database {
  protected constructor(
    protected readonly db: DatabaseConnection.Database,
  ) {
    this.db.pragma("foreign_keys = ON");
  }

  get connection(): DatabaseConnection.Database {
    return this.db;
  }

  execute(sql: string): DatabaseConnection.RunResult {
    return this.db.prepare(sql).run();
  }

  transaction<T>(callback: TransactionCallback<T>): T {
    return this.db.transaction(callback)();
  }

  tableExists(table: string): boolean {
    this.assertIdentifier(table);
    return Boolean(
      this.db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
      ).get(table),
    );
  }

  listTables(): string[] {
    return (
      this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      ).all() as Array<{ name: string }>
    ).map((row) => row.name);
  }

  tableSchema(table: string): TableSchema {
    this.assertIdentifier(table);

    if (!this.tableExists(table)) {
      throw new Error(`Tabela não encontrada: ${table}`);
    }

    const info = this.db.prepare(
      `PRAGMA table_info("${table}")`,
    ).all() as Array<{
      name: string;
      type: string;
      notnull: number;
      dflt_value: unknown;
      pk: number;
    }>;

    const fkRows = this.db.prepare(
      `PRAGMA foreign_key_list("${table}")`,
    ).all() as Array<{
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
      on_update: string;
      on_delete: string;
    }>;

    const ddl = (
      this.db.prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
      ).get(table) as { sql: string | null } | undefined
    )?.sql ?? "";

    const uniqueIndexes = this.db.prepare(
      `PRAGMA index_list("${table}")`,
    ).all() as Array<{
      name: string;
      unique: number;
      origin: string;
    }>;

    const uniqueColumns = uniqueIndexes
      .filter((index) => index.unique === 1 && index.origin !== "pk")
      .map((index) => (
        this.db.prepare(
          `PRAGMA index_info("${index.name}")`,
        ).all() as Array<{ name: string }>
      ).map((column) => column.name));

    for (const column of info) {
      const matcher = new RegExp(
        `^[\\s\\`"]*${column.name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s+[^,]*\\bUNIQUE\\b`,
        "i",
      );

      if (matcher.test(ddl)) uniqueColumns.push([column.name]);
    }

    const checks = [...ddl.matchAll(/CHECK\\s*\\(([^()]*)\\)/gi)]
      .map((match) => match[1].trim());

    return {
      name: table,
      columns: info.map((column) => ({
        name: column.name,
        type: column.type,
        notNull: column.notnull === 1,
        defaultValue: column.dflt_value,
        primaryKey: column.pk > 0,
      })),
      primaryKey: info
        .filter((column) => column.pk > 0)
        .sort((a, b) => a.pk - b.pk)
        .map((column) => column.name),
      foreignKeys: fkRows.map((fk) => ({
        id: fk.id,
        sequence: fk.seq,
        table: fk.table,
        from: fk.from,
        to: fk.to,
        onUpdate: fk.on_update,
        onDelete: fk.on_delete,
      })),
      uniqueColumns,
      checks,
    };
  }

  close(): void {
    if (this.db.open) this.db.close();
  }

  private assertIdentifier(identifier: string): void {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
      throw new Error(`Identificador SQL inválido: ${identifier}`);
    }
  }
}
