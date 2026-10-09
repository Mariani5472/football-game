import { Download, FileArchive, RefreshCw } from "lucide-react";

export function ExportForm({
  outputPath,
  exporting,
  loading,
  blocked,
  onOutputPathChange,
  onValidate,
  onExport,
}: {
  outputPath: string;
  exporting: boolean;
  loading: boolean;
  blocked: boolean;
  onOutputPathChange: (value: string) => void;
  onValidate: () => void;
  onExport: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center gap-3">
        <FileArchive size={18} className="text-slate-400" />
        <div>
          <h2 className="font-semibold text-white">World database package</h2>
          <p className="mt-1 text-xs text-slate-500">
            O formato .fg fica reservado até o contrato de pacote ser fechado.
          </p>
        </div>
      </div>

      <label className="mt-5 block max-w-2xl text-xs text-slate-500">
        Caminho de saída
        <input
          value={outputPath}
          onChange={event => onOutputPathChange(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-400/40"
        />
      </label>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onValidate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 disabled:opacity-50"
        >
          <RefreshCw size={15} /> Validar novamente
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={loading || exporting || blocked || !outputPath.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={15} />
          {exporting ? "Exportando…" : "Exportar world.db"}
        </button>
      </div>
    </section>
  );
}
