import { LEAGUE_TEAM_COUNT } from "../../../rules/league";
import type { StageParticipantSource } from "../../../types";
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

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="text-sm font-medium text-slate-200">Participant source</div>
        <div className="mt-1 text-xs text-slate-500">Direct selection is kept for leagues. Other stages can be populated from a previous competition/stage ranking.</div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <SelectField
            label="Source Type"
            value={stage.participantSources[0]?.sourceType ?? "DIRECT"}
            options={["DIRECT", "STANDING", "QUALIFICATION", "PROMOTION", "RELEGATION"]}
            onChange={(value) => {
              const source: StageParticipantSource = {
                sourceType: value,
                sourceCompetitionId: stage.participantSources[0]?.sourceCompetitionId,
                sourceStageId: stage.participantSources[0]?.sourceStageId,
                positionFrom: stage.participantSources[0]?.positionFrom,
                positionTo: stage.participantSources[0]?.positionTo,
              };
              onChange(stage.id, { participantSources: value === "DIRECT" ? [] : [source] });
            }}
          />
          <NumberInput label="Source Competition" value={stage.participantSources[0]?.sourceCompetitionId} onChange={(value) => {
            const current = stage.participantSources[0];
            if (!current) return;
            onChange(stage.id, { participantSources: [{ ...current, sourceCompetitionId: value ?? undefined }] });
          }} />
          <NumberInput label="Source Stage" value={stage.participantSources[0]?.sourceStageId} onChange={(value) => {
            const current = stage.participantSources[0];
            if (!current) return;
            onChange(stage.id, { participantSources: [{ ...current, sourceStageId: value ?? undefined }] });
          }} />
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="From" value={stage.participantSources[0]?.positionFrom} onChange={(value) => {
              const current = stage.participantSources[0];
              if (!current) return;
              onChange(stage.id, { participantSources: [{ ...current, positionFrom: value ?? undefined }] });
            }} />
            <NumberInput label="To" value={stage.participantSources[0]?.positionTo} onChange={(value) => {
              const current = stage.participantSources[0];
              if (!current) return;
              onChange(stage.id, { participantSources: [{ ...current, positionTo: value ?? undefined }] });
            }} />
          </div>
        </div>
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