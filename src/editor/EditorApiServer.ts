import http from "node:http";
import fs from "node:fs";
import { WorldEditorService } from "./WorldEditorService.js";
import type { ListOptions, SqlKey, SqlValue } from "../database/Database.js";

export interface EditorApiServerOptions {
  databasePath: string;
  port?: number;
}

function jsonResponse(response: http.ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(status === 204 ? "" : JSON.stringify(body));
}

async function readBody(request: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Invalid JSON request body.");
  }
}

function routeParts(request: http.IncomingMessage): string[] {
  return new URL(request.url ?? "/", "http://localhost").pathname.split("/").filter(Boolean);
}

function parseEntityKey(value: string): SqlKey {
  const decoded = decodeURIComponent(value);
  if (!decoded.startsWith("{")) return decoded;
  try {
    return JSON.parse(decoded) as Record<string, SqlValue>;
  } catch {
    return decoded;
  }
}

function friendlyDatabaseError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  if (/UNIQUE constraint failed/i.test(raw)) return { status: 409, message: "This value already exists and must be unique." };
  if (/FOREIGN KEY constraint failed/i.test(raw)) return { status: 409, message: "This record is referenced by another record and cannot be changed or deleted." };
  if (/NOT NULL constraint failed/i.test(raw)) return { status: 422, message: "A required field is missing." };
  if (/CHECK constraint failed/i.test(raw)) return { status: 422, message: "One or more values violate a database rule." };
  return { status: 400, message: raw };
}

export function createEditorApiServer(options: EditorApiServerOptions): http.Server {
  const service = new WorldEditorService({
    filePath: options.databasePath,
    createIfMissing: false,
  });

  const server = http.createServer(async (request, response) => {
    try {
      if (request.method === "OPTIONS") {
        jsonResponse(response, 204, null);
        return;
      }

      const parts = routeParts(request);
      if (parts[0] !== "api") {
        jsonResponse(response, 404, { error: "Not found" });
        return;
      }

      if (parts[1] === "health") {
        jsonResponse(response, 200, {
          ok: true,
          databasePath: options.databasePath,
          exists: fs.existsSync(options.databasePath),
        });
        return;
      }

      if (parts[1] === "tables" && request.method === "GET") {
        jsonResponse(response, 200, { tables: service.tables() });
        return;
      }

      if (parts[1] === "schema" && parts[2] && request.method === "GET") {
        jsonResponse(response, 200, service.tableSchema(parts[2]));
        return;
      }

      if (parts[1] === "templates") {
        if (request.method === "GET" && parts[2] === undefined) {
          jsonResponse(response, 200, { templates: service.listTemplates() });
          return;
        }

        if (request.method === "GET" && parts[2] === "relations") {
          const url = new URL(request.url ?? "/", "http://localhost");
          const rootTable = url.searchParams.get("rootTable");
          const rawKey = url.searchParams.get("rootKey");
          if (!rootTable || rawKey === null) throw new Error("rootTable and rootKey are required.");
          jsonResponse(response, 200, {
            relations: service.templateRelations(rootTable, parseEntityKey(rawKey)),
          });
          return;
        }

        if (request.method === "POST" && parts[2] === undefined) {
          const body = (await readBody(request)) as {
            name?: string;
            rootTable?: string;
            rootKey?: SqlKey;
            relations?: string[];
          };
          if (!body.name || !body.rootTable || body.rootKey === undefined) {
            throw new Error("name, rootTable and rootKey are required.");
          }
          jsonResponse(response, 201, service.createTemplate(
            body.name,
            body.rootTable,
            body.rootKey,
            Array.isArray(body.relations) ? body.relations : [],
          ));
          return;
        }

        if (parts[2] && request.method === "POST" && parts[3] === "duplicate") {
          jsonResponse(response, 201, service.duplicateFromTemplate(Number(parts[2])));
          return;
        }

        if (parts[2] && request.method === "DELETE" && parts[3] === undefined) {
          jsonResponse(response, 200, { deleted: service.deleteTemplate(Number(parts[2])) });
          return;
        }
      }

      if (parts[1] === "duplicate" && request.method === "POST") {
        const body = (await readBody(request)) as {
          rootTable?: string;
          rootKey?: SqlKey;
          relations?: string[];
        };
        if (!body.rootTable || body.rootKey === undefined) {
          throw new Error("rootTable and rootKey are required.");
        }
        jsonResponse(response, 201, service.duplicateFromSource(
          body.rootTable,
          body.rootKey,
          Array.isArray(body.relations) ? body.relations : [],
        ));
        return;
      }

      if (parts[1] === "entities" && parts[2]) {
        const table = parts[2];
        const id = parts[3];

        if (request.method === "GET" && id === undefined) {
          const url = new URL(request.url ?? "/", "http://localhost");
          const rawSearchColumns = url.searchParams.get("searchColumns");
          const listOptions: ListOptions = {
            page: Number(url.searchParams.get("page") ?? "1"),
            pageSize: Number(url.searchParams.get("pageSize") ?? "25"),
            search: url.searchParams.get("search") ?? undefined,
            searchColumns: rawSearchColumns ? rawSearchColumns.split(",").filter(Boolean) : undefined,
            orderBy: url.searchParams.get("orderBy") ?? undefined,
            orderDirection: url.searchParams.get("orderDirection") === "DESC" ? "DESC" : "ASC",
          };
          jsonResponse(response, 200, service.list(table, listOptions));
          return;
        }

        if (request.method === "GET" && id !== undefined) {
          jsonResponse(response, 200, service.findById(table, parseEntityKey(id)) ?? null);
          return;
        }

        if (request.method === "POST" && id === undefined) {
          const body = (await readBody(request)) as Record<string, SqlValue | undefined>;
          jsonResponse(response, 201, service.create(table, body));
          return;
        }

        if (request.method === "PATCH" && id !== undefined) {
          const body = (await readBody(request)) as Record<string, SqlValue | undefined>;
          jsonResponse(response, 200, service.update(table, parseEntityKey(id), body));
          return;
        }

        if (request.method === "DELETE" && id !== undefined) {
          jsonResponse(response, 200, { deleted: service.delete(table, parseEntityKey(id)) });
          return;
        }
      }

      jsonResponse(response, 404, { error: "Not found" });
    } catch (error) {
      const friendly = friendlyDatabaseError(error);
      jsonResponse(response, friendly.status, { error: friendly.message });
    }
  });

  server.on("close", () => service.close());
  return server;
}
