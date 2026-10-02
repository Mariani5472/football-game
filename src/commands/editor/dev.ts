import path from "node:path";
import { spawn } from "node:child_process";
import { createEditorApiServer } from "../../editor/EditorApiServer.js";

const databasePath = path.resolve(
  process.cwd(),
  process.argv[2] ?? "save/world.db",
);

const server = createEditorApiServer({
  databasePath,
  port: 4179,
});

server.listen(4179, "localhost", () => {
  console.log("[editor] API: http://localhost:4179/api");
  console.log("[editor] World DB:", databasePath);

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const vite = spawn(
    npmCommand,
    ["run", "dev", "--", "--host", "localhost"],
    {
      cwd: path.resolve(process.cwd(), "src/apps/editor"),
      stdio: "inherit",
      shell: false,
    },
  );

  const shutdown = () => {
    vite.kill();
    server.close();
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  vite.once("exit", (code) => {
    server.close();
    process.exit(code ?? 0);
  });
});
