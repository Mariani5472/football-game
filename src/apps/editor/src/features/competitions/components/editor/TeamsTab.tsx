import { teams } from "../../../teams/data/teams.data";
import type { CompetitionSeason } from "../../types";
import { Empty } from "./shared";

export function TeamsTab({
  season,
  onChange,
}: {
  season?: CompetitionSeason;
  onChange: (id: number, patch: Partial<CompetitionSeason>) => void;
}) {
  if (!season) return <Empty message="Create a season before assigning teams." />;
  const selected = new Set(season.teams);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-5">
        <div className="text-sm font-medium text-slate-200">Season Participants</div>
        <div className="mt-1 text-xs text-slate-500">{season.teams.length} teams selected</div>
      </div>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <label key={team.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={selected.has(team.id)}
              onChange={(event) => {
                const next = event.target.checked ? [...season.teams, team.id] : season.teams.filter((id) => id !== team.id);
                onChange(season.id, { teams: next });
              }}
            />
            {team.name}
          </label>
        ))}
      </div>
    </section>
  );
}