import path from "node:path";
import { WorldDatabase } from "../database/world/WorldDatabase.js";
import type { ListOptions, SqlKey, SqlRow, SqlValue, TableSchema } from "../database/Database.js";
import { WorldTemplateService, type TemplateRecord, type TemplateRelationOption } from "./WorldTemplateService.js";

export interface WorldEditorServiceOptions {
  filePath: string;
  createIfMissing?: boolean;
}

export class WorldEditorService {
  private readonly database: WorldDatabase;
  private readonly templatesService: WorldTemplateService;

  constructor(options: WorldEditorServiceOptions) {
    const create = options.createIfMissing ?? false;

    this.database = create
      ? WorldDatabase.create(path.resolve(options.filePath))
      : WorldDatabase.open(path.resolve(options.filePath));
    this.templatesService = new WorldTemplateService(this.database);
  }

  list<T extends SqlRow = SqlRow>(table: string, options?: ListOptions) {
    return this.database.list<T>(table, options);
  }

  findById<T extends SqlRow = SqlRow>(table: string, id: SqlKey) {
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

  templateRelations(rootTable: string, rootKey: SqlKey): TemplateRelationOption[] {
    return this.templatesService.relationOptions(rootTable, rootKey);
  }

  createTemplate(name: string, rootTable: string, rootKey: SqlKey, relations: string[]): TemplateRecord {
    return this.templatesService.createTemplate(name, rootTable, rootKey, relations);
  }

  listTemplates(): TemplateRecord[] {
    return this.templatesService.listTemplates();
  }

  deleteTemplate(id: number): boolean {
    return this.templatesService.deleteTemplate(id);
  }

  duplicateFromSource(rootTable: string, rootKey: SqlKey, relations: string[]) {
    return this.templatesService.duplicateFromSource(rootTable, rootKey, relations);
  }

  duplicateFromTemplate(templateId: number) {
    return this.templatesService.duplicateFromTemplate(templateId);
  }

  close(): void {
    this.database.close();
  }
}