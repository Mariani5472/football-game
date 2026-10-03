import { CrudEntityPage } from "../../../shared/components";

const relation = (table: string) => ({ table });

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
