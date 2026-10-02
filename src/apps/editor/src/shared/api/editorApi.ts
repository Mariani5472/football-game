const API_BASE = import.meta.env.VITE_EDITOR_API_BASE ?? "http://127.0.0.1:4179/api";

export type Scalar = string | number | boolean | null;
export type EntityRow = Record<string, Scalar>;
export type EntityKey = string | number | Record<string, Scalar>;

export interface ListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  searchColumns?: string[];
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
}

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
  sourceKey: EntityKey;
  relations: string[];
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListResult<T extends EntityRow = EntityRow> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API_BASE + path, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Editor API is unavailable. Start the editor API against a world.db.");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Editor API request failed.");
  return body as T;
}

function serializeEntityKey(id: EntityKey): string {
  return typeof id === "object" ? JSON.stringify(id) : String(id);
}

function queryString(options: ListOptions): string {
  const params = new URLSearchParams();
  if (options.page !== undefined) params.set("page", String(options.page));
  if (options.pageSize !== undefined) params.set("pageSize", String(options.pageSize));
  if (options.search) params.set("search", options.search);
  if (options.searchColumns?.length) params.set("searchColumns", options.searchColumns.join(","));
  if (options.orderBy) params.set("orderBy", options.orderBy);
  if (options.orderDirection) params.set("orderDirection", options.orderDirection);
  const value = params.toString();
  return value ? "?" + value : "";
}

export const editorApi = {
  health: () => request<{ ok: boolean; databasePath: string; exists: boolean }>("/health"),
  tables: () => request<{ tables: string[] }>("/tables"),
  schema: (table: string) => request<unknown>("/schema/" + encodeURIComponent(table)),
  list: <T extends EntityRow = EntityRow>(table: string, options: ListOptions = {}) =>
    request<ListResult<T>>("/entities/" + encodeURIComponent(table) + queryString(options)),
  get: <T extends EntityRow = EntityRow>(table: string, id: EntityKey) =>
    request<T | null>("/entities/" + encodeURIComponent(table) + "/" + encodeURIComponent(serializeEntityKey(id))),
  create: <T extends EntityRow = EntityRow>(table: string, values: Record<string, Scalar>) =>
    request<T>("/entities/" + encodeURIComponent(table), {
      method: "POST",
      body: JSON.stringify(values),
    }),
  update: <T extends EntityRow = EntityRow>(
    table: string,
    id: EntityKey,
    values: Record<string, Scalar>,
  ) =>
    request<T>(
      "/entities/" +
        encodeURIComponent(table) +
        "/" +
        encodeURIComponent(serializeEntityKey(id)),
      {
        method: "PATCH",
        body: JSON.stringify(values),
      },
    ),
  templateRelations: (rootTable: string, rootKey: EntityKey) =>
    request<{ relations: TemplateRelationOption[] }>(
      "/templates/relations?rootTable=" +
        encodeURIComponent(rootTable) +
        "&rootKey=" +
        encodeURIComponent(serializeEntityKey(rootKey)),
    ),
  templates: () => request<{ templates: TemplateRecord[] }>("/templates"),
  createTemplate: (payload: {
    name: string;
    rootTable: string;
    rootKey: EntityKey;
    relations: string[];
  }) =>
    request<TemplateRecord>("/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  duplicate: (payload: {
    rootTable: string;
    rootKey: EntityKey;
    relations: string[];
  }) =>
    request<{ rootTable: string; oldKey: EntityKey; newKey: EntityKey; rowsCreated: number }>(
      "/duplicate",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  duplicateTemplate: (id: number) =>
    request<{ rootTable: string; oldKey: EntityKey; newKey: EntityKey; rowsCreated: number }>(
      "/templates/" + id + "/duplicate",
      { method: "POST" },
    ),
  deleteTemplate: (id: number) =>
    request<{ deleted: boolean }>("/templates/" + id, { method: "DELETE" }),
  domainTransfer: (payload: unknown) => request<unknown>("/domain/transfer", { method: "POST", body: JSON.stringify(payload) }),
  domainContract: (payload: unknown) => request<unknown>("/domain/contract", { method: "POST", body: JSON.stringify(payload) }),
  domainFinance: (payload: unknown) => request<unknown>("/domain/finance", { method: "POST", body: JSON.stringify(payload) }),
  domainHistory: (payload: unknown) => request<unknown>("/domain/history", { method: "POST", body: JSON.stringify(payload) }),
  domainAwardHistory: (payload: unknown) => request<unknown>("/domain/award-history", { method: "POST", body: JSON.stringify(payload) }),
  domainPressSource: (payload: unknown) => request<unknown>("/domain/press-source", { method: "POST", body: JSON.stringify(payload) }),
  domainClimateProfile: (payload: unknown) => request<unknown>("/domain/climate-profile", { method: "POST", body: JSON.stringify(payload) }),
  domainAward: (payload: unknown) => request<unknown>("/domain/award", { method: "POST", body: JSON.stringify(payload) }),
  domainPlayerCareer: (payload: unknown) => request<unknown>("/domain/player-career", { method: "POST", body: JSON.stringify(payload) }),
  domainStaffCareer: (payload: unknown) => request<unknown>("/domain/staff-career", { method: "POST", body: JSON.stringify(payload) }),
  domainAchievement: (payload: unknown) => request<unknown>("/domain/achievement", { method: "POST", body: JSON.stringify(payload) }),
  domainRecord: (payload: unknown) => request<unknown>("/domain/record", { method: "POST", body: JSON.stringify(payload) }),
  domainDerby: (payload: unknown) => request<unknown>("/domain/derby", { method: "POST", body: JSON.stringify(payload) }),
  domainClimateRegion: (payload: unknown) => request<unknown>("/domain/climate-region", { method: "POST", body: JSON.stringify(payload) }),
  domainWeatherSeason: (payload: unknown) => request<unknown>("/domain/weather-season", { method: "POST", body: JSON.stringify(payload) }),
  domainNationalityRule: (payload: unknown) => request<unknown>("/domain/nationality-rule", { method: "POST", body: JSON.stringify(payload) }),
  validationProfiles: () => request<{ profiles: Array<{ id: number; name: string; description: string | null; enabled: boolean }> }>("/validation/profiles"),
  exportWorldDb: (outputPath: string) => request<{
    metadata: { format: string; packageVersion: string; schemaVersion: number; databaseType: string; fileName: string; sizeBytes: number; sha256: string; exportedAt: string; tableCount: number; rowCount: number };
    outputPath: string;
    blocked: boolean;
    issues: Array<{ severity: "ERROR" | "WARNING"; ruleKey: string; message: string }>;
  }>("/export/world-db", { method: "POST", body: JSON.stringify({ outputPath }) }),
  runValidation: (profileId?: number) => request<{ issues: Array<{
    id: string; ruleKey: string; severity: "ERROR" | "WARNING" | "INFO"; entityType: string; entityId?: string | number; message: string; details?: string;
  }> }>(`/validation/run${profileId ? `?profile=${profileId}` : ""}`, { method: "POST" }),
  setValidationProfileEnabled: (id: number, enabled: boolean) =>
    request<{ id: number; name: string; description: string | null; enabled: boolean }>(`/validation/profiles/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  setValidationRuleEnabled: (ruleKey: string, enabled: boolean) =>
    request<{ ok: boolean }>(`/validation/rules/${encodeURIComponent(ruleKey)}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),

  remove: (table: string, id: EntityKey) =>
    request<{ deleted: boolean }>(
      "/entities/" +
        encodeURIComponent(table) +
        "/" +
        encodeURIComponent(serializeEntityKey(id)),
      { method: "DELETE" },
    ),
};
