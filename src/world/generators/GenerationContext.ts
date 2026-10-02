export interface GenerationContext {
  continentId?: number;

  languageId?: number;

  climateIds: number[];

  nationIds: number[];
  nationRegionIds: number[];
  cityIds: number[];

  teamIds: number[];
  clubIds: number[];

  stadiumIds: number[];

  personIds: number[];
  playerIds: number[];

  competitionIds: number[];
  competitionSeasonIds: number[];
  competitionStageIds: number[];
}