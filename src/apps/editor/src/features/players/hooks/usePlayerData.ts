import { useEffect, useState } from "react";
import type { EntityRow } from "../../../shared/api/editorApi";
import {
  attributeTables,
  emptyAttributes,
  listAll,
  parseAttributeDefinitions,
  type PlayerReferenceData,
} from "../config/playerAttributes";

export interface PlayerEditorData {
  player: EntityRow | null;
  positionRatings: Record<number, string>;
  selectedPositions: number[];
  roleRatings: Record<number, string>;
  attributes: Record<string, Record<string, string>>;
}

export function usePlayerData(
  playerId: number | undefined,
  references: PlayerReferenceData,
) {
  const [data, setData] = useState<PlayerEditorData>({
    player: null,
    positionRatings: {},
    selectedPositions: [],
    roleRatings: {},
    attributes: emptyAttributes(),
  });
  const [loading, setLoading] = useState(Boolean(playerId));
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!playerId) {
      setData({
        player: null,
        positionRatings: {},
        selectedPositions: [],
        roleRatings: {},
        attributes: emptyAttributes(),
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [players, positions, roles, ...attributeRows] = await Promise.all([
        listAll("player"),
        listAll("player_position"),
        listAll("player_role_rating"),
        ...Object.values(attributeTables).map(table => listAll(table)),
      ]);

      const player = players.find(row => Number(row.person_id) === playerId) ?? null;

      const positionRatings: Record<number, string> = {};
      for (const row of positions.filter(row => Number(row.player_id) === playerId)) {
        positionRatings[Number(row.position_id)] = String(row.rating ?? "");
      }

      const roleRatings: Record<number, string> = {};
      for (const row of roles.filter(row => Number(row.player_id) === playerId)) {
        roleRatings[Number(row.role_id)] = String(row.rating ?? "");
      }

      const attributes = emptyAttributes();
      const parsedRows = attributeRows as EntityRow[][];
      const definitions = parseAttributeDefinitions(
        await listAll("player_attribute_definition"),
      );

      Object.keys(attributeTables).forEach((category, index) => {
        const row = parsedRows[index].find(item => Number(item.player_id) === playerId);
        if (!row) return;

        for (const definition of definitions) {
          if (
            definition.category === category &&
            row[definition.attribute_key] != null
          ) {
            attributes[category][definition.attribute_key] =
              String(row[definition.attribute_key]);
          }
        }
      });

      setData({
        player,
        positionRatings,
        selectedPositions: Object.keys(positionRatings).map(Number),
        roleRatings,
        attributes,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [playerId]);

  return {
    ...data,
    loading,
    error,
    reload: load,
  };
}
