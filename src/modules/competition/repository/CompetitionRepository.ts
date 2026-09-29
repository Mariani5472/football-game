import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { Competition } from "../domain/Competition.js";
import type { CompetitionParticipant } from "../domain/CompetitionParticipant.js";
import type { CompetitionSeason } from "../domain/CompetitionSeason.js";
import type {
  CompetitionStage,
  StageFormat,
  StagePointsRule,
  StageSchedule,
} from "../domain/CompetitionStage.js";

export class CompetitionRepository {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  findByName(name: string): Competition | null {
    const row = this.database.connection
      .prepare(
        `
          SELECT
            id,
            name,
            level
          FROM competition
          WHERE name = ?
          LIMIT 1
        `,
      )
      .get(name) as Competition | undefined;

    return row ?? null;
  }

  findSeason(
    competitionId: number,
    year: number,
  ): CompetitionSeason | null {
    const row = this.database.connection
      .prepare(
        `
          SELECT
            id,
            competition_id AS competitionId,
            year,
            start_date AS startDate,
            end_date AS endDate
          FROM competition_season
          WHERE competition_id = ?
            AND year = ?
          LIMIT 1
        `,
      )
      .get(
        competitionId,
        year,
      ) as CompetitionSeason | undefined;

    return row ?? null;
  }

  findStage(
    seasonId: number,
  ): CompetitionStage | null {
    const row = this.database.connection
      .prepare(
        `
          SELECT
            cs.id,
            cs.competition_season_id AS competitionSeasonId,
            cs.name,
            cs.stage_order AS stageOrder,

            sf.format_type AS formatType,
            sf.participant_count AS participantCount,
            sf.legs,
            sf.home_away AS homeAway,

            spr.win_points AS winPoints,
            spr.draw_points AS drawPoints,
            spr.loss_points AS lossPoints,

            sp.scheduling_type AS schedulingType,
            sp.start_date AS startDate,
            sp.end_date AS endDate,
            sp.interval_days AS intervalDays,
            sp.home_away_balanced AS homeAwayBalanced
          FROM competition_stage cs
          LEFT JOIN stage_format sf
            ON sf.stage_id = cs.id
          LEFT JOIN stage_points_rule spr
            ON spr.stage_id = cs.id
          LEFT JOIN schedule_profile sp
            ON sp.stage_id = cs.id
          WHERE cs.competition_season_id = ?
          ORDER BY cs.stage_order
          LIMIT 1
        `,
      )
      .get(seasonId) as StageRow | undefined;

    if (!row) {
      return null;
    }

    const format: StageFormat | null =
      row.formatType === null
        ? null
        : {
            formatType: row.formatType,
            participantCount: row.participantCount,
            legs: row.legs,
            homeAway: row.homeAway === 1,
          };

    const points: StagePointsRule | null =
      row.winPoints === null
        ? null
        : {
            winPoints: row.winPoints,
            drawPoints: row.drawPoints,
            lossPoints: row.lossPoints,
          };

    const schedule: StageSchedule | null =
      row.schedulingType === null
        ? null
        : {
            schedulingType: row.schedulingType,
            startDate: row.startDate,
            endDate: row.endDate,
            intervalDays: row.intervalDays ?? 0,
            homeAwayBalanced: row.homeAwayBalanced === 1,
          };

    return {
      id: row.id,
      competitionSeasonId: row.competitionSeasonId,
      name: row.name,
      stageOrder: row.stageOrder,
      format,
      points,
      schedule,
    };
  }

  findParticipants(
    seasonId: number,
  ): CompetitionParticipant[] {
    return this.database.connection
      .prepare(
        `
          SELECT
            t.id AS teamId,
            t.name,
            COALESCE(t.reputation, 50) AS reputation
          FROM competition_team ct
          INNER JOIN team t
            ON t.id = ct.team_id
          WHERE ct.competition_season_id = ?
          ORDER BY t.id
        `,
      )
      .all(seasonId) as CompetitionParticipant[];
  }
}

interface StageRow {
  id: number;
  competitionSeasonId: number;
  name: string;
  stageOrder: number;

  formatType: string | null;
  participantCount: number | null;
  legs: number | null;
  homeAway: number | null;

  winPoints: number | null;
  drawPoints: number | null;
  lossPoints: number | null;

  schedulingType: string | null;
  startDate: string | null;
  endDate: string | null;
  intervalDays: number | null;
  homeAwayBalanced: number | null;
}
