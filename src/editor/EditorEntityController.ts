import http from "node:http";
import type { ListOptions, SqlKey, SqlValue } from "../database/Database.js";
import type { WorldEditorService } from "./WorldEditorService.js";
import { isRecord, readJsonBody, routeParts, sendJson } from "./EditorHttp.js";

function parseKey(value: string): SqlKey {
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { throw new Error("Entity ID is malformed."); }
  if (!decoded.startsWith("{")) return decoded;
  try { return JSON.parse(decoded) as Record<string, SqlValue>; }
  catch { return decoded; }
}

export async function handleEntityRequest(request: http.IncomingMessage, response: http.ServerResponse, service: WorldEditorService): Promise<boolean> {
  const parts = routeParts(request);
  if (parts[0] !== "api" || parts[1] !== "entities" || !parts[2]) return false;
  const table = parts[2];

  if (parts[3] === "csv") {
    if (request.method !== "POST" || parts[5] !== undefined) return false;
    const body = await readJsonBody(request);
    if (!isRecord(body) || !Array.isArray(body.rows)) throw new Error("rows must be an array.");
    const rows = body.rows.map((row, index) => {
      if (!isRecord(row) || !Number.isInteger(Number(row.line)) || Number(row.line) < 1 || !isRecord(row.values)) throw new Error(`Row ${index + 1} must include a positive integer line and values object.`);
      return { line: Number(row.line), values: row.values };
    });
    if (parts[4] === "preview") { sendJson(response, 200, service.previewCsvImport(table, rows)); return true; }
    if (parts[4] === "import") { sendJson(response, 200, service.importCsv(table, rows)); return true; }
    return false;
  }
  const id = parts[3];
  if (request.method === "GET" && id === undefined) {
    const url = new URL(request.url ?? "/", "http://localhost");
    const searchColumns = url.searchParams.get("searchColumns");
    const page = queryInteger(url.searchParams.get("page"), 1, "page");
    const requestedPageSize = queryInteger(url.searchParams.get("pageSize"), 25, "pageSize");
    const options: ListOptions = {
      page,
      pageSize: Math.min(100, requestedPageSize),
      search: url.searchParams.get("search") ?? undefined,
      searchColumns: searchColumns ? searchColumns.split(",").filter(Boolean) : undefined,
      orderBy: url.searchParams.get("orderBy") ?? undefined,
      orderDirection: url.searchParams.get("orderDirection") === "DESC" ? "DESC" : "ASC",
    };
    sendJson(response, 200, service.list(table, options)); return true;
  }
  if (request.method === "GET" && id !== undefined) { sendJson(response, 200, service.findById(table, parseKey(id)) ?? null); return true; }
  if (request.method === "POST" && id === undefined) {
    const body = await readJsonBody(request);
    if (!isRecord(body)) throw new Error("Entity body must be an object.");
    sendJson(response, 201, service.create(table, body as Record<string, SqlValue | undefined>)); return true;
  }
  if (request.method === "PATCH" && id !== undefined) {
    const body = await readJsonBody(request);
    if (!isRecord(body)) throw new Error("Entity body must be an object.");
    sendJson(response, 200, service.update(table, parseKey(id), body as Record<string, SqlValue | undefined>)); return true;
  }
  if (request.method === "DELETE" && id !== undefined) { sendJson(response, 200, { deleted: service.delete(table, parseKey(id)) }); return true; }
  return false;
}




function queryInteger(value: string | null, fallback: number, label: string): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive integer.`);
  return parsed;
}
