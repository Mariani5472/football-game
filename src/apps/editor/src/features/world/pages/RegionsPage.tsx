import { CrudEntityPage } from "../../../shared/components";

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
          { key: "nation_id", header: "Country", relation: { table: "nation" } },
          { key: "population", header: "Population" },
        ],
        fields: [
          { name: "nation_id", label: "Country", relation: { table: "nation" } },
          { name: "name", label: "Name", required: true },
          { name: "short_name", label: "Short Name" },
          { name: "population", label: "Population", type: "number" },
        ],
      }}
    />
  );
}
