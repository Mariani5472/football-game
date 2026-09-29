export type DashboardStatus = "VALID" | "INVALID";

export interface WorldSummary {
  name: string;
  year: number;
  status: DashboardStatus;
  warnings: number;
  errors: number;
}

export interface WorldEntityCounts {
  countries: number;
  cities: number;
  clubs: number;
  players: number;
  stadiums: number;
  competitions: number;
}

export interface RecentEntity {
  id: string;
  name: string;
  type: string;
}

export interface DashboardData {
  world: WorldSummary;
  counts: WorldEntityCounts;
  recentEntities: RecentEntity[];
}
