export type StandingRuleType =
  | "POINTS"
  | "GOAL_DIFFERENCE"
  | "GOALS_FOR"
  | "WINS"
  | "HEAD_TO_HEAD"
  | "FAIR_PLAY"
  | "COEFFICIENT";

export interface StandingRule {
  id: number;
  stageId: number;
  ruleOrder: number;
  ruleType: StandingRuleType;
}