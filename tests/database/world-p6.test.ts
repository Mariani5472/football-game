import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import DatabaseConnection from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { WorldDatabase } from "../../src/database/world/WorldDatabase.js";
import { WorldPackageImportService } from "../../src/infrastructure/packages/WorldPackageImportService.js";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "football-p6-"));
}

function createPackage(file: string, options: {
  packageKey: string; name: string; version?: string; packageType?: string;
  provides?: string[]; dependencies?: Array<{ key: string; minVersion?: string }>;
  conflicts?: string[];
}) {
  const db = new DatabaseConnection(file);
  db.exec(`CREATE TABLE database_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  const metadata = db.prepare("INSERT INTO database_metadata(key,value) VALUES(?,?)");
  metadata.run("package_key", options.packageKey);
  metadata.run("package_name", options.name);
  metadata.run("package_version", options.version ?? "1.0.0");
  metadata.run("package_type", options.packageType ?? "CONTENT");
  metadata.run("package_priority", "100");
  metadata.run("schema_version", "4");
  metadata.run("package_provides", JSON.stringify(options.provides ?? []));
  metadata.run("package_dependencies", JSON.stringify(options.dependencies ?? []));
  metadata.run("package_conflicts", JSON.stringify(options.conflicts ?? []));
  db.close();
}

describe("P6 package identity and conflict system", () => {
  it("rejects a second package with the same identity and version", () => {
    const dir = tempDir();
    const worldPath = path.join(dir, "world.db");
    const firstPath = path.join(dir, "brazil-v1-a.db");
    const secondPath = path.join(dir, "brazil-v1-b.db");
    createPackage(firstPath, { packageKey: "country.brazil", name: "Brazil" });
    createPackage(secondPath, { packageKey: "country.brazil", name: "Brazil Duplicate" });
    const world = WorldDatabase.create(worldPath);
    const service = new WorldPackageImportService(world);
    const first = service.inspect(firstPath);
    service.import(first.sessionId);
    expect(() => service.inspect(secondPath)).toThrow(/same identity\/version|already installed|identity/i);
    world.close();
  });

  it("allows a newer version to replace the installed package and records history", () => {
    const dir = tempDir();
    const worldPath = path.join(dir, "world.db");
    const v1 = path.join(dir, "brazil-v1.db");
    const v11 = path.join(dir, "brazil-v1-1.db");
    createPackage(v1, { packageKey: "country.brazil", name: "Brazil", version: "1.0.0" });
    createPackage(v11, { packageKey: "country.brazil", name: "Brazil", version: "1.1.0" });
    const world = WorldDatabase.create(worldPath);
    const service = new WorldPackageImportService(world);
    const first = service.inspect(v1);
    service.import(first.sessionId);
    const update = service.inspect(v11);
    expect(update.status).toBe("READY");
    service.import(update.sessionId);
    const current = world.connection.prepare("SELECT version FROM world_package WHERE lower(package_key)=?").get("country.brazil") as { version: string };
    const history = world.connection.prepare("SELECT version,replacement_reason FROM world_package_version_history WHERE lower(package_key)=? ORDER BY id").all("country.brazil") as Array<{ version: string; replacement_reason: string; }>;
    expect(current.version).toBe("1.1.0");
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual({ version: "1.0.0", replacement_reason: "PACKAGE_UPDATE" });
    world.close();
  });

  it("rejects a downgrade of an existing package identity", () => {
    const dir = tempDir();
    const worldPath = path.join(dir, "world.db");
    const v1 = path.join(dir, "brazil-v1.db");
    const v11 = path.join(dir, "brazil-v1-1.db");
    createPackage(v1, { packageKey: "country.brazil", name: "Brazil", version: "1.0.0" });
    createPackage(v11, { packageKey: "country.brazil", name: "Brazil", version: "1.1.0" });
    const world = WorldDatabase.create(worldPath);
    const service = new WorldPackageImportService(world);
    const first = service.inspect(v11);
    service.import(first.sessionId);
    expect(() => service.inspect(v1)).toThrow(/cannot replace installed v1\.1\.0|downgrade/i);
    world.close();
  });

  it("rejects overlapping provided capabilities", () => {
    const dir = tempDir();
    const worldPath = path.join(dir, "world.db");
    const brazil = path.join(dir, "brazil.db");
    const brazilCities = path.join(dir, "brazil-cities.db");
    createPackage(brazil, { packageKey: "country.brazil", name: "Brazil", provides: ["country:brazil"] });
    createPackage(brazilCities, { packageKey: "geography.brazil", name: "Brazil Cities", provides: ["country:brazil"] });
    const world = WorldDatabase.create(worldPath);
    const service = new WorldPackageImportService(world);
    const first = service.inspect(brazil);
    service.import(first.sessionId);
    expect(() => service.inspect(brazilCities)).toThrow(/already provided|logical scope|country:brazil/i);
    world.close();
  });

  it("checks minimum version through provided capabilities", () => {
    const dir = tempDir();
    const worldPath = path.join(dir, "world.db");
    const brazil = path.join(dir, "brazil.db");
    const conmebol = path.join(dir, "conmebol.db");
    createPackage(brazil, { packageKey: "country.brazil", name: "Brazil", version: "1.0.0", provides: ["country:brazil"] });
    createPackage(conmebol, {
      packageKey: "confederation.conmebol", name: "CONMEBOL",
      dependencies: [{ key: "country:brazil", minVersion: "1.1.0" }],
    });
    const world = WorldDatabase.create(worldPath);
    const service = new WorldPackageImportService(world);
    const first = service.inspect(brazil);
    service.import(first.sessionId);
    expect(() => service.inspect(conmebol)).toThrow(/requires country:brazil >= 1\.1\.0/i);
    world.close();
  });

  it("rejects explicit conflicts", () => {
    const dir = tempDir();
    const worldPath = path.join(dir, "world.db");
    const brazil = path.join(dir, "brazil.db");
    const conmebol = path.join(dir, "conmebol.db");
    createPackage(brazil, { packageKey: "country.brazil", name: "Brazil", provides: ["country:brazil"] });
    createPackage(conmebol, { packageKey: "confederation.conmebol", name: "CONMEBOL", conflicts: ["country:brazil"] });
    const world = WorldDatabase.create(worldPath);
    const service = new WorldPackageImportService(world);
    const first = service.inspect(brazil);
    service.import(first.sessionId);
    expect(() => service.inspect(conmebol)).toThrow(/explicitly conflicts|conflicts with/i);
    world.close();
  });
});
