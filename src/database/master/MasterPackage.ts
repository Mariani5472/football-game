import fs from "node:fs";

import type Database from "better-sqlite3";

interface MysqlInsert {
  table: string;
  columns: string[];
  rows: unknown[][];
}

export class MasterPackage {
  constructor(private readonly db: Database.Database) {}

  importFile(filePath: string): void {
    const sql = fs.readFileSync(
      filePath,
      "utf8",
    );

    const inserts = this.parseInserts(sql);
    this.importInserts(inserts);
  }

  private importInserts(inserts: MysqlInsert[]): void {
    for (const insert of inserts) {
      this.importInsert(insert);
    }
  }

  private importInsert(insert: MysqlInsert): void {
    // const supported = new Set([
    //   "competition",
    //   "competition_season",
    //   "team",
    //   "competition_team",
    // ]);

    // if (!supported.has(insert.table)) {
    //   return;
    // }

    const table = insert.table;
    const columns = insert.columns;
    const placeholders = columns.map(() => "?").join(", ");
    const statement = this.db.prepare(`
        INSERT OR IGNORE INTO ${table} (
          ${columns.join(", ")}
        )
        VALUES (
          ${placeholders}
        )
      `);

    const transaction = this.db.transaction(() => {
      for (let rowIndex = 0; rowIndex < insert.rows.length; rowIndex++) {
        const row = insert.rows[rowIndex];

        try {
          statement.run(...row);
        } catch (error) {
          throw new Error(
            [
              `[MasterPackage] Failed to import row`,
              ``,
              `Table: ${table}`,
              `Row: ${rowIndex + 1}`,
              ``,
              `Columns:`,
              `  ${columns.join(", ")}`,
              ``,
              `Values:`,
              `  ${JSON.stringify(row)}`,
              ``,
              `SQL:`,
              `  INSERT INTO ${table} (${columns.join(", ")})`,
              `  VALUES (${row.map((value) => JSON.stringify(value)).join(", ")})`,
              ``,
              `Original error:`,
              `  ${error instanceof Error ? error.message : String(error)}`,
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

  private parseInserts(sql: string): MysqlInsert[] {
    const results: MysqlInsert[] = [];
    const regex = /INSERT INTO [`"]?(\w+)[`"]?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(sql))) {
      const table = match[1];
      const columns = match[2]
        .split(",")
        .map((column) => column.trim().replace(/[`"]/g, ""));

      const values = this.parseValues(match[3]);

      results.push({
        table,
        columns,
        rows: values,
      });
    }

    return results;
  }

  private parseValues(
    valueBlock: string,
  ): unknown[][] {
    const rows: unknown[][] = [];

    let current: unknown[] = [];
    let value = "";

    let inString = false;
    let escaped = false;
    let depth = 0;

    const flushValue = () => {
      const raw = value.trim();

      if (!raw) {
        value = "";
        return;
      }

      current.push(this.parseValue(raw),);
      value = "";
    };

    for (let i = 0; i < valueBlock.length; i++) {
      const char = valueBlock[i];

      if (char === "'" && !escaped) {
        inString = !inString;
        value += char;

        continue;
      }

      if (inString) {
        if (char === "\\" && valueBlock[i + 1] === "'") {
          value += char;
          value += valueBlock[++i];

          continue;
        }

        value += char;

        continue;
      }

      if (char === "(") {
        depth++;

        if (depth === 1) {
          current = [];
          value = "";
          continue;
        }

        value += char;
        continue;
      }

      if (char === ")") {
        depth--;

        if (depth === 0) {
          flushValue();

          rows.push(current);
          current = [];

          continue;
        }

        value += char;
        continue;
      }

      if (char === "," && depth === 1) {
        flushValue();
        continue;
      }

      if (depth === 0) {
        continue;
      }

      value += char;
    }

    return rows;
  }

  private parseValue(raw: string,): unknown {
    const value = raw.trim();

    if (value.toUpperCase() === "NULL") return null;
    if (value.toUpperCase() === "TRUE") return true;
    if (value.toUpperCase() === "FALSE") return false;
    if (value.startsWith("'") && value.endsWith("'")) {
      return value
        .slice(1, -1)
        .replace(/''/g, "'");
    }
    const number = Number(value);
    if (!Number.isNaN(number)) return number;

    return value;
  }
}