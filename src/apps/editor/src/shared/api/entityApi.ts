import { queryString, request, serializeEntityKey } from "./client";
import type { EntityKey, EntityRow, ListOptions, ListResult } from "./types";

export interface CsvImportRow { line: number; values: Record<string, unknown> }
export interface CsvImportIssue { line: number; message: string }
export interface CsvPreview { table: string; total: number; valid: number; errors: CsvImportIssue[] }

export const entityApi = {
  health: () => request<{ ok: boolean; databasePath: string; exists: boolean }>("/health"),
  tables: () => request<{ tables: string[] }>("/tables"),
  schema: (table: string) => request<unknown>(`/schema/${encodeURIComponent(table)}`),
  list: <T extends EntityRow = EntityRow>(table: string, options: ListOptions = {}) =>
    request<ListResult<T>>(`/entities/${encodeURIComponent(table)}${queryString(options)}`),
  get: <T extends EntityRow = EntityRow>(table: string, id: EntityKey) =>
    request<T | null>(`/entities/${encodeURIComponent(table)}/${encodeURIComponent(serializeEntityKey(id))}`),
  create: <T extends EntityRow = EntityRow>(table: string, values: Record<string, EntityRow[string]>) =>
    request<T>(`/entities/${encodeURIComponent(table)}`, { method: "POST", body: JSON.stringify(values) }),
  update: <T extends EntityRow = EntityRow>(table: string, id: EntityKey, values: Record<string, EntityRow[string]>) =>
    request<T>(`/entities/${encodeURIComponent(table)}/${encodeURIComponent(serializeEntityKey(id))}`, { method: "PATCH", body: JSON.stringify(values) }),
  remove: (table: string, id: EntityKey) =>
    request<{ deleted: boolean }>(`/entities/${encodeURIComponent(table)}/${encodeURIComponent(serializeEntityKey(id))}`, { method: "DELETE" }),
  previewCsv: (table: string, rows: CsvImportRow[]) =>
    request<CsvPreview>(`/entities/${encodeURIComponent(table)}/csv/preview`, { method: "POST", body: JSON.stringify({ rows }) }),
  importCsv: (table: string, rows: CsvImportRow[]) =>
    request<{ imported: number; errors: CsvImportIssue[] }>(`/entities/${encodeURIComponent(table)}/csv/import`, { method: "POST", body: JSON.stringify({ rows }) }),
};
