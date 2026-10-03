import { CrudEntityPage } from "../../../shared/components";

const relation = (table: string, labelColumn = "name") => ({
  table,
  labelColumn,
});

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
