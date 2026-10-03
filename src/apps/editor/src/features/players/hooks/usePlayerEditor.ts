import { useMemo, useState } from "react";
import type { AttributeCategory } from "../../attributes/types";
import type { Scalar } from "../../../shared/api/editorApi";
import { emptyAttributes, weightedAttributeRating, validateAttributeValues } from "../config/playerAttributes";
import { usePlayerReferences } from "./usePlayerReferences";
import { usePlayerData } from "./usePlayerData";
import { usePlayerPersistence } from "./usePlayerPersistence";

export function usePlayerEditor(playerId?: number) {
  const references = usePlayerReferences();
  const data = usePlayerData(playerId, {
    definitions: references.definitions,
    scales: references.scales,
    positions: references.positions,
    roles: references.roles,
    positionWeights: references.positionWeights,
    roleWeights: references.roleWeights,
  });
  const persistence = usePlayerPersistence();

  const [positionRatings, setPositionRatings] =
    useState<Record<number, string>>({});
  const [roleRatings, setRoleRatings] =
    useState<Record<number, string>>({});
  const [selectedPositions, setSelectedPositions] =
    useState<number[]>([]);
  const [attributes, setAttributes] =
    useState<Record<string, Record<string, string>>>(emptyAttributes());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const scaleMap = useMemo(
    () => new Map(references.scales.map(scale => [scale.id, scale])),
    [references.scales],
  );

  function setAttribute(
    category: AttributeCategory,
    key: string,
    value: string,
  ) {
    setAttributes(current => ({
      ...current,
      [category]: {
        ...(current[category] ?? {}),
        [key]: value,
      },
    }));
  }

  function togglePosition(id: number) {
    setSelectedPositions(current =>
      current.includes(id)
        ? current.filter(value => value !== id)
        : [...current, id],
    );
  }

  function setPositionRating(id: number, value: string) {
    setPositionRatings(current => ({
      ...current,
      [id]: value,
    }));

    setSelectedPositions(current =>
      current.includes(id)
        ? current
        : [...current, id],
    );
  }

  function setRoleRating(id: number, value: string) {
    setRoleRatings(current => ({
      ...current,
      [id]: value,
    }));
  }

  function weightedRating(
    weights: { attributeId: number; weight: number }[],
  ) {
    return weightedAttributeRating(
      weights,
      references.definitions,
      attributes,
    );
  }

  async function saveCore(values: Record<string, Scalar>) {
    setSaving(true);
    setSaveError(null);

    try {
      const resolvedId = await persistence.save({
        player: data.player,
        playerId,
        values,
        definitions: references.definitions,
        scaleMap,
        selectedPositions,
        positionRatings,
        roleRatings,
        attributes,
        reload: data.reload,
      });

      return resolvedId;
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : String(cause);
      setSaveError(message);
      throw cause;
    } finally {
      setSaving(false);
    }
  }

  return {
    player: data.player,
    definitions: references.definitions,
    scales: references.scales,
    positions: references.positions,
    roles: references.roles,
    positionWeights: references.positionWeights,
    roleWeights: references.roleWeights,
    selectedPositions,
    positionRatings,
    roleRatings,
    attributes,
    loading: references.loading || data.loading,
    saving,
    error: references.error ?? data.error ?? saveError,
    scaleMap,
    setAttribute,
    togglePosition,
    setPositionRating,
    setRoleRating,
    weightedRating,
    saveCore,
    reload: data.reload,
    validateAttributes: () =>
      validateAttributeValues(
        references.definitions,
        scaleMap,
        attributes,
      ),
  };
}
