export type FixtureStatus = "SCHEDULED" | "PLAYED";

export interface Fixture {
  roundNumber: number;
  homeTeamId: number;
  awayTeamId: number;
  scheduledAt: string;
  status: FixtureStatus;
  homeScore?: number;
  awayScore?: number;
}
