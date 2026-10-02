import { CheckCircle2, CircleAlert, Database, Save } from "lucide-react";
import type { ReactNode } from "react";
import type { WorldDashboard } from "../../../shared/api/editorApi";

function formatSavedAt(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function WorldHeader({ world }: { world: WorldDashboard["world"] }) {
  const valid = world.status === "VALID";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <Database size={14} /> WORLD
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">{world.name}</h1>
          <p className="mt-2 text-sm text-slate-500">
            World {world.year} · pacote do editor v{world.packageVersion}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Meta icon={<Database size={14} />} label="Schema" value={String(world.schemaVersion)} />
          <Meta icon={<Save size={14} />} label="Last saved" value={formatSavedAt(world.lastSavedAt)} />
          <span className={"inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-medium " +
            (valid
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : "border-red-400/20 bg-red-400/10 text-red-300")}>
            {valid ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
            {valid ? "Valid" : "Invalid"}
          </span>
        </div>
      </div>
    </section>
  );
}

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-slate-400">
      {icon}
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-300">{value}</span>
    </span>
  );
}
