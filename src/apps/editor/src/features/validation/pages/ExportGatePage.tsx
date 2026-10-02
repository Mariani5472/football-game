import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { editorApi } from "../../../shared/api/editorApi";

export function ExportGatePage() {
  const [errors, setErrors] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [checked, setChecked] = useState(false);

  async function check() {
    const result = await editorApi.runValidation();
    setErrors(result.issues.filter(issue => issue.severity === "ERROR").length);
    setWarnings(result.issues.filter(issue => issue.severity === "WARNING").length);
    setChecked(true);
  }

  useEffect(() => { void check(); }, []);

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">EXPORT GATE</div>
        <h1 className="text-2xl font-semibold text-white">Validation before export</h1>
        <p className="mt-2 text-sm text-slate-500">
          A exportação só fica liberada quando a base não possui erros estruturais.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
        {!checked ? (
          <div className="text-sm text-slate-500">Verificando a base...</div>
        ) : errors === 0 ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto text-emerald-300" size={40} />
            <h2 className="mt-4 text-lg font-semibold text-white">Base aprovada para exportação</h2>
            <p className="mt-2 text-sm text-slate-500">{warnings} warning(s) não bloqueante(s).</p>
            <button type="button" onClick={() => void check()} className="mt-5 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Validar novamente</button>
          </div>
        ) : (
          <div className="text-center">
            <AlertTriangle className="mx-auto text-red-300" size={40} />
            <h2 className="mt-4 text-lg font-semibold text-red-200">Exportação bloqueada</h2>
            <p className="mt-2 text-sm text-slate-500">{errors} erro(s) precisam ser corrigidos antes da exportação.</p>
            <button type="button" onClick={() => void check()} className="mt-5 rounded-lg bg-red-400/10 px-4 py-2 text-sm text-red-200">Executar validação novamente</button>
          </div>
        )}
      </section>

      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/10 p-4 text-xs text-slate-500">
        <ShieldCheck size={16} /> O gate reutiliza o mesmo WorldValidator usado pelo editor.
      </div>
    </div>
  );
}
