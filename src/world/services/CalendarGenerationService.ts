import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import { CompetitionEngine } from "../../modules/competition/engine/CompetitionEngine.js";
import { CompetitionRepository } from "../../modules/competition/repository/CompetitionRepository.js";
import type { GeneratedRound } from "../../modules/competition/engine/ScheduleEngine.js";
import { CalendarScheduleValidator, type CalendarFixture } from "./CalendarScheduleValidator.js";

export interface CalendarGenerationResult {
  seasonId: number;
  stages: number;
  rounds: number;
  fixtures: number;
}

export class CalendarGenerationService {
  private readonly competitionEngine: CompetitionEngine;
  private readonly scheduleValidator = new CalendarScheduleValidator();

  constructor(private readonly database: WorldDatabase) {
    this.competitionEngine = new CompetitionEngine(database);
  }

  private loadExistingFixtures(): CalendarFixture[] {
    return this.database.connection.prepare(
      `SELECT f.id AS fixtureId,
              s.competition_season_id AS competitionSeasonId,
              r.stage_id AS stageId,
              r.round_number AS roundNumber,
              f.scheduled_at AS scheduledAt,
              f.home_team_id AS homeTeamId,
              f.away_team_id AS awayTeamId
         FROM fixture f
         JOIN competition_round r ON r.id = f.round_id
         JOIN competition_stage s ON s.id = r.stage_id
        WHERE f.scheduled_at IS NOT NULL`,
    ).all() as CalendarFixture[];
  }

  private coordinateRounds(
    rounds: GeneratedRound[],
    existingFixtures: CalendarFixture[],
    intervalDays: number,
  ): GeneratedRound[] {
    const occupied: CalendarFixture[] = [...existingFixtures];
    const coordinated: GeneratedRound[] = [];
    let previousDate: string | null = null;

    for (const round of [...rounds].sort((left, right) => left.roundNumber - right.roundNumber)) {
      let candidateDate = round.date;
      if (previousDate && candidateDate < this.addDays(previousDate, intervalDays)) {
        candidateDate = this.addDays(previousDate, intervalDays);
      }
      let accepted: GeneratedRound | null = null;
      for (let offset = 0; offset <= 365; offset++) {
        const shiftedFixtures = round.fixtures.map((fixture) => {
          const time = fixture.scheduledAt.includes("T")
            ? fixture.scheduledAt.slice(fixture.scheduledAt.indexOf("T"))
            : "T16:00:00";
          return { ...fixture, scheduledAt: `${candidateDate}${time}` };
        });
        const proposed = shiftedFixtures.map((fixture) => ({
          stageId: undefined,
          roundNumber: fixture.roundNumber,
          scheduledAt: fixture.scheduledAt,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
        }));
        const validation = this.scheduleValidator.validate(proposed, occupied);
        if (validation.valid) {
          accepted = { ...round, date: candidateDate, fixtures: shiftedFixtures };
          break;
        }
        candidateDate = this.addDays(candidateDate, 1);
      }
      if (!accepted) {
        throw new Error(`Could not find a conflict-free date for round ${round.roundNumber} within 365 days.`);
      }
      coordinated.push(accepted);
      previousDate = accepted.date;
      occupied.push(...accepted.fixtures.map((fixture) => ({
        stageId: undefined,
        roundNumber: fixture.roundNumber,
        scheduledAt: fixture.scheduledAt,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
      })));
    }
    return coordinated;
  }

