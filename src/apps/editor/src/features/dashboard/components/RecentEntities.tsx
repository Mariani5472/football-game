import {
  ArrowUpRight,
  Globe2,
  Shield,
  Trophy,
} from "lucide-react";

import type { RecentEntity } from "../types";

const icons = {
  Club: Shield,
  Competition: Trophy,
  Country: Globe2,
} as const;

export function RecentEntities({
  entities,
}: {
  entities: RecentEntity[];
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-sm font-medium text-white">
            Recently edited
          </div>

          <div className="mt-1 text-xs text-slate-600">
            Recent changes in the current world
          </div>
        </div>

        <ArrowUpRight
          size={16}
          className="text-slate-600"
        />
      </div>

      <div className="divide-y divide-white/5">
        {entities.map((entity) => {
          const Icon =
            icons[entity.type as keyof typeof icons] ??
            Shield;

          return (
            <button
              key={entity.id}
              type="button"
              className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-white/[0.025]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.035] text-slate-500">
                  <Icon size={15} />
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-200">
                    {entity.name}
                  </div>

                  <div className="mt-0.5 text-xs text-slate-600">
                    {entity.type}
                  </div>
                </div>
              </div>

              <ArrowUpRight
                size={14}
                className="text-slate-700"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}