import {
  Building2,
  Globe2,
  Map,
  Shield,
  Trophy,
  Users,
} from "lucide-react";

import type { WorldEntityCounts } from "../types";
import { MetricCard } from "./MetricCard";

export function WorldMetrics({
  counts,
}: {
  counts: WorldEntityCounts;
}) {
  const metrics = [
    {
      label: "Countries",
      value: counts.countries,
      icon: Globe2,
    },
    {
      label: "Cities",
      value: counts.cities,
      icon: Map,
    },
    {
      label: "Clubs",
      value: counts.clubs,
      icon: Shield,
    },
    {
      label: "Players",
      value: counts.players,
      icon: Users,
    },
    {
      label: "Stadiums",
      value: counts.stadiums,
      icon: Building2,
    },
    {
      label: "Competitions",
      value: counts.competitions,
      icon: Trophy,
    },
  ];

  return (
    <section>
      <SectionLabel label="WORLD" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
          />
        ))}
      </div>
    </section>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-slate-600">
      {label}
    </div>
  );
}
