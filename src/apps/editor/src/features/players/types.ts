import type { AttributeCategory } from "../../attributes/types";

export type PlayerAttributeValues = Record<AttributeCategory, Record<string, number>>;

export interface Player {
  personId: number;
  positionIds: number[];
  attributes: PlayerAttributeValues;
  potential?: number;
  estimatedValue?: number;
  leftFoot?: number;
  rightFoot?: number;
  clubId?: number;
  contractId?: number;
}

export interface PlayerDraft {
  personId: string;
  positionIds: number[];
  attributes: Record<AttributeCategory, Record<string, string>>;
  potential: string;
  estimatedValue: string;
  leftFoot: string;
  rightFoot: string;
  clubId: string;
  contractId: string;
}
