export const BASE_PACKAGE_KEY = "world.base";
export const BASE_PACKAGE_VERSION = "1.5.0";
export const BASE_PACKAGE_PRIORITY = 0;

export const BASE_PACKAGE_PROVIDES = [
  "reference:base",
  "reference:geography",
  "reference:language",
  "reference:climate",
  "reference:football",
  "reference:tactical",
  "reference:injury",
  "reference:generic",
  "geography:continents",
  "geography:regions",
  "geography:nations",
  "geography:confederations",
  "reference:currencies",
  "reference:languages",
  "reference:climates",
  "reference:people",
  "reference:competition",
  "reference:stadiums",
  "reference:injuries",
  "reference:finance",
  "reference:contracts",
  "reference:transfers",
  "reference:tactics",
  "reference:equipment",
  "reference:awards",
  "reference:media",
  "reference:records",
] as const;

export {
  CONTINENTS,
  REGIONS,
  NATIONS,
  CONFEDERATIONS,
  CONFEDERATION_MEMBERS,
  CURRENCIES,
  LANGUAGES,
} from "./WorldDefaultGeographyCatalog.js";

export {
  DEFAULT_CLIMATES,
  GEOGRAPHY_REFERENCES,
  FOOTBALL_REFERENCES,
  TACTICAL_REFERENCES,
  INJURY_REFERENCES,
  GENERIC_REFERENCES,
  DEFAULT_INJURY_SUBCLASSIFICATIONS,
  DEFAULT_PLAYER_ROLES,
  DEFAULT_REFERENCE_LISTS,
} from "./WorldDefaultReferenceCatalog.js";
