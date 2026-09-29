import type { CompetitionSeason } from "../../types";

export function HistoryTab({ seasons }: { seasons: CompetitionSeason[] }) {
  return (
    <div className="space-y-3">
      {seasons.map((season) => (
        <div key={season.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">{season.year}</span>
            <span className="text-xs text-slate-500">{season.status}</span>
          </div>
          <div className="mt-2 text-xs text-slate-600">{season.startDate} → {season.endDate}</div>
        </div>
      ))}
    </div>
  );
}