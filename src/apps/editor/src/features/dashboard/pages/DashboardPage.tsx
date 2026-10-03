import { useState } from "react";
import { DashboardQuickCreate } from "../components/DashboardQuickCreate";
import { PackageManagerPanel } from "../components/PackageManagerPanel";
import { WorldHeader } from "../components/WorldHeader";
import { WorldPackages } from "../components/WorldPackages";
import { useDashboard } from "../hooks/useDashboard";
import { QuickCreateModal, type QuickCreatePreset } from "../../quick-create";
import { editorApi, type WorldPackageRecord } from "../../../shared/api/editorApi";

export function DashboardPage() {
  const { data, isLoading, error, refresh } = useDashboard();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreatePreset, setQuickCreatePreset] =
    useState<QuickCreatePreset | undefined>();
  const [busyPackageId, setBusyPackageId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  return (
    <div className="space-y-8">
      <WorldHeader world={data.world} build={data.build} />

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
