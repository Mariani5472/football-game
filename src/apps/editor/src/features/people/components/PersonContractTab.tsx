import { useEffect, useState } from "react";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import { EntityForm, EntityPicker } from "../../../shared/components";

export function PersonContractTab({ personId, references }: { personId?: number; references: { teams: EntityRow[]; employments: EntityRow[] } }) {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!personId) return;
    const result = await editorApi.entity.list("person_contract", { page: 1, pageSize: 1000 });
    setRows(result.rows.filter(row => Number(row.person_id) === personId));
  }

  useEffect(() => { void reload(); }, [personId]);

  async function save() {
    if (!personId || !values.club_id) {
      setError("Club is required.");
      return;
    }
    try {
      await editorApi.entity.create("person_contract", {
        person_id: personId,
        club_id: Number(values.club_id),
        employment_id: values.employment_id ? Number(values.employment_id) : null,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        contract_type: values.contract_type || null,
        salary: values.salary ? Number(values.salary) : null,
        squad_number: values.squad_number ? Number(values.squad_number) : null,
      });
      setValues({});
      setError(null);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  if (!personId) return <Empty text="Save the Person first to manage contracts." />;

  return (
    <section className="space-y-5">
      <EntityForm
        fields={[
          { name: "start_date", label: "Start Date", type: "date" },
          { name: "end_date", label: "End Date", type: "date" },
          { name: "contract_type", label: "Contract Type" },
          { name: "salary", label: "Salary", type: "number", min: 0 },
          { name: "squad_number", label: "Squad Number", type: "number", min: 0 },
        ]}
        values={values}
        onChange={(name, value) => setValues(current => ({ ...current, [name]: String(value ?? "") }))}
        onSubmit={() => void save()}
        submitLabel="Add Contract"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <EntityPicker label="Club" value={values.club_id ?? ""} options={references.teams.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => setValues(current => ({ ...current, club_id: String(value) }))} />
          <EntityPicker label="Employment" value={values.employment_id ?? ""} options={references.employments.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => setValues(current => ({ ...current, employment_id: String(value) }))} />
        </div>
      </EntityForm>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <SimpleRows rows={rows} keys={["club_id", "employment_id", "start_date", "end_date", "salary", "contract_type"]} />
    </section>
  );
}

function SimpleRows({ rows, keys }: { rows: EntityRow[]; keys: string[] }) {
  return <div className="space-y-2">{rows.map((row, index) => <div key={String(row.id ?? index)} className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300 md:grid-cols-6">{keys.map(key => <div key={key}><span className="text-slate-600">{key.replace(/_/g, " ")}</span><div>{String(row[key] ?? "—")}</div></div>)}</div>)}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-600">{text}</div>;
}
