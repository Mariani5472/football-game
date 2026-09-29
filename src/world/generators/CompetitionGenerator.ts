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

export class CompetitionGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(
    context: GenerationContext,
    seasonYear: number,
  ): void {
    for (const definition of SANDBOX_COMPETITIONS) {
      const competitionId =
        this.createCompetition(definition);

      context.competitionIds.push(competitionId);

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
        this.createStage(seasonId);

      context.competitionStageIds.push(
        stageId,
      );

      this.createRounds(
        stageId,
        year,
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
        `${year}-01-01`,
        `${year}-12-31`,
        "PLANNED",
      );

    return Number(result.lastInsertRowid);
  }

  private createStage(
    seasonId: number,
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

    return Number(result.lastInsertRowid);
  }

  private createRounds(
    stageId: number,
    year: number,
  ): void {
    this.database.connection
      .prepare(
        `
          INSERT INTO competition_round (
            stage_id,
            round_number,
            name,
            start_date,
            end_date
          )
          VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run(
        stageId,
        1,
        "Round 1",
        `${year}-01-01`,
        `${year}-01-07`,
      );
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
      "WINS",
      "GOAL_DIFFERENCE",
      "GOALS_FOR",
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
