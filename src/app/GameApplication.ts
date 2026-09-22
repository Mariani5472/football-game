import { MasterPackage } from "../database/master/MasterPackage.js";
import { CompetitionEngine } from "../modules/competition/engine/CompetitionEngine.js";
import { SaveService } from "../modules/season/SeasonService.js";

export interface StartGameOptions {
  saveName: string;
  savePath: string;
  packagePath: string;
  competitionSlug: string;
  seasonYear: number;
  simulateFirstFixture?: boolean;
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
      startDate: `{options.seasonYear}-01-27`,
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

      if (options.simulateFirstFixture) {
        const fixture = competitionEngine.playNextFixture(season.stageId);

        console.log("");
        console.log("First fixture played.");
        console.log(
          `Fixture ${fixture.id}: ${fixture.homeTeamId} ${fixture.homeScore} x ${fixture.awayScore} ${fixture.awayTeamId}`,
        );

        console.log("");
        console.log("Standings:");

        for (const [index, standing] of competitionEngine
          .getStandings(season.stageId)
          .entries()) {
          console.log(
            `${index + 1}. ${standing.teamName} - ${standing.points} pts | ${standing.played}J ${standing.wins}V ${standing.draws}E ${standing.losses}D | SG ${standing.goalDifference}`,
          );
        }
      }
    } finally {
      save.close();
    }
  }
}