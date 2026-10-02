import type {
  City,
  Climate,
  ClimateSeason,
  Continent,
  Country,
  EntitySummary,
  Language,
  LanguageFamily,
  LanguageGroup,
  LanguageSubgroup,
  Region,
} from "../types";

export const continents: Continent[] = [
  { id: 1, name: "South America", shortName: "SA" },
];

export const countries: Country[] = [
  {
    id: 1,
    name: "Brazil",
    shortName: "BRA",
    continentId: 1,
    currencyId: 1,
    developmentStateId: 1,
  },
];

export const regions: Region[] = [
  { id: 1, name: "Brazil", shortName: "BRA", countryId: 1 },
];

export const nationRegions: Region[] = [
  { id: 1, name: "São Paulo", shortName: "SP", countryId: 1 },
  { id: 2, name: "Rio de Janeiro", shortName: "RJ", countryId: 1 },
  { id: 3, name: "Minas Gerais", shortName: "MG", countryId: 1 },
];

export const languageFamilies: LanguageFamily[] = [
  { id: 1, name: "Indo-European", shortName: "IE" },
];

export const languageGroups: LanguageGroup[] = [
  { id: 1, name: "Romance", shortName: "ROM", familyId: 1 },
];

export const languageSubgroups: LanguageSubgroup[] = [
  { id: 1, name: "Western Romance", shortName: "WROM", groupId: 1 },
];

export const languages: Language[] = [
  {
    id: 1,
    name: "Portuguese",
    shortName: "PT",
    familyId: 1,
    groupId: 1,
    subgroupId: 1,
  },
  {
    id: 2,
    name: "Spanish",
    shortName: "ES",
    familyId: 1,
    groupId: 1,
    subgroupId: 1,
  },
];

export const climates: Climate[] = [
  { id: 1, name: "Tropical", shortName: "TROP" },
  { id: 2, name: "Subtropical", shortName: "SUBT" },
];

export const climateSeasons: ClimateSeason[] = [
  { id: 1, name: "Summer", climateId: 1 },
  { id: 2, name: "Autumn", climateId: 1 },
  { id: 3, name: "Winter", climateId: 1 },
  { id: 4, name: "Spring", climateId: 1 },
  { id: 5, name: "Summer", climateId: 2 },
  { id: 6, name: "Autumn", climateId: 2 },
  { id: 7, name: "Winter", climateId: 2 },
  { id: 8, name: "Spring", climateId: 2 },
];

export const cities: City[] = [
  {
    id: 1,
    name: "São Paulo",
    shortName: "SP",
    countryId: 1,
    regionId: 1,
    climateId: 1,
  },
  {
    id: 2,
    name: "Rio de Janeiro",
    shortName: "RJ",
    countryId: 1,
    regionId: 2,
    climateId: 1,
  },
  {
    id: 3,
    name: "Belo Horizonte",
    shortName: "BH",
    countryId: 1,
    regionId: 3,
    climateId: 1,
  },
  {
    id: 4,
    name: "Curitiba",
    shortName: "CWB",
    countryId: 1,
    climateId: 3,
  },
];

export const worldEntities: EntitySummary[] = [
  ...continents,
  ...countries,
  ...regions,
  ...languages,
  ...climates,
  ...cities,
];