import type { EntityFormValue } from "../../../../../shared/components";
import type { GeographyEntityKind, GeographyTreeNode } from "../types";

export interface GeographyField {
  name: string;
  label: string;
  type?: "text" | "number" | "boolean";
  required?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
  relation?: string;
}

export interface GeographySpec {
  table: string;
  label: string;
  pluralLabel: string;
  description: string;
  fields: GeographyField[];
  columns: Array<{
    key: string;
    header: string;
    relation?: string;
  }>;
}

const relation = (table: string) => table;

export const geographySpecs: Record<GeographyEntityKind, GeographySpec> = {
  continent: {
    table: "continent",
    label: "Continent",
    pluralLabel: "Continents",
    description: "Top-level geographic division of the world.",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "short_name", label: "Short Name" },
      { name: "continental_name", label: "Continental Name" },
      { name: "federation_id", label: "Federation", relation: relation("federation") },
    ],
    columns: [
      { key: "name", header: "Name" },
      { key: "short_name", header: "Code" },
      { key: "continental_name", header: "Continental Name" },
      { key: "federation_id", header: "Federation", relation: relation("federation") },
    ],
  },
  "continent-region": {
    table: "continent_region",
    label: "Geographic Region",
    pluralLabel: "Geographic Regions",
    description: "Macro-regions used to group countries inside a continent.",
    fields: [
      { name: "continent_id", label: "Continent", relation: relation("continent"), required: true },
      { name: "name", label: "Name", required: true },
      { name: "short_name", label: "Short Name" },
    ],
    columns: [
      { key: "name", header: "Name" },
      { key: "short_name", header: "Code" },
      { key: "continent_id", header: "Continent", relation: relation("continent") },
    ],
  },
  country: {
    table: "nation",
    label: "Country",
    pluralLabel: "Countries",
    description: "Nations belonging to a geographic region.",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "short_name", label: "Short Name" },
      { name: "continent_region_id", label: "Geographic Region", relation: relation("continent_region"), required: true },
      { name: "currency_id", label: "Currency", relation: relation("currency") },
      { name: "national_stadium_id", label: "National Stadium", type: "number", min: 1 },
      { name: "economic_factor", label: "Economic Factor", type: "number", min: 0, step: "0.01" },
      { name: "years_to_naturalization", label: "Years to Naturalization", type: "number", min: 0 },
      { name: "nationality_method_id", label: "Nationality Method", relation: relation("nationality_method") },
      { name: "development_state_id", label: "Development State", relation: relation("nation_development_state") },
    ],
    columns: [
      { key: "name", header: "Country" },
      { key: "short_name", header: "Code" },
      { key: "continent_region_id", header: "Geographic Region", relation: relation("continent_region") },
      { key: "currency_id", header: "Currency", relation: relation("currency") },
      { key: "development_state_id", header: "Development", relation: relation("nation_development_state") },
    ],
  },
  "nation-region": {
    table: "nation_region",
    label: "Administrative Region",
    pluralLabel: "Administrative Regions",
    description: "States, provinces or other first-level administrative divisions of a country.",
    fields: [
      { name: "nation_id", label: "Country", relation: relation("nation"), required: true },
      { name: "name", label: "Name", required: true },
      { name: "short_name", label: "Short Name" },
      { name: "population", label: "Population", type: "number", min: 0, step: 1 },
    ],
    columns: [
      { key: "name", header: "Region / State" },
      { key: "short_name", header: "Code" },
      { key: "nation_id", header: "Country", relation: relation("nation") },
      { key: "population", header: "Population" },
    ],
  },
  city: {
    table: "city",
    label: "City",
    pluralLabel: "Cities",
    description: "Cities associated with a country and optionally an administrative region.",
    fields: [
      { name: "nation_id", label: "Country", relation: relation("nation"), required: true },
      { name: "nation_region_id", label: "Administrative Region", relation: relation("nation_region") },
      { name: "name", label: "Name", required: true },
      { name: "attraction", label: "Attraction", type: "number", min: 0, step: 1 },
      { name: "population", label: "Population", type: "number", min: 0, step: 1 },
      { name: "latitude", label: "Latitude", type: "number", min: -90, max: 90, step: "0.000001" },
      { name: "longitude", label: "Longitude", type: "number", min: -180, max: 180, step: "0.000001" },
      { name: "altitude", label: "Altitude", type: "number", step: "0.1" },
      { name: "climate_id", label: "Climate", relation: relation("climate") },
    ],
    columns: [
      { key: "name", header: "City" },
      { key: "nation_region_id", header: "Administrative Region", relation: relation("nation_region") },
      { key: "population", header: "Population" },
      { key: "climate_id", header: "Climate", relation: relation("climate") },
    ],
  },
};

export const geographyChildKind: Partial<Record<GeographyEntityKind, GeographyEntityKind>> = {
  continent: "continent-region",
  "continent-region": "country",
  country: "nation-region",
  "nation-region": "city",
};

export const geographyFilterItems: Array<[string, GeographyEntityKind | "all"]> = [
  ["All", "all"],
  ["Continents", "continent"],
  ["Geographic Regions", "continent-region"],
  ["Countries", "country"],
  ["Administrative Regions", "nation-region"],
  ["Cities", "city"],
];

export const geographyKinds: GeographyEntityKind[] = [
  "continent",
  "continent-region",
  "country",
  "nation-region",
  "city",
];

export function normalizeGeographyValue(value: EntityFormValue, field: GeographyField) {
  if (value === "" || value === undefined) return null;
  if (field.type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (field.type === "boolean") return Boolean(value);
  return value;
}

export function getInitialGeographyValues(
  spec: GeographySpec,
  parent?: GeographyTreeNode,
): Record<string, EntityFormValue> {
  const values: Record<string, EntityFormValue> = {};
  for (const field of spec.fields) values[field.name] = null;
  if (!parent) return values;

  switch (spec.table) {
    case "continent_region":
      values.continent_id = parent.entityId;
      break;
    case "nation":
      values.continent_region_id = parent.entityId;
      break;
    case "nation_region":
      values.nation_id = parent.entityId;
      break;
    case "city":
      values.nation_id = parent.row.nation_id ?? null;
      values.nation_region_id = parent.entityId;
      break;
  }

  return values;
}

export function getGeographyParentDefaults(
  kind: GeographyEntityKind,
  parent?: GeographyTreeNode,
): Record<string, EntityFormValue> {
  return getInitialGeographyValues(geographySpecs[kind], parent);
}

export function getGeographyRequiredRelations(kind: GeographyEntityKind): string[] {
  return geographySpecs[kind].fields
    .filter(field => field.required && field.relation)
    .map(field => field.relation!)
    .filter(Boolean);
}
