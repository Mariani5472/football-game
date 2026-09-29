const API_BASE = "http://127.0.0.1:4179/api";

export type Scalar = string | number | boolean | null;
export type EntityRow = Record<string, Scalar>;
export interface ListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
}
export interface ListResult<T extends EntityRow = EntityRow> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API_BASE + path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body?.error ?? `Editor API error: HTTP ${response.status}`);
  }

  return body as T;
}

function queryString(options: ListOptions): string {
  const params = new URLSearchParams();
  if (options.page !== undefined) params.set("page", String(options.page));
  if (options.pageSize !== undefined) params.set("pageSize", String(options.pageSize));
  if (options.search) params.set("search", options.search);
  if (options.orderBy) params.set("orderBy", options.orderBy);
  if (options.orderDirection) params.set("orderDirection", options.orderDirection);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const editorApi = {
  health: () => request<{ ok: boolean; databasePath: string; exists: boolean }>("/health"),
  tables: () => request<{ tables: string[] }>("/tables"),
  schema: (table: string) => request<unknown>(`/schema/${encodeURIComponent(table)}`),
  list: <T extends EntityRow = EntityRow>(table: string, options: ListOptions = {}) =>
    request<ListResult<T>>(`/entities/${encodeURIComponent(table)}${queryString(options)}`),
  get: <T extends EntityRow = EntityRow>(table: string, id: string | number) =>
    request<T | null>(`/entities/${encodeURIComponent(table)}/${encodeURIComponent(String(id))}`),
  create: <T extends EntityRow = EntityRow>(table: string, values: Record<string, Scalar>) =>
    request<T>(`/entities/${encodeURIComponent(table)}`, {
      method: "POST",
      body: JSON.stringify(values),
    }),
  update: <T extends EntityRow = EntityRow>(table: string, id: string | number, values: Record<string, Scalar>) =>
    request<T>(`/entities/${encodeURIComponent(table)}/${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      body: JSON.stringify(values),
    }),
  remove: (table: string, id: string | number) =>
    request<{ deleted: boolean }>(
      `/entities/${encodeURIComponent(table)}/${encodeURIComponent(String(id))}`,
      { method: "DELETE" },
    ),
};