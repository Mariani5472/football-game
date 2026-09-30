import { CrudEntityPage } from "../../../shared/components";

export function StadiumsPage() {
  return (
    <CrudEntityPage
      config={{
        table: "stadium",
        title: "Stadiums",
        description: "Manage stadium identity, location, capacity and match-day infrastructure.",
        searchColumns: ["name"],
        columns: [
          { key: "name", header: "Name" },
          { key: "city_id", header: "City", relation: { table: "city" } },
          { key: "capacity", header: "Capacity" },
          { key: "owner_club_id", header: "Owner", relation: { table: "team" } },
          { key: "quality_state_id", header: "Quality", relation: { table: "quality_state" } },
          { key: "extinct", header: "Extinct" },
        ],
        fields: [
          { name: "city_id", label: "City", required: true, relation: { table: "city" } },
          { name: "name", label: "Name", required: true },
          { name: "is_training_ground", label: "Training Ground", type: "boolean" },
          { name: "owner_type_id", label: "Owner Type", relation: { table: "stadium_owner_type" } },
          { name: "owner_club_id", label: "Owner Club", relation: { table: "team" } },
          { name: "owner_person_id", label: "Owner Person", relation: { table: "person" } },
          { name: "capacity", label: "Capacity", type: "number" },
          { name: "seated_capacity", label: "Seated Capacity", type: "number" },
          { name: "expansion_capacity", label: "Expansion Capacity", type: "number" },
          { name: "seats_in_use", label: "Seats In Use", type: "number" },
          { name: "pitch_type_id", label: "Pitch Type", relation: { table: "pitch_type" } },
          { name: "grass_deterioration_rate_id", label: "Grass Deterioration", relation: { table: "grass_deterioration_rate" } },
          { name: "quality_state_id", label: "Quality", relation: { table: "quality_state" } },
          { name: "environment_quality_id", label: "Environment", relation: { table: "environment_quality" } },
          { name: "last_pitch_replacement_date", label: "Last Pitch Replacement", type: "date" },
          { name: "construction_date", label: "Construction Date", type: "date" },
          { name: "reconstruction_date", label: "Reconstruction Date", type: "date" },
          { name: "current_ownership_date", label: "Current Ownership Date", type: "date" },
          { name: "latitude", label: "Latitude", type: "number", step: "0.000001" },
          { name: "longitude", label: "Longitude", type: "number", step: "0.000001" },
          { name: "used_by_national_team", label: "Used By National Team", type: "boolean" },
          { name: "banned_from_continental_final", label: "Banned From Continental Final", type: "boolean" },
          { name: "extinct", label: "Extinct", type: "boolean" },
          { name: "has_cover", label: "Cover", type: "boolean" },
          { name: "has_retractable_roof", label: "Retractable Roof", type: "boolean" },
          { name: "has_underfloor_heating", label: "Underfloor Heating", type: "boolean" },
          { name: "has_digital_advertising", label: "Digital Advertising", type: "boolean" },
        ],
        defaultValues: {
          is_training_ground: false,
          used_by_national_team: false,
          banned_from_continental_final: false,
          extinct: false,
          has_cover: false,
          has_retractable_roof: false,
          has_underfloor_heating: false,
          has_digital_advertising: false,
        },
      }}
    />
  );
}