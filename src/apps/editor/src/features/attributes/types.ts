export type AttributeCategory =
  | "technical"
  | "physical"
  | "mental"
  | "goalkeeping";

export interface AttributeScale {
  id: number;
  name: string;
  minimumValue: number;
  maximumValue: number;
}

export interface AttributeDefinition {
  id: number;
  key: string;
  name: string;
  category: AttributeCategory;
  scaleId: number;
  hidden: boolean;
}

export interface PositionAttributeWeight {
  positionId: number;
  attributeId: number;
  weight: number;
}

export interface RoleAttributeWeight {
  roleId: number;
  attributeId: number;
  weight: number;
}
