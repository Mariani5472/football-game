import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { editorApi } from "../../../shared/api/editorApi";

type Issue = { severity: "ERROR" | "WARNING" | "INFO"; message: string };

export function StadiumValidationPanel({ stadiumId }: { stadiumId: number }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function validate() {
    setLoading(true); setError(null);
    try {
      const result = await editorApi.validation.run();
      setIssues(result.issues.filter(issue => issue.entityType === "stadium" && Number(issue.entityId) === stadiumId));
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void validate(); }, [stadiumId]);
  const errors = issues.filter(issue => issue.severity === "ERROR").length;

  return <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
    <div className="flex items-start justify-between gap-4">
      <div><h3 className="text-sm font-semibold text-white">Validation</h3><p className="mt-1 text-xs text-slate-600">Run the World validation rules against this stadium.</p></div>
      <button type="button" disabled={loading} onClick={() => void validate()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 disabled:opacity-50"><RefreshCw size={13} /> {loading ? "Checking..." : "Check again"}</button>
    </div>
    {error && <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200">{error}</div>}
    {!error && !loading && issues.length === 0 && <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.03] p-4 text-sm text-emerald-200"><CheckCircle2 size={16} /> Stadium passed all currently enabled validation rules.</div>}
    {issues.length > 0 && <div className="mt-4 space-y-2">{issues.map((issue, index) => <div key={`${issue.message}-${index}`} className={`rounded-xl border p-3 text-xs ${issue.severity === "ERROR" ? "border-red-400/20 bg-red-400/5 text-red-200" : "border-amber-400/20 bg-amber-400/5 text-amber-200"}`}><div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]">{issue.severity}</div>{issue.message}</div>)}{errors > 0 && <p className="text-xs text-red-300">{errors} error(s) require attention.</p>}</div>}
  </section>;
}