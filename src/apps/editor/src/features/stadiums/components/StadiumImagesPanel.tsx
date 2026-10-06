import { useEffect, useState } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import { ConfirmDialog } from "../../../shared/components";

export function StadiumImagesPanel({ stadiumId }: { stadiumId: number }) {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [primary, setPrimary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function reload() {
    setLoading(true); setError(null);
    try {
      const result = await editorApi.entity.list("stadium_image", { page: 1, pageSize: 100, search: String(stadiumId), searchColumns: ["stadium_id"], orderBy: "sort_order" });
      setRows(result.rows.filter(row => Number(row.stadium_id) === stadiumId));
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, [stadiumId]);

  async function add() {
    if (!url.trim()) { setError("Image URL is required."); return; }
    try {
      setSaving(true); setError(null);
      const sortOrder = rows.length ? Math.max(...rows.map(row => Number(row.sort_order ?? 0))) + 1 : 1;
      if (primary) await Promise.all(rows.filter(row => Number(row.is_primary) === 1).map(row => editorApi.entity.update("stadium_image", Number(row.id), { is_primary: false })));
      await editorApi.entity.create("stadium_image", { stadium_id: stadiumId, url: url.trim(), caption: caption.trim() || null, sort_order: sortOrder, is_primary: primary, source: "EDITOR" });
      setUrl(""); setCaption(""); setPrimary(false); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSaving(false); }
  }

  async function makePrimary(row: EntityRow) {
    try {
      await Promise.all(rows.filter(item => Number(item.id) !== Number(row.id) && Number(item.is_primary) === 1).map(item => editorApi.entity.update("stadium_image", Number(item.id), { is_primary: false })));
      await editorApi.entity.update("stadium_image", Number(row.id), { is_primary: true });
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function remove() {
    if (deleting == null) return;
    try { await editorApi.entity.remove("stadium_image", deleting); setDeleting(null); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4"><div><h3 className="flex items-center gap-2 text-sm font-semibold text-white"><ImagePlus size={15} /> Stadium images</h3><p className="mt-1 text-xs text-slate-600">Store external image URLs and choose one primary image for the editor.</p></div><span className="text-xs text-slate-600">{rows.length} image(s)</span></div>
      {error && <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200">{error}</div>}
      <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
        <input value={url} onChange={event => setUrl(event.target.value)} placeholder="https://..." className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white" />
        <input value={caption} onChange={event => setCaption(event.target.value)} placeholder="Caption (optional)" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white" />
        <div className="flex gap-2"><label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-slate-400"><input type="checkbox" checked={primary} onChange={event => setPrimary(event.target.checked)} /> Primary</label><button type="button" disabled={saving} onClick={() => void add()} className="rounded-xl bg-emerald-400/10 px-4 text-sm font-medium text-emerald-200 disabled:opacity-50">Add</button></div>
      </div>
      {loading ? <p className="mt-5 text-xs text-slate-600">Loading images...</p> : rows.length === 0 ? <p className="mt-5 text-xs text-slate-600">No images registered.</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map(row => <article key={String(row.id)} className="overflow-hidden rounded-xl border border-white/10 bg-black/20"><div className="aspect-video bg-black/30">{typeof row.url === "string" ? <img src={row.url} alt={String(row.caption ?? "Stadium")} className="h-full w-full object-cover" loading="lazy" /> : null}</div><div className="p-3"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs text-slate-300">{String(row.caption ?? "Stadium image")}</span>{Number(row.is_primary) === 1 && <span className="inline-flex items-center gap-1 text-[10px] text-amber-300"><Star size={11} /> Primary</span>}</div><div className="mt-3 flex gap-2"><button type="button" onClick={() => void makePrimary(row)} className="text-[11px] text-slate-500 hover:text-emerald-300">Make primary</button><button type="button" onClick={() => setDeleting(Number(row.id))} className="ml-auto text-slate-500 hover:text-red-300"><Trash2 size={14} /></button></div></div></article>)}</div>}
      <ConfirmDialog open={deleting != null} title="Delete image" description="The stored image reference will be removed from this stadium." confirmLabel="Delete" onConfirm={() => void remove()} onClose={() => setDeleting(null)} />
    </section>
  );
}