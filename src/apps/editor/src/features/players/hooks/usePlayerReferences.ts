import { useEffect, useState } from "react";
import type { EntityRow } from "../../../shared/api/editorApi";
import {
  listAll,
  parseAttributeDefinitions,
  parseAttributeScales,
  type PlayerReferenceData,
} from "../config/playerAttributes";
import type { PositionAttributeWeight, RoleAttributeWeight } from "../../attributes/types";

export function usePlayerReferences() {
  const [data, setData] = useState<PlayerReferenceData>({
    definitions: [],
    scales: [],
    positions: [],
    roles: [],
    positionWeights: [],
    roleWeights: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [
          definitions,
          scales,
          positions,
          roles,
          positionWeights,
          roleWeights,
        ] = await Promise.all([
          listAll("player_attribute_definition"),
          listAll("attribute_scale"),
          listAll("position_definition"),
          listAll("player_role"),
          listAll("position_attribute_weight"),
          listAll("role_attribute_weight"),
        ]);

        if (!active) return;

        setData({
          definitions: parseAttributeDefinitions(definitions),
          scales: parseAttributeScales(scales),
          positions,
          roles,
          positionWeights: positionWeights.map(row => ({
            positionId: Number(row.position_id),
            attributeId: Number(row.attribute_id),
            weight: Number(row.weight),
          })) as PositionAttributeWeight[],
          roleWeights: roleWeights.map(row => ({
            roleId: Number(row.role_id),
            attributeId: Number(row.attribute_id),
            weight: Number(row.weight),
          })) as RoleAttributeWeight[],
        });
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return {
    ...data,
    loading,
    error,
  };
}
