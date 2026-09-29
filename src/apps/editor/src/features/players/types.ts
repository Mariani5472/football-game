export interface Player {
  personId: number;
  positionIds: number[];
  potential?: number;
  estimatedValue?: number;
  leftFoot?: number;
  rightFoot?: number;
  clubId?: number;
  contractId?: number;
}

export interface PlayerDraft {
  positionIds: number[];
  potential: string;
  estimatedValue: string;
  leftFoot: string;
  rightFoot: string;
  clubId: string;
  contractId: string;
}
