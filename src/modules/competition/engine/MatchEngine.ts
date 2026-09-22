export interface MatchRequest {
  homeTeamId: number;
  awayTeamId: number;
}

export interface MatchResult {
  homeTeamId: number;
  awayTeamId: number;

  homeGoals: number;
  awayGoals: number;
}

export class MatchEngine {
  simulate(request: MatchRequest): MatchResult {
    return {
      homeTeamId: request.homeTeamId,
      awayTeamId: request.awayTeamId,

      homeGoals: this.generateGoals(),
      awayGoals: this.generateGoals(),
    };
  }

  private generateGoals(): number {
    return Math.floor(Math.random() * 5);
  }
}