export type AttributeCategory = string;

export interface AttributeScale {
  id: number;
  name: string;
  minimumValue: number;
  maximumValue: number;
}

export interface AttributeDefinition {
  id: number;
  attribute_key: string;
  name: string;
  category: AttributeCategory;
  scale_id: number | null;
  is_hidden: number;
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
