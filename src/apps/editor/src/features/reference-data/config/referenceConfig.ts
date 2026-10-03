import type { CrudEntityConfig } from "../../../shared/components/crud/CrudEntityPage";
import { titleize } from "./referenceTables";

export interface SchemaColumn {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: unknown;
  primaryKey: boolean;
}

export interface SchemaForeignKey {
  table: string;
  from: string;
  to: string;
}

export interface TableSchema {
  name: string;
  columns: SchemaColumn[];
  primaryKey: string[];
  foreignKeys: SchemaForeignKey[];
}

function fieldType(column: SchemaColumn): "text" | "number" | "boolean" {
  if (/INT|REAL|NUM|DEC|FLOAT|DOUBLE/i.test(column.type)) {
    return /is_|has_|allows_|requires_|enabled|weekend|renewable|fixed_|prevent_|participates_/i.test(column.name)
      ? "boolean"
      : "number";
  }
  return "text";
}

export function buildReferenceConfig(schema: TableSchema): CrudEntityConfig {
  const columns = schema.columns.filter(column => !column.primaryKey);
  return {
    table: schema.name,
    title: titleize(schema.name),
    description: "Reference data backed directly by world.db.",
    searchColumns: columns.filter(column => /TEXT|CHAR|CLOB/i.test(column.type)).map(column => column.name),
    columns: columns.map(column => {
      const foreignKey = schema.foreignKeys.find(fk => fk.from === column.name);
      return {
        key: column.name,
        header: titleize(column.name),
        relation: foreignKey ? { table: foreignKey.table } : undefined,
      };
    }),
    fields: columns.map(column => {
      const foreignKey = schema.foreignKeys.find(fk => fk.from === column.name);
      return {
        name: column.name,
        label: titleize(column.name),
        type: fieldType(column),
        required: column.notNull && column.defaultValue == null,
        relation: foreignKey ? { table: foreignKey.table } : undefined,
      };
    }),
    pageSize: 20,
  };
}
