import type { GeographyEntityKind } from "../types";

interface Props {
  counts: Record<GeographyEntityKind, number>;
  filter: GeographyEntityKind | "all";
  query: string;
  onFilterChange: (filter: GeographyEntityKind | "all") => void;
  onQueryChange: (query: string) => void;
}

const items: Array<[string, GeographyEntityKind]> = [
  ["Federations", "federation"],
  ["Continents", "continent"],
  ["Continent Regions", "continent-region"],
  ["Countries", "country"],
  ["Nation Regions", "nation-region"],
  ["Cities", "city"],
];

export function GeographyFilters({ counts, filter, query, onFilterChange, onQueryChange }: Props) {
  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map(([label, kind]) => (
          <button key={kind} type="button" onClick={() => onFilterChange(kind)} className={["rounded-xl border px-4 py-3 text-left", filter === kind ? "border-emerald-400/20 bg-emerald-400/5" : "border-white/10 bg-white/[0.02]"].join(" ")}>
            <div className="text-[10px] uppercase tracking-[0.15em] text-slate-600">{label}</div>
            <div className="mt-1 text-xl font-semibold text-white">{counts[kind]}</div>
          </button>
        ))}
      </div>
      <div className="relative">
        <input
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          placeholder="Search geography..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={() => onFilterChange("all")} className={["rounded-lg px-2.5 py-1.5 text-xs", filter === "all" ? "bg-emerald-400/10 text-emerald-200" : "text-slate-500"].join(" ")}>All</button>
        {items.map(([label, kind]) => (
          <button key={kind} type="button" onClick={() => onFilterChange(kind)} className={["rounded-lg px-2.5 py-1.5 text-xs", filter === kind ? "bg-emerald-400/10 text-emerald-200" : "text-slate-500"].join(" ")}>{label}</button>
        ))}
      </div>
    </section>
  );
}
