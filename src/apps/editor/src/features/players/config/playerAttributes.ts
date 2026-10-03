import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import type { AttributeDefinition, AttributeScale, PositionAttributeWeight, RoleAttributeWeight } from "../../attributes/types";

export const attributeTables: Record<string, string> = {
  psychological: "player_psychological_attribute",
  physical: "player_physical_attribute",
  technical: "player_technical_attribute",
  goalkeeping: "player_goalkeeper_attribute",
};

export function emptyAttributes(): Record<string, Record<string, string>> {
  return Object.fromEntries(
    Object.keys(attributeTables).map(category => [category, {}]),
  );
}

export async function listAll<T extends EntityRow = EntityRow>(table: string) {
  return (
    await editorApi.entity.list<T>(table, {
      page: 1,
      pageSize: 1000,
    })
  ).rows;
}

export function parseAttributeDefinitions(rows: EntityRow[]): AttributeDefinition[] {
  return rows.map(row => ({
    id: Number(row.id),
    attribute_key: String(row.attribute_key ?? ""),
    name: String(row.name ?? ""),
    category: String(row.category ?? "technical"),
    scale_id: row.scale_id == null ? null : Number(row.scale_id),
    is_hidden: Number(row.is_hidden ?? 0),
  }));
}

export function parseAttributeScales(rows: EntityRow[]): AttributeScale[] {
  return rows.map(row => ({
    id: Number(row.id),
    name: String(row.name ?? ""),
    minimumValue: Number(row.minimum_value ?? 0),
    maximumValue: Number(row.maximum_value ?? 0),
  }));
}

export function validateAttributeValues(
  definitions: AttributeDefinition[],
  scales: Map<number, AttributeScale>,
  attributes: Record<string, Record<string, string>>,
) {
  for (const definition of definitions) {
    const raw = attributes[definition.category]?.[definition.attribute_key];
    if (raw === undefined || raw === "") continue;

    const value = Number(raw);
    const scale =
      definition.scale_id == null
        ? undefined
        : scales.get(definition.scale_id);

    if (!Number.isFinite(value)) {
      throw new Error('Attribute "' + definition.name + '" must be numeric.');
    }

    if (
      scale &&
      (value < scale.minimumValue || value > scale.maximumValue)
    ) {
      throw new Error(
        'Attribute "' +
          definition.name +
          '" must be between ' +
          scale.minimumValue +
          " and " +
          scale.maximumValue +
          ".",
      );
    }
  }
}

export function weightedAttributeRating(
  weights: Array<{ attributeId: number; weight: number }>,
  definitions: AttributeDefinition[],
  attributes: Record<string, Record<string, string>>,
) {
  let total = 0;
  let weightTotal = 0;

  for (const item of weights) {
    const definition = definitions.find(definition => definition.id === item.attributeId);
    if (!definition) continue;

    const value = Number(
      attributes[definition.category]?.[definition.attribute_key],
    );

    if (!Number.isFinite(value)) continue;

    total += value * item.weight;
    weightTotal += item.weight;
  }

  return weightTotal
    ? Math.round((total / weightTotal) * 100) / 100
    : null;
}

export interface PlayerReferenceData {
  definitions: AttributeDefinition[];
  scales: AttributeScale[];
  positions: EntityRow[];
  roles: EntityRow[];
  positionWeights: PositionAttributeWeight[];
  roleWeights: RoleAttributeWeight[];
}
