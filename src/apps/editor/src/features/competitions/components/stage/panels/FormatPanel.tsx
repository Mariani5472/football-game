import { LEAGUE_MATCHES_PER_ROUND, LEAGUE_TEAM_COUNT, LEAGUE_TOTAL_MATCHES, LEAGUE_TOTAL_ROUNDS } from "../../../rules/league";
import type { CompetitionStage } from "../../../types";
import { NumberInput, Stat, Toggle } from "../../editor/shared";

export function FormatPanel({ stage, onChange }: {
  stage: CompetitionStage;
  onChange: (id: number, patch: Partial<CompetitionStage["formatRule"]>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Format" value="League" />
        <NumberInput label="Participants" value={stage.formatRule.participantCount} onChange={(value) => onChange(stage.id, { participantCount: value ?? LEAGUE_TEAM_COUNT })} />
        <NumberInput label="Legs" value={stage.formatRule.legs} onChange={(value) => onChange(stage.id, { legs: value ?? 2 })} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Toggle label="Home / Away" value={stage.formatRule.homeAway === 1} onChange={(value) => onChange(stage.id, { homeAway: value ? 1 : 0 })} />
        <Toggle label="Aggregate Score" value={stage.formatRule.aggregateScore === 1} onChange={(value) => onChange(stage.id, { aggregateScore: value ? 1 : 0 })} />
        <Toggle label="Extra Time" value={stage.formatRule.extraTime === 1} onChange={(value) => onChange(stage.id, { extraTime: value ? 1 : 0 })} />
        <Toggle label="Penalties" value={stage.formatRule.penalties === 1} onChange={(value) => onChange(stage.id, { penalties: value ? 1 : 0 })} />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-slate-500">
        A 20-team double round robin produces {LEAGUE_TOTAL_ROUNDS} rounds, {LEAGUE_MATCHES_PER_ROUND} matches per round and {LEAGUE_TOTAL_MATCHES} matches in total.
      </div>
    </div>
  );
}