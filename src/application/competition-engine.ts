import { FixtureStatus, type CompetitionSeason, type Fixture, type MatchSimulator, type StandingEntry } from "../data/types.js";
import type { CompetitionRepository, FixtureRepository, ParticipantRepository, SeasonRepository, StageRepository, StandingRepository } from "../repositories/contracts.js";
import { ParticipantEngine, ScheduleEngine, StandingEngine } from "./engines.js";

export interface CompetitionEngineDependencies { competitions: CompetitionRepository; seasons: SeasonRepository; stages: StageRepository; participants: ParticipantRepository; fixtures: FixtureRepository; standings: StandingRepository; participantEngine: ParticipantEngine; scheduleEngine: ScheduleEngine; standingEngine: StandingEngine; simulator: MatchSimulator; }
export class CompetitionEngine {
  constructor(private readonly deps: CompetitionEngineDependencies) {}
  async loadSeason(competitionId: string, seasonId: string): Promise<CompetitionSeason> {
    const [competition, season] = await Promise.all([this.deps.competitions.findById(competitionId), this.deps.seasons.findById(seasonId)]);
    if (!competition) throw new Error(`Competition not found: ${competitionId}`);
    if (!season || season.competitionId !== competition.id) throw new Error(`Season ${seasonId} does not belong to competition ${competitionId}`);
    return season;
  }
  async initialize(season: CompetitionSeason): Promise<void> {
    const [stages, teams] = await Promise.all([this.deps.stages.findBySeasonId(season.id), this.deps.participants.findSeasonTeams(season.id)]);
    for (const stage of stages) {
      const participants = await this.deps.participantEngine.resolve(stage, teams);
      await this.deps.participants.saveForStage(stage.id, participants);
      await this.deps.standings.save(this.deps.standingEngine.calculate(stage, [], participants.map((p) => p.teamId)));
    }
  }
  async generateSchedule(seasonId: string): Promise<void> {
    for (const stage of await this.deps.stages.findBySeasonId(seasonId)) {
      if (!stage.leagueFormat) continue;
      const participants = await this.deps.participants.findByStageId(stage.id);
      const { rounds, fixtures } = this.deps.scheduleEngine.generateLeague(stage, participants);
      await this.deps.fixtures.saveRounds(rounds); await this.deps.fixtures.saveFixtures(fixtures);
    }
  }
  async getNextRound(stageId: string) {
    const rounds = await this.deps.fixtures.findRoundsByStageId(stageId);
    const fixtures = await this.deps.fixtures.findFixturesByStageId(stageId);
    return rounds.sort((a, b) => a.number - b.number).find((round) => fixtures.some((fixture) => fixture.roundId === round.id && fixture.status === FixtureStatus.SCHEDULED)) ?? null;
  }
  async playNextRound(stageId: string): Promise<Fixture[]> {
    const stage = await this.deps.stages.findById(stageId); if (!stage) throw new Error(`Stage not found: ${stageId}`);
    const round = await this.getNextRound(stageId); if (!round) return [];
    const fixtures = (await this.deps.fixtures.findFixturesByStageId(stageId)).filter((fixture) => fixture.roundId === round.id && fixture.status === FixtureStatus.SCHEDULED);
    for (const fixture of fixtures) { const result = await this.deps.simulator.simulate(fixture); await this.deps.fixtures.update(this.finish(fixture, result)); }
    const [updated, participants] = await Promise.all([this.deps.fixtures.findFixturesByStageId(stageId), this.deps.participants.findByStageId(stageId)]);
    await this.deps.standings.save(this.deps.standingEngine.calculate(stage, updated, participants.map((participant) => participant.teamId)));
    return updated.filter((fixture) => fixture.roundId === round.id);
  }
  async getStandings(stageId: string): Promise<StandingEntry[]> { return this.deps.standings.findByStageId(stageId); }
  private finish(fixture: Fixture, result: { homeGoals: number; awayGoals: number }): Fixture { return { ...fixture, status: FixtureStatus.FINISHED, legs: fixture.legs.map((leg, index) => index === 0 ? { ...leg, result } : leg) }; }
}
