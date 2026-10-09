import http from "node:http";
import type { ConflictPolicy } from "../infrastructure/packages/WorldPackageTypes.js";
import type { WorldEditorService } from "./WorldEditorService.js";
import { isRecord, readJsonBody, routeParts, requiredString, sendJson } from "./EditorHttp.js";

const CONFLICT_POLICIES = new Set<ConflictPolicy>(["REPLACE", "MERGE", "KEEP_EXISTING", "KEEP_INCOMING", "MANUAL"]);

export async function handleWorldRequest(request: http.IncomingMessage, response: http.ServerResponse, service: WorldEditorService): Promise<boolean> {
  const parts = routeParts(request);
  if (parts[0] !== "api") return false;

  if (parts[1] === "world-import-sessions" && parts[2]) {
    const id = positiveInteger(parts[2], "sessionId");
    const session = service.getImportSession(id);
    if (!session) { sendJson(response, 404, { error: "Import session not found." }); return true; }
    if (request.method === "GET" && parts[3] === "conflicts") {
      sendJson(response, 200, { conflicts: service.importConflicts(id) }); return true;
    }
    if (request.method === "GET" && parts[3] === undefined) { sendJson(response, 200, session); return true; }
    return false;
  }

  if (parts[1] !== "world") return false;
  if (request.method === "GET" && parts[2] === undefined) { sendJson(response, 200, service.dashboard()); return true; }
  if (request.method === "GET" && parts[2] === "default-data" && parts[3] === undefined) { sendJson(response, 200, service.getDefaultData()); return true; }
  if (request.method === "GET" && parts[2] === "settings" && parts[3] === undefined) { sendJson(response, 200, service.worldSettings()); return true; }
  if (request.method === "PATCH" && parts[2] === "settings" && parts[3] === undefined) {
    const body = await readJsonBody(request);
    if (!isRecord(body)) throw new Error("World settings must be an object.");
    const name = requiredString(body, "name");
    const year = integer(body.year, "year");
    sendJson(response, 200, service.updateWorldSettings(name, year)); return true;
  }
  if (request.method === "GET" && parts[2] === "fast-start" && parts[3] === "scenarios" && parts[4] === undefined) {
    sendJson(response, 200, { scenarios: service.fastStartScenarios() });
    return true;
  }

  if (request.method === "POST" && parts[2] === "fast-start" && parts[3] === undefined) {
    const body = await readJsonBody(request);
    if (!isRecord(body) || !["EMPTY", "SANDBOX", "BRAZIL"].includes(String(body.template))) throw new Error("template must be EMPTY, SANDBOX or BRAZIL.");
    const seasonYear = integer(body.seasonYear, "seasonYear");
    sendJson(response, 201, service.fastStart(body.template as "EMPTY" | "SANDBOX" | "BRAZIL", seasonYear));
    return true;
  }
  if (request.method === "GET" && parts[2] === "build" && parts[3] === undefined) { sendJson(response, 200, service.worldBuild()); return true; }
  if (request.method === "POST" && parts[2] === "rebuild" && parts[3] === undefined) { sendJson(response, 200, service.rebuildWorld()); return true; }
  if (request.method === "GET" && parts[2] === "packages" && parts[3] === undefined) { sendJson(response, 200, { packages: service.listPackages() }); return true; }
  if (parts[2] !== "packages") return false;

  if (request.method === "POST" && parts[3] === "upload" && parts[4] === undefined) {
    const body = await readJsonBody(request);
    if (!isRecord(body)) throw new Error("Package upload must be an object.");
    const fileName = requiredString(body, "fileName");
    const contentBase64 = requiredString(body, "contentBase64");
    if (!isValidBase64(contentBase64)) throw new Error("contentBase64 must contain valid base64 data.");
    sendJson(response, 201, service.uploadPackage(fileName, contentBase64)); return true;
  }
  if (request.method === "POST" && parts[3] === "inspect" && parts[4] === undefined) {
    const body = await readJsonBody(request);
    if (!isRecord(body)) throw new Error("Package inspection must be an object.");
    sendJson(response, 200, service.inspectPackage(requiredString(body, "sourceFile"))); return true;
  }
  if (request.method === "POST" && parts[3] === "import" && parts[4] === undefined) {
    const body = await readJsonBody(request);
    if (!isRecord(body)) throw new Error("Package import must be an object.");
    const sessionId = positiveInteger(body.sessionId, "sessionId");
    const resolutions: Record<string, ConflictPolicy> = {};
    if (body.resolutions !== undefined) {
      if (!isRecord(body.resolutions)) throw new Error("resolutions must be an object.");
      for (const [key, policy] of Object.entries(body.resolutions)) {
        if (!CONFLICT_POLICIES.has(policy as ConflictPolicy)) throw new Error(`Invalid conflict policy for ${key}.`);
        resolutions[key] = policy as ConflictPolicy;
      }
    }
    sendJson(response, 200, service.importPackage(sessionId, resolutions)); return true;
  }
  if (request.method === "POST" && parts[3] === undefined) {
    const body = await readJsonBody(request);
    if (!isRecord(body)) throw new Error("Package registration must be an object.");
    sendJson(response, 201, service.registerPackage(parseRegisterPackage(body))); return true;
  }
  if (request.method === "PATCH" && parts[3] && parts[4] === undefined) {
    const body = await readJsonBody(request);
    if (!isRecord(body)) throw new Error("Package update must be an object.");
    sendJson(response, 200, service.updatePackage(positiveInteger(parts[3], "packageId"), parsePackageUpdate(body))); return true;
  }
  if (request.method === "DELETE" && parts[3] && parts[4] === undefined) {
    sendJson(response, 200, { deleted: service.removePackage(positiveInteger(parts[3], "packageId")) }); return true;
  }
  return false;
}

