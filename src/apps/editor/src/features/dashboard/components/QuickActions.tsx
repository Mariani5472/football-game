import {
  CheckCircle2,
  FilePlus2,
  FolderOpen,
  Rocket,
  Send,
} from "lucide-react";

const actions = [
  {
    id: "new-world",
    label: "New World",
    icon: FilePlus2,
  },
  {
    id: "open-world",
    label: "Open World",
    icon: FolderOpen,
  },
  {
    id: "fast-start",
    label: "Fast Start",
    icon: Rocket,
  },
  {
    id: "validate",
    label: "Validate",
    icon: CheckCircle2,
  },
  {
    id: "export",
    label: "Export",
    icon: Send,
  },
] as const;

export function QuickActions() {
  return (
    <section>
      <div className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-slate-600">
        QUICK ACTIONS
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.id}
              type="button"
              className="flex min-h-24 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-emerald-400/20 hover:bg-white/[0.04]"
            >
              <Icon
                size={18}
                className="text-slate-500"
              />

              <span className="text-sm font-medium text-slate-200">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}