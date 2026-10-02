export interface Player {
  personId: number;
  potentialCapacity?: number;
  potential?: number;
  estimatedValue?: number;
  leftFoot?: number;
  rightFoot?: number;
}

export interface PlayerDraft {
  personId: string;
  attributes: Record<string, Record<string, string>>;
  potentialCapacity: string;
  potential: string;
  estimatedValue: string;
  leftFoot: string;
  rightFoot: string;
}
