import { CheckCircle2, CircleAlert, Database, GitBranch, Save } from "lucide-react";
import type { ReactNode } from "react";
import type { WorldDashboard } from "../../../shared/api/editorApi";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WorldHeader({
  world,
  build,
}: {
  world: WorldDashboard["world"];
  build: WorldDashboard["build"];
}) {
  const valid = world.status === "VALID";
  const buildValid = build.status === "VALID";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <Database size={14} /> WORLD WORKSPACE
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {world.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            World {world.year} · schema v{world.schemaVersion} · editor package v{world.packageVersion}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Meta icon={<Database size={14} />} label="Schema" value={String(world.schemaVersion)} />
          <Meta icon={<GitBranch size={14} />} label="Packages" value={String(build.enabledPackages)} />
          <Meta icon={<Save size={14} />} label="Last build" value={formatDate(build.lastBuildAt)} />
          <StatusMeta valid={buildValid} label="Build" value={build.status} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/5 pt-4 text-xs">
        <StatusBadge valid={valid} label={valid ? "Database valid" : "Database invalid"} />
        {build.unresolvedConflicts > 0 && (
          <StatusBadge valid={false} label={build.unresolvedConflicts + " unresolved conflicts"} />
        )}
        {build.status === "DIRTY" && (
          <span className="rounded-full border border-amber-400/15 bg-amber-400/5 px-3 py-1.5 text-amber-300">
            World requires a rebuild or contains direct edits.
          </span>
        )}
        <span className="ml-auto text-slate-600">
          Saved {formatDate(world.lastSavedAt)}
        </span>
      </div>
    </section>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-slate-400">
      <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-600">
        {icon}
        {label}
      </span>
      <span className="mt-1 block font-medium text-slate-200">{value}</span>
    </span>
  );
}

function StatusMeta({
  valid,
  label,
  value,
}: {
  valid: boolean;
  label: string;
  value: string;
}) {
  return (
    <span className={"rounded-xl border px-3 py-2 " + (
      valid
        ? "border-emerald-400/15 bg-emerald-400/5"
        : "border-amber-400/15 bg-amber-400/5"
    )}>
      <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-600">
        {valid ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
        {label}
      </span>
      <span className={`mt-1 block font-medium ${valid ? "text-emerald-300" : "text-amber-300"}`}>
        {value}
      </span>
    </span>
  );
}

function StatusBadge({
  valid,
  label,
}: {
  valid: boolean;
  label: string;
}) {
  return (
    <span className={"inline-flex items-center gap-2 rounded-full border px-3 py-1.5 " + (
      valid
        ? "border-emerald-400/15 bg-emerald-400/5 text-emerald-300"
        : "border-amber-400/15 bg-amber-400/5 text-amber-300"
    )}>
      {valid ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
      {label}
    </span>
  );
}
