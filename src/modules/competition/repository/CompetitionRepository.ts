import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { Competition } from "../domain/Competition.js";
import type { CompetitionParticipant, ParticipantSource, ResolvedParticipantSource } from "../domain/CompetitionParticipant.js";
import type { CompetitionSeason } from "../domain/CompetitionSeason.js";
import { StandingEngine } from "../engine/StandingEngine.js";
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

  findById(id: number): Competition | null {
    const row = this.database.connection
      .prepare(
        `
          SELECT
            id,
            name,
            level
          FROM competition
          WHERE id = ?
          LIMIT 1
        `,
      )
      .get(id) as Competition | undefined;

    return row ?? null;
  }

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

  findSeasonById(id: number): CompetitionSeason | null {
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
          WHERE id = ?
          LIMIT 1
        `,
      )
      .get(id) as CompetitionSeason | undefined;

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
            legs: row.legs ?? 1,
            homeAway: row.homeAway === 1,
          };

    const points: StagePointsRule | null =
      row.winPoints === null
        ? null
        : {
            winPoints: row.winPoints,
            drawPoints: row.drawPoints ?? 1,
            lossPoints: row.lossPoints ?? 0,
          };

    const schedule: StageSchedule | null =
      row.schedulingType === null
        ? null
        : {
            schedulingType: row.schedulingType,
            startDate: row.startDate,
            endDate: row.endDate,
            intervalDays: row.intervalDays ?? 0,
            homeAwayBalanced:
              row.homeAwayBalanced === 1,
          };

    return {
      id: row.id,
      competitionSeasonId: row.competitionSeasonId,
      name: row.name,
      stageOrder: row.stageOrder,
      format,
      points,
      schedule,
      participantSources: this.findStageParticipantSources(row.id),
      standingRules: this.findStandingRules(row.id),
    };
  }


  findStages(seasonId: number): CompetitionStage[] {
    return this.database.connection.prepare(
      `SELECT cs.id, cs.competition_season_id AS competitionSeasonId, cs.name, cs.stage_order AS stageOrder,
              sf.format_type AS formatType, sf.participant_count AS participantCount, sf.legs, sf.home_away AS homeAway,
              spr.win_points AS winPoints, spr.draw_points AS drawPoints, spr.loss_points AS lossPoints,
              sp.scheduling_type AS schedulingType, sp.start_date AS startDate, sp.end_date AS endDate,
              sp.interval_days AS intervalDays, sp.home_away_balanced AS homeAwayBalanced
         FROM competition_stage cs
         LEFT JOIN stage_format sf ON sf.stage_id = cs.id
         LEFT JOIN stage_points_rule spr ON spr.stage_id = cs.id
         LEFT JOIN schedule_profile sp ON sp.stage_id = cs.id
        WHERE cs.competition_season_id = ?
        ORDER BY cs.stage_order`
    ).all(seasonId).map(row => this.mapStage(row as StageRow));
  }

  findStageParticipantSources(stageId: number): ParticipantSource[] {
    const rows = this.database.connection.prepare(
      `SELECT source_type, source_competition_id, source_season_id, source_stage_id,
              position_from, position_to, qualification_type
         FROM stage_participant_source
        WHERE stage_id = ?
        ORDER BY id`
    ).all(stageId) as Array<{
      source_type: string;
      source_competition_id: number | null;
      source_season_id: number | null;
      source_stage_id: number | null;
      position_from: number | null;
      position_to: number | null;
      qualification_type: string | null;
    }>;

    return rows.map(row => ({
      type: row.source_type as ParticipantSource["type"],
      sourceCompetitionId: row.source_competition_id ?? undefined,
      sourceSeasonId: row.source_season_id ?? undefined,
      sourceStageId: row.source_stage_id ?? undefined,
      positionFrom: row.position_from ?? undefined,
      positionTo: row.position_to ?? undefined,
      qualificationType: row.qualification_type === null ? undefined : row.qualification_type as ParticipantSource["qualificationType"],
    }));
  }

  resolveStandings(sourceStageId: number, positionFrom: number, positionTo: number): number[] {
    const stage = this.findStages(
      this.stageSeasonId(sourceStageId),
    ).find(item => item.id === sourceStageId);

    if (!stage) throw new Error("Source stage not found.");
    if (!stage.points) throw new Error("Source stage has no points rule.");

    const participants = this.findStageParticipants(sourceStageId);
    const standings = new Map(participants.map(team => [team.teamId, {
      teamId: team.teamId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    }]));

    const fixtures = this.database.connection.prepare(
      `SELECT f.home_team_id AS homeTeamId, f.away_team_id AS awayTeamId,
              f.home_score AS homeGoals, f.away_score AS awayGoals
         FROM fixture f
         JOIN competition_round r ON r.id = f.round_id
        WHERE r.stage_id = ? AND f.status = 'PLAYED'
          AND f.home_score IS NOT NULL AND f.away_score IS NOT NULL
        ORDER BY r.round_number, f.id`
    ).all(sourceStageId) as Array<{
      homeTeamId: number; awayTeamId: number; homeGoals: number; awayGoals: number;
    }>;

    for (const fixture of fixtures) {
      const home = standings.get(fixture.homeTeamId);
      const away = standings.get(fixture.awayTeamId);
      if (!home || !away) continue;
      home.played += 1; away.played += 1;
      home.goalsFor += fixture.homeGoals; home.goalsAgainst += fixture.awayGoals;
      away.goalsFor += fixture.awayGoals; away.goalsAgainst += fixture.homeGoals;
      if (fixture.homeGoals > fixture.awayGoals) {
        home.wins += 1; away.losses += 1;
        home.points += stage.points.winPoints; away.points += stage.points.lossPoints;
      } else if (fixture.homeGoals < fixture.awayGoals) {
        away.wins += 1; home.losses += 1;
        away.points += stage.points.winPoints; home.points += stage.points.lossPoints;
      } else {
        home.draws += 1; away.draws += 1;
        home.points += stage.points.drawPoints; away.points += stage.points.drawPoints;
      }
    }

    const rules = this.findStandingRules(sourceStageId);
    const sorted = new StandingEngine().sort(standings, rules);
    return sorted.slice(Math.max(0, positionFrom - 1), Math.max(0, positionTo)).map(row => row.teamId);
  }

  private stageSeasonId(stageId: number): number {
    const row = this.database.connection.prepare(
      "SELECT competition_season_id AS seasonId FROM competition_stage WHERE id=?",
    ).get(stageId) as { seasonId: number } | undefined;
    if (!row) throw new Error(`Stage not found: ${stageId}`);
    return row.seasonId;
  }

  private findStageParticipants(stageId: number): CompetitionParticipant[] {
    return this.database.connection.prepare(
      `SELECT DISTINCT t.id AS teamId, t.name, COALESCE(t.reputation, 50) AS reputation
         FROM fixture f
         JOIN competition_round r ON r.id = f.round_id
         JOIN team t ON t.id = f.home_team_id
        WHERE r.stage_id = ?
        UNION
       SELECT DISTINCT t.id AS teamId, t.name, COALESCE(t.reputation, 50) AS reputation
         FROM fixture f
         JOIN competition_round r ON r.id = f.round_id
         JOIN team t ON t.id = f.away_team_id
        WHERE r.stage_id = ?
        ORDER BY teamId`
    ).all(stageId, stageId) as CompetitionParticipant[];
  }

  resolveParticipantSource(source: ParticipantSource): ResolvedParticipantSource {
    const stageId = source.sourceStageId;
    if (stageId == null) throw new Error("Participant source requires sourceStageId.");
    const from = source.positionFrom ?? 1;
    const to = source.positionTo ?? from;
    return { source, teamIds: this.resolveStandings(stageId, from, to) };
  }


  private mapStage(row: StageRow): CompetitionStage {
    const format: StageFormat | null = row.formatType === null ? null : {
      formatType: row.formatType,
      participantCount: row.participantCount,
      legs: row.legs ?? 1,
      homeAway: row.homeAway === 1,
    };
    const points: StagePointsRule | null = row.winPoints === null ? null : {
      winPoints: row.winPoints,
      drawPoints: row.drawPoints ?? 1,
      lossPoints: row.lossPoints ?? 0,
    };
    const schedule: StageSchedule | null = row.schedulingType === null ? null : {
      schedulingType: row.schedulingType,
      startDate: row.startDate,
      endDate: row.endDate,
      intervalDays: row.intervalDays ?? 0,
      homeAwayBalanced: row.homeAwayBalanced === 1,
    };
    return { id: row.id, competitionSeasonId: row.competitionSeasonId, name: row.name, stageOrder: row.stageOrder, format, points, schedule };
  }


  private findStandingRules(stageId: number): string[] {
    const rows = this.database.connection.prepare(
      "SELECT rule_type AS ruleType FROM standing_rule WHERE stage_id=? ORDER BY rule_order",
    ).all(stageId) as Array<{ ruleType: string }>;
    return rows.map(row => row.ruleType);
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
