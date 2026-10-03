import { CrudEntityPage } from "../../../shared/components";

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
