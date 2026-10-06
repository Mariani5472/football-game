import type { ForeignKey, SqlKey, SqlRow, SqlValue, TableSchema } from "../database/Database.js";
import { WorldDatabase } from "../database/world/WorldDatabase.js";

export interface TemplateRelationOption {
  table: string;
  depth: number;
  required: boolean;
  direction: "parent" | "child" | "related";
}

export interface TemplateRecord {
  id: number;
  name: string;
  rootTable: string;
  sourceKey: SqlKey;
  relations: string[];
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Snapshot {
  rootTable: string;
  rootKey: SqlKey;
  relations: string[];
  rows: Record<string, SqlRow[]>;
}

interface StoredTemplate {
  id: number;
  name: string;
  root_table: string;
  source_key: string;
  relations_json: string;
  snapshot_json: string;
  created_at: string;
  updated_at: string;
}

const REQUIRED_PARENT_RELATIONS: Record<string, string[]> = {
  player: ["person"],
  club: ["team"],
};

const IGNORED_TABLES = new Set(["database_metadata", "editor_template"]);

function keyFromRow(schema: TableSchema, row: SqlRow): SqlKey {
  if (schema.primaryKey.length === 1) return row[schema.primaryKey[0]] as SqlValue;
  return Object.fromEntries(schema.primaryKey.map(column => [column, row[column] as SqlValue]));
}

function keyToken(table: string, key: SqlKey): string {
  return table + ":" + JSON.stringify(key);
}

function groupedForeignKeys(schema: TableSchema) {
  const groups = new Map<number, ForeignKey[]>();
  for (const fk of schema.foreignKeys) {
    const list = groups.get(fk.id) ?? [];
    list.push(fk);
    groups.set(fk.id, list);
  }
  return [...groups.values()].map(group => group.sort((a, b) => a.sequence - b.sequence));
}

export class WorldTemplateService {
  constructor(private readonly database: WorldDatabase) {}

  private schema(table: string): TableSchema {
    return this.database.tableSchema(table);
  }

  private allSchemas(): Map<string, TableSchema> {
    return new Map(
      this.database.listTables()
        .filter(table => !IGNORED_TABLES.has(table))
        .map(table => [table, this.schema(table)]),
    );
  }

  relationOptions(rootTable: string, rootKey: SqlKey): TemplateRelationOption[] {
    const schemas = this.allSchemas();
    const root = schemas.get(rootTable);
    if (!root) throw new Error(`Tabela não encontrada: ${rootTable}`);
    if (!this.database.findById(rootTable, rootKey)) throw new Error(`Registro não encontrado: ${rootTable}`);

    const options = new Map<string, TemplateRelationOption>();
    const queue: Array<{ table: string; depth: number }> = [{ table: rootTable, depth: 0 }];
    const visited = new Set<string>([rootTable]);

    while (queue.length) {
      const current = queue.shift()!;
      if (current.depth >= 3) continue;

      for (const [table, schema] of schemas) {
        if (table === rootTable) continue;

        const parent = schema.foreignKeys.some(fk => fk.table === current.table);
        const child = schemas.get(current.table)?.foreignKeys.some(fk => fk.table === table) ?? false;
        if (!parent && !child) continue;

        if (!options.has(table)) {
          options.set(table, {
            table,
            depth: current.depth + 1,
            required: REQUIRED_PARENT_RELATIONS[rootTable]?.includes(table) ?? false,
            direction: parent && child ? "related" : parent ? "child" : "parent",
          });
        }

        if (!visited.has(table)) {
          visited.add(table);
          queue.push({ table, depth: current.depth + 1 });
        }
      }
    }

    for (const required of REQUIRED_PARENT_RELATIONS[rootTable] ?? []) {
      if (!options.has(required)) {
        options.set(required, { table: required, depth: 1, required: true, direction: "parent" });
      }
    }

    return [...options.values()].sort((a, b) =>
      Number(b.required) - Number(a.required) || a.depth - b.depth || a.table.localeCompare(b.table),
    );
  }

