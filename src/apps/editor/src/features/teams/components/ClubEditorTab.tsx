import { TacticalProfileEditor } from "./TacticalProfileEditor";
import { ClubScopedRelationEditor } from "./ClubScopedRelationEditor";
import { ClubIdentityEditor } from "./ClubIdentityEditor";
import { ClubLocationEditor } from "./ClubLocationEditor";
import { clubEditorRelations, type ClubEditorTabDefinition } from "../config/clubEditorConfig";

export function ClubEditorTab({
  clubId,
  tab,
}: {
  clubId: number;
  tab: ClubEditorTabDefinition;
}) {
  if (tab.id === "identity") {
    return <ClubIdentityEditor clubId={clubId} onSaved={() => undefined} />;
  }

  if (tab.id === "location") {
    return <ClubLocationEditor clubId={clubId} onSaved={() => undefined} />;
  }

  if (tab.id === "stadium") {
    return <StadiumTab clubId={clubId} />;
  }

  if (tab.id === "tactics") {
    return <TacticalProfileEditor teamId={clubId} />;
  }

  if (tab.configs.length === 0) {
    return <EmptyTab />;
  }

  return (
    <div className="space-y-5">
      {tab.configs.map((config) => (
        <ClubScopedRelationEditor
          key={config.id}
          clubId={clubId}
          config={config}
        />
      ))}
    </div>
  );
}


  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="text-sm font-semibold text-white">Tactical profile</div>
        <p className="mt-1 text-xs text-slate-500">
          Configure the team&apos;s base, offensive and defensive formation preferences.
        </p>
        <ClubScopedRelationEditor
          clubId={teamId}
          config={clubEditorRelations.tacticalProfile}
        />
      </div>
    </div>
  );
}

function StadiumTab({ clubId }: { clubId: number }) {
  const stadiums = {
    id: "stadiums",
    title: "Home Stadiums",
    description: "Stadiums currently owned by or assigned to the club.",
    table: "stadium",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "city_id", label: "City", relation: { table: "city" } },
      { name: "owner_type_id", label: "Owner Type", relation: { table: "stadium_owner_type" } },
      { name: "capacity", label: "Capacity", type: "number" as const },
      { name: "seated_capacity", label: "Seated Capacity", type: "number" as const },
      { name: "expansion_capacity", label: "Expansion Capacity", type: "number" as const },
      { name: "seats_in_use", label: "Seats In Use", type: "number" as const },
      { name: "pitch_type_id", label: "Pitch Type", relation: { table: "pitch_type" } },
      { name: "quality_state_id", label: "Quality", relation: { table: "quality_state" } },
      { name: "environment_quality_id", label: "Environment Quality", relation: { table: "environment_quality" } },
      { name: "construction_date", label: "Construction Date", type: "date" as const },
      { name: "reconstruction_date", label: "Reconstruction Date", type: "date" as const },
      { name: "latitude", label: "Latitude", type: "number" as const },
      { name: "longitude", label: "Longitude", type: "number" as const },
      { name: "has_cover", label: "Cover", type: "boolean" as const },
      { name: "has_retractable_roof", label: "Retractable Roof", type: "boolean" as const },
      { name: "has_underfloor_heating", label: "Underfloor Heating", type: "boolean" as const },
      { name: "has_digital_advertising", label: "Digital Advertising", type: "boolean" as const },
      { name: "has_capacity_change", label: "Capacity Change", type: "boolean" as const },
      { name: "extinct", label: "Extinct", type: "boolean" as const },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "capacity", label: "Capacity" },
      { key: "seated_capacity", label: "Seated" },
      { key: "city_id", label: "City" },
    ],
    primaryKey: ["id"],
    scope: { type: "club" as const, field: "owner_club_id" },
  };

  return (
    <div className="space-y-5">
      <ClubScopedRelationEditor clubId={clubId} config={stadiums} />
      <ClubScopedRelationEditor
        clubId={clubId}
        config={clubEditorRelations.stadiumChanges}
      />
      <ClubScopedRelationEditor
        clubId={clubId}
        config={clubEditorRelations.alternativeStadium}
      />
    </div>
  );
}

function EmptyTab() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-500">
      No editable data is configured for this section yet.
    </div>
  );
}
