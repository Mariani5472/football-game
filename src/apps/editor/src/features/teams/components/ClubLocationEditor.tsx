import { useEffect, useState } from "react";
import { EntityPicker } from "../../../shared/components";
import { editorApi, type EntityRow, type Scalar } from "../../../shared/api/editorApi";

export function ClubLocationEditor({ clubId, onSaved }: { clubId: number; onSaved?: () => void }) {
  const [row, setRow] = useState<EntityRow | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; void editorApi.entity.get("club", clubId).then(data => { if (active) { setRow(data); setValues(data ?? {}); } }).catch(e => active && setError(e instanceof Error ? e.message : String(e))); return () => { active = false; }; }, [clubId]);
  async function save() {
    setSaving(true); setError(null);
    try {
      const payload: Record<string, Scalar> = {
        team_id: clubId,
        city_id: values.city_id == null || values.city_id === "" ? null : Number(values.city_id),
        base_nation_id: values.base_nation_id == null || values.base_nation_id === "" ? null : Number(values.base_nation_id),
        international_competition_nation_id: values.international_competition_nation_id == null || values.international_competition_nation_id === "" ? null : Number(values.international_competition_nation_id),
        min_age: values.min_age == null || values.min_age === "" ? null : Number(values.min_age),
        max_age: values.max_age == null || values.max_age === "" ? null : Number(values.max_age),
      };
      if (row) await editorApi.entity.update("club", clubId, payload); else await editorApi.entity.create("club", payload);
      onSaved?.();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
  }
  return <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
    <h3 className="text-sm font-semibold text-white">Club location</h3>
    <p className="mt-1 text-xs text-slate-600">Operational geography and age policy.</p>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <EntityPicker label="City" table="city" value={values.city_id == null ? "" : String(values.city_id)} onChange={v => setValues(x => ({ ...x, city_id: v }))} loading={saving} />
      <EntityPicker label="Base Nation" table="nation" value={values.base_nation_id == null ? "" : String(values.base_nation_id)} onChange={v => setValues(x => ({ ...x, base_nation_id: v }))} loading={saving} />
      <EntityPicker label="International Competition Nation" table="nation" value={values.international_competition_nation_id == null ? "" : String(values.international_competition_nation_id)} onChange={v => setValues(x => ({ ...x, international_competition_nation_id: v }))} loading={saving} />
      <NumberField label="Minimum Age" value={values.min_age} onChange={v => setValues(x => ({ ...x, min_age: v }))} />
      <NumberField label="Maximum Age" value={values.max_age} onChange={v => setValues(x => ({ ...x, max_age: v }))} />
    </div>
    {error && <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200">{error}</div>}
    <div className="mt-4 flex justify-end"><button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg bg-emerald-400/10 px-4 py-2 text-xs font-medium text-emerald-200 disabled:opacity-50">{saving ? "Saving..." : "Save location"}</button></div>
  </section>;
}

function NumberField({ label, value, onChange }: { label: string; value: unknown; onChange: (value: string) => void }) {
  return <label className="space-y-1.5"><span className="block text-xs font-medium text-slate-400">{label}</span><input type="number" value={String(value ?? "")} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200" /></label>;
}