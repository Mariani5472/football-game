import type { CompetitionStage } from "../types";

export type SchedulingType = "ROUND_ROBIN";

export interface ScheduleProfile {
  schedulingType: SchedulingType;
  startDate: string;
  endDate: string;
  intervalDays: number;
  homeAwayBalanced: boolean;
}

export interface ScheduledFixture {
  roundNumber: number;
  homeTeamId: number;
  awayTeamId: number;
  scheduledDate: string;
  legNumber: 1 | 2;
}

export interface ScheduledRound {
  roundNumber: number;
  date: string;
  fixtures: ScheduledFixture[];
}

export interface RoundRobinSchedule {
  rounds: ScheduledRound[];
  totalRounds: number;
  totalFixtures: number;
}

export interface ScheduleGenerationResult {
  valid: boolean;
  errors: string[];
  schedule?: RoundRobinSchedule;
}

export function getScheduleProfile(stage: CompetitionStage): ScheduleProfile {
  return {
    schedulingType: "ROUND_ROBIN",
    startDate: stage.schedule.startDate,
    endDate: stage.schedule.endDate,
    intervalDays: stage.schedule.intervalDays,
    homeAwayBalanced: stage.schedule.homeAwayBalanced,
  };
}
