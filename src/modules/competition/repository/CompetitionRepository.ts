import type Database from "better-sqlite3";

import type { Competition } from "../domain/Competition.ts";
import type { CompetitionSeason } from "../domain/CompetitionSeason.ts";
import type { CompetitionParticipant } from "../domain/Participant.ts";

export class CompetitionRepository {
  constructor(
    private readonly db: Database.Database,
  ) {}

  findBySlug(
    slug: string,
  ): Competition | null {
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

          primary_color as primaryColor,
          secondary_color as secondaryColor,

          usual_start_date as usualStartDate,
          usual_end_date as usualEndDate,

          frequency,
          tier
        FROM competition
        WHERE slug = ?
        LIMIT 1
      `)
      .get(slug) as Competition | undefined;

    return row ?? null;
  }

  findSeason(
    competitionId: number,
    year: number,
  ): CompetitionSeason | null {
    const row = this.db
      .prepare(`
        SELECT
          id,
          external_id AS externalId,
          competition_id AS competitionId,

          year,
          number_of_competitors AS numberOfCompetitors,

          start_date as startDate,
          end_date as endDate,

          is_group as isGroup,
          has_rounds as hasRounds,
          has_groups as hasGroups,
          has_playoff as hasPlayoff,

          competition_type as CompetitionType,
          rounds_count as roundsCount,

          promoting_teams_count as promotingTeamsCount,
          relegating_teams_count as relegatingTeamsCount
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

  findParticipants(
    seasonId: number,
  ): CompetitionParticipant[] {
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