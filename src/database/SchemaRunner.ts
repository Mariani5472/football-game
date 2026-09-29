import fs from "node:fs";

import type { Database } from "@/database/Database.js";

interface MetadataOptions {
  schemaVersion: number;
  databaseType: "world" | "save";
}

export class SchemaRunner {
  constructor(
    private readonly database: Database,
  ) {}

  run(filePath: string): void {
    const sql = fs.readFileSync(filePath, "utf8");

    const statements = this.splitStatements(sql);

    this.database.transaction(() => {
      for (const [index, statement] of statements.entries()) {
        try {
          this.database.execute(statement);
        } catch (error) {
          throw new Error(
            [`[SchemaRunner] Falha ao executar statement ${index + 1}/${statements.length}.`,
              "", "SQL:", statement, "", "Erro original:",
            error instanceof Error
              ? error.message
              : String(error),
            ].join("\n"),
          );
        }
      }
    });
  }

  initializeMetadata(options: MetadataOptions): void {
    this.database.execute(`
      CREATE TABLE IF NOT EXISTS database_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    const insert = this.database.connection.prepare(`
      INSERT INTO database_metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key)
      DO UPDATE SET value = excluded.value
    `);

    insert.run(
      "schema_version",
      String(options.schemaVersion),
    );

    insert.run(
      "database_type",
      options.databaseType,
    );

    insert.run(
      "created_at",
      new Date().toISOString(),
    );
  }

  private splitStatements(sql: string): string[] {
    const statements: string[] = [];

    let current = "";

    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    let inBracketIdentifier = false;

    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const next = sql[i + 1];

      if (inLineComment) {
        current += char;

        if (char === "\n") {
          inLineComment = false;
        }

        continue;
      }

      if (inBlockComment) {
        current += char;

        if (char === "*" && next === "/") {
          current += next;
          i++;
          inBlockComment = false;
        }

        continue;
      }

      if (
        !inSingleQuote &&
        !inDoubleQuote &&
        !inBacktick &&
        !inBracketIdentifier
      ) {
        if (char === "-" && next === "-") {
          current += char;
          current += next;

          i++;
          inLineComment = true;

          continue;
        }

        if (char === "/" && next === "*") {
          current += char;
          current += next;

          i++;
          inBlockComment = true;

          continue;
        }
      }

      if (char === "'" && !inDoubleQuote && !inBacktick && !inBracketIdentifier) {
        if (inSingleQuote && next === "'") {
          current += char;
          current += next;

          i++;

          continue;
        }

        inSingleQuote = !inSingleQuote;

        current += char;

        continue;
      }

      if (char === '"' && !inSingleQuote && !inBacktick && !inBracketIdentifier) {
        if (inDoubleQuote && next === '"') {
          current += char;
          current += next;

          i++;

          continue;
        }

        inDoubleQuote = !inDoubleQuote;

        current += char;

        continue;
      }

      if (char === "`" && !inSingleQuote && !inDoubleQuote && !inBracketIdentifier) {
        inBacktick = !inBacktick;

        current += char;

        continue;
      }

      if (char === "[" && !inSingleQuote && !inDoubleQuote && !inBacktick) {
        inBracketIdentifier = true;

        current += char;

        continue;
      }

      if (char === "]" && inBracketIdentifier) {
        inBracketIdentifier = false;

        current += char;

        continue;
      }

      if (
        char === ";" &&
        !inSingleQuote &&
        !inDoubleQuote &&
        !inBacktick &&
        !inBracketIdentifier
      ) {
        const statement = current.trim();

        if (statement.length > 0) {
          statements.push(statement);
        }

        current = "";

        continue;
      }

      current += char;
    }

    const lastStatement = current.trim();

    if (lastStatement.length > 0) {
      statements.push(lastStatement);
    }

    return statements;
  }
}