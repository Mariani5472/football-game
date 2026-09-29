import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  CloudSun,
  Database,
  Globe2,
  Languages,
  Map,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";

type Section =
  | "countries"
  | "cities"
  | "languages"
  | "climates"
  | "clubs"
  | "stadiums"
  | "competitions"
  | "fast-start"
  | "validation"
  | "export";

interface NavItem {
  id: Section;
  label: string;
  icon: typeof Globe2;
}

const worldItems: NavItem[] = [
  { id: "countries", label: "Countries", icon: Globe2 },
  { id: "cities", label: "Cities", icon: Map },
  { id: "languages", label: "Languages", icon: Languages },
  { id: "climates", label: "Climates", icon: CloudSun },
];

const teamItems: NavItem[] = [
  { id: "clubs", label: "Clubs", icon: ShieldCheck },
  { id: "stadiums", label: "Stadiums", icon: Building2 },
];

const competitionItems: NavItem[] = [
  { id: "competitions", label: "Competitions", icon: Trophy },
];

const toolItems: NavItem[] = [
  { id: "fast-start", label: "Fast Start", icon: CircleDot },
  { id: "validation", label: "Validation", icon: CheckCircle2 },
  { id: "export", label: "Export", icon: Database },
];

const sectionMeta: Record<
  Section,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  countries: {
    eyebrow: "WORLD",
    title: "Countries",
    description:
      "Manage nations and their place in the world.",
  },
  cities: {
    eyebrow: "WORLD",
    title: "Cities",
    description:
      "Inspect the geographic layer behind your football world.",
  },
  languages: {
    eyebrow: "WORLD",
    title: "Languages",
    description:
      "Reference languages used across nations, regions, and cities.",
  },
  climates: {
    eyebrow: "WORLD",
    title: "Climates",
    description:
      "Reference climate definitions for the world database.",
  },
  clubs: {
    eyebrow: "TEAMS",
    title: "Clubs",
    description:
      "The club layer built on top of the shared Team model.",
  },
  stadiums: {
    eyebrow: "TEAMS",
    title: "Stadiums",
    description:
      "Venues, capacities, locations, and ownership.",
  },
  competitions: {
    eyebrow: "COMPETITIONS",
    title: "Competitions",
    description:
      "Competition definitions, seasons, stages, and structure.",
  },
  "fast-start": {
    eyebrow: "TOOLS",
    title: "Fast Start",
    description:
      "Generate a starter world from one of the available templates.",
  },
  validation: {
    eyebrow: "TOOLS",
    title: "Validation",
    description:
      "Check domain consistency before a world is used by the game.",
  },
  export: {
    eyebrow: "TOOLS",
    title: "Export",
    description:
      "Prepare the current world for the game package pipeline.",
  },
};

