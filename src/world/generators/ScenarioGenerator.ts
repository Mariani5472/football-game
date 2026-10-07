import type { WorldDatabase } from "../../database/world/WorldDatabase.js";

import { CityGenerator } from "./CityGenerator.js";
import { ClimateGenerator } from "./ClimateGenerator.js";
import { CompetitionGenerator } from "./CompetitionGenerator.js";
import { GenerationContext } from "./GenerationContext.js";
import { GeographyGenerator } from "./GeographyGenerator.js";
import { LanguageGenerator } from "./LanguageGenerator.js";
import { PersonGenerator } from "./PersonGenerator.js";
import { PlayerGenerator } from "./PlayerGenerator.js";
import { StadiumGenerator } from "./StadiumGenerator.js";
import { TeamGenerator } from "./TeamGenerator.js";

export type ScenarioId = "EMPTY" | "SANDBOX" | "BRAZIL";

export interface ScenarioDefinition {
  id: ScenarioId;
  label: string;
  teamCount: number;
  teamNamePrefix: string;
  teamShortNamePrefix: string;
  brazil: boolean;
}

const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  EMPTY: {
    id: "EMPTY",
    label: "Empty",
    teamCount: 0,
    teamNamePrefix: "",
    teamShortNamePrefix: "",
    brazil: false,
  },
  SANDBOX: {
    id: "SANDBOX",
    label: "Sandbox",
    teamCount: 8,
    teamNamePrefix: "Sandbox FC",
    teamShortNamePrefix: "SB",
    brazil: false,
  },
  BRAZIL: {
    id: "BRAZIL",
    label: "Brazil Sandbox",
    teamCount: 20,
    teamNamePrefix: "Brazil FC",
    teamShortNamePrefix: "BR",
    brazil: true,
  },
};

export class ScenarioGenerator {
  private readonly geography: GeographyGenerator;
  private readonly language: LanguageGenerator;
  private readonly climate: ClimateGenerator;
  private readonly city: CityGenerator;
  private readonly team: TeamGenerator;
  private readonly stadium: StadiumGenerator;
  private readonly person: PersonGenerator;
  private readonly player: PlayerGenerator;
  private readonly competition: CompetitionGenerator;

  constructor(
    private readonly database: WorldDatabase,
  ) {
    this.geography = new GeographyGenerator(database);
    this.language = new LanguageGenerator(database);
    this.climate = new ClimateGenerator(database);
    this.city = new CityGenerator(database);
    this.team = new TeamGenerator(database);
    this.stadium = new StadiumGenerator(database);
    this.person = new PersonGenerator(database);
    this.player = new PlayerGenerator(database);
    this.competition = new CompetitionGenerator(database);
  }

  listScenarios(): ScenarioDefinition[] {
    return Object.values(SCENARIOS);
  }

  generate(
    scenarioId: ScenarioId,
    seasonYear: number,
  ): GenerationContext {
    const definition = SCENARIOS[scenarioId];

    if (!definition) {
      throw new Error(`Unknown fast-start scenario: ${scenarioId}`);
    }

    if (scenarioId === "EMPTY") {
      return this.createContext();
    }

    const context = this.createContext();

    this.geography.generateSandbox(context);
    this.language.generateSandbox(context);
    this.climate.generateSandbox(context);
    this.city.generateSandbox(context, definition.teamCount);
    this.team.generateSandbox(context, {
      count: definition.teamCount,
      namePrefix: definition.teamNamePrefix,
      shortNamePrefix: definition.teamShortNamePrefix,
    });
    this.stadium.generateSandbox(context, definition.teamCount);
    this.person.generateSandbox(context);
    this.player.generateSandbox(context);

    if (definition.brazil) {
      this.competition.generateBrazilSandbox(context, seasonYear);
    } else {
      this.competition.generateSandbox(context, seasonYear);
    }

    return context;
  }

  generateSandbox(seasonYear: number): GenerationContext {
    return this.generate("SANDBOX", seasonYear);
  }

  generateBrazilSandbox(seasonYear: number): GenerationContext {
    return this.generate("BRAZIL", seasonYear);
  }

  private createContext(): GenerationContext {
    return {
      climateIds: [],
      nationIds: [],
      nationRegionIds: [],
      cityIds: [],
      teamIds: [],
      clubIds: [],
      stadiumIds: [],
      personIds: [],
      playerIds: [],
      competitionIds: [],
      competitionSeasonIds: [],
      competitionStageIds: [],
    };
  }
}
