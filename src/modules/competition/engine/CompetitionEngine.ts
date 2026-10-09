import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { GeneratedSeason } from "../domain/GeneratedSeason.js";
import type { SimulationResult, Standing } from "../domain/Standing.js";
import type { DrawRestriction, DrawTeam, DrawResult } from "../domain/Draw.js";
import { conditionalDraw, randomDraw, seededDraw } from "./DrawEngine.js";
import { CompetitionRepository } from "../repository/CompetitionRepository.js";
import { MatchEngine } from "./MatchEngine.js";
import { ScheduleEngine, type GeneratedRound } from "./ScheduleEngine.js";
import { StandingEngine } from "./StandingEngine.js";
import { ParticipantResolutionService } from "./ParticipantResolutionService.js";

export interface CompetitionSeasonSetup {
  competitionSeasonId: number;
}

export interface StageExecutionResult {
  stageId: number;
  participants: number[];
  rounds: GeneratedRound[];
  standings?: Standing[];
  qualifiedTeamIds: number[];
  eliminatedTeamIds: number[];
  promotedTeamIds: number[];
  relegatedTeamIds: number[];
}

export class CompetitionEngine {
  private readonly repository: CompetitionRepository;
  private readonly scheduleEngine = new ScheduleEngine();
  private readonly matchEngine = new MatchEngine();
  private readonly standingEngine = new StandingEngine();
  private readonly participantResolution: ParticipantResolutionService;

  constructor(database: WorldDatabase) {
    this.repository = new CompetitionRepository(database);
    this.participantResolution = new ParticipantResolutionService(this.repository);
  }

  resolveStageParticipants(seasonId: number, stageId: number) {
    return this.participantResolution.resolve(seasonId, stageId).participants;
  }

  executeDraw(input: {
    teams: DrawTeam[];
    type: "RANDOM" | "SEEDED" | "CONDITIONAL";
    groupCount: number;
    teamsPerGroup: number;
    restrictions?: DrawRestriction[];
    random?: () => number;
    pots?: Array<{ id: number; teamIds: number[]; potOrder: number }>;
  }): DrawResult {
    if (input.type === "RANDOM") {
      return randomDraw(input.teams, input.groupCount, input.teamsPerGroup, input.random);
    }
    if (input.type === "SEEDED") {
      return seededDraw(input.teams, input);
    }
    return conditionalDraw(input.teams, {
      ...input,
      restrictions: input.restrictions ?? [],
    });
  }

  buildStageTransitions(seasonId: number) {
    return this.participantResolution.buildTransitions(this.repository.findStages(seasonId));
  }

  generateSeason(setup: CompetitionSeasonSetup): GeneratedSeason {
    const season = this.repository.findSeasonById(setup.competitionSeasonId);
    if (!season) throw new Error(`Competition season not found: ${setup.competitionSeasonId}`);

    const stages = this.repository.findStages(season.id);
    const stage = stages[0];
    if (!stage) throw new Error(`No stage configured for season=${season.id}`);

    return this.generateStage(season.id, stage.id);
  }

  generateStage(seasonId: number, stageId: number): GeneratedSeason {
    const season = this.repository.findSeasonById(seasonId);
    if (!season) throw new Error(`Competition season not found: ${seasonId}`);

    const stage = this.repository.findStages(seasonId).find((item) => item.id === stageId);
    if (!stage) throw new Error(`Stage not found: ${stageId}`);

    const participants = this.resolveStageParticipants(seasonId, stageId);
    if (stage.format == null) throw new Error(`Stage ${stageId} has no format configured.`);
    if (!stage.schedule?.startDate) throw new Error(`Stage ${stageId} has no schedule start date.`);
    if (stage.schedule.intervalDays < 1) throw new Error(`Stage ${stageId} has an invalid schedule interval.`);

    const rounds = this.generateRounds(stage, participants);

    return {
      competition: this.findCompetition(season.competitionId),
      season,
      stage,
      participants,
      rounds: rounds.length,
      fixtures: rounds.flatMap((round) => round.fixtures),
    };
  }

  executeStage(stageId: number, generatedSeason: GeneratedSeason, seed = 2026): StageExecutionResult {
    const stage = generatedSeason.stage;
    const participants = generatedSeason.participants;
    const rounds = generatedSeason.fixtures.length
      ? this.groupFixtures(generatedSeason.fixtures)
      : [];

    let standings: Standing[] | undefined;
    if (stage.points) {
      const table = this.standingEngine.initialize(participants);
      const strengths = new Map(
        participants.map((participant) => [
          participant.teamId,
          { teamId: participant.teamId, reputation: participant.reputation },
        ]),
      );

      for (const fixture of generatedSeason.fixtures) {
        if (fixture.homeTeamId === 0 || fixture.awayTeamId === 0) continue;
        const home = strengths.get(fixture.homeTeamId);
        const away = strengths.get(fixture.awayTeamId);
        if (!home || !away) throw new Error("Fixture contains unknown participant.");

        const result = this.matchEngine.simulate(
          home,
          away,
          seed + fixture.roundNumber * 997 + fixture.homeTeamId * 31 + fixture.awayTeamId,
        );

        this.standingEngine.applyResult(table, result, stage.points);
        fixture.status = "PLAYED";
        fixture.homeScore = result.homeGoals;
        fixture.awayScore = result.awayGoals;
      }

      standings = this.standingEngine.sort(
        table,
        stage.standingRules.length ? stage.standingRules : undefined,
      );
    }

    const qualification = this.resolveQualification(stage, standings ?? []);
    return {
      stageId,
      participants: participants.map((participant) => participant.teamId),
      rounds,
      standings,
      qualifiedTeamIds: qualification.qualified,
      eliminatedTeamIds: qualification.eliminated,
      promotedTeamIds: qualification.promoted,
      relegatedTeamIds: qualification.relegated,
    };
  }

