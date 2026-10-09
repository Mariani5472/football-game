import { CheckCircle2 } from "lucide-react";
import type { ExportMetadata } from "../../../shared/api";

export function ExportMetadataCard({ metadata }: { metadata: ExportMetadata | null }) {
  if (!metadata) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center gap-3">
        <CheckCircle2 size={18} className="text-emerald-300" />
        <h2 className="font-semibold text-white">Resumo do export</h2>
      </div>

      <dl className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Item label="Package version" value={metadata.packageVersion} />
        <Item label="Schema version" value={`v${metadata.schemaVersion}`} />
        <Item label="Tabelas" value={metadata.tableCount} />
        <Item label="Registros" value={metadata.rowCount} />
        <Item label="Tamanho" value={formatBytes(metadata.sizeBytes)} />
        <Item label="Exportado em" value={new Date(metadata.exportedAt).toLocaleString()} />
      </dl>

      <div className="mt-5 rounded-xl border border-white/5 bg-black/10 p-4">
        <div className="text-xs text-slate-500">SHA-256</div>
        <code className="mt-2 block break-all text-xs text-slate-300">{metadata.sha256}</code>
      </div>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-200">{value}</dd>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
