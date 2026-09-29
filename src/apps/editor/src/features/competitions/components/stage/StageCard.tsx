import { useState } from "react";
import { Tabs } from "../../../../shared/components";
import { validateSimpleLeague } from "../../rules/league";
import type { CompetitionStage } from "../../types";
import { FormatPanel } from "./panels/FormatPanel";
import { PointsPanel } from "./panels/PointsPanel";
import { ParticipantsPanel } from "./panels/ParticipantsPanel";
import { RulesPanel } from "./panels/RulesPanel";
import { StandingPanel } from "./panels/StandingPanel";
import { SchedulePanel } from "./panels/SchedulePanel";
import { DrawPanel } from "./panels/DrawPanel";
import { Field, NumberInput } from "../editor/shared";

type StageTab = "participants" | "format" | "points" | "standing" | "schedule" | "draw" | "rules";

interface StageCardProps {
  stage: CompetitionStage;
  seasonTeams: number[];
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

export function StageCard({
  stage,
  seasonTeams,
  onChange,
  onParticipantRuleChange,
  onFormatChange,
  onPointsChange,
  onStandingChange,
  onScheduleChange,
}: StageCardProps) {
  const [tab, setTab] = useState<StageTab>("participants");
  const validation = validateSimpleLeague(stage);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-5 grid gap-4 md:grid-cols-[1fr_180px_120px]">
        <Field label="Stage Name" value={stage.name} onChange={(value) => onChange(stage.id, { name: value })} />
        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-400">Format</span>
          <div className="flex h-[42px] items-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-3 text-sm text-emerald-200">League</div>
        </div>
        <NumberInput label="Order" value={stage.stageOrder} onChange={(value) => onChange(stage.id, { stageOrder: value ?? stage.stageOrder })} />
      </div>

      <Tabs
        activeTab={tab}
        onChange={setTab}
        items={[
          {
            id: "participants",
            label: "Participants",
            content: <ParticipantsPanel stage={stage} seasonTeams={seasonTeams} onChange={onChange} onParticipantRuleChange={onParticipantRuleChange} />,
          },
          { id: "format", label: "Format", content: <FormatPanel stage={stage} onChange={onFormatChange} /> },
          { id: "points", label: "Points", content: <PointsPanel stage={stage} onChange={onPointsChange} /> },
          { id: "standing", label: "Standing Rules", content: <StandingPanel stage={stage} onChange={onStandingChange} /> },
          { id: "schedule", label: "Schedule", content: <SchedulePanel stage={stage} onChange={onScheduleChange} /> },
          { id: "draw", label: "Draw", content: <DrawPanel stage={stage} /> },
          { id: "rules", label: "Rules", content: <RulesPanel stage={stage} validation={validation} /> },
        ]}
      />
    </div>
  );
}