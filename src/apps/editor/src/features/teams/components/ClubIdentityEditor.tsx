import { useEffect, useState } from "react";
import { EntityPicker } from "../../../shared/components";
import { editorApi, type EntityRow, type Scalar } from "../../../shared/api/editorApi";

const teamFields = [
  { name: "name", label: "Name", required: true }, { name: "short_name", label: "Short Name" },
  { name: "six_letter_name", label: "Six Letter Name" }, { name: "three_letter_name", label: "Three Letter Name" },
  { name: "alternative_three_letter_name", label: "Alternative Three Letter Name" }, { name: "nickname", label: "Nickname" },
  { name: "hashtag", label: "Hashtag" }, { name: "gender_id", label: "Gender", relation: { table: "gender" } },
  { name: "nation_id", label: "Nation", relation: { table: "nation" } }, { name: "reputation", label: "Reputation", type: "number" as const },
  { name: "primary_color", label: "Primary Color" }, { name: "secondary_color", label: "Secondary Color" },
  { name: "tertiary_color", label: "Tertiary Color" }, { name: "extinct", label: "Extinct", type: "boolean" as const },
];
const clubFields = [
  { name: "situation_id", label: "Status", relation: { table: "club_status" } }, { name: "min_age", label: "Minimum Age", type: "number" as const },
  { name: "max_age", label: "Maximum Age", type: "number" as const }, { name: "morale", label: "Morale", type: "number" as const },
  { name: "is_institute", label: "Institute", type: "boolean" as const }, { name: "is_all_star", label: "All-Star", type: "boolean" as const },
  { name: "observation_package_id", label: "Observation", relation: { table: "club_observation" } },
  { name: "has_extra_designated_player_slot", label: "Extra Designated Player Slot", type: "boolean" as const },
];

function normalize(value: unknown, type?: string): Scalar {
  if (value === "" || value === undefined) return null;
  if (type === "number") { const n = Number(value); return Number.isFinite(n) ? n : null; }
  if (type === "boolean") return Boolean(value);
  return value as Scalar;
}

export function ClubIdentityEditor({ clubId, onSaved }: { clubId: number; onSaved?: () => void }) {
  const [team, setTeam] = useState<EntityRow | null>(null); const [club, setClub] = useState<EntityRow | null>(null);
  const [teamValues, setTeamValues] = useState<Record<string, unknown>>({}); const [clubValues, setClubValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active=true; void Promise.all([editorApi.entity.get("team", clubId), editorApi.entity.get("club", clubId)]).then(([t,c])=>{if(!active)return; setTeam(t); setClub(c); setTeamValues(t ?? {}); setClubValues(c ?? {});}).catch(e=>active&&setError(e instanceof Error?e.message:String(e))); return()=>{active=false;}; },[clubId]);
  async function save() {
    setSaving(true); setError(null);
    try {
      const teamPayload: Record<string, Scalar> = {}; for (const f of teamFields) teamPayload[f.name]=normalize(teamValues[f.name],f.type);
      const clubPayload: Record<string, Scalar> = { team_id: clubId }; for (const f of clubFields) clubPayload[f.name]=normalize(clubValues[f.name],f.type);
      if (team) await editorApi.entity.update("team", clubId, teamPayload); else await editorApi.entity.create("team", teamPayload);
      if (club) await editorApi.entity.update("club", clubId, clubPayload); else await editorApi.entity.create("club", clubPayload);
      onSaved?.();
    } catch(e) { setError(e instanceof Error?e.message:String(e)); } finally { setSaving(false); }
  }
  const name=String(team?.name ?? `Club #${clubId}`);
  return <div className="space-y-5">
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><h3 className="text-sm font-semibold text-white">Team identity</h3><p className="mt-1 text-xs text-slate-600">Shared identity used by the club and other team-level systems.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{teamFields.map(field => field.relation ? <EntityPicker key={field.name} label={field.label} table={field.relation.table} value={teamValues[field.name] == null ? "" : String(teamValues[field.name])} onChange={v=>setTeamValues(x=>({...x,[field.name]:v}))} /> : <label key={field.name} className="space-y-1.5"><span className="block text-xs font-medium text-slate-400">{field.label}</span><input type={field.type==="number"?"number":"text"} value={String(teamValues[field.name]??"")} onChange={e=>setTeamValues(x=>({...x,[field.name]:field.type==="boolean"?e.target.checked:e.target.value}))} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200" /></label>)}</div>
    </section>
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><h3 className="text-sm font-semibold text-white">Club state</h3><p className="mt-1 text-xs text-slate-600">{name}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{clubFields.map(field => field.relation ? <EntityPicker key={field.name} label={field.label} table={field.relation.table} value={clubValues[field.name] == null ? "" : String(clubValues[field.name])} onChange={v=>setClubValues(x=>({...x,[field.name]:v}))} /> : <label key={field.name} className="space-y-1.5"><span className="block text-xs font-medium text-slate-400">{field.label}</span>{field.type==="boolean"?<input type="checkbox" checked={Boolean(clubValues[field.name])} onChange={e=>setClubValues(x=>({...x,[field.name]:e.target.checked}))}/>:<input type="number" value={String(clubValues[field.name]??"")} onChange={e=>setClubValues(x=>({...x,[field.name]:e.target.value}))} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200" />}</label>)}</div>
    </section>
    {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</div>}
    <div className="flex justify-end"><button type="button" onClick={()=>void save()} disabled={saving} className="rounded-lg bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 disabled:opacity-50">{saving?"Saving...":"Save identity"}</button></div>
  </div>;
}