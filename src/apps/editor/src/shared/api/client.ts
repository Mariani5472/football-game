import type { EntityKey, ListOptions } from "./types";

export const API_BASE = import.meta.env.VITE_EDITOR_API_BASE ?? "/api";

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

export function serializeEntityKey(id: EntityKey): string {
  return typeof id === "object" ? JSON.stringify(id) : String(id);
}

export function queryString(options: ListOptions): string {
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
