import { CrudEntityPage } from "../../../shared/components";

export function PlayersPage() {
  return (
    <CrudEntityPage
      config={{
        table: "player",
        title: "Players",
        description: "Manage player specialization records. Person remains the source identity and is selected through person_id.",
        searchColumns: ["person_id"],
        columns: [
          { key: "person_id", header: "Person", relation: { table: "person", labelColumn: "full_name" } },
          { key: "height", header: "Height" },
          { key: "weight", header: "Weight" },
          { key: "preferred_foot", header: "Preferred Foot" },
        ],
        fields: [
          { name: "person_id", label: "Person", required: true, relation: { table: "person", labelColumn: "full_name" } },
          { name: "height", label: "Height", type: "number" },
          { name: "weight", label: "Weight", type: "number" },
          { name: "preferred_foot", label: "Preferred Foot" },
          { name: "potential", label: "Potential", type: "number" },
          { name: "home_reputation", label: "Home Reputation", type: "number" },
          { name: "current_reputation", label: "Current Reputation", type: "number" },
          { name: "estimated_value", label: "Estimated Value", type: "number" },
        ],
        defaultValues: {},
      }}
    />
  );
}