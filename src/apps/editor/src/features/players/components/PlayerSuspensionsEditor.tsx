import { useEffect, useMemo, useState } from "react";
import { EntityForm, EntityPicker } from "../../../shared/components";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";

export function PlayerSuspensionsEditor({ playerId }: { playerId: number }) {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [types, setTypes] = useState<EntityRow[]>([]);
  const [competitions, setCompetitions] = useState<EntityRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setSaving(true);
    try {
      const [suspensions, typesResult, competitionsResult] = await Promise.all([
        editorApi.entity.list("person_suspension", { page: 1, pageSize: 1000 }),
        editorApi.entity.list("suspension", { page: 1, pageSize: 1000 }),
        editorApi.entity.list("competition", { page: 1, pageSize: 1000 }),
      ]);
      setRows(suspensions.rows.filter(row => Number(row.person_id) === playerId));
      setTypes(typesResult.rows);
      setCompetitions(competitionsResult.rows);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { void load(); }, [playerId]);

  async function add() {
    if (!values.suspension_id) {
      setError("Suspension type is required.");
      return;
    }
    try {
      await editorApi.entity.create("person_suspension", {
        person_id: playerId,
        suspension_id: Number(values.suspension_id),
        competition_id: values.competition_id ? Number(values.competition_id) : null,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        number_of_matches: values.number_of_matches ? Number(values.number_of_matches) : null,
      });
      setValues({});
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this suspension?")) return;
    await editorApi.entity.remove("person_suspension", id);
    await load();
  }

  const typeName = useMemo(() => new Map(types.map(row => [Number(row.id), String(row.name ?? row.id)])), [types]);
  const competitionName = useMemo(() => new Map(competitions.map(row => [Number(row.id), String(row.name ?? row.id)])), [competitions]);

  return (
    <section className="space-y-5">
      <EntityForm
        fields={[
          { name: "start_date", label: "Start Date", type: "date" },
          { name: "end_date", label: "End Date", type: "date" },
          { name: "number_of_matches", label: "Number of Matches", type: "number", min: 0 },
        ]}
        values={values}
        onChange={(name, value) => setValues(current => ({ ...current, [name]: String(value ?? "") }))}
        onSubmit={() => void add()}
        submitLabel={saving ? "Saving..." : "Add Suspension"}
        submitting={saving}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <EntityPicker label="Suspension" value={values.suspension_id ?? ""} options={types.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => setValues(current => ({ ...current, suspension_id: String(value) }))} />
          <EntityPicker label="Competition" value={values.competition_id ?? ""} options={competitions.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => setValues(current => ({ ...current, competition_id: String(value) }))} />
        </div>
      </EntityForm>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="space-y-2">
        {rows.map(row => (
          <div key={Number(row.id)} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300 md:grid-cols-5">
            <span>{typeName.get(Number(row.suspension_id)) ?? `#${String(row.suspension_id)}`}</span>
            <span>{competitionName.get(Number(row.competition_id)) ?? "—"}</span>
            <span>{String(row.start_date ?? "—")}</span>
            <span>{String(row.end_date ?? "—")}</span>
            <div className="flex justify-between"><span>{String(row.number_of_matches ?? "—")} matches</span><button type="button" onClick={() => void remove(Number(row.id))} className="text-red-300">Delete</button></div>
          </div>
        ))}
      </div>
    </section>
  );
}
