import type { CompetitionSeason, CompetitionStage } from "../../types";
import { Empty } from "../editor/shared";
import { StageCard } from "./StageCard";

interface StagesTabProps {
  season?: CompetitionSeason;
  onChange: (id: number, patch: Partial<CompetitionStage>) => void;
  onParticipantRuleChange: (
    id: number,
    patch: Partial<CompetitionStage["participantRule"]>,
  ) => void;
  onFormatChange: (
    id: number,
    patch: Partial<CompetitionStage["formatRule"]>,
  ) => void;
  onPointsChange: (
    id: number,
    patch: Partial<CompetitionStage["pointsRule"]>,
  ) => void;
  onStandingChange: (
    id: number,
    standingRules: CompetitionStage["standingRules"],
  ) => void;
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
  if (!season) return <Empty message="Create a season before configuring stages." />;

  return (
    <div className="space-y-4">
      {season.stages.map((stage) => (
        <StageCard
          key={stage.id}
          stage={stage}
          seasonTeams={season.teams}
          onChange={onChange}
          onParticipantRuleChange={onParticipantRuleChange}
          onFormatChange={onFormatChange}
          onPointsChange={onPointsChange}
          onStandingChange={onStandingChange}
          onScheduleChange={onScheduleChange}
        />
      ))}
    </div>
  );
}