  private addDays(date: string, days: number): string {
    const value = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  generateSeason(seasonId: number): CalendarGenerationResult {
    const existing = this.database.connection
      .prepare(`SELECT COUNT(*) AS count
               FROM competition_round r
               JOIN competition_stage s ON s.id = r.stage_id
               WHERE s.competition_season_id = ?`)
      .get(seasonId) as { count: number };

    if (Number(existing.count) > 0) {
      const existingFixtures = this.loadExistingFixtures();
      const validation = this.scheduleValidator.validate([], existingFixtures);
      if (!validation.valid) {
        throw new Error(`Existing world calendar has ${validation.conflicts.length} conflict(s): ${validation.conflicts.slice(0, 10).map((item) => item.message).join("; ")}`);
      }
      const counts = this.database.connection
        .prepare(`SELECT
                    COUNT(DISTINCT r.id) AS rounds,
                    COUNT(f.id) AS fixtures
                  FROM competition_round r
                  JOIN competition_stage s ON s.id = r.stage_id
                  LEFT JOIN fixture f ON f.round_id = r.id
                 WHERE s.competition_season_id = ?`)
        .get(seasonId) as { rounds: number; fixtures: number };

      const stageCount = this.database.connection
        .prepare(`SELECT COUNT(*) AS count
                  FROM competition_stage
                  WHERE competition_season_id = ?`)
        .get(seasonId) as { count: number };

      return {
        seasonId,
        stages: Number(stageCount.count),
        rounds: Number(counts.rounds),
        fixtures: Number(counts.fixtures),
      };
    }

    const stageDefinitions = new CompetitionRepository(this.database).findStages(seasonId);
    const firstStage = stageDefinitions[0];
    if (!firstStage) {
      throw new Error(`Competition season ${seasonId} has no configured stages.`);
    }

    // Only the entry stage is scheduled in the immutable World. Later stages
    // depend on Save results and are generated when their participants resolve.
    const generated = this.competitionEngine.generateStage(seasonId, firstStage.id);
    const fixtureGroups = new Map<number, typeof generated.fixtures>();
    for (const fixture of generated.fixtures) {
      const group = fixtureGroups.get(fixture.roundNumber) ?? [];
      group.push(fixture);
      fixtureGroups.set(fixture.roundNumber, group);
    }
    const stages = [{
      stageId: firstStage.id,
      rounds: [...fixtureGroups.entries()].sort(([left], [right]) => left - right).map(([roundNumber, fixtures]) => ({
        roundNumber,
        date: fixtures[0]?.scheduledAt.slice(0, 10) ?? firstStage.schedule?.startDate ?? "",
        fixtures,
      })),
    }];
    const existingFixtures = this.database.connection.prepare(
      `SELECT f.id AS fixtureId,
              s.competition_season_id AS competitionSeasonId,
              r.stage_id AS stageId,
              r.round_number AS roundNumber,
              f.scheduled_at AS scheduledAt,
              f.home_team_id AS homeTeamId,
              f.away_team_id AS awayTeamId
         FROM fixture f
         JOIN competition_round r ON r.id = f.round_id
         JOIN competition_stage s ON s.id = r.stage_id
        WHERE f.scheduled_at IS NOT NULL`,
    ).all() as CalendarFixture[];

    const intervalDays = Math.max(1, firstStage.schedule?.intervalDays ?? 7);
    stages[0].rounds = this.coordinateRounds(stages[0].rounds, existingFixtures, intervalDays);
    const proposedFixtures: CalendarFixture[] = stages.flatMap((stage) =>
      stage.rounds.flatMap((round) => round.fixtures.map((fixture) => ({
        competitionSeasonId: seasonId,
        stageId: stage.stageId,
        roundNumber: round.roundNumber,
        scheduledAt: fixture.scheduledAt || round.date,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
      }))),
    );
    const validation = this.scheduleValidator.validate(proposedFixtures, existingFixtures);
    if (!validation.valid) {
      const details = validation.conflicts
        .slice(0, 10)
        .map((conflict) => conflict.message)
        .join("\n");
      const remaining = validation.conflicts.length > 10
        ? `\n…and ${validation.conflicts.length - 10} more conflict(s).`
        : "";
      throw new Error(`Calendar generation rejected due to ${validation.conflicts.length} conflict(s):\n${details}${remaining}`);
    }

    let rounds = 0;
    let fixtures = 0;

    const insertRound = this.database.connection.prepare(
      `INSERT INTO competition_round (
        stage_id,
        round_number,
        name,
        start_date
      )
      VALUES (?, ?, ?, ?)`,
    );

    const insertFixture = this.database.connection.prepare(
      `INSERT INTO fixture (
        round_id,
        home_team_id,
        away_team_id,
        scheduled_at
      )
      VALUES (?, ?, ?, ?)`,
    );

    for (const stage of stages) {
      for (const round of stage.rounds) {
        const createdRound = insertRound.run(
          stage.stageId,
          round.roundNumber,
          `Round ${round.roundNumber}`,
          round.date,
        );
        const roundId = Number(createdRound.lastInsertRowid);
        rounds++;

        for (const fixture of round.fixtures) {
          insertFixture.run(
            roundId,
            fixture.homeTeamId,
            fixture.awayTeamId,
            fixture.scheduledAt || round.date,
          );
          fixtures++;
        }
      }
    }

    if (stages.length > 0) {
      this.database.connection
        .prepare(
          `UPDATE competition_season
           SET status = 'SCHEDULED'
           WHERE id = ?`,
        )
        .run(seasonId);
    }

    return {
      seasonId,
      stages: stageDefinitions.length,
      rounds,
      fixtures,
    };
  }
}
