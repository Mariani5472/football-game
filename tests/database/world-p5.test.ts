import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import DatabaseConnection from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { WorldDatabase } from "../../src/database/world/WorldDatabase.js";
import { WorldPackageImportService } from "../../src/editor/WorldPackageImportService.js";
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

    CREATE TABLE competition (
      id INTEGER PRIMARY KEY,
      uuid TEXT,
      name TEXT NOT NULL,
      gender_id INTEGER,
      nation_id INTEGER,
      FOREIGN KEY (gender_id) REFERENCES gender(id),
      FOREIGN KEY (nation_id) REFERENCES nation(id),
      UNIQUE (name, gender_id)
    );

    CREATE TABLE competition_reserve_team_level (
      competition_id INTEGER NOT NULL,
      reserve_level INTEGER NOT NULL,
      allowed INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (competition_id, reserve_level),
      FOREIGN KEY (competition_id) REFERENCES competition(id)
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
      "INSERT INTO competition(id,uuid,name,gender_id,nation_id) VALUES(?,?,?,?,?)",
    ).run(
      20,
      "competition-brazil-uuid",
      "Brazilian League",
      1,
      1,
    );

    db.prepare(
      "INSERT INTO competition_reserve_team_level(competition_id,reserve_level,allowed) VALUES(?,?,?)",
    ).run(20, 1, 1);
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

    const competition = world.connection
      .prepare(
        "SELECT id FROM competition WHERE uuid=?",
      )
      .get("competition-brazil-uuid") as {
      id: number;
    };

    const reserve = world.connection
      .prepare(
        "SELECT competition_id,reserve_level FROM competition_reserve_team_level WHERE reserve_level=1",
      )
      .get() as {
      competition_id: number;
      reserve_level: number;
    };

    expect(reserve.competition_id).toBe(
      competition.id,
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
