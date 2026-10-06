import { useEffect, useState } from "react";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import { EntityForm, EntityPicker } from "../../../shared/components";
import type { PersonReferenceData } from "../types";

const emptyForm = { start: "", end: "", club: "", employment: "", type: "", salary: "", number: "" };

export function PersonContractTab({ personId, references }: { personId?: number; references: Pick<PersonReferenceData, "teams" | "employments"> }) {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [values, setValues] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!personId) return;
    const result = await editorApi.entity.list("person_contract", { page: 1, pageSize: 1000 });
    setRows(result.rows.filter(row => Number(row.person_id) === personId));
  }

  useEffect(() => { void reload(); }, [personId]);

  async function save() {
    if (!personId || !values.club) { setError("Club is required."); return; }
    try {
      await editorApi.entity.create("person_contract", {
        person_id: personId,
        club_id: Number(values.club),
        employment_id: values.employment ? Number(values.employment) : null,
        start_date: values.start || null,
        end_date: values.end || null,
        contract_type: values.type || null,
        salary: values.salary ? Number(values.salary) : null,
        squad_number: values.number ? Number(values.number) : null,
      });
      setValues(emptyForm); setError(null); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this contract?")) return;
    try { await editorApi.entity.remove("person_contract", id); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  if (!personId) return <Empty text="Save the Person first to manage contracts." />;

  return (
    <section className="space-y-5">
      <EntityForm
        fields={[
          { name: "start", label: "Start Date", type: "date" },
          { name: "end", label: "End Date", type: "date" },
          { name: "type", label: "Contract Type" },
          { name: "salary", label: "Salary", type: "number", min: 0 },
          { name: "number", label: "Squad Number", type: "number", min: 0 },
        ]}
        values={values}
        onChange={(name, value) => setValues(current => ({ ...current, [name]: String(value ?? "") }))}
        onSubmit={() => void save()}
        submitLabel="Add Contract"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <EntityPicker label="Club / Team" value={values.club} options={references.teams.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => setValues(current => ({ ...current, club: String(value) }))} />
          <EntityPicker label="Employment" value={values.employment} options={references.employments.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => setValues(current => ({ ...current, employment: String(value) }))} />
        </div>
      </EntityForm>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b border-white/10 text-slate-600"><th className="px-3 py-2">Club</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">End</th><th className="px-3 py-2">Salary</th><th className="px-3 py-2">Actions</th></tr></thead>
          <tbody>{rows.map(row => <tr key={Number(row.id)} className="border-b border-white/5"><td className="px-3 py-3 text-slate-300">#{String(row.club_id)}</td><td className="px-3 py-3 text-slate-300">{String(row.start_date ?? "—")}</td><td className="px-3 py-3 text-slate-300">{String(row.end_date ?? "—")}</td><td className="px-3 py-3 text-slate-300">{String(row.salary ?? "—")}</td><td className="px-3 py-3"><button type="button" onClick={() => void remove(Number(row.id))} className="text-red-300">Delete</button></td></tr>)}</tbody>
        </table>
      </div>
      {!rows.length && <p className="text-xs text-slate-600">No contracts.</p>}
    </section>
  );
}

function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-600">{text}</div>; }
