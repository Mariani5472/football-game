import { CrudEntityPage } from "../../../shared/components";

const relation = (table: string, labelColumn = "name") => ({ table, labelColumn });

export function ConfederationsPage() {
  return (
    <CrudEntityPage
      config={{
        table: "confederation",
        title: "Confederations",
        description: "Manage football confederations independently from geographic continents.",
        searchColumns: ["name", "short_name"],
        columns: [
          { key: "name", header: "Confederation" },
          { key: "short_name", header: "Short Name" },
          { key: "description", header: "Description" },
        ],
        fields: [
          { name: "name", label: "Name", required: true },
          { name: "short_name", label: "Short Name", required: true },
          { name: "description", label: "Description" },
        ],
      }}
    />
  );
}

export function ContinentsPage() {
  return (
    <CrudEntityPage
      config={{
        table: "continent",
        title: "Continents",
        description: "Manage the geographic roots of the world.",
        searchColumns: ["name", "short_name"],
        columns: [
          { key: "name", header: "Name" },
          { key: "short_name", header: "Short Name" },
          { key: "continental_name", header: "Continental Name" },
        ],
        fields: [
          { name: "name", label: "Name", required: true },
          { name: "short_name", label: "Short Name" },
          { name: "continental_name", label: "Continental Name" },
        ],
      }}
    />
  );
}

export function CountriesPage() {
  return (
    <CrudEntityPage
      config={{
        table: "nation",
        title: "Countries",
        description: "Manage countries and their world-level relationships.",
        searchColumns: ["name", "short_name"],
        columns: [
          { key: "name", header: "Name" },
          { key: "short_name", header: "Short Name" },
          { key: "continent_region_id", header: "Continent Region", relation: relation("continent_region") },
          { key: "currency_id", header: "Currency", relation: relation("currency") },
        ],
        fields: [
          { name: "name", label: "Name", required: true },
          { name: "short_name", label: "Short Name" },
          { name: "continent_region_id", label: "Continent Region", relation: relation("continent_region") },
          { name: "currency_id", label: "Currency", relation: relation("currency") },
          { name: "national_stadium_id", label: "National Stadium", type: "number" },
          { name: "economic_factor", label: "Economic Factor", type: "number", step: "0.01" },
          { name: "years_to_naturalization", label: "Years to Naturalization", type: "number" },
          { name: "nationality_method_id", label: "Nationality Method", relation: relation("nationality_method") },
          { name: "development_state_id", label: "Development State", relation: relation("nation_development_state") },
        ],
      }}
    />
  );
}

export function RegionsPage() {
  return (
    <CrudEntityPage
      config={{
        table: "nation_region",
        title: "Regions",
        description: "Organize nations into editor regions used by geography and rules.",
        searchColumns: ["name", "short_name"],
        columns: [
          { key: "name", header: "Name" },
          { key: "short_name", header: "Short Name" },
          { key: "nation_id", header: "Country", relation: relation("nation") },
          { key: "population", header: "Population" },
        ],
        fields: [
          { name: "nation_id", label: "Country", relation: relation("nation") },
          { name: "name", label: "Name", required: true },
          { name: "short_name", label: "Short Name" },
          { name: "population", label: "Population", type: "number" },
        ],
      }}
    />
  );
}

export function LanguagesPage() {
  return (
    <CrudEntityPage
      config={{
        table: "language",
        title: "Languages",
        description: "Manage language definitions and their hierarchy.",
        searchColumns: ["name"],
        columns: [
          { key: "name", header: "Language" },
          { key: "influence", header: "Influence" },
          { key: "learning_difficulty", header: "Difficulty" },
          { key: "family_id", header: "Family", relation: relation("language_family") },
          { key: "group_id", header: "Group", relation: relation("language_group") },
          { key: "subgroup_id", header: "Subgroup", relation: relation("language_subgroup") },
        ],
        fields: [
          { name: "name", label: "Name", required: true },
          { name: "influence", label: "Influence", type: "number" },
          { name: "learning_difficulty", label: "Learning Difficulty", type: "number" },
          { name: "family_id", label: "Family", relation: relation("language_family") },
          { name: "group_id", label: "Group", relation: relation("language_group") },
          { name: "subgroup_id", label: "Subgroup", relation: relation("language_subgroup") },
        ],
      }}
    />
  );
}

export function ClimatesPage() {
  return (
    <CrudEntityPage
      config={{
        table: "climate",
        title: "Climates",
        description: "Define climate types referenced by the world geography.",
        searchColumns: ["name", "short_name"],
        columns: [
          { key: "name", header: "Name" },
          { key: "short_name", header: "Short Name" },
        ],
        fields: [
          { name: "name", label: "Name", required: true },
          { name: "short_name", label: "Short Name" },
        ],
      }}
    />
  );
}

export function CitiesPage() {
  return (
    <CrudEntityPage
      config={{
        table: "city",
        title: "Cities",
        description: "Manage cities, geography, population and climate.",
        searchColumns: ["name"],
        columns: [
          { key: "name", header: "City" },
          { key: "nation_id", header: "Country", relation: relation("nation") },
          { key: "nation_region_id", header: "Region", relation: relation("nation_region") },
          { key: "population", header: "Population" },
          { key: "climate_id", header: "Climate", relation: relation("climate") },
        ],
        fields: [
          { name: "nation_id", label: "Country", relation: relation("nation") },
          { name: "nation_region_id", label: "Region", relation: relation("nation_region") },
          { name: "name", label: "Name", required: true },
          { name: "attraction", label: "Attraction", type: "number" },
          { name: "population", label: "Population", type: "number" },
          { name: "latitude", label: "Latitude", type: "number", step: "0.000001" },
          { name: "longitude", label: "Longitude", type: "number", step: "0.000001" },
          { name: "altitude", label: "Altitude", type: "number" },
          { name: "climate_id", label: "Climate", relation: relation("climate") },
        ],
      }}
    />
  );
}
