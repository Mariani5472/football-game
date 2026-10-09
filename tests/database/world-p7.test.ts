import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { WorldDatabase } from "../../src/database/world/WorldDatabase.js";

describe("P7 Base World", () => {
  it("creates a World with the immutable Base World package and reference geography", () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "football-p7-"),
    );
    const worldPath = path.join(directory, "world.db");

    const world = WorldDatabase.create(worldPath);

    const base = world.connection
      .prepare(
        "SELECT package_key AS packageKey,package_type AS packageType,enabled,source_file AS sourceFile FROM world_package WHERE package_key=?",
      )
      .get("world.base") as {
        packageKey: string;
        packageType: string;
        enabled: number;
        sourceFile: string;
      };

    expect(base.packageKey).toBe("world.base");
    expect(base.packageType).toBe("BASE");
    expect(base.enabled).toBe(1);
    expect(fs.existsSync(base.sourceFile)).toBe(true);

    const continents = world.connection
      .prepare("SELECT COUNT(*) AS count FROM continent")
      .get() as { count: number };
    const regions = world.connection
      .prepare("SELECT COUNT(*) AS count FROM continent_region")
      .get() as { count: number };
    const nations = world.connection
      .prepare("SELECT COUNT(*) AS count FROM nation")
      .get() as { count: number };
    const languages = world.connection
      .prepare("SELECT COUNT(*) AS count FROM language")
      .get() as { count: number };
    const climates = world.connection
      .prepare("SELECT COUNT(*) AS count FROM climate")
      .get() as { count: number };
    const genders = world.connection
      .prepare("SELECT COUNT(*) AS count FROM gender")
      .get() as { count: number };
    const confederations = world.connection
      .prepare("SELECT COUNT(*) AS count FROM confederation")
      .get() as { count: number };
    const members = world.connection
      .prepare("SELECT COUNT(*) AS count FROM confederation_member_nation")
      .get() as { count: number };

    expect(continents.count).toBeGreaterThanOrEqual(5);
    expect(regions.count).toBeGreaterThanOrEqual(15);
    expect(nations.count).toBeGreaterThanOrEqual(50);
    expect(languages.count).toBeGreaterThanOrEqual(10);
    expect(climates.count).toBeGreaterThanOrEqual(5);
    expect(genders.count).toBe(2);
    expect(confederations.count).toBe(6);
    expect(members.count).toBeGreaterThan(50);

    const brazil = world.connection
      .prepare(
        `SELECT c.name AS continent,r.name AS region,n.name AS nation
         FROM nation n
         JOIN continent_region r ON r.id=n.continent_region_id
         JOIN continent c ON c.id=r.continent_id
         WHERE n.name=?`,
      )
      .get("Brazil") as {
        continent: string;
        region: string;
        nation: string;
      };

    expect(brazil).toEqual({
      continent: "South America",
      region: "South America",
      nation: "Brazil",
    });

    const conmebol = world.connection
      .prepare(
        `SELECT c.short_name AS confederation,n.name AS nation
         FROM confederation c
         JOIN confederation_member_nation m ON m.confederation_id=c.id
         JOIN nation n ON n.id=m.nation_id
         WHERE c.short_name=? AND n.name=?`,
      )
      .get("CONMEBOL", "Brazil") as {
        confederation: string;
        nation: string;
      };

    expect(conmebol).toEqual({
      confederation: "CONMEBOL",
      nation: "Brazil",
    });

    world.close();
  });
});
