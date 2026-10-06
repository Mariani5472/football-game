import { useRef, useState } from "react";
import { editorApi } from "../../api/editorApi";
import { parseCsv } from "../../api/parseCsv";
import type { CsvImportRow, CsvPreview } from "../../api/entityApi";

export function CsvImportPanel({ table, onImported }: { table: string; onImported: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvImportRow[] | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function selectFile(file?: File) {
    if (!file) return;
    setMessage(null); setPreview(null); setRows(null); setBusy(true);
    try {
      const parsed = parseCsv(await file.text());
      setRows(parsed.rows);
      setPreview(await editorApi.entity.previewCsv(table, parsed.rows));
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  async function importRows() {
    if (!rows) return;
    setBusy(true); setMessage(null);
    try {
      const result = await editorApi.entity.importCsv(table, rows);
      setMessage(`Imported ${result.imported} row(s). ${result.errors.length} row(s) failed.`);
      setPreview(current => current ? { ...current, valid: Math.max(0, current.valid - result.imported), errors: result.errors } : current);
      if (result.imported) await onImported();
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  return <section className="rounded-xl border border-white/10 bg-[#121820] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-semibold text-white">Import CSV</h2><p className="mt-1 text-xs text-slate-500">Use database column names as the header row.</p></div>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={event => void selectFile(event.target.files?.[0])} />
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 disabled:opacity-50">Choose CSV</button>
    </div>
    {busy && <p className="mt-3 text-xs text-slate-400">Processing…</p>}
    {message && <p className="mt-3 text-xs text-slate-300">{message}</p>}
    {preview && <div className="mt-4 space-y-3">
      <p className="text-xs text-slate-300">{preview.total} rows · {preview.valid} valid · {preview.errors.length} with errors</p>
      {preview.errors.length > 0 && <ul className="max-h-36 space-y-1 overflow-auto text-xs text-rose-300">{preview.errors.slice(0, 100).map((issue, index) => <li key={`${issue.line}-${index}`}>Line {issue.line}: {issue.message}</li>)}</ul>}
      <button type="button" disabled={busy || preview.valid === 0} onClick={() => void importRows()} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200 disabled:opacity-50">Import valid rows</button>
    </div>}
  </section>;
}

