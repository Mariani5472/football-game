import { ArrowDown, ArrowUp } from "lucide-react";
import type { CompetitionStage, StandingRuleType } from "../../../types";
import { Empty } from "../../editor/shared";

const labels: Record<StandingRuleType, string> = {
  POINTS: "Points",
  GOAL_DIFFERENCE: "Goal Difference",
  GOALS_FOR: "Goals For",
  WINS: "Wins",
};

export function StandingPanel({ stage, onChange }: {
  stage: CompetitionStage;
  onChange: (id: number, standingRules: CompetitionStage["standingRules"]) => void;
}) {
  const rules = [...stage.standingRules].sort((a, b) => a.ruleOrder - b.ruleOrder);
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rules.length) return;
    const next = [...rules];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(stage.id, next);
  };

  return (
    <section className="space-y-3">
      <div>
        <div className="text-sm font-medium text-slate-200">Standing Rules</div>
        <div className="mt-1 text-xs text-slate-500">Rules are evaluated from top to bottom when teams are tied.</div>
      </div>
      {rules.map((rule, index) => (
        <div key={rule.ruleType} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-xs font-semibold text-slate-400">{index + 1}</div>
          <div className="flex-1 text-sm text-slate-200">{labels[rule.ruleType]}</div>
          <div className="flex gap-1">
            <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-lg border border-white/10 p-2 text-slate-500 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Move rule up"><ArrowUp size={14} /></button>
            <button type="button" disabled={index === rules.length - 1} onClick={() => move(index, 1)} className="rounded-lg border border-white/10 p-2 text-slate-500 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Move rule down"><ArrowDown size={14} /></button>
          </div>
        </div>
      ))}
      {rules.length === 0 && <Empty message="No standing rules configured." />}
    </section>
  );
}