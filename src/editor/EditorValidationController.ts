import http from "node:http";
import type { WorldEditorService } from "./WorldEditorService.js";
import { isRecord, readJsonBody, routeParts, sendJson } from "./EditorHttp.js";

export async function handleValidationRequest(request: http.IncomingMessage, response: http.ServerResponse, service: WorldEditorService): Promise<boolean> {
  const parts = routeParts(request);
  if (parts[0] !== "api" || parts[1] !== "validation") return false;
  if (request.method === "GET" && parts[2] === "profiles" && parts[3] === undefined) { sendJson(response, 200, { profiles: service.validationProfiles() }); return true; }
  if (request.method === "POST" && parts[2] === "run" && parts[3] === undefined) {
    const profile = new URL(request.url ?? "/", "http://localhost").searchParams.get("profile");
    const profileId = profile === null ? undefined : positiveInteger(profile, "profile");
    sendJson(response, 200, { issues: service.validate(profileId) }); return true;
  }
  if (request.method === "PATCH" && parts[2] === "profiles" && parts[3] && parts[4] === undefined) {
    const body = await readJsonBody(request);
    if (!isRecord(body) || (body.enabled !== undefined && typeof body.enabled !== "boolean")) throw new Error("enabled must be a boolean.");
    sendJson(response, 200, service.setValidationProfileEnabled(positiveInteger(parts[3], "profileId"), body.enabled !== false)); return true;
  }
  if (request.method === "PATCH" && parts[2] === "rules" && parts[3] && parts[4] === undefined) {
    const body = await readJsonBody(request);
    if (!isRecord(body) || (body.enabled !== undefined && typeof body.enabled !== "boolean")) throw new Error("enabled must be a boolean.");
    service.setValidationRuleEnabled(parts[3], body.enabled !== false);
    sendJson(response, 200, { ok: true }); return true;
  }
  return false;
}

function positiveInteger(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer.`);
  return parsed;
}
