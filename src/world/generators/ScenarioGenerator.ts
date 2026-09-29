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

export class ScenarioGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(
    seasonYear: number,
  ): GenerationContext {
    const context: GenerationContext = {
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

    const geography = new GeographyGenerator(
      this.database,
    );

    const language = new LanguageGenerator(
      this.database,
    );

    const climate = new ClimateGenerator(
      this.database,
    );

    const city = new CityGenerator(
      this.database,
    );

    const team = new TeamGenerator(
      this.database,
    );

    const stadium = new StadiumGenerator(
      this.database,
    );

    const person = new PersonGenerator(
      this.database,
    );

    const player = new PlayerGenerator(
      this.database,
    );

    const competition = new CompetitionGenerator(
      this.database,
    );

    geography.generateSandbox(context);
    language.generateSandbox(context);
    climate.generateSandbox(context);
    city.generateSandbox(context);
    team.generateSandbox(context);
    stadium.generateSandbox(context);
    person.generateSandbox(context);
    player.generateSandbox(context);
    competition.generateSandbox(
      context,
      seasonYear,
    );

    void seasonYear;

    return context;
  }
}