import { ArrowDown, ArrowUp, Box, CheckCircle2, CircleAlert, PackageOpen, Power } from "lucide-react";
import type { WorldPackageRecord } from "../../../shared/api/editorApi";

const fallbackIcons: Record<string, string> = {
  Brazil: "🇧🇷",
  Argentina: "🇦🇷",
  Bolivia: "🇧🇴",
  CONMEBOL: "🌎",
};

function statusLabel(status: WorldPackageRecord["status"]) {
  if (status === "CONFLICT") return "Conflict";
  if (status === "ERROR") return "Error";
  if (status === "DISABLED") return "Disabled";
  return "Active";
}

export function WorldPackages({
  packages,
  busyPackageId,
  onToggle,
  onPriority,
  onMove,
}: {
  packages: WorldPackageRecord[];
  busyPackageId: number | null;
  onToggle: (pkg: WorldPackageRecord) => void;
  onPriority: (pkg: WorldPackageRecord, priority: number) => void;
  onMove: (pkg: WorldPackageRecord, direction: -1 | 1) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            PACKAGES
          </div>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {packages.length
              ? packages.length + " packages in load order"
              : "No packages registered"}
          </h2>
        </div>
        <PackageOpen size={18} className="text-slate-600" />
      </div>

      {packages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-8 text-center">
          <Box className="mx-auto text-slate-600" size={24} />
          <p className="mt-3 text-sm text-slate-400">
            This World has no registered packages yet.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Import a package database to start composing the World.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg, index) => (
            <article
              key={pkg.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-lg">
                    {pkg.icon ?? fallbackIcons[pkg.name] ?? "📦"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-medium text-white">
                        {pkg.name}
                      </h3>
                      <PackageStatus status={pkg.status} enabled={pkg.enabled} />
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-slate-600">
                      {pkg.packageKey} · v{pkg.version}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span>Load order {pkg.loadOrder ?? index + 1}</span>
                      <span>·</span>
                      <span>Priority {pkg.priority}</span>
                      <span>·</span>
                      <span>{pkg.packageType === "BASE" ? "Base World" : pkg.packageType}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busyPackageId === pkg.id || index === 0}
                    onClick={() => onMove(pkg, -1)}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-400 transition hover:bg-white/[0.06] disabled:opacity-30"
                    title="Move package up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={busyPackageId === pkg.id || index === packages.length - 1}
                    onClick={() => onMove(pkg, 1)}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-400 transition hover:bg-white/[0.06] disabled:opacity-30"
                    title="Move package down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-500">
                    Priority
                    <input
                      value={pkg.priority}
                      onChange={event => onPriority(pkg, Number(event.target.value))}
                      disabled={pkg.packageType === "BASE" || pkg.packageKey === "world.base"}
                      type="number"
                      className="w-16 bg-transparent text-right text-slate-200 outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busyPackageId === pkg.id || pkg.packageType === "BASE"}
                    onClick={() => onToggle(pkg)}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    <Power size={14} />
                    {pkg.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>

              {pkg.description && (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  {pkg.description}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {pkg.categories.map(category => (
                  <span
                    key={category}
                    className="rounded-md border border-white/5 bg-black/10 px-2 py-1 text-[11px] text-slate-500"
                  >
                    {category}
                  </span>
                ))}
                {pkg.provides.map(scope => (
                  <span
                    key={"provide:" + scope}
                    className="rounded-md border border-emerald-400/10 bg-emerald-400/5 px-2 py-1 font-mono text-[10px] text-emerald-300"
                  >
                    provides:{scope}
                  </span>
                ))}
                {pkg.dependencies.map(dependency => (
                  <span
                    key={"dependency:" + dependency.key}
                    className="rounded-md border border-sky-400/10 bg-sky-400/5 px-2 py-1 font-mono text-[10px] text-sky-300"
                  >
                    requires:{dependency.key}{dependency.minVersion ? " ≥ " + dependency.minVersion : ""}
                  </span>
                ))}
                {pkg.conflicts.map(conflict => (
                  <span
                    key={"conflict:" + conflict}
                    className="rounded-md border border-amber-400/10 bg-amber-400/5 px-2 py-1 font-mono text-[10px] text-amber-300"
                  >
                    conflicts:{conflict}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PackageStatus({
  status,
  enabled,
}: {
  status: WorldPackageRecord["status"];
  enabled: boolean;
}) {
  const active = status === "ACTIVE" && enabled;
  const Icon = active ? CheckCircle2 : CircleAlert;
  return (
    <span className={"inline-flex items-center gap-1.5 text-[11px] font-medium " + (
      active
        ? "text-emerald-300"
        : status === "CONFLICT"
          ? "text-amber-300"
          : "text-red-300"
    )}>
      <Icon size={13} />
      {enabled ? statusLabel(status) : "Disabled"}
    </span>
  );
}
