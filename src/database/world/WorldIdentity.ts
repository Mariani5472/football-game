import crypto from "node:crypto";

export type IdentityMatchMode = "UUID" | "NATURAL_KEY" | "NEW" | "NONE";

export interface IdentityPolicy {
  table: string;
  uuidColumn: string | null;
  naturalKey: (row: Record<string, unknown>, resolver: (table: string, id: number) => Record<string, unknown> | undefined) => string | null;
  fallback: IdentityMatchMode | "NATURAL_KEY" | "NONE";
}

export const IDENTITY_POLICIES: Record<string, IdentityPolicy> = {
  federation: policy("federation", row => key("federation", row.name)),
  continent: policy("continent", row => key("continent", row.name)),
  continent_region: policy("continent_region", row => key("continent_region", row.continent_id, row.name)),
  currency: policy("currency", row => key("currency", row.name)),
  language_family: policy("language_family", row => key("language_family", row.name)),
  language_group: policy("language_group", row => key("language_group", row.family_id, row.name)),
  language_subgroup: policy("language_subgroup", row => key("language_subgroup", row.group_id, row.name)),
  language: policy("language", row => key("language", row.name)),
  nation: policy("nation", row => key("nation", row.name)),
  nation_region: policy("nation_region", row => key("nation_region", row.nation_id, row.name)),
  city: policy("city", row => key("city", row.nation_id, row.name)),
  team: policy("team", row => key("team", row.name, row.gender_id)),
  stadium: policy("stadium", row => key("stadium", row.city_id, row.name)),
  competition: policy("competition", row => key("competition", row.name, row.gender_id)),
  person: {
    table: "person",
    uuidColumn: "uuid",
    fallback: "NATURAL_KEY",
    naturalKey: row => key("person", row.full_name, row.birth_date, row.birth_city_id),
  },
  player: { table: "player", uuidColumn: null, fallback: "NONE", naturalKey: () => null },
  competition_season: {
    table: "competition_season", uuidColumn: null, fallback: "NATURAL_KEY",
    naturalKey: (row, resolve) => key("competition_season", row.competition_id, row.year, resolve("competition", Number(row.competition_id))?.name),
  },
  competition_stage: {
    table: "competition_stage", uuidColumn: null, fallback: "NATURAL_KEY",
    naturalKey: (row, resolve) => key("competition_stage", row.competition_season_id, row.stage_order, row.name, resolve("competition_season", Number(row.competition_season_id))?.year),
  },
  fixture: { table: "fixture", uuidColumn: null, fallback: "NONE", naturalKey: () => null },
  player_transfer: { table: "player_transfer", uuidColumn: null, fallback: "NONE", naturalKey: () => null },
};

function policy(table: string, naturalKey: IdentityPolicy["naturalKey"]): IdentityPolicy {
  return { table, uuidColumn: "uuid", fallback: "NATURAL_KEY", naturalKey };
}

export function generateUuid(): string { return crypto.randomUUID(); }

export function normalizeIdentityPart(value: unknown): string {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function key(namespace: string, ...values: unknown[]): string {
  const payload = values.map(normalizeIdentityPart).join("|");
  return crypto.createHash("sha256").update(`${namespace}|${payload}`).digest("hex");
}