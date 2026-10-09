import { useEffect, useState } from "react";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import { EntityPicker } from "../../../shared/components";

export function PersonHistoryTab({ personId, teams }: { personId?: number; teams: EntityRow[] }) {
  const [periods, setPeriods] = useState<EntityRow[]>([]);
  const [relations, setRelations] = useState<EntityRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState({ club: "", start: "", end: "" });
  const [relation, setRelation] = useState({ team: "", level: "", reason: "", permanent: false, positive: true, negative: false, legend: false, icon: false });

  async function load() {
    if (!personId) return;
    const [periodRows, relationRows] = await Promise.all([
      editorApi.entity.list("person_team_period", { page: 1, pageSize: 1000 }),
      editorApi.entity.list("person_team_relationship", { page: 1, pageSize: 1000 }),
    ]);
    setPeriods(periodRows.rows.filter(row => Number(row.person_id) === personId));
    setRelations(relationRows.rows.filter(row => Number(row.person_id) === personId));
  }

  useEffect(() => { void load(); }, [personId]);

  async function addPeriod() {
    if (!personId || !period.club) return;
    try {
      await editorApi.entity.create("person_team_period", {
        person_id: personId,
        club_id: Number(period.club),
        start_date: period.start || null,
        end_date: period.end || null,
      });
      setPeriod({ club: "", start: "", end: "" });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function addRelationship() {
    if (!personId || !relation.team) return;
    try {
      await editorApi.entity.create("person_team_relationship", {
        person_id: personId,
        team_id: Number(relation.team),
        level: relation.level ? Number(relation.level) : null,
        reason: relation.reason || null,
        is_permanent: relation.permanent,
        is_positive: relation.positive,
        is_negative: relation.negative,
        is_legend: relation.legend,
        is_icon: relation.icon,
      });
      setRelation({ team: "", level: "", reason: "", permanent: false, positive: true, negative: false, legend: false, icon: false });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function remove(table: string, id: number) {
    if (!window.confirm("Delete this record?")) return;
    try { await editorApi.entity.remove(table, id); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  if (!personId) return <Empty text="Save the Person first to manage history and club relationships." />;

  return (
    <div className="space-y-6">
      {error && <p className="text-xs text-red-300">{error}</p>}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div><h3 className="text-sm font-semibold text-white">Club History</h3><p className="mt-1 text-xs text-slate-600">Historical periods attached to a club or team.</p></div>
        <div className="grid gap-4 md:grid-cols-3">
          <EntityPicker label="Club / Team" value={period.club} options={teams.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => setPeriod(current => ({ ...current, club: String(value) }))} />
          <DateField label="Start Date" value={period.start} onChange={value => setPeriod(current => ({ ...current, start: value }))} />
          <DateField label="End Date" value={period.end} onChange={value => setPeriod(current => ({ ...current, end: value }))} />
        </div>
        <button type="button" onClick={() => void addPeriod()} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">+ Add Club Period</button>
        <Rows rows={periods} columns={["club_id", "start_date", "end_date"]} onDelete={id => void remove("person_team_period", id)} />
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div><h3 className="text-sm font-semibold text-white">Club Relationships</h3><p className="mt-1 text-xs text-slate-600">Legend, icon, positive/negative and permanent team relationships.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <EntityPicker label="Team" value={relation.team} options={teams.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => setRelation(current => ({ ...current, team: String(value) }))} />
          <label className="space-y-2"><span className="block text-xs font-medium text-slate-400">Reason</span><input value={relation.reason} onChange={event => setRelation(current => ({ ...current, reason: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" /></label>
        </div>
        <div className="grid gap-4 md:grid-cols-6">
          <NumberField label="Level" value={relation.level} onChange={value => setRelation(current => ({ ...current, level: value }))} />
          <Bool label="Permanent" value={relation.permanent} onChange={value => setRelation(current => ({ ...current, permanent: value }))} />
          <Bool label="Positive" value={relation.positive} onChange={value => setRelation(current => ({ ...current, positive: value }))} />
          <Bool label="Negative" value={relation.negative} onChange={value => setRelation(current => ({ ...current, negative: value }))} />
          <Bool label="Legend" value={relation.legend} onChange={value => setRelation(current => ({ ...current, legend: value }))} />
          <Bool label="Icon" value={relation.icon} onChange={value => setRelation(current => ({ ...current, icon: value }))} />
        </div>
        <button type="button" onClick={() => void addRelationship()} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">+ Add Club Relationship</button>
        <Rows rows={relations} columns={["team_id", "level", "reason", "is_legend", "is_icon"]} onDelete={id => void remove("person_team_relationship", id)} />
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
function Rows({ rows, columns, onDelete }: { rows: EntityRow[]; columns: string[]; onDelete: (id: number) => void }) {
  return <div className="space-y-2">{rows.map(row => <div key={Number(row.id)} className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300 md:grid-cols-5">{columns.map(column => <div key={column}><span className="text-slate-600">{column.replace(/_/g, " ")}</span><div>{String(row[column] ?? "—")}</div></div>)}<button type="button" onClick={() => onDelete(Number(row.id))} className="text-left text-red-300">Delete</button></div>)}</div>;
}
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-600">{text}</div>; }
