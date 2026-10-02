export interface Standing {
  teamId: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface MatchResult {
  homeTeamId: number;
  awayTeamId: number;
  homeGoals: number;
  awayGoals: number;
}

export interface SimulationResult {
  fixturesPlayed: number;
  standings: Standing[];
}
