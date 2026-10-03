import { CrudEntityPage } from "../../../shared/components";

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
          { key: "nation_id", header: "Country", relation: { table: "nation" } },
          { key: "nation_region_id", header: "Region", relation: { table: "nation_region" } },
          { key: "population", header: "Population" },
          { key: "climate_id", header: "Climate", relation: { table: "climate" } },
        ],
        fields: [
          { name: "nation_id", label: "Country", relation: { table: "nation" } },
          { name: "nation_region_id", label: "Region", relation: { table: "nation_region" } },
          { name: "name", label: "Name", required: true },
          { name: "attraction", label: "Attraction", type: "number" },
          { name: "population", label: "Population", type: "number" },
          { name: "latitude", label: "Latitude", type: "number", step: "0.000001" },
          { name: "longitude", label: "Longitude", type: "number", step: "0.000001" },
          { name: "altitude", label: "Altitude", type: "number" },
          { name: "climate_id", label: "Climate", relation: { table: "climate" } },
        ],
      }}
    />
  );
}