  private isConnected(
    table: string,
    row: SqlRow,
    captured: Map<string, Map<string, SqlRow>>,
    schemas: Map<string, TableSchema>,
  ): boolean {
    const schema = schemas.get(table)!;

    for (const group of groupedForeignKeys(schema)) {
      const targetTable = group[0]?.table;
      if (!targetTable || !captured.has(targetTable)) continue;
      const targetSchema = schemas.get(targetTable)!;
      const targetKey: SqlKey = targetSchema.primaryKey.length === 1
        ? row[group[0].from] as SqlValue
        : Object.fromEntries(group.map(fk => [fk.to, row[fk.from] as SqlValue]));
      if (targetSchema.primaryKey.length === 1) {
        const key = targetKey as SqlValue;
        if (key === null || key === undefined) continue;
        if (captured.get(targetTable)?.has(keyToken(targetTable, key))) return true;
      } else {
        const key = targetKey as Record<string, SqlValue>;
        if (Object.values(key).some(value => value === null || value === undefined)) continue;
        if (captured.get(targetTable)?.has(keyToken(targetTable, key))) return true;
      }
    }

    for (const [capturedTable, rows] of captured) {
      const capturedSchema = schemas.get(capturedTable)!;
      for (const capturedRow of rows.values()) {
        const currentKey = keyFromRow(schemas.get(table)!, row);
        if (rowReferencesWithSchemas(capturedRow, capturedSchema, table, currentKey, schemas)) return true;
      }
    }

    return false;
  }

  private captureSnapshot(rootTable: string, rootKey: SqlKey, relations: string[]): Snapshot {
    const schemas = this.allSchemas();
    if (!schemas.has(rootTable)) throw new Error(`Tabela não encontrada: ${rootTable}`);
    const root = this.database.findById<SqlRow>(rootTable, rootKey);
    if (!root) throw new Error(`Registro não encontrado: ${rootTable}`);

    const selected = new Set([
      rootTable,
      ...(REQUIRED_PARENT_RELATIONS[rootTable] ?? []),
      ...relations.filter(table => schemas.has(table) && table !== rootTable),
    ]);

    const captured = new Map<string, Map<string, SqlRow>>();
    const add = (table: string, row: SqlRow) => {
      const schema = schemas.get(table)!;
      const token = keyToken(table, keyFromRow(schema, row));
      const rows = captured.get(table) ?? new Map<string, SqlRow>();
      if (!rows.has(token)) {
        rows.set(token, row);
        captured.set(table, rows);
        return true;
      }
      return false;
    };

    add(rootTable, root);

    for (const parentTable of REQUIRED_PARENT_RELATIONS[rootTable] ?? []) {
      const rootSchema = schemas.get(rootTable)!;
      const parentGroups = groupedForeignKeys(rootSchema).filter(group => group[0]?.table === parentTable);
      for (const group of parentGroups) {
        const parentSchema = schemas.get(parentTable)!;
        const parentKey = parentSchema.primaryKey.length === 1
          ? root[group[0].from] as SqlValue
          : Object.fromEntries(group.map(fk => [fk.to, root[fk.from] as SqlValue]));
        if (parentKey !== null && parentKey !== undefined) {
          const parent = this.database.findById<SqlRow>(parentTable, parentKey);
          if (parent) add(parentTable, parent);
        }
      }
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (const table of selected) {
        const rows = this.database.connection
          .prepare(`SELECT * FROM "${table}"`)
          .all() as SqlRow[];

        for (const row of rows) {
          if (this.isConnected(table, row, captured, schemas)) {
            changed = add(table, row) || changed;
          }
        }
      }
    }

    const snapshotRows: Record<string, SqlRow[]> = {};
    for (const [table, rows] of captured) snapshotRows[table] = [...rows.values()];

    return { rootTable, rootKey, relations: [...selected].filter(table => table !== rootTable), rows: snapshotRows };
  }

