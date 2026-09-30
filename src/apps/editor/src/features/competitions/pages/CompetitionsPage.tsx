import { CrudEntityPage } from "../../../shared/components";

export function CompetitionsPage() {
  return (
    <CrudEntityPage
      config={{
        table: "competition",
        title: "Competitions",
        description: "Manage competition roots. Seasons, stages, draws and rules remain linked by foreign keys in the world database.",
        searchColumns: ["name", "three_letter_name"],
        columns: [
          { key: "name", header: "Competition" },
          { key: "three_letter_name", header: "Code" },
          { key: "nation_id", header: "Nation", relation: { table: "nation" } },
          { key: "type_id", header: "Type", relation: { table: "competition_type" } },
          { key: "level", header: "Level" },
          { key: "reputation", header: "Reputation" },
          { key: "extinct", header: "Extinct" },
        ],
        fields: [
          { name: "name", label: "Name", required: true },
          { name: "three_letter_name", label: "Three Letter Name" },
          { name: "nation_id", label: "Nation", relation: { table: "nation" } },
          { name: "gender_id", label: "Gender", relation: { table: "gender" } },
          { name: "level", label: "Level", type: "number" },
          { name: "parent_competition_id", label: "Parent Competition", relation: { table: "competition" } },
          { name: "reputation", label: "Reputation", type: "number" },
          { name: "trophy_id", label: "Trophy", relation: { table: "trophy" } },
          { name: "allows_foreign_referees", label: "Foreign Referees", type: "boolean" },
          { name: "requires_seated_stadiums", label: "Requires Seated Stadiums", type: "boolean" },
          { name: "extinct", label: "Extinct", type: "boolean" },
          { name: "type_id", label: "Type", relation: { table: "competition_type" } },
          { name: "goal_line_tv_only", label: "Goal Line TV Only", type: "boolean" },
          { name: "goal_line_from_main_stage", label: "Goal Line From Main Stage", type: "boolean" },
          { name: "goal_line_from_sub_stage", label: "Goal Line From Sub Stage", type: "boolean" },
          { name: "goal_line_from_date", label: "Goal Line From Date", type: "date" },
          { name: "minimum_referee_category_id", label: "Minimum Referee Category", relation: { table: "referee_category" } },
        ],
        defaultValues: {
          allows_foreign_referees: false,
          requires_seated_stadiums: false,
          extinct: false,
          goal_line_tv_only: false,
          goal_line_from_main_stage: false,
          goal_line_from_sub_stage: false,
        },
      }}
    />
  );
}