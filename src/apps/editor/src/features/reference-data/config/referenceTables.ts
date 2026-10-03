export const referenceTables = [
  "gender","club_status","club_observation","stadium_owner_type","pitch_type",
  "grass_deterioration_rate","quality_state","environment_quality","stadium_change_type",
  "competition_stage_type","competition_type","referee_category","trophy",
  "ownership_type","ownership_promise","president_title","patron_type",
  "embargo_type","revenue_type","debt_source","money_direction","payment_interval",
  "clause_condition","person_type","employment","second_nationality_info",
  "position_definition","player_role","player_attribute_definition","injury","injury_classification","injury_subclassification",
  "injury_reason","suspension","suspension_type","game_location_type",
  "objective_type","equipment_type","equipment_piece","equipment_style",
  "retired_number_reason","club_affiliation_type","division","transfer_status",
  "transfer_type","contract_type","contract_clause_type","role_duty","player_achievement_type",
  "tactical_instruction","attribute_scale","press_period","press_type",
  "press_source","award_period","award_recipient_type","award_type",
  "award_voting_type","award_organizer","award_statistic","record_type",
  "weather_season","climate","weekday",
] as const;

export type ReferenceTable = (typeof referenceTables)[number];

export const referenceGroups = {
  Core: referenceTables.slice(0, 8),
  Competitions: referenceTables.slice(8, 12),
  Club: referenceTables.slice(12, 22),
  People: referenceTables.slice(22, 32),
  Gameplay: referenceTables.slice(32, 46),
  Press: referenceTables.slice(46, 49),
  Awards: referenceTables.slice(49, 56),
  Weather: referenceTables.slice(56),
};

export function titleize(value: string) {
  return value
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
