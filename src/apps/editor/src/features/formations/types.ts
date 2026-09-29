export type FormationSide = "left" | "center" | "right";

export interface FormationPosition {
  id: number;
  positionId: number;
  label: string;
  side: FormationSide;
  x: number;
  y: number;
  roleId: number;
  dutyId: number;
}

export interface Formation {
  id: number;
  name: string;
  description?: string;
  positions: FormationPosition[];
}

export interface TacticalPosition {
  id: number;
  name: string;
  shortName: string;
}

export interface Duty {
  id: number;
  name: string;
}

export interface Role {
  id: number;
  positionId: number;
  name: string;
  description?: string;
  dutyIds: number[];
}