  createTemplate(name: string, rootTable: string, rootKey: SqlKey, relations: string[]): TemplateRecord {
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error("Template name is required.");

    const snapshot = this.captureSnapshot(rootTable, rootKey, relations);
    const now = new Date().toISOString();

    const result = this.database.connection.prepare(
      `INSERT INTO editor_template (name, root_table, source_key, relations_json, snapshot_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      normalizedName,
      rootTable,
      JSON.stringify(rootKey),
      JSON.stringify(snapshot.relations),
      JSON.stringify(snapshot),
      now,
      now,
    );

    return this.getTemplate(Number(result.lastInsertRowid));
  }

  listTemplates(): TemplateRecord[] {
    return (this.database.connection
      .prepare("SELECT * FROM editor_template ORDER BY updated_at DESC, id DESC")
      .all() as StoredTemplate[]).map(row => this.toTemplateRecord(row));
  }

  getTemplate(id: number): TemplateRecord {
    const row = this.database.connection
      .prepare("SELECT * FROM editor_template WHERE id = ?")
      .get(id) as StoredTemplate | undefined;
    if (!row) throw new Error(`Template não encontrado: ${id}`);
    return this.toTemplateRecord(row);
  }

  deleteTemplate(id: number): boolean {
    return this.database.connection
      .prepare("DELETE FROM editor_template WHERE id = ?")
      .run(id).changes > 0;
  }

  duplicateFromSource(rootTable: string, rootKey: SqlKey, relations: string[] = []) {
    return this.database.transaction(() => {
      const snapshot = this.captureSnapshot(rootTable, rootKey, relations);
      return this.instantiate(snapshot);
    });
  }

  duplicateFromTemplate(templateId: number) {
    const row = this.database.connection
      .prepare("SELECT * FROM editor_template WHERE id = ?")
      .get(templateId) as StoredTemplate | undefined;
    if (!row) throw new Error(`Template não encontrado: ${templateId}`);
    const snapshot = JSON.parse(row.snapshot_json) as Snapshot;
    return this.database.transaction(() => this.instantiate(snapshot));
  }

  private instantiate(snapshot: Snapshot) {
    const schemas = this.allSchemas();
    const mappings = new Map<string, SqlKey>();
    const rows = Object.entries(snapshot.rows).flatMap(([table, tableRows]) =>
      tableRows.map(row => ({ table, row })),
    );

    const newKeys = new Map<string, SqlKey>();
    const nextIds = new Map<string, number>();

    for (const { table, row } of rows) {
      const schema = schemas.get(table)!;
      if (schema.primaryKey.length !== 1) continue;

      const pk = schema.primaryKey[0];
      const column = schema.columns.find(candidate => candidate.name === pk)!;
      if (!/^INTEGER$/i.test(column.type)) continue;

      const next = nextIds.get(table) ??
        Number((this.database.connection.prepare(`SELECT COALESCE(MAX("${pk}"), 0) + 1 AS next_id FROM "${table}"`).get() as { next_id: number }).next_id);
      nextIds.set(table, next + 1);
      newKeys.set(keyToken(table, keyFromRow(schema, row)), next);
    }

    for (const { table, row } of rows) {
      const schema = schemas.get(table)!;
      const oldKey = keyFromRow(schema, row);
      const token = keyToken(table, oldKey);
      if (schema.primaryKey.length === 1 && newKeys.has(token)) {
        mappings.set(token, newKeys.get(token)!);
      }
    }

    for (const { table, row } of rows) {
      const schema = schemas.get(table)!;
      const oldKey = keyFromRow(schema, row);
      const token = keyToken(table, oldKey);
      let mappedPk: SqlKey | null;
      if (schema.primaryKey.length === 1) {
        const pk = schema.primaryKey[0];
        const mappedForeign = this.findMappedForeignValue(schema, pk, oldKey as SqlValue, mappings, schemas);
        mappedPk = mappedForeign !== undefined
          ? mappedForeign
          : newKeys.get(token) ?? this.remapKey(schema, oldKey, mappings, schemas);
      } else {
        mappedPk = this.remapKey(schema, oldKey, mappings, schemas);
      }
      if (mappedPk === null || mappedPk === undefined) {
        throw new Error(`Não foi possível gerar uma nova PK para ${table}.`);
      }
      mappings.set(token, mappedPk);
    }

    const insertRows = rows.map(({ table, row }) => {
      const schema = schemas.get(table)!;
      const values: Record<string, SqlValue | undefined> = {};

      for (const column of schema.columns) {
        if (column.primaryKey && schema.primaryKey.length === 1 && /^INTEGER$/i.test(column.type)) {
          values[column.name] = mappings.get(keyToken(table, keyFromRow(schema, row))) as SqlValue;
        } else {
          values[column.name] = row[column.name] as SqlValue;
        }
      }

      for (const group of groupedForeignKeys(schema)) {
        const targetTable = group[0]?.table;
        if (!targetTable) continue;
        const targetSchema = schemas.get(targetTable)!;
        const targetKey: SqlKey = targetSchema.primaryKey.length === 1
          ? row[group[0].from] as SqlValue
          : Object.fromEntries(group.map(fk => [fk.to, row[fk.from] as SqlValue]));
        const mapped = mappings.get(keyToken(targetTable, targetKey));
        if (mapped === undefined) continue;

        if (targetSchema.primaryKey.length === 1) {
          values[group[0].from] = mapped as SqlValue;
        } else if (typeof mapped === "object" && mapped !== null) {
          for (const fk of group) values[fk.from] = (mapped as Record<string, SqlValue>)[fk.to];
        }
      }

      return { table, values };
    });

    for (const { table, values } of insertRows) {
      const schema = schemas.get(table)!;
      this.ensureUniqueValues(table, values, schema);
      const columns = Object.keys(values);
      this.database.connection
        .prepare(
          `INSERT INTO "${table}" (${columns.map(column => `"${column}"`).join(", ")})
           VALUES (${columns.map(() => "?").join(", ")})`,
        )
        .run(...columns.map(column => values[column] ?? null));
    }

    const rootSchema = schemas.get(snapshot.rootTable)!;
    const rootNewKey = mappings.get(keyToken(snapshot.rootTable, snapshot.rootKey));
    if (rootNewKey === undefined) throw new Error("Root template key was not generated.");

    return {
      rootTable: snapshot.rootTable,
      oldKey: snapshot.rootKey,
      newKey: rootNewKey,
      rowsCreated: rows.length,
    };
  }

  private ensureUniqueValues(
    table: string,
    values: Record<string, SqlValue | undefined>,
    schema: TableSchema,
  ): void {
    const textColumns = schema.columns
      .filter(column => /TEXT|CHAR|CLOB/i.test(column.type))
      .map(column => column.name);

    if (!schema.uniqueColumns.length || !textColumns.length) return;

    for (let attempt = 0; attempt < 100; attempt++) {
      let changed = false;

      for (const uniqueColumns of schema.uniqueColumns) {
        const candidateValues = uniqueColumns.map(column => values[column]);
        if (candidateValues.some(value => value === null || value === undefined)) continue;

        const where = uniqueColumns.map(column => `"${column}" = ?`).join(" AND ");
        const exists = this.database.connection
          .prepare(`SELECT 1 FROM "${table}" WHERE ${where} LIMIT 1`)
          .get(...candidateValues);

        if (!exists) continue;

        const renameColumn = textColumns.find(column => uniqueColumns.includes(column) && typeof values[column] === "string");
        if (!renameColumn) continue;

        const base = String(values[renameColumn]);
        values[renameColumn] = attempt === 0
          ? `${base} Copy`
          : `${base} Copy ${attempt + 1}`;
        changed = true;
        break;
      }

      if (!changed) return;
    }

    throw new Error(`Não foi possível gerar valores únicos para a cópia de ${table}.`);
  }

  private remapKey(
    schema: TableSchema,
    oldKey: SqlKey,
    mappings: Map<string, SqlKey>,
    schemas: Map<string, TableSchema>,
  ): SqlKey | null {
    if (schema.primaryKey.length === 1) {
      const pk = schema.primaryKey[0];
      const mapped = this.findMappedForeignValue(schema, pk, oldKey as SqlValue, mappings, schemas);
      if (mapped !== undefined) return mapped;
      const column = schema.columns.find(candidate => candidate.name === pk)!;
      if (/INTEGER/i.test(column.type)) {
        const next = Number((this.database.connection.prepare(`SELECT COALESCE(MAX("${pk}"), 0) + 1 AS next_id FROM "${schema.name}"`).get() as { next_id: number }).next_id);
        return next;
      }
      throw new Error(`PK ${schema.name}.${pk} não possui gerador automático.`);
    }

    const oldRecord = oldKey as Record<string, SqlValue>;
    const mappedRecord: Record<string, SqlValue> = {};
    let changed = false;

    for (const pk of schema.primaryKey) {
      const value = this.findMappedForeignValue(schema, pk, oldRecord[pk], mappings, schemas);
      mappedRecord[pk] = value ?? oldRecord[pk];
      changed = changed || value !== undefined;
    }

    if (!changed) return null;
    return mappedRecord;
  }

  private findMappedForeignValue(
    schema: TableSchema,
    column: string,
    value: SqlValue,
    mappings: Map<string, SqlKey>,
    schemas: Map<string, TableSchema>,
  ): SqlValue | undefined {
    for (const group of groupedForeignKeys(schema)) {
      const fk = group.find(item => item.from === column);
      if (!fk || group.length !== 1) continue;
      const targetSchema = schemas.get(fk.table)!;
      const targetKey: SqlKey = value;
      const mapped = mappings.get(keyToken(fk.table, targetKey));
      if (mapped === undefined) continue;
      if (isCompositeSqlKey(mapped)) return mapped[targetSchema.primaryKey[0]] as SqlValue;
      return mapped as SqlValue;
    }
    return undefined;
  }

  private remapForeignValue(
    table: string,
    value: SqlValue,
    column: string,
    schema: TableSchema,
    mappings: Map<string, SqlKey>,
    schemas: Map<string, TableSchema>,
  ): SqlValue {
    if (value === null || value === undefined) return value;
    for (const group of groupedForeignKeys(schema)) {
      if (group.length !== 1 || group[0].from !== column) continue;
      const fk = group[0];
      const mapped = mappings.get(keyToken(fk.table, value));
      if (mapped === undefined) return value;
      if (isCompositeSqlKey(mapped)) {
        const targetSchema = schemas.get(fk.table)!;
        return mapped[targetSchema.primaryKey[0]] as SqlValue;
      }
      return mapped as SqlValue;
    }
    return value;
  }

  private toTemplateRecord(row: StoredTemplate): TemplateRecord {
    const snapshot = JSON.parse(row.snapshot_json) as Snapshot;
    return {
      id: row.id,
      name: row.name,
      rootTable: row.root_table,
      sourceKey: JSON.parse(row.source_key) as SqlKey,
      relations: JSON.parse(row.relations_json) as string[],
      rowCount: Object.values(snapshot.rows).reduce((total, current) => total + current.length, 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

function rowReferencesWithSchemas(
  row: SqlRow,
  schema: TableSchema,
  targetTable: string,
  targetKey: SqlKey,
  schemas: Map<string, TableSchema>,
): boolean {
  const targetSchema = schemas.get(targetTable)!;
  for (const group of groupedForeignKeys(schema)) {
    if (group[0]?.table !== targetTable) continue;
    const values = group.map(fk => row[fk.from] as SqlValue);
    const candidate: SqlKey = targetSchema.primaryKey.length === 1
      ? values[0]
      : Object.fromEntries(group.map((fk, index) => [fk.to, values[index]]));
    if (JSON.stringify(candidate) === JSON.stringify(targetKey)) return true;
  }
  return false;
}

function isCompositeSqlKey(value: SqlKey): value is Record<string, SqlValue> {
  return typeof value === "object" && value !== null && !Buffer.isBuffer(value) && !(value instanceof Uint8Array);
}
