import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import {
  ScenarioGenerator,
} from "../generators/ScenarioGenerator.js";

export type FastStartTemplate =
  | "EMPTY"
  | "SANDBOX"
  | "BRAZIL";

export interface FastStartOptions {
  template: FastStartTemplate;
  seasonYear: number;
}

export class FastStartService {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  run(options: FastStartOptions): void {
    const scenarioGenerator =
      new ScenarioGenerator(this.database);

    this.database.transaction(() => {
      switch (options.template) {
        case "EMPTY":
          return;

        case "SANDBOX":
          scenarioGenerator.generateSandbox(
            options.seasonYear,
          );
          return;

        case "BRAZIL":
          scenarioGenerator.generateBrazilSandbox(
            options.seasonYear,
          );
          return;
      }
    });
  }
}
