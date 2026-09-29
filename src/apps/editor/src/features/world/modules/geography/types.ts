import { City, Continent, Country, Region } from "../../types";


export interface GeographyTreeNode {
  id: string;
  label: string;

  kind:
  | "continent"
  | "region"
  | "country"
  | "nation-region"
  | "city";

  entityId: number;

  children?: GeographyTreeNode[];
}

export interface GeographySelection {
  continent?: Continent;
  region?: Region;
  country?: Country;
  nationRegion?: Region;
  city?: City;
}