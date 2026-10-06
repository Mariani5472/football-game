import { useEffect, useState } from "react";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import { EntityPicker } from "../../../shared/components";
import type { PersonReferenceData } from "../types";

export function PersonNationalityTab({ personId, references }: { personId?: number; references: Pick<PersonReferenceData, "nations" | "secondNationalityInfo"> }) {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!personId) return;
    const result = await editorApi.entity.list("person_second_nationality", { page: 1, pageSize: 1000 });
    setRows(result.rows.filter(row => Number(row.person_id) === personId));
  }

  useEffect(() => { void reload(); }, [personId]);

  async function addNation(nationId: number) {
    if (!personId) return;
    try {
      await editorApi.entity.create("person_second_nationality", { person_id: personId, nation_id: nationId, information_id: null });
      setError(null);
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function removeRow(id: number) {
    try { await editorApi.entity.remove("person_second_nationality", id); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  if (!personId) return <Empty text="Save the Person first to manage nationality data." />;

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <p className="text-sm text-slate-400">The World DB does not store a primary nationality column on Person. Additional nationalities are stored in the Person nationality relation.</p>
      <EntityPicker
        label="Add Second Nationality"
        value=""
        options={references.nations.filter(row => !rows.some(item => Number(item.nation_id) === Number(row.id))).map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))}
        onChange={value => { const id = Number(value); if (id) void addNation(id); }}
      />
      <div className="space-y-2">
        {rows.map(row => {
          const nation = references.nations.find(item => Number(item.id) === Number(row.nation_id));
          const info = references.secondNationalityInfo.find(item => Number(item.id) === Number(row.information_id));
          return <div key={Number(row.id)} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
            <span>{String(nation?.name ?? row.nation_id)}{info?.name ? ` · ${String(info.name)}` : ""}</span>
            <button type="button" onClick={() => void removeRow(Number(row.id))} className="text-xs text-red-300">Remove</button>
          </div>;
        })}
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </section>
  );
}

function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-600">{text}</div>; }
