import path from "node:path";

import { createEditorApiServer } from "../../editor/EditorApiServer.js";

const databasePath = path.resolve(
  process.argv[2] ?? "save/world.db",
);

const port = Number(process.argv[3] ?? "4179");

const server = createEditorApiServer({
  databasePath,
  port,
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Editor API listening on http://127.0.0.1:${port}`);
  console.log(`World database: ${databasePath}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);