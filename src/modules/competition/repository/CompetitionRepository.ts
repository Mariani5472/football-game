import type Database from "better-sqlite3";

import type { Competition } from "../domain/Competition.ts";
import type { CompetitionSeason } from "../domain/CompetitionSeason.ts";
import type { CompetitionParticipant } from "../domain/Participant.ts";
import type { FixtureContext } from "../domain/FixtureContext.js";

export class CompetitionRepository {
  constructor(
    private readonly db: Database.Database,
  ) {}

  findBySlug(slug: string,): Competition | null {
    const row = this.db
      .prepare(`
        SELECT
          id,
          external_id AS externalId,
          country_id AS countryId,

          name,
          slug,
          gender,
          image,

          primary_color AS primaryColor,
          secondary_color AS secondaryColor,

          usual_start_date AS usualStartDate,
          usual_end_date AS usualEndDate,

          frequency,
          tier
        FROM competition
        WHERE slug = ?
        LIMIT 1
      `)
      .get(slug) as Competition | undefined;

    return row ?? null;
  }

  findSeason(competitionId: number, year: number,): CompetitionSeason | null {
    const row = this.db
      .prepare(`
        SELECT
          id,
          external_id AS externalId,
          competition_id AS competitionId,

          year,
          number_of_competitors AS numberOfCompetitors,

          start_date AS startDate,
          end_date AS endDate,

          is_group AS isGroup,
          has_rounds AS hasRounds,
          has_groups AS hasGroups,
          has_playoff AS hasPlayoff,

          competition_type AS competitionType,
          rounds_count AS roundsCount,

          promoting_teams_count AS promotingTeamsCount,
          relegating_teams_count AS relegatingTeamsCount
        FROM competition_season
        WHERE competition_id = ?
          AND year = ?
        LIMIT 1
      `)
      .get(
        competitionId,
        year,
      ) as CompetitionSeason | undefined;

    return row ?? null;
  }

  findFixture(fixtureId: number,): FixtureContext | null {
    const row = this.db
      .prepare(`
        SELECT
          f.id,
          f.round_id AS roundId,
          f.home_team_id AS homeTeamId,
          f.away_team_id AS awayTeamId,
          f.scheduled_at AS scheduledAt,
          f.status,
          f.home_score AS homeScore,
          f.away_score AS awayScore,

          r.stage_id AS stageId
        FROM fixture f

        INNER JOIN competition_round r
          ON r.id = f.round_id

        WHERE f.id = ?

        LIMIT 1
      `)
      .get(fixtureId) as FixtureContext | undefined;

    return row ?? null;
  }

  findNextScheduledDate(stageId: number, currentDate: string,): string | null {
    const row = this.db
      .prepare(`
        SELECT
          substr(
            f.scheduled_at,
            1,
            10
          ) AS date

        FROM fixture f

        INNER JOIN competition_round r
          ON r.id = f.round_id

        WHERE r.stage_id = ?
          AND f.status = 'SCHEDULED'
          AND substr(
            f.scheduled_at,
            1,
            10
          ) > ?

        ORDER BY
          f.scheduled_at ASC,
          f.id ASC

        LIMIT 1
      `)
      .get(
        stageId,
        currentDate,
      ) as { date: string } | undefined;

    return row?.date ?? null;
  }

  findScheduledFixturesOnDate(stageId: number, date: string,): FixtureContext[] {
    return this.db
      .prepare(`
        SELECT
          f.id,
          f.round_id AS roundId,
          f.home_team_id AS homeTeamId,
          f.away_team_id AS awayTeamId,
          f.scheduled_at AS scheduledAt,
          f.status,
          f.home_score AS homeScore,
          f.away_score AS awayScore,

          r.stage_id AS stageId

        FROM fixture f

        INNER JOIN competition_round r
          ON r.id = f.round_id

        WHERE r.stage_id = ?
          AND f.status = 'SCHEDULED'
          AND substr(
            f.scheduled_at,
            1,
            10
          ) = ?

        ORDER BY
          f.scheduled_at ASC,
          f.id ASC
      `)
      .all(
        stageId,
        date,
      ) as FixtureContext[];
  }

  findNextScheduledFixture(stageId: number,): FixtureContext | null {
    const row = this.db
      .prepare(`
        SELECT
          f.id,
          f.round_id AS roundId,
          f.home_team_id AS homeTeamId,
          f.away_team_id AS awayTeamId,
          f.scheduled_at AS scheduledAt,
          f.status,
          f.home_score AS homeScore,
          f.away_score AS awayScore,

          r.stage_id AS stageId

        FROM fixture f

        INNER JOIN competition_round r
          ON r.id = f.round_id

        WHERE r.stage_id = ?
          AND f.status = 'SCHEDULED'

        ORDER BY
          f.scheduled_at ASC,
          f.id ASC

        LIMIT 1
      `)
      .get(stageId) as FixtureContext | undefined;

    return row ?? null;
  }

  findParticipants(seasonId: number,): CompetitionParticipant[] {
    return this.db
      .prepare(`
        SELECT
          t.id AS teamId,
          t.name,
          t.short_name AS shortName

        FROM competition_team ct

        INNER JOIN team t
          ON t.id = ct.team_id

        WHERE ct.competition_season_id = ?

        ORDER BY t.name
      `)
      .all(seasonId) as CompetitionParticipant[];
  }
}
