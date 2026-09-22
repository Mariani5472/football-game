import { MasterPackage } from "../database/master/MasterPackage.js";
import { CompetitionEngine } from "../modules/competition/engine/CompetitionEngine.js";
import { SaveService } from "../modules/season/SeasonService.js";

export interface StartGameOptions {
  saveName: string;
  savePath: string;
  packagePath: string;
  competitionSlug: string;
  seasonYear: number;
}

export class GameApplication {
  private readonly saveService = new SaveService();

  async start(options: StartGameOptions): Promise<void> {
    console.log("Starting Football Game...");

    console.log(`Save: ${options.saveName}`);

    console.log(`Package: ${options.packagePath}`);

    const save = this.saveService.create({
      name: options.saveName,
      filePath: options.savePath,
    });

    try {
      console.log("Importing game package...",);

      new MasterPackage(save.connection).importFile(
        options.packagePath,
      );

      console.log(
        "Creating first season...",
      );

      const competitionEngine = new CompetitionEngine(
        save.connection,
      );

      const season = competitionEngine.generateSeason({
        competitionSlug: options.competitionSlug,
        year: options.seasonYear,
      });

      console.log("");
      console.log("Season generated successfully.");
      console.log(`Competition ID: ${season.competitionId}`);
      console.log(`Season ID: ${season.seasonId}`);
      console.log(`Stage ID: ${season.stageId}`);
      console.log(`Rounds: ${season.rounds}`);
      console.log(`Fixtures: ${season.fixtures}`);
    } finally {
      save.close();
    }
  }
}