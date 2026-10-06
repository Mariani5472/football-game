import { describe, expect, it } from "vitest";

import {
  ALL_REFERENCE_TABLES,
  REFERENCE_DATA_DOMAINS,
  DEFAULT_CLIMATES,
  DEFAULT_REFERENCE_LISTS,
} from "../../src/database/world/WorldDefaultReferenceCatalog.js";

describe("Phase 3 reference data catalog", () => {
  it("declares the reference dataset in explicit domains", () => {
    expect(Object.keys(REFERENCE_DATA_DOMAINS).sort()).toEqual([
      "football",
      "generic",
      "geography",
      "injuries",
      "tactical",
    ]);

    expect(REFERENCE_DATA_DOMAINS.geography).toContain("climate");
    expect(REFERENCE_DATA_DOMAINS.football).toContain("gender");
    expect(REFERENCE_DATA_DOMAINS.tactical).toContain("player_role");
    expect(REFERENCE_DATA_DOMAINS.injuries).toContain("injury_classification");
    expect(REFERENCE_DATA_DOMAINS.generic).toContain("transfer_status");
  });

  it("keeps the flattened catalog compatible with the builder", () => {
    expect(DEFAULT_REFERENCE_LISTS.genders.length).toBeGreaterThan(0);
    expect(DEFAULT_CLIMATES.length).toBeGreaterThan(0);
    expect(DEFAULT_REFERENCE_LISTS.positions.length).toBeGreaterThan(0);
    expect(DEFAULT_REFERENCE_LISTS.roleDuties).toEqual([
      "Defend",
      "Support",
      "Attack",
    ]);
  });

  it("does not expose duplicate reference table ownership", () => {
    const occurrences = new Map<string, number>();

    for (const tables of Object.values(REFERENCE_DATA_DOMAINS)) {
      for (const table of tables) {
        occurrences.set(table, (occurrences.get(table) ?? 0) + 1);
      }
    }

    const duplicates = [...occurrences.entries()]
      .filter(([, count]) => count > 1)
      .map(([table]) => table);

    expect(duplicates).toEqual(["position_definition"]);
  });

  it("keeps the canonical reference-table inventory stable", () => {
    expect(ALL_REFERENCE_TABLES.length).toBeGreaterThan(35);
    expect(new Set(ALL_REFERENCE_TABLES).size).toBe(
      ALL_REFERENCE_TABLES.length,
    );
  });
});
