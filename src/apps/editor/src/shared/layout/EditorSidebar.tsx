import {
  Building2,
  CheckCircle2,
  CircleDot,
  CloudSun,
  Database,
  Globe2,
  Languages,
  Map,
  ShieldCheck,
  Trophy,
  Swords,
  UserRound,
  UsersRound,
  Wrench,
  Plus,
  Copy,
} from "lucide-react";

import type { EditorRoute } from "../../app/routes";

interface NavItem {
  id: EditorRoute;
  label: string;
  icon: typeof Globe2;
}

const worldItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: CircleDot },
  { id: "geography", label: "Geography", icon: Globe2 },
  { id: "continents", label: "Continents", icon: Globe2 },
  { id: "countries", label: "Countries", icon: Globe2 },
  { id: "regions", label: "Regions", icon: Map },
  { id: "cities", label: "Cities", icon: Map },
  { id: "languages", label: "Languages", icon: Languages },
  { id: "climates", label: "Climates", icon: CloudSun },
  { id: "reference-data", label: "Reference Data", icon: Database },
];

const peopleItems: NavItem[] = [
  { id: "people", label: "People", icon: UserRound },
  { id: "players", label: "Players", icon: UsersRound },
];

const teamItems: NavItem[] = [
  { id: "clubs", label: "Clubs", icon: ShieldCheck },
  { id: "stadiums", label: "Stadiums", icon: Building2 },
];

const competitionItems: NavItem[] = [
  { id: "competitions", label: "Competitions", icon: Trophy },
];

const tacticsItems: NavItem[] = [
  { id: "formations", label: "Formations", icon: Swords },
  { id: "fast-create", label: "Quick Create", icon: Plus },
];

const toolItems: NavItem[] = [
  { id: "templates", label: "Templates", icon: Copy },
  { id: "fast-start", label: "Fast Start", icon: CircleDot },
  { id: "validation", label: "Validation", icon: CheckCircle2 },
  { id: "export", label: "Export", icon: Database },
];

interface EditorSidebarProps {
  activeRoute: EditorRoute;
  onNavigate: (route: EditorRoute) => void;
}

export function EditorSidebar({
  activeRoute,
  onNavigate,
}: EditorSidebarProps) {
  return (
    <aside className="relative w-72 shrink-0 border-r border-white/10 bg-[#0f141b]">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
          <Wrench size={19} />
        </div>

        <div>
          <div className="text-sm font-semibold text-white">Football Game Editor</div>
          <div className="text-xs text-slate-500">World Studio</div>
        </div>
      </div>

      <nav className="space-y-5 px-3 py-5">
        <NavGroup label="WORLD" items={worldItems} activeRoute={activeRoute} onNavigate={onNavigate} />
        <NavGroup label="PEOPLE" items={peopleItems} activeRoute={activeRoute} onNavigate={onNavigate} />
        <NavGroup label="TEAMS" items={teamItems} activeRoute={activeRoute} onNavigate={onNavigate} />
        <NavGroup label="COMPETITIONS" items={competitionItems} activeRoute={activeRoute} onNavigate={onNavigate} />
        <NavGroup label="TACTICS" items={tacticsItems} activeRoute={activeRoute} onNavigate={onNavigate} />
        <NavGroup label="TOOLS" items={toolItems} activeRoute={activeRoute} onNavigate={onNavigate} />
      </nav>

      <div className="absolute bottom-0 w-72 border-t border-white/10 bg-[#0f141b] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400/60 to-cyan-400/20" />
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-slate-200">World Studio</div>
            <div className="truncate text-[11px] text-slate-500">SQLite · schema v2</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

interface NavGroupProps {
  label: string;
  items: NavItem[];
  activeRoute: EditorRoute;
  onNavigate: (route: EditorRoute) => void;
}

function NavGroup({
  label,
  items,
  activeRoute,
  onNavigate,
}: NavGroupProps) {
  return (
    <div>
      <div className="px-3 pb-2 text-[11px] font-semibold tracking-[0.2em] text-slate-600">
        {label}
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeRoute === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
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