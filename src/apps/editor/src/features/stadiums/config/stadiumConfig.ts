import type { CrudColumn, CrudEntityConfig, CrudField } from "../../../shared/components";

const rel = (table: string, labelColumn = "name") => ({ table, labelColumn });

const field = (
  name: string,
  label: string,
  options: Omit<CrudField, "name" | "label"> = {},
): CrudField => ({ name, label, ...options });

const columns = (
  items: Array<[string, string, CrudColumn["relation"]?]>,
): CrudColumn[] =>
  items.map(([key, header, relation]) => ({
    key,
    header,
    ...(relation ? { relation } : {}),
  }));

const config = (
  table: string,
  title: string,
  description: string,
  fields: CrudField[],
  visibleColumns: Array<[string, string, CrudColumn["relation"]?]>,
  searchColumns?: string[],
): CrudEntityConfig => ({
  table,
  title,
  description,
  fields,
  columns: columns(visibleColumns),
  searchColumns,
  pageSize: 15,
});

export const stadiumConfig = config(
  "stadium",
  "Stadiums",
  "Complete stadium identity, location, capacity, pitch, environment and infrastructure.",
  [
    field("city_id", "City", { required: true, relation: rel("city") }),
    field("name", "Name", { required: true }),
    field("is_training_ground", "Training Ground", { type: "boolean" }),
    field("owner_type_id", "Owner Type", { relation: rel("stadium_owner_type") }),
    field("owner_club_id", "Owner Club", { relation: rel("team") }),
    field("owner_person_id", "Owner Person", { relation: rel("person", "full_name") }),

    field("capacity", "Capacity", { type: "number", min: 0 }),
    field("seated_capacity", "Seated Capacity", { type: "number", min: 0 }),
    field("expansion_capacity", "Expansion Capacity", { type: "number", min: 0 }),
    field("seats_in_use", "Seats In Use", { type: "number", min: 0 }),

    field("pitch_type_id", "Pitch Type", { relation: rel("pitch_type") }),
    field("field_length", "Field Length", { type: "number", step: "0.01", min: 0 }),
    field("international_field_length", "International Field Length", { type: "number", step: "0.01", min: 0 }),
    field("min_field_length", "Minimum Field Length", { type: "number", step: "0.01", min: 0 }),
    field("max_field_length", "Maximum Field Length", { type: "number", step: "0.01", min: 0 }),
    field("field_width", "Field Width", { type: "number", step: "0.01", min: 0 }),
    field("international_field_width", "International Field Width", { type: "number", step: "0.01", min: 0 }),
    field("min_field_width", "Minimum Field Width", { type: "number", step: "0.01", min: 0 }),
    field("max_field_width", "Maximum Field Width", { type: "number", step: "0.01", min: 0 }),
    field("field_condition", "Field Condition", { type: "number", min: 0 }),
    field("grass_deterioration_rate_id", "Grass Deterioration", { relation: rel("grass_deterioration_rate") }),
    field("grass_recovery_level", "Grass Recovery Level", { type: "number", min: 0 }),

    field("last_pitch_replacement_date", "Last Pitch Replacement", { type: "date" }),
    field("pitch_replacement_deadline", "Pitch Replacement Deadline", { type: "date" }),
    field("construction_date", "Construction Date", { type: "date" }),
    field("reconstruction_date", "Reconstruction Date", { type: "date" }),
    field("current_ownership_date", "Current Ownership Date", { type: "date" }),

    field("latitude", "Latitude", { type: "number", step: "0.000001" }),
    field("longitude", "Longitude", { type: "number", step: "0.000001" }),

    field("quality_state_id", "Quality", { relation: rel("quality_state") }),
    field("environment_quality_id", "Environment Quality", { relation: rel("environment_quality") }),

    field("used_by_national_team", "Used By National Team", { type: "boolean" }),
    field("banned_from_continental_final", "Banned From Continental Final", { type: "boolean" }),
    field("extinct", "Extinct", { type: "boolean" }),

    field("has_cover", "Cover", { type: "boolean" }),
    field("has_retractable_roof", "Retractable Roof", { type: "boolean" }),
    field("has_underfloor_heating", "Underfloor Heating", { type: "boolean" }),
    field("has_digital_advertising", "Digital Advertising", { type: "boolean" }),
    field("has_capacity_change", "Has Capacity Change", { type: "boolean" }),
  ],
  [
    ["name", "Name"],
    ["city_id", "City", rel("city")],
    ["owner_club_id", "Owner", rel("team")],
    ["capacity", "Capacity"],
    ["seated_capacity", "Seated Capacity"],
    ["pitch_type_id", "Pitch", rel("pitch_type")],
    ["quality_state_id", "Quality", rel("quality_state")],
    ["used_by_national_team", "National Team"],
    ["extinct", "Extinct"],
  ],
  ["name"],
);

export const stadiumChangeConfig = config(
  "stadium_change",
  "Stadium Changes",
  "Historical stadium changes for clubs, including replacement and relocation periods.",
  [
    field("club_id", "Club", { required: true, relation: rel("team") }),
    field("change_type_id", "Change Type", { required: true, relation: rel("stadium_change_type") }),
    field("new_stadium_id", "New Stadium", { required: true, relation: rel("stadium") }),
    field("old_stadium_id", "Old Stadium", { relation: rel("stadium") }),
    field("start_date", "Start Date", { type: "date" }),
    field("end_date", "End Date", { type: "date" }),
  ],
  [
    ["club_id", "Club", rel("team")],
    ["change_type_id", "Change Type", rel("stadium_change_type")],
    ["new_stadium_id", "New Stadium", rel("stadium")],
    ["old_stadium_id", "Old Stadium", rel("stadium")],
    ["start_date", "Start Date"],
    ["end_date", "End Date"],
  ],
);

export const alternativeStadiumConfig = config(
  "alternative_stadium",
  "Alternative Stadiums",
  "Alternative venues used by clubs for specific competitions, seasons or stages.",
  [
    field("club_id", "Club", { required: true, relation: rel("team") }),
    field("competition_id", "Competition", { required: true, relation: rel("competition") }),
    field("stadium_id", "Stadium", { required: true, relation: rel("stadium") }),
    field("year", "Year", { type: "number" }),
    field("stage_type_id", "Stage Type", { relation: rel("competition_stage_type") }),
    field("start_date", "Start Date", { type: "date" }),
    field("end_date", "End Date", { type: "date" }),
  ],
  [
    ["club_id", "Club", rel("club")],
    ["competition_id", "Competition", rel("competition")],
    ["stadium_id", "Stadium", rel("stadium")],
    ["year", "Year"],
    ["stage_type_id", "Stage", rel("competition_stage_type")],
  ],
);

export const stadiumConfigs = {
  stadium: stadiumConfig,
  change: stadiumChangeConfig,
  alternative: alternativeStadiumConfig,
} as const;
