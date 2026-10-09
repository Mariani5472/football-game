import { useEffect, useState } from "react";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";

export function PersonTrendsTab({ personId }: { personId?: number }) {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [key, setKey] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!personId) return;
    const result = await editorApi.entity.list("person_tendency", { page: 1, pageSize: 1000 });
    setRows(result.rows.filter(row => Number(row.person_id) === personId));
  }
  useEffect(() => { void reload(); }, [personId]);

  async function add() {
    if (!personId || !key.trim()) return;
    try {
      await editorApi.entity.create("person_tendency", { person_id: personId, tendency_key: key.trim(), enabled });
      setKey(""); setError(null); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }
  async function remove(id: number) {
    if (!window.confirm("Delete this trend?")) return;
    try { await editorApi.entity.remove("person_tendency", id); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  if (!personId) return <Empty text="Save the Person first to manage trends." />;

  return <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
    <label className="block space-y-2"><span className="block text-xs font-medium text-slate-400">Tendency Key</span><input value={key} onChange={event => setKey(event.target.value)} placeholder="e.g. enjoys_big_matches" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" /></label>
    <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Enabled</label>
    <button type="button" onClick={() => void add()} disabled={!key.trim()} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">+ Add Trend</button>
    {error && <p className="text-xs text-red-300">{error}</p>}
    <div className="space-y-2">
      {rows.map(row => <div key={Number(row.id)} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"><span className="text-sm text-slate-300">{String(row.tendency_key)}</span><div className="flex items-center gap-3"><span className="text-xs text-slate-500">{Boolean(row.enabled) ? "Enabled" : "Disabled"}</span><button type="button" onClick={() => void remove(Number(row.id))} className="text-xs text-red-300">Delete</button></div></div>)}
    </div>
    {!rows.length && <p className="text-xs text-slate-600">No trends configured.</p>}
  </section>;
}
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-600">{text}</div>; }
