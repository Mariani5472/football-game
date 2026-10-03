import { AlertTriangle } from "lucide-react";
import type { ExportIssue } from "../../../shared/api";

export function ExportIssues({ issues }: { issues: ExportIssue[] }) {
  const errors = issues.filter(issue => issue.severity === "ERROR");
  if (!errors.length) return null;

  return (
    <section className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 text-red-300" size={18} />
        <div>
          <h2 className="font-semibold text-red-100">Exportação bloqueada</h2>
          <p className="mt-1 text-sm text-red-200/70">
            {errors.length} erro(s) precisam ser corrigidos.
          </p>
          <div className="mt-4 space-y-2">
            {errors.map(issue => (
              <div
                key={issue.ruleKey + issue.message}
                className="rounded-lg border border-red-400/10 bg-black/10 px-3 py-2 text-xs text-red-100"
              >
                <strong>{issue.ruleKey}</strong>: {issue.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
