import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import type { EditorRoute } from "../../app/routes";
import { editorApi } from "../api/editorApi";

const routeTitles: Record<EditorRoute, string> = {
  dashboard: "Dashboard",
  geography: "Geography",
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
  "fast-start": "Fast Start",
  validation: "Validation",
  export: "Export",
};

export function EditorHeader({ activeRoute }: { activeRoute: EditorRoute }) {
  const [query, setQuery] = useState("");
  const [databasePath, setDatabasePath] = useState<string | null>(null);

  useEffect(() => {
    void editorApi.health()
      .then((health) => setDatabasePath(health.databasePath))
      .catch(() => setDatabasePath(null));
  }, []);

  return (
    <header className="border-b border-white/10 bg-[#0d1218]/90 px-7">
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-400/30"
            />
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
