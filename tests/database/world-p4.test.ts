import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { WorldDatabase } from "../../src/database/world/WorldDatabase.js";
import { WorldMigrationService } from "../../src/database/world/WorldMigrationService.js";
import { WorldPackageService } from "../../src/editor/WorldPackageService.js";

function tempPath(name: string) {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "football-world-")), name);
}

describe("World editor P4 lifecycle", () => {
  it("creates a versioned world database and exports a verified package", () => {
    const source = tempPath("world.db");
    const destination = tempPath("exported-world.db");

    const database = WorldDatabase.create(source);
    expect(database.metadata("schema_version")).toBe("2");
    expect(database.metadata("package_version")).toBe("0.2.0");

    database.create("nation", {
      name: "Brazil",
      short_name: "BRA",
    });

    const result = new WorldPackageService(database).exportWorld(destination);

    expect(result.blocked).toBe(false);
    expect(fs.existsSync(destination)).toBe(true);
    expect(result.metadata.schemaVersion).toBe(2);
    expect(result.metadata.packageVersion).toBe("0.2.0");
    expect(result.metadata.sha256).toHaveLength(64);
    expect(result.metadata.rowCount).toBeGreaterThan(0);

    database.close();

    const reopened = WorldDatabase.open(destination);
    expect(reopened.metadata("schema_version")).toBe("2");
    expect(reopened.metadata("package_version")).toBe("0.2.0");
    expect(
      reopened.list("nation", { page: 1, pageSize: 10 }).rows.some(
        row => row.name === "Brazil",
      ),
    ).toBe(true);

    reopened.close();
  });

  it("does not silently open databases without compatible schema metadata", () => {
    const legacy = tempPath("legacy.db");
    const database = WorldDatabase.create(legacy);
    database.setMetadata("schema_version", "1");
    database.close();

    const raw = new (require("better-sqlite3"))(legacy);
    raw.prepare("DELETE FROM database_metadata WHERE key = ?").run("schema_version");
    raw.close();

    expect(() => WorldDatabase.open(legacy)).toThrow(/schema version metadata/i);
  });

  it("rejects newer schema versions", () => {
    const file = tempPath("future.db");
    const database = WorldDatabase.create(file);
    database.setMetadata("schema_version", "999");
    database.close();

    expect(() => WorldDatabase.open(file)).toThrow(/newer than supported/i);
  });

  it("returns a blocking result when export receives validation errors", () => {
    const source = tempPath("blocked.db");
    const destination = tempPath("blocked-export.db");
    const database = WorldDatabase.create(source);

    const result = new WorldPackageService(database).exportWorld(destination, [{
      severity: "ERROR",
      ruleKey: "TEST_BLOCK",
      message: "Synthetic validation error",
    }]);

    expect(result.blocked).toBe(true);
    expect(fs.existsSync(destination)).toBe(false);
    expect(result.issues[0]?.ruleKey).toBe("TEST_BLOCK");

    database.close();
  });

  it("reports the current schema version through the migration service", () => {
    const file = tempPath("version.db");
    const database = WorldDatabase.create(file);
    expect(WorldMigrationService.getVersion(database)).toBe(2);
    database.close();
  });
});
