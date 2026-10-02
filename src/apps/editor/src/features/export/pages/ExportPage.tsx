import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileArchive, RefreshCw, ShieldCheck } from "lucide-react";
import { editorApi } from "../../../shared/api/editorApi";

interface ExportMetadata {
  format: string;
  packageVersion: string;
  schemaVersion: number;
  databaseType: string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  exportedAt: string;
  tableCount: number;
  rowCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function ExportPage() {
  const [issues, setIssues] = useState<Array<{ severity: "ERROR" | "WARNING"; ruleKey: string; message: string }>>([]);
  const [metadata, setMetadata] = useState<ExportMetadata | null>(null);
  const [outputPath, setOutputPath] = useState("export/world.db");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function validate() {
    setLoading(true);
    setMessage(null);
    try {
      const result = await editorApi.runValidation();
      setIssues(result.issues
        .filter(issue => issue.severity === "ERROR" || issue.severity === "WARNING")
        .map(issue => ({ severity: issue.severity, ruleKey: issue.ruleKey, message: issue.message })));
    } finally {
      setLoading(false);
    }
  }

  async function exportDatabase() {
    setExporting(true);
    setMessage(null);
    try {
      const result = await editorApi.exportWorldDb(outputPath);
      setMetadata(result.metadata);
      setIssues(result.issues);
      setMessage(`World DB exportado para ${result.outputPath}.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
      await validate();
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => { void validate(); }, []);

  const errors = issues.filter(issue => issue.severity === "ERROR");
  const warnings = issues.filter(issue => issue.severity === "WARNING");

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">PACKAGE</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Export World</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Valide, gere o pacote `world.db` e confira a versão, integridade e hash antes de distribuir a base.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-xs text-slate-500">Status</div>
          <div className={`mt-2 text-lg font-semibold ${errors.length ? "text-red-200" : "text-emerald-200"}`}>
            {loading ? "Validando…" : errors.length ? "Blocked" : "Ready"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-xs text-slate-500">Warnings</div>
          <div className="mt-2 text-lg font-semibold text-amber-200">{warnings.length}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-xs text-slate-500">Último export</div>
          <div className="mt-2 text-sm text-slate-200">{metadata?.fileName ?? "—"}</div>
        </div>
      </section>

      {errors.length > 0 && (
        <section className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-red-300" size={18} />
            <div>
              <h2 className="font-semibold text-red-100">Exportação bloqueada</h2>
              <p className="mt-1 text-sm text-red-200/70">{errors.length} erro(s) precisam ser corrigidos.</p>
              <div className="mt-4 space-y-2">
                {errors.map(issue => (
                  <div key={issue.ruleKey + issue.message} className="rounded-lg border border-red-400/10 bg-black/10 px-3 py-2 text-xs text-red-100">
                    <strong>{issue.ruleKey}</strong>: {issue.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center gap-3">
          <FileArchive size={18} className="text-slate-400" />
          <div>
            <h2 className="font-semibold text-white">World database package</h2>
            <p className="mt-1 text-xs text-slate-500">O formato `.fg` fica reservado até o contrato de pacote ser fechado.</p>
          </div>
        </div>

        <label className="mt-5 block max-w-2xl text-xs text-slate-500">
          Caminho de saída
          <input
            value={outputPath}
            onChange={event => setOutputPath(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-400/40"
          />
        </label>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => void validate()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 disabled:opacity-50">
            <RefreshCw size={15} /> Validar novamente
          </button>
          <button type="button" onClick={() => void exportDatabase()} disabled={loading || exporting || errors.length > 0 || !outputPath.trim()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">
            <Download size={15} /> {exporting ? "Exportando…" : "Exportar world.db"}
          </button>
        </div>
      </section>

      {metadata && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-300" />
            <h2 className="font-semibold text-white">Resumo do export</h2>
          </div>
          <dl className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-xs text-slate-500">Package version</dt><dd className="mt-1 text-sm text-slate-200">{metadata.packageVersion}</dd></div>
            <div><dt className="text-xs text-slate-500">Schema version</dt><dd className="mt-1 text-sm text-slate-200">v{metadata.schemaVersion}</dd></div>
            <div><dt className="text-xs text-slate-500">Tabelas</dt><dd className="mt-1 text-sm text-slate-200">{metadata.tableCount}</dd></div>
            <div><dt className="text-xs text-slate-500">Registros</dt><dd className="mt-1 text-sm text-slate-200">{metadata.rowCount}</dd></div>
            <div><dt className="text-xs text-slate-500">Tamanho</dt><dd className="mt-1 text-sm text-slate-200">{formatBytes(metadata.sizeBytes)}</dd></div>
            <div><dt className="text-xs text-slate-500">Exportado em</dt><dd className="mt-1 text-sm text-slate-200">{new Date(metadata.exportedAt).toLocaleString()}</dd></div>
          </dl>
          <div className="mt-5 rounded-xl border border-white/5 bg-black/10 p-4">
            <div className="text-xs text-slate-500">SHA-256</div>
            <code className="mt-2 block break-all text-xs text-slate-300">{metadata.sha256}</code>
          </div>
        </section>
      )}

      {message && (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
          <ShieldCheck size={16} className="text-emerald-300" /> {message}
        </div>
      )}
    </div>
  );
}
