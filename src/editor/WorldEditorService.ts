import path from "node:path";
import { WorldDatabase } from "../database/world/WorldDatabase.js";
import type { ListOptions, SqlKey, SqlRow, SqlValue, TableSchema } from "../database/Database.js";

export interface WorldEditorServiceOptions {
  filePath: string;
  createIfMissing?: boolean;
}

export class WorldEditorService {
  private readonly database: WorldDatabase;

  constructor(options: WorldEditorServiceOptions) {
    const create = options.createIfMissing ?? false;

    this.database = create
      ? WorldDatabase.create(path.resolve(options.filePath))
      : WorldDatabase.open(path.resolve(options.filePath));
  }

  list<T extends SqlRow = SqlRow>(table: string, options?: ListOptions) {
    return this.database.list<T>(table, options);
  }

  findById<T extends SqlRow = SqlRow>(table: string, id: SqlValue) {
    return this.database.findById<T>(table, id);
  }

  tableSchema(table: string): TableSchema {
    return this.database.tableSchema(table);
  }

  tables(): string[] {
    return this.database.listTables();
  }

  create<T extends SqlRow = SqlRow>(
    table: string,
    values: Record<string, SqlValue | undefined>,
  ) {
    return this.database.create<T>(table, values);
  }

  update<T extends SqlRow = SqlRow>(
    table: string,
    id: SqlKey,
    values: Record<string, SqlValue | undefined>,
  ) {
    return this.database.update<T>(table, id, values);
  }

  delete(table: string, id: SqlKey): boolean {
    return this.database.delete(table, id);
  }

  close(): void {
    this.database.close();
  }
}