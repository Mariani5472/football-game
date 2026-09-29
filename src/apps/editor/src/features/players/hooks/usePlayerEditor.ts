import { useState } from "react";

import type { AttributeCategory } from "../../attributes/types";
import type { Player, PlayerDraft } from "../types";

const emptyDraft: PlayerDraft = {
  personId: "",
  positionIds: [],
  attributes: {
    technical: {},
    physical: {},
    mental: {},
    goalkeeping: {},
  },
  potential: "",
  estimatedValue: "",
  leftFoot: "",
  rightFoot: "",
  clubId: "",
  contractId: "",
};

function toAttributeDraft(
  attributes: Record<string, number>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [key, value.toString()]),
  );
}

export function usePlayerEditor(player?: Player) {
  const [draft, setDraft] = useState<PlayerDraft>(
    player
      ? {
          personId: player.personId.toString(),
          positionIds: player.positionIds,
          attributes: {
            technical: toAttributeDraft(player.attributes.technical),
            physical: toAttributeDraft(player.attributes.physical),
            mental: toAttributeDraft(player.attributes.mental),
            goalkeeping: toAttributeDraft(player.attributes.goalkeeping),
          },
          potential: player.potential?.toString() ?? "",
          estimatedValue: player.estimatedValue?.toString() ?? "",
          leftFoot: player.leftFoot?.toString() ?? "",
          rightFoot: player.rightFoot?.toString() ?? "",
          clubId: player.clubId?.toString() ?? "",
          contractId: player.contractId?.toString() ?? "",
        }
      : emptyDraft,
  );

  function setValue(
    name: Exclude<keyof PlayerDraft, "positionIds" | "attributes">,
    value: string,
  ) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function setAttribute(
    category: AttributeCategory,
    name: string,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      attributes: {
        ...current.attributes,
        [category]: {
          ...current.attributes[category],
          [name]: value,
        },
      },
    }));
  }

  function togglePosition(positionId: number) {
    setDraft((current) => ({
      ...current,
      positionIds: current.positionIds.includes(positionId)
        ? current.positionIds.filter((id) => id !== positionId)
        : [...current.positionIds, positionId],
    }));
  }

  return { draft, setValue, setAttribute, togglePosition };
}
