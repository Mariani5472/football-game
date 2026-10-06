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
  fields: GeographyField[];
}

export const geographySpecs: Record<GeographyEntityKind, GeographySpec> = {
  continent: { table: "continent", label: "Continent", fields: [
    { name: "name", label: "Name", required: true },
    { name: "short_name", label: "Short Name" },
    { name: "continental_name", label: "Continental Name" },
  ]},
  "continent-region": { table: "continent_region", label: "Continent Region", fields: [
    { name: "continent_id", label: "Continent", relation: "continent", required: true },
    { name: "name", label: "Name", required: true },
    { name: "short_name", label: "Short Name" },
  ]},
  country: { table: "nation", label: "Country", fields: [
    { name: "name", label: "Name", required: true },
    { name: "short_name", label: "Short Name" },
    { name: "continent_region_id", label: "Continent Region", relation: "continent_region", required: true },
    { name: "currency_id", label: "Currency", relation: "currency" },
    { name: "national_stadium_id", label: "National Stadium", type: "number", min: 1 },
    { name: "economic_factor", label: "Economic Factor", type: "number", step: "0.01" },
    { name: "years_to_naturalization", label: "Years to Naturalization", type: "number", min: 0 },
    { name: "nationality_method_id", label: "Nationality Method", relation: "nationality_method" },
    { name: "development_state_id", label: "Development State", relation: "nation_development_state" },
  ]},
  "nation-region": { table: "nation_region", label: "Nation Region", fields: [
    { name: "nation_id", label: "Country", relation: "nation", required: true },
    { name: "name", label: "Name", required: true },
    { name: "short_name", label: "Short Name" },
    { name: "population", label: "Population", type: "number", min: 0 },
  ]},
  city: { table: "city", label: "City", fields: [
    { name: "nation_id", label: "Country", relation: "nation", required: true },
    { name: "nation_region_id", label: "Nation Region", relation: "nation_region" },
    { name: "name", label: "Name", required: true },
    { name: "attraction", label: "Attraction", type: "number", min: 0 },
    { name: "population", label: "Population", type: "number", min: 0 },
    { name: "latitude", label: "Latitude", type: "number", min: -90, max: 90, step: "0.000001" },
    { name: "longitude", label: "Longitude", type: "number", min: -180, max: 180, step: "0.000001" },
    { name: "altitude", label: "Altitude", type: "number" },
    { name: "climate_id", label: "Climate", relation: "climate" },
  ]},
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
  ["Countries", "country"],
  ["Regions", "nation-region"],
  ["Cities", "city"],
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

export function getInitialGeographyValues(spec: GeographySpec, parent?: GeographyTreeNode) {
  const values: Record<string, EntityFormValue> = {};
  for (const field of spec.fields) values[field.name] = null;
  if (!parent) return values;
  if (spec.table === "continent-region") values.continent_id = parent.entityId;
  if (spec.table === "nation") values.continent_region_id = parent.entityId;
  if (spec.table === "nation_region") values.nation_id = parent.entityId;
  if (spec.table === "city") {
    values.nation_id = parent.row.nation_id ?? null;
    values.nation_region_id = parent.entityId;
  }
  return values;
}


export const geographyKindsByLevel: Record<string, GeographyEntityKind[]> = {
  root: ["continent"],
  continent: ["continent-region"],
  "continent-region": ["country"],
  country: ["nation-region"],
  "nation-region": ["city"],
  city: [],
};

export function getGeographyParentDefaults(
  kind: GeographyEntityKind,
  parent?: GeographyTreeNode,
): Record<string, EntityFormValue> {
  const values = getInitialGeographyValues(geographySpecs[kind], parent);
  return { ...values };
}

export function getGeographyRequiredRelations(kind: GeographyEntityKind): string[] {
  return geographySpecs[kind].fields
    .filter(field => field.required && field.relation)
    .map(field => field.relation!)
    .filter(Boolean);
}
