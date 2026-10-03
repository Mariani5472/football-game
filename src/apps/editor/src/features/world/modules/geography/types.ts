import type { EntityRow } from "../../../../shared/api/editorApi";

export type GeographyEntityKind =
  | "continent"
  | "continent-region"
  | "country"
  | "nation-region"
  | "city";

export interface GeographyTreeNode {
  id: string;
  entityId: number;
  table: string;
  kind: GeographyEntityKind;
  label: string;
  children: GeographyTreeNode[];
  row: EntityRow;
}

export interface GeographySelection {
  continent?: EntityRow;
  continentRegion?: EntityRow;
  country?: EntityRow;
  nationRegion?: EntityRow;
  city?: EntityRow;
}

export interface GeographyContinentCard {
  id: number;
  name: string;
  shortName: string;
  countryCount: number;
  regionCount: number;
  cityCount: number;
  row: EntityRow;
}

export interface GeographyCountrySummary {
  id: number;
  name: string;
  shortName: string;
  regionCount: number;
  cityCount: number;
  languageCount?: number;
  federation?: string | null;
  confederation?: string | null;
  row: EntityRow;
}

export type GeographyView =
  | { level: "continents" }
  | { level: "countries"; continentId: number }
  | { level: "country"; countryId: number };
