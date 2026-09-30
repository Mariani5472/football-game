import { useEffect, useMemo, useState } from "react";
import { editorApi, type EntityRow, type Scalar } from "../../../shared/api/editorApi";
import type { AttributeCategory, AttributeDefinition, AttributeScale, PositionAttributeWeight, RoleAttributeWeight } from "../../attributes/types";

const attributeTables: Record<string, string> = {
  psychological: "player_psychological_attribute",
  physical: "player_physical_attribute",
  technical: "player_technical_attribute",
  goalkeeping: "player_goalkeeper_attribute",
};

function emptyAttributes(): Record<string, Record<string, string>> {
  return Object.fromEntries(Object.keys(attributeTables).map(category => [category, {}]));
}

async function all<T extends EntityRow>(table: string) {
  return (await editorApi.list<T>(table, { page: 1, pageSize: 1000 })).rows;
}

export function usePlayerEditor(playerId?: number) {
  const [player, setPlayer] = useState<EntityRow | null>(null);
  const [definitions, setDefinitions] = useState<AttributeDefinition[]>([]);
  const [scales, setScales] = useState<AttributeScale[]>([]);
  const [positions, setPositions] = useState<EntityRow[]>([]);
  const [roles, setRoles] = useState<EntityRow[]>([]);
  const [positionWeights, setPositionWeights] = useState<PositionAttributeWeight[]>([]);
  const [roleWeights, setRoleWeights] = useState<RoleAttributeWeight[]>([]);
  const [positionRatings, setPositionRatings] = useState<Record<number, string>>({});
  const [roleRatings, setRoleRatings] = useState<Record<number, string>>({});
  const [selectedPositions, setSelectedPositions] = useState<number[]>([]);
  const [attributes, setAttributes] = useState<Record<string, Record<string, string>>>(emptyAttributes);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [defs, scaleRows, positionRows, roleRows, pWeights, rWeights] = await Promise.all([
        all("player_attribute_definition"), all("attribute_scale"), all("position_definition"),
        all("player_role"), all("position_attribute_weight"), all("role_attribute_weight"),
      ]);
      setDefinitions(defs as AttributeDefinition[]);
      setScales(scaleRows as AttributeScale[]);
      setPositions(positionRows);
      setRoles(roleRows);
      setPositionWeights(pWeights as PositionAttributeWeight[]);
      setRoleWeights(rWeights as RoleAttributeWeight[]);

      if (!playerId) {
        setPlayer(null); setSelectedPositions([]); setPositionRatings({}); setRoleRatings({}); setAttributes(emptyAttributes()); return;
      }

      const [playerRows, playerPositions, playerRoles, ...attributeRows] = await Promise.all([
        all("player"), all("player_position"), all("player_role_rating"),
        ...Object.values(attributeTables).map(table => all(table)),
      ]);
      const current = playerRows.find(row => Number(row.person_id) === playerId) ?? null;
      setPlayer(current);

      const nextPositionRatings: Record<number, string> = {};
      for (const row of playerPositions.filter(row => Number(row.player_id) === playerId)) nextPositionRatings[Number(row.position_id)] = String(row.rating ?? "");
      setPositionRatings(nextPositionRatings);
      setSelectedPositions(Object.keys(nextPositionRatings).map(Number));

      const nextRoleRatings: Record<number, string> = {};
      for (const row of playerRoles.filter(row => Number(row.player_id) === playerId)) nextRoleRatings[Number(row.role_id)] = String(row.rating ?? "");
      setRoleRatings(nextRoleRatings);

      const next = emptyAttributes();
      const tableRows = attributeRows as EntityRow[][];
      Object.entries(attributeTables).forEach(([category], index) => {
        const row = tableRows[index].find(item => Number(item.player_id) === playerId);
        if (!row) return;
        for (const definition of defs as AttributeDefinition[]) {
          if (definition.category === category && row[definition.attribute_key] != null) {
            next[category][definition.attribute_key] = String(row[definition.attribute_key]);
          }
        }
      });
      setAttributes(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [playerId]);

  const scaleMap = useMemo(() => new Map(scales.map(scale => [scale.id, scale])), [scales]);

  function setAttribute(category: AttributeCategory, key: string, value: string) {
    setAttributes(current => ({ ...current, [category]: { ...(current[category] ?? {}), [key]: value } }));
  }

  function togglePosition(id: number) {
    setSelectedPositions(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }

  function setPositionRating(id: number, value: string) {
    setPositionRatings(current => ({ ...current, [id]: value }));
    setSelectedPositions(current => current.includes(id) ? current : [...current, id]);
  }

  function setRoleRating(id: number, value: string) {
    setRoleRatings(current => ({ ...current, [id]: value }));
  }

  function validateAttributes() {
    for (const definition of definitions) {
      const raw = attributes[definition.category]?.[definition.attribute_key];
      if (raw === undefined || raw === "") continue;
      const value = Number(raw);
      const scale = definition.scale_id == null ? undefined : scaleMap.get(definition.scale_id);
      if (!Number.isFinite(value)) throw new Error(`Attribute "${definition.name}" must be numeric.`);
      if (scale && (value < scale.minimumValue || value > scale.maximumValue)) {
        throw new Error(`Attribute "${definition.name}" must be between ${scale.minimumValue} and ${scale.maximumValue}.`);
      }
    }
  }

  const weightedRating = (weights: { attributeId: number; weight: number }[]) => {
    let total = 0; let weight = 0;
    for (const item of weights) {
      const definition = definitions.find(def => def.id === item.attributeId);
      if (!definition) continue;
      const value = Number(attributes[definition.category]?.[definition.attribute_key]);
      if (!Number.isFinite(value)) continue;
      total += value * item.weight; weight += item.weight;
    }
    return weight ? Math.round((total / weight) * 100) / 100 : null;
  };

  async function saveCore(values: Record<string, Scalar>) {
    setSaving(true); setError(null);
    try {
      validateAttributes();
      const personId = Number(values.person_id);
      if (!Number.isFinite(personId) || personId <= 0) throw new Error("A Person is required.");

      if (player) await editorApi.update("player", playerId!, Object.fromEntries(Object.entries(values).filter(([key]) => key !== "person_id")));
      else await editorApi.create("player", values);

      const id = playerId ?? personId;
      const existingPositions = await all("player_position");
      const wanted = new Set(selectedPositions);
      for (const row of existingPositions.filter(item => Number(item.player_id) === id)) {
        const positionId = Number(row.position_id);
        if (!wanted.has(positionId)) await editorApi.remove("player_position", JSON.stringify({ player_id: id, position_id: positionId }));
      }
      for (const positionId of selectedPositions) {
        const rating = Number(positionRatings[positionId] ?? 0);
        if (!Number.isFinite(rating) || rating < 0 || rating > 20) throw new Error("Position ratings must be between 0 and 20.");
        const existing = existingPositions.find(row => Number(row.player_id) === id && Number(row.position_id) === positionId);
        if (existing) await editorApi.update("player_position", JSON.stringify({ player_id: id, position_id: positionId }), { rating });
        else await editorApi.create("player_position", { player_id: id, position_id: positionId, rating });
      }

      const existingRoleRatings = await all("player_role_rating");
      for (const row of existingRoleRatings.filter(item => Number(item.player_id) === id)) {
        const roleId = Number(row.role_id);
        if (roleRatings[roleId] === undefined || roleRatings[roleId] === "") await editorApi.remove("player_role_rating", JSON.stringify({ player_id: id, role_id: roleId }));
      }
      for (const [roleIdText, raw] of Object.entries(roleRatings)) {
        if (raw === "") continue;
        const roleId = Number(roleIdText); const rating = Number(raw);
        if (!Number.isFinite(rating) || rating < 0 || rating > 20) throw new Error("Role ratings must be between 0 and 20.");
        const existing = existingRoleRatings.find(row => Number(row.player_id) === id && Number(row.role_id) === roleId);
        if (existing) await editorApi.update("player_role_rating", JSON.stringify({ player_id: id, role_id: roleId }), { rating });
        else await editorApi.create("player_role_rating", { player_id: id, role_id: roleId, rating });
      }

      for (const [category, table] of Object.entries(attributeTables)) {
        const payload: Record<string, Scalar> = { player_id: id };
        for (const definition of definitions.filter(def => def.category === category)) {
          const raw = attributes[category]?.[definition.attribute_key];
          if (raw !== undefined && raw !== "") payload[definition.attribute_key] = Number(raw);
        }
        const current = (await all(table)).find(row => Number(row.player_id) === id);
        const attributePayload = Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "player_id"));
        if (Object.keys(attributePayload).length) {
          if (current) await editorApi.update(table, id, attributePayload);
          else await editorApi.create(table, payload);
        }
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    } finally {
      setSaving(false);
    }
  }

  return { player, definitions, scales, positions, roles, positionWeights, roleWeights, selectedPositions, positionRatings, roleRatings, attributes, loading, saving, error, scaleMap, setAttribute, togglePosition, setPositionRating, setRoleRating, weightedRating, saveCore, reload: load };
}
