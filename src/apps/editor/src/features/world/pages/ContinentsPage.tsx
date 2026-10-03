import { CrudEntityPage } from "../../../shared/components";

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
