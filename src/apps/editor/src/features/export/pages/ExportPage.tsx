import { ShieldCheck } from "lucide-react";
import { ExportForm } from "../components/ExportForm";
import { ExportIssues } from "../components/ExportIssues";
import { ExportMetadataCard } from "../components/ExportMetadataCard";
import { ExportStatusCards } from "../components/ExportStatusCards";
import { useWorldExport } from "../hooks/useWorldExport";

export function ExportPage() {
  const state = useWorldExport();

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">PACKAGE</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Export World</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Valide, gere o pacote world.db e confira a versão, integridade e hash antes de distribuir a base.
        </p>
      </header>

      <ExportStatusCards
        blocked={state.errors.length > 0}
        warningCount={state.warnings.length}
        metadata={state.metadata}
        loading={state.loading}
      />
      <ExportIssues issues={state.issues} />
      <ExportForm
        outputPath={state.outputPath}
        exporting={state.exporting}
        loading={state.loading}
        blocked={state.errors.length > 0}
        onOutputPathChange={state.setOutputPath}
        onValidate={() => void state.validate()}
        onExport={() => void state.exportDatabase()}
      />
      <ExportMetadataCard metadata={state.metadata} />

      {state.message && (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
          <ShieldCheck size={16} className="text-emerald-300" />
          {state.message}
        </div>
      )}
    </div>
  );
}
