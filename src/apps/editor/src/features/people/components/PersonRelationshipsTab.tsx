import { useEffect, useState } from "react";
import { EntityPicker } from "../../../shared/components";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import type { PersonReferenceData } from "../types";

export function PersonRelationshipsTab({ personId, references }: { personId?: number; references: PersonReferenceData }) {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [form, setForm] = useState({ target: "", level: "", reason: "", permanent: false, positive: true });
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!personId) return;
    const result = await editorApi.entity.list("person_person_relationship", { page: 1, pageSize: 1000 });
    setRows(result.rows.filter(row => Number(row.person_id_1) === personId || Number(row.person_id_2) === personId));
  }

  useEffect(() => { void reload(); }, [personId]);

  async function save() {
    if (!personId) return;
    const targetId = Number(form.target);
    if (!targetId || targetId === personId) {
      setError("Choose another person.");
      return;
    }
    try {
      await editorApi.entity.create("person_person_relationship", {
        person_id_1: personId,
        person_id_2: targetId,
        level: form.level ? Number(form.level) : null,
        reason_id: form.reason ? Number(form.reason) : null,
        is_permanent: form.permanent,
        is_positive: form.positive,
      });
      setForm({ target: "", level: "", reason: "", permanent: false, positive: true });
      setError(null);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this relationship?")) return;
    await editorApi.entity.remove("person_person_relationship", id);
    await reload();
  }

  if (!personId) return <Empty text="Save the Person first to manage relationships." />;

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <EntityPicker label="Related Person" value={form.target} options={references.people.filter(row => Number(row.id) !== personId).map(row => ({ id: Number(row.id), label: String(row.full_name ?? row.id) }))} onChange={value => setForm(current => ({ ...current, target: String(value) }))} />
        <EntityPicker label="Reason" value={form.reason} options={references.relationshipReasons.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => setForm(current => ({ ...current, reason: String(value) }))} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <NumberField label="Level" value={form.level} onChange={value => setForm(current => ({ ...current, level: value }))} />
        <BooleanField label="Permanent" value={form.permanent} onChange={value => setForm(current => ({ ...current, permanent: value }))} />
        <BooleanField label="Positive" value={form.positive} onChange={value => setForm(current => ({ ...current, positive: value }))} />
      </div>
      <button type="button" onClick={() => void save()} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">+ Add Relationship</button>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="space-y-2">{rows.map(row => <div key={Number(row.id)} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300"><span>{Number(row.person_id_1) === personId ? "Relationship with " + row.person_id_2 : "Relationship with " + row.person_id_1}</span><div className="flex items-center gap-3"><span className="text-slate-500">Level {String(row.level ?? "—")}</span><button type="button" onClick={() => void remove(Number(row.id))} className="text-red-300">Delete</button></div></div>)}</div>
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-2"><span className="block text-xs font-medium text-slate-400">{label}</span><input type="number" value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" /></label>;
}

function BooleanField({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 pt-7 text-sm text-slate-300"><input type="checkbox" checked={value} onChange={event => onChange(event.target.checked)} />{label}</label>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-600">{text}</div>;
}
