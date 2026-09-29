export interface EntitySummary {
  id: number;
  name: string;
  shortName?: string;
}

export interface Continent extends EntitySummary {}

export interface Country extends EntitySummary {
  continentId?: number;
  currencyId?: number;
  developmentStateId?: number;
}

export interface Region extends EntitySummary {
  countryId: number;
}

export interface LanguageFamily extends EntitySummary {}

export interface LanguageGroup extends EntitySummary {
  familyId: number;
}

export interface LanguageSubgroup extends EntitySummary {
  groupId: number;
}

export interface Language extends EntitySummary {
  familyId?: number;
  groupId?: number;
  subgroupId?: number;
}

export interface Climate extends EntitySummary {}

export interface ClimateSeason extends EntitySummary {
  climateId: number;
}

export interface City extends EntitySummary {
  countryId: number;
  regionId?: number;
  climateId?: number;
}

export type WorldEntityKind =
  | "continents"
  | "countries"
  | "regions"
  | "languages"
  | "climates"
  | "cities";
