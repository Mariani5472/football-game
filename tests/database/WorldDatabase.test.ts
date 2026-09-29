import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { WorldDatabase } from "../../src/database/world/WorldDatabase.js";

const databases: WorldDatabase[] = [];
const temporaryFiles: string[] = [];

afterEach(() => {
  for (const database of databases) {
    database.close();
  }

  databases.length = 0;

  for (const file of temporaryFiles) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  temporaryFiles.length = 0;
});

describe("WorldDatabase", () => {
  it("creates a valid world database", () => {
    const filePath = path.join(
      os.tmpdir(),
      `football-world-${Date.now()}.db`,
    );

    temporaryFiles.push(filePath);

    const database = WorldDatabase.create(filePath);

    databases.push(database);

    const metadata = database.connection
      .prepare(`
        SELECT key, value
        FROM database_metadata
        ORDER BY key
      `)
      .all();

    expect(metadata).toEqual(
      expect.arrayContaining([
        {
          key: "schema_version",
          value: "2",
        },
        {
          key: "database_type",
          value: "world",
        },
      ]),
    );

    const tables = database.connection
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
      `)
      .all();

    expect(tables.length).toBeGreaterThan(0);

    const foreignKeys = database.connection
      .prepare(`
        PRAGMA foreign_key_check
      `)
      .all();

    expect(foreignKeys).toEqual([]);
  });
});