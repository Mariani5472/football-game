import { useState } from "react";
import { editorApi } from "../../../../shared/api/editorApi";
import type { CompetitionSeason, CompetitionStage } from "../../types";
import { Empty } from "../editor/shared";
import { StageCard } from "./StageCard";

interface StagesTabProps {
  season?: CompetitionSeason;
  onChange: (id: number, patch: Partial<CompetitionStage>) => void;
  onParticipantRuleChange: (id: number, patch: Partial<CompetitionStage["participantRule"]>) => void;
  onFormatChange: (id: number, patch: Partial<CompetitionStage["formatRule"]>) => void;
  onPointsChange: (id: number, patch: Partial<CompetitionStage["pointsRule"]>) => void;
  onStandingChange: (id: number, standingRules: CompetitionStage["standingRules"]) => void;
  onScheduleChange: (id: number, patch: Partial<CompetitionStage>) => void;
}

export function StagesTab({
  season,
  onChange,
  onParticipantRuleChange,
  onFormatChange,
  onPointsChange,
  onStandingChange,
  onScheduleChange,
}: StagesTabProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!season) return <Empty message="Create a season before configuring stages." />;
  const activeSeason = season;

  async function saveStage(stage: CompetitionStage) {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const source = stage.participantSources[0];
      const saved = await editorApi.domain.createCompetitionStage({
        seasonId: activeSeason.id,
        name: stage.name,
        stageOrder: stage.stageOrder,
        participantRule: {
          type: stage.participantRule.participantType,
          minimum: stage.participantRule.minParticipants,
          maximum: stage.participantRule.maxParticipants,
          sourceType: source?.sourceType,
          sourceCompetitionId: source?.sourceCompetitionId,
          sourceSeasonId: undefined,
          sourceStageId: source?.sourceStageId,
          positionFrom: source?.positionFrom,
          positionTo: source?.positionTo,
        },
        format: {
          type: stage.formatRule.formatType,
          participantCount: stage.formatRule.participantCount,
          groupCount: stage.formatRule.groupCount,
          participantsPerGroup: stage.formatRule.participantsPerGroup,
          legs: stage.formatRule.legs,
          homeAway: stage.formatRule.homeAway === 1,
          aggregateScore: stage.formatRule.aggregateScore === 1,
          extraTime: stage.formatRule.extraTime === 1,
          penalties: stage.formatRule.penalties === 1,
          awayGoalsRule: stage.formatRule.awayGoalsRule === 1,
        },
        points: stage.formatRule.formatType === "KNOCKOUT"
          ? undefined
          : {
              win: stage.pointsRule.winPoints,
              draw: stage.pointsRule.drawPoints,
              loss: stage.pointsRule.lossPoints,
            },
        schedule: {
          type: stage.schedule.schedulingType,
          startDate: stage.schedule.startDate,
          endDate: stage.schedule.endDate,
          intervalDays: stage.schedule.intervalDays,
          homeAwayBalanced: stage.schedule.homeAwayBalanced,
        },
        standingRules: stage.standingRules.map(rule => rule.ruleType),
        matchRules: stage.matchRules.map(rule => ({
          type: rule.ruleType,
          value: rule.ruleValue,
        })),
        qualificationRules: stage.qualification.map(rule => ({
          positionFrom: rule.positionFrom,
          positionTo: rule.positionTo,
          type: rule.type,
          destinationCompetitionId: rule.destinationCompetitionId,
          destinationStageId: rule.destinationStageId,
        })),
      });

      setMessage(`Saved stage “${saved.name}” as record #${saved.id}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Stages are saved as executable rules: participant source, format, points,
        tie-breakers, schedule and qualification transitions.
      </p>

      {season.stages.map(stage => (
        <div key={stage.id} className="space-y-3">
          <StageCard
            stage={stage}
            seasonTeams={season.teams}
            onChange={onChange}
            onParticipantRuleChange={onParticipantRuleChange}
            onFormatChange={onFormatChange}
            onPointsChange={onPointsChange}
            onStandingChange={onStandingChange}
            onScheduleChange={onScheduleChange}
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveStage(stage)}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save stage and rules"}
            </button>
          </div>
        </div>
      ))}

      {message && <p role="status" className="rounded-lg border border-emerald-400/20 p-3 text-sm text-emerald-300">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-400/20 p-3 text-sm text-red-300">{error}</p>}
    </div>
  );
}