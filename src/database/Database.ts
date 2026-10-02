import DatabaseConnection from "better-sqlite3";

export type TransactionCallback<T> = () => T;
export type SqlValue = string | number | bigint | null | Buffer | Uint8Array;
export type SqlKey = SqlValue | Record<string, SqlValue>;
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

  metadata(key: string): string | undefined {
    if (!this.tableExists("database_metadata")) return undefined;
    const row = this.db
      .prepare("SELECT value FROM database_metadata WHERE key = ? LIMIT 1")
      .get(key) as { value: string } | undefined;
    return row?.value;
  }

  setMetadata(key: string, value: string): void {
    this.db
      .prepare(`
        INSERT INTO database_metadata (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `)
      .run(key, value);
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
      this.db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
        )
        .get(table),
    );
  }

  listTables(): string[] {
    return (
      this.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as Array<{ name: string }>
    ).map((row) => row.name);
  }

  tableSchema(table: string): TableSchema {
    this.assertIdentifier(table);

    if (!this.tableExists(table)) {
      throw new Error(`Tabela não encontrada: ${table}`);
    }

    const columns = this.db
      .prepare(`PRAGMA table_info("${table}")`)
      .all() as Array<{
      name: string;
      type: string;
      notnull: number;
      dflt_value: unknown;
      pk: number;
    }>;

    const foreignKeys = this.db
      .prepare(`PRAGMA foreign_key_list("${table}")`)
      .all() as Array<{
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
      on_update: string;
      on_delete: string;
    }>;

    const ddl = (
      this.db
        .prepare(
          "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
        )
        .get(table) as { sql: string | null } | undefined
    )?.sql ?? "";

    const indexes = this.db
      .prepare(`PRAGMA index_list("${table}")`)
      .all() as Array<{
      name: string;
      unique: number;
      origin: string;
    }>;

    const uniqueColumns = indexes
      .filter((index) => index.unique === 1 && index.origin !== "pk")
      .map((index) =>
        (
          this.db.prepare(
            `PRAGMA index_info("${index.name}")`,
          ).all() as Array<{ name: string | null }>
        )
          .map((column) => column.name)
          .filter((name): name is string => name !== null),
      )
      .filter((columns) => columns.length > 0);

    const checks = [...ddl.matchAll(/CHECK\s*\(([^()]*)\)/gi)]
      .map((match) => match[1].trim());

    return {
      name: table,
      columns: columns.map((column) => ({
        name: column.name,
        type: column.type,
        notNull: column.notnull === 1,
        defaultValue: column.dflt_value,
        primaryKey: column.pk > 0,
      })),
      primaryKey: columns
        .filter((column) => column.pk > 0)
        .sort((a, b) => a.pk - b.pk)
        .map((column) => column.name),
      foreignKeys: foreignKeys.map((fk) => ({
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

  list<T extends SqlRow = SqlRow>(
    table: string,
    options: ListOptions = {},
  ): ListResult<T> {
    const schema = this.tableSchema(table);
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));

    const searchableColumns = (
      options.searchColumns?.length
        ? options.searchColumns
        : schema.columns
            .filter((column) => /CHAR|TEXT|CLOB/i.test(column.type))
            .map((column) => column.name)
    ).filter((column) =>
      schema.columns.some((candidate) => candidate.name === column),
    );

    const params: SqlValue[] = [];
    const predicates: string[] = [];

    if (options.search?.trim() && searchableColumns.length) {
      predicates.push(
        searchableColumns
          .map((column) => `CAST("${this.quoteIdentifier(column)}" AS TEXT) LIKE ? COLLATE NOCASE`)
          .join(" OR "),
      );

      for (const column of searchableColumns) {
        void column;
        params.push(`%${options.search.trim()}%`);
      }
    }

    const where = predicates.length
      ? ` WHERE ${predicates.join(" AND ")}`
      : "";

    const totalRow = this.db
      .prepare(
        `SELECT COUNT(*) AS count FROM "${this.quoteIdentifier(table)}"${where}`,
      )
      .get(...params) as { count: number };

    const orderBy =
      options.orderBy &&
      schema.columns.some((column) => column.name === options.orderBy)
        ? options.orderBy
        : schema.primaryKey[0] ?? schema.columns[0]?.name;

    const direction =
      options.orderDirection === "DESC" ? "DESC" : "ASC";

    const offset = (page - 1) * pageSize;

    const rows = this.db
      .prepare(
        `SELECT * FROM "${this.quoteIdentifier(table)}"${where}` +
          (orderBy
            ? ` ORDER BY "${this.quoteIdentifier(orderBy)}" ${direction}`
            : "") +
          " LIMIT ? OFFSET ?",
      )
      .all(...params, pageSize, offset) as T[];

    return {
      rows,
      total: Number(totalRow.count),
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(Number(totalRow.count) / pageSize)),
    };
  }

  findById<T extends SqlRow = SqlRow>(
    table: string,
    id: SqlKey,
  ): T | undefined {
    const schema = this.tableSchema(table);

    const primaryKey = this.buildPrimaryKeyWhere(schema, id);

    return this.db
      .prepare(
        `SELECT * FROM "${this.quoteIdentifier(table)}" WHERE ${primaryKey.where} LIMIT 1`,
      )
      .get(...primaryKey.values) as T | undefined;
  }

  count(
    table: string,
    options: Pick<ListOptions, "search" | "searchColumns"> = {},
  ): number {
    return this.list(table, {
      ...options,
      page: 1,
      pageSize: 1,
    }).total;
  }

  exists(table: string, id: SqlValue): boolean {
    return this.findById(table, id) !== undefined;
  }

  create<T extends SqlRow = SqlRow>(
    table: string,
    values: Record<string, SqlValue | undefined>,
  ): T {
    const normalized = this.normalizeWriteValues(table, values);
    const columns = Object.keys(normalized);

    if (!columns.length) {
      throw new Error(`Nenhum campo informado para criar ${table}`);
    }

    const result = this.db
      .prepare(
        `INSERT INTO "${this.quoteIdentifier(table)}" (${columns
          .map((column) => `"${this.quoteIdentifier(column)}"`)
          .join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      )
      .run(...columns.map((column) => normalized[column] ?? null));

    const primaryKey = this.tableSchema(table).primaryKey;

    if (primaryKey.length === 1) {
      const created = this.findById<T>(
        table,
        result.lastInsertRowid,
      );

      if (!created) {
        throw new Error(`Registro criado mas não encontrado: ${table}`);
      }

      return created;
    }

    return this.db
      .prepare(
        `SELECT * FROM "${this.quoteIdentifier(table)}" WHERE rowid = last_insert_rowid()`,
      )
      .get() as T;
  }

  update<T extends SqlRow = SqlRow>(
    table: string,
    id: SqlKey,
    values: Record<string, SqlValue | undefined>,
  ): T {
    const schema = this.tableSchema(table);

    const primaryKey = this.buildPrimaryKeyWhere(schema, id);
    const key = schema.primaryKey.length === 1 ? schema.primaryKey[0] : undefined;
    const normalized = this.normalizeWriteValues(table, values, key);
    const columns = Object.keys(normalized);

    if (!columns.length) {
      const current = this.findById<T>(table, id);
      if (!current) {
        throw new Error(`Registro não encontrado: ${table}`);
      }
      return current;
    }

    this.db
      .prepare(
        `UPDATE "${this.quoteIdentifier(table)}" SET ${columns
          .map((column) => `"${this.quoteIdentifier(column)}" = ?`)
          .join(", ")} WHERE ${primaryKey.where}`,
      )
      .run(
        ...columns.map((column) => normalized[column] ?? null),
        ...primaryKey.values,
      );

    const updated = this.findById<T>(table, id);

    if (!updated) {
      throw new Error(
        `Registro não encontrado após update: ${table}#${String(id)}`,
      );
    }

    return updated;
  }

  delete(table: string, id: SqlKey): boolean {
    const schema = this.tableSchema(table);
    const primaryKey = this.buildPrimaryKeyWhere(schema, id);

    const result = this.db
      .prepare(
        `DELETE FROM "${this.quoteIdentifier(table)}" WHERE ${primaryKey.where}`,
      )
      .run(...primaryKey.values);

    return result.changes > 0;
  }

  private buildPrimaryKeyWhere(schema: TableSchema, id: SqlKey): { where: string; values: SqlValue[] } {
    if (schema.primaryKey.length === 1 && (typeof id !== "object" || id === null || Buffer.isBuffer(id) || id instanceof Uint8Array)) {
      return { where: `"${this.quoteIdentifier(schema.primaryKey[0])}" = ?`, values: [id as SqlValue] };
    }
    if (typeof id !== "object" || id === null || Buffer.isBuffer(id) || id instanceof Uint8Array) {
      throw new Error(`Chave composta exige objeto: ${schema.name}`);
    }
    const keys = Object.keys(id);
    if (keys.length !== schema.primaryKey.length || schema.primaryKey.some(column => !keys.includes(column))) {
      throw new Error(`Chave primária inválida: ${schema.name}`);
    }
    return {
      where: schema.primaryKey.map(column => `"${this.quoteIdentifier(column)}" = ?`).join(" AND "),
      values: schema.primaryKey.map(column => id[column]),
    };
  }

  private normalizeWriteValues(
    table: string,
    values: Record<string, SqlValue | undefined>,
    excludedColumn?: string,
  ): Record<string, SqlValue> {
    const schema = this.tableSchema(table);
    const columns = new Set(schema.columns.map((column) => column.name));
    const normalized: Record<string, SqlValue> = {};

    for (const [column, value] of Object.entries(values)) {
      if (column === excludedColumn) continue;

      if (!columns.has(column)) {
        throw new Error(`Coluna inválida em ${table}: ${column}`);
      }

      normalized[column] =
        value === undefined ? null : value;
    }

    return normalized;
  }

  private assertIdentifier(identifier: string): void {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
      throw new Error(`Identificador SQL inválido: ${identifier}`);
    }
  }

  private quoteIdentifier(identifier: string): string {
    this.assertIdentifier(identifier);
    return identifier;
  }

  close(): void {
    if (this.db.open) this.db.close();
  }
}