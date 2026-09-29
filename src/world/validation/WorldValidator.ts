import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import type { ValidationIssue } from "./ValidationIssue.js";
import type { WorldValidationResult } from "./WorldValidationResult.js";

export class WorldValidator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  validate(): WorldValidationResult {
    const issues: ValidationIssue[] = [];

    this.validateCities(issues);
    this.validateClubs(issues);
    this.validatePlayers(issues);
    this.validateCompetitions(issues);

    const errors = issues.filter(
      (issue) => issue.severity === "ERROR",
    );

    const warnings = issues.filter(
      (issue) => issue.severity === "WARNING",
    );

    const infos = issues.filter(
      (issue) => issue.severity === "INFO",
    );

    return {
      issues,
      errors,
      warnings,
      infos,
      valid: errors.length === 0,
    };
  }

  private validateCities(
    issues: ValidationIssue[],
  ): void {
    const cities = this.database.connection
      .prepare(
        `
          SELECT
            c.id,
            c.name,
            c.nation_id,
            c.climate_id
          FROM city c
        `,
      )
      .all() as Array<{
        id: number;
        name: string;
        nation_id: number | null;
        climate_id: number | null;
      }>;

    const languageCheck = this.database.connection.prepare(
      `
        SELECT 1
        FROM city_language
        WHERE city_id = ?
        LIMIT 1
      `,
    );

    for (const city of cities) {
      if (city.nation_id === null) {
        issues.push({
          severity: "ERROR",
          rule: "CITY_WITHOUT_NATION",
          message: `City "${city.name}" has no nation.`,
          entityType: "CITY",
          entityId: city.id,
        });
      }

      if (city.climate_id === null) {
        issues.push({
          severity: "WARNING",
          rule: "CITY_WITHOUT_CLIMATE",
          message: `City "${city.name}" has no climate.`,
          entityType: "CITY",
          entityId: city.id,
        });
      }

      if (!languageCheck.get(city.id)) {
        issues.push({
          severity: "WARNING",
          rule: "CITY_WITHOUT_LANGUAGE",
          message: `City "${city.name}" has no language.`,
          entityType: "CITY",
          entityId: city.id,
        });
      }
    }
  }

  private validateClubs(
    issues: ValidationIssue[],
  ): void {
    const clubs = this.database.connection
      .prepare(
        `
          SELECT
            c.team_id,
            t.name AS team_name,
            t.nation_id,
            c.city_id
          FROM club c
          JOIN team t
            ON t.id = c.team_id
        `,
      )
      .all() as Array<{
        team_id: number;
        team_name: string;
        nation_id: number | null;
        city_id: number | null;
      }>;

    const stadiumCheck = this.database.connection.prepare(
      `
        SELECT 1
        FROM stadium
        WHERE owner_club_id = ?
        LIMIT 1
      `,
    );

    for (const club of clubs) {
      if (club.nation_id === null) {
        issues.push({
          severity: "ERROR",
          rule: "CLUB_WITHOUT_NATION",
          message: `Club "${club.team_name}" has no nation.`,
          entityType: "CLUB",
          entityId: club.team_id,
        });
      }

      if (club.city_id === null) {
        issues.push({
          severity: "ERROR",
          rule: "CLUB_WITHOUT_CITY",
          message: `Club "${club.team_name}" has no city.`,
          entityType: "CLUB",
          entityId: club.team_id,
        });
      }

      if (!stadiumCheck.get(club.team_id)) {
        issues.push({
          severity: "WARNING",
          rule: "CLUB_WITHOUT_STADIUM",
          message: `Club "${club.team_name}" has no stadium.`,
          entityType: "CLUB",
          entityId: club.team_id,
        });
      }
    }
  }

  private validatePlayers(
    issues: ValidationIssue[],
  ): void {
    const players = this.database.connection
      .prepare(
        `
          SELECT
            p.person_id,
            pe.full_name,
            pe.birth_date,
            p.left_foot,
            p.right_foot
          FROM player p
          JOIN person pe
            ON pe.id = p.person_id
        `,
      )
      .all() as Array<{
        person_id: number;
        full_name: string;
        birth_date: string | null;
        left_foot: number | null;
        right_foot: number | null;
      }>;

    const attributeCheck = this.database.connection.prepare(
      `
        SELECT 1
        FROM (
          SELECT player_id
          FROM player_technical_attribute
          WHERE player_id = ?

          UNION

          SELECT player_id
          FROM player_physical_attribute
          WHERE player_id = ?

          UNION

          SELECT player_id
          FROM player_psychological_attribute
          WHERE player_id = ?

          UNION

          SELECT player_id
          FROM player_goalkeeper_attribute
          WHERE player_id = ?
        )
        LIMIT 1
      `,
    );

    for (const player of players) {
      if (!player.birth_date) {
        issues.push({
          severity: "ERROR",
          rule: "PLAYER_WITHOUT_BIRTH_DATE",
          message: `Player "${player.full_name}" has no birth date.`,
          entityType: "PLAYER",
          entityId: player.person_id,
        });
      }

      if (
        !attributeCheck.get(
          player.person_id,
          player.person_id,
          player.person_id,
          player.person_id,
        )
      ) {
        issues.push({
          severity: "ERROR",
          rule: "PLAYER_WITHOUT_ATTRIBUTES",
          message: `Player "${player.full_name}" has no attributes.`,
          entityType: "PLAYER",
          entityId: player.person_id,
        });
      }

      if (
        player.left_foot === null &&
        player.right_foot === null
      ) {
        issues.push({
          severity: "INFO",
          rule: "PLAYER_WITHOUT_PREFERRED_FOOT",
          message: `Player "${player.full_name}" has no preferred foot.`,
          entityType: "PLAYER",
          entityId: player.person_id,
        });
      }
    }
  }

  private validateCompetitions(
    issues: ValidationIssue[],
  ): void {
    const competitions = this.database.connection
      .prepare(
        `
          SELECT
            id,
            name
          FROM competition
        `,
      )
      .all() as Array<{
        id: number;
        name: string;
      }>;

    const seasons = this.database.connection.prepare(
      `
        SELECT id
        FROM competition_season
        WHERE competition_id = ?
      `,
    );

    const stages = this.database.connection.prepare(
      `
        SELECT id
        FROM competition_stage
        WHERE competition_season_id = ?
      `,
    );

    const participantCount = this.database.connection.prepare(
      `
        SELECT COUNT(*) AS count
        FROM competition_team
        WHERE competition_season_id = ?
      `,
    );

    const ruleCount = this.database.connection.prepare(
      `
        SELECT COUNT(*) AS count
        FROM standing_rule
        WHERE stage_id = ?
      `,
    );

    const roundCount = this.database.connection.prepare(
      `
        SELECT COUNT(*) AS count
        FROM competition_round
        WHERE stage_id = ?
      `,
    );

    const fixtureCount = this.database.connection.prepare(
      `
        SELECT COUNT(*) AS count
        FROM fixture f
        JOIN competition_round r
          ON r.id = f.round_id
        WHERE r.stage_id = ?
      `,
    );

    const scheduleProfileCount = this.database.connection.prepare(
      `
        SELECT COUNT(*) AS count
        FROM schedule_profile
        WHERE stage_id = ?
      `,
    );

    for (const competition of competitions) {
      const seasonRows = seasons.all(
        competition.id,
      ) as Array<{ id: number }>;

      if (seasonRows.length === 0) {
        issues.push({
          severity: "ERROR",
          rule: "COMPETITION_WITHOUT_SEASON",
          message: `Competition "${competition.name}" has no seasons.`,
          entityType: "COMPETITION",
          entityId: competition.id,
        });

        continue;
      }

      for (const season of seasonRows) {
        const stageRows = stages.all(
          season.id,
        ) as Array<{ id: number }>;

        if (stageRows.length === 0) {
          issues.push({
            severity: "ERROR",
            rule: "SEASON_WITHOUT_STAGE",
            message: `Competition "${competition.name}" has a season without stages.`,
            entityType: "COMPETITION_SEASON",
            entityId: season.id,
          });

          continue;
        }

        const participants = participantCount.get(
          season.id,
        ) as { count: number };

        for (const stage of stageRows) {
          if (participants.count === 0) {
            issues.push({
              severity: "ERROR",
              rule: "STAGE_WITHOUT_PARTICIPANTS",
              message: `Competition "${competition.name}" has a stage without participants.`,
              entityType: "COMPETITION_STAGE",
              entityId: stage.id,
            });
          }

          const rules = ruleCount.get(
            stage.id,
          ) as { count: number };

          if (rules.count === 0) {
            issues.push({
              severity: "ERROR",
              rule: "STAGE_WITHOUT_RULES",
              message: `Competition "${competition.name}" has a stage without standing rules.`,
              entityType: "COMPETITION_STAGE",
              entityId: stage.id,
            });
          }

          const rounds = roundCount.get(
            stage.id,
          ) as { count: number };

          if (rounds.count === 0) {
            issues.push({
              severity: "ERROR",
              rule: "STAGE_WITHOUT_SCHEDULE",
              message: `Competition "${competition.name}" has a stage without rounds.`,
              entityType: "COMPETITION_STAGE",
              entityId: stage.id,
            });

            continue;
          }

          const fixtures = fixtureCount.get(
            stage.id,
          ) as { count: number };

          if (fixtures.count === 0) {
            issues.push({
              severity: "WARNING",
              rule: "STAGE_WITHOUT_FIXTURES",
              message: `Competition "${competition.name}" has rounds but no fixtures yet.`,
              entityType: "COMPETITION_STAGE",
              entityId: stage.id,
            });
          }

          const schedules = scheduleProfileCount.get(
            stage.id,
          ) as { count: number };

          if (schedules.count === 0) {
            issues.push({
              severity: "WARNING",
              rule: "STAGE_WITHOUT_SCHEDULE_PROFILE",
              message: `Competition "${competition.name}" has no schedule profile.`,
              entityType: "COMPETITION_STAGE",
              entityId: stage.id,
            });
          }
        }
      }
    }
  }
}
