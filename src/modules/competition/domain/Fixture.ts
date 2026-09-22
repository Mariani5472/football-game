export type FixtureStatus =
  | "SCHEDULED"
  | "PLAYED"
  | "POSTPONED"
  | "CANCELLED";

export interface Fixture {
  id?: number;

  roundId: number;

  homeTeamId: number;
  awayTeamId: number;

  scheduledAt: string;

  status: FixtureStatus;

  homeScore?: number | null;
  awayScore?: number | null;
}