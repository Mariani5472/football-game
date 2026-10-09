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

export interface GeographyAncestors {
  continent?: GeographyTreeNode;
  continentRegion?: GeographyTreeNode;
  country?: GeographyTreeNode;
  nationRegion?: GeographyTreeNode;
}

export interface GeographySelection extends GeographyAncestors {
  city?: EntityRow;
}

export interface GeographyStats {
  continents: number;
  geographicRegions: number;
  countries: number;
  administrativeRegions: number;
  cities: number;
}

export interface GeographyViewState {
  selectedId?: string;
  filter: GeographyEntityKind | "all";
  query: string;
}
