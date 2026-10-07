import type { FastStartGenerationSummary } from "../../../../world/services/FastStartService";

export function FastStartSummary({ summary }: { summary: FastStartGenerationSummary }) {
  const counts = [
    ["Nations", summary.counts.nations],
    ["Cities", summary.counts.cities],
    ["Teams", summary.counts.teams],
    ["Clubs", summary.counts.clubs],
    ["People", summary.counts.people],
    ["Players", summary.counts.players],
    ["Stadiums", summary.counts.stadiums],
    ["Competitions", summary.counts.competitions],
    ["Seasons", summary.counts.seasons],
    ["Stages", summary.counts.stages],
    ["Rounds", summary.counts.rounds],
    ["Fixtures", summary.counts.fixtures],
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {counts.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</div>
          <div className="mt-1 text-lg font-semibold text-white">{value}</div>
        </div>
      ))}
    </div>
  );
}
