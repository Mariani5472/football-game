import { useState } from "react";
import { Building2, Plus, UsersRound } from "lucide-react";
import { CrudEntityPage, EntityForm, EntityPicker, type CrudEntityConfig } from "../../../shared/components";
import { editorApi } from "../../../shared/api/editorApi";
import { TeamTypeSelector } from "../components/TeamTypeSelector";
import { useTeamEditor } from "../hooks/useTeamEditor";

const teamConfig: CrudEntityConfig = {
  table: "team",
  title: "Teams",
  description: "Manage shared team identities. Clubs and national teams use this record as their root identity.",
  searchColumns: ["name", "short_name", "three_letter_name", "nickname"],
  columns: [
    { key: "name", header: "Name" },
    { key: "short_name", header: "Short Name" },
    { key: "nation_id", header: "Nation", relation: { table: "nation" } },
    { key: "gender_id", header: "Gender", relation: { table: "gender" } },
    { key: "reputation", header: "Reputation" },
    { key: "extinct", header: "Extinct" },
  ],
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "short_name", label: "Short Name" },
    { name: "six_letter_name", label: "Six Letter Name" },
    { name: "three_letter_name", label: "Three Letter Name" },
    { name: "alternative_three_letter_name", label: "Alternative Three Letter Name" },
    { name: "nickname", label: "Nickname" },
    { name: "hashtag", label: "Hashtag" },
    { name: "gender_id", label: "Gender", relation: { table: "gender" } },
    { name: "nation_id", label: "Nation", relation: { table: "nation" } },
    { name: "reputation", label: "Reputation", type: "number" },
    { name: "extinct", label: "Extinct", type: "boolean", placeholder: "Team is extinct" },
    { name: "primary_color", label: "Primary Color" },
    { name: "secondary_color", label: "Secondary Color" },
    { name: "tertiary_color", label: "Tertiary Color" },
  ],
  defaultValues: { extinct: false },
};

export function TeamsPage() {
  const [kind, setKind] = useState<"CLUB" | "NATIONAL_TEAM">("CLUB");
  const [clubTeamId, setClubTeamId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <CrudEntityPage
        config={{
          ...teamConfig,
          title: "Teams",
        }}
      />
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          <Building2 size={14} /> Team subtype
        </div>
        <p className="mt-2 text-sm text-slate-500">
          The generic CRUD above persists the Team identity. Club/National Team subtype rows are created separately so their 1:1 boundaries remain explicit.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <TeamTypeSelector value={kind} onChange={setKind} />
          <span className="text-xs text-slate-600">{clubTeamId ? `Club #${clubTeamId}` : "Select a team and create its subtype from the next increment."}</span>
        </div>
      </div>
    </div>
  );
}