  generateMultiStageSeason(seasonId: number, seed = 2026): StageExecutionResult[] {
    const stages = this.repository.findStages(seasonId);
    const results: StageExecutionResult[] = [];

    for (const stage of stages) {
      const generated = this.generateStage(seasonId, stage.id);
      results.push(this.executeStage(stage.id, generated, seed + stage.stageOrder * 100_000));
    }

    return results;
  }

  simulateSeason(generatedSeason: GeneratedSeason, seed = 2026): SimulationResult {
    const result = this.executeStage(generatedSeason.stage.id, generatedSeason, seed);
    if (!result.standings) {
      return { fixturesPlayed: generatedSeason.fixtures.filter((fixture) => fixture.status === "PLAYED").length, standings: [] };
    }
    return {
      fixturesPlayed: generatedSeason.fixtures.filter((fixture) => fixture.status === "PLAYED").length,
      standings: result.standings,
    };
  }

  private generateRounds(stage: NonNullable<GeneratedSeason["stage"]>, participants: GeneratedSeason["participants"]): GeneratedRound[] {
    switch (stage.format?.formatType) {
      case "LEAGUE":
        return this.scheduleEngine.generateRoundRobin(
          participants,
          stage.schedule!.startDate!,
          stage.schedule!.intervalDays,
          stage.format.legs,
        );
      case "GROUP": {
        const groupCount = stage.format.groupCount;
        const teamsPerGroup = stage.format.participantsPerGroup;
        if (!groupCount || !teamsPerGroup) throw new Error(`Stage ${stage.id} group format needs group configuration.`);

        const teamsPerDraw = groupCount * teamsPerGroup;
        if (participants.length !== teamsPerDraw) {
          throw new Error(`Stage ${stage.id} expects ${teamsPerDraw} grouped participants, found ${participants.length}.`);
        }

        const teams: DrawTeam[] = participants.map((participant, index) => ({
          teamId: participant.teamId,
          nationId: participant.nationId,
          seed: index + 1,
        }));

        const draw = this.executeDraw({
          teams,
          type: "CONDITIONAL",
          groupCount,
          teamsPerGroup,
          restrictions: [],
        });

        const groups = draw.groups.map((group) =>
          group.teamIds.map((teamId) => participants.find((participant) => participant.teamId === teamId)!)
        );

        return this.scheduleEngine.generateGrouped(
          groups,
          stage.schedule!.startDate!,
          stage.schedule!.intervalDays,
          stage.format.legs,
        );
      }
      case "KNOCKOUT":
        return this.scheduleEngine.generateKnockout(
          participants,
          stage.schedule!.startDate!,
          stage.schedule!.intervalDays,
          stage.format.legs,
        );
      default:
        throw new Error(`Unsupported stage format: ${stage.format?.formatType}`);
    }
  }

  private resolveQualification(stage: GeneratedSeason["stage"], standings: Standing[]) {
    const qualified: number[] = [];
    const promoted: number[] = [];
    const relegated: number[] = [];

    for (const rule of stage.qualificationRules) {
      if (standings.length === 0) continue;
      const selected = standings
        .slice(Math.max(0, rule.positionFrom - 1), Math.max(0, rule.positionTo))
        .map((standing) => standing.teamId);

      if (rule.type === "QUALIFY") qualified.push(...selected);
      if (rule.type === "PROMOTE") promoted.push(...selected);
      if (rule.type === "RELEGATE") relegated.push(...selected);
    }

    const selected = new Set([...qualified, ...promoted, ...relegated]);
    return {
      qualified: [...new Set(qualified)],
      promoted: [...new Set(promoted)],
      relegated: [...new Set(relegated)],
      eliminated: standings
        .filter((standing) => !selected.has(standing.teamId))
        .map((standing) => standing.teamId),
    };
  }

  private groupFixtures(fixtures: GeneratedSeason["fixtures"]): GeneratedRound[] {
    const groups = new Map<number, GeneratedRound>();
    for (const fixture of fixtures) {
      const current = groups.get(fixture.roundNumber);
      const round = current ?? {
        roundNumber: fixture.roundNumber,
        date: fixture.scheduledAt.slice(0, 10),
        fixtures: [],
      };
      round.fixtures.push(fixture);
      groups.set(fixture.roundNumber, round);
    }
    return [...groups.values()].sort((left, right) => left.roundNumber - right.roundNumber);
  }

  private findCompetition(id: number) {
    const row = this.repository.findById(id);
    if (!row) throw new Error(`Competition not found: ${id}`);
    return row;
  }
}
