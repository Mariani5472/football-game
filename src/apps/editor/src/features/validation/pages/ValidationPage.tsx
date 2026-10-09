import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { editorApi } from "../../../shared/api/editorApi";

type Issue = {
  id: string;
  ruleKey: string;
  severity: "ERROR" | "WARNING" | "INFO";
  entityType: string;
  entityId?: string | number;
  message: string;
  details?: string;
};

export function ValidationPage() {
  const [profiles, setProfiles] = useState<Array<{ id:number; name:string; description:string|null; enabled:boolean }>>([]);
  const [profileId, setProfileId] = useState<number | undefined>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProfiles() {
    const result = await editorApi.validation.profiles();
    setProfiles(result.profiles);
    setProfileId(current => current ?? result.profiles.find(profile => profile.enabled)?.id);
  }

  async function validate() {
    setRunning(true);
    setError(null);
    try {
      const result = await editorApi.validation.run(profileId);
      setIssues(result.issues);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => { void loadProfiles(); }, []);

  useEffect(() => {
    void validate();
  }, [profileId]);

  const errors = issues.filter(issue => issue.severity === "ERROR").length;
  const warnings = issues.filter(issue => issue.severity === "WARNING").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">QUALITY</div>
          <h1 className="text-2xl font-semibold text-white">World Validation</h1>
          <p className="mt-2 text-sm text-slate-500">
            Valide a base antes de exportar ou após alterações estruturais importantes.
          </p>
        </div>
        <button type="button" onClick={() => void validate()} disabled={running}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50">
          <RefreshCw size={15} /> {running ? "Validando..." : "Validar agora"}
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat title="Erros" value={errors} danger />
        <Stat title="Warnings" value={warnings} />
        <Stat title="Status" value={errors ? "Bloqueado" : "Pronto"} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-xs text-slate-500">
            Perfil de validação
            <select value={profileId ?? ""} onChange={event => setProfileId(event.target.value ? Number(event.target.value) : undefined)}
              className="mt-1.5 min-w-64 rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-sm text-slate-200">
              <option value="">Todas as regras ativas</option>
              {profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{profiles.find(profile => profile.id === profileId)?.description ?? "Executa todas as regras habilitadas."}</span>\n            {profileId && <button type="button" onClick={() => void (async () => { const current = profiles.find(p => p.id === profileId); if (!current) return; const updated = await editorApi.validation.setProfileEnabled(profileId, !current.enabled); setProfiles(list => list.map(p => p.id === updated.id ? updated : p)); })()} className="rounded border border-white/10 px-2 py-1 text-[10px] text-slate-400">{profiles.find(p => p.id === profileId)?.enabled ? "Desabilitar perfil" : "Habilitar perfil"}</button>}
          </div>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}

      <section className="space-y-2">
        {!issues.length && !running && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-8 text-center text-sm text-emerald-200">
            <CheckCircle2 className="mx-auto mb-3" /> Nenhum problema encontrado pelo perfil selecionado.
          </div>
        )}

        {issues.map(issue => (
          <div key={issue.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4">
            <div className="flex items-start gap-3">
              {issue.severity === "ERROR" ? <AlertTriangle className="mt-0.5 text-red-300" size={18} /> : <AlertTriangle className="mt-0.5 text-amber-300" size={18} />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${issue.severity === "ERROR" ? "bg-red-400/10 text-red-300" : "bg-amber-400/10 text-amber-300"}`}>{issue.severity}</span>
                  <span className="text-xs text-slate-600">{issue.ruleKey}</span>
                </div>
                <p className="mt-2 text-sm text-slate-200">{issue.message}</p>
                <p className="mt-1 text-xs text-slate-600">{issue.entityType}{issue.entityId !== undefined ? ` #${issue.entityId}` : ""}</p>
                {issue.details && <pre className="mt-2 overflow-auto rounded bg-black/20 p-2 text-[10px] text-slate-600">{issue.details}</pre>}
              </div>
              {issue.entityId !== undefined && (
                <button type="button" title="Abrir entidade"
                  onClick={() => window.dispatchEvent(new CustomEvent("editor:navigate-entity", { detail: { table: issue.entityType, id: issue.entityId } }))}
                  className="rounded-lg p-2 text-slate-600 hover:text-emerald-300">
                  <ExternalLink size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Stat({ title, value, danger }: { title:string; value:string|number; danger?:boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
    <div className="text-xs text-slate-600">{title}</div>
    <div className={`mt-2 text-2xl font-semibold ${danger ? "text-red-300" : "text-white"}`}>{value}</div>
  </div>;
}
