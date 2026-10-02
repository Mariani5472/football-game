import { AlertTriangle, Box, CheckCircle2, PackageOpen } from "lucide-react";
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
  return "Active";
}

export function WorldPackages({ packages }: { packages: WorldPackageRecord[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">PACKAGES</div>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {packages.length ? packages.length + " packages" : "No packages registered"}
          </h2>
        </div>
        <PackageOpen size={18} className="text-slate-600" />
      </div>

      {packages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-8 text-center">
          <Box className="mx-auto text-slate-600" size={24} />
          <p className="mt-3 text-sm text-slate-400">This World has no registered packages yet.</p>
          <p className="mt-1 text-xs text-slate-600">
            Imported content will appear here when package composition is available.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {packages.map(pkg => (
            <article key={pkg.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/15">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-lg">
                    {pkg.icon ?? fallbackIcons[pkg.name] ?? "📦"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-white">{pkg.name}</h3>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-slate-600">
                      {pkg.packageKey} · v{pkg.version}
                    </p>
                  </div>
                </div>
                <PackageStatus status={pkg.status} />
              </div>

              {pkg.description && <p className="mt-4 text-sm leading-6 text-slate-500">{pkg.description}</p>}

              {pkg.categories.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {pkg.categories.map(category => (
                    <span key={category} className="rounded-md border border-white/5 bg-black/10 px-2 py-1 text-[11px] text-slate-500">
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PackageStatus({ status }: { status: WorldPackageRecord["status"] }) {
  const Icon = status === "ACTIVE" ? CheckCircle2 : AlertTriangle;
  return (
    <span className={"inline-flex items-center gap-1.5 text-[11px] font-medium " +
      (status === "ACTIVE" ? "text-emerald-300" : status === "CONFLICT" ? "text-amber-300" : "text-red-300")}>
      <Icon size={13} />
      {statusLabel(status)}
    </span>
  );
}
