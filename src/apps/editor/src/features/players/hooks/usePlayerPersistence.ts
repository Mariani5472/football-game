import { editorApi, type EntityRow, type Scalar } from "../../../shared/api/editorApi";
import { attributeTables, listAll, validateAttributeValues } from "../config/playerAttributes";
import type { AttributeDefinition, AttributeScale } from "../../attributes/types";

interface SavePlayerInput {
  player: EntityRow | null;
  playerId?: number;
  values: Record<string, Scalar>;
  definitions: AttributeDefinition[];
  scaleMap: Map<number, AttributeScale>;
  selectedPositions: number[];
  positionRatings: Record<number, string>;
  roleRatings: Record<number, string>;
  attributes: Record<string, Record<string, string>>;
  reload: () => Promise<void>;
}

async function savePositions(
  playerId: number,
  selectedPositions: number[],
  positionRatings: Record<number, string>,
) {
  const rows = await listAll("player_position");
  const selected = new Set(selectedPositions);

  for (const row of rows.filter(item => Number(item.player_id) === playerId)) {
    const positionId = Number(row.position_id);
    const key = JSON.stringify({
      player_id: playerId,
      position_id: positionId,
    });

    if (!selected.has(positionId)) {
      await editorApi.entity.remove("player_position", key);
    }
  }

  for (const positionId of selectedPositions) {
    const rating = Number(positionRatings[positionId] ?? 0);

    if (!Number.isFinite(rating) || rating < 0 || rating > 20) {
      throw new Error("Position ratings must be between 0 and 20.");
    }

    const existing = rows.find(
      row =>
        Number(row.player_id) === playerId &&
        Number(row.position_id) === positionId,
    );

    const key = JSON.stringify({
      player_id: playerId,
      position_id: positionId,
    });

    if (existing) {
      await editorApi.entity.update("player_position", key, { rating });
    } else {
      await editorApi.entity.create("player_position", {
        player_id: playerId,
        position_id: positionId,
        rating,
      });
    }
  }
}

async function saveRoles(
  playerId: number,
  roleRatings: Record<number, string>,
) {
  const rows = await listAll("player_role_rating");

  for (const row of rows.filter(item => Number(item.player_id) === playerId)) {
    const roleId = Number(row.role_id);

    if (
      roleRatings[roleId] === undefined ||
      roleRatings[roleId] === ""
    ) {
      await editorApi.entity.remove(
        "player_role_rating",
        JSON.stringify({
          player_id: playerId,
          role_id: roleId,
        }),
      );
    }
  }

  for (const [roleIdText, raw] of Object.entries(roleRatings)) {
    if (raw === "") continue;

    const roleId = Number(roleIdText);
    const rating = Number(raw);

    if (!Number.isFinite(rating) || rating < 0 || rating > 20) {
      throw new Error("Role ratings must be between 0 and 20.");
    }

    const existing = rows.find(
      row =>
        Number(row.player_id) === playerId &&
        Number(row.role_id) === roleId,
    );

    const key = JSON.stringify({
      player_id: playerId,
      role_id: roleId,
    });

    if (existing) {
      await editorApi.entity.update("player_role_rating", key, { rating });
    } else {
      await editorApi.entity.create("player_role_rating", {
        player_id: playerId,
        role_id: roleId,
        rating,
      });
    }
  }
}

async function saveAttributes(
  playerId: number,
  definitions: AttributeDefinition[],
  attributes: Record<string, Record<string, string>>,
) {
  for (const [category, table] of Object.entries(attributeTables)) {
    const payload: Record<string, Scalar> = {
      player_id: playerId,
    };

    for (const definition of definitions.filter(
      item => item.category === category,
    )) {
      const raw = attributes[category]?.[definition.attribute_key];

      if (raw !== undefined && raw !== "") {
        payload[definition.attribute_key] = Number(raw);
      }
    }

    const attributePayload = Object.fromEntries(
      Object.entries(payload).filter(([key]) => key !== "player_id"),
    );

    if (!Object.keys(attributePayload).length) continue;

    const current = (await listAll(table)).find(
      row => Number(row.player_id) === playerId,
    );

    if (current) {
      await editorApi.entity.update(table, playerId, attributePayload);
    } else {
      await editorApi.entity.create(table, payload);
    }
  }
}

export function usePlayerPersistence() {
  async function save(input: SavePlayerInput) {
    validateAttributeValues(
      input.definitions,
      input.scaleMap,
      input.attributes,
    );

    const personId = Number(input.values.person_id);

    if (!Number.isFinite(personId) || personId <= 0) {
      throw new Error("A Person is required.");
    }

    const corePayload = Object.fromEntries(
      Object.entries(input.values).filter(([key]) => key !== "person_id"),
    );

    if (input.player) {
      await editorApi.entity.update(
        "player",
        input.playerId!,
        corePayload,
      );
    } else {
      await editorApi.entity.create("player", input.values);
    }

    const resolvedPlayerId = personId;

    await savePositions(
      resolvedPlayerId,
      input.selectedPositions,
      input.positionRatings,
    );

    await saveRoles(
      resolvedPlayerId,
      input.roleRatings,
    );

    await saveAttributes(
      resolvedPlayerId,
      input.definitions,
      input.attributes,
    );

    await input.reload();

    return resolvedPlayerId;
  }

  return { save };
}
