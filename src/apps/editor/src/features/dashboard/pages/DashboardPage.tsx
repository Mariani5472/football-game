import { useEffect, useState } from "react";
import { DashboardQuickCreate } from "../components/DashboardQuickCreate";
import { PackageManagerPanel } from "../components/PackageManagerPanel";
import { WorldHeader } from "../components/WorldHeader";
import { WorldPackages } from "../components/WorldPackages";
import { useDashboard } from "../hooks/useDashboard";
import { QuickCreateModal, type QuickCreatePreset } from "../../quick-create";
import { editorApi, type WorldPackageRecord } from "../../../shared/api/editorApi";
import type { DefaultDataSummary } from "../../../shared/api/worldApi";

export function DashboardPage() {
  const { data, isLoading, error, refresh } = useDashboard();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreatePreset, setQuickCreatePreset] =
    useState<QuickCreatePreset | undefined>();
  const [busyPackageId, setBusyPackageId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [defaultData, setDefaultData] = useState<DefaultDataSummary | null>(null);
  useEffect(() => { void editorApi.world.defaultData().then(setDefaultData).catch(() => setDefaultData(null)); }, []);

  function openCreate(preset: QuickCreatePreset) {
    setQuickCreatePreset(preset);
    setQuickCreateOpen(true);
  }

  async function updatePackage(
    pkg: WorldPackageRecord,
    payload: { enabled?: boolean; priority?: number; loadOrder?: number },
  ) {
    setBusyPackageId(pkg.id);
    setActionError(null);
    try {
      await editorApi.world.updatePackage(pkg.id, payload);
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusyPackageId(null);
    }
  }

  async function movePackage(
    pkg: WorldPackageRecord,
    direction: -1 | 1,
  ) {
    const target = Math.max(
      1,
      (pkg.loadOrder ?? 1) + direction,
    );
    await updatePackage(pkg, { loadOrder: target });
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">
        Loading World…
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-2xl border border-red-400/15 bg-red-400/[0.03] p-8">
        <h1 className="text-lg font-semibold text-white">
          World unavailable
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          {error ?? "No World data is available."}
        </p>
        <button
          type="button"
          onClick={refresh}
          className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.06]"
        >
          Retry
        </button>
      </section>
    );
  }

  console.log(data)

  return (
    <div className="space-y-8">
      <WorldHeader world={data.world} build={data.build} />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {([
          ["Continents", data.statistics.continents], ["Countries", data.statistics.countries],
          ["Cities", data.statistics.cities], ["Clubs", data.statistics.clubs],
          ["Teams", data.statistics.teams], ["People", data.statistics.people],
          ["Players", data.statistics.players], ["Stadiums", data.statistics.stadiums],
          ["Competitions", data.statistics.competitions], ["Seasons", data.statistics.seasons],
          ["Languages", data.statistics.languages], ["Climates", data.statistics.climates],
        ] as Array<[string, number]>).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</div>
            <div className="mt-1 text-xl font-semibold text-white">{value.toLocaleString()}</div>
          </div>
        ))}
      </section>

      {defaultData && <section className="rounded-2xl border border-sky-400/15 bg-sky-400/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-medium text-white">Default reference data · v{defaultData.version}</h2><p className="mt-1 text-xs text-slate-500">{defaultData.importedEntities.toLocaleString()} entities · {defaultData.attributedValues.toLocaleString()} attributed values · priority {defaultData.priority} · {defaultData.sourceHashRecorded ? "source hash recorded" : "source hash missing"}</p></div>
          <div className="flex flex-wrap gap-2">
            {defaultData.provides.map(scope => (
              <span
                key={scope}
                className="rounded-md border border-sky-400/10 px-2 py-1 font-mono text-[10px] text-sky-300"
              >
                {scope}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Object.entries(defaultData.domains).map(([domain, tables]) => (
            <div
              key={domain}
              className="rounded-xl border border-white/5 bg-black/10 p-3"
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {domain}
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {tables.length}
              </div>
              <div className="mt-1 text-[10px] text-slate-600">
                reference tables
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>}

      <PackageManagerPanel
        packages={data.packages}
        onChanged={refresh}
      />

      <WorldPackages
        packages={data.packages}
        busyPackageId={busyPackageId}
        onToggle={pkg =>
          void updatePackage(pkg, {
            enabled: !pkg.enabled,
          })
        }
        onPriority={(pkg, priority) =>
          void updatePackage(pkg, { priority })
        }
        onMove={(pkg, direction) =>
          void movePackage(pkg, direction)
        }
      />

      {actionError && (
        <div className="rounded-xl border border-red-400/15 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {actionError}
        </div>
      )}

      <DashboardQuickCreate onCreate={openCreate} />

      <QuickCreateModal
        open={quickCreateOpen}
        initialPreset={quickCreatePreset}
        onClose={() => {
          setQuickCreateOpen(false);
          setQuickCreatePreset(undefined);
          void refresh();
        }}
      />
    </div>
  );
}
