import type { CompetitionParticipant } from "../domain/CompetitionParticipant.js";
import type { MatchResult, SimulationResult, Standing } from "../domain/Standing.js";

export type StandingRule =
  | "POINTS"
  | "GOAL_DIFFERENCE"
  | "GOALS_FOR"
  | "GOALS_AGAINST"
  | "WINS"
  | "DRAWS"
  | "LOSSES"
  | "TEAM_ID";

export class StandingEngine {
  initialize(participants: CompetitionParticipant[]): Map<number, Standing> {
    return new Map(
      participants.map(participant => [
        participant.teamId,
        {
          teamId: participant.teamId,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
        },
      ]),
    );
  }

  applyResult(
    standings: Map<number, Standing>,
    result: MatchResult,
    pointsRule: { winPoints: number; drawPoints: number; lossPoints: number },
  ): void {
    const home = standings.get(result.homeTeamId);
    const away = standings.get(result.awayTeamId);
    if (!home || !away) throw new Error("Resultado contém um time que não participa da competição.");

    home.played += 1;
    away.played += 1;
    home.goalsFor += result.homeGoals;
    home.goalsAgainst += result.awayGoals;
    away.goalsFor += result.awayGoals;
    away.goalsAgainst += result.homeGoals;

    if (result.homeGoals > result.awayGoals) {
      home.wins += 1;
      away.losses += 1;
      home.points += pointsRule.winPoints;
      away.points += pointsRule.lossPoints;
      return;
    }

    if (result.homeGoals < result.awayGoals) {
      away.wins += 1;
      home.losses += 1;
      away.points += pointsRule.winPoints;
      home.points += pointsRule.lossPoints;
      return;
    }

    home.draws += 1;
    away.draws += 1;
    home.points += pointsRule.drawPoints;
    away.points += pointsRule.drawPoints;
  }

  sort(
    standings: Map<number, Standing>,
    rules: readonly string[] = ["POINTS", "GOAL_DIFFERENCE", "GOALS_FOR", "WINS", "TEAM_ID"],
  ): Standing[] {
    return [...standings.values()].sort((a, b) => {
      for (const rule of rules) {
        const comparison = this.compareRule(a, b, rule);
        if (comparison !== 0) return comparison;
      }
      return a.teamId - b.teamId;
    });
  }

  private compareRule(left: Standing, right: Standing, rule: string): number {
    switch (rule as StandingRule) {
      case "POINTS":
        return right.points - left.points;
      case "GOAL_DIFFERENCE":
        return (right.goalsFor - right.goalsAgainst) - (left.goalsFor - left.goalsAgainst);
      case "GOALS_FOR":
        return right.goalsFor - left.goalsFor;
      case "GOALS_AGAINST":
        return left.goalsAgainst - right.goalsAgainst;
      case "WINS":
        return right.wins - left.wins;
      case "DRAWS":
        return right.draws - left.draws;
      case "LOSSES":
        return left.losses - right.losses;
      case "TEAM_ID":
        return left.teamId - right.teamId;
      default:
        return 0;
    }
  }
}