import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { GeneratedSeason } from "../domain/GeneratedSeason.js";
import type { SimulationResult } from "../domain/Standing.js";
import type { DrawRestriction, DrawTeam, DrawResult } from "../domain/Draw.js";
import { conditionalDraw } from "../engine/DrawEngine.js";
import { randomDraw } from "../engine/DrawEngine.js";
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


  resolveStageParticipants(seasonId: number, stageId: number) {
    const stage = this.repository.findStages(seasonId).find(item => item.id === stageId);
    if (!stage) throw new Error(`Stage não encontrada: ${stageId}`);
    const direct = this.repository.findParticipants(seasonId);
    const sources = this.repository.findStageParticipantSources(stageId);
    if (!sources.length) return direct;

    const teamIds = new Set<number>();
    for (const source of sources) {
      if (source.sourceStageId == null) continue;
      const resolved = this.repository.resolveParticipantSource(source);
      for (const teamId of resolved.teamIds) teamIds.add(teamId);
    }
    const byId = new Map(direct.map(team => [team.teamId, team]));
    return [...teamIds].map(teamId => byId.get(teamId)).filter((team): team is NonNullable<typeof team> => Boolean(team));
  }

  executeDraw(input: { teams: DrawTeam[]; type: "RANDOM" | "SEEDED" | "CONDITIONAL"; groupCount: number; teamsPerGroup: number; restrictions?: DrawRestriction[]; random?: () => number }): DrawResult {
    if (input.type === "RANDOM") return randomDraw(input.teams, input.groupCount, input.teamsPerGroup, input.random);
    return conditionalDraw(input.teams, { groupCount: input.groupCount, teamsPerGroup: input.teamsPerGroup, restrictions: input.restrictions ?? [], random: input.random });
  }

  resolveStageParticipants(seasonId: number, stageId: number) {
    const stage = this.repository.findStages(seasonId).find(item => item.id === stageId);
    if (!stage) throw new Error(`Stage não encontrada: ${stageId}`);

    const direct = this.repository.findParticipants(seasonId);
    const sources = this.repository.findStageParticipantSources(stageId);
    if (!sources.length) return direct;

    const teamIds = new Set<number>();
    for (const source of sources) {
      if (source.sourceStageId == null) continue;
      const resolved = this.repository.resolveParticipantSource(source);
      for (const teamId of resolved.teamIds) teamIds.add(teamId);
    }

    const byId = new Map(direct.map(team => [team.teamId, team]));
    return [...teamIds]
      .map(teamId => byId.get(teamId))
      .filter((team): team is NonNullable<typeof team> => Boolean(team));
  }

  executeDraw(input: {
    teams: DrawTeam[];
    type: "RANDOM" | "SEEDED" | "CONDITIONAL";
    groupCount: number;
    teamsPerGroup: number;
    restrictions?: DrawRestriction[];
    random?: () => number;
  }): DrawResult {
    if (input.type === "RANDOM") {
      return randomDraw(input.teams, input.groupCount, input.teamsPerGroup, input.random);
    }
    return conditionalDraw(input.teams, {
      groupCount: input.groupCount,
      teamsPerGroup: input.teamsPerGroup,
      restrictions: input.restrictions ?? [],
      random: input.random,
    });
  }

  buildStageTransitions(seasonId: number) {
    const stages = this.repository.findStages(seasonId);
    const transitions: Array<{ fromStageId: number; toStageId: number; sourceType: string; sourcePosition: number | null }> = [];

    for (let index = 0; index < stages.length - 1; index += 1) {
      const from = stages[index];
      const to = stages[index + 1];
      const sources = this.repository.findStageParticipantSources(to.id);

      if (!sources.length) {
        transitions.push({ fromStageId: from.id, toStageId: to.id, sourceType: "DIRECT", sourcePosition: null });
        continue;
      }

      for (const source of sources) {
        if (source.sourceStageId != null && source.sourceStageId !== from.id) continue;
        const fromPosition = source.positionFrom ?? 1;
        const toPosition = source.positionTo ?? fromPosition;
        for (let position = fromPosition; position <= toPosition; position += 1) {
          transitions.push({
            fromStageId: from.id,
            toStageId: to.id,
            sourceType: source.type,
            sourcePosition: position,
          });
        }
      }
    }

    return transitions;
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

    const participants = this.resolveStageParticipants(season.id, stage.id);

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
      standings: this.standingEngine.sort(
        standings,
        generatedSeason.stage.standingRules.length
          ? generatedSeason.stage.standingRules
          : undefined,
      ),
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