function App() {
  const [activeSection, setActiveSection] =
    useState<Section>("countries");
  const [query, setQuery] = useState("");

  const meta = sectionMeta[activeSection];

  return (
    <div className="flex min-h-screen bg-[#0b0f14] text-slate-200">
      <aside className="w-72 shrink-0 border-r border-white/10 bg-[#0f141b]">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <Wrench size={19} />
          </div>

          <div>
            <div className="text-sm font-semibold text-white">
              Football Game Editor
            </div>
            <div className="text-xs text-slate-500">
              World Studio
            </div>
          </div>
        </div>

        <nav className="space-y-5 px-3 py-5">
          <NavGroup
            label="WORLD"
            items={worldItems}
            activeSection={activeSection}
            onSelect={setActiveSection}
          />

          <NavGroup
            label="TEAMS"
            items={teamItems}
            activeSection={activeSection}
            onSelect={setActiveSection}
          />

          <NavGroup
            label="COMPETITIONS"
            items={competitionItems}
            activeSection={activeSection}
            onSelect={setActiveSection}
          />

          <NavGroup
            label="TOOLS"
            items={toolItems}
            activeSection={activeSection}
            onSelect={setActiveSection}
          />
        </nav>

        <div className="absolute bottom-0 w-72 border-t border-white/10 bg-[#0f141b] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400/60 to-cyan-400/20" />
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-slate-200">
                Sandbox World
              </div>
              <div className="truncate text-[11px] text-slate-500">
                world.db · schema v2
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#0d1218]/90 px-7">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              {meta.eyebrow}
            </span>
            <ChevronDown
              size={14}
              className="text-slate-600"
            />
            <span className="text-sm text-slate-300">
              {meta.title}
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

            <button className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.06]">
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </header>

        <div className="min-h-[calc(100vh-4rem)] px-8 py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
                {meta.eyebrow}
              </div>

              <div className="flex items-end justify-between gap-8">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white">
                    {meta.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {meta.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2
                    size={15}
                    className="text-emerald-400"
                  />
                  Schema v2
                </div>
              </div>
            </div>

            <SectionContent
              section={activeSection}
              searchQuery={query}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

interface NavGroupProps {
  label: string;
  items: NavItem[];
  activeSection: Section;
  onSelect: (section: Section) => void;
}

function NavGroup({
  label,
  items,
  activeSection,
  onSelect,
}: NavGroupProps) {
  return (
    <div>
      <div className="px-3 pb-2 text-[11px] font-semibold tracking-[0.2em] text-slate-600">
        {label}
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={[
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                active
                  ? "bg-emerald-400/10 text-emerald-200"
                  : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200",
              ].join(" ")}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionContent({
  section,
  searchQuery,
}: {
  section: Section;
  searchQuery: string;
}) {
  if (section === "fast-start") {
    return (
      <ToolPanel
        title="Fast Start"
        description="Create a small coherent world to bootstrap editor and engine development."
        action="Generate Sandbox"
      />
    );
  }

  if (section === "validation") {
    return (
      <ToolPanel
        title="Validation"
        description="Run explicit world-domain validation rules before exporting or loading a world."
        action="Run Validation"
      />
    );
  }

  if (section === "export") {
    return (
      <ToolPanel
        title="Export"
        description="The export pipeline will turn the world database into a portable game package."
        action="Export World"
      />
    );
  }

  const datasets: Record<
    Exclude<
      Section,
      "fast-start" | "validation" | "export"
    >,
    Array<{
      name: string;
      detail: string;
      status: string;
    }>
  > = {
    countries: [
      {
        name: "Sandboxland",
        detail: "SBL · Sandbox Region 1",
        status: "Ready",
      },
      {
        name: "Testland",
        detail: "TST · Sandbox Region 3",
        status: "Ready",
      },
    ],
    cities: Array.from({ length: 8 }, (_, i) => ({
      name: `Sandbox City ${i + 1}`,
      detail: i % 2 === 0 ? "Sandboxland" : "Testland",
      status: "Ready",
    })),
    languages: [
      {
        name: "Sandbox",
        detail: "Sandbox Language Family",
        status: "Reference",
      },
    ],
    climates: [
      {
        name: "Temperate",
        detail: "TMP",
        status: "Reference",
      },
      {
        name: "Tropical",
        detail: "TRO",
        status: "Reference",
      },
    ],
    clubs: Array.from({ length: 8 }, (_, i) => ({
      name: `Sandbox FC ${i + 1}`,
      detail: `SB${i + 1} · Club`,
      status: "Ready",
    })),
    stadiums: Array.from({ length: 8 }, (_, i) => ({
      name: `Sandbox Stadium ${i + 1}`,
      detail: `${10_000 + i * 1_000} seats`,
      status: "Ready",
    })),
    competitions: [
      {
        name: "Sandbox League",
        detail: "2 seasons · 1 stage",
        status: "Structured",
      },
      {
        name: "Sandbox Cup",
        detail: "2 seasons · 1 stage",
        status: "Structured",
      },
    ],
  };

  const source = datasets[section];
  const filtered = source.filter((item) =>
    item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-sm font-medium text-white">
            {source.length} records
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Read-only shell · data integration comes next
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-500">
          <Users size={14} />
          World data
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {filtered.map((item) => (
          <button
            key={item.name}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/[0.025]"
          >
            <div>
              <div className="text-sm font-medium text-slate-200">
                {item.name}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {item.detail}
              </div>
            </div>

            <span className="rounded-full border border-emerald-400/10 bg-emerald-400/5 px-2 py-1 text-[11px] text-emerald-300/80">
              {item.status}
            </span>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-slate-600">
            No records match “{searchQuery}”.
          </div>
        )}
      </div>
    </div>
  );
}

function ToolPanel({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[1.4fr_0.8fr]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
          <CircleDot size={21} />
        </div>

        <h2 className="text-lg font-semibold text-white">
          {title}
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          {description}
        </p>

        <button className="mt-8 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-300">
          {action}
        </button>
      </section>

      <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          Current state
        </div>

        <div className="mt-5 space-y-4">
          <StatusRow
            label="World database"
            value="world.db"
          />
          <StatusRow
            label="Schema"
            value="v2"
          />
          <StatusRow
            label="Entities"
            value="216 tables"
          />
          <StatusRow
            label="Engine"
            value="Not connected"
          />
        </div>
      </aside>
    </div>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-300">
        {value}
      </span>
    </div>
  );
}

export default App;
