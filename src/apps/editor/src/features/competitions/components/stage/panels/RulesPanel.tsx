import { CheckCircle2, CircleAlert } from "lucide-react";
import type { CompetitionStage } from "../../../types";
import { LEAGUE_TOTAL_MATCHES, LEAGUE_TOTAL_ROUNDS } from "../../../rules/league";
import type { LeagueValidationResult } from "../../../rules/league";
import { Stat } from "../../editor/shared";

export function RulesPanel({
  stage,
  validation,
}: {
  stage: CompetitionStage;
  validation: LeagueValidationResult;
}) {
  return (
    <div className="space-y-5">
      <div className={[
        "flex items-start gap-3 rounded-xl border p-4",
        validation.valid ? "border-emerald-400/20 bg-emerald-400/[0.04]" : "border-amber-400/20 bg-amber-400/[0.04]",
      ].join(" ")}>
        {validation.valid ? <CheckCircle2 size={18} className="mt-0.5 text-emerald-300" /> : <CircleAlert size={18} className="mt-0.5 text-amber-300" />}
        <div>
          <div className="text-sm font-medium text-slate-200">{validation.valid ? "League configuration is valid" : "League configuration needs attention"}</div>
          {!validation.valid && <ul className="mt-2 space-y-1 text-xs text-slate-500">{validation.errors.map((error) => <li key={error}>{error}</li>)}</ul>}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Teams" value={String(stage.participants.length)} />
        <Stat label="Rounds" value={String(LEAGUE_TOTAL_ROUNDS)} />
        <Stat label="Matches" value={String(LEAGUE_TOTAL_MATCHES)} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Legs" value={String(stage.formatRule.legs)} />
        <Stat label="Home / Away" value={stage.formatRule.homeAway === 1 ? "Yes" : "No"} />
        <Stat label="Points" value={[stage.pointsRule.winPoints, stage.pointsRule.drawPoints, stage.pointsRule.lossPoints].join(" / ")} />
      </div>
    </div>
  );
}