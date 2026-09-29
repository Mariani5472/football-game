import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import type { GenerationContext } from "./GenerationContext.js";

interface CompetitionDefinition {
  name: string;
  level: number;
}

const SANDBOX_COMPETITIONS: CompetitionDefinition[] = [
  {
    name: "Sandbox League",
    level: 1,
  },
  {
    name: "Sandbox Cup",
    level: 2,
  },
];

const BRAZIL_COMPETITIONS: CompetitionDefinition[] = [
  {
    name: "Brasileirão",
    level: 1,
  },
];

export class CompetitionGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(
    context: GenerationContext,
    seasonYear: number,
  ): void {
    this.generate(
      context,
      seasonYear,
      SANDBOX_COMPETITIONS,
    );
  }

  generateBrazilSandbox(
    context: GenerationContext,
    seasonYear: number,
  ): void {
    if (context.teamIds.length !== 20) {
      throw new Error(
        "Brazil Sandbox precisa de exatamente 20 times.",
      );
    }

    this.generate(
      context,
      seasonYear,
      BRAZIL_COMPETITIONS,
    );
  }

  private generate(
    context: GenerationContext,
    seasonYear: number,
    definitions: CompetitionDefinition[],
  ): void {
    for (const definition of definitions) {
      const competitionId =
        this.createCompetition(definition);

      context.competitionIds.push(
        competitionId,
      );

      this.createSeasons(
        context,
        competitionId,
        seasonYear,
      );
    }
  }

  private createCompetition(
    definition: CompetitionDefinition,
  ): number {
    const result = this.database.connection
      .prepare(
        `
          INSERT INTO competition (
            name,
            level
          )
          VALUES (?, ?)
        `,
      )
      .run(
        definition.name,
        definition.level,
      );

    return Number(result.lastInsertRowid);
  }

  private createSeasons(
    context: GenerationContext,
    competitionId: number,
    seasonYear: number,
  ): void {
    const years = [
      seasonYear - 1,
      seasonYear,
    ];

    for (const year of years) {
      const seasonId =
        this.createSeason(
          competitionId,
          year,
        );

      context.competitionSeasonIds.push(
        seasonId,
      );

      const stageId =
        this.createStage(
          seasonId,
          year,
          context.teamIds.length,
        );

      context.competitionStageIds.push(
        stageId,
      );

      this.addTeamsToSeason(
        seasonId,
        context.teamIds,
      );

      this.createStandingRules(
        stageId,
      );
    }
  }

  private createSeason(
    competitionId: number,
    year: number,
  ): number {
    const result = this.database.connection
      .prepare(
        `
          INSERT INTO competition_season (
            competition_id,
            year,
            start_date,
            end_date,
            status
          )
          VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run(
        competitionId,
        year,
        `${year}-04-01`,
        `${year}-12-31`,
        "PLANNED",
      );

    return Number(result.lastInsertRowid);
  }

  private createStage(
    seasonId: number,
    year: number,
    participantCount: number,
  ): number {
    const result = this.database.connection
      .prepare(
        `
          INSERT INTO competition_stage (
            competition_season_id,
            name,
            stage_order
          )
          VALUES (?, ?, ?)
        `,
      )
      .run(
        seasonId,
        "Main Stage",
        1,
      );

    const stageId =
      Number(result.lastInsertRowid);

    this.database.connection
      .prepare(
        `
          INSERT INTO stage_format (
            stage_id,
            format_type,
            participant_count,
            group_count,
            participants_per_group,
            legs,
            home_away,
            aggregate_score,
            extra_time,
            penalties,
            away_goals_rule
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        stageId,
        "LEAGUE",
        participantCount,
        1,
        participantCount,
        2,
        1,
        0,
        0,
        0,
        0,
      );

    this.database.connection
      .prepare(
        `
          INSERT INTO stage_points_rule (
            stage_id,
            win_points,
            draw_points,
            loss_points
          )
          VALUES (?, ?, ?, ?)
        `,
      )
      .run(
        stageId,
        3,
        1,
        0,
      );

    this.database.connection
      .prepare(
        `
          INSERT INTO schedule_profile (
            stage_id,
            scheduling_type,
            start_date,
            end_date,
            interval_days,
            home_away_balanced
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        stageId,
        "ROUND_ROBIN",
        `${year}-04-04`,
        `${year}-12-19`,
        7,
        1,
      );

    return stageId;
  }

  private addTeamsToSeason(
    seasonId: number,
    teamIds: number[],
  ): void {
    const insert = this.database.connection
      .prepare(
        `
          INSERT INTO competition_team (
            competition_season_id,
            team_id
          )
          VALUES (?, ?)
        `,
      );

    for (const teamId of teamIds) {
      insert.run(
        seasonId,
        teamId,
      );
    }
  }

  private createStandingRules(
    stageId: number,
  ): void {
    const insert = this.database.connection
      .prepare(
        `
          INSERT INTO standing_rule (
            stage_id,
            rule_order,
            rule_type
          )
          VALUES (?, ?, ?)
        `,
      );

    const rules = [
      "POINTS",
      "GOAL_DIFFERENCE",
      "GOALS_FOR",
      "WINS",
    ];

    rules.forEach((ruleType, index) => {
      insert.run(
        stageId,
        index + 1,
        ruleType,
      );
    });
  }
}
