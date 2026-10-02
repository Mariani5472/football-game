import { Building2, Globe2, Shield, Trophy, UserRound, UsersRound } from "lucide-react";
import type { QuickCreatePreset } from "../../quick-create";

const actions: Array<{ preset: QuickCreatePreset; label: string; icon: typeof Globe2 }> = [
  { preset: "nation", label: "Country", icon: Globe2 },
  { preset: "city", label: "City", icon: Building2 },
  { preset: "club", label: "Club", icon: Shield },
  { preset: "person", label: "Person", icon: UserRound },
  { preset: "player", label: "Player", icon: UsersRound },
  { preset: "competition", label: "Competition", icon: Trophy },
];

export function DashboardQuickCreate({ onCreate }: { onCreate: (preset: QuickCreatePreset) => void }) {
  return (
    <section className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">QUICK CREATE</div>
        <p className="mt-1 text-sm text-slate-600">Create a common World entity directly from here.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button key={action.preset} type="button" onClick={() => onCreate(action.preset)}
              className="group flex min-h-24 flex-col items-start justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-emerald-400/20 hover:bg-white/[0.04]">
              <Icon size={18} className="text-slate-500 transition group-hover:text-emerald-300" />
              <span className="text-sm font-medium text-slate-200">+ {action.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
