import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import {
  ScenarioGenerator,
  type ScenarioId,
} from "../generators/ScenarioGenerator.js";
import {
  WorldValidationResult,
  WorldValidator,
} from "../validation/index.js";

export type FastStartTemplate = ScenarioId;

export type FastStartStep =
  | "SCENARIO"
  | "WORLD"
  | "CLUBS"
  | "PLAYERS"
  | "PEOPLE"
  | "STADIUMS"
  | "COMPETITIONS"
  | "CALENDAR"
  | "VALIDATION"
  | "COMPLETED";

export interface FastStartOptions {
  template: FastStartTemplate;
  seasonYear: number;
}

export interface FastStartGenerationSummary {
  scenario: FastStartTemplate;
  seasonYear: number;
  counts: {
    nations: number;
    cities: number;
    teams: number;
    clubs: number;
    people: number;
    players: number;
    stadiums: number;
    competitions: number;
    seasons: number;
    stages: number;
    rounds: number;
    fixtures: number;
  };
  validation: WorldValidationResult;
}

export interface FastStartResult {
  scenario: FastStartTemplate;
  seasonYear: number;
  steps: FastStartStep[];
  context: ReturnType<ScenarioGenerator["generate"]>;
  summary: FastStartGenerationSummary;
}

export class FastStartService {
  private readonly scenarios: ScenarioGenerator;
  private readonly validator: WorldValidator;

  constructor(
    private readonly database: WorldDatabase,
  ) {
    this.scenarios = new ScenarioGenerator(database);
    this.validator = new WorldValidator(database);
  }

  run(options: FastStartOptions): FastStartResult {
    this.validateOptions(options);

    return this.database.transaction(() => {
      const steps: FastStartStep[] = ["SCENARIO", "WORLD"];

      const context = this.scenarios.generate(
        options.template,
        options.seasonYear,
      );

      if (options.template === "EMPTY") {
        const validation = this.validator.validate();

        return {
          scenario: options.template,
          seasonYear: options.seasonYear,
          steps: [...steps, "VALIDATION", "COMPLETED"],
          context,
          summary: {
            scenario: options.template,
            seasonYear: options.seasonYear,
            counts: this.emptyCounts(),
            validation,
          },
        };
      }

      steps.push(
        "CLUBS",
        "PLAYERS",
        "PEOPLE",
        "STADIUMS",
        "COMPETITIONS",
        "CALENDAR",
      );

      const validation = this.validator.validate();

      if (!validation.valid) {
        throw new Error(
          `Fast Start validation failed with ${validation.errors.length} error(s).`,
        );
      }

      steps.push("VALIDATION", "COMPLETED");

      const summary = this.buildSummary(
        options.template,
        options.seasonYear,
        context,
        validation,
      );

      return {
        scenario: options.template,
        seasonYear: options.seasonYear,
        steps,
        context,
        summary,
      };
    });
  }

  private validateOptions(options: FastStartOptions): void {
    if (!Number.isInteger(options.seasonYear)) {
      throw new Error("Season year must be an integer.");
    }

    if (options.seasonYear < 1900 || options.seasonYear > 3000) {
      throw new Error("Season year must be between 1900 and 3000.");
    }

    if (!["EMPTY", "SANDBOX", "BRAZIL"].includes(options.template)) {
      throw new Error(`Unsupported fast-start scenario: ${options.template}`);
    }
  }

  private buildSummary(
    scenario: FastStartTemplate,
    seasonYear: number,
    context: ReturnType<ScenarioGenerator["generate"]>,
    validation: WorldValidationResult,
  ): FastStartGenerationSummary {
    const rounds = this.database.connection
      .prepare(
        `SELECT COUNT(*) AS count
         FROM competition_round
         WHERE stage_id IN (${context.competitionStageIds.map(() => "?").join(",") || "NULL"})`,
      )
      .get(...context.competitionStageIds) as { count: number };

    const fixtures = this.database.connection
      .prepare(
        `SELECT COUNT(*) AS count
         FROM competition_round r
         JOIN fixture f ON f.round_id = r.id
         WHERE r.stage_id IN (${context.competitionStageIds.map(() => "?").join(",") || "NULL"})`,
      )
      .get(...context.competitionStageIds) as { count: number };

    return {
      scenario,
      seasonYear,
      counts: {
        nations: context.nationIds.length,
        cities: context.cityIds.length,
        teams: context.teamIds.length,
        clubs: context.clubIds.length,
        people: context.personIds.length,
        players: context.playerIds.length,
        stadiums: context.stadiumIds.length,
        competitions: context.competitionIds.length,
        seasons: context.competitionSeasonIds.length,
        stages: context.competitionStageIds.length,
        rounds: Number(rounds.count),
        fixtures: Number(fixtures.count),
      },
      validation,
    };
  }

  private emptyCounts(): FastStartGenerationSummary["counts"] {
    return {
      nations: 0,
      cities: 0,
      teams: 0,
      clubs: 0,
      people: 0,
      players: 0,
      stadiums: 0,
      competitions: 0,
      seasons: 0,
      stages: 0,
      rounds: 0,
      fixtures: 0,
    };
  }
}
