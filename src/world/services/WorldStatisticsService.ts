import type { WorldDatabase } from "../../database/world/WorldDatabase.js";

export interface WorldStatistics {
  countries: number;
  cities: number;
  teams: number;
  clubs: number;
  stadiums: number;
  people: number;
  players: number;
  competitions: number;
  seasons: number;
  continents: number;
  languages: number;
  climates: number;
}

export class WorldStatisticsService {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  get(): WorldStatistics {
    return {
      countries: this.count("nation"),
      cities: this.count("city"),
      teams: this.count("team"),
      clubs: this.count("club"),
      stadiums: this.count("stadium"),
      people: this.count("person"),
      players: this.count("player"),
      competitions: this.count("competition"),
      seasons: this.count("competition_season"),
      continents: this.count("continent"),
      languages: this.count("language"),
      climates: this.count("climate"),
    };
  }

  private count(table: string): number {
    const result = this.database.connection
      .prepare(
        `SELECT COUNT(*) AS count FROM ${table}`,
      )
      .get() as { count: number };

    return result.count;
  }
}