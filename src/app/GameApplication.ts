import { MasterPackage } from "../database/master/MasterPackage.js";
import { CompetitionEngine } from "../modules/competition/engine/CompetitionEngine.js";
import { QualificationEngine } from "../modules/competition/engine/QualificationEngine.js";
import { SaveService } from "../modules/season/SeasonService.js";

export interface StartGameOptions {
  saveName: string;
  savePath: string;
  packagePath: string;
  competitionSlug: string;
  seasonYear: number;
  simulateFirstDay?: boolean;
  simulateSeason?: boolean;
}

export class GameApplication {
  private readonly saveService = new SaveService();

  getCurrentDate(
    save: Parameters<SaveService["getCurrentDate"]>[0],
  ): string {
    return this.saveService.getCurrentDate(save);
  }

  advanceDay(
    save: Parameters<SaveService["advanceDay"]>[0],
  ): string {
    return this.saveService.advanceDay(save);
  }

  advanceDayAndPlay(
    save: Parameters<SaveService["advanceDay"]>[0],
    competitionEngine: CompetitionEngine,
    stageId: number,
  ): {
    date: string;
    fixtures: ReturnType<CompetitionEngine["playFixturesOnDate"]>;
  } {
    const currentDate = this.getCurrentDate(save);

    const nextDate = competitionEngine.getNextCompetitionDate(
      stageId,
      currentDate,
    );

    if (nextDate === null) {
      return {
        date: currentDate,
        fixtures: [],
      };
    }

    const fixtures = competitionEngine.playFixturesOnDate(
      stageId,
      nextDate,
    );

    this.saveService.setCurrentDate(
      save,
      nextDate,
    );

    return {
      date: nextDate,
      fixtures,
    };
  }

  async start(options: StartGameOptions): Promise<void> {
    console.log("Starting Football Game...");
    console.log(`Save: ${options.saveName}`);
    console.log(`Package: ${options.packagePath}`);

    const save = this.saveService.create({
      name: options.saveName,
      filePath: options.savePath,
      startDate: `${options.seasonYear}-01-27`,
    });

    try {
      console.log("");
      console.log("Importing game package...");

      new MasterPackage(save.connection).importFile(
        options.packagePath,
      );

      console.log("");
      console.log("Creating first season...");

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

      if (options.simulateFirstDay) {
        this.simulateFirstDay(
          competitionEngine,
          season.stageId,
          save,
        );
      }

      if (options.simulateSeason) {
        this.simulateSeason(
          competitionEngine,
          season.stageId,
          save,
        );
      }
    } finally {
      save.close();
    }
  }

  private simulateFirstDay(
    competitionEngine: CompetitionEngine,
    stageId: number,
    save: Parameters<SaveService["getCurrentDate"]>[0],
  ): void {
    const currentDate = this.saveService.getCurrentDate(save);

    const nextDate = competitionEngine.getNextCompetitionDate(
      stageId,
      currentDate,
    );

    if (!nextDate) {
      console.log("No scheduled matches found.");
      return;
    }

    const fixtures = competitionEngine.playFixturesOnDate(
      stageId,
      nextDate,
    );

    this.saveService.setCurrentDate(
      save,
      nextDate,
    );

    console.log("");
    console.log(`Match day: ${nextDate}`);
    console.log(`Matches played: ${fixtures.length}`);

    for (const fixture of fixtures) {
      console.log(
        `Fixture ${fixture.id}: ` +
        `${fixture.homeTeamId} ` +
        `${fixture.homeScore} x ${fixture.awayScore} ` +
        `${fixture.awayTeamId}`,
      );
    }

    console.log("");
    console.log("Standings:");

    this.printStandings(
      competitionEngine,
      stageId,
    );
  }

  private simulateSeason(
    competitionEngine: CompetitionEngine,
    stageId: number,
    save: Parameters<SaveService["getCurrentDate"]>[0],
  ): void {
    let currentDate = this.saveService.getCurrentDate(save);

    console.log("");
    console.log("==============================");
    console.log("Starting season simulation");
    console.log("==============================");

    while (true) {
      const nextDate = competitionEngine.getNextCompetitionDate(
        stageId,
        currentDate,
      );

      console.log("Next date:", nextDate);

      if (!nextDate) {
        break;
      }

      const fixtures = competitionEngine.playFixturesOnDate(
        stageId,
        nextDate,
      );

      this.saveService.setCurrentDate(
        save,
        nextDate,
      );

      console.log(
        `${nextDate} - ${fixtures.length} matches played`,
      );

      currentDate = nextDate;
    }

    console.log("");
    console.log("==============================");
    console.log("Season simulation finished");
    console.log("==============================");

    console.log("");
    console.log("Final standings:");

    this.printStandings(
      competitionEngine,
      stageId,
    );

    console.log("");
    console.log("Qualifications:");
    console.log(competitionEngine.getQualifications(stageId));

  }

  private printStandings(
    competitionEngine: CompetitionEngine,
    stageId: number,
  ): void {
    for (const [index, standing] of competitionEngine
      .getStandings(stageId)
      .entries()) {
      console.log(
        `${index + 1}. ` +
        `${standing.teamName} - ` +
        `${standing.points} pts | ` +
        `${standing.played}J ` +
        `${standing.wins}V ` +
        `${standing.draws}E ` +
        `${standing.losses}D | ` +
        `SG ${standing.goalDifference}`,
      );
    }
  }
}