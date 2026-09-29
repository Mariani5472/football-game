export interface PlayerAttributes {
  technical: Record<string, number>;
  physical: Record<string, number>;
  psychological: Record<string, number>;
  goalkeeper: Record<string, number>;
}

export interface Player {
  personId: number;
  positionIds: number[];
  attributes: PlayerAttributes;
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
  attributes: {
    technical: Record<string, string>;
    physical: Record<string, string>;
    psychological: Record<string, string>;
    goalkeeper: Record<string, string>;
  };
  potential: string;
  estimatedValue: string;
  leftFoot: string;
  rightFoot: string;
  clubId: string;
  contractId: string;
}
