import { CrudEntityPage } from "../../../shared/components";

export function PeoplePage() {
  return (
    <CrudEntityPage
      config={{
        table: "person",
        title: "People",
        description: "Manage person identity data shared by players, staff and other world actors.",
        searchColumns: ["full_name", "common_name"],
        columns: [
          { key: "full_name", header: "Name" },
          { key: "common_name", header: "Common Name" },
          { key: "birth_date", header: "Birth Date" },
          { key: "nationality_id", header: "Nationality", relation: { table: "nation" } },
          { key: "birth_city_id", header: "Birth City", relation: { table: "city" } },
        ],
        fields: [
          { name: "full_name", label: "Full Name", required: true },
          { name: "common_name", label: "Common Name" },
          { name: "birth_date", label: "Birth Date", type: "date" },
          { name: "birth_city_id", label: "Birth City", relation: { table: "city" } },
          { name: "nationality_id", label: "Nationality", relation: { table: "nation" } },
          { name: "second_nationality_id", label: "Second Nationality", relation: { table: "nation" } },
          { name: "person_type_id", label: "Person Type", relation: { table: "person_type" } },
          { name: "gender_id", label: "Gender", relation: { table: "gender" } },
        ],
      }}
    />
  );
}