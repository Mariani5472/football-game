import { EntityRow } from "../../../../shared/api/editorApi";

export type GeographyEntityKind =
  | "federation"
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
  federation?: EntityRow;
  continent?: EntityRow;
  continentRegion?: EntityRow;
  country?: EntityRow;
  nationRegion?: EntityRow;
  city?: EntityRow;
}
