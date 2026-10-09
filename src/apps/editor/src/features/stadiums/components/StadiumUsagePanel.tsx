import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, ExternalLink, History, RefreshCw } from "lucide-react";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import type { ReactNode } from "react";

export function StadiumUsagePanel({ stadiumId }: { stadiumId: number }) {
  const [changes, setChanges] = useState<EntityRow[]>([]);
  const [alternatives, setAlternatives] = useState<EntityRow[]>([]);
  const [venues, setVenues] = useState<EntityRow[]>([]);
  const [stadium, setStadium] = useState<EntityRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true); setError(null);
    try {
      const [stadiumResult, changeResult, alternativeResult, venueResult] = await Promise.all([
        editorApi.entity.get("stadium", stadiumId),
        editorApi.entity.list("stadium_change", { page: 1, pageSize: 100, search: String(stadiumId), searchColumns: ["new_stadium_id", "old_stadium_id"] }),
        editorApi.entity.list("alternative_stadium", { page: 1, pageSize: 100, search: String(stadiumId), searchColumns: ["stadium_id"] }),
        editorApi.entity.list("fixture_venue", { page: 1, pageSize: 100, search: String(stadiumId), searchColumns: ["stadium_id"] }),
      ]);
      setStadium(stadiumResult);
      setChanges(changeResult.rows.filter(row => Number(row.new_stadium_id) === stadiumId || Number(row.old_stadium_id) === stadiumId));
      setAlternatives(alternativeResult.rows.filter(row => Number(row.stadium_id) === stadiumId));
      setVenues(venueResult.rows.filter(row => Number(row.stadium_id) === stadiumId));
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, [stadiumId]);

  const active = useMemo(() => Number(stadium?.extinct ?? 0) === 0, [stadium]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h3 className="flex items-center gap-2 text-sm font-semibold text-white"><History size={15} /> Relationships & usage</h3><p className="mt-1 text-xs text-slate-600">Connected stadium history, alternative usage and scheduled fixtures.</p></div>
        <button type="button" onClick={() => void reload()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 disabled:opacity-50"><RefreshCw size={13} /> Refresh</button>
      </div>
      {error && <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200"><AlertTriangle size={14} />{error}</div>}
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric label="Current state" value={active ? "Active" : "Extinct"} />
        <Metric label="Changes" value={changes.length} />
        <Metric label="Alternative usages" value={alternatives.length} />
        <Metric label="Fixture venues" value={venues.length} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <RelationList title="Stadium changes" icon={<History size={14} />} rows={changes} fields={["change_type_id", "start_date", "end_date"]} />
        <RelationList title="Alternative competitions" icon={<CalendarDays size={14} />} rows={alternatives} fields={["competition_id", "year", "start_date", "end_date"]} />
        <RelationList title="Fixture venue links" icon={<ExternalLink size={14} />} rows={venues} fields={["fixture_id", "venue_reason"]} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-white/5 bg-black/10 p-3"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</div><div className="mt-1 text-lg font-semibold text-white">{value}</div></div>;
}

function RelationList({ title, icon, rows, fields }: { title: string; icon: ReactNode; rows: EntityRow[]; fields: string[] }) {
  return <div className="rounded-xl border border-white/5 bg-black/10 p-4"><div className="flex items-center gap-2 text-xs font-medium text-slate-300">{icon}{title}</div>{rows.length === 0 ? <p className="mt-4 text-xs text-slate-600">No linked records.</p> : <div className="mt-3 space-y-2">{rows.slice(0, 8).map(row => <div key={String(row.id)} className="rounded-lg border border-white/5 px-3 py-2">{fields.map(field => <div key={field} className="flex justify-between gap-3 text-[10px]"><span className="text-slate-600">{field}</span><span className="truncate text-slate-400">{row[field] == null ? "—" : String(row[field])}</span></div>)}</div>)}{rows.length > 8 && <p className="text-[10px] text-slate-600">Showing 8 of {rows.length} records.</p>}</div>}</div>;
}