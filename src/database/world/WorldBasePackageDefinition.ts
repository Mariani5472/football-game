export const BASE_PACKAGE_KEY = "world.base";
export const BASE_PACKAGE_VERSION = "1.4.0";
export const BASE_PACKAGE_PROVIDES = [
  "reference:base", "geography:continents", "geography:regions", "geography:nations",
  "geography:confederations", "reference:currencies", "reference:languages", "reference:climates",
  "reference:people", "reference:competition", "reference:stadiums", "reference:injuries",
  "reference:finance", "reference:contracts", "reference:transfers", "reference:tactics",
  "reference:equipment", "reference:awards", "reference:media", "reference:records",
] as const;

export {
  CONTINENTS, REGIONS, NATIONS, CONFEDERATIONS, CONFEDERATION_MEMBERS, CURRENCIES, LANGUAGES,
} from "./WorldDefaultGeographyCatalog.js";
export {
  DEFAULT_CLIMATES, DEFAULT_INJURY_SUBCLASSIFICATIONS, DEFAULT_PLAYER_ROLES, DEFAULT_REFERENCE_LISTS,
} from "./WorldDefaultReferenceCatalog.js";

