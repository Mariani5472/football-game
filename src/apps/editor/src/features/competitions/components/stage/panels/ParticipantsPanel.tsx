import { LEAGUE_TEAM_COUNT } from "../../../rules/league";
import type { CompetitionStage } from "../../../types";
import { NumberInput, SelectField, Stat } from "../../editor/shared";

export function ParticipantsPanel({
  stage,
  seasonTeams,
  onChange,
  onParticipantRuleChange,
}: {
  stage: CompetitionStage;
  seasonTeams: number[];
  onChange: (id: number, patch: Partial<CompetitionStage>) => void;
  onParticipantRuleChange: (
    id: number,
    patch: Partial<CompetitionStage["participantRule"]>,
  ) => void;
}) {
  const selected = new Set(stage.participants);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Required Teams" value={String(stage.participantRule.maxParticipants)} />
        <Stat label="Selected" value={String(stage.participants.length)} />
        <Stat label="Status" value={stage.participants.length === stage.participantRule.maxParticipants ? "Complete" : "Incomplete"} />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <SelectField label="Participant Type" value={stage.participantRule.participantType} options={["TEAM"]} onChange={() => onParticipantRuleChange(stage.id, { participantType: "TEAM" })} />
        <NumberInput label="Minimum" value={stage.participantRule.minParticipants} onChange={(value) => onParticipantRuleChange(stage.id, { minParticipants: value ?? LEAGUE_TEAM_COUNT })} />
        <NumberInput label="Maximum" value={stage.participantRule.maxParticipants} onChange={(value) => onParticipantRuleChange(stage.id, { maxParticipants: value ?? LEAGUE_TEAM_COUNT })} />
      </div>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        {seasonTeams.map((teamId) => (
          <label key={teamId} className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">
            <input type="checkbox" checked={selected.has(teamId)} onChange={(event) => {
              const participants = event.target.checked ? [...stage.participants, teamId] : stage.participants.filter((id) => id !== teamId);
              onChange(stage.id, { participants });
            }} />
            Team #{teamId}
          </label>
        ))}
      </div>
    </div>
  );
}