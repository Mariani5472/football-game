import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { WorldDatabase } from "../../src/database/world/WorldDatabase.js";

const openDatabases: WorldDatabase[] = [];
const files: string[] = [];

afterEach(() => {
  for (const database of openDatabases) database.close();
  openDatabases.length = 0;

  for (const file of files) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  files.length = 0;
});

function createWorld() {
  const filePath = path.join(
    os.tmpdir(),
    "football-editor-crud-" +
      Date.now() +
      "-" +
      Math.random().toString(16).slice(2) +
      ".db",
  );

  files.push(filePath);

  const database = WorldDatabase.create(filePath);
  openDatabases.push(database);

  return { database, filePath };
}

describe("World database CRUD", () => {
  it("supports create -> read -> update -> read -> delete -> read", () => {
    const { database, filePath } = createWorld();

    const nation = database.create("nation", {
      name: "Editor Nation",
      short_name: "EDT",
    }) as { id: number; name: string; short_name: string };

    expect(nation.name).toBe("Editor Nation");
    expect(database.findById("nation", nation.id)).toMatchObject({
      name: "Editor Nation",
    });

    const updated = database.update("nation", nation.id, {
      name: "Edited Nation",
      short_name: "ED2",
    }) as { name: string; short_name: string };

    expect(updated).toMatchObject({
      name: "Edited Nation",
      short_name: "ED2",
    });

    database.close();
    openDatabases.pop();

    const reopened = WorldDatabase.open(filePath);
    openDatabases.push(reopened);

    expect(reopened.findById("nation", nation.id)).toMatchObject({
      name: "Edited Nation",
      short_name: "ED2",
    });

    expect(reopened.delete("nation", nation.id)).toBe(true);
    expect(reopened.findById("nation", nation.id)).toBeUndefined();
  });

  it("supports SQL search, pagination and ordering", () => {
    const { database } = createWorld();

    for (const name of ["Alpha", "Beta", "Alpine", "Gamma"]) {
      database.create("climate", { name });
    }

    const firstPage = database.list("climate", {
      page: 1,
      pageSize: 2,
      search: "alp",
      orderBy: "name",
      orderDirection: "ASC",
    });

    expect(firstPage.total).toBe(2);
    expect(firstPage.pageCount).toBe(1);
    expect(firstPage.rows.map((row) => row.name)).toEqual([
      "Alpha",
      "Alpine",
    ]);
  });

  it("exposes schema metadata needed by the generic editor", () => {
    const { database } = createWorld();

    const schema = database.tableSchema("city");

    expect(schema.primaryKey).toEqual(["id"]);
    expect(
      schema.columns.some(
        (column) => column.name === "name" && column.notNull,
      ),
    ).toBe(true);
    expect(
      schema.foreignKeys.some(
        (foreignKey) =>
          foreignKey.table === "nation" &&
          foreignKey.from === "nation_id",
      ),
    ).toBe(true);
    expect(schema.uniqueColumns.length).toBeGreaterThan(0);
  });

  it("keeps compound writes atomic", () => {
    const { database } = createWorld();

    expect(() => {
      database.transaction(() => {
        database.create("climate", { name: "Temporary" });
        database.create("climate", { name: "Temporary" });
      });
    }).toThrow();

    expect(database.count("climate")).toBe(0);
  });

  it("lets SQLite enforce foreign keys", () => {
    const { database } = createWorld();

    expect(() =>
      database.create("city", {
        name: "Invalid City",
        nation_id: 999999,
      }),
    ).toThrow();
  });
});