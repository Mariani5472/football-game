import { CheckCircle2 } from "lucide-react";

import type { WorldSummary } from "../types";

export function DashboardHeader({
  world,
}: {
  world: WorldSummary;
}) {
  return (
    <div className="flex items-end justify-between gap-8">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
          DASHBOARD
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white">
          World: {world.name} {world.year}
        </h1>

        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-2.5 py-1 text-xs font-medium text-emerald-300">
            <CheckCircle2 size={13} />
            {world.status}
          </span>
        </div>
      </div>

      <span className="text-xs text-slate-500">
        Schema v2
      </span>
    </div>
  );
}