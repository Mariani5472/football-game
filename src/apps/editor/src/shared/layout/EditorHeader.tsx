import {
  ChevronDown,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";

import type { EditorRoute } from "../../app/routes";

const routeTitles: Record<
  EditorRoute,
  string
> = {
  dashboard: "Dashboard",
  countries: "Countries",
  cities: "Cities",
  languages: "Languages",
  climates: "Climates",
  clubs: "Clubs",
  stadiums: "Stadiums",
  competitions: "Competitions",
  "fast-start": "Fast Start",
  validation: "Validation",
  export: "Export",
};

interface EditorHeaderProps {
  activeRoute: EditorRoute;
}

export function EditorHeader({
  activeRoute,
}: EditorHeaderProps) {
  const [query, setQuery] = useState("");

  const title = routeTitles[activeRoute];

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#0d1218]/90 px-7">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          EDITOR
        </span>

        <ChevronDown
          size={14}
          className="text-slate-600"
        />

        <span className="text-sm text-slate-300">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
          />

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search world..."
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
    </header>
  );
}