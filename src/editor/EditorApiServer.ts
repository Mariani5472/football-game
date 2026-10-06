import http from "node:http";
import fs from "node:fs";
import { WorldEditorService } from "./WorldEditorService.js";
import { handleDomainRequest } from "./EditorDomainController.js";
import { handleEntityRequest } from "./EditorEntityController.js";
import { handleEditorResourcesRequest } from "./EditorResourcesController.js";
import { handleValidationRequest } from "./EditorValidationController.js";
import { handleWorldRequest } from "./EditorWorldController.js";
import { EditorHttpError, routeParts, sendJson } from "./EditorHttp.js";

export interface EditorApiServerOptions {
  databasePath: string;
  port?: number;
}

function friendlyDatabaseError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  if (error instanceof EditorHttpError) return { status: error.status, message: error.message };
  if (/UNIQUE constraint failed/i.test(raw)) return { status: 409, message: "This value already exists and must be unique." };
  if (/FOREIGN KEY constraint failed/i.test(raw)) return { status: 409, message: "This record is referenced by another record and cannot be changed or deleted." };
  if (/NOT NULL constraint failed/i.test(raw)) return { status: 422, message: "A required field is missing." };
  if (/CHECK constraint failed/i.test(raw)) return { status: 422, message: "One or more values violate a database rule." };
  if (/not found|does not exist/i.test(raw)) return { status: 404, message: raw };
  return { status: 422, message: raw };
}

export function createEditorApiServer(options: EditorApiServerOptions): http.Server {
  const service = new WorldEditorService({ filePath: options.databasePath, createIfMissing: false });
  const controllers = [handleWorldRequest, handleEditorResourcesRequest, handleValidationRequest, handleDomainRequest, handleEntityRequest] as const;

  const server = http.createServer(async (request, response) => {
    try {
      if (request.method === "OPTIONS") { sendJson(response, 204, null); return; }
      const parts = routeParts(request);
      if (parts[0] !== "api") { sendJson(response, 404, { error: "Not found" }); return; }
      if (parts[1] === "health" && request.method === "GET" && parts[2] === undefined) {
        sendJson(response, 200, { ok: true, databasePath: options.databasePath, exists: fs.existsSync(options.databasePath) });
        return;
      }
      for (const controller of controllers) {
        if (await controller(request, response, service)) return;
      }
      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      const friendly = friendlyDatabaseError(error);
      sendJson(response, friendly.status, { error: friendly.message });
    }
  });

  server.on("close", () => service.close());
  return server;
}
