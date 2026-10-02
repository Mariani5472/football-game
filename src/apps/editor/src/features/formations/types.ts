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
  instructions: FormationInstruction[];
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

export interface RoleKeyAttribute {
  attributeId: number;
  weight: number;
  name?: string;
}

export interface Role {
  id: number;
  positionId: number;
  name: string;
  description?: string;
  dutyIds: number[];
  keyAttributes: RoleKeyAttribute[];
}

export interface TacticalInstruction {
  id: number;
  name: string;
  category: string;
  valueType: string;
}

export interface FormationInstruction {
  instructionId: number;
  value: string;
}
