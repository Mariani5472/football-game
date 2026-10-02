import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import DatabaseConnection from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { WorldDatabase } from "../../src/database/world/WorldDatabase.js";
import { WorldPackageImportService } from "../../src/editor/WorldPackageImportService.js";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "football-p5-"));
}

function writePackage(file: string, rows: Array<{ id:number; name:string; nation_id:number }>) {
  const db = new DatabaseConnection(file);
  db.exec(`
    CREATE TABLE database_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE nation (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE team (id INTEGER PRIMARY KEY, name TEXT NOT NULL, gender_id INTEGER);
    CREATE TABLE club (team_id INTEGER PRIMARY KEY, city_id INTEGER, base_nation_id INTEGER);
  `);
  const set = db.prepare("INSERT INTO database_metadata(key,value) VALUES(?,?)");
  set.run("package_key","country.brazil");
  set.run("package_name","Brazil");
  set.run("package_version","1.0.0");
  set.run("schema_version","3");
  db.prepare("INSERT INTO nation(id,name) VALUES(?,?)").run(1,"Brazil");
  for (const row of rows) {
    db.prepare("INSERT INTO team(id,name,gender_id) VALUES(?,?,?)").run(row.id,row.name,null);
    db.prepare("INSERT INTO club(team_id,city_id,base_nation_id) VALUES(?,?,?)").run(row.id,null,row.nation_id);
  }
  db.close();
}

describe("P5 world composition", () => {
  it("creates composition metadata and a person global identity on import", () => {
    const dir = tempDir();
    const worldPath = path.join(dir, "world.db");
    const packagePath = path.join(dir, "brazil.db");

    const world = WorldDatabase.create(worldPath);
    const source = new DatabaseConnection(packagePath);
    source.exec(`
      CREATE TABLE database_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE person (id INTEGER PRIMARY KEY, uuid TEXT, full_name TEXT NOT NULL, birth_date TEXT, birth_city_id INTEGER);
    `);
    source.prepare("INSERT INTO database_metadata(key,value) VALUES('package_key','people.brazil')").run();
    source.prepare("INSERT INTO database_metadata(key,value) VALUES('package_name','Brazil People')").run();
    source.prepare("INSERT INTO database_metadata(key,value) VALUES('package_version','1.0.0')").run();
    source.prepare("INSERT INTO database_metadata(key,value) VALUES('schema_version','3')").run();
    source.prepare("INSERT INTO person VALUES(42,'abc-123','Test Person','2000-01-01',NULL)").run();
    source.close();

    const preview = new WorldPackageImportService(world).inspect(packagePath);
    expect(preview.status).toBe("READY");
    const result = new WorldPackageImportService(world).import(preview.sessionId);
    expect(result.status).toBe("COMPLETED");
    expect((world.connection.prepare("SELECT uuid FROM person WHERE full_name=?").get("Test Person") as { uuid:string }).uuid).toBe("abc-123");
    expect((world.connection.prepare("SELECT resolution FROM world_entity_provenance WHERE table_name='person'").get() as { resolution:string }).resolution).toBe("CREATED");
    expect((world.connection.prepare("SELECT COUNT(*) AS count FROM world_import_id_map").get() as { count:number }).count).toBeGreaterThan(0);
    world.close();
  });
});