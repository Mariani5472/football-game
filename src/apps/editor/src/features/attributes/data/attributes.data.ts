import type {
  AttributeDefinition,
  AttributeScale,
  PositionAttributeWeight,
  RoleAttributeWeight,
} from "../types";

export const attributeScales: AttributeScale[] = [
  {
    id: 1,
    name: "Standard 0-20",
    minimumValue: 0,
    maximumValue: 20,
  },
];

export const attributeDefinitions: AttributeDefinition[] = [
  {
    id: 1,
    key: "passing",
    name: "Passing",
    category: "technical",
    scaleId: 1,
    hidden: false,
  },
  {
    id: 2,
    key: "finishing",
    name: "Finishing",
    category: "technical",
    scaleId: 1,
    hidden: false,
  },
  {
    id: 3,
    key: "dribbling",
    name: "Dribbling",
    category: "technical",
    scaleId: 1,
    hidden: false,
  },
  {
    id: 4,
    key: "pace",
    name: "Pace",
    category: "physical",
    scaleId: 1,
    hidden: false,
  },
  {
    id: 5,
    key: "strength",
    name: "Strength",
    category: "physical",
    scaleId: 1,
    hidden: false,
  },
  {
    id: 6,
    key: "stamina",
    name: "Stamina",
    category: "physical",
    scaleId: 1,
    hidden: false,
  },
  {
    id: 7,
    key: "vision",
    name: "Vision",
    category: "mental",
    scaleId: 1,
    hidden: false,
  },
  {
    id: 8,
    key: "decision_making",
    name: "Decision Making",
    category: "mental",
    scaleId: 1,
    hidden: false,
  },
];

export const positionAttributeWeights: PositionAttributeWeight[] = [
  { positionId: 5, attributeId: 1, weight: 1 },
  { positionId: 5, attributeId: 7, weight: 1 },
  { positionId: 8, attributeId: 2, weight: 1 },
  { positionId: 8, attributeId: 3, weight: 1 },
  { positionId: 8, attributeId: 4, weight: 0.8 },
];

export const roleAttributeWeights: RoleAttributeWeight[] = [
  { roleId: 1, attributeId: 1, weight: 1 },
  { roleId: 1, attributeId: 7, weight: 1 },
  { roleId: 2, attributeId: 2, weight: 1 },
  { roleId: 2, attributeId: 4, weight: 0.8 },
];

export function getAttributesByCategory(
  category: AttributeDefinition["category"],
): AttributeDefinition[] {
  return attributeDefinitions.filter(
    (attribute) => attribute.category === category && !attribute.hidden,
  );
}
