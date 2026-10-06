import { useEffect, useState } from "react";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import { EntityPicker } from "../../../shared/components";

export function PersonHistoryTab({ personId, references }: { personId?: number; references: { teams: EntityRow[] } }) {
  const [periods, setPeriods] = useState<EntityRow[]>([]);
  const [relations, setRelations] = useState<EntityRow[]>([]);
  const [titles, setTitles] = useState<EntityRow[]>([]);
  const [periodForm, setPeriodForm] = useState({ club: "", start: "", end: "" });
  const [relationshipForm, setRelationshipForm] = useState({ team: "", level: "", reason: "", permanent: false, positive: true, negative: false, legend: false, icon: false });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!personId) return;
    const [periods, relations, titles] = await Promise.all([
      editorApi.entity.list("person_team_period", { page: 1, pageSize: 1000 }),
      editorApi.entity.list("person_team_relationship", { page: 1, pageSize: 1000 }),
      editorApi.entity.list("person_title", { page: 1, pageSize: 1000 }),
    ]);
    setPeriods(periods.rows.filter(row => Number(row.person_id) === personId));
    setRelations(relations.rows.filter(row => Number(row.person_id) === personId));
    setTitles(titles.rows.filter(row => Number(row.person_id) === personId));
  }

  useEffect(() => { void load(); }, [personId]);

  async function addPeriod() {
    if (!personId || !periodForm.club) return;
    await editorApi.entity.create("person_team_period", {
      person_id: personId,
      club_id: Number(periodForm.club),
      start_date: periodForm.start || null,
      end_date: periodForm.end || null,
    });
    setPeriodForm({ club: "", start: "", end: "" });
    await load();
  }

  async function addRelationship() {
    if (!personId || !relationshipForm.team) return;
    try {
      await editorApi.entity.create("person_team_relationship", {
        person_id: personId,
        team_id: Number(relationshipForm.team),
        level: relationshipForm.level ? Number(relationshipForm.level) : null,
        reason: relationshipForm.reason || null,
        is_permanent: relationshipForm.permanent,
        is_positive: relationshipForm.positive,
        is_negative: relationshipForm.negative,
        is_legend: relationshipForm.legend,
        is_icon: relationshipForm.icon,
      });
      setRelationshipForm({ team: "", level: "", reason: "", permanent: false, positive: true, negative: false, legend: false, icon: false });
      setError(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function remove(table: string, id: number) {
    if (!window.confirm("Delete this record?")) return;
    await editorApi.entity.remove(table, id);
    await load();
  }

  if (!personId) return <Empty text="Save the Person first to manage history and club relationships." />;

  return (
    <div className="space-y-6">
      {error && <p className="text-xs text-red-300">{error}</p>}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Club History</h3>
          <p className="mt-1 text-xs text-slate-600">Time periods where the person was attached to a club or team.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <EntityPicker label="Club / Team" value={periodForm.club} options={references.teams.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => setPeriodForm(current => ({ ...current, club: String(value) }))} />
          <DateField label="Start Date" value={periodForm.start} onChange={value => setPeriodForm(current => ({ ...current, start: value }))} />
          <DateField label="End Date" value={periodForm.end} onChange={value => setPeriodForm(current => ({ ...current, end: value }))} />
        </div>
        <button type="button" onClick={() => void addPeriod()} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">+ Add Club Period</button>
        <SimpleRows rows={periods} keys={["club_id", "start_date", "end_date"]} onDelete={id => void remove("person_team_period", id)} />
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Club Relationships</h3>
          <p className="mt-1 text-xs text-slate-600">Legend, icon, positive/negative and permanent relationships with teams.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <EntityPicker label="Team" value={relationshipForm.team} options={references.teams.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => setRelationshipForm(current => ({ ...current, team: String(value) }))} />
          <label className="space-y-2"><span className="block text-xs font-medium text-slate-400">Reason</span><input value={relationshipForm.reason} onChange={event => setRelationshipForm(current => ({ ...current, reason: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" /></label>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <NumberField label="Level" value={relationshipForm.level} onChange={value => setRelationshipForm(current => ({ ...current, level: value }))} />
          <Bool label="Permanent" value={relationshipForm.permanent} onChange={value => setRelationshipForm(current => ({ ...current, permanent: value }))} />
          <Bool label="Positive" value={relationshipForm.positive} onChange={value => setRelationshipForm(current => ({ ...current, positive: value }))} />
          <Bool label="Negative" value={relationshipForm.negative} onChange={value => setRelationshipForm(current => ({ ...current, negative: value }))} />
          <Bool label="Legend" value={relationshipForm.legend} onChange={value => setRelationshipForm(current => ({ ...current, legend: value }))} />
        </div>
        <button type="button" onClick={() => void addRelationship()} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">+ Add Club Relationship</button>
        <SimpleRows rows={relations} keys={["team_id", "level", "reason", "is_legend", "is_icon"]} onDelete={id => void remove("person_team_relationship", id)} />
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="text-sm font-semibold text-white">Titles & Milestones</h3>
        <SimpleRows rows={titles} keys={["club_id", "competition_id", "placement_id", "employment_id"]} />
      </section>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-2"><span className="block text-xs font-medium text-slate-400">{label}</span><input type="date" value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" /></label>;
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-2"><span className="block text-xs font-medium text-slate-400">{label}</span><input type="number" value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" /></label>;
}

function Bool({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 pt-7 text-xs text-slate-300"><input type="checkbox" checked={value} onChange={event => onChange(event.target.checked)} />{label}</label>;
}

function SimpleRows({ rows, keys, onDelete }: { rows: EntityRow[]; keys: string[]; onDelete?: (id: number) => void }) {
  return <div className="space-y-2">{rows.map((row, index) => <div key={String(row.id ?? index)} className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300 md:grid-cols-5">{keys.map(key => <div key={key}><span className="text-slate-600">{key.replace(/_/g, " ")}</span><div>{String(row[key] ?? "—")}</div></div>)}{onDelete && <button type="button" onClick={() => onDelete(Number(row.id))} className="text-left text-red-300">Delete</button>}</div>)}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-600">{text}</div>;
}
