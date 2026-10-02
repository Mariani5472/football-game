import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import type { EditorRoute } from "../../app/routes";
import { editorApi } from "../api/editorApi";

const routeTitles: Record<EditorRoute, string> = {
  dashboard: "Dashboard",
  geography: "Geography",
  "reference-data": "Reference Data",
  continents: "Continents",
  countries: "Countries",
  regions: "Regions",
  cities: "Cities",
  languages: "Languages",
  climates: "Climates",
  people: "People",
  players: "Players",
  clubs: "Clubs",
  stadiums: "Stadiums",
  formations: "Formations",
  competitions: "Competitions",
  "world-systems": "World Systems",
  templates: "Templates",
  "fast-start": "Fast Start",
  validation: "Validation",
  export: "Export",
  "fast-create": "Quick Create",
};

export function EditorHeader({ activeRoute }: { activeRoute: EditorRoute }) {
  const [query, setQuery] = useState("");
  const [databasePath, setDatabasePath] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Array<{ table: string; id: string | number; label: string }>>([]);

  useEffect(() => {
    void editorApi.health()
      .then(health => setDatabasePath(health.databasePath))
      .catch(() => setDatabasePath(null));
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setResults([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const tables = ["team", "club", "person", "player", "nation", "city", "stadium", "competition", "formation"];
        const responses = await Promise.all(
          tables.map(async table => {
            try {
              const result = await editorApi.list(table, {
                page: 1,
                pageSize: 5,
                search: value,
              });
              return result.rows.map(row => ({
                table,
                id: String(row.id ?? ""),
                label: String(row.name ?? row.full_name ?? row.common_name ?? row.short_name ?? row.id ?? ""),
              }));
            } catch {
              return [];
            }
          }),
        );
        if (active) setResults(responses.flat().slice(0, 12));
      } finally {
        if (active) setSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  function openResult(result: { table: string; id: string | number }) {
    window.dispatchEvent(new CustomEvent("editor:navigate-entity", {
      detail: { table: result.table, id: result.id },
    }));
    setQuery("");
  }

  return (
    <header className="relative border-b border-white/10 bg-[#0d1218]/90 px-7">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">EDITOR</span>
          <ChevronDown size={14} className="text-slate-600" />
          <span className="text-sm text-slate-300">{routeTitles[activeRoute]}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search world..."
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-400/30"
            />
            {query && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#121820] shadow-xl">
                {searching ? (
                  <div className="px-4 py-3 text-xs text-slate-500">Searching...</div>
                ) : results.length ? (
                  results.map(result => (
                    <button
                      key={result.table + result.id}
                      type="button"
                      onClick={() => openResult(result)}
                      className="block w-full px-4 py-3 text-left hover:bg-white/[0.04]"
                    >
                      <div className="text-sm text-slate-200">{result.label || result.id}</div>
                      <div className="mt-0.5 text-[11px] text-slate-600">{result.table} · #{result.id}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-slate-500">No entities found.</div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.06]"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      <div className="flex h-9 items-center gap-2 border-t border-white/5 text-[11px] text-slate-600">
        <span>World DB</span>
        <span>·</span>
        <span className="truncate" title={databasePath ?? undefined}>
          {databasePath ?? "API unavailable"}
        </span>
      </div>
    </header>
  );
}
