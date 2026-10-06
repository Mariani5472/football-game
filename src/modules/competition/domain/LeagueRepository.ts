export interface LeagueSetup {
  name: string;
  nationId?: number;
  competitionTypeId?: number;
  shortName?: string;
  year: number;
  teamIds: number[];
  startDate: string;
  endDate?: string;
  intervalDays: number;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
}

export interface LeagueTeam {
  teamId: number;
  name: string;
  reputation: number;
}

export interface LeagueRepository {
  transaction<T>(work: () => T): T;
  findTeams(teamIds: number[]): LeagueTeam[];
  validateReferences(setup: LeagueSetup): void;
  createLeague(setup: LeagueSetup, rounds: Array<{ roundNumber: number; date: string; fixtures: Array<{ homeTeamId: number; awayTeamId: number; scheduledAt: string }> }>): { competitionId: number; seasonId: number; stageId: number; fixtureCount: number };
}
