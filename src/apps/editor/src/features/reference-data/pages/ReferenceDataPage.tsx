import { ReferenceDataContent } from "../components/ReferenceDataContent";
import { ReferenceTableNav } from "../components/ReferenceTableNav";
import { useReferenceData } from "../hooks/useReferenceData";

export function ReferenceDataPage() {
  const state = useReferenceData();

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          WORLD DB
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Reference Data
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Generic CRUD for simple world-schema reference tables.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
        <ReferenceTableNav
          selected={state.selected}
          onSelect={state.setSelected}
        />
        <ReferenceDataContent
          loading={state.loading}
          error={state.error}
          config={state.config}
        />
      </div>
    </div>
  );
}
