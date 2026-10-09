import http from "node:http";
import type { SqlKey, SqlValue } from "../database/Database.js";
import type { WorldEditorService } from "./WorldEditorService.js";
import { isRecord, readJsonBody, routeParts, requiredString, sendJson } from "./EditorHttp.js";

export async function handleEditorResourcesRequest(request: http.IncomingMessage, response: http.ServerResponse, service: WorldEditorService): Promise<boolean> {
  const parts = routeParts(request);
  if (parts[0] !== "api") return false;
  if (parts[1] === "tables" && request.method === "GET" && parts[2] === undefined) { sendJson(response, 200, { tables: service.tables() }); return true; }
  if (parts[1] === "schema" && request.method === "GET" && parts[2] && parts[3] === undefined) { sendJson(response, 200, service.tableSchema(parts[2])); return true; }

  if (parts[1] === "templates") {
    if (request.method === "GET" && parts[2] === undefined) { sendJson(response, 200, { templates: service.listTemplates() }); return true; }
    if (request.method === "GET" && parts[2] === "relations" && parts[3] === undefined) {
      const url = new URL(request.url ?? "/", "http://localhost");
      const rootTable = url.searchParams.get("rootTable");
      const rootKey = url.searchParams.get("rootKey");
      if (!rootTable || rootKey === null) throw new Error("rootTable and rootKey are required.");
      sendJson(response, 200, { relations: service.templateRelations(rootTable, parseKey(rootKey)) }); return true;
    }
    if (request.method === "POST" && parts[2] === undefined) {
      const body = await readJsonBody(request);
      if (!isRecord(body)) throw new Error("Template must be an object.");
      const name = requiredString(body, "name");
      const rootTable = requiredString(body, "rootTable");
      if (body.rootKey === undefined || body.rootKey === null) throw new Error("rootKey is required.");
      if (body.relations !== undefined && (!Array.isArray(body.relations) || !body.relations.every(item => typeof item === "string"))) throw new Error("relations must be an array of table names.");
      sendJson(response, 201, service.createTemplate(name, rootTable, body.rootKey as SqlKey, body.relations ?? [])); return true;
    }
    if (request.method === "POST" && parts[2] && parts[3] === "duplicate" && parts[4] === undefined) { sendJson(response, 201, service.duplicateFromTemplate(positiveInteger(parts[2], "templateId"))); return true; }
    if (request.method === "DELETE" && parts[2] && parts[3] === undefined) { sendJson(response, 200, { deleted: service.deleteTemplate(positiveInteger(parts[2], "templateId")) }); return true; }
    return false;
  }

  if (parts[1] === "duplicate" && request.method === "POST" && parts[2] === undefined) {
    const body = await readJsonBody(request);
    if (!isRecord(body)) throw new Error("Duplicate request must be an object.");
    const rootTable = requiredString(body, "rootTable");
    if (body.rootKey === undefined || body.rootKey === null) throw new Error("rootKey is required.");
    if (body.relations !== undefined && (!Array.isArray(body.relations) || !body.relations.every(item => typeof item === "string"))) throw new Error("relations must be an array of table names.");
    sendJson(response, 201, service.duplicateFromSource(rootTable, body.rootKey as SqlKey, body.relations ?? [])); return true;
  }

  if (parts[1] === "export" && parts[2] === "world-db" && parts[3] === undefined && request.method === "POST") {
    const body = await readJsonBody(request);
    if (!isRecord(body)) throw new Error("Export request must be an object.");
    const result = service.exportWorld(requiredString(body, "outputPath"));
    sendJson(response, result.blocked ? 409 : 201, result); return true;
  }
  return false;
}

function parseKey(value: string): SqlKey {
  if (!value.startsWith("{")) return value;
  try { return JSON.parse(value) as Record<string, SqlValue>; }
  catch { return value; }
}

function positiveInteger(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer.`);
  return parsed;
}
