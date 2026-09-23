import type Database from "better-sqlite3";
import { CompetitionRepository } from "../repository/CompetitionRepository.js";
import { ScheduleEngine } from "./ScheduleEngine.js";
import { StandingEngine } from "./StandingEngine.js";
import { CalendarEngine } from "./CalendarEngine.js";
import { MatchEngine } from "../../match/engine/MatchEngine.js";
import type { MatchResult } from "../../match/domain/MatchResult.js";
import type { Fixture } from "../domain/Fixture.js";
import type { Standing } from "./StandingEngine.js";
import { StandingRuleType } from "../domain/StandingRule.js";
import { StandingRuleRepository } from "../repository/StandingRuleRepository.js";
import { QualificationEngine } from "./QualificationEngine.js";

export interface CompetitionSeasonSetup {
  competitionSlug: string;
  year: number;
}

export interface GeneratedSeason {
  competitionId: number;
  seasonId: number;
  stageId: number;
  rounds: number;
  fixtures: number;
}

export class CompetitionEngine {
  private readonly repository: CompetitionRepository;
  private readonly scheduleEngine: ScheduleEngine;
  private readonly standingEngine: StandingEngine;
  private readonly calendarEngine: CalendarEngine;
  private readonly matchEngine: MatchEngine;
  private readonly standingRuleRepository: StandingRuleRepository;
  private readonly qualificationEngine: QualificationEngine;

  constructor(private readonly db: Database.Database) {
    this.repository = new CompetitionRepository(db);
    this.scheduleEngine = new ScheduleEngine();
    this.standingEngine = new StandingEngine(db);
    this.calendarEngine = new CalendarEngine();
    this.matchEngine = new MatchEngine();
    this.standingRuleRepository = new StandingRuleRepository(db);
    this.qualificationEngine = new QualificationEngine(db);
  }

  generateSeason(setup: CompetitionSeasonSetup): GeneratedSeason {
    const competition = this.repository.findBySlug(setup.competitionSlug);

    if (!competition) {
      throw new Error(`Competition não encontrada: ${setup.competitionSlug}`);
    }

    const season = this.repository.findSeason(
      competition.id,
      setup.year,
    );

    if (!season) {
      throw new Error(`Temporada ${setup.year} não encontrada para ${competition.name}`);
    }

    const participants = this.repository.findParticipants(season.id);

    if (!participants.length) {
      throw new Error(`Nenhum participante encontrado para ${competition.name} ${setup.year}`);
    }

    const stage = this.createLeagueStage(season.id);

    const rounds = this.scheduleEngine.generateDoubleRoundRobin(participants);

    const startDate = season.startDate ?? `${season.year}-01-27`;

    this.createRounds(stage.id, rounds, startDate);

    this.standingEngine.initialize(stage.id, participants.map((participant) => participant.teamId));

    const fixtureCount = rounds.reduce((total, round) => total + round.fixtures.length, 0);

    return {
      competitionId: competition.id,
      seasonId: season.id,
      stageId: stage.id,
      rounds: rounds.length,
      fixtures: fixtureCount,
    };
  }

  playFixture(fixtureId: number): Fixture {
    const transaction = this.db.transaction(() => {
      const fixture = this.repository.findFixture(fixtureId);

      if (!fixture) {
        throw new Error(`Fixture não encontrada: ${fixtureId}`);
      }

      if (fixture.status !== "SCHEDULED") {
        throw new Error(`Fixture ${fixtureId} já foi processada.`);
      }

      const result = this.matchEngine.simulate({
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
      });

      this.updateFixtureResult(fixtureId, result);

      this.standingEngine.applyResult(
        fixture.stageId,
        result,
      );

      return {
        ...fixture,
        status: "PLAYED" as const,
        homeScore: result.homeGoals,
        awayScore: result.awayGoals,
      };
    });

    return transaction();
  }

  playFixturesOnDate(stageId: number, date: string,): Fixture[] {
    const fixtures = this.repository.findScheduledFixturesOnDate(stageId, date,);
    if (!fixtures.length) {
      return [];
    }

    const transaction = this.db.transaction(() => {
      const played: Fixture[] = [];

      for (const fixture of fixtures) {
        const result = this.matchEngine.simulate({ homeTeamId: fixture.homeTeamId, awayTeamId: fixture.awayTeamId, });
        this.updateFixtureResult(fixture.id, result,);
        this.standingEngine.applyResult(fixture.stageId, result,);

        played.push({
          ...fixture,
          status: "PLAYED",
          homeScore: result.homeGoals,
          awayScore: result.awayGoals,
        });
      }

      return played;
    }); return transaction();
  }

  getNextCompetitionDate(stageId: number, currentDate: string,): string | null {
    return this.repository.findNextScheduledDate(stageId, currentDate,);
  }

  getStandings(stageId: number,): Standing[] {
    return this.standingEngine.getStandings(stageId);
  }


  private updateFixtureResult(fixtureId: number, result: MatchResult,): void {
    this.db
      .prepare(` 
        UPDATE fixture 
        SET status = ?, 
        home_score = ?,
        away_score = ? 
        WHERE id = ? `
      )
      .run(
        "PLAYED",
        result.homeGoals,
        result.awayGoals,
        fixtureId,
      );
  }

  private createLeagueStage(seasonId: number,): { id: number; } {
    const result = this.db.prepare(`
        INSERT INTO competition_stage (
          competition_season_id,
          name,
          type,
          stage_order
        )
        VALUES (?, ?, ?, ?)
      `)
      .run(
        seasonId,
        "League",
        "LEAGUE",
        1,
      );

    const stageId = Number(
      result.lastInsertRowid,
    );

    this.createStandingRules(stageId);


    return {
      id: Number(result.lastInsertRowid),
    };
  }

  getQualifications(stageId: number) {
    const standings = this.standingEngine.getStandings(stageId);

    return this.qualificationEngine.resolve(
      stageId,
      standings,
    );
  }

  private createStandingRules(stageId: number,): void {
    this.standingRuleRepository.create(
      stageId,
      [
        "POINTS",
        "WINS",
        "GOAL_DIFFERENCE",
        "GOALS_FOR",
      ],
    );
  }

  private createRounds(
    stageId: number,
    rounds: ReturnType<ScheduleEngine["generateDoubleRoundRobin"]>,
    startDate: string,
  ): void {
    const calendar = this.calendarEngine.generate(
      startDate,
      rounds.length,
    );

    const insertRound = this.db.prepare(`
      INSERT INTO competition_round (
        stage_id,
        round_number,
        name,
        start_date,
        end_date
      )
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertFixture = this.db.prepare(`
      INSERT INTO fixture (
        round_id,
        home_team_id,
        away_team_id,
        scheduled_at,
        status
      )
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const round of rounds) {
        const date = calendar[round.roundNumber - 1].date;

        const roundResult = insertRound.run(
          stageId,
          round.roundNumber,
          `Rodada ${round.roundNumber}`,
          date,
          date,
        );

        const roundId = Number(roundResult.lastInsertRowid,);

        for (const fixture of round.fixtures) {
          insertFixture.run(
            roundId,
            fixture.homeTeamId,
            fixture.awayTeamId,
            `${date}T16:00:00`,
            "SCHEDULED",
          );
        }
      }
    });

    transaction();
  }
}