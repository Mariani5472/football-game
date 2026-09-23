import fs from "node:fs";

import type Database from "better-sqlite3";

export class MasterPackage {
  constructor(private readonly db: Database.Database) {}

  importFile(filePath: string): void {
    const sql = fs.readFileSync(filePath, "utf8");

    const statements = this.splitStatements(sql);

    this.executeStatements(statements);
  }

  private executeStatements(statements: string[]): void {
    const transaction = this.db.transaction(() => {
      for (let index = 0; index < statements.length; index++) {
        const originalSql = statements[index];
        if (this.shouldSkipStatement(originalSql)) {
          continue;
        }
        const sql = this.normalizeSql(originalSql);
        try {
          this.db.exec(sql);
        } catch (error) {
          throw new Error(
            [
              `[MasterPackage] Failed to execute SQL statement`,
              ``,
              `Statement: ${index + 1}/${statements.length}`,
              ``,
              `SQL:`,
              sql,
              ``,
              `Original error:`,
              error instanceof Error
                ? error.message
                : String(error),
            ].join("\n"),
            {
              cause: error,
            },
          );
        }
      }
    });

    transaction();
  }

  private normalizeSql(sql: string): string {
    let result = "";
    let inString = false;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];

      if (char === "\\" && inString) {
        const next = sql[i + 1];

        if (next === "'") {
          result += "''";
          i++;

          continue;
        }

        result += next;
        i++;

        continue;
      }

      if (char === "'") {
        if (inString && sql[i + 1] === "'") {
          result += "''";
          i++;

          continue;
        }

        inString = !inString;
        result += char;

        continue;
      }

      result += char;
    }

    return result;
  }

  private splitStatements(sql: string): string[] {
    const statements: string[] = [];

    let current = "";
    let inString = false;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];

      if (char === "\\" && inString) {
        current += char;

        if (i + 1 < sql.length) {
          current += sql[i + 1];
          i++;
        }

        continue;
      }

      if (char === "'") {
        if (inString && sql[i + 1] === "'") {
          current += "''";
          i++;

          continue;
        }

        inString = !inString;
        current += char;

        continue;
      }

      if (char === ";" && !inString) {
        const statement = current.trim();

        if (statement) {
          statements.push(statement);
        }

        current = "";

        continue;
      }

      current += char;
    }

    const lastStatement = current.trim();

    if (lastStatement) {
      statements.push(lastStatement);
    }

    return statements;
  }

  private shouldSkipStatement(sql: string): boolean {
    const normalized = sql
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();

    return (
      normalized.startsWith("SET FOREIGN_KEY_CHECKS") ||
      normalized.startsWith("SET SQL_MODE") ||
      normalized.startsWith("SET NAMES") ||
      normalized.startsWith("SET CHARACTER_SET") ||
      normalized.startsWith("SET COLLATION") ||
      normalized.startsWith("LOCK TABLES") ||
      normalized.startsWith("UNLOCK TABLES")
    );
  }
}