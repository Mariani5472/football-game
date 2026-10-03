import { CrudEntityPage } from "../../../shared/components/crud/CrudEntityPage";
import type { CrudEntityConfig } from "../../../shared/components/crud/CrudEntityPage";

export function ReferenceDataContent({
  loading,
  error,
  config,
}: {
  loading: boolean;
  error: string | null;
  config: CrudEntityConfig | null;
}) {
  return (
    <main>
      {error && (
        <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>
      )}
      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">Loading reference schema...</div>
      )}
      {!loading && config && <CrudEntityPage config={config} />}
    </main>
  );
}
