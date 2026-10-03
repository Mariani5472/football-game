import { Globe2, Plus } from "lucide-react";

export function GeographyHeader({ onAddContinent }: { onAddContinent: () => void }) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
          WORLD
        </div>
        <div className="flex items-center gap-3">
          <Globe2 size={22} className="text-emerald-200" />
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            GEOGRAPHY
          </h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Explore the world through continents and countries instead of navigating raw database tables.
        </p>
      </div>

      <button
        type="button"
        onClick={onAddContinent}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
      >
        <Plus size={15} />
        Add continent
      </button>
    </header>
  );
}
