import { CheckCircle2, CircleAlert } from "lucide-react";
import type { CompetitionStage } from "../../../types";
import { Stat } from "../../editor/shared";
import type { StageValidationResult } from "../../../rules/stage";

export function RulesPanel({ stage, validation }: { stage: CompetitionStage; validation: StageValidationResult }) {
  return (
    <div className="space-y-5">
      <div className={[
        "flex items-start gap-3 rounded-xl border p-4",
        validation.valid ? "border-emerald-400/20 bg-emerald-400/[0.04]" : "border-amber-400/20 bg-amber-400/[0.04]",
      ].join(" ")}>
        {validation.valid ? <CheckCircle2 size={18} className="mt-0.5 text-emerald-300" /> : <CircleAlert size={18} className="mt-0.5 text-amber-300" />}
        <div>
          <div className="text-sm font-medium text-slate-200">{validation.valid ? "Stage configuration is valid" : "Stage configuration needs attention"}</div>
          {validation.errors.length > 0 && <ul className="mt-2 space-y-1 text-xs text-red-300">{validation.errors.map(error => <li key={error}>{error}</li>)}</ul>}
          {validation.warnings.length > 0 && <ul className="mt-2 space-y-1 text-xs text-amber-300">{validation.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Teams" value={String(stage.participants.length)} />
        <Stat label="Format" value={stage.formatRule.formatType} />
        <Stat label="Legs" value={String(stage.formatRule.legs)} />
        <Stat label="Home / Away" value={stage.formatRule.homeAway === 1 ? "Yes" : "No"} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Win / Draw / Loss" value={[stage.pointsRule.winPoints, stage.pointsRule.drawPoints, stage.pointsRule.lossPoints].join(" / ")} />
        <Stat label="Standing rules" value={String(stage.standingRules.length)} />
        <Stat label="Transitions" value={String(stage.qualification.length)} />
      </div>
    </div>
  );
}