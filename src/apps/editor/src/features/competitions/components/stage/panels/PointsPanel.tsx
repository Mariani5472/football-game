import type { CompetitionStage } from "../../../types";
import { NumberInput } from "../../editor/shared";

export function PointsPanel({ stage, onChange }: {
  stage: CompetitionStage;
  onChange: (id: number, patch: Partial<CompetitionStage["pointsRule"]>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <NumberInput label="Win" value={stage.pointsRule.winPoints} onChange={(value) => onChange(stage.id, { winPoints: value ?? 3 })} />
        <NumberInput label="Draw" value={stage.pointsRule.drawPoints} onChange={(value) => onChange(stage.id, { drawPoints: value ?? 1 })} />
        <NumberInput label="Loss" value={stage.pointsRule.lossPoints} onChange={(value) => onChange(stage.id, { lossPoints: value ?? 0 })} />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
        {stage.pointsRule.winPoints} points for a win, {stage.pointsRule.drawPoints} for a draw and {stage.pointsRule.lossPoints} for a loss.
      </div>
    </div>
  );
}