import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import { CompetitionEngine } from "../../modules/competition/engine/CompetitionEngine.js";
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

  generateSeason(seasonId: number): CalendarGenerationResult {
    const existing = this.database.connection
      .prepare(`SELECT COUNT(*) AS count
               FROM competition_round r
               JOIN competition_stage s ON s.id = r.stage_id
               WHERE s.competition_season_id = ?`)
      .get(seasonId) as { count: number };

    if (Number(existing.count) > 0) {
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

    const stages = this.competitionEngine.generateMultiStageSeason(seasonId);
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
      stages: stages.length,
      rounds,
      fixtures,
    };
  }
}
