import { CheckCircle2, FileUp, GitBranch, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import {
  editorApi,
  type ImportConflict,
  type ImportPreview,
  type WorldPackageRecord,
} from "../../../shared/api/editorApi";

function metric(label: string, value: number) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export function PackageManagerPanel({
  packages,
  onChanged,
}: {
  packages: WorldPackageRecord[];
  onChanged: () => Promise<void> | void;
}) {
  const [sourceFile, setSourceFile] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [conflicts, setConflicts] = useState<ImportConflict[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, ImportConflict["resolution"]>>({});
  const [busy, setBusy] = useState<"inspect" | "import" | "rebuild" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function inspect() {
    let value = sourceFile.trim();
    if (selectedFile) {
      setBusy("inspect");
      setError(null);
      setMessage(null);
      setPreview(null);
      setConflicts([]);
      try {
        const buffer = await selectedFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const chunkSize = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
        }
        const uploaded = await editorApi.uploadPackage(selectedFile.name, btoa(binary));
        value = uploaded.sourceFile;
        setSourceFile(uploaded.sourceFile);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setBusy(null);
        return;
      } finally {
        setBusy(null);
      }
    }
    if (!value) {
      setError("Selecione um package .db ou informe um caminho local.");
      return;
    }

    setBusy("inspect");
    setError(null);
    setMessage(null);
    setPreview(null);
    setConflicts([]);

    try {
      const result = await editorApi.inspectPackage(value);
      setPreview(result);
      if (result.sessionId) {
        const conflictResult = await editorApi.importConflicts(result.sessionId);
        setConflicts(conflictResult.conflicts);
      }
      setMessage(result.message);
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }

  async function importPackage() {
    if (!preview) return;

    const unresolved = conflicts.filter(conflict => !conflict.resolved);
    if (unresolved.length > 0) {
      const missing = unresolved.filter(conflict => !resolutions[String(conflict.id)]);
      if (missing.length > 0) {
        setError("Resolva todos os conflitos antes de importar.");
        return;
      }
    }

    setBusy("import");
    setError(null);
    setMessage(null);
    try {
      const result = await editorApi.importPackage(preview.sessionId, resolutions);
      setPreview(result);
      setConflicts([]);
      setResolutions({});
      setMessage(result.message);
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }

  async function rebuild() {
    setBusy("rebuild");
    setError(null);
    setMessage(null);
    try {
      const result = await editorApi.rebuildWorld();
      setMessage(result.message);
      setPreview(null);
      setConflicts([]);
      setResolutions({});
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }

  function setConflictResolution(
    conflict: ImportConflict,
    resolution: ImportConflict["resolution"],
  ) {
    setResolutions(current => ({
      ...current,
      [String(conflict.id)]: resolution,
    }));
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            WORLD BUILDER
          </div>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Import package database
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            O arquivo original permanece somente leitura; o World é montado a partir das fontes registradas.
          </p>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs text-slate-600">
              Source file
            </span>
            <div className="flex gap-2">
              <input
                value={selectedFile?.name ?? sourceFile}
                onChange={event => {
                  setSelectedFile(null);
                  setSourceFile(event.target.value);
                }}
                placeholder="C:\\packages\\brazil.db"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/10 px-3 py-2.5 font-mono text-xs text-slate-200 outline-none placeholder:text-slate-700 focus:border-emerald-400/30"
              />
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/[0.07]">
                Explorar
                <input
                  type="file"
                  accept=".db,.sqlite,.sqlite3"
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    setSourceFile(file?.name ?? "");
                  }}
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] text-slate-600">
              Selecione um banco SQLite pelo explorador ou informe um caminho acessível pela API.
            </p>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void inspect()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/[0.07] disabled:opacity-50"
          >
            {busy === "inspect" ? <LoaderCircle className="animate-spin" size={16} /> : <FileUp size={16} />}
            Inspect
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void rebuild()}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15 disabled:opacity-50"
          >
            {busy === "rebuild" ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Rebuild World
          </button>
        </div>
      </div>

      {preview && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-mono text-slate-500">
                {preview.packageKey}
              </div>
              <h3 className="mt-1 font-semibold text-white">
                Import session #{preview.sessionId}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{preview.message}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={"inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs " + (
                preview.status === "CONFLICTS_FOUND"
                  ? "border-amber-400/15 bg-amber-400/5 text-amber-300"
                  : "border-emerald-400/15 bg-emerald-400/5 text-emerald-300"
              )}>
                {preview.status === "CONFLICTS_FOUND" ? <TriangleAlert size={13} /> : <CheckCircle2 size={13} />}
                {preview.status}
              </span>
              {preview.status !== "COMPLETED" && (
                <button
                  type="button"
                  disabled={busy !== null || (conflicts.length > 0 && conflicts.some(item => !resolutions[String(item.id)]))}
                  onClick={() => void importPackage()}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200 disabled:opacity-50"
                >
                  {busy === "import" ? <LoaderCircle className="animate-spin" size={14} /> : <GitBranch size={14} />}
                  Import
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {metric("Tables", preview.tables)}
            {metric("Rows", preview.rows)}
            {metric("New", preview.newRows)}
            {metric("Conflicts", preview.conflicts)}
          </div>

          {conflicts.length > 0 && (
            <div className="mt-5 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
                Conflict resolution
              </div>
              {conflicts.map(conflict => (
                <div key={conflict.id} className="rounded-xl border border-white/10 bg-black/10 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-slate-400">
                        {conflict.tableName} · {conflict.columnName ?? conflict.conflictType}
                      </div>
                      <div className="mt-1 text-sm text-slate-300">
                        {conflict.existingValue ?? "∅"} <span className="text-slate-600">→</span> {conflict.incomingValue ?? "∅"}
                      </div>
                    </div>
                    <select
                      value={resolutions[String(conflict.id)] ?? ""}
                      onChange={event =>
                        setConflictResolution(
                          conflict,
                          event.target.value as ImportConflict["resolution"],
                        )
                      }
                      className="rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-xs text-slate-300 outline-none"
                    >
                      <option value="">Choose resolution</option>
                      <option value="KEEP_EXISTING">Keep existing</option>
                      <option value="KEEP_INCOMING">Keep incoming</option>
                      <option value="MERGE">Merge</option>
                      <option value="REPLACE">Replace</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {packages.length > 0 && (
        <div className="text-[11px] text-slate-600">
          {packages.length} package(s) registrados. Rebuild usa somente packages habilitados e preserva os arquivos-fonte.
        </div>
      )}

      {(error || message) && (
        <div className={"rounded-xl border px-4 py-3 text-sm " + (
          error
            ? "border-red-400/15 bg-red-400/5 text-red-300"
            : "border-emerald-400/15 bg-emerald-400/5 text-emerald-300"
        )}>
          {error ?? message}
        </div>
      )}
    </section>
  );
}
