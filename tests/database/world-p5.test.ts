import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import DatabaseConnection from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { WorldDatabase } from "../../src/database/world/WorldDatabase.js";
import { WorldPackageImportService } from "../../src/editor/WorldPackageImportService.js";
import { WorldEditorService } from "../../src/editor/WorldEditorService.js";
import { WorldPackageService } from "../../src/editor/WorldPackageService.js";

function tempDir() {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), "football-p5-"),
  );
}

interface PackageOptions {
  packageKey: string;
  name: string;
  withTeam?: boolean;
  nationUuid?: string | null;
  shortName?: string;
}

function createPackage(
  file: string,
  options: PackageOptions,
) {
  const db = new DatabaseConnection(file);
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE database_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE nation (
      id INTEGER PRIMARY KEY,
      uuid TEXT,
      name TEXT NOT NULL,
      short_name TEXT
    );

    CREATE TABLE gender (
      id INTEGER PRIMARY KEY,
      uuid TEXT,
      name TEXT NOT NULL
    );

    CREATE TABLE team (
      id INTEGER PRIMARY KEY,
      uuid TEXT,
      name TEXT NOT NULL,
      short_name TEXT,
      gender_id INTEGER,
      nation_id INTEGER,
      FOREIGN KEY (gender_id) REFERENCES gender(id),
      FOREIGN KEY (nation_id) REFERENCES nation(id),
      UNIQUE (name, gender_id)
    );

    CREATE TABLE club (
      team_id INTEGER PRIMARY KEY,
      city_id INTEGER,
      base_nation_id INTEGER,
      FOREIGN KEY (team_id) REFERENCES team(id),
      FOREIGN KEY (base_nation_id) REFERENCES nation(id)
    );

    CREATE TABLE club_finance (
      club_id INTEGER PRIMARY KEY,
      balance INTEGER,
      transfer_budget INTEGER,
      wage_budget INTEGER,
      FOREIGN KEY (club_id) REFERENCES club(team_id)
    );

    CREATE TABLE embargo_type (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE club_finance_embargo (
      club_id INTEGER NOT NULL,
      embargo_type_id INTEGER NOT NULL,
      PRIMARY KEY (club_id, embargo_type_id),
      FOREIGN KEY (club_id) REFERENCES club_finance(club_id),
      FOREIGN KEY (embargo_type_id) REFERENCES embargo_type(id)
    );
  `);

  const metadata = db.prepare(
    "INSERT INTO database_metadata(key,value) VALUES(?,?)",
  );

  metadata.run("package_key", options.packageKey);
  metadata.run("package_name", options.name);
  metadata.run("package_version", "1.0.0");
  metadata.run("schema_version", "3");
  metadata.run("package_type", "CONTENT");
  metadata.run("package_priority", "200");

  db.prepare(
    "INSERT INTO nation(id,uuid,name,short_name) VALUES(?,?,?,?)",
  ).run(
    1,
    options.nationUuid ?? null,
    "Brazil",
    options.shortName ?? "BRA",
  );

  db.prepare(
    "INSERT INTO gender(id,uuid,name) VALUES(?,?,?)",
  ).run(1, "gender-men-uuid", "Men");

  if (options.withTeam) {
    db.prepare(
      "INSERT INTO team(id,uuid,name,short_name,gender_id,nation_id) VALUES(?,?,?,?,?,?)",
    ).run(
      10,
      "team-flamengo-uuid",
      "Flamengo",
      "FLA",
      1,
      1,
    );

    db.prepare(
      "INSERT INTO club(team_id,city_id,base_nation_id) VALUES(?,?,?)",
    ).run(10, null, 1);

    db.prepare(
      "INSERT INTO club_finance(club_id,balance,transfer_budget,wage_budget) VALUES(?,?,?,?)",
    ).run(
      10,
      100000,
      50000,
      25000,
    );

    db.prepare(
      "INSERT INTO embargo_type(id,name) VALUES(?,?)",
    ).run(30, "Transfer Embargo");

    db.prepare(
      "INSERT INTO club_finance_embargo(club_id,embargo_type_id) VALUES(?,?)",
    ).run(10, 30);
  }

  db.close();
}

function packageSha256(file: string) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

describe("P5 world composition", () => {
  it("protects direct editor changes from destructive package rebuilds", () => {
    const dir = tempDir();
    const worldPath = path.join(dir, "world.db");

    const editor = new WorldEditorService({
      filePath: worldPath,
      createIfMissing: true,
    });
    editor.create("nation", {
      name: "Brazil",
      short_name: "BRA",
    });

    expect(() =>
      editor.rebuildWorld(),
    ).toThrow(/direct editor changes/i);

    editor.close();

    const database = WorldDatabase.open(worldPath);
    expect(
      (database.connection
        .prepare("SELECT COUNT(*) AS count FROM nation")
        .get() as { count: number }).count,
    ).toBe(1);

    database.close();
  });

  it("imports package content with UUID identity and remaps foreign keys", () => {
    const dir = tempDir();
    const worldPath = path.join(dir, "world.db");
    const packagePath = path.join(dir, "brazil.db");

    createPackage(packagePath, {
      packageKey: "country.brazil",
      name: "Brazil",
      withTeam: true,
      nationUuid: "nation-brazil-uuid",
    });

    const sourceHash = packageSha256(packagePath);
    const world = WorldDatabase.create(worldPath);

    const existingNation = world.create("nation", {
      name: "Argentina",
      short_name: "ARG",
    });

    const service = new WorldPackageImportService(world);
    const preview = service.inspect(packagePath);

    expect(preview.status).toBe("READY");
    expect(preview.rows).toBeGreaterThan(0);
    expect(preview.newRows).toBeGreaterThan(0);

    const result = service.import(preview.sessionId);

    expect(result.status).toBe("COMPLETED");
    expect(packageSha256(packagePath)).toBe(sourceHash);

    const brazil = world.connection
      .prepare(
        "SELECT id,uuid,short_name FROM nation WHERE uuid=?",
      )
      .get("nation-brazil-uuid") as {
      id: number;
      uuid: string;
      short_name: string;
    };

    expect(brazil.id).not.toBe(existingNation.id);
    expect(brazil.uuid).toBe(
      "nation-brazil-uuid",
    );

    const team = world.connection
      .prepare(
        "SELECT id,uuid,nation_id FROM team WHERE uuid=?",
      )
      .get("team-flamengo-uuid") as {
      id: number;
      uuid: string;
      nation_id: number;
    };

    expect(team.nation_id).toBe(brazil.id);

    const club = world.connection
      .prepare(
        "SELECT team_id,base_nation_id FROM club WHERE team_id=?",
      )
      .get(team.id) as {
      team_id: number;
      base_nation_id: number;
    };

    expect(club.team_id).toBe(team.id);
    expect(club.base_nation_id).toBe(
      brazil.id,
    );

    const embargoType = world.connection
      .prepare(
        "SELECT id FROM embargo_type WHERE name=?",
      )
      .get("Transfer Embargo") as {
      id: number;
    };

    const clubFinance = world.connection
      .prepare(
        "SELECT club_id FROM club_finance WHERE club_id=?",
      )
      .get(team.id) as {
      club_id: number;
    };

    const financeEmbargo = world.connection
      .prepare(
        "SELECT club_id,embargo_type_id FROM club_finance_embargo WHERE club_id=? AND embargo_type_id=?",
      )
      .get(team.id, embargoType.id) as {
      club_id: number;
      embargo_type_id: number;
    };

    expect(clubFinance.club_id).toBe(team.id);
    expect(financeEmbargo.club_id).toBe(
      clubFinance.club_id,
    );
    expect(financeEmbargo.embargo_type_id).toBe(
      embargoType.id,
    );

    const mappedNation = world.connection
      .prepare(
        "SELECT world_key FROM world_import_id_map WHERE import_session_id=? AND table_name='nation'",
      )
      .get(preview.sessionId) as {
      world_key: string;
    };

    expect(JSON.parse(mappedNation.world_key)).toEqual({
      id: brazil.id,
    });

    world.close();
  });

  it("uses natural-key matching when the incoming package has no UUID", () => {
    const dir = tempDir();
    const worldPath = path.join(dir, "world.db");
    const packagePath = path.join(dir, "brazil-nk.db");

    createPackage(packagePath, {
      packageKey: "country.brazil.natural",
      name: "Brazil Natural",
      nationUuid: null,
      withTeam: false,
    });

    const world = WorldDatabase.create(worldPath);
    const initial = world.create("nation", {
      name: "Brazil",
      short_name: "BRA",
    });

    const service = new WorldPackageImportService(world);
    const preview = service.inspect(packagePath);

    expect(preview.status).toBe("READY");
    expect(preview.newRows).toBe(0);
    expect(preview.existingRows).toBeGreaterThan(0);

    const result = service.import(preview.sessionId);

    expect(result.status).toBe("COMPLETED");

    const rows = world.list(
      "nation",
      { page: 1, pageSize: 10 },
    );

    expect(rows.total).toBe(1);
    expect(rows.rows[0]?.id).toBe(
      initial.id,
    );

    world.close();
  });

  it("creates conflicts for changed attributes and accepts an explicit resolution", () => {
    const dir = tempDir();
    const worldPath = path.join(dir, "world.db");
    const packagePath = path.join(dir, "brazil-patch.db");

    createPackage(packagePath, {
      packageKey: "patch.brazil",
      name: "Brazil Patch",
      nationUuid: "nation-brazil-uuid",
      withTeam: false,
      shortName: "BRZ",
    });

    const world = WorldDatabase.create(worldPath);
    world.create("nation", {
      uuid: "nation-brazil-uuid",
      name: "Brazil",
      short_name: "BRA",
    });

    const service = new WorldPackageImportService(world);
    const preview = service.inspect(packagePath);

    expect(preview.status).toBe(
      "CONFLICTS_FOUND",
    );
    expect(preview.conflicts).toBeGreaterThan(
      0,
    );

    const conflicts = service.listConflicts(
      preview.sessionId,
    );

    const resolution = Object.fromEntries(
      conflicts.map(conflict => [
        String(conflict.id),
        "KEEP_INCOMING" as const,
      ]),
    );

    const result = service.import(
      preview.sessionId,
      resolution,
    );

    expect(result.status).toBe("COMPLETED");

    const nation = world.connection
      .prepare(
        "SELECT short_name FROM nation WHERE uuid=?",
      )
      .get("nation-brazil-uuid") as {
      short_name: string;
    };

    expect(nation.short_name).toBe(
      "BRZ",
    );

    expect(
      service
        .listConflicts(
          preview.sessionId,
        )
        .every(conflict => conflict.resolved),
    ).toBe(true);

    world.close();
  });

  it("rebuilds only enabled packages and preserves package sources", () => {
    const dir = tempDir();
    const worldPath = path.join(dir, "world.db");
    const contentPath = path.join(dir, "brazil.db");
    const referencePath = path.join(
      dir,
      "reference.db",
    );

    createPackage(contentPath, {
      packageKey: "country.brazil",
      name: "Brazil",
      withTeam: true,
      nationUuid: "nation-brazil-uuid",
    });

    createPackage(referencePath, {
      packageKey: "reference.brazil",
      name: "Brazil Reference",
      withTeam: false,
      nationUuid: null,
    });

    const contentHash =
      packageSha256(contentPath);
    const referenceHash =
      packageSha256(referencePath);

    const world =
      WorldDatabase.create(worldPath);
    const service =
      new WorldPackageImportService(
        world,
      );

    const contentPreview =
      service.inspect(contentPath);
    service.import(
      contentPreview.sessionId,
    );

    const referencePreview =
      service.inspect(
        referencePath,
      );
    service.import(
      referencePreview.sessionId,
    );

    const contentPackage =
      world.connection
        .prepare(
          "SELECT id FROM world_package WHERE package_key=?",
        )
        .get(
          "country.brazil",
        ) as {
        id: number;
      };

    new WorldPackageService(
      world,
    ).updatePackage(
      contentPackage.id,
      { enabled: false },
    );

    const rebuild =
      service.rebuild();

    expect(rebuild.status).toBe(
      "COMPLETED",
    );

    expect(
      packageSha256(contentPath),
    ).toBe(contentHash);
    expect(
      packageSha256(referencePath),
    ).toBe(referenceHash);

    const teamCount = Number(
      (
        world.connection
          .prepare(
            "SELECT COUNT(*) AS count FROM team",
          )
          .get() as {
          count: number;
        }
      ).count,
    );

    expect(teamCount).toBe(0);

    expect(
      world.metadata(
        "world_build_status",
      ),
    ).toBe("VALID");

    world.close();
  });
});
