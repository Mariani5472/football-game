import type { RelationDefinition } from "./RelationTypes";

export interface RelationEditorConfig {
  key: string;
  title: string;
  relation: RelationDefinition;
  ownerTable: string;
  targetTable: string;
  valueColumns?: Array<"percentage" | "weight" | "seed" | "value">;
}

export const relationEditorConfigs: RelationEditorConfig[] = [
  {
    key: "nation-language",
    title: "Nation Languages",
    relation: {
      table: "nation_language",
      ownerColumns: ["nation_id"],
      targetColumn: "language_id",
      keyColumns: ["nation_id", "language_id"],
      targetTable: "language",
      targetLabelColumn: "name",
      valueColumns: ["percentage"],
    },
    ownerTable: "nation",
    targetTable: "language",
    valueColumns: ["percentage"],
  },
  {
    key: "city-language",
    title: "City Languages",
    relation: {
      table: "city_language",
      ownerColumns: ["city_id"],
      targetColumn: "language_id",
      keyColumns: ["city_id", "language_id"],
      targetTable: "language",
      targetLabelColumn: "name",
      valueColumns: ["percentage"],
    },
    ownerTable: "city",
    targetTable: "language",
    valueColumns: ["percentage"],
  },
  {
    key: "person-language",
    title: "Person Languages",
    relation: {
      table: "person_language",
      ownerColumns: ["person_id"],
      targetColumn: "language_id",
      keyColumns: ["person_id", "language_id"],
      targetTable: "language",
      targetLabelColumn: "name",
    },
    ownerTable: "person",
    targetTable: "language",
  },
  {
    key: "player-position",
    title: "Player Positions",
    relation: {
      table: "player_position",
      ownerColumns: ["player_id"],
      targetColumn: "position_id",
      keyColumns: ["player_id", "position_id"],
      targetTable: "position_definition",
      targetLabelColumn: "name",
    },
    ownerTable: "player",
    targetTable: "position_definition",
  },
  {
    key: "player-role-duty",
    title: "Role Duties",
    relation: {
      table: "player_role_duty",
      ownerColumns: ["role_id"],
      targetColumn: "duty_id",
      keyColumns: ["role_id", "duty_id"],
      targetTable: "role_duty",
      targetLabelColumn: "name",
    },
    ownerTable: "player_role",
    targetTable: "role_duty",
  },
  {
    key: "player-role-key-attribute",
    title: "Role Key Attributes",
    relation: {
      table: "player_role_key_attribute",
      ownerColumns: ["role_id"],
      targetColumn: "attribute_id",
      keyColumns: ["role_id", "attribute_id"],
      targetTable: "player_attribute_definition",
      targetLabelColumn: "name",
      valueColumns: ["weight"],
    },
    ownerTable: "player_role",
    targetTable: "player_attribute_definition",
    valueColumns: ["weight"],
  },
  {
    key: "position-attribute-weight",
    title: "Position Attribute Weights",
    relation: {
      table: "position_attribute_weight",
      ownerColumns: ["position_id"],
      targetColumn: "attribute_id",
      keyColumns: ["position_id", "attribute_id"],
      targetTable: "player_attribute_definition",
      targetLabelColumn: "name",
      valueColumns: ["weight"],
    },
    ownerTable: "position_definition",
    targetTable: "player_attribute_definition",
    valueColumns: ["weight"],
  },
  {
    key: "draw-pot-team",
    title: "Draw Pot Teams",
    relation: {
      table: "draw_pot_team",
      ownerColumns: ["draw_pot_id"],
      targetColumn: "team_id",
      keyColumns: ["draw_pot_id", "team_id"],
      targetTable: "team",
      targetLabelColumn: "name",
      valueColumns: ["seed"],
    },
    ownerTable: "draw_pot",
    targetTable: "team",
    valueColumns: ["seed"],
  },
  {
    key: "award-eligible-recipient",
    title: "Award Eligibility",
    relation: {
      table: "award_eligible_recipient",
      ownerColumns: ["award_id"],
      targetColumn: "recipient_type_id",
      keyColumns: ["award_id", "recipient_type_id"],
      targetTable: "award_recipient_type",
      targetLabelColumn: "name",
    },
    ownerTable: "award",
    targetTable: "award_recipient_type",
  },
  {
    key: "award-used-statistic",
    title: "Award Statistics",
    relation: {
      table: "award_used_statistic",
      ownerColumns: ["award_id"],
      targetColumn: "statistic_id",
      keyColumns: ["award_id", "statistic_id"],
      targetTable: "award_statistic",
      targetLabelColumn: "name",
    },
    ownerTable: "award",
    targetTable: "award_statistic",
  },
  {
    key: "formation-instruction",
    title: "Formation Instructions",
    relation: {
      table: "formation_instruction",
      ownerColumns: ["formation_id"],
      targetColumn: "instruction_id",
      keyColumns: ["formation_id", "instruction_id"],
      targetTable: "tactical_instruction",
      targetLabelColumn: "name",
    },
    ownerTable: "formation",
    targetTable: "tactical_instruction",
  },
  {
    key: "formation-position-role-duty",
    title: "Formation Position Assignment",
    relation: {
      table: "formation_position_assignment",
      ownerColumns: ["formation_position_id"],
      targetColumn: "role_id",
      keyColumns: ["formation_position_id"],
      targetTable: "player_role",
      targetLabelColumn: "name",
    },
    ownerTable: "formation_position",
    targetTable: "player_role",
  },
  {
    key: "club-affiliation",
    title: "Club Affiliations",
    relation: {
      table: "club_affiliation",
      ownerColumns: ["root_club_id"],
      targetColumn: "target_club_id",
      keyColumns: ["root_club_id", "target_club_id", "start_date"],
      targetTable: "club",
    },
    ownerTable: "club",
    targetTable: "club",
  },
  {
    key: "nationality-eligibility",
    title: "Nationality Eligibility Rules",
    relation: {
      table: "nationality_eligibility_rule",
      ownerColumns: ["nation_id"],
      targetColumn: "required_nation_id",
      keyColumns: ["nation_id", "required_nation_id"],
      targetTable: "nation",
      targetLabelColumn: "name",
    },
    ownerTable: "nation",
    targetTable: "nation",
  },
];

export function getRelationEditorConfig(key: string) {
  return relationEditorConfigs.find(config => config.key === key);
}