function integer(value: unknown, label: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${label} must be an integer.`);
  return parsed;
}

function positiveInteger(value: unknown, label: string): number {
  const parsed = integer(value, label);
  if (parsed <= 0) throw new Error(`${label} must be a positive integer.`);
  return parsed;
}

function isValidBase64(value: string): boolean {
  return value.length > 0 && value.length % 4 === 0 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
}

function parseRegisterPackage(body: Record<string, unknown>): Parameters<WorldEditorService["registerPackage"]>[0] {
  const packageKey = requiredString(body, "packageKey");
  const name = requiredString(body, "name");
  const optionalText = (key: string): string | undefined => {
    const value = body[key];
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") throw new Error(`${key} must be a string.`);
    return value;
  };
  const stringArray = (key: string): string[] | undefined => {
    const value = body[key];
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || !value.every(item => typeof item === "string")) throw new Error(`${key} must be an array of strings.`);
    return value;
  };
  const dependencies = body.dependencies;
  if (dependencies !== undefined && (!Array.isArray(dependencies) || !dependencies.every(item => isRecord(item) && typeof item.key === "string" && (item.minVersion === undefined || item.minVersion === null || typeof item.minVersion === "string")))) throw new Error("dependencies must contain package keys and optional minimum versions.");
  const priority = body.priority === undefined ? undefined : Number(body.priority);
  if (priority !== undefined && !Number.isFinite(priority)) throw new Error("priority must be numeric.");
  const status = body.status;
  if (status !== undefined && !["ACTIVE", "CONFLICT", "ERROR", "DISABLED"].includes(String(status))) throw new Error("status is invalid.");
  return {
    packageKey, name,
    version: optionalText("version"),
    packageType: optionalText("packageType"),
    priority,
    status: status as Parameters<WorldEditorService["registerPackage"]>[0]["status"],
    icon: optionalText("icon"),
    sourceFile: optionalText("sourceFile"),
    sourceSha256: optionalText("sourceSha256"),
    categories: stringArray("categories"),
    description: optionalText("description"),
    provides: stringArray("provides"),
    dependencies: dependencies as Parameters<WorldEditorService["registerPackage"]>[0]["dependencies"],
    conflicts: stringArray("conflicts"),
  };
}

function parsePackageUpdate(body: Record<string, unknown>): Parameters<WorldEditorService["updatePackage"]>[1] {
  if (body.enabled !== undefined && typeof body.enabled !== "boolean") throw new Error("enabled must be a boolean.");
  const priority = body.priority === undefined ? undefined : Number(body.priority);
  if (priority !== undefined && !Number.isFinite(priority)) throw new Error("priority must be numeric.");
  const loadOrder = body.loadOrder === undefined ? undefined : Number(body.loadOrder);
  if (loadOrder !== undefined && (!Number.isInteger(loadOrder) || loadOrder < 0)) throw new Error("loadOrder must be a non-negative integer.");
  return { enabled: body.enabled as boolean | undefined, priority, loadOrder };
}

