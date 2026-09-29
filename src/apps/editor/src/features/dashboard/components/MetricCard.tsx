import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-slate-400">
        <Icon size={17} />
      </div>

      <div className="text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>

      <div className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-600">
        {label}
      </div>
    </div>
  );
}
