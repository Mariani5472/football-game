import type {
  CompetitionParticipant,
} from "../domain/CompetitionParticipant.js";
import type {
  MatchResult,
  SimulationResult,
  Standing,
} from "../domain/Standing.js";

export class StandingEngine {
  initialize(
    participants: CompetitionParticipant[],
  ): Map<number, Standing> {
    return new Map(
      participants.map(
        (participant) => [
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
        ],
      ),
    );
  }

  applyResult(
    standings: Map<number, Standing>,
    result: MatchResult,
    pointsRule: {
      winPoints: number;
      drawPoints: number;
      lossPoints: number;
    },
  ): void {
    const home = standings.get(result.homeTeamId);
    const away = standings.get(result.awayTeamId);

    if (!home || !away) {
      throw new Error(
        "Resultado contém um time que não participa da competição.",
      );
    }

    home.played++;
    away.played++;

    home.goalsFor += result.homeGoals;
    home.goalsAgainst += result.awayGoals;

    away.goalsFor += result.awayGoals;
    away.goalsAgainst += result.homeGoals;

    if (result.homeGoals > result.awayGoals) {
      home.wins++;
      away.losses++;

      home.points += pointsRule.winPoints;
      away.points += pointsRule.lossPoints;
      return;
    }

    if (result.homeGoals < result.awayGoals) {
      away.wins++;
      home.losses++;

      away.points += pointsRule.winPoints;
      home.points += pointsRule.lossPoints;
      return;
    }

    home.draws++;
    away.draws++;

    home.points += pointsRule.drawPoints;
    away.points += pointsRule.drawPoints;
  }

  sort(
    standings: Map<number, Standing>,
  ): Standing[] {
    return [...standings.values()].sort(
      (a, b) =>
        b.points - a.points ||
        (b.goalsFor - b.goalsAgainst) -
          (a.goalsFor - a.goalsAgainst) ||
        b.goalsFor - a.goalsFor ||
        b.wins - a.wins ||
        a.teamId - b.teamId,
    );
  }
}
