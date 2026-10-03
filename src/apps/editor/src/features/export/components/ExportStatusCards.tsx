import type { ExportMetadata } from "../../../shared/api";

export function ExportStatusCards({
  blocked,
  warningCount,
  metadata,
  loading,
}: {
  blocked: boolean;
  warningCount: number;
  metadata: ExportMetadata | null;
  loading: boolean;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <StatusCard
        label="Status"
        value={loading ? "Validando…" : blocked ? "Blocked" : "Ready"}
        tone={blocked ? "error" : "success"}
      />
      <StatusCard label="Warnings" value={warningCount} tone="warning" />
      <StatusCard label="Último export" value={metadata?.fileName ?? "—"} tone="neutral" />
    </section>
  );
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "error" | "success" | "warning" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={[
        "mt-2 text-lg font-semibold",
        tone === "error" ? "text-red-200" :
        tone === "warning" ? "text-amber-200" :
        tone === "success" ? "text-emerald-200" :
        "text-slate-200",
      ].join(" ")}>
        {value}
      </div>
    </div>
  );
}
