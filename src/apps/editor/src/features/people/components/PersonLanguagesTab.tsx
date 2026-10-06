import { useEffect, useState } from "react";
import { editorApi } from "../../../shared/api/editorApi";
import { EntityPicker } from "../../../shared/components";
import type { PersonReferenceData } from "../types";

export function PersonLanguagesTab({ personId, references }: { personId?: number; references: PersonReferenceData }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    void editorApi.entity.list("person_language", { page: 1, pageSize: 1000 }).then(result => {
      setSelected(result.rows.filter(row => Number(row.person_id) === personId).map(row => Number(row.language_id)));
    });
  }, [personId]);

  async function save() {
    if (!personId) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await editorApi.entity.list("person_language", { page: 1, pageSize: 1000 });
      const existing = result.rows.filter(row => Number(row.person_id) === personId);
      const target = new Set(selected);

      for (const row of existing) {
        if (!target.has(Number(row.language_id))) {
          await editorApi.entity.remove("person_language", JSON.stringify({ person_id: personId, language_id: Number(row.language_id) }));
        }
      }
      for (const languageId of selected) {
        if (!existing.some(row => Number(row.language_id) === languageId)) {
          await editorApi.entity.create("person_language", { person_id: personId, language_id: languageId });
        }
      }
      setMessage("Languages saved.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Languages</h3>
        <p className="mt-1 text-xs text-slate-600">Languages associated with this person.</p>
      </div>
      <EntityPicker
        label="Add Language"
        value=""
        options={references.languages.filter(language => !selected.includes(Number(language.id))).map(language => ({ id: Number(language.id), label: String(language.name ?? language.id) }))}
        onChange={value => {
          const id = Number(value);
          if (id) setSelected(current => [...current, id]);
        }}
      />
      <div className="flex flex-wrap gap-2">
        {selected.map(id => {
          const language = references.languages.find(row => Number(row.id) === id);
          return (
            <button key={id} type="button" onClick={() => setSelected(current => current.filter(value => value !== id))} className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-200">
              {String(language?.name ?? id)} ×
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => void save()} disabled={!personId || saving} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200 disabled:opacity-50">
        {saving ? "Saving..." : "Save Languages"}
      </button>
      {message && <p className="text-xs text-slate-400">{message}</p>}
    </section>
  );
}
