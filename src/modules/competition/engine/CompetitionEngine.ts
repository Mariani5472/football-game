import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { GeneratedSeason } from "../domain/GeneratedSeason.js";
import type { SimulationResult } from "../domain/Standing.js";
import { CompetitionRepository } from "../repository/CompetitionRepository.js";
import { MatchEngine } from "./MatchEngine.js";
import { ScheduleEngine } from "./ScheduleEngine.js";
import { StandingEngine } from "./StandingEngine.js";

export interface CompetitionSeasonSetup {
  competitionSeasonId: number;
}

export class CompetitionEngine {
  private readonly repository: CompetitionRepository;
  private readonly scheduleEngine = new ScheduleEngine();
  private readonly matchEngine = new MatchEngine();
  private readonly standingEngine = new StandingEngine();

  constructor(
    database: WorldDatabase,
  ) {
    this.repository =
      new CompetitionRepository(database);
  }

  generateSeason(
    setup: CompetitionSeasonSetup,
  ): GeneratedSeason {
    const season = this.findSeason(
      setup.competitionSeasonId,
    );

    const stage =
      this.repository.findStage(season.id);

    if (!stage) {
      throw new Error(
        `Stage não encontrada para season=${season.id}`,
      );
    }

    const participants =
      this.repository.findParticipants(season.id);

    if (
      !stage.format ||
      stage.format.formatType !== "LEAGUE"
    ) {
      throw new Error(
        "CompetitionEngine MVP suporta apenas stages LEAGUE.",
      );
    }

    if (
      stage.format.legs !== 2 ||
      !stage.format.homeAway
    ) {
      throw new Error(
        "League precisa ser double round-robin com mando de campo.",
      );
    }

    if (
      stage.format.participantCount !== null &&
      stage.format.participantCount !==
        participants.length
    ) {
      throw new Error(
        `Stage espera ${stage.format.participantCount} participantes, mas encontrou ${participants.length}.`,
      );
    }

    if (
      !stage.schedule ||
      stage.schedule.schedulingType !==
        "ROUND_ROBIN"
    ) {
      throw new Error(
        "CompetitionEngine MVP suporta apenas ROUND_ROBIN.",
      );
    }

    if (
      !stage.schedule.startDate ||
      stage.schedule.intervalDays < 1
    ) {
      throw new Error(
        "Schedule inválido para geração da temporada.",
      );
    }

    if (!stage.points) {
      throw new Error(
        "Stage não possui regra de pontuação.",
      );
    }

    const rounds =
      this.scheduleEngine.generateDoubleRoundRobin(
        participants,
        stage.schedule.startDate,
        stage.schedule.intervalDays,
      );

    return {
      competition: this.findCompetition(
        season.competitionId,
      ),
      season,
      stage,
      participants,
      rounds: rounds.length,
      fixtures: rounds.flatMap(
        (round) => round.fixtures,
      ),
    };
  }

  simulateSeason(
    generatedSeason: GeneratedSeason,
    seed = 2026,
  ): SimulationResult {
    if (!generatedSeason.stage.points) {
      throw new Error(
        "Stage não possui regra de pontuação.",
      );
    }

    const standings =
      this.standingEngine.initialize(
        generatedSeason.participants,
      );

    const strengths = new Map(
      generatedSeason.participants.map(
        (participant) => [
          participant.teamId,
          {
            teamId: participant.teamId,
            reputation: participant.reputation,
          },
        ],
      ),
    );

    let fixturesPlayed = 0;

    for (const fixture of generatedSeason.fixtures) {
      const home = strengths.get(
        fixture.homeTeamId,
      );
      const away = strengths.get(
        fixture.awayTeamId,
      );

      if (!home || !away) {
        throw new Error(
          "Fixture contém time fora dos participantes.",
        );
      }

      const result =
        this.matchEngine.simulate(
          home,
          away,
          seed +
            fixture.roundNumber * 997 +
            fixture.homeTeamId * 31 +
            fixture.awayTeamId,
        );

      this.standingEngine.applyResult(
        standings,
        result,
        generatedSeason.stage.points,
      );

      fixture.status = "PLAYED";
      fixture.homeScore = result.homeGoals;
      fixture.awayScore = result.awayGoals;

      fixturesPlayed++;
    }

    return {
      fixturesPlayed,
      standings:
        this.standingEngine.sort(standings),
    };
  }

  private findSeason(id: number) {
    const row = this.repository.findSeasonById(id);

    if (!row) {
      throw new Error(
        `Competition season não encontrada: ${id}`,
      );
    }

    return row;
  }

  private findCompetition(id: number) {
    const row =
      this.repository.findById(id);

    if (!row) {
      throw new Error(
        `Competition não encontrada: ${id}`,
      );
    }

    return row;
  }
}
