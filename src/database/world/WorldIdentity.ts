import crypto from "node:crypto";

export type IdentityMatchMode = "UUID" | "NATURAL_KEY" | "NEW" | "NONE";

export interface IdentityContext {
  token(table: string, key: Record<string, unknown>): string | null;
}

export interface IdentityPolicy {
  table: string;
  uuidColumn: string | null;
  fallback: "NATURAL_KEY" | "NONE";
  naturalKey: (row: Record<string, unknown>, context: IdentityContext) => string | null;
}

function natural(
  table: string,
  naturalKey: IdentityPolicy["naturalKey"],
): IdentityPolicy {
  return {
    table,
    uuidColumn: "uuid",
    fallback: "NATURAL_KEY",
    naturalKey,
  };
}

export const IDENTITY_POLICIES: Record<string, IdentityPolicy> = {
  federation: natural("federation", row => key("federation", row.name)),
  continent: natural("continent", row => key("continent", row.name)),
  continent_region: natural("continent_region", (row, context) =>
    key("continent_region", context.token("continent", { id: row.continent_id }), row.name),
  ),
  currency: natural("currency", row => key("currency", row.name)),
  language_family: natural("language_family", row => key("language_family", row.name)),
  language_group: natural("language_group", (row, context) =>
    key("language_group", context.token("language_family", { id: row.family_id }), row.name),
  ),
  language_subgroup: natural("language_subgroup", (row, context) =>
    key("language_subgroup", context.token("language_group", { id: row.group_id }), row.name),
  ),
  language: natural("language", row => key("language", row.name)),
  nation: natural("nation", row => key("nation", row.name)),
  nation_region: natural("nation_region", (row, context) =>
    key("nation_region", context.token("nation", { id: row.nation_id }), row.name),
  ),
  city: natural("city", (row, context) =>
    key("city", context.token("nation", { id: row.nation_id }), row.name),
  ),
  team: natural("team", (row, context) =>
    key(
      "team",
      row.name,
      context.token("gender", { id: row.gender_id }),
      context.token("nation", { id: row.nation_id }),
    ),
  ),
  stadium: natural("stadium", (row, context) =>
    key("stadium", context.token("city", { id: row.city_id }), row.name),
  ),
  competition: natural("competition", (row, context) =>
    key(
      "competition",
      row.name,
      context.token("gender", { id: row.gender_id }),
      context.token("nation", { id: row.nation_id }),
    ),
  ),
  person: natural("person", (row, context) =>
    key(
      "person",
      row.full_name,
      row.birth_date,
      context.token("city", { id: row.birth_city_id }),
    ),
  ),
  competition_season: {
    table: "competition_season",
    uuidColumn: null,
    fallback: "NATURAL_KEY",
    naturalKey: (row, context) =>
      key("competition_season", context.token("competition", { id: row.competition_id }), row.year),
  },
  competition_stage: {
    table: "competition_stage",
    uuidColumn: null,
    fallback: "NATURAL_KEY",
    naturalKey: (row, context) =>
      key("competition_stage", context.token("competition_season", { id: row.competition_season_id }), row.stage_order),
  },
  competition_round: {
    table: "competition_round",
    uuidColumn: null,
    fallback: "NATURAL_KEY",
    naturalKey: (row, context) =>
      key("competition_round", context.token("competition_stage", { id: row.stage_id }), row.round_number),
  },
  fixture: {
    table: "fixture",
    uuidColumn: null,
    fallback: "NONE",
    naturalKey: () => null,
  },
  transfer: {
    table: "transfer",
    uuidColumn: null,
    fallback: "NONE",
    naturalKey: () => null,
  },
  player_transfer: {
    table: "player_transfer",
    uuidColumn: null,
    fallback: "NONE",
    naturalKey: () => null,
  },
};

export function generateUuid(): string {
  return crypto.randomUUID();
}

export function normalizeIdentityPart(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function key(namespace: string, ...values: unknown[]): string {
  const payload = values.map(normalizeIdentityPart).join("|");
  return crypto
    .createHash("sha256")
    .update(namespace + "|" + payload)
    .digest("hex");
}

export function identityPolicy(table: string): IdentityPolicy | undefined {
  return IDENTITY_POLICIES[table];
}
