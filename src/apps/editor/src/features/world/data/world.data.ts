import type {
  City,
  Climate,
  Continent,
  Country,
  Language,
  Region,
} from "../types";

export const continents: Continent[] = [
  { id: 1, name: "South America", shortName: "SA" },
];

export const countries: Country[] = [
  { id: 1, name: "Brazil", shortName: "BRA", continentId: 1, currencyId: 1, developmentStateId: 1 },
];

export const regions: Region[] = [
  { id: 1, name: "São Paulo", shortName: "SP", countryId: 1 },
  { id: 2, name: "Rio de Janeiro", shortName: "RJ", countryId: 1 },
  { id: 3, name: "Minas Gerais", shortName: "MG", countryId: 1 },
];

export const languages: Language[] = [
  { id: 1, name: "Portuguese", shortName: "PT" },
];

export const climates: Climate[] = [
  { id: 1, name: "Tropical", shortName: "TROP" },
  { id: 2, name: "Subtropical", shortName: "SUBT" },
];

export const cities: City[] = [
  { id: 1, name: "São Paulo", shortName: "SP", countryId: 1, regionId: 1, climateId: 1 },
  { id: 2, name: "Rio de Janeiro", shortName: "RJ", countryId: 1, regionId: 2, climateId: 1 },
  { id: 3, name: "Belo Horizonte", shortName: "BH", countryId: 1, regionId: 3, climateId: 1 },
  { id: 4, name: "Curitiba", shortName: "CWB", countryId: 1, climateId: 2 },
];