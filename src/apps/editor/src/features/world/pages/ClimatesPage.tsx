import { CrudEntityPage } from "../../../shared/components";

